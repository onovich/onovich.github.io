import { classifyCmsAssetSrc } from './assetReferences.js';

export function collectCmsDraftIssues({
  state,
  seedIssues = [],
  pageTemplateMap,
  sectionPresetMap,
}) {
  const issues = [];
  if (seedIssues.length) {
    issues.push(...seedIssues.map(issue => ({
      level: issue.level || 'warning',
      message: issue.message,
      pageId: issue.pageId,
      sectionId: issue.sectionId,
      itemId: issue.itemId,
    })));
  }
  for (const page of state.pages) {
    if (!page.path?.startsWith('/')) {
      issues.push({ level: 'error', message: `${page.title}: 路径需要以 / 开头`, pageId: page.id });
    }
    if (!pageTemplateMap.has(page.templateId)) {
      issues.push({ level: 'error', message: `${page.title}: 未知页面模板 ${page.templateId}`, pageId: page.id });
    }
    for (const section of page.sections || []) {
      if (!sectionPresetMap.has(section.presetId)) {
        issues.push({ level: 'error', message: `${page.title}: 未知分段预设 ${section.presetId}`, pageId: page.id, sectionId: section.id });
      }
      for (const item of section.items || []) {
        if (item.src && (!item.width || !item.height)) {
          issues.push({ level: 'warning', message: `${page.title}/${section.id}/${item.id}: 图片缺少宽高`, pageId: page.id, sectionId: section.id, itemId: item.id });
        }
        if (item.src && !classifyCmsAssetSrc(item.src).publishable) {
          issues.push({ level: 'warning', message: `${page.title}/${section.id}/${item.id}: 图片路径需要在 /images/ 下`, pageId: page.id, sectionId: section.id, itemId: item.id });
        }
        if (section.params?.clickMode === 'internal-page' && item.targetPageId && !state.pages.some(target => target.id === item.targetPageId)) {
          issues.push({ level: 'error', message: `${page.title}/${item.id}: 目标页面不存在`, pageId: page.id, sectionId: section.id, itemId: item.id });
        }
      }
    }
  }
  return issues;
}
