/**
 * Fast visual layout guard for the site shell.
 *
 * This does not replace screenshot review. It catches the high-risk regression
 * where a portfolio page loses its index, mobile header, active route state,
 * or content alignment before human screenshot review.
 *
 * Usage:
 *   node scripts/visual-layout-check.mjs --clone=http://localhost:4350
 *   node scripts/visual-layout-check.mjs --clone=http://localhost:4350 --pages=portfolio-core --viewports=desktop
 *   node scripts/visual-layout-check.mjs --clone=http://localhost:4350 --pages=portfolio-galleries --viewports=mobile,desktop
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
const PAGES = selectPages(args.pages || 'portfolio-core');
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
        const result = validatePortfolioLayout({ pageInfo, viewport, facts });
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
            `logo=${formatRect(facts.logo?.rect)}`
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

    const logo = candidate(
      document.querySelectorAll('.wordmark, .mobile-wordmark'),
      'Onovich'
    );
    const navLink = candidate(document.querySelectorAll('.route-nav a'), navLabel);
    const navColumn = document.querySelector('.site-index');
    const mainColumn = document.querySelector('.site-content');
    const navRoot = document.querySelector('.site-index > .route-nav');
    const mobileHeader = document.querySelector('.mobile-header');
    const heading = document.querySelector('.site-content h1');
    const contentStart = document.querySelector('.site-content > :first-child');

    return {
      bodyClass: document.body.className,
      title: document.title,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      logo: logo ? { text: logo.text, rect: logo.rect } : null,
      navLink: navLink ? {
        text: navLink.text,
        rect: navLink.rect,
        active: navLink.element.getAttribute('aria-current') === 'page',
        href: navLink.element.getAttribute('href'),
      } : null,
      navColumn: navColumn && isVisible(navColumn) ? rectOf(navColumn) : null,
      mainColumn: mainColumn && isVisible(mainColumn) ? rectOf(mainColumn) : null,
      navRoot: navRoot && isVisible(navRoot) ? rectOf(navRoot) : null,
      mobileHeader: mobileHeader && isVisible(mobileHeader) ? rectOf(mobileHeader) : null,
      heading: heading && isVisible(heading) ? rectOf(heading) : null,
      contentStart: contentStart && isVisible(contentStart) ? rectOf(contentStart) : null,
    };
  }, pageInfo);
}

function validatePortfolioLayout({ pageInfo, viewport, facts }) {
  const errors = [];
  const desktopLike = viewport.width >= 1024;
  let checked = 0;

  checked += 1;
  if (facts.overflow) errors.push('page has horizontal overflow');

  checked += assertRect(errors, facts.heading, 'missing visible page heading', () => '');
  checked += assertRect(errors, facts.logo?.rect, 'missing visible Onovich wordmark', () => '');

  if (!desktopLike) {
    checked += assertRect(errors, facts.mobileHeader, 'missing visible mobile header', () => '');
    return { checked, errors };
  }

  const leftLimit = Math.max(220, viewport.width * 0.28);
  checked += assertRect(errors, facts.navLink?.rect, `missing visible ${pageInfo.navLabel} nav link`, (rect) => (
    rect.x <= leftLimit ? '' : `${pageInfo.navLabel} nav link is not in the left index (x=${round(rect.x)}, limit=${round(leftLimit)})`
  ));
  checked += assertRect(errors, facts.navColumn, 'missing visible .site-index', () => '');
  checked += assertRect(errors, facts.mainColumn, 'missing visible .site-content', () => '');
  checked += assertRect(errors, facts.navRoot, 'missing visible desktop route navigation', () => '');

  if (facts.navColumn && facts.mainColumn) {
    checked += 1;
    if (facts.mainColumn.x < facts.navColumn.right - 0.5) {
      errors.push(`main content overlaps the left index (nav=${formatRect(facts.navColumn)}, main=${formatRect(facts.mainColumn)})`);
    }
  }

  if (facts.navRoot && facts.contentStart) {
    checked += 1;
    const delta = Math.abs(facts.navRoot.y - facts.contentStart.y);
    if (delta > 12) {
      errors.push(`main content is not optically aligned with the navigation top (delta=${round(delta)}px)`);
    }
  }

  checked += 1;
  if (!facts.navLink?.active) errors.push(`${pageInfo.navLabel} nav link is not marked active`);

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
