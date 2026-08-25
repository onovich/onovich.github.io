# Cloudflare Pages cutover

This runbook records the staged move of the new Onovich site to Cloudflare Pages without interrupting the current Cargo site or the existing GitHub Pages replica.

As of 2026-08-24, `onovich.com` is serving the bilingual portfolio through Cloudflare, while `blog.onovich.com` still independently serves the same portfolio through GitHub Pages. The remaining cutover decision is how to retire or repurpose that duplicate blog host.

## Deployment target

- Repository: `onovich/onovich.github.io`
- Production branch: `main`
- Production host: `https://onovich.com`
- Framework preset: Astro
- Root directory: `site`
- Build command: `npm run build`
- Build output directory: `dist`
- Required Node version: `22.12.0` or newer, matching `site/package.json`

## Current production snapshot

Verified on 2026-08-24:

- [x] `https://onovich.com/` and `https://onovich.com/zh/` return `200` through Cloudflare.
- [x] `https://www.onovich.com/` redirects permanently to `https://onovich.com/`.
- [x] `robots.txt`, `sitemap-index.xml`, and both 1280×640 social images return `200`.
- [x] English and Chinese canonical URLs, `hreflang`, and social image metadata point to `onovich.com`.
- [x] Former Cargo paths tested (`/game`, `/codes/`, `/pixel/`, `/illustrator/`, `/photo_1/`, `/poem/`, `/sns/`) return the intended permanent redirects.
- [ ] Decide whether `blog.onovich.com` will become the future GameLetter host or be retired. It currently resolves to `onovich.github.io` and serves the same portfolio.
- [ ] Remove or replace the repository's `site/public/CNAME` and GitHub Pages mapping after the blog decision is implemented.

Local release gates also passed on 2026-08-24: `Validate.cmd`, `Smoke.cmd` (168 layout assertions and 740/740 image loads), and `npm audit --omit=dev` (0 vulnerabilities).

Cloudflare Pages supports an explicit root directory for repositories where the web project is nested, and its Astro preset uses `npm run build` with `dist` output.

## Build baseline

This replacement intentionally moves the project from Astro 6 to Astro 7 and adds the static sitemap integration. It is a build/SEO baseline change, not a presentation feature: `npm run build`, the asset check, the visual guard, and `npm audit --omit=dev` must all pass before the branch is considered ready for preview.

## First preview activation (historical)

Cloudflare Pages reacts to new Git events after its GitHub integration is connected. The initial preview trigger is now historical; do not create another documentation-only trigger solely for preview activation unless the Pages project has been recreated.

## Safe rollout

1. Connect the GitHub repository to a new Cloudflare Pages project.
2. Keep `main` as the production branch and let the feature branch create a preview deployment.
3. Review the preview deployment before merging: desktop, mobile, English, Chinese, all art categories, photo albums, lightboxes, links, metadata, and the custom 404 page.
4. Merge only after the visual review is approved.
5. Add `onovich.com` and `www.onovich.com` as custom domains to the Pages project.
6. Redirect `www.onovich.com` to `https://onovich.com` with a Cloudflare Redirect Rule. Domain-level redirects are not supported by a Pages `_redirects` file.
7. Keep unrelated DNS records, including mail and all existing product subdomains, unchanged.
8. Verify HTTPS and the checks below before treating Cloudflare as production.

The existing `site/public/CNAME` still points GitHub Pages at `blog.onovich.com`. It was originally retained for the preview period and must not remain a permanent second public host for the same portfolio after the blog decision is implemented.

The code is already merged to `main`. Make one explicit decision before removing the duplicate GitHub Pages mapping for `blog.onovich.com`:

1. **Recommended:** reserve it for the future GameLetter site. Move that site to its own deployment, then remove this repository's Pages mapping and CNAME only when the corresponding DNS/Pages change is ready.
2. **Retire the replica:** disable GitHub Pages for this repository, remove the CNAME, and redirect `blog.onovich.com` at Cloudflare if it should remain reachable.

In either case, after Cloudflare serves `onovich.com`, verify that `blog.onovich.com` does not independently serve this same portfolio. Do not make that DNS or GitHub Pages change as part of a feature-branch preview.

## Cargo URL preservation

`site/public/_redirects` permanently maps the former Cargo paths to their closest new pages. After deployment, verify at least:

- `/game` → `/games-and-tools/`
- `/codes` → `/games-and-tools/`
- `/pixel` → `/art/pixel/`
- `/illustrator` → `/art/illustration/`
- `/photo_1` → `/art/photography/tokyo/`
- `/poem` → `/art/poetry/`
- `/sns` → `/contact/`

If `blog.onovich.com` is retired later, redirect that hostname with a Cloudflare Redirect Rule or Bulk Redirect, not with the Pages `_redirects` file. Decide whether its old article URLs have direct replacements before enabling a catch-all.

## Production checks

- `/` and `/zh/` return `200` and switch languages without leaving the current host.
- Canonical URLs use `https://onovich.com`.
- `hreflang` pairs English and Chinese pages correctly.
- `https://onovich.com/robots.txt` references `https://onovich.com/sitemap-index.xml`.
- The sitemap contains only the new public routes; former Cargo URLs exist only as redirects.
- Both social images return `200` and are exactly `1280×640`.
- Old Cargo paths return a single permanent redirect to a valid page.
- The contact page exposes only channels the owner intends to monitor. Add a direct email address or form only after choosing a real delivery endpoint and spam policy.
- No unrelated subdomain, MX record, or TXT verification record changes.

## Retiring Cargo

Do not cancel Cargo before the new domain is live. Keep the old site available during a short observation window, check redirects and search-console coverage, and retain an export or account-level backup. After the replacement has remained stable, disable the Cargo subscription renewal; do not delete the old account or site until its assets and content are confirmed recoverable.
