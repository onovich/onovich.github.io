/**
 * Visual diff: screenshot original (onovich.com) vs clone (blog.onovich.com)
 * at multiple viewports. Output goes to ../../diff-screenshots/.
 *
 * Usage:
 *   cd site && node scripts/visual-diff.mjs
 *   node scripts/visual-diff.mjs --pages=home,codes
 *   node scripts/visual-diff.mjs --clone=http://localhost:4321
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_CLONE_URL,
  DEFAULT_ORIGINAL_URL,
  USER_AGENT,
  VISUAL_OUT_DIR,
  parseVisualArgs,
  selectPages,
  selectViewports,
  gotoVisualPage,
  targetUrl,
} from './visual-config.mjs';

const args = parseVisualArgs();
const ORIGINAL = args.original || DEFAULT_ORIGINAL_URL;
const CLONE = args.clone || DEFAULT_CLONE_URL;
const OUT_DIR = VISUAL_OUT_DIR;
const PAGES = selectPages(args.pages);
const VIEWPORTS = selectViewports(args.viewports);

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const summary = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, userAgent: USER_AGENT });
  const page = await ctx.newPage();
  for (const p of PAGES) {
    for (const [label, base, route] of [
      ['original', ORIGINAL, p.original],
      ['clone',    CLONE,    p.clone],
    ]) {
      const url = targetUrl(base, route);
      const out = path.join(OUT_DIR, `${p.slug}.${vp.name}.${label}.png`);
      try {
        // Cargo can keep network requests open or close them late; wait for the
        // DOM, then give runtime layout JS a fixed settling window.
        await gotoVisualPage(page, url, label === 'original' ? 1500 : 500);
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
  process.exitCode = 1;
}
console.log('Output dir:', OUT_DIR);
