/**
 * Measure computed visual metrics for original and clone pages.
 *
 * This is a numeric companion to visual-diff. It reports bounding boxes,
 * computed font styles, and gallery column counts so CSS iterations can start
 * from evidence instead of ad hoc Playwright snippets.
 *
 * Usage:
 *   npm run visual:measure -- --clone=http://localhost:4350
 *   npm run visual:measure -- --pages=home,codes,pixel --viewports=desktop
 *   npm run visual:measure -- --targets=original,clone --format=json
 */
import { chromium } from 'playwright';

import {
  DEFAULT_CLONE_URL,
  DEFAULT_ORIGINAL_URL,
  USER_AGENT,
  gotoVisualPage,
  parseVisualArgs,
  selectPages,
  selectViewports,
  splitListArg,
  targetUrl,
} from './visual-config.mjs';

const args = parseVisualArgs();
const ORIGINAL = args.original || DEFAULT_ORIGINAL_URL;
const CLONE = args.clone || DEFAULT_CLONE_URL;
const PAGES = selectPages(args.pages || 'home,codes,pixel');
const VIEWPORTS = selectViewports(args.viewports || 'mobile,tablet,laptop,desktop,wide');
const TARGETS = splitListArg(args.targets || 'original,clone');
const FORMAT = args.format || 'text';

const targetConfigs = {
  original: { baseUrl: ORIGINAL, routeKey: 'original', waitMs: 1500 },
  clone: { baseUrl: CLONE, routeKey: 'clone', waitMs: 500 },
};

for (const target of TARGETS) {
  if (!targetConfigs[target]) throw new Error(`Unknown visual target "${target}".`);
}

const browser = await chromium.launch();
const records = [];

try {
  for (const viewport of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      userAgent: USER_AGENT,
    });
    const page = await ctx.newPage();

    for (const pageInfo of PAGES) {
      for (const target of TARGETS) {
        const config = targetConfigs[target];
        const url = targetUrl(config.baseUrl, pageInfo[config.routeKey]);

        try {
          await gotoVisualPage(page, url, config.waitMs);
          const metrics = await collectStyleMetrics(page);
          records.push({ target, viewport: viewport.name, page: pageInfo.slug, url, ok: true, metrics });
        } catch (error) {
          records.push({ target, viewport: viewport.name, page: pageInfo.slug, url, ok: false, error: error.message });
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
  printTextReport(records);
}

if (records.some((record) => !record.ok)) process.exitCode = 1;

async function collectStyleMetrics(page) {
  return page.evaluate(() => {
    const round = (value) => Math.round(value * 100) / 100;
    const px = (value) => {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? round(parsed) : null;
    };
    const selectors = {
      html: 'html',
      body: 'body',
      container: '.container_width, .container',
      bodycopy: 'bodycopy, .bodycopy',
      pageContent: '.page_content, .home-grid',
      navColumn: '.home-grid__col--nav, [grid-col="4"]',
      mainColumn: '.home-grid__col--main, [grid-col="8"]',
      h1: 'h1',
      h2: 'h2',
      back: '.page-back a, a',
      homeAvatar: '.home-avatar, img[alt="Onovich"]',
      homeDivider: '.home-divider, hr',
      homeBio: '.home-bio, small',
      thumbnailsContainer: '.thumbnails-container, .image-gallery, [thumbnails]',
      thumbnails: '.thumbnails, .image-gallery, [thumbnails]',
      thumb: '.thumb, .gallery_card, [thumb]',
      thumbImage: '.thumb_image, .gallery_card_image img, .image-gallery img, img',
      title: '.title, .caption b, .gallery_image_caption b',
      tags: '.tags, .caption, .gallery_image_caption',
    };

    const pick = (selector, options = {}) => {
      const elements = Array.from(document.querySelectorAll(selector));
      const filtered = elements.filter((element) => {
        if (options.text) {
          const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
          if (text !== options.text) return false;
        }
        return visible(element);
      });

      if (options.pick === 'right') {
        filtered.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
      } else {
        filtered.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
      }

      return filtered[0] || null;
    };

    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) !== 0
        && rect.width > 0
        && rect.height > 0;
    };

    const read = (element, extra = {}) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        ...extra,
        x: round(rect.x),
        y: round(rect.y),
        width: round(rect.width),
        height: round(rect.height),
        fontSize: px(style.fontSize),
        lineHeight: px(style.lineHeight),
        fontWeight: style.fontWeight,
        fontFamily: style.fontFamily,
        marginTop: px(style.marginTop),
        marginBottom: px(style.marginBottom),
        paddingTop: px(style.paddingTop),
        paddingRight: px(style.paddingRight),
        paddingBottom: px(style.paddingBottom),
        paddingLeft: px(style.paddingLeft),
        display: style.display,
      };
    };

    const back = Array.from(document.querySelectorAll(selectors.back))
      .find((element) => (element.textContent || '').replace(/\s+/g, ' ').trim() === '< HOME');
    const mainColumn = pick(selectors.mainColumn);
    const mainAnchor = findMainAnchor(mainColumn);

    const thumbElements = Array.from(document.querySelectorAll(selectors.thumb)).filter(visible);
    const thumbRects = thumbElements.map((element) => element.getBoundingClientRect());
    const firstRowTop = thumbRects.length > 0 ? Math.min(...thumbRects.map((rect) => rect.y)) : null;
    const firstRowRects = firstRowTop === null ? [] : thumbRects.filter((rect) => Math.abs(rect.y - firstRowTop) < 3);
    const firstRowX = firstRowRects.map((rect) => round(rect.x)).sort((a, b) => a - b);

    const thumbnails = pick(selectors.thumbnails);
    const cargoCols = thumbnails?.getAttribute('thumbnails-cols') || thumbnails?.getAttribute('thumbnails-columns') || '';
    const gallerySections = readGallerySections(selectors.thumbnails);

    return {
      pageTitle: document.title,
      bodyClass: document.body.className,
      html: read(document.documentElement),
      body: read(document.body),
      container: read(pick(selectors.container)),
      bodycopy: read(pick(selectors.bodycopy)),
      pageContent: read(pick(selectors.pageContent)),
      navColumn: read(pick(selectors.navColumn)),
      mainColumn: read(mainColumn),
      mainAnchor: read(mainAnchor?.element, mainAnchor ? { kind: mainAnchor.kind } : {}),
      h1: read(pick(selectors.h1)),
      h2: read(pick(selectors.h2)),
      back: read(back),
      homeAvatar: read(pick(selectors.homeAvatar)),
      homeDivider: read(pick(selectors.homeDivider)),
      homeBio: read(pick(selectors.homeBio)),
      thumbnailsContainer: read(pick(selectors.thumbnailsContainer)),
      thumbnails: read(thumbnails),
      thumb: read(pick(selectors.thumb)),
      thumbImage: read(pick(selectors.thumbImage)),
      title: read(pick(selectors.title)),
      tags: read(pick(selectors.tags)),
      gallery: {
        columns: firstRowX.length,
        firstRowX,
        cargoCols,
        itemCount: thumbRects.length,
      },
      gallerySections,
    };

    function readGallerySections(selector) {
      return Array.from(document.querySelectorAll(selector)).filter(visible).map((galleryElement, index) => {
        const thumbs = Array.from(galleryElement.querySelectorAll(selectors.thumb)).filter(visible);
        const images = Array.from(galleryElement.querySelectorAll(selectors.thumbImage)).filter(visible);
        const sectionThumbRects = thumbs.map((element) => element.getBoundingClientRect());
        const rowTop = sectionThumbRects.length > 0 ? Math.min(...sectionThumbRects.map((rect) => rect.y)) : null;
        const rowRects = rowTop === null ? [] : sectionThumbRects.filter((rect) => Math.abs(rect.y - rowTop) < 3);

        return {
          index,
          className: galleryElement.className?.toString?.() || '',
          columns: rowRects.length,
          itemCount: thumbs.length,
          gallery: read(galleryElement),
          thumb: read(thumbs[0]),
          thumbImage: read(images[0]),
        };
      });
    }

    function findMainAnchor(mainElement) {
      const mainRect = mainElement?.getBoundingClientRect() || null;
      const candidates = [];
      const add = (kind, selector, options = {}) => {
        for (const element of document.querySelectorAll(selector)) {
          if (!visible(element)) continue;
          if (options.text) {
            const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
            if (text !== options.text) continue;
          }
          if (!isInsideMainContent(element, mainRect)) continue;
          candidates.push({ kind, element, rect: element.getBoundingClientRect() });
        }
      };

      add('back', selectors.back, { text: '< HOME' });
      add('homeAvatar', selectors.homeAvatar);
      add('thumbnails', selectors.thumbnailsContainer);
      add('thumb', selectors.thumb);
      add('image', 'img');
      add('homeDivider', selectors.homeDivider);
      add('homeBio', selectors.homeBio);

      candidates.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
      return candidates[0] || null;
    }

    function isInsideMainContent(element, mainRect) {
      if (!mainRect) return true;
      const rect = element.getBoundingClientRect();
      const centerX = rect.x + rect.width / 2;
      return centerX >= mainRect.x - 40
        && centerX <= mainRect.right + 40
        && rect.y >= mainRect.y - 5;
    }
  });
}

function printTextReport(records) {
  const groups = new Map();
  for (const record of records) {
    const key = `${record.viewport}/${record.page}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }

  for (const [key, group] of groups) {
    console.log(`\n## ${key}`);
    const original = group.find((record) => record.target === 'original');
    const clone = group.find((record) => record.target === 'clone');

    for (const record of group) {
      if (!record.ok) {
        console.log(`ERR ${record.target}: ${record.error}`);
        continue;
      }
      const secondGallery = record.metrics.gallerySections?.[1];
      const secondGallerySummary = secondGallery
        ? `g2=${secondGallery.columns}c ${fmt(secondGallery.thumbImage?.width)}x${fmt(secondGallery.thumbImage?.height)} h=${fmt(secondGallery.gallery?.height)}`
        : '';
      console.log(
        [
          record.target.padEnd(8),
          `html=${fmt(record.metrics.html?.fontSize)}`,
          `body=${fmt(record.metrics.bodycopy?.fontSize)}/${fmt(record.metrics.bodycopy?.lineHeight)}`,
          `main=${fmt(record.metrics.mainColumn?.x)},${fmt(record.metrics.mainColumn?.y)} ${fmt(record.metrics.mainColumn?.width)}x${fmt(record.metrics.mainColumn?.height)}`,
          `anchor=${record.metrics.mainAnchor?.kind || '-'}@${fmt(record.metrics.mainAnchor?.x)},${fmt(record.metrics.mainAnchor?.y)}`,
          `thumb=${fmt(record.metrics.thumbImage?.width)}x${fmt(record.metrics.thumbImage?.height)}`,
          `title=${fmt(record.metrics.title?.fontSize)}/${fmt(record.metrics.title?.lineHeight)}`,
          `tags=${fmt(record.metrics.tags?.fontSize)}/${fmt(record.metrics.tags?.lineHeight)}`,
          `cols=${record.metrics.gallery.columns}${record.metrics.gallery.cargoCols ? `(${record.metrics.gallery.cargoCols})` : ''}`,
          secondGallerySummary,
        ].filter(Boolean).join('  ')
      );
    }

    if (original?.ok && clone?.ok) printDelta(original.metrics, clone.metrics);
  }
}

function printDelta(original, clone) {
  const lines = [
    ['html.fontSize', original.html?.fontSize, clone.html?.fontSize],
    ['bodycopy.fontSize', original.bodycopy?.fontSize, clone.bodycopy?.fontSize],
    ['bodycopy.lineHeight', original.bodycopy?.lineHeight, clone.bodycopy?.lineHeight],
    ['main.x', original.mainColumn?.x, clone.mainColumn?.x],
    ['main.y', original.mainColumn?.y, clone.mainColumn?.y],
    ['main.width', original.mainColumn?.width, clone.mainColumn?.width],
    ['mainAnchor.y', original.mainAnchor?.y, clone.mainAnchor?.y],
    ['thumbnails.y', original.thumbnails?.y, clone.thumbnails?.y],
    ['thumbImage.width', original.thumbImage?.width, clone.thumbImage?.width],
    ['thumbImage.height', original.thumbImage?.height, clone.thumbImage?.height],
    ['title.fontSize', original.title?.fontSize, clone.title?.fontSize],
    ['title.lineHeight', original.title?.lineHeight, clone.title?.lineHeight],
    ['tags.fontSize', original.tags?.fontSize, clone.tags?.fontSize],
    ['tags.lineHeight', original.tags?.lineHeight, clone.tags?.lineHeight],
    ['gallery.columns', original.gallery?.columns, clone.gallery?.columns],
    ['gallery2.columns', original.gallerySections?.[1]?.columns, clone.gallerySections?.[1]?.columns],
    ['gallery2.thumbImage.width', original.gallerySections?.[1]?.thumbImage?.width, clone.gallerySections?.[1]?.thumbImage?.width],
    ['gallery2.thumbImage.height', original.gallerySections?.[1]?.thumbImage?.height, clone.gallerySections?.[1]?.thumbImage?.height],
    ['gallery2.height', original.gallerySections?.[1]?.gallery?.height, clone.gallerySections?.[1]?.gallery?.height],
  ];

  const summary = lines
    .filter(([, a, b]) => Number.isFinite(a) && Number.isFinite(b))
    .map(([name, a, b]) => `${name}:${signed(round(b - a))}`)
    .join('  ');

  if (summary) console.log(`delta     ${summary}`);
}

function fmt(value) {
  return Number.isFinite(value) ? String(round(value)).padStart(5) : '    -';
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}

function px(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? round(parsed) : null;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
