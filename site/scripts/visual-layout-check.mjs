/**
 * Fast visual layout guard for the site shell.
 *
 * This does not replace screenshot review. It catches the high-risk regression
 * where inner pages lose the left Onovich navigation or the right-side back
 * link before a human opens diff-screenshots/*.png.
 *
 * Usage:
 *   node scripts/visual-layout-check.mjs --clone=http://localhost:4350
 *   node scripts/visual-layout-check.mjs --clone=http://localhost:4350 --pages=home,codes,pixel --viewports=desktop
 *   node scripts/visual-layout-check.mjs --targets=original,clone --pages=codes --viewports=desktop
 */
import { chromium } from 'playwright';

import {
  USER_AGENT,
  parseVisualArgs,
  selectPages,
  selectTargets,
  selectViewports,
  gotoVisualPage,
  targetUrl,
} from './visual-config.mjs';

const args = parseVisualArgs();
const PAGES = selectPages(args.pages || 'home,codes,pixel');
const VIEWPORTS = selectViewports(args.viewports || 'desktop');
const TARGETS = selectTargets(args.targets, 'clone', args);

const browser = await chromium.launch();
const failures = [];
let checks = 0;

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
        const route = pageInfo[config.routeKey];
        const url = targetUrl(config.baseUrl, route);

        try {
          await gotoVisualPage(page, url, config.waitMs, { loadImages: false });
        } catch (error) {
          const message = `navigation failed: ${error.message}`;
          failures.push({ target: config.name, slug: pageInfo.slug, viewport: viewport.name, url, errors: [message], facts: null });
          console.log('ERR', viewport.name, pageInfo.slug, config.name, message);
          continue;
        }

        const facts = await collectLayoutFacts(page, pageInfo);
        const result = validateLayout({ target: config.name, pageInfo, viewport, facts });
        checks += result.checked;

        if (result.errors.length > 0) {
          failures.push({ target: config.name, slug: pageInfo.slug, viewport: viewport.name, url, errors: result.errors, facts });
          console.log('ERR', viewport.name, pageInfo.slug, config.name, result.errors.join('; '));
        } else {
          console.log(
            'OK ',
            viewport.name,
            pageInfo.slug,
            config.name,
            `nav=${formatRect(facts.navLink?.rect)}`,
            `logo=${formatRect(facts.logo?.rect)}`,
            facts.backLink?.rect ? `back=${formatRect(facts.backLink.rect)}` : ''
          );
        }
      }
    }

    await ctx.close();
  }
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(`\nVisual layout check failed: ${failures.length} page target(s) failed.`);
  for (const failure of failures) {
    console.error(`- ${failure.viewport} ${failure.slug} ${failure.target}: ${failure.url}`);
    for (const error of failure.errors) console.error(`  - ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`\nVisual layout check passed: ${checks} assertions.`);
}

async function collectLayoutFacts(page, pageInfo) {
  return page.evaluate((info) => {
    const navLabel = info.navLabel;
    const backText = `< ${info.backLabel || 'HOME'}`;
    const normalize = (value) => value.replace(/\s+/g, ' ').trim();
    const rectOf = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const visible = style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) !== 0
        && rect.width > 0
        && rect.height > 0;

      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
        visible,
      };
    };

    const isVisible = (element) => rectOf(element)?.visible === true;
    const candidate = (elements, text, pick = 'left') => {
      const matches = Array.from(elements)
        .map((element) => ({ element, rect: rectOf(element), text: normalize(element.textContent || '') }))
        .filter((item) => item.text === text && item.rect?.visible);

      matches.sort((a, b) => pick === 'right' ? b.rect.x - a.rect.x : a.rect.x - b.rect.x);
      return matches[0] || null;
    };

    const logo = candidate(document.querySelectorAll('h1 a, [class*="logo"], h1'), 'Onovich');
    const navLink = candidate(document.querySelectorAll('a'), navLabel);
    const backLink = candidate(document.querySelectorAll('a'), backText, 'right');
    const navColumn = document.querySelector('.home-grid__col--nav');
    const mainColumn = document.querySelector('.home-grid__col--main');

    return {
      bodyClass: document.body.className,
      title: document.title,
      logo: logo ? { text: logo.text, rect: logo.rect } : null,
      navLink: navLink ? {
        text: navLink.text,
        rect: navLink.rect,
        active: navLink.element.classList.contains('active'),
        href: navLink.element.getAttribute('href'),
      } : null,
      backLink: backLink ? { text: backLink.text, rect: backLink.rect } : null,
      navColumn: navColumn && isVisible(navColumn) ? rectOf(navColumn) : null,
      mainColumn: mainColumn && isVisible(mainColumn) ? rectOf(mainColumn) : null,
    };
  }, pageInfo);
}

function validateLayout({ target, pageInfo, viewport, facts }) {
  const errors = [];
  const desktopLike = viewport.width >= 1024;
  const leftLimit = desktopLike ? Math.max(220, viewport.width * 0.22) : Math.max(42, viewport.width * 0.22);
  let checked = 0;

  checked += assertRect(errors, facts.logo?.rect, `missing visible Onovich logo`, (rect) => (
    rect.x <= leftLimit ? '' : `Onovich logo is not in the left navigation area (x=${round(rect.x)}, limit=${round(leftLimit)})`
  ));

  checked += assertRect(errors, facts.navLink?.rect, `missing visible ${pageInfo.navLabel} nav link`, (rect) => (
    rect.x <= leftLimit ? '' : `${pageInfo.navLabel} nav link is not in the left navigation area (x=${round(rect.x)}, limit=${round(leftLimit)})`
  ));

  if (pageInfo.slug !== 'home' && desktopLike) {
    const backText = `< ${pageInfo.backLabel || 'HOME'}`;
    checked += assertRect(errors, facts.backLink?.rect, `missing visible ${backText} back link`, (rect) => (
      rect.x >= viewport.width * 0.6 ? '' : `${backText} link is not aligned to the right content area (x=${round(rect.x)})`
    ));
  }

  if (target === 'clone' && desktopLike) {
    checked += assertRect(errors, facts.navColumn, 'clone is missing .home-grid__col--nav', () => '');
    checked += assertRect(errors, facts.mainColumn, 'clone is missing .home-grid__col--main', () => '');

    if (facts.navColumn && facts.mainColumn) {
      checked += 1;
      if (facts.mainColumn.x <= facts.navColumn.x + facts.navColumn.width * 0.8) {
        errors.push(`clone main column overlaps the left navigation (nav=${formatRect(facts.navColumn)}, main=${formatRect(facts.mainColumn)})`);
      }
    }

    if (pageInfo.slug !== 'home') {
      checked += 1;
      if (!facts.navLink?.active) errors.push(`${pageInfo.navLabel} nav link is not marked active in clone`);
    }
  }

  return { checked, errors };
}

function assertRect(errors, rect, missingMessage, validate) {
  if (!rect?.visible) {
    errors.push(missingMessage);
    return 1;
  }

  const message = validate(rect);
  if (message) errors.push(message);
  return 1;
}

function formatRect(rect) {
  if (!rect) return 'missing';
  return `${round(rect.x)},${round(rect.y)} ${round(rect.width)}x${round(rect.height)}`;
}

function round(value) {
  return Math.round(value * 10) / 10;
}
