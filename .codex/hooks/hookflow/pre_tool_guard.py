from __future__ import annotations

import re
import sys

sys.dont_write_bytecode = True

from hooklib import (
    contains_write_intent,
    deny_tool,
    emit_context,
    extract_apply_patch_paths,
    is_generated_path,
    is_protected_path,
    read_event,
)


DANGEROUS_COMMANDS = [
    (re.compile(r"\bgit\s+reset\s+--hard\b", re.IGNORECASE), "git reset --hard is blocked by the project hook."),
    (re.compile(r"\bgit\s+clean\s+-(?:[^\s]*f[^\s]*d|[^\s]*d[^\s]*f)", re.IGNORECASE), "git clean -fd is blocked by the project hook."),
    (re.compile(r"\bgit\s+push\b.*\s--force(?:-with-lease)?\b", re.IGNORECASE), "force push is blocked by the project hook."),
    (re.compile(r"\brm\s+-[^\n;]*r[^\n;]*f\b", re.IGNORECASE), "recursive force delete is blocked by the project hook."),
    (re.compile(r"\bRemove-Item\b[^\n;]*(?:-Recurse\b[^\n;]*-Force|-Force\b[^\n;]*-Recurse)", re.IGNORECASE), "Remove-Item -Recurse -Force is blocked by the project hook."),
    (re.compile(r"\b(?:rd|rmdir)\s+/s\b", re.IGNORECASE), "recursive directory deletion is blocked by the project hook."),
]

PROTECTED_PATH_HINTS = [
    ".env",
    ".env.local",
    ".venv",
    "node_modules",
    "__pycache__",
    "dist",
    "build",
    "out",
    "target",
    ".next",
    "coverage",
    "bot_token.txt",
]


def path_hint_in_command(command: str, hint: str) -> bool:
    if hint.startswith("."):
        return hint in command
    escaped = re.escape(hint.strip("/"))
    return bool(re.search(rf"(^|[\\s'\"`=:/\\\\]){escaped}($|[\\s'\"`;:/\\\\])", command))


def command_text(event: dict) -> str:
    tool_input = event.get("tool_input")
    if isinstance(tool_input, dict):
        command = tool_input.get("command")
        if isinstance(command, str):
            return command
    if isinstance(tool_input, str):
        return tool_input
    return ""


def guard_apply_patch(command: str) -> bool:
    paths = extract_apply_patch_paths(command)
    for path in paths:
        if is_protected_path(path):
            deny_tool(f"Direct edits to protected path '{path}' are blocked. Edit source files, examples, or configuration instead.")
            return True
        if is_generated_path(path):
            deny_tool(f"Direct edits to generated path '{path}' are blocked. Change the generator input and regenerate.")
            return True
    return False


def guard_shell(command: str) -> bool:
    for pattern, reason in DANGEROUS_COMMANDS:
        if pattern.search(command):
            deny_tool(reason)
            return True

    if contains_write_intent(command):
        lower = command.lower().replace("\\", "/")
        env_safe_lower = lower.replace(".env.example", "")
        for hint in PROTECTED_PATH_HINTS:
            normalized = hint.lower().replace("\\", "/")
            searchable = env_safe_lower if normalized == ".env" else lower
            if path_hint_in_command(searchable, normalized):
                deny_tool(f"Write/delete operation targets protected path '{hint}'. Use source files or a reproducible patch mechanism instead.")
                return True

    if re.search(r"\bgrep\s+-R\b", command):
        emit_context("PreToolUse", "Prefer rg over grep -R for repository searches when rg is available.")
        return True

    generated_mentions = [hint for hint in ("generated", "openapi_client", "_pb2.py", ".pb.go") if hint in command.lower()]
    if generated_mentions and contains_write_intent(command):
        emit_context("PreToolUse", "This command appears to write generated files. Prefer changing schema/proto/OpenAPI input and regenerating.")
        return True

    return False


def main() -> None:
    event = read_event()
    tool_name = str(event.get("tool_name") or "")
    command = command_text(event)
    if not command:
        return

    if tool_name == "apply_patch":
        guard_apply_patch(command)
        return
    guard_shell(command)


if __name__ == "__main__":
    main()
