import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clone, createCmsStateHelpers } from '../src/cms/state.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const publicDir = path.join(root, 'public');

const expectedPresets = [
  'home-profile',
  'gallery-roomy-3',
  'gallery-dense-3',
  'gallery-flush-3',
  'gallery-dense-2',
  'gif-hero',
  'photo-index-columns',
  'photo-detail-columns',
  'rich-text-poem',
  'sns-icons',
  'single-link',
  'contact-message',
];

const expectedTemplates = [
  'home-profile',
  'gallery-page',
  'segmented-gallery-page',
  'gif-page',
  'photo-index',
  'photo-detail',
  'rich-text',
  'links',
  'contact-drawer',
];

const expectedPages = [
  { id: 'home', template: 'home-profile', sections: ['home-profile'] },
  { id: 'codes', template: 'gallery-page', sections: ['gallery-roomy-3'] },
  { id: 'game', template: 'gallery-page', sections: ['gallery-dense-3'], minItems: 15 },
  { id: 'pixel', template: 'segmented-gallery-page', sections: ['gallery-roomy-3', 'gallery-flush-3'] },
  { id: 'illustrator', template: 'segmented-gallery-page', sections: ['gallery-dense-3', 'gallery-dense-3', 'gallery-dense-3'] },
  { id: 'gif', template: 'gif-page', sections: ['gif-hero', 'gallery-dense-3'] },
  { id: 'graphic', template: 'gallery-page', sections: ['gallery-dense-2'] },
  { id: 'photo', template: 'photo-index', sections: ['photo-index-columns'] },
  { id: 'poem', template: 'rich-text', sections: ['rich-text-poem'] },
  { id: 'sns', template: 'links', sections: ['sns-icons'] },
  { id: 'links', template: 'links', sections: ['single-link'] },
  { id: 'contact', template: 'contact-drawer', sections: ['contact-message'] },
];

const failures = [];
const warnings = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function readJson(file) {
  return JSON.parse(read(file));
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function imagePath(srcValue) {
  if (!srcValue?.startsWith('/images/')) return null;
  return path.join(publicDir, srcValue.slice(1).replaceAll('/', path.sep));
}

function checkImageItem(item, context) {
  if (!item.src) return;
  assert(Number.isFinite(item.width) && item.width > 0, `${context}: image width is missing`);
  assert(Number.isFinite(item.height) && item.height > 0, `${context}: image height is missing`);
  const localPath = imagePath(item.src);
  if (localPath) assert(fs.existsSync(localPath), `${context}: missing local image ${item.src}`);
}

function checkGalleryItems(items, context) {
  assert(Array.isArray(items), `${context}: expected an array`);
  items.forEach((item, index) => checkImageItem(item, `${context}[${index}] ${item.id || ''}`));
}

function checkCmsStateHelpers() {
  const templates = new Map([
    ['gallery-page', { id: 'gallery-page', defaultFrame: { showLeftNav: true, showBackLink: true } }],
    ['rich-text', { id: 'rich-text', defaultFrame: { showLeftNav: true, showBackLink: true } }],
  ]);
  const sectionPresets = new Map([
    ['gallery-roomy-3', {
      id: 'gallery-roomy-3',
      label: 'Roomy 3-column gallery',
      type: 'gallery',
      defaults: { columns: 3, spacing: 'roomy', captionMode: 'html' },
    }],
    ['rich-text-poem', {
      id: 'rich-text-poem',
      label: 'Poem rich text',
      type: 'rich-text',
      defaults: { columns: 1, captionMode: 'none' },
    }],
  ]);
  const state = {
    nav: { title: 'Onovich' },
    pages: [{
      id: 'home',
      title: 'Home',
      path: '/',
      templateId: 'gallery-page',
      sidebar: true,
      navGroupId: 'main',
      sections: [],
    }],
  };
  const helpers = createCmsStateHelpers({
    getState: () => state,
    getActivePage: () => state.pages[0],
    pageTemplateMap: templates,
    sectionPresetMap: sectionPresets,
  });

  const original = { nested: [{ value: 1 }] };
  const copied = clone(original);
  copied.nested[0].value = 2;
  assert(original.nested[0].value === 1, 'CMS state clone must deep-copy plain data');

  helpers.ensurePage(state.pages[0]);
  assert(state.pages[0].sections.length === 1, 'CMS state helper must add a default section for empty pages');
  assert(state.pages[0].sections[0].presetId === 'gallery-roomy-3', 'CMS state helper must use the template default section preset');
  assert(state.pages[0].items.length === 1, 'CMS state helper must sync page.items from section items');

  const extraSection = helpers.createSectionFromPreset('gallery-roomy-3');
  assert(extraSection.id === 'gallery-roomy-3-2', 'CMS state helper must generate unique section ids');

  helpers.syncNav();
  assert(state.sidebar.length === 1 && state.sidebar[0].path === '/', 'CMS state helper must sync visible sidebar nav items');
}

const presetsSource = read('src/cms/presets.ts');
const adapterSource = read('src/cms/currentContent.ts');
const cmsSource = read('src/pages/cms.astro');
const cmsClientSource = read('src/cms/client.ts');
const dynamicRouteSource = read('src/pages/[...slug].astro');
const applyScriptSource = read('scripts/apply-cms-publish.mjs');

for (const presetId of expectedPresets) {
  assert(presetsSource.includes(`id: '${presetId}'`), `Missing section preset: ${presetId}`);
}

for (const templateId of expectedTemplates) {
  assert(presetsSource.includes(`id: '${templateId}'`), `Missing page template: ${templateId}`);
}

for (const page of expectedPages) {
  assert(adapterSource.includes(`id: '${page.id}'`), `Current content adapter missing page: ${page.id}`);
  assert(adapterSource.includes(`templateId: '${page.template}'`), `${page.id}: adapter is not mapped to template ${page.template}`);
  for (const sectionPreset of page.sections) {
    assert(adapterSource.includes(`'${sectionPreset}'`), `${page.id}: adapter missing section preset ${sectionPreset}`);
  }
}

assert(cmsSource.includes('sectionPresetInput'), 'CMS UI must expose section preset controls');
assert(cmsSource.includes('cms-validation-seed'), 'CMS UI must expose validation seed data');
assert(cmsSource.includes("import '../cms/client'"), 'CMS page must load the browser client module');
assert(cmsClientSource.includes('activeSectionId'), 'CMS UI must keep section-level editing state');
assert(cmsClientSource.includes('createCmsStateHelpers'), 'CMS client must use shared state helpers');
assert(cmsClientSource.includes('manifest'), 'CMS export package must include a manifest');
assert(dynamicRouteSource.includes('getStaticPaths'), 'CMS generated page route must provide getStaticPaths');
assert(dynamicRouteSource.includes('reservedPaths'), 'CMS generated page route must avoid existing hand-tuned routes');
assert(applyScriptSource.includes('CMS publish applied'), 'CMS apply script must write exported publish packages');
assert(applyScriptSource.includes('--dry-run'), 'CMS apply script must support --dry-run');
assert(applyScriptSource.includes("section.type === 'gallery'"), 'CMS apply script must publish gallery sections without GIF hero items');

const codes = readJson('src/content/codes.json');
const games = readJson('src/content/games.json');
const pixel = readJson('src/content/pixel.json');
const illustrations = readJson('src/content/illustrations.json');
const gifs = readJson('src/content/gifs.json');
const graphics = readJson('src/content/graphics.json');
const photoAlbums = readJson('src/content/photoAlbums.json');

checkCmsStateHelpers();
checkGalleryItems(codes, 'codes');
checkGalleryItems(games, 'games');
checkGalleryItems(pixel, 'pixel');
checkGalleryItems(illustrations, 'illustrations');
checkGalleryItems(gifs, 'gifs');
checkGalleryItems(graphics, 'graphics');
checkGalleryItems(photoAlbums.index, 'photo index');

assert(games.length >= 15, 'GAMES should keep the migrated original item count');
assert(new Set(pixel.map((item) => item.section)).size >= 2, 'PIXEL ARTS should keep segmented sections');
assert(new Set(illustrations.map((item) => item.section)).size >= 3, 'ILLUSTRATIONS should keep three segmented sections');
assert(gifs.length >= 13, 'GIFS should keep the migrated GIF grid items');
assert(graphics.length >= 5, 'GRAPHIC DESIGNS should keep migrated long-image items');
assert(fs.existsSync(path.join(publicDir, 'images', 'gifs', 'hero.gif')), 'GIF hero asset is missing');

const albumValues = Object.values(photoAlbums.albums || {});
const albumSlugs = new Set(albumValues.map((album) => album.slug));
assert(albumValues.length >= 8, 'Photo detail albums should include photo_1 through photo_8');

for (const album of albumValues) {
  assert(album.slug && album.href, `Photo album missing slug or href: ${album.title || 'untitled'}`);
  checkGalleryItems(album.items || [], `album ${album.slug}`);
}

for (const item of photoAlbums.index) {
  const target = item.href?.replace(/^\//, '');
  assert(target && albumSlugs.has(target), `Photo index item ${item.id} points to missing detail page ${item.href}`);
}

warn(!cmsSource.includes('layoutColumnsInput'), 'CMS still exposes legacy page-level layout controls');

if (warnings.length) {
  console.warn('CMS warnings:');
  warnings.forEach((message) => console.warn(`- ${message}`));
}

if (failures.length) {
  console.error('CMS check failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`CMS check passed: ${expectedTemplates.length} templates, ${expectedPresets.length} section presets, ${albumValues.length} photo detail albums.`);
