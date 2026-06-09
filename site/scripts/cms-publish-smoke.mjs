import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCmsPublishPackage } from '../src/cms/publishPackage.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cmsHtmlPath = path.join(root, 'dist', 'cms', 'index.html');
const applyScript = path.join(root, 'scripts', 'apply-cms-publish.mjs');
const expectedTargets = [
  'src/content/codes.json',
  'src/content/games.json',
  'src/content/pixel.json',
  'src/content/illustrations.json',
  'src/content/gifs.json',
  'src/content/graphics.json',
  'src/content/photoAlbums.json',
  'src/content/poem.html',
  'src/content/site.json',
];

function readEmbeddedJson(html, id) {
  const pattern = new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)<\\/script>`);
  const match = html.match(pattern);
  if (!match) throw new Error(`Missing embedded CMS JSON: ${id}`);
  return JSON.parse(match[1]);
}

if (!fs.existsSync(cmsHtmlPath)) {
  throw new Error('Missing dist/cms/index.html. Run npm run build before cms:publish:smoke.');
}

const html = fs.readFileSync(cmsHtmlPath, 'utf8');
const seed = readEmbeddedJson(html, 'cms-seed');
const seedIssues = readEmbeddedJson(html, 'cms-validation-seed');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onovich-cms-publish-'));
const packagePath = path.join(tempDir, 'onovich-cms-publish.json');
const payload = createCmsPublishPackage({
  state: seed,
  issues: seedIssues,
  exportedAt: '2026-06-09T00:00:00.000Z',
});

try {
  if (payload.manifest.pageCount < 20) {
    throw new Error(`CMS publish smoke expected at least 20 pages, got ${payload.manifest.pageCount}`);
  }
  if (payload.manifest.validation.errors > 0) {
    throw new Error(`CMS publish smoke has ${payload.manifest.validation.errors} validation error(s)`);
  }

  fs.writeFileSync(packagePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  const result = spawnSync(process.execPath, [applyScript, packagePath, '--dry-run'], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status || 1);
  }

  for (const target of expectedTargets) {
    if (!result.stdout.includes(target)) {
      throw new Error(`CMS publish smoke missing apply target: ${target}`);
    }
  }

  console.log(`CMS publish smoke passed: ${payload.manifest.pageCount} pages, ${payload.manifest.visibleNavCount} visible nav items.`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
