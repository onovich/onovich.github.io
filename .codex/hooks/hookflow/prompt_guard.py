from __future__ import annotations

import re
import sys

sys.dont_write_bytecode = True

from hooklib import block_prompt, emit_context, read_event


SECRET_PATTERNS = [
    re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b"),
    re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"\b(?:OPENAI_API_KEY|TELEGRAM_BOT_TOKEN|BOT_TOKEN|API_KEY|SECRET|TOKEN)\s*=\s*[\"']?[A-Za-z0-9_./:+-]{16,}", re.IGNORECASE),
]

DESTRUCTIVE_HINT_RE = re.compile(
    r"\b(delete|remove|wipe|clean|reset|discard|overwrite|force push|rm -rf|reset --hard|clean -fdx)\b",
    re.IGNORECASE,
)


def main() -> None:
    event = read_event()
    prompt = str(event.get("prompt") or "")
    if not prompt:
        return

    if any(pattern.search(prompt) for pattern in SECRET_PATTERNS):
        block_prompt(
            "The prompt appears to contain a real secret or token. Remove the secret, rotate it if it was exposed, and use a placeholder such as OPENAI_API_KEY=... instead."
        )
        return

    if DESTRUCTIVE_HINT_RE.search(prompt):
        emit_context(
            "UserPromptSubmit",
            "This request sounds destructive. Confirm exact target paths and preserve unrelated user changes before running file deletion, git reset, clean, overwrite, or force-push operations.",
        )


if __name__ == "__main__":
    main()
