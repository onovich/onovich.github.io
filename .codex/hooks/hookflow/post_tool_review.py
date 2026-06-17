from __future__ import annotations

import sys
from typing import Any

sys.dont_write_bytecode = True

from hooklib import emit_context, read_event, truncate_lines


def find_first(data: Any, names: set[str]) -> Any:
    if isinstance(data, dict):
        for key, value in data.items():
            if key in names:
                return value
        for value in data.values():
            found = find_first(value, names)
            if found is not None:
                return found
    elif isinstance(data, list):
        for value in data:
            found = find_first(value, names)
            if found is not None:
                return found
    return None


def main() -> None:
    event = read_event()
    tool_name = str(event.get("tool_name") or "tool")
    response = event.get("tool_response")
    if response is None:
        return

    exit_code = find_first(response, {"exit_code", "returncode", "status"})
    stderr = find_first(response, {"stderr", "error"})
    failed = False
    if isinstance(exit_code, int):
        failed = exit_code != 0
    elif isinstance(exit_code, str) and exit_code.strip().isdigit():
        failed = int(exit_code.strip()) != 0
    if stderr and isinstance(stderr, str) and any(word in stderr.lower() for word in ("error", "failed", "traceback", "exception")):
        failed = True

    if not failed:
        return

    detail = ""
    if isinstance(stderr, str) and stderr.strip():
        detail = "\nRelevant stderr:\n" + truncate_lines(stderr, 8)
    emit_context(
        "PostToolUse",
        f"The previous {tool_name} call appears to have failed. Inspect the error and fix the cause before proceeding.{detail}",
    )


if __name__ == "__main__":
    main()
