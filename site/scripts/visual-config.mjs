import path from 'node:path';

export const DEFAULT_ORIGINAL_URL = 'https://onovich.com';
export const DEFAULT_CLONE_URL = 'https://blog.onovich.com';

export const VISUAL_OUT_DIR = path.resolve(
  import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
  '../../diff-screenshots'
);

export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const PHOTO_DETAIL_PAGES = Array.from({ length: 8 }, (_, index) => {
  const slug = `photo_${index + 1}`;
  return { slug, original: `/${slug}`, clone: `/${slug}`, navLabel: 'PHOTOS', backLabel: 'PHOTO' };
});

export const PAGES_BASE = [
  { slug: 'home',        original: '/',             clone: '/',             navLabel: 'CODES' },
  { slug: 'codes',       original: '/codes',        clone: '/codes',        navLabel: 'CODES' },
  { slug: 'game',        original: '/game',         clone: '/game',         navLabel: 'GAMES' },
  { slug: 'pixel',       original: '/pixel',        clone: '/pixel',        navLabel: 'PIXEL ARTS' },
  { slug: 'illustrator', original: '/illustrator',  clone: '/illustrator',  navLabel: 'ILLUSTRATIONS' },
  { slug: 'gif',         original: '/gif',          clone: '/gif',          navLabel: 'GIFS' },
  { slug: 'graphic',     original: '/graphic',      clone: '/graphic',      navLabel: 'GRAPHIC DESIGNS' },
  { slug: 'photo',       original: '/photo',        clone: '/photo',        navLabel: 'PHOTOS' },
  { slug: 'poem',        original: '/poem',         clone: '/poem',         navLabel: 'POEMS' },
  { slug: 'sns',         original: '/sns',          clone: '/sns',          navLabel: 'SNS' },
  { slug: 'links',       original: '/links',        clone: '/links',        navLabel: 'LINKS' },
  { slug: 'contact',     original: '/contact-form', clone: '/contact',      navLabel: 'MESSAGE' },
];

export const PAGES_ALL = [
  ...PAGES_BASE,
  ...PHOTO_DETAIL_PAGES,
];

export const VIEWPORTS = [
  { name: 'mobile',  width: 375,  height: 800 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'laptop',  width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide',    width: 1920, height: 1080 },
];

const PAGE_ALIASES = new Map([
  ['index', 'home'],
  ['/', 'home'],
]);

const PAGE_GROUPS = new Map([
  ['gallery', ['codes', 'game', 'pixel', 'illustrator', 'gif', 'graphic', 'photo']],
  ['galleries', ['codes', 'game', 'pixel', 'illustrator', 'gif', 'graphic', 'photo']],
  ['photo-details', PHOTO_DETAIL_PAGES.map((page) => page.slug)],
  ['photo-detail', PHOTO_DETAIL_PAGES.map((page) => page.slug)],
  ['photo-albums', ['photo', ...PHOTO_DETAIL_PAGES.map((page) => page.slug)]],
]);

export function parseVisualArgs(argv = process.argv.slice(2)) {
  return Object.fromEntries(
    argv.map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, '').split('=');
      return [key, rest.length > 0 ? rest.join('=') : true];
    })
  );
}

export function splitListArg(value) {
  return (value || '').toString().split(',').map((item) => item.trim()).filter(Boolean);
}

export function numberArg(value, fallback) {
  if (value === undefined || value === true || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function selectPages(value) {
  const requested = expandPageGroups(splitListArg(value).map((slug) => PAGE_ALIASES.get(slug) || slug));
  if (requested.length === 0) return PAGES_ALL;

  const pages = requested.map((slug) => {
    const page = PAGES_ALL.find((item) => item.slug === slug);
    if (!page) throw new Error(`Unknown visual page "${slug}".`);
    return page;
  });
  return pages;
}

function expandPageGroups(slugs) {
  return slugs.flatMap((slug) => PAGE_GROUPS.get(slug) || [slug]);
}

export function selectViewports(value) {
  const requested = splitListArg(value);
  if (requested.length === 0) return VIEWPORTS;

  return requested.map((name) => {
    const viewport = VIEWPORTS.find((item) => item.name === name);
    if (!viewport) throw new Error(`Unknown visual viewport "${name}".`);
    return viewport;
  });
}

export function targetUrl(baseUrl, route) {
  const base = baseUrl.replace(/\/+$/, '');
  const suffix = route.startsWith('/') ? route : `/${route}`;
  return `${base}${suffix}`;
}

export function formatImageStats(stats) {
  if (!stats) return '';
  const pending = stats.pending ?? Math.max(0, stats.total - stats.loaded);
  return `images=${stats.loaded}/${stats.total}${pending ? ` pending=${pending}` : ''}`;
}

export async function gotoVisualPage(page, url, settleMs, options = {}) {
  const attempts = options.attempts ?? 2;
  const timeout = options.timeout ?? 45000;
  const loadImages = options.loadImages !== false;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
      await page.waitForLoadState('load', { timeout: Math.min(10000, timeout) }).catch(() => {});
      let imageStats = null;
      if (loadImages) {
        await revealLazyImages(page, {
          passes: options.scrollPasses ?? 2,
          delayMs: options.scrollDelay ?? 80,
        });
        imageStats = await waitForImages(page, options.imageTimeout ?? 8000);
      }
      await page.waitForTimeout(settleMs);
      return { imageStats };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await page.waitForTimeout(1000);
    }
  }

  throw lastError;
}

async function revealLazyImages(page, options) {
  await page.evaluate(async ({ passes, delayMs }) => {
    const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

    document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
      img.loading = 'eager';
    });

    const viewportHeight = window.innerHeight || 800;
    const step = Math.max(250, Math.floor(viewportHeight * 0.8));

    for (let pass = 0; pass < passes; pass += 1) {
      const scrollHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      for (let y = 0; y <= scrollHeight; y += step) {
        window.scrollTo(0, y);
        await sleep(delayMs);
      }
    }

    window.scrollTo(0, 0);
  }, options);
}

async function waitForImages(page, timeout) {
  return page.evaluate(async (imageTimeout) => {
    const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
    const round = (value) => Math.round(value * 100) / 100;
    const images = Array.from(document.images);
    const isRenderable = (img) => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
    const compactSrc = (src) => {
      if (!src) return '';
      try {
        const url = new URL(src, window.location.href);
        return url.origin === window.location.origin ? `${url.pathname}${url.search}` : url.href;
      } catch {
        return src;
      }
    };
    const describeImage = (img) => {
      const rect = img.getBoundingClientRect();
      return {
        src: compactSrc(img.currentSrc || img.getAttribute('src') || ''),
        alt: img.getAttribute('alt') || '',
        loading: img.loading || '',
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        x: round(rect.x),
        y: round(rect.y),
        width: round(rect.width),
        height: round(rect.height),
      };
    };
    const settled = Promise.all(images.map((img) => {
      if (isRenderable(img) || img.complete) return true;
      return new Promise((resolve) => {
        img.addEventListener('load', () => resolve(true), { once: true });
        img.addEventListener('error', () => resolve(true), { once: true });
      });
    }));

    await Promise.race([settled, sleep(imageTimeout)]);
    window.scrollTo(0, 0);

    const unloaded = images.filter((img) => !isRenderable(img));

    return {
      total: images.length,
      loaded: images.filter(isRenderable).length,
      pending: unloaded.length,
      unloaded: unloaded.map(describeImage),
    };
  }, timeout);
}
