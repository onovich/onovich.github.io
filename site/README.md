# Onovich.com

The bilingual personal site for Onovich: games, game-development tools, art, notes, and profile.

## Local development

```sh
npm install
npm run dev
```

The production build is static Astro output:

```sh
npm run build
npm run preview
```

## Routes

- English is served from `/`.
- Chinese is served from `/zh/`.
- Games and tools, art categories, photo albums, notes, profile, and contact each have stable language-specific URLs.
- Former Cargo routes are preserved in `public/_redirects` for the Cloudflare Pages cutover.

## Content and visuals

- Shared copy and portfolio metadata live in `src/content/portfolio.ts`.
- The production frame lives in `src/layouts/BaseLayout.astro`.
- Project covers and art assets live under `public/images/`.
- `npm run visual:guard -- --clone=http://127.0.0.1:4351` checks the current portfolio shell and gallery images in desktop and mobile viewports.
- Run `npm run social:preview` while the site is available at `http://127.0.0.1:8130` to refresh the two 1280×640 social images. A different base URL may be passed as the final argument.

## Deployment

Production is served from Cloudflare Pages at `https://onovich.com`. The remaining staged-cutover decision is whether `blog.onovich.com` becomes a separate future GameLetter deployment or is retired; the current GitHub Pages workflow and `CNAME` are retained until that decision is implemented. See [`../docs/CLOUDFLARE_PAGES_CUTOVER.md`](../docs/CLOUDFLARE_PAGES_CUTOVER.md).
