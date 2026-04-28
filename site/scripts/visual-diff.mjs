/**
 * Visual diff: screenshot original (onovich.com) vs clone (blog.onovich.com)
 * at multiple viewports. Output goes to ../../diff-screenshots/.
 *
 * Usage:
 *   cd site && node scripts/visual-diff.mjs
 *   node scripts/visual-diff.mjs --pages=index,codes
 *   node scripts/visual-diff.mjs --clone=http://localhost:4321
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const ORIGINAL = args.original || 'https://onovich.com';
const CLONE    = args.clone    || 'https://blog.onovich.com';
const OUT_DIR  = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), '../../diff-screenshots');

const PAGES_ALL = [
  { slug: 'home',        original: '/',            clone: '/' },
  { slug: 'codes',       original: '/codes',       clone: '/codes' },
  { slug: 'game',        original: '/game',        clone: '/game' },
  { slug: 'pixel',       original: '/pixel',       clone: '/pixel' },
  { slug: 'illustrator', original: '/illustrator', clone: '/illustrator' },
  { slug: 'gif',         original: '/gif',         clone: '/gif' },
  { slug: 'graphic',     original: '/graphic',     clone: '/graphic' },
  { slug: 'photo',       original: '/photo',       clone: '/photo' },
  { slug: 'poem',        original: '/poem',        clone: '/poem' },
  { slug: 'sns',         original: '/sns',         clone: '/sns' },
  { slug: 'links',       original: '/links',       clone: '/links' },
  { slug: 'contact',     original: '/contact-form',clone: '/contact' },
];

const requestedSlugs = (args.pages || '').toString().split(',').filter(Boolean);
const PAGES = requestedSlugs.length > 0
  ? PAGES_ALL.filter(p => requestedSlugs.includes(p.slug))
  : PAGES_ALL;

const VIEWPORTS = [
  { name: 'mobile',    width: 375,  height: 800 },
  { name: 'tablet',    width: 768,  height: 1024 },
  { name: 'laptop',    width: 1024, height: 768 },
  { name: 'desktop',   width: 1440, height: 900 },
  { name: 'wide',      width: 1920, height: 1080 },
];

await mkdir(OUT_DIR, { recursive: true });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const browser = await chromium.launch();
const summary = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, userAgent: UA });
  const page = await ctx.newPage();
  for (const p of PAGES) {
    for (const [label, base, route] of [
      ['original', ORIGINAL, p.original],
      ['clone',    CLONE,    p.clone],
    ]) {
      const url = base + route;
      const out = path.join(OUT_DIR, `${p.slug}.${vp.name}.${label}.png`);
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        // give Cargo runtime JS extra time to settle layout
        await page.waitForTimeout(label === 'original' ? 1500 : 500);
        await page.screenshot({ path: out, fullPage: true });
        summary.push({ slug: p.slug, vp: vp.name, label, ok: true });
        console.log('OK ', vp.name, p.slug, label);
      } catch (e) {
        summary.push({ slug: p.slug, vp: vp.name, label, ok: false, err: e.message });
        console.log('ERR', vp.name, p.slug, label, e.message);
      }
    }
  }
  await ctx.close();
}
await browser.close();

const failed = summary.filter(s => !s.ok);
console.log(`\nDone. ${summary.length - failed.length}/${summary.length} screenshots saved.`);
if (failed.length) {
  console.log('Failures:');
  failed.forEach(f => console.log(' -', f.vp, f.slug, f.label, f.err));
}
console.log('Output dir:', OUT_DIR);
