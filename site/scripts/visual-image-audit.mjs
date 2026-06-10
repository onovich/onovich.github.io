/**
 * Lightweight image load audit for clone/original visual pages.
 *
 * This uses the same Playwright navigation and lazy-image warmup as visual-diff,
 * but it does not save screenshots. Use it before screenshot-heavy reviews to
 * find which gallery pages still need poster/eager tuning.
 *
 * Usage:
 *   node scripts/visual-image-audit.mjs --clone=http://localhost:4350
 *   node scripts/visual-image-audit.mjs --pages=illustrator,gif --viewports=desktop,wide
 *   node scripts/visual-image-audit.mjs --pages=photo-details
 *   node scripts/visual-image-audit.mjs --targets=original,clone --failOnPending=false
 */
import { chromium } from 'playwright';

import {
  USER_AGENT,
  formatImageStats,
  gotoVisualPage,
  numberArg,
  parseVisualArgs,
  selectPages,
  selectTargets,
  selectViewports,
  targetUrl,
} from './visual-config.mjs';

const DEFAULT_GALLERY_PAGES = 'galleries,photo-details';

const args = parseVisualArgs();
const PAGES = selectPages(args.pages || DEFAULT_GALLERY_PAGES);
const VIEWPORTS = selectViewports(args.viewports || 'desktop');
const TARGETS = selectTargets(args.targets, 'clone', args);
const IMAGE_TIMEOUT = numberArg(args.imageTimeout, 25000);
const SCROLL_PASSES = numberArg(args.scrollPasses, 3);
const SCROLL_DELAY = numberArg(args.scrollDelay, 80);
const MAX_PENDING = numberArg(args.maxPending, 3);
const FORMAT = args.format || 'text';
const FAIL_ON_PENDING = args.failOnPending !== 'false';

const records = [];
const browser = await chromium.launch();

try {
  for (const viewport of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      userAgent: USER_AGENT,
    });
    const page = await ctx.newPage();

    for (const pageInfo of PAGES) {
      for (const target of TARGETS) {
        const config = target;
        const url = targetUrl(config.baseUrl, pageInfo[config.routeKey]);

        try {
          const result = await gotoVisualPage(page, url, config.waitMs, {
            imageTimeout: IMAGE_TIMEOUT,
            scrollPasses: SCROLL_PASSES,
            scrollDelay: SCROLL_DELAY,
          });
          const imageStats = result?.imageStats || { total: 0, loaded: 0, pending: 0, unloaded: [] };
          records.push({ ok: true, target: config.name, viewport: viewport.name, page: pageInfo.slug, url, imageStats });
          printRecord({ target: config.name, viewport: viewport.name, page: pageInfo.slug, imageStats });
        } catch (error) {
          records.push({ ok: false, target: config.name, viewport: viewport.name, page: pageInfo.slug, url, error: error.message });
          if (FORMAT !== 'json') console.log('ERR', viewport.name, pageInfo.slug, config.name, error.message);
        }
      }
    }

    await ctx.close();
  }
} finally {
  await browser.close();
}

if (FORMAT === 'json') {
  console.log(JSON.stringify(records, null, 2));
} else {
  printSummary(records);
}

const navigationFailures = records.filter((record) => !record.ok);
const pendingFailures = records.filter((record) => record.ok && (record.imageStats?.pending ?? 0) > 0);

if (navigationFailures.length > 0 || (FAIL_ON_PENDING && pendingFailures.length > 0)) {
  process.exitCode = 1;
}

function printRecord({ target, viewport, page, imageStats }) {
  if (FORMAT === 'json') return;
  const pending = imageStats.pending ?? Math.max(0, imageStats.total - imageStats.loaded);
  const status = pending > 0 ? 'WARN' : 'OK  ';
  const details = pending > 0 ? ` ${formatPending(imageStats.unloaded || [])}` : '';
  console.log(status, viewport, page, target, formatImageStats(imageStats), details);
}

function printSummary(auditRecords) {
  const okRecords = auditRecords.filter((record) => record.ok);
  const navigationFailures = auditRecords.length - okRecords.length;
  const pendingImages = okRecords.reduce((sum, record) => sum + (record.imageStats?.pending ?? 0), 0);
  const loadedImages = okRecords.reduce((sum, record) => sum + (record.imageStats?.loaded ?? 0), 0);
  const totalImages = okRecords.reduce((sum, record) => sum + (record.imageStats?.total ?? 0), 0);

  console.log(
    `\nImage audit ${pendingImages === 0 && navigationFailures === 0 ? 'passed' : 'finished with issues'}: `
    + `${okRecords.length}/${auditRecords.length} targets, images=${loadedImages}/${totalImages}`
    + `${pendingImages ? ` pending=${pendingImages}` : ''}`
    + `${navigationFailures ? ` navigationFailures=${navigationFailures}` : ''}.`
  );

  if (pendingImages > 0 && !FAIL_ON_PENDING) {
    console.log('Pending images were reported without failing because --failOnPending=false.');
  }
}

function formatPending(unloaded) {
  const visible = unloaded.slice(0, MAX_PENDING).map((image) => {
    const state = image.complete ? 'broken' : 'pending';
    return `${state}:${image.src || '(empty-src)'}@${image.y}`;
  });
  const rest = unloaded.length - visible.length;
  return `[${visible.join(', ')}${rest > 0 ? `, +${rest} more` : ''}]`;
}
