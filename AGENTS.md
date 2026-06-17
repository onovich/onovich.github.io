# Onovich Agent Instructions

These instructions are binding for Codex work in this repository.

## Architecture Standard

- Before any code commit, run the concise architecture self-check in `docs/ARCHITECTURE_REFACTOR_CHECKLIST.md`.
- Treat `docs/CMS_ARCHITECTURE_GUIDE.md` as the detailed design background, but use the checklist as the commit gate.
- Keep the Cargo-like frame centralized in `site/src/layouts/BaseLayout.astro`; do not duplicate navigation or page frame structure in page files.
- Keep `/cms` as a shell: browser behavior in `site/src/cms/client.ts`, reusable logic in `site/src/cms/*`, CLI/file-system operations in `site/scripts/*`.
- Prefer templates, presets, constrained params, and shared components over one-off CSS or page-specific logic.
- Do not use `_old-site/`, WebFetch summaries, or web archives as visual truth. Use `_reference-site/`, direct curl, Playwright, and screenshots.

## Commit Gate

- Project Codex hooks are installed under `.codex/hooks.json`.
- Code commits are expected to include an explicit architecture self-check. After completing it, set `ONOVICH_ARCH_SELF_CHECKED=1` for that commit command if the hook asks for acknowledgement.
- Docs-only commits may skip the acknowledgement when no code/config/build/hook files are staged.
- Never stage `.claude/settings.local.json` unless the user explicitly asks.
- Use specific paths for `git add`; do not use `git add .`.

## Verification

- Use `<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd` for normal code validation.
- Use `<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd` for layout/image smoke validation.
- For screenshot-sensitive visual changes, also run targeted `visual:measure` / `visual:diff` and inspect screenshots before claiming success.
