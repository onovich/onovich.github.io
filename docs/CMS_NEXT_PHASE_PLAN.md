# CMS Next Phase Plan

This document is for the next AI or developer continuing the Onovich in-site CMS work.
It is intentionally execution-oriented: read it after `AGENTS.md`, then implement the first phase without reopening the whole CMS architecture.

## Current State

- The site deploys from `site/` to GitHub Pages at `https://blog.onovich.com`.
- The original visual source of truth remains `_reference-site/` and direct rendered checks against `onovich.com`.
- The old Electron `admin/` is gone and must not be revived.
- The only CMS path is the in-site `/cms` page.
- Project hooks are trusted and active. Code/config/hook commits require the architecture self-check.
- The latest pushed baseline has passed:
  - `Validate.cmd`
  - `Smoke.cmd` after starting the preview server on `127.0.0.1:4351`
  - layout guard: 75 assertions
  - image audit: 217/217 desktop images

The working tree may still contain local-only `.claude/settings.local.json`. Do not stage it.

## Read First

Read these files before editing:

- `AGENTS.md`
- `docs/ARCHITECTURE_REFACTOR_CHECKLIST.md`
- `docs/CMS_ARCHITECTURE_GUIDE.md`
- `docs/WORKFLOW.md`
- `site/src/pages/cms.astro`
- `site/src/cms/client.ts`
- `site/src/cms/publishPackage.js`
- `site/src/cms/draftValidation.js`
- `site/src/cms/uploadAssets.js`
- `site/scripts/apply-cms-publish.mjs`
- `site/scripts/cms-apply-file-ops.mjs`
- `site/scripts/cms-check.mjs`
- `site/scripts/cms-smoke.mjs`
- `site/scripts/cms-apply-smoke.mjs`
- `site/scripts/cms-publish-smoke.mjs`

## Architecture Boundary

Keep the existing CMS boundary:

- `site/src/pages/cms.astro`
  - Page shell and static markup only.
  - Add containers, buttons, dialogs, and labels here.
- `site/src/cms/client.ts`
  - Browser behavior and DOM event wiring.
  - Keep orchestration here; do not put file-system logic here.
- `site/src/cms/*`
  - Shared pure logic, validation, package creation, upload helpers, preview helpers.
  - Prefer adding small helpers here instead of duplicating logic in browser and CLI code.
- `site/scripts/*`
  - Node CLI and file-system operations.
  - Apply/backup/restore behavior belongs here.

Do not duplicate page frame or site layout logic. Do not edit `BaseLayout.astro` unless the task explicitly becomes visual/layout work.

## Next Phase Goal

Build a **CMS Release Confidence Layer**.

The CMS can already create publish packages, validate drafts, apply packages, back up targets, restore backups, and smoke-test the flow. The next phase should make this safer and clearer for a human editor:

1. Show a structured publish review before export.
2. Make warnings, uploads, target files, and blocking errors obvious.
3. Replace bare `confirm()` export behavior with an in-page review dialog/panel.
4. Improve CLI rollback output so it gives the exact restore command.
5. Extend CMS smoke/check coverage so the release review and restore hint cannot regress.

This is deliberately smaller than "redesign the CMS" or "unify all content into `site.json`".

## Non-Goals

Do not do these in this phase:

- Do not migrate all content into one unified `site.json`.
- Do not create a generic drag-and-drop site builder.
- Do not expose arbitrary CSS controls.
- Do not change the public site layout.
- Do not alter gallery visual behavior.
- Do not revive the old Electron admin.
- Do not change CNAME, GitHub Pages workflow, or deployment domain.

## Proposed UX

### Publish Review Panel

When the editor clicks "export publish package":

1. Collect draft issues with `collectCmsDraftIssues`.
2. Build the publish package with `createCmsPublishPackage`.
3. Open an in-page review dialog or side panel.
4. If there are blocking errors:
   - Show the error count.
   - Show the first several error messages.
   - Disable the final export/download action.
5. If there are warnings only:
   - Show warning count.
   - Show the first several warning messages.
   - Require an explicit checkbox such as "I reviewed these warnings" before export.
6. Always show:
   - page count
   - visible nav item count
   - templates used
   - section presets used
   - upload count
   - upload total size
   - upload target directory
   - publish target list

The current `exportPackage()` in `site/src/cms/client.ts` uses `confirm()` when errors exist. Replace that with the panel flow.

### Publish Preview

The existing "publish preview" can remain local-only, but its status should be clearer:

- "Local preview saved" should not sound like live deployment.
- Include issue summary: `0 errors, N warnings`.
- If errors exist, keep blocking behavior.

### Restore Hint

The CLI currently formats rollback text in `site/scripts/cms-apply-file-ops.mjs`.
Change `formatCmsApplyRollbackHint()` so the apply command prints an exact restore command:

```text
CMS publish backup: .cms-backups/<timestamp>
Restore command:
  npm run cms:restore -- .cms-backups/<timestamp>
```

If a dry run is used, it should still report the apply target list but should not create or mention a new backup.

## Execution Sessions

Target completion: **5 execution sessions** after this planning document is handed off.

Session 0, the current planning handoff, is documentation-only and does not count as implementation.
If a session fails its validation gate, do not push and do not move to the next session. Continue debugging in the same session, or start a replacement session with the same session number and the failure notes.

Every execution session must end with:

1. A debug self-check.
2. An architecture self-check.
3. Required validation commands.
4. A focused commit using specific paths.
5. A normal push to `origin/main`.
6. A short handoff note saying which session is next.

Do not combine sessions unless the combined work still passes every gate for every included session. The safer default is one session, one commit, one push.

### Per-Session Gate

Before any push, the AI must report this block:

```text
Session gate:
- Session:
- Scope completed:
- Debug self-check:
- Architecture self-check:
- Validation:
- Files staged:
- Not staged:
- Push readiness:
```

The gate passes only when:

- `Debug self-check` names at least one thing that was inspected after tests, not just "tests passed".
- `Architecture self-check` follows `docs/ARCHITECTURE_REFACTOR_CHECKLIST.md`.
- `Validation` lists exact commands and pass/fail results.
- `Files staged` contains only intentional paths.
- `Not staged` explicitly mentions `.claude/settings.local.json` if it is still present.
- `Push readiness` says there are no blockers.

If any item is uncertain, stop and debug. Do not push.

### Required Debug Self-Check

At the end of each session, inspect the actual change behavior:

- Read the relevant diff.
- Re-run the failing test after a fix, if anything failed.
- For browser UI changes, run the CMS browser smoke and inspect console/dialog/download behavior.
- For CLI changes, inspect stdout and failure output, not only exit codes.
- For upload/publish changes, verify upload paths stay under `/images/uploads/` and apply paths stay under `site/`.
- For any CSS change, confirm it is scoped to `/cms` unless public visual work was explicitly requested.

### Required Architecture Self-Check

Use this exact format before code commits:

```text
Architecture self-check:
- Source of truth:
- Boundary:
- Duplication:
- Presets/data:
- Assets:
- Validation:
```

For this CMS phase, expected direction:

- Source of truth: CMS flow only; no visual claims from `_old-site`, WebFetch summaries, or archives.
- Boundary: page shell in `cms.astro`, browser orchestration in `client.ts`, pure shared logic in `site/src/cms/*`, file-system behavior in `site/scripts/*`.
- Duplication: reuse `collectCmsDraftIssues`, `createCmsPublishPackage`, upload helpers, and apply helpers instead of copying rules.
- Presets/data: no new freeform layout/CSS model; existing templates and section presets remain the contract.
- Assets: uploads remain structured under `/images/uploads/`; no old `photos.json` or `/images/photos/*` chain.
- Validation: list the exact CMS checks, smoke checks, wrapper checks, and any screenshot review.

Set `ONOVICH_ARCH_SELF_CHECKED=1` only after this block is complete.

### Session 1: Shared Publish Review Model

Goal: add a pure publish review helper and unit-like coverage without changing the CMS UI.

Allowed files:

- `site/src/cms/publishReview.js`
- `site/scripts/cms-check.mjs`
- `docs/CMS_NEXT_PHASE_PLAN.md` only for notes discovered during implementation

Work:

- Add `createCmsPublishReview({ state, issues })`.
- Add `hasBlockingCmsPublishIssues(review)`.
- Derive review data from `createCmsPublishPackage` and its manifest.
- Include errors, warnings, page count, visible nav count, templates, section presets, uploads, total upload bytes, upload target dir, upload paths, and publish targets.
- Keep the helper pure: no DOM, localStorage, downloads, or file-system writes.

Validation:

```powershell
npm --prefix site run cms:check
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
```

Push gate:

- `cms:check` proves the helper reports errors, warnings, uploads, and publish targets.
- No UI or CLI behavior changes yet.
- Commit and push only this session's files.

Suggested commit:

```text
Add CMS publish review model
```

### Session 2: Publish Review UI Shell

Goal: add the in-page review surface without fully rewiring export behavior.

Allowed files:

- `site/src/pages/cms.astro`
- `site/src/styles/cms.css`
- `site/scripts/cms-check.mjs`
- `site/scripts/cms-smoke.mjs` only if selectors need placeholder coverage

Work:

- Add a hidden publish review panel or dialog.
- Add summary, issue list, upload summary, publish target list, warning acknowledgement checkbox, cancel button, and final download button.
- Keep copy concise. The panel should present state, not teach the whole CMS.
- Scope CSS to CMS classes. Do not touch public site layout CSS.

Validation:

```powershell
npm --prefix site run cms:check
npm --prefix site run build
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
```

If CSS is touched, also run:

```powershell
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\StartDevServer.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\StopDevServer.cmd
```

Push gate:

- CMS page builds.
- Panel is hidden by default.
- CSS is CMS-scoped.
- Public visual guard still passes if CSS changed.

Suggested commit:

```text
Add CMS publish review panel shell
```

### Session 3: Export Flow Wiring

Goal: replace bare `confirm()` export behavior with the review panel.

Allowed files:

- `site/src/cms/client.ts`
- `site/scripts/cms-check.mjs`
- `site/scripts/cms-smoke.mjs`

Work:

- Import and use `createCmsPublishReview`.
- Change `exportPackage()` to open the review panel.
- Move actual blob download into a small `downloadPublishPackage(payload)` helper.
- Block final download when errors exist.
- Require warning acknowledgement before final download when warnings exist.
- Keep `publishPreview()` local-only; improve its status text if touched.
- Do not duplicate validation logic in `client.ts`.

Validation:

```powershell
npm --prefix site run cms:check
npm --prefix site run cms:smoke
npm --prefix site run build
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
```

Then browser guard:

```powershell
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\StartDevServer.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\StopDevServer.cmd
```

Push gate:

- CMS smoke proves the review panel opens.
- Errors block export.
- Warnings require acknowledgement.
- Existing upload UI smoke still passes.

Suggested commit:

```text
Wire CMS publish review export flow
```

### Session 4: CLI Restore Guidance

Goal: make apply/restore CLI output unambiguous and covered.

Allowed files:

- `site/scripts/cms-apply-file-ops.mjs`
- `site/scripts/apply-cms-publish.mjs`
- `site/scripts/cms-apply-smoke.mjs`
- `site/scripts/cms-publish-smoke.mjs`
- `site/scripts/cms-check.mjs`
- `docs/WORKFLOW.md` only for command reference if needed

Work:

- Update `formatCmsApplyRollbackHint()` to include the exact restore command:

```text
npm run cms:restore -- .cms-backups/<timestamp>
```

- Ensure `--dry-run` still writes nothing and does not create a backup.
- Ensure normal apply prints backup path, restore command, and written file count.
- Keep file-system writes inside `site/`.

Validation:

```powershell
npm --prefix site run cms:check
npm --prefix site run cms:apply:smoke
npm --prefix site run cms:publish:smoke
npm --prefix site run build
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
```

Push gate:

- Dry run creates no backup.
- Normal apply output includes exact restore command in smoke/check coverage.
- Restore command remains documented and executable.

Suggested commit:

```text
Clarify CMS restore command output
```

### Session 5: Final Integration And Handoff

Goal: run the full CMS release confidence baseline and hand off the completed phase.

Allowed files:

- `docs/CMS_NEXT_PHASE_PLAN.md`
- `docs/WORKFLOW.md`
- `HANDOFF_NEXT.md` or `docs/OPEN_ISSUES.md` only if updating phase status
- Test/smoke files only for final fixes discovered during validation

Work:

- Update this document with final actual command results.
- Add or update a short workflow reference if Session 4 did not already do it.
- Confirm no implementation TODOs remain for the release confidence layer.
- Do not start the asset library panel in this session.

Validation:

```powershell
npm --prefix site run cms:check
npm --prefix site run cms:smoke
npm --prefix site run cms:apply:smoke
npm --prefix site run cms:publish:smoke
npm --prefix site run build
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\StartDevServer.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\StopDevServer.cmd
```

After push, check GitHub Actions:

```powershell
gh run list --repo onovich/onovich.github.io --limit 5
```

Push gate:

- All CMS smokes pass.
- `Validate.cmd` passes.
- `Smoke.cmd` passes.
- Latest GitHub Pages deploy succeeds after push.
- Final handoff says the next phase is "Asset library panel", not more release review work.

Suggested commit:

```text
Document CMS release review completion
```

## Implementation Plan

### Step 1: Add Shared Review Helper

Create a small pure helper, for example:

```text
site/src/cms/publishReview.js
```

Suggested exports:

```js
export function createCmsPublishReview({ state, issues }) {
  // returns counts and display lists derived from createCmsPublishPackage manifest
}

export function hasBlockingCmsPublishIssues(review) {
  return review.errors.length > 0;
}
```

Keep this helper pure. It should not touch DOM, localStorage, download APIs, or file system.

Use existing data from:

- `createCmsPublishPackage({ state, issues })`
- `payload.manifest.validation`
- `payload.manifest.uploads`
- `payload.manifest.publishTargets`

### Step 2: Add CMS Markup

In `site/src/pages/cms.astro`, add a publish review surface near the existing CMS shell:

- A hidden dialog/panel container.
- A summary area.
- An issue list.
- A publish targets list.
- A checkbox for acknowledging warnings.
- Buttons:
  - Cancel
  - Download publish package

Use normal CMS classes and add only focused classes in `site/src/styles/cms.css`.

Avoid adding visible instructional paragraphs that explain the whole CMS. The UI should present the review state, not a tutorial.

### Step 3: Wire Browser Behavior

In `site/src/cms/client.ts`:

- Import the new review helper.
- Change `exportPackage()` so it opens the review panel instead of immediately downloading.
- Keep final package download logic in a small function such as `downloadPublishPackage(payload)`.
- Disable final download when errors exist.
- Require warning acknowledgement when warnings exist.
- Keep `publishPreview()` local-only and improve its status text if touched.

Do not copy validation logic into `client.ts`; keep using `collectCmsDraftIssues`.

### Step 4: Improve CLI Restore Output

In `site/scripts/cms-apply-file-ops.mjs`:

- Update `formatCmsApplyRollbackHint()`.
- Optionally include restored/removed counts in restore output if not already enough.

In `site/scripts/apply-cms-publish.mjs`:

- Keep `--dry-run` behavior non-writing.
- Ensure normal apply prints:
  - backup path
  - exact restore command
  - number of files written

### Step 5: Extend Tests And Smokes

Update `site/scripts/cms-check.mjs`:

- Assert the new helper exists.
- Assert the review helper reports errors, warnings, uploads, and publish targets.
- Assert `client.ts` uses the helper.
- Assert `formatCmsApplyRollbackHint()` contains `npm run cms:restore --`.

Update `site/scripts/cms-smoke.mjs`:

- Click the export button.
- Verify the review panel opens.
- Verify the final download action is blocked when expected errors exist.
- Verify warning acknowledgement enables export when only warnings exist.

Update `site/scripts/cms-publish-smoke.mjs` or `cms-apply-smoke.mjs` only if needed for CLI restore hint coverage.

## Acceptance Criteria

The phase is done when all are true:

- Export no longer relies on bare browser `confirm()` for publish-package review.
- Draft errors block export inside the CMS UI.
- Draft warnings are visible and require explicit acknowledgement before export.
- Publish review shows manifest counts, uploads, upload total bytes, and target files.
- Apply output gives the exact restore command.
- Restore command remains:

```powershell
npm run cms:restore -- .cms-backups/<timestamp>
```

- Existing upload flow still works:
  - file input writes `/images/uploads/...`
  - preview uses data URL for uploaded assets
  - publish package carries upload asset data
  - apply dry run lists upload target paths
- No public site visual/layout behavior changes.
- No `.claude/settings.local.json` staged.

## Required Validation

For CMS code changes, run:

```powershell
npm --prefix site run cms:check
npm --prefix site run cms:apply:smoke
npm --prefix site run cms:publish:smoke
npm --prefix site run build
```

Then run the project wrapper:

```powershell
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
```

If any CMS UI behavior changes, also run browser smoke:

```powershell
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\StartDevServer.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\StopDevServer.cmd
```

If CSS/layout changes touch public site pages, add targeted `visual:measure` / `visual:diff` and inspect screenshots. This phase should avoid public layout changes.

## Architecture Self-Check Template

Before committing code, report:

```text
Architecture self-check:
- Source of truth:
- Boundary:
- Duplication:
- Presets/data:
- Assets:
- Validation:
```

Expected answers for this phase should look like:

- Source of truth: CMS UI/publish flow only; no visual decisions from `_old-site`.
- Boundary: `/cms` shell markup, browser behavior in `client.ts`, shared review logic in `site/src/cms/*`, CLI restore output in `site/scripts/*`.
- Duplication: validation and publish summary reuse existing package/issue helpers.
- Presets/data: no new freeform CSS or layout model; existing templates and presets remain.
- Assets: upload paths stay under `/images/uploads/`; no old `photos.json` chain restored.
- Validation: `cms:check`, CMS smokes, `Validate.cmd`, and `Smoke.cmd` as applicable.

For a code commit, set acknowledgement only after completing the self-check:

```powershell
$env:ONOVICH_ARCH_SELF_CHECKED='1'
git commit -m "..."
```

Use specific `git add` paths. Do not use `git add .`.

## Suggested Commit Shape

Prefer one focused commit:

```text
Improve CMS publish review and restore guidance
```

Stage only relevant paths, likely:

```powershell
git add -- `
  site/src/pages/cms.astro `
  site/src/styles/cms.css `
  site/src/cms/client.ts `
  site/src/cms/publishReview.js `
  site/scripts/cms-apply-file-ops.mjs `
  site/scripts/apply-cms-publish.mjs `
  site/scripts/cms-check.mjs `
  site/scripts/cms-smoke.mjs `
  site/scripts/cms-apply-smoke.mjs `
  site/scripts/cms-publish-smoke.mjs
```

Omit any path that was not actually changed.

## Follow-Up Phases

After the release confidence layer is done, continue with these in order:

1. **Asset library panel**
   - List uploaded assets from `state.assets`.
   - Show thumbnail, dimensions, size, target path, and used-by count.
   - Let editor reuse an uploaded asset for the active item.
   - Do not delete files from disk in browser UI.

2. **Restore UX documentation**
   - Add a short section to `docs/WORKFLOW.md` showing apply, backup, restore, and dry-run commands.
   - Keep it command-focused.

3. **CMS field ergonomics**
   - Replace fragile raw JSON editing for common edits with structured controls.
   - Keep raw JSON as advanced escape hatch.
   - Avoid broad redesign.

4. **Unified content model exploration**
   - Only after publish confidence is solid.
   - Start with a read-only generated `site.json` preview before migrating runtime rendering.

## Pitfalls

- PowerShell may display Chinese text as mojibake depending on code page. Verify browser output and file encoding before mass-editing user-facing copy.
- `Smoke.cmd` assumes the preview server is already available at `127.0.0.1:4351`; start it first with `StartDevServer.cmd`.
- Do not treat warnings as blocking unless the shared validation model says they are errors.
- Do not bypass upload validation by accepting remote URLs or data URLs as publishable image paths.
- Do not let the CMS apply flow write outside `site/`.
- Do not change public visual CSS while working on this phase.
