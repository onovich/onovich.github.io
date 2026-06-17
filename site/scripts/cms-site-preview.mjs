import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCmsPackage } from '../src/cms/importPackage.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cmsHtmlPath = path.join(root, 'dist', 'cms', 'index.html');
const args = process.argv.slice(2);
const printJson = args.includes('--json');

function readEmbeddedJson(html, id) {
  const pattern = new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)<\\/script>`);
  const match = html.match(pattern);
  if (!match) throw new Error(`Missing embedded CMS JSON: ${id}`);
  return JSON.parse(match[1]);
}

if (!fs.existsSync(cmsHtmlPath)) {
  console.error('Missing dist/cms/index.html. Run npm run build before cms:site-preview.');
  process.exit(1);
}

const html = fs.readFileSync(cmsHtmlPath, 'utf8');
const preview = assertCmsPackage(readEmbeddedJson(html, 'cms-seed'));

if (printJson) {
  console.log(`${JSON.stringify(preview, null, 2)}\n`);
} else {
  const templates = new Set(preview.pages.map(page => page.templateId).filter(Boolean));
  const sectionPresets = new Set(preview.pages.flatMap(page => (
    page.sections || []
  ).map(section => section.presetId).filter(Boolean)));
  console.log('CMS site.json preview (read-only)');
  console.log(`- pages: ${preview.pages.length}`);
  console.log(`- visible nav items: ${(preview.sidebar || []).length}`);
  console.log(`- page templates: ${templates.size}`);
  console.log(`- section presets: ${sectionPresets.size}`);
  console.log(`- first pages: ${preview.pages.slice(0, 5).map(page => page.id).join(', ')}`);
  console.log('Use --json to print the generated preview payload.');
}
