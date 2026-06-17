import { createCmsPublishPackage } from './publishPackage.js';

export function createCmsPublishReview({
  state,
  issues = [],
  exportedAt = new Date().toISOString(),
}) {
  const payload = createCmsPublishPackage({ state, issues, exportedAt });
  const manifest = payload.manifest || {};
  const validation = manifest.validation || {};
  const validationIssues = Array.isArray(validation.issues) ? validation.issues : [];
  const errors = validationIssues.filter(issue => issue?.level === 'error');
  const warnings = validationIssues.filter(issue => issue?.level !== 'error');
  const uploads = manifest.uploads || {};

  return {
    payload,
    pageCount: Number(manifest.pageCount) || 0,
    visibleNavCount: Number(manifest.visibleNavCount) || 0,
    templates: Array.isArray(manifest.templates) ? [...manifest.templates] : [],
    sectionPresets: Array.isArray(manifest.sectionPresets) ? [...manifest.sectionPresets] : [],
    errors,
    warnings,
    uploads: {
      count: Number(uploads.count) || 0,
      totalBytes: Number(uploads.totalBytes) || 0,
      targetDir: uploads.targetDir || '',
      paths: Array.isArray(uploads.paths) ? [...uploads.paths] : [],
    },
    publishTargets: Array.isArray(manifest.publishTargets) ? [...manifest.publishTargets] : [],
  };
}

export function hasBlockingCmsPublishIssues(review) {
  return (review?.errors || []).length > 0;
}
