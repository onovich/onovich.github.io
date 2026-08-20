# Onovich Agent Instructions

These instructions are binding for Codex work in this repository.

## Architecture Standard

- Before any code commit, run the concise architecture self-check in `docs/ARCHITECTURE_REFACTOR_CHECKLIST.md`.
- Treat the approved bilingual portfolio as the production source of truth. The former Cargo site is historical reference material, not a second implementation to preserve in the working tree.
- Keep the page frame centralized in `site/src/layouts/BaseLayout.astro`; do not duplicate navigation, metadata, language switching, or page-shell structure in route files.
- Keep English at `/` and Chinese at `/zh/`. Localized routes should bind shared components and structured content rather than fork page implementations.
- Prefer shared components and the content model in `site/src/content/portfolio.ts` over one-off CSS or page-specific logic. Retained art JSON files remain data sources, not legacy page systems.
- Use the current portfolio preview, Playwright, and screenshots as visual truth. When aesthetic judgement conflicts with an old rule, update the system rather than patching a single page.

## Commit Gate

- Project Codex hooks are installed under `.codex/hooks.json`.
- Code commits are expected to include an explicit architecture self-check. After completing it, set `ONOVICH_ARCH_SELF_CHECKED=1` for that commit command if the hook asks for acknowledgement.
- Docs-only commits may skip the acknowledgement when no code/config/build/hook files are staged.
- Never stage `.claude/settings.local.json` unless the user explicitly asks.
- Use specific paths for `git add`; do not use `git add .`.

## Verification

- Use `<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd` for normal code validation.
- Use `<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd` for layout/image smoke validation.
- For screenshot-sensitive visual changes, also inspect targeted desktop and mobile screenshots of the affected English and Chinese routes before claiming success.
