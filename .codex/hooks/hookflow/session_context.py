from __future__ import annotations

import sys
from pathlib import Path

sys.dont_write_bytecode = True

from hooklib import emit_context, git_root, run_git


def detect_stack(root: Path) -> list[str]:
    stack: list[str] = []
    if (root / "requirements.txt").exists():
        deps = [
            line.strip()
            for line in (root / "requirements.txt").read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]
        shown = ", ".join(dep.split("==")[0].split(">=")[0].split("<")[0] for dep in deps[:5])
        stack.append(f"Python requirements.txt ({shown or 'dependencies listed'})")
    if (root / "pyproject.toml").exists():
        stack.append("Python pyproject.toml")
    if (root / "package.json").exists():
        stack.append("Node package.json")
    if (root / "go.mod").exists():
        stack.append("Go module")
    if (root / "Cargo.toml").exists():
        stack.append("Rust Cargo")
    return stack or ["No primary stack manifest detected"]


def main() -> None:
    root = git_root()
    branch = run_git(["branch", "--show-current"], root) or "(detached or unborn)"
    status_lines = run_git(["status", "--short"], root).splitlines()
    changed_count = len(status_lines)
    changed_preview = ", ".join(line[3:] for line in status_lines[:8]) if status_lines else "clean"

    important_docs = [name for name in ("AGENTS.md", "README.md", ".pre-commit-config.yaml") if (root / name).exists()]
    commands: list[str] = []
    if (root / "telegram_codex_bridge").exists():
        commands.append("run: python -m telegram_codex_bridge")
        commands.append("quick verify: python -m compileall telegram_codex_bridge")
    if (root / "scripts" / "setup.ps1").exists():
        commands.append("setup: powershell -ExecutionPolicy Bypass -File .\\scripts\\setup.ps1")
    if (root / "scripts" / "run.ps1").exists():
        commands.append("helper run: powershell -ExecutionPolicy Bypass -File .\\scripts\\run.ps1")
    if (root / ".pre-commit-config.yaml").exists():
        commands.append("optional verify: pre-commit run --all-files")

    lines = [
        "Project context snapshot:",
        f"- root: {root}",
        f"- branch: {branch}",
        f"- working tree: {changed_count} changed/untracked files; preview: {changed_preview}",
        f"- stack: {'; '.join(detect_stack(root))}",
        f"- docs/config to prefer: {', '.join(important_docs) if important_docs else 'none detected'}",
        "- local secrets: .env may exist; do not read, print, or edit it. Use .env.example for shape.",
    ]
    if commands:
        lines.append("- useful commands:")
        lines.extend(f"  - {command}" for command in commands[:6])
    lines.extend(
        [
            "- edit guardrails: do not edit .venv, node_modules, __pycache__, build outputs, coverage, or generated files directly.",
            "- dependency fixes: patch source/config or use package patch mechanisms instead of editing installed dependencies.",
        ]
    )
    emit_context("SessionStart", "\n".join(lines[:30]))


if __name__ == "__main__":
    main()
