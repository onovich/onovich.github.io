# Architecture Refactor Checklist

> This is the short, binding architecture standard for Onovich refactors.
> This is the binding architecture standard for the bilingual portfolio replacement.

## When To Use

Run this self-check before every commit that changes code, configuration, hooks, build scripts, visual layout, content structure, or validation scripts.

Docs-only and image-only commits may mark it as not applicable, but should still avoid contradicting this checklist.

## The Standard

1. **The approved portfolio system is the source of truth.**
   Use the bilingual production routes, shared content model, and approved visual prototype. Cargo remains historical reference material, not a second production implementation.

2. **The page frame stays centralized.**
   `BaseLayout.astro` owns the left index, content column, mobile menu, language switch, metadata, and common page shell. Individual pages should not duplicate that frame.

3. **Language and route boundaries stay explicit.**
   English lives at `/`; Chinese lives at `/zh/`. Localized route components bind language and route data to shared page components, while canonical and `hreflang` metadata remain centralized.

4. **The visual system beats one-off CSS.**
   Layout, type, spacing, color, and responsive behavior belong in `global.css` and shared components. Change the system when aesthetics require it; do not patch individual pages with isolated styling.

5. **Components beat page duplication.**
   Gallery, lightbox, project card, art overview, and photo album behavior belong in shared components. A route file should mainly select language and bind content.

6. **Content and assets stay structured.**
   Portfolio copy and routing metadata belong in `site/src/content/portfolio.ts`; artwork data remains in the content files it already uses. Referenced images must exist under `site/public/images/*`, and large gallery items should provide thumbnails where needed.

7. **Validation scales with risk.**
   Code changes need at least `Validate.cmd`. Layout, CSS, gallery, image, or visual-script changes also need `Smoke.cmd`, bilingual desktop/mobile checks, and human image review.

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
