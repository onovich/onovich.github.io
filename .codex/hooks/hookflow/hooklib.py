from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


PROTECTED_DIR_PARTS = {
    ".git",
    ".venv",
    "node_modules",
    "__pycache__",
    "dist",
    "build",
    "out",
    "target",
    ".next",
    ".nuxt",
    "coverage",
}

GENERATED_MARKERS = {
    "generated",
    "gen",
    "openapi_client",
    "prisma/generated",
}

GENERATED_FILE_PATTERNS = (
    re.compile(r".*\.pb(\.[A-Za-z0-9_]+)?$"),
    re.compile(r".*_pb2(_grpc)?\.py$"),
    re.compile(r".*\.generated\.[A-Za-z0-9_]+$"),
)

SECRET_FILE_RE = re.compile(
    r"(^|[\\/])(\.env($|[\\/])|\.env\.[^\\/]+|.*\.(pem|key|p12|pfx)$|bot_token\.txt$)",
    re.IGNORECASE,
)


def read_event() -> dict[str, Any]:
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            return {}
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def emit_json(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=True, separators=(",", ":")))


def emit_context(event_name: str, text: str) -> None:
    emit_json(
        {
            "hookSpecificOutput": {
                "hookEventName": event_name,
                "additionalContext": text.strip(),
            }
        }
    )


def block_prompt(reason: str) -> None:
    emit_json({"decision": "block", "reason": reason.strip()})


def deny_tool(reason: str) -> None:
    emit_json(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason.strip(),
            }
        }
    )


def continue_turn(reason: str) -> None:
    emit_json({"decision": "block", "reason": reason.strip()})


def run_git(args: list[str], cwd: str | Path | None = None) -> str:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=str(cwd) if cwd else None,
            check=False,
            capture_output=True,
            text=True,
            timeout=3,
        )
    except Exception:
        return ""
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def git_root(cwd: str | Path | None = None) -> Path:
    root = run_git(["rev-parse", "--show-toplevel"], cwd)
    if root:
        return Path(root)
    return Path(cwd or os.getcwd()).resolve()


def normalize_path_text(value: str) -> str:
    return value.replace("\\", "/").strip().strip("\"'")


def is_secret_path(path_text: str) -> bool:
    path = normalize_path_text(path_text)
    if path.endswith(".env.example"):
        return False
    return bool(SECRET_FILE_RE.search(path))


def is_protected_path(path_text: str) -> bool:
    path = normalize_path_text(path_text)
    if not path:
        return False
    if is_secret_path(path):
        return True
    parts = [p for p in path.split("/") if p and p != "."]
    return any(part in PROTECTED_DIR_PARTS for part in parts)


def is_generated_path(path_text: str) -> bool:
    path = normalize_path_text(path_text).lower()
    if not path:
        return False
    if any(marker in path for marker in GENERATED_MARKERS):
        return True
    return any(pattern.match(path) for pattern in GENERATED_FILE_PATTERNS)


def extract_apply_patch_paths(command: str) -> list[str]:
    paths: list[str] = []
    for line in command.splitlines():
        for prefix in ("*** Add File:", "*** Update File:", "*** Delete File:", "*** Move to:"):
            if line.startswith(prefix):
                paths.append(line[len(prefix) :].strip())
    return paths


def contains_write_intent(command: str) -> bool:
    lower = command.lower()
    patterns = [
        r"\bapply_patch\b",
        r"\bset-content\b",
        r"\badd-content\b",
        r"\bnew-item\b",
        r"\bcopy-item\b",
        r"\bmove-item\b",
        r"\bremove-item\b",
        r"\bdel\b",
        r"\brd\b",
        r"\brmdir\b",
        r"\brm\b",
        r">\s*",
        r">>\s*",
        r"\bsed\s+-i\b",
        r"\bpython\b.*\b(open|write_text|unlink|rename|replace)\b",
    ]
    return any(re.search(pattern, lower) for pattern in patterns)


def first_matching_path(command: str, candidates: list[str]) -> str | None:
    lower = command.lower().replace("\\", "/")
    for candidate in candidates:
        normalized = normalize_path_text(candidate).lower()
        if normalized and normalized in lower:
            return candidate
    return None


def truncate_lines(text: str, limit: int = 12) -> str:
    lines = [line.rstrip() for line in text.splitlines() if line.strip()]
    if len(lines) <= limit:
        return "\n".join(lines)
    return "\n".join(lines[:limit] + [f"... ({len(lines) - limit} more lines)"])
