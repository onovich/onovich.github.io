from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable

sys.dont_write_bytecode = True


def _root() -> Path:
    try:
        out = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True, timeout=3).strip()
        if out:
            return Path(out)
    except Exception:
        pass
    return Path.cwd()


ROOT = _root()
HOOKFLOW = ROOT / ".codex" / "hooks" / "hookflow"
if HOOKFLOW.exists():
    sys.path.insert(0, str(HOOKFLOW))

from hooklib import continue_turn, deny_tool, read_event, run_git  # type: ignore  # noqa: E402


CODE_PATH_PREFIXES = (
    ".codex/hooks/",
    ".github/workflows/",
    "site/src/",
    "site/scripts/",
)

CODE_PATH_EXACT = {
    ".codex/hooks.json",
    ".gitignore",
    "AGENTS.md",
    "site/astro.config.mjs",
    "site/package.json",
    "site/package-lock.json",
    "site/tsconfig.json",
}

DOC_OR_ASSET_PREFIXES = (
    "docs/",
    "site/public/images/",
    "site/public/fonts/",
)

SELF_CHECK_RE = re.compile(
    r"(architecture self-check|架构自检|ARCHITECTURE_REFACTOR_CHECKLIST|ONOVICH_ARCH_SELF_CHECKED)",
    re.IGNORECASE,
)
ACK_RE = re.compile(
    r"(?:\$env:)?ONOVICH_ARCH_SELF_CHECKED\s*=\s*['\"]?(?:1|true|yes)\b",
    re.IGNORECASE,
)


def normalize(path: str) -> str:
    path = path.strip().strip("\"'").replace("\\", "/")
    while path.startswith("./"):
        path = path[2:]
    return path


def is_code_path(path: str) -> bool:
    p = normalize(path)
    if not p:
        return False
    if p in CODE_PATH_EXACT:
        return True
    if p.startswith(CODE_PATH_PREFIXES):
        return True
    if p.startswith(DOC_OR_ASSET_PREFIXES):
        return False
    return False


def git_paths(args: list[str]) -> list[str]:
    out = run_git(args, ROOT)
    return [normalize(line) for line in out.splitlines() if line.strip()]


def changed_paths(include_untracked: bool = True) -> list[str]:
    paths = git_paths(["diff", "--name-only"]) + git_paths(["diff", "--cached", "--name-only"])
    if include_untracked:
        paths += git_paths(["ls-files", "--others", "--exclude-standard"])
    return paths


def paths_from_commit_wrapper(command: str) -> list[str]:
    match = re.search(r"-Paths\s+(?:\"([^\"]+)\"|'([^']+)'|([^\s]+))", command, re.IGNORECASE)
    if not match:
        return []
    raw = next(group for group in match.groups() if group)
    return [normalize(part) for part in raw.split(",") if part.strip()]


def candidate_paths(command: str) -> list[str]:
    wrapper_paths = paths_from_commit_wrapper(command)
    if wrapper_paths:
        return wrapper_paths

    staged = git_paths(["diff", "--cached", "--name-only"])
    if staged:
        return staged

    return git_paths(["diff", "--name-only"]) + git_paths(["ls-files", "--others", "--exclude-standard"])


def code_paths(paths: Iterable[str]) -> list[str]:
    return [path for path in paths if is_code_path(path)]


def command_text(event: dict) -> str:
    tool_input = event.get("tool_input")
    if isinstance(tool_input, dict):
        command = tool_input.get("command")
        if isinstance(command, str):
            return command
    if isinstance(tool_input, str):
        return tool_input
    return ""


def is_commit_command(command: str) -> bool:
    lower = command.lower()
    return bool(
        re.search(r"\bgit\s+(?:-[^\s]+\s+)*commit\b", lower)
        or "commit.cmd" in lower
        or "commitandpush.cmd" in lower
        or re.search(r"\bgit\s+.*\bcommit\b", lower)
    )


def has_acknowledgement(command: str) -> bool:
    if os.environ.get("ONOVICH_ARCH_SELF_CHECKED", "").lower() in {"1", "true", "yes"}:
        return True
    return bool(ACK_RE.search(command))


def checklist_text(paths: list[str]) -> str:
    shown = "\n".join(f"- {path}" for path in paths[:12])
    if len(paths) > 12:
        shown += f"\n- ... {len(paths) - 12} more"
    return f"""Architecture self-check is required before committing code changes.

Code/config/hook paths detected:
{shown}

Before retrying the commit, confirm:
- Source of truth: _reference-site/direct curl/Playwright, not _old-site/WebFetch/archive.
- Boundary: page frame in BaseLayout; CMS shell/client/helpers/scripts are not mixed.
- Duplication: shared components/helpers used instead of page-specific copies.
- Presets/data: templates, presets, constrained params, and content JSON remain the main contract.
- Assets: image refs exist, large thumbs use thumbSrc, old photos chain is not restored.
- Validation: Validate.cmd, Smoke.cmd, and visual checks were chosen for the risk.

Then rerun the commit with ONOVICH_ARCH_SELF_CHECKED=1."""


def pre_tool_gate(event: dict) -> None:
    command = command_text(event)
    if not command or not is_commit_command(command):
        return
    changed_code = code_paths(candidate_paths(command))
    if not changed_code:
        return
    if has_acknowledgement(command):
        return
    deny_tool(checklist_text(changed_code))


def stop_gate(event: dict) -> None:
    if event.get("stop_hook_active"):
        return
    changed_code = code_paths(changed_paths(include_untracked=True))
    if not changed_code:
        return
    last_message = str(event.get("last_assistant_message") or "")
    if SELF_CHECK_RE.search(last_message):
        return
    continue_turn(
        "Code/config changes are present, but the final response did not mention the Onovich architecture self-check. Review docs/ARCHITECTURE_REFACTOR_CHECKLIST.md, run the right validation, and report the architecture self-check result before stopping."
    )


def cli_check() -> int:
    changed = code_paths(changed_paths(include_untracked=True))
    if not changed:
        print("Architecture self-check: no code/config/hook changes detected.")
        return 0
    print(checklist_text(changed))
    return 0


def main() -> None:
    if "--check" in sys.argv:
        raise SystemExit(cli_check())

    event = read_event()
    hook_name = str(event.get("hook_event_name") or event.get("hookEventName") or "")
    if hook_name == "Stop" or "last_assistant_message" in event:
        stop_gate(event)
        return
    pre_tool_gate(event)


if __name__ == "__main__":
    main()
