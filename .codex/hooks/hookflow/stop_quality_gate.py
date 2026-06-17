from __future__ import annotations

import re
import sys

sys.dont_write_bytecode = True

from hooklib import continue_turn, read_event


CHANGE_RE = re.compile(
    r"\b(added|changed|created|updated|modified|implemented|fixed|refactored|wrote|edited|patched)\b",
    re.IGNORECASE,
)

VERIFY_RE = re.compile(
    r"\b(test|tests|tested|pytest|unittest|compileall|lint|typecheck|build|verified|verification|not run|could not run|unable to run)\b",
    re.IGNORECASE,
)


def main() -> None:
    event = read_event()
    if event.get("stop_hook_active"):
        return
    last_message = str(event.get("last_assistant_message") or "")
    if not last_message:
        return
    if CHANGE_RE.search(last_message) and not VERIFY_RE.search(last_message):
        continue_turn(
            "You described code or project changes but did not mention verification. Run the smallest relevant check, or explicitly report why verification cannot be run, then provide the final answer."
        )


if __name__ == "__main__":
    main()
