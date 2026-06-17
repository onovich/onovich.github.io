# Architecture Refactor Checklist

> This is the short, binding architecture standard for Onovich refactors.
> The longer background guide is `docs/CMS_ARCHITECTURE_GUIDE.md`; this file is the checklist to use before committing code.

## When To Use

Run this self-check before every commit that changes code, configuration, hooks, build scripts, CMS logic, visual layout, or validation scripts.

Docs-only and image-only commits may mark it as not applicable, but should still avoid contradicting this checklist.

## The Standard

1. **Original site is the source of truth.**
   Use `_reference-site/` or direct `curl` + Playwright against `onovich.com`. Do not use `_old-site/`, WebFetch summaries, or web archives for visual decisions.

2. **The page frame stays centralized.**
   `BaseLayout.astro` owns the Cargo-like frame, left navigation, right content column, menu shell, root sizing, and common page variants. Individual pages should not duplicate the frame or navigation.

3. **CMS boundaries stay clean.**
   `/cms` stays a page shell. Browser UI behavior lives in `site/src/cms/client.ts`; pure reusable logic lives in `site/src/cms/*`; CLI/file-system publishing lives in `site/scripts/*`. Do not duplicate validation, package, asset, or rich-text rules across browser and CLI code.

4. **Presets beat arbitrary CSS.**
   New behavior should be expressed as a template, section preset, component prop, or constrained parameter. Do not expose freeform CSS or infer major layout from image/content shape.

5. **Components beat page duplication.**
   Gallery/photo behavior belongs in `Gallery.astro`, `PhotoColumns.astro`, `PhotoAlbumPage.astro`, shared CMS helpers, or shared visual scripts. A page file should mainly bind data to existing components.

6. **Content and assets stay structured.**
   Content belongs in `site/src/content/*`. Images referenced by content must exist under `site/public/images/*`; large thumbnail candidates need `thumbSrc`; the removed `photos.json` / `/images/photos/*` chain must not be resurrected.

7. **Validation scales with risk.**
   Code changes need at least `Validate.cmd`. Layout, CSS, gallery, image, or visual-script changes also need `Smoke.cmd` and, for screenshot-sensitive work, targeted `visual:measure` / `visual:diff` plus human image review.

## Commit Self-Check Format

Before committing code, write or report this short block:

```text
Architecture self-check:
- Source of truth:
- Boundary:
- Duplication:
- Presets/data:
- Assets:
- Validation:
```

Each line can be one sentence. If a line is not applicable, say why.

## Codex Hook Acknowledgement

Project hooks block code commits unless architecture self-check has been explicitly acknowledged.

After completing the checklist, rerun the commit command with:

```powershell
$env:ONOVICH_ARCH_SELF_CHECKED='1'
```

Use that acknowledgement only after checking the six lines above. Docs-only commits do not need the acknowledgement.
