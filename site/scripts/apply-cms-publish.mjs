import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCmsPackageJson } from '../src/cms/importPackage.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const packagePath = args.find((arg) => !arg.startsWith('--'));
const dryRun = args.includes('--dry-run');

if (!packagePath) {
  console.error('Usage: npm run cms:apply -- <onovich-cms-publish.json> [--dry-run]');
  process.exit(1);
}

const payload = parseCmsPackageJson(fs.readFileSync(path.resolve(packagePath), 'utf8'));
const pages = Array.isArray(payload.pages) ? payload.pages : [];
const pageById = new Map(pages.map((page) => [page.id, page]));
const targets = new Map();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function writeJson(relativePath, value) {
  targets.set(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(relativePath, value) {
  targets.set(relativePath, value.endsWith('\n') ? value : `${value}\n`);
}

function sectionItems(pageId, sectionFilter = () => true) {
  const page = pageById.get(pageId);
  return page?.sections
    ?.filter(sectionFilter)
    .flatMap((section) => section.items || []) || [];
}

function bodyHtml(pageId) {
  const page = pageById.get(pageId);
  if (!page) return '';
  const section = page.sections?.find((item) => item.bodyHtml || item.items?.some((entry) => entry.bodyHtml));
  return section?.bodyHtml || section?.items?.find((entry) => entry.bodyHtml)?.bodyHtml || page.bodyHtml || '';
}

function stripCmsOnlyItemFields(item) {
  const {
    targetPageId,
    hidden,
    bodyHtml,
    ...rest
  } = item;
  return rest;
}

function publishGallery(pageId, fileName) {
  writeJson(
    `src/content/${fileName}.json`,
    sectionItems(pageId, (section) => section.type === 'gallery').map(stripCmsOnlyItemFields),
  );
}

function publishPhotoAlbums() {
  const photoPage = pageById.get('photo');
  const index = photoPage?.sections
    ?.filter((section) => section.type === 'photo-index')
    .flatMap((section) => section.items || []) || [];
  const albums = pages
    .filter((page) => page.templateId === 'photo-detail')
    .map((page) => ({
      slug: page.id,
      title: page.title,
      year: page.sections?.[0]?.items?.[0]?.year || '',
      href: page.path,
      backHref: page.frame?.backHref || '/photo',
      backLabel: page.frame?.backLabel || 'PHOTOS',
      items: page.sections?.flatMap((section) => section.items || []).map(stripCmsOnlyItemFields) || [],
    }));

  writeJson('src/content/photoAlbums.json', {
    index: index.map(stripCmsOnlyItemFields),
    albums,
  });
}

assert(payload.schemaVersion === 1, 'Unsupported CMS schemaVersion');
assert(pages.length > 0, 'CMS package has no pages');
assert(payload.presets?.pageTemplates?.length, 'CMS package is missing page templates');
assert(payload.presets?.sectionPresets?.length, 'CMS package is missing section presets');

publishGallery('codes', 'codes');
publishGallery('game', 'games');
publishGallery('pixel', 'pixel');
publishGallery('illustrator', 'illustrations');
publishGallery('gif', 'gifs');
publishGallery('graphic', 'graphics');
publishPhotoAlbums();
writeText('src/content/poem.html', bodyHtml('poem'));
writeJson('src/content/site.json', payload);

if (dryRun) {
  console.log('CMS publish dry run. Files that would be written:');
  for (const [relativePath, content] of targets) {
    console.log(`- ${relativePath} (${content.length} bytes)`);
  }
  process.exit(0);
}

for (const [relativePath, content] of targets) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
}

console.log(`CMS publish applied: ${targets.size} file(s) written.`);
