import { clone } from './state.js';
import { CMS_UPLOAD_TARGET_DIR, collectCmsUploadAssets } from './uploadAssets.js';

export const CMS_PUBLISH_TARGETS = Object.freeze([
  'site/src/content/site.json',
  'site/src/content/*.json',
  'site/src/content/poem.html',
  CMS_UPLOAD_TARGET_DIR,
]);

export function createCmsPublishPackage({
  state,
  issues = [],
  exportedAt = new Date().toISOString(),
}) {
  const pages = Array.isArray(state.pages) ? state.pages : [];
  const sidebar = Array.isArray(state.sidebar) ? state.sidebar : [];
  const payload = clone(state);
  const uploadAssets = collectCmsUploadAssets(payload);
  payload.assets = uploadAssets;
  const errors = issues.filter(issue => issue?.level === 'error');
  const warnings = issues.filter(issue => issue?.level !== 'error');

  return {
    ...payload,
    exportedAt,
    manifest: {
      name: 'onovich-cms-publish',
      exportedAt,
      schemaVersion: state.schemaVersion,
      pageCount: pages.length,
      visibleNavCount: sidebar.length,
      templates: unique(pages.map(page => page.templateId)),
      sectionPresets: unique(pages.flatMap(page => (page.sections || []).map(section => section.presetId))),
      validation: {
        errors: errors.length,
        warnings: warnings.length,
        issues: clone(issues),
      },
      uploads: {
        count: uploadAssets.length,
        targetDir: CMS_UPLOAD_TARGET_DIR,
        paths: uploadAssets.map(asset => asset.targetPath),
        totalBytes: uploadAssets.reduce((sum, asset) => sum + (Number(asset.size) || 0), 0),
      },
      publishTargets: [...CMS_PUBLISH_TARGETS],
    },
  };
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}
