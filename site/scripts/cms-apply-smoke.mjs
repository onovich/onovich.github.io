import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCmsUploadAsset } from '../src/cms/uploadAssets.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onovich-cms-apply-'));
const packagePath = path.join(tempDir, 'publish.json');
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
  'public/images/uploads/smoke-upload.png',
  'src/content/site.json',
];
const uploadAsset = createCmsUploadAsset({
  fileName: 'Smoke Upload.png',
  mimeType: 'image/png',
  width: 1,
  height: 1,
  dataUrl: 'data:image/png;base64,AAAA',
});

const payload = {
  schemaVersion: 1,
  assets: [uploadAsset],
  presets: {
    pageTemplates: [{ id: 'gallery-page' }],
    sectionPresets: [{ id: 'gallery-roomy-3' }],
  },
  pages: [
    {
      id: 'codes',
      title: 'Codes',
      templateId: 'gallery-page',
      sections: [{
        id: 'codes-gallery',
        type: 'gallery',
        presetId: 'gallery-roomy-3',
        items: [{ id: 'hero', src: uploadAsset.src, width: 1, height: 1 }],
      }],
    },
    { id: 'photo', title: 'Photo', templateId: 'photo-index', sections: [] },
    { id: 'poem', title: 'Poem', templateId: 'rich-text', sections: [] },
  ],
};

try {
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
      throw new Error(`CMS apply smoke missing target: ${target}`);
    }
  }
  if (!result.stdout.includes('CMS publish dry run')) {
    throw new Error('CMS apply smoke must report dry-run mode.');
  }
  if (result.stdout.includes('CMS publish backup') || result.stdout.includes('npm run cms:restore --')) {
    throw new Error('CMS apply dry run must not report a new backup or restore command.');
  }

  console.log('CMS apply smoke passed.');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
