import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clone, createCmsStateHelpers } from '../src/cms/state.js';
import { renderCmsPreview } from '../src/cms/preview.js';
import { collectCmsDraftIssues } from '../src/cms/draftValidation.js';
import { CMS_PUBLISH_TARGETS, createCmsPublishPackage } from '../src/cms/publishPackage.js';
import { createCmsPublishReview, hasBlockingCmsPublishIssues } from '../src/cms/publishReview.js';
import { isCmsPackage, parseCmsPackageJson, parseCmsPackageJsonOrFallback } from '../src/cms/importPackage.js';
import { createCmsApplyPlan } from '../src/cms/applyPackagePlan.js';
import { classifyCmsAssetSrc, cmsAssetPublicPath, collectCmsAssetPublishIssues, collectCmsAssetReferences } from '../src/cms/assetReferences.js';
import { cmsRichTextSelectionBelongsToEditor, collectCmsRichTextHtmlIssues, createCmsRichTextLinkPanel, createCmsRichTextSelectionStore, isCmsRichTextAllowedTag, isCmsRichTextCommand, normalizeCmsRichTextHref, pasteCmsRichText, runCmsRichTextCommand } from '../src/cms/richText.js';
import { CMS_UPLOAD_TARGET_DIR, cmsUploadApplyRelativePath, cmsUploadAssetBase64, cmsUploadPreviewSrc, collectCmsUploadAssetIssues, collectCmsUploadPublishIssues, createCmsUploadAsset, normalizeCmsUploadFileName, upsertCmsUploadAsset } from '../src/cms/uploadAssets.js';
import { createCmsAssetItemPatch, createCmsAssetLibrary } from '../src/cms/assetLibrary.js';
import { normalizeCmsItemLinks, removeCmsItemLink, upsertCmsItemLink } from '../src/cms/itemLinks.js';
import { backupCmsApplyTargets, CMS_APPLY_BACKUP_DIR, formatCmsApplyRollbackHint, formatCmsRestoreSummary, restoreCmsApplyBackup, writeCmsApplyTargets } from './cms-apply-file-ops.mjs';

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

function checkCmsPreviewRenderer() {
  const html = renderCmsPreview({
    site: { title: 'Onovich <CMS>' },
    nav: {
      groups: [
        {
          id: 'main',
          items: [
            { label: 'CODES', path: '/codes', visible: true },
            { label: 'Hidden', path: '/hidden', visible: false },
          ],
        },
        {
          id: 'social',
          items: [{ label: 'SNS', path: '/sns', visible: true }],
        },
      ],
    },
    page: {
      frame: { topSpacingPreset: 'inner', showBackLink: true, backLabel: 'HOME' },
      sections: [{
        type: 'gallery',
        params: {
          columns: 3,
          spacing: 'roomy',
          imageFit: 'cover-16-9',
          clickMode: 'internal-page',
          captionMode: 'title-desc-links',
          showCaptions: true,
        },
        items: [{
          title: 'Work <One>',
          desc: 'Description',
          year: '2026',
          src: '/images/uploads/work.png',
          targetPageId: 'work-one',
          links: [{ label: 'Play', url: 'https://example.com/play' }],
        }],
      }],
    },
    assets: [{
      id: 'work',
      src: '/images/uploads/work.png',
      targetPath: 'images/uploads/work.png',
      width: 1,
      height: 1,
      mimeType: 'image/png',
      source: 'upload',
      dataUrl: 'data:image/png;base64,AAAA',
    }],
  });

  assert(html.includes('preview-site'), 'CMS preview renderer must render the preview shell');
  assert(html.includes('Onovich &lt;CMS&gt;'), 'CMS preview renderer must escape the site title');
  assert(html.includes('/codes') && !html.includes('/hidden'), 'CMS preview renderer must include visible nav links only');
  assert(html.includes('&lt; HOME'), 'CMS preview renderer must render the back label');
  assert(html.includes('preview-gallery'), 'CMS preview renderer must render gallery sections');
  assert(html.includes('data:image/png;base64,AAAA'), 'CMS preview renderer must preview uploaded assets from data URLs');
  assert(html.includes('href="/work-one"'), 'CMS preview renderer must resolve internal item links');
  assert(html.includes('Work &lt;One&gt;') && html.includes('Description') && html.includes('2026'), 'CMS preview renderer must render escaped captions');
}

function checkCmsDraftValidation() {
  const pageTemplateMap = new Map([['gallery-page', {}]]);
  const sectionPresetMap = new Map([['gallery-roomy-3', {}]]);
  const issues = collectCmsDraftIssues({
    seedIssues: [{ level: 'warning', message: 'Seed warning', pageId: 'seed-page' }],
    pageTemplateMap,
    sectionPresetMap,
    state: {
      assets: [
        { id: 'bad-upload', src: '/images/uploads/bad.bmp', targetPath: 'images/uploads/bad.bmp', mimeType: 'image/bmp' },
      ],
      pages: [
        {
          id: 'broken',
          title: 'Broken',
          path: 'missing-slash',
          templateId: 'unknown-template',
          sections: [{
            id: 'bad-gallery',
            presetId: 'unknown-preset',
            params: { clickMode: 'internal-page' },
            bodyHtml: '<p onclick="alert(1)">Bad</p>',
            items: [
              { id: 'missing-dimensions', src: '/images/codes/work.png' },
              { id: 'remote-image', src: 'https://example.com/work.png', width: 100, height: 100 },
              { id: 'missing-target', targetPageId: 'missing-page' },
              { id: 'unsafe-rich-text', bodyHtml: '<script>alert(1)</script>', captionHtml: '<a href="javascript:alert(1)">Bad</a>' },
            ],
          }],
        },
      ],
    },
  });
  const messages = issues.map(issue => issue.message).join('\n');

  assert(issues.some(issue => issue.message === 'Seed warning'), 'CMS draft validation must include seed issues');
  assert(messages.includes('路径需要以 / 开头'), 'CMS draft validation must reject paths without a leading slash');
  assert(messages.includes('未知页面模板 unknown-template'), 'CMS draft validation must reject unknown page templates');
  assert(messages.includes('未知分段预设 unknown-preset'), 'CMS draft validation must reject unknown section presets');
  assert(messages.includes('图片缺少宽高'), 'CMS draft validation must warn on image items without dimensions');
  assert(messages.includes('图片路径需要在 /images/ 下'), 'CMS draft validation must warn on unpublishable image paths');
  assert(messages.includes('目标页面不存在'), 'CMS draft validation must reject missing internal targets');
  assert(messages.includes('富文本包含不安全 HTML'), 'CMS draft validation must reject unsafe rich text HTML');
  assert(messages.includes('不支持的图片类型'), 'CMS draft validation must reject unsupported upload asset types');
  assert(issues.filter(issue => issue.level === 'error').length >= 4, 'CMS draft validation must classify blocking issues as errors');
}

function checkCmsAssetReferences() {
  const state = {
    pages: [{
      id: 'codes',
      title: 'Codes',
      sections: [{
        id: 'gallery',
        items: [
          { id: 'local', src: '/images/codes/local.png', width: 100, height: 80 },
          { id: 'remote', src: 'https://example.com/remote.png', width: 100, height: 80 },
          { id: 'empty', src: '' },
        ],
      }],
    }],
  };
  const refs = collectCmsAssetReferences(state);

  assert(refs.length === 2, 'CMS asset reference collector must return non-empty item image sources');
  assert(refs[0].pageId === 'codes' && refs[0].sectionId === 'gallery' && refs[0].itemId === 'local', 'CMS asset references must keep source context');
  assert(classifyCmsAssetSrc('/images/codes/local.png').publishable, 'CMS asset classifier must accept site images');
  assert(!classifyCmsAssetSrc('https://example.com/remote.png').publishable, 'CMS asset classifier must reject remote images before publish');
  assert(!classifyCmsAssetSrc('images/relative.png').publishable, 'CMS asset classifier must reject relative image paths before publish');
  assert(cmsAssetPublicPath('/images/codes/local.png') === 'images/codes/local.png', 'CMS asset classifier must resolve public image paths');

  const publishIssues = collectCmsAssetPublishIssues(state, {
    assetExists: publicPath => publicPath === 'images/codes/local.png',
  });
  const issueCodes = publishIssues.map(issue => issue.code).join('\n');
  assert(issueCodes.includes('asset-path-unpublishable'), 'CMS asset publish issues must reject unpublishable paths');
  assert(!issueCodes.includes('asset-file-missing'), 'CMS asset publish issues must accept existing local files');

  const missingIssues = collectCmsAssetPublishIssues({
    pages: [{
      id: 'codes',
      title: 'Codes',
      sections: [{ id: 'gallery', items: [{ id: 'missing', src: '/images/codes/missing.png' }] }],
    }],
  }, { assetExists: () => false });
  assert(missingIssues.some(issue => issue.code === 'asset-file-missing'), 'CMS asset publish issues must reject missing local files');
}

function checkCmsUploadAssets() {
  const asset = createCmsUploadAsset({
    fileName: 'Hero Image.PNG',
    mimeType: 'image/png',
    width: 640,
    height: 480,
    size: 1024,
    dataUrl: 'data:image/png;base64,AAAA',
    alt: 'Hero',
  });

  assert(normalizeCmsUploadFileName('Hero Image.PNG') === 'hero-image', 'CMS upload assets must normalize file names');
  assert(asset.id === 'hero-image', 'CMS upload assets must derive stable ids from file names');
  assert(asset.src === '/images/uploads/hero-image.png', 'CMS upload assets must target the public uploads path');
  assert(asset.targetPath === 'images/uploads/hero-image.png', 'CMS upload assets must expose a public target path');
  assert(asset.source === 'upload', 'CMS upload assets must mark uploaded source');
  assert(collectCmsUploadAssetIssues(asset).length === 0, 'CMS upload assets must accept valid image metadata');
  assert(collectCmsUploadAssetIssues({ ...asset, mimeType: 'image/bmp' }).some(issue => issue.code === 'upload-asset-mime-unsupported'), 'CMS upload assets must reject unsupported MIME types');
  assert(collectCmsUploadAssetIssues({ ...asset, width: 0 }).some(issue => issue.code === 'upload-asset-dimensions-missing'), 'CMS upload assets must require dimensions');
  assert(collectCmsUploadAssetIssues({ ...asset, src: '/images/elsewhere/hero.png' }).some(issue => issue.code === 'upload-asset-path-invalid'), 'CMS upload assets must stay under /images/uploads/');
  assert(collectCmsUploadAssetIssues({ ...asset, dataUrl: 'data:image/jpeg;base64,AAAA' }).some(issue => issue.code === 'upload-asset-data-invalid'), 'CMS upload assets must match data URLs to MIME type');
  const upserted = upsertCmsUploadAsset([{ ...asset, width: 1 }], asset);
  assert(upserted.length === 1 && upserted[0].width === 640, 'CMS upload assets must replace existing assets with the same src');
  assert(cmsUploadPreviewSrc(asset.src, [asset]) === asset.dataUrl, 'CMS upload assets must provide data URLs for CMS previews');
  assert(cmsUploadApplyRelativePath(asset) === 'public/images/uploads/hero-image.png', 'CMS upload assets must resolve apply targets under public uploads');
  assert(cmsUploadAssetBase64(asset) === 'AAAA', 'CMS upload assets must expose base64 publish content');
  assert(collectCmsUploadPublishIssues({ assets: [asset] }).length === 0, 'CMS upload publish validation must accept complete upload assets');
  assert(collectCmsUploadPublishIssues({ assets: [{ ...asset, dataUrl: '' }] }).some(issue => issue.code === 'upload-asset-data-missing'), 'CMS upload publish validation must require publish data');
}

function checkCmsAssetLibrary() {
  const asset = createCmsUploadAsset({
    fileName: 'Library Upload.png',
    mimeType: 'image/png',
    width: 640,
    height: 480,
    size: 2048,
    dataUrl: 'data:image/png;base64,AAAA',
  });
  const state = {
    assets: [asset],
    pages: [{
      id: 'codes',
      title: 'Codes',
      sections: [{
        id: 'gallery',
        items: [
          { id: 'hero', src: asset.src },
          { id: 'other', src: '/images/codes/other.png' },
        ],
      }],
    }],
  };
  const library = createCmsAssetLibrary({ state });
  const patch = createCmsAssetItemPatch(asset);

  assert(library.length === 1, 'CMS asset library must list uploaded assets from state.assets');
  assert(library[0].src === '/images/uploads/library-upload.png', 'CMS asset library must expose upload public paths');
  assert(library[0].targetPath === 'images/uploads/library-upload.png', 'CMS asset library must expose upload target paths');
  assert(library[0].size === 2048, 'CMS asset library must expose upload byte size');
  assert(library[0].usedBy.length === 1 && library[0].usedBy[0].itemId === 'hero', 'CMS asset library must count item usage');
  assert(patch.src === asset.src && patch.width === 640 && patch.height === 480, 'CMS asset library must create reusable item patches');
  assert(patch.originalUrl === asset.src, 'CMS asset library item patches must preserve upload origin');
}

function checkCmsItemLinks() {
  const normalized = normalizeCmsItemLinks([
    { label: ' Play ', url: ' https://example.com/play ' },
    { label: '', url: '' },
    { label: 'Docs' },
  ]);
  const added = upsertCmsItemLink(normalized, { label: 'Trailer', url: 'https://example.com/trailer' });
  const updated = upsertCmsItemLink(added, { label: 'Play now', url: 'https://example.com/play-now' }, 0);
  const removed = removeCmsItemLink(updated, 1);

  assert(normalized.length === 2, 'CMS item links must drop empty entries');
  assert(normalized[0].label === 'Play' && normalized[0].url === 'https://example.com/play', 'CMS item links must trim labels and URLs');
  assert(added.length === 3 && added[2].label === 'Trailer', 'CMS item links must append new structured links');
  assert(updated[0].label === 'Play now', 'CMS item links must update selected links');
  assert(removed.length === 2 && !removed.some(link => link.label === 'Docs'), 'CMS item links must remove selected links');
}

function checkCmsPublishPackage() {
  const uploadAsset = createCmsUploadAsset({
    fileName: 'Hero Image.PNG',
    mimeType: 'image/png',
    width: 640,
    height: 480,
    size: 1024,
    dataUrl: 'data:image/png;base64,AAAA',
  });
  const state = {
    schemaVersion: 2,
    site: { title: 'Onovich' },
    assets: [uploadAsset],
    sidebar: [
      { id: 'codes', path: '/codes' },
      { id: 'game', path: '/game' },
    ],
    pages: [
      {
        id: 'codes',
        title: 'Codes',
        templateId: 'gallery-page',
        sections: [
          { id: 'gallery', presetId: 'gallery-roomy-3', items: [] },
          { id: 'text', presetId: 'rich-text-poem', items: [] },
        ],
      },
      {
        id: 'home',
        title: 'Home',
        templateId: 'home-profile',
        sections: [],
      },
      {
        id: 'broken',
        title: 'Broken',
        sections: [{ id: 'missing-preset' }],
      },
    ],
  };
  const issues = [
    { level: 'error', message: 'Blocking issue' },
    { level: 'warning', message: 'Soft warning' },
    { message: 'Implicit warning' },
  ];

  const payload = createCmsPublishPackage({
    state,
    issues,
    exportedAt: '2026-06-09T00:00:00.000Z',
  });
  payload.pages[0].title = 'Changed';
  payload.manifest.validation.issues[0].message = 'Changed';
  payload.manifest.publishTargets.push('unexpected');

  assert(payload.manifest.name === 'onovich-cms-publish', 'CMS publish package must include a stable manifest name');
  assert(payload.exportedAt === '2026-06-09T00:00:00.000Z', 'CMS publish package must use the provided export timestamp');
  assert(payload.manifest.schemaVersion === 2, 'CMS publish package must preserve the schema version');
  assert(payload.manifest.pageCount === 3, 'CMS publish package must count pages');
  assert(payload.manifest.visibleNavCount === 2, 'CMS publish package must count visible sidebar entries');
  assert(payload.manifest.templates.join(',') === 'gallery-page,home-profile', 'CMS publish package must list known page templates');
  assert(payload.manifest.sectionPresets.join(',') === 'gallery-roomy-3,rich-text-poem', 'CMS publish package must list known section presets');
  assert(payload.manifest.validation.errors === 1, 'CMS publish package must count blocking validation issues');
  assert(payload.manifest.validation.warnings === 2, 'CMS publish package must count non-blocking validation issues');
  assert(payload.assets[0].targetPath === 'images/uploads/hero-image.png', 'CMS publish package must preserve upload asset targets');
  assert(payload.manifest.uploads.count === 1, 'CMS publish package must count uploaded assets');
  assert(payload.manifest.uploads.totalBytes === 1024, 'CMS publish package must sum uploaded asset bytes');
  assert(payload.manifest.uploads.targetDir === CMS_UPLOAD_TARGET_DIR, 'CMS publish package must expose the upload target directory');
  assert(payload.manifest.uploads.paths.includes('images/uploads/hero-image.png'), 'CMS publish package must list uploaded asset targets');
  assert(state.pages[0].title === 'Codes', 'CMS publish package must not share page objects with editor state');
  assert(issues[0].message === 'Blocking issue', 'CMS publish package must not share issue objects with editor state');
  assert(CMS_PUBLISH_TARGETS.length === 4, 'CMS publish target list must remain focused');
  assert(!CMS_PUBLISH_TARGETS.includes('unexpected'), 'CMS publish package must copy publish targets into each manifest');
  assert(payload.manifest.publishTargets.includes('site/src/content/site.json'), 'CMS publish package must target site content');
  assert(payload.manifest.publishTargets.includes('site/public/images/uploads'), 'CMS publish package must target uploaded images');
}

function checkCmsPublishReview() {
  const uploadAsset = createCmsUploadAsset({
    fileName: 'Review Upload.png',
    mimeType: 'image/png',
    width: 320,
    height: 200,
    size: 512,
    dataUrl: 'data:image/png;base64,AAAA',
  });
  const state = {
    schemaVersion: 2,
    assets: [uploadAsset],
    sidebar: [{ id: 'codes', path: '/codes' }],
    pages: [{
      id: 'codes',
      title: 'Codes',
      templateId: 'gallery-page',
      sections: [{ id: 'gallery', presetId: 'gallery-roomy-3', items: [] }],
    }],
  };
  const issues = [
    { level: 'error', message: 'Blocking issue' },
    { level: 'warning', message: 'Soft warning' },
  ];
  const review = createCmsPublishReview({
    state,
    issues,
    exportedAt: '2026-06-09T00:00:00.000Z',
  });

  assert(hasBlockingCmsPublishIssues(review), 'CMS publish review must flag blocking errors');
  assert(review.payload.manifest.name === 'onovich-cms-publish', 'CMS publish review must carry the publish payload');
  assert(review.pageCount === 1 && review.visibleNavCount === 1, 'CMS publish review must expose manifest page and nav counts');
  assert(review.errors.length === 1 && review.errors[0].message === 'Blocking issue', 'CMS publish review must expose blocking errors');
  assert(review.warnings.length === 1 && review.warnings[0].message === 'Soft warning', 'CMS publish review must expose warnings');
  assert(review.templates.includes('gallery-page'), 'CMS publish review must expose templates used');
  assert(review.sectionPresets.includes('gallery-roomy-3'), 'CMS publish review must expose section presets used');
  assert(review.uploads.count === 1, 'CMS publish review must expose upload count');
  assert(review.uploads.totalBytes === 512, 'CMS publish review must expose upload total bytes');
  assert(review.uploads.targetDir === CMS_UPLOAD_TARGET_DIR, 'CMS publish review must expose upload target directory');
  assert(review.uploads.paths.includes('images/uploads/review-upload.png'), 'CMS publish review must expose upload target paths');
  assert(review.publishTargets.includes('site/src/content/site.json'), 'CMS publish review must expose publish targets');

  const warningOnlyReview = createCmsPublishReview({ state, issues: [{ level: 'warning', message: 'Warning only' }] });
  assert(!hasBlockingCmsPublishIssues(warningOnlyReview), 'CMS publish review must allow warning-only packages after acknowledgement');
}

function checkCmsImportPackage() {
  const fallback = {
    schemaVersion: 1,
    presets: { pageTemplates: [], sectionPresets: [] },
    pages: [{ id: 'fallback', sections: [] }],
  };
  const source = {
    schemaVersion: 1,
    presets: { pageTemplates: [], sectionPresets: [] },
    pages: [{ id: 'home', sections: [] }],
  };

  const parsed = parseCmsPackageJson(JSON.stringify(source));
  parsed.pages[0].id = 'changed';

  assert(isCmsPackage(source), 'CMS import package must accept pages, presets, and section arrays');
  assert(!isCmsPackage({ presets: {}, pages: [{ id: 'broken' }] }), 'CMS import package must reject pages without section arrays');
  assert(source.pages[0].id === 'home', 'CMS import package parser must not share page objects with the source object');
  assert(parseCmsPackageJsonOrFallback('', fallback).pages[0].id === 'fallback', 'CMS import package parser must fallback on empty source');
  assert(parseCmsPackageJsonOrFallback('{bad json', fallback).pages[0].id === 'fallback', 'CMS import package parser must fallback on malformed JSON');

  let rejected = false;
  try {
    parseCmsPackageJson(JSON.stringify({ presets: {}, pages: [{ id: 'broken' }] }));
  } catch {
    rejected = true;
  }
  assert(rejected, 'CMS import package parser must reject invalid packages');
}

function checkCmsApplyPlan() {
  const uploadAsset = createCmsUploadAsset({
    fileName: 'Hero Upload.PNG',
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
          items: [{
            id: 'code-one',
            title: 'Code One',
            src: '/images/codes/code-one.png',
            targetPageId: 'detail',
            hidden: true,
            bodyHtml: '<p>CMS only</p>',
          }],
        }],
      },
      {
        id: 'gif',
        title: 'Gif',
        templateId: 'gif-page',
        sections: [
          { id: 'gif-hero', type: 'gif-hero', presetId: 'gif-hero', items: [{ id: 'hero', src: '/images/gifs/hero.gif' }] },
          { id: 'gif-gallery', type: 'gallery', presetId: 'gallery-dense-3', items: [{ id: 'gif-grid', src: '/images/gifs/grid.gif' }] },
        ],
      },
      {
        id: 'photo',
        title: 'Photo',
        templateId: 'photo-index',
        sections: [{
          id: 'photo-index',
          type: 'photo-index',
          presetId: 'photo-index-columns',
          items: [{ id: 'photo-1', href: '/photo_1', targetPageId: 'photo_1' }],
        }],
      },
      {
        id: 'photo_1',
        title: 'Photo 1',
        path: '/photo_1',
        templateId: 'photo-detail',
        frame: { backHref: '/photo', backLabel: 'PHOTO' },
        sections: [{ id: 'photo-detail', type: 'photo-detail', presetId: 'photo-detail-columns', items: [{ id: 'image-1', year: '2026', src: '/images/photos/photo-01.jpg' }] }],
      },
      {
        id: 'poem',
        title: 'Poem',
        templateId: 'rich-text',
        sections: [{ id: 'body', type: 'rich-text', presetId: 'rich-text-poem', bodyHtml: '<p>Poem</p>', items: [] }],
      },
    ],
  };
  const targets = createCmsApplyPlan(payload);
  const byPath = new Map(targets.map(target => [target.relativePath, target.content]));
  const codes = JSON.parse(byPath.get('src/content/codes.json'));
  const gifs = JSON.parse(byPath.get('src/content/gifs.json'));
  const photoAlbumsOutput = JSON.parse(byPath.get('src/content/photoAlbums.json'));

  assert(targets.length === 10, 'CMS apply plan must write the expected content and upload files');
  assert(codes.length === 1 && codes[0].id === 'code-one', 'CMS apply plan must publish gallery items');
  assert(!('targetPageId' in codes[0]) && !('hidden' in codes[0]) && !('bodyHtml' in codes[0]), 'CMS apply plan must strip CMS-only item fields');
  assert(gifs.length === 1 && gifs[0].id === 'gif-grid', 'CMS apply plan must publish GIF gallery items without GIF hero items');
  assert(photoAlbumsOutput.index[0].id === 'photo-1', 'CMS apply plan must publish photo index items');
  assert(photoAlbumsOutput.albums[0].slug === 'photo_1', 'CMS apply plan must publish photo detail albums');
  assert(photoAlbumsOutput.albums[0].items[0].src === '/images/photos/photo-01.jpg', 'CMS apply plan must preserve photo detail items');
  assert(byPath.get('src/content/poem.html') === '<p>Poem</p>\n', 'CMS apply plan must publish rich text body HTML');
  assert(byPath.get('public/images/uploads/hero-upload.png') === 'AAAA', 'CMS apply plan must publish upload asset bytes as base64 targets');
  assert(targets.find(target => target.relativePath === 'public/images/uploads/hero-upload.png')?.encoding === 'base64', 'CMS apply plan must mark upload targets as base64');
  assert(JSON.parse(byPath.get('src/content/site.json')).pages.length === payload.pages.length, 'CMS apply plan must write the full CMS package to site.json');

  let rejected = false;
  try {
    createCmsApplyPlan({ ...payload, schemaVersion: 99 });
  } catch {
    rejected = true;
  }
  assert(rejected, 'CMS apply plan must reject unsupported schema versions');
}

function checkCmsApplyFileOps() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'onovich-cms-apply-file-ops-'));
  try {
    fs.mkdirSync(path.join(tempRoot, 'src', 'content'), { recursive: true });
    fs.writeFileSync(path.join(tempRoot, 'src', 'content', 'codes.json'), 'old codes\n', 'utf8');
    const targets = [
      { relativePath: 'src/content/codes.json', content: 'new codes\n' },
      { relativePath: 'src/content/new.json', content: '[]\n' },
      { relativePath: 'public/images/uploads/upload.png', content: 'AAAA', encoding: 'base64' },
    ];

    const backup = backupCmsApplyTargets({
      root: tempRoot,
      targets,
      timestamp: '20260609-000000Z',
    });
    writeCmsApplyTargets({ root: tempRoot, targets });

    assert(backup.backupRelativePath === `${CMS_APPLY_BACKUP_DIR}/20260609-000000Z`, 'CMS apply backup must use the configured backup directory');
    assert(fs.readFileSync(path.join(tempRoot, backup.backupRelativePath, 'src/content/codes.json'), 'utf8') === 'old codes\n', 'CMS apply backup must copy existing target files before writing');
    assert(!fs.existsSync(path.join(tempRoot, backup.backupRelativePath, 'src/content/new.json')), 'CMS apply backup must not invent backups for new files');
    assert(fs.readFileSync(path.join(tempRoot, 'src/content/codes.json'), 'utf8') === 'new codes\n', 'CMS apply file writer must write target content');
    assert(fs.readFileSync(path.join(tempRoot, 'public/images/uploads/upload.png')).equals(Buffer.from('AAAA', 'base64')), 'CMS apply file writer must decode uploaded base64 targets');
    assert(formatCmsApplyRollbackHint(backup).includes(backup.backupRelativePath), 'CMS apply rollback hint must include the backup path');

    const dryRun = restoreCmsApplyBackup({ root: tempRoot, backupRelativePath: backup.backupRelativePath, dryRun: true });
    assert(fs.readFileSync(path.join(tempRoot, 'src/content/codes.json'), 'utf8') === 'new codes\n', 'CMS restore dry run must not change files');
    assert(dryRun.actions.some(action => action.action === 'restore'), 'CMS restore dry run must report restored files');

    const restored = restoreCmsApplyBackup({ root: tempRoot, backupRelativePath: backup.backupRelativePath });
    assert(fs.readFileSync(path.join(tempRoot, 'src/content/codes.json'), 'utf8') === 'old codes\n', 'CMS restore must copy backed-up files back to targets');
    assert(!fs.existsSync(path.join(tempRoot, 'src/content/new.json')), 'CMS restore must remove files created by the apply step');
    assert(formatCmsRestoreSummary(restored).includes('1 restored, 2 removed'), 'CMS restore summary must report restored and removed files');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function checkCmsRichTextTools() {
  const calls = [];
  const insideNode = { insideEditor: true };
  const outsideNode = { insideEditor: false };
  const clonedRange = { cloned: true };
  const selection = {
    anchorNode: insideNode,
    focusNode: insideNode,
    rangeCount: 1,
    addedRange: null,
    removed: 0,
    getRangeAt() {
      return {
        cloneRange() {
          return clonedRange;
        },
      };
    },
    removeAllRanges() {
      this.removed += 1;
    },
    addRange(range) {
      this.addedRange = range;
    },
  };
  const editor = {
    focused: 0,
    focus() {
      this.focused += 1;
    },
    contains(node) {
      return node?.insideEditor === true;
    },
  };
  const documentRef = {
    getSelection() {
      return selection;
    },
    execCommand(command, showUi, value) {
      calls.push({ command, showUi, value });
    },
  };
  const selectionStore = createCmsRichTextSelectionStore({ documentRef, editor });

  assert(isCmsRichTextCommand('bold'), 'CMS rich text tools must allow known commands');
  assert(!isCmsRichTextCommand('fontSize'), 'CMS rich text tools must reject unknown commands');
  assert(normalizeCmsRichTextHref(' https://example.com ') === 'https://example.com', 'CMS rich text links must trim URLs');
  assert(normalizeCmsRichTextHref('javascript:alert(1)') === '', 'CMS rich text links must reject javascript URLs');
  assert(isCmsRichTextAllowedTag('strong') && !isCmsRichTextAllowedTag('script'), 'CMS rich text tools must expose an explicit allowed tag list');
  assert(collectCmsRichTextHtmlIssues('<p>Hello</p>').length === 0, 'CMS rich text HTML guard must allow safe paragraphs');
  assert(collectCmsRichTextHtmlIssues('<script>alert(1)</script>').length > 0, 'CMS rich text HTML guard must reject scripts');
  assert(collectCmsRichTextHtmlIssues('<p onclick="alert(1)">Hi</p>').length > 0, 'CMS rich text HTML guard must reject inline handlers');
  assert(collectCmsRichTextHtmlIssues('<a href="javascript:alert(1)">Bad</a>').length > 0, 'CMS rich text HTML guard must reject unsafe links');
  assert(cmsRichTextSelectionBelongsToEditor({ editor, selection }), 'CMS rich text selection guard must allow editor selections');
  selection.focusNode = outsideNode;
  assert(!cmsRichTextSelectionBelongsToEditor({ editor, selection }), 'CMS rich text selection guard must reject outside selections');
  selection.focusNode = insideNode;
  assert(selectionStore.capture(), 'CMS rich text selection store must capture editor selections');

  assert(runCmsRichTextCommand({ command: 'bold', documentRef, editor, selectionStore }), 'CMS rich text command runner must execute valid commands');
  assert(calls[0].command === 'bold' && calls[0].showUi === false, 'CMS rich text command runner must call execCommand consistently');
  assert(selection.addedRange === clonedRange && selection.removed >= 1, 'CMS rich text command runner must restore the saved selection before executing');
  assert(runCmsRichTextCommand({ command: 'createLink', documentRef, editor, selectionStore, value: ' https://example.com ' }), 'CMS rich text command runner must create links');
  assert(calls[1].command === 'createLink' && calls[1].value === 'https://example.com', 'CMS rich text command runner must normalize link values');
  assert(!runCmsRichTextCommand({ command: 'createLink', documentRef, editor, selectionStore, value: 'data:text/html,hi' }), 'CMS rich text command runner must skip unsafe links');
  assert(!runCmsRichTextCommand({ command: 'fontSize', documentRef, editor, selectionStore }), 'CMS rich text command runner must skip unknown commands');
  assert(calls.length === 2, 'CMS rich text command runner must not execute rejected commands');
  assert(editor.focused >= 3, 'CMS rich text command runner must return focus to the editor');
  assert(pasteCmsRichText({ documentRef, editor, selectionStore, text: '<b>Hello</b>\nWorld' }), 'CMS rich text paste helper must insert safe plain text');
  assert(calls[2].command === 'insertHTML' && calls[2].value.includes('&lt;b&gt;Hello&lt;/b&gt;') && calls[2].value.includes('<p>World</p>'), 'CMS rich text paste helper must escape pasted plain text as paragraphs');

  const linkPanelElement = { hidden: true };
  const linkInput = {
    value: '',
    focused: 0,
    addEventListener() {},
    focus() {
      this.focused += 1;
    },
  };
  const linkButton = { addEventListener() {} };
  const linkPanel = createCmsRichTextLinkPanel({
    root: {
      getElementById(id) {
        return {
          richLinkPanel: linkPanelElement,
          richLinkInput: linkInput,
          applyRichLinkBtn: linkButton,
          cancelRichLinkBtn: linkButton,
        }[id];
      },
    },
    documentRef,
    editor,
    selectionStore,
  });
  assert(linkPanel.open() && linkPanelElement.hidden === false, 'CMS rich text link panel must open without browser prompts');
  linkInput.value = ' https://example.com/from-panel ';
  assert(linkPanel.apply(), 'CMS rich text link panel must apply valid links');
  assert(linkPanelElement.hidden && calls[3].command === 'createLink' && calls[3].value === 'https://example.com/from-panel', 'CMS rich text link panel must normalize and execute links');
  selectionStore.clear();
  assert(!selectionStore.restore(), 'CMS rich text selection store must not restore after being cleared');
}

const presetsSource = read('src/cms/presets.ts');
const adapterSource = read('src/cms/currentContent.ts');
const cmsSource = read('src/pages/cms.astro');
const cmsClientSource = read('src/cms/client.ts');
const cmsPublishSource = read('src/cms/publishPackage.js');
const cmsReviewSource = read('src/cms/publishReview.js');
const cmsImportSource = read('src/cms/importPackage.js');
const cmsRichTextSource = read('src/cms/richText.js');
const cmsUploadSource = read('src/cms/uploadAssets.js');
const cmsAssetLibrarySource = read('src/cms/assetLibrary.js');
const cmsItemLinksSource = read('src/cms/itemLinks.js');
const cmsApplyPlanSource = read('src/cms/applyPackagePlan.js');
const cmsAssetSource = read('src/cms/assetReferences.js');
const cmsDraftValidationSource = read('src/cms/draftValidation.js');
const dynamicRouteSource = read('src/pages/[...slug].astro');
const applyScriptSource = read('scripts/apply-cms-publish.mjs');
const applyFileOpsSource = read('scripts/cms-apply-file-ops.mjs');
const applySmokeSource = read('scripts/cms-apply-smoke.mjs');
const publishSmokeSource = read('scripts/cms-publish-smoke.mjs');
const sitePreviewSource = read('scripts/cms-site-preview.mjs');
const restoreScriptSource = read('scripts/restore-cms-backup.mjs');
const packageSource = read('package.json');

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
assert(cmsSource.includes('richLinkInput'), 'CMS UI must expose the rich text link panel');
assert(cmsSource.includes('itemUploadInput'), 'CMS UI must expose image upload controls');
assert(cmsSource.includes('assetLibraryList'), 'CMS UI must expose the uploaded asset library');
assert(cmsSource.includes('itemLinksList'), 'CMS UI must expose structured item link controls');
assert(cmsSource.includes('publishReviewPanel'), 'CMS UI must expose the publish review panel');
assert(cmsSource.includes('publishReviewAcknowledge'), 'CMS UI must expose warning acknowledgement before export');
assert(cmsSource.includes("import '../cms/client'"), 'CMS page must load the browser client module');
assert(cmsClientSource.includes('activeSectionId'), 'CMS UI must keep section-level editing state');
assert(cmsClientSource.includes('createCmsStateHelpers'), 'CMS client must use shared state helpers');
assert(cmsClientSource.includes('renderCmsPreview'), 'CMS client must use the shared preview renderer');
assert(cmsClientSource.includes('collectCmsDraftIssues'), 'CMS client must use the shared draft validator');
assert(cmsClientSource.includes('createCmsPublishReview'), 'CMS client must use the shared publish review helper');
assert(cmsClientSource.includes('hasBlockingCmsPublishIssues'), 'CMS client must use shared publish blocking logic');
assert(!cmsClientSource.includes('仍要导出吗'), 'CMS export must not rely on a browser confirm for blocking publish issues');
assert(cmsClientSource.includes('parseCmsPackageJson'), 'CMS client must use the shared import package parser');
assert(cmsClientSource.includes('bindCmsRichTextToolbar'), 'CMS client must use the shared rich text toolbar binder');
assert(!cmsClientSource.includes("prompt('链接 URL')"), 'CMS client must not use browser prompt for rich text links');
assert(cmsClientSource.includes('readCmsUploadFile'), 'CMS client must use the shared upload file reader');
assert(cmsClientSource.includes('upsertCmsUploadAsset'), 'CMS client must use the shared upload asset upsert helper');
assert(cmsClientSource.includes('cmsUploadPreviewSrc'), 'CMS client must use upload data URLs for local previews');
assert(cmsClientSource.includes('createCmsAssetLibrary'), 'CMS client must use the shared asset library helper');
assert(cmsClientSource.includes('createCmsAssetItemPatch'), 'CMS client must use shared asset reuse patches');
assert(cmsClientSource.includes('normalizeCmsItemLinks'), 'CMS client must use shared item link normalization');
assert(cmsClientSource.includes('upsertCmsItemLink'), 'CMS client must use shared item link updates');
assert(cmsClientSource.includes('removeCmsItemLink'), 'CMS client must use shared item link removal');
assert(cmsPublishSource.includes('manifest'), 'CMS export package must include a manifest');
assert(cmsReviewSource.includes('createCmsPublishPackage'), 'CMS publish review helper must derive its data from publish packages');
assert(cmsReviewSource.includes('hasBlockingCmsPublishIssues'), 'CMS publish review helper must expose blocking state');
assert(cmsImportSource.includes('invalid cms package'), 'CMS import package must centralize invalid package handling');
assert(cmsRichTextSource.includes('execCommand'), 'CMS rich text module must own rich text command execution');
assert(cmsRichTextSource.includes('createCmsRichTextSelectionStore'), 'CMS rich text module must own editor selection persistence');
assert(cmsRichTextSource.includes('sanitizeCmsRichTextHtml'), 'CMS rich text module must own paste HTML sanitization');
assert(cmsRichTextSource.includes('createCmsRichTextLinkPanel'), 'CMS rich text module must own link panel behavior');
assert(cmsUploadSource.includes('CMS_UPLOAD_TARGET_DIR'), 'CMS upload module must own upload target paths');
assert(cmsUploadSource.includes('readCmsUploadFile'), 'CMS upload module must own browser file metadata reading');
assert(cmsUploadSource.includes('cmsUploadPreviewSrc'), 'CMS upload module must own preview source resolution');
assert(cmsAssetLibrarySource.includes('collectCmsUploadAssets'), 'CMS asset library must derive from uploaded asset helpers');
assert(cmsAssetLibrarySource.includes('usedBy'), 'CMS asset library must expose usage counts');
assert(cmsItemLinksSource.includes('normalizeCmsItemLinks'), 'CMS item link helper must expose normalization');
assert(cmsItemLinksSource.includes('upsertCmsItemLink'), 'CMS item link helper must expose structured updates');
assert(cmsApplyPlanSource.includes('cmsUploadApplyRelativePath'), 'CMS apply plan must use shared upload target resolution');
assert(applyFileOpsSource.includes("encoding === 'base64'"), 'CMS apply file writer must support uploaded binary targets');
assert(applyScriptSource.includes('collectCmsUploadPublishIssues'), 'CMS apply script must validate upload assets before writing');
assert(cmsDraftValidationSource.includes('collectCmsUploadAssetIssues'), 'CMS draft validation must use the shared upload asset validator');
assert(cmsPublishSource.includes('collectCmsUploadAssets'), 'CMS publish package builder must use the shared upload asset collector');
assert(cmsAssetSource.includes('/images/'), 'CMS asset validation must keep publishable image path rules centralized');
assert(dynamicRouteSource.includes('getStaticPaths'), 'CMS generated page route must provide getStaticPaths');
assert(dynamicRouteSource.includes('reservedPaths'), 'CMS generated page route must avoid existing hand-tuned routes');
assert(applyScriptSource.includes('CMS publish applied'), 'CMS apply script must write exported publish packages');
assert(applyScriptSource.includes('--dry-run'), 'CMS apply script must support --dry-run');
assert(applyScriptSource.includes('parseCmsPackageJson'), 'CMS apply script must use the shared import package parser');
assert(applyScriptSource.includes('createCmsApplyPlan'), 'CMS apply script must use the shared apply plan builder');
assert(applyScriptSource.includes('collectCmsAssetPublishIssues'), 'CMS apply script must block unpublishable assets before writing');
assert(applyScriptSource.includes('backupCmsApplyTargets'), 'CMS apply script must back up target files before writing');
assert(applyScriptSource.includes('targets.length'), 'CMS apply script must report the actual number of written files');
assert(applyFileOpsSource.includes('CMS publish backup'), 'CMS apply file ops must provide a rollback hint');
assert(applyFileOpsSource.includes('npm run cms:restore --'), 'CMS apply rollback hint must include the exact restore command');
assert(applyFileOpsSource.includes('restoreCmsApplyBackup'), 'CMS apply file ops must provide restore behavior');
assert(restoreScriptSource.includes('cms:restore'), 'CMS restore script must expose npm usage text');
assert(cmsApplyPlanSource.includes("section.type === 'gallery'"), 'CMS apply plan must publish gallery sections without GIF hero items');
assert(applySmokeSource.includes('CMS apply smoke passed'), 'CMS apply smoke must provide a reusable dry-run check');
assert(publishSmokeSource.includes('createCmsPublishPackage'), 'CMS publish smoke must exercise real publish package creation');
assert(publishSmokeSource.includes('cms-seed'), 'CMS publish smoke must read the built CMS seed');
assert(sitePreviewSource.includes('cms-seed'), 'CMS site preview must read the generated CMS seed');
assert(sitePreviewSource.includes('assertCmsPackage'), 'CMS site preview must validate the generated payload shape');
assert(sitePreviewSource.includes('--json'), 'CMS site preview must support printing the generated JSON preview');
assert(!sitePreviewSource.includes('writeFileSync'), 'CMS site preview must remain read-only');
assert(packageSource.includes('"cms:apply:smoke"'), 'CMS apply smoke must be available as an npm script');
assert(packageSource.includes('"cms:publish:smoke"'), 'CMS publish smoke must be available as an npm script');
assert(packageSource.includes('"cms:restore"'), 'CMS restore command must be available as an npm script');
assert(packageSource.includes('"cms:site-preview"'), 'CMS site preview must be available as an npm script');

const codes = readJson('src/content/codes.json');
const games = readJson('src/content/games.json');
const pixel = readJson('src/content/pixel.json');
const illustrations = readJson('src/content/illustrations.json');
const gifs = readJson('src/content/gifs.json');
const graphics = readJson('src/content/graphics.json');
const photoAlbums = readJson('src/content/photoAlbums.json');

checkCmsStateHelpers();
checkCmsPreviewRenderer();
checkCmsDraftValidation();
checkCmsAssetReferences();
checkCmsUploadAssets();
checkCmsAssetLibrary();
checkCmsItemLinks();
checkCmsPublishPackage();
checkCmsPublishReview();
checkCmsImportPackage();
checkCmsApplyPlan();
checkCmsApplyFileOps();
checkCmsRichTextTools();
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
