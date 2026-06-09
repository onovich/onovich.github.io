import type {
  CmsPage,
  CmsSeed,
  CmsValidationIssue,
  ContentItem,
} from './schema';
import { pageTemplates, sectionPresetMap } from './presets';

const pageTemplateIds = new Set(pageTemplates.map((template) => template.id));

function issue(params: CmsValidationIssue): CmsValidationIssue {
  return params;
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function validateImageItem(
  item: ContentItem,
  page: CmsPage,
  sectionId: string,
  issues: CmsValidationIssue[],
): void {
  if (!item.src) return;

  if (!hasValue(item.width) || !hasValue(item.height)) {
    issues.push(issue({
      level: 'warning',
      code: 'asset-dimensions-missing',
      message: 'Image item should keep width and height so the CMS preview does not drift.',
      pageId: page.id,
      sectionId,
      itemId: item.id,
    }));
  }

  if (!item.src.startsWith('/images/')) {
    issues.push(issue({
      level: 'warning',
      code: 'asset-path-outside-images',
      message: 'Image item is outside /images; confirm it is publishable with the static site.',
      pageId: page.id,
      sectionId,
      itemId: item.id,
    }));
  }
}

export function validateCmsSite(seed: CmsSeed): CmsValidationIssue[] {
  const issues: CmsValidationIssue[] = [];
  const knownPageIds = new Set(seed.pages.map((page) => page.id));
  const pageIds = new Set<string>();
  const paths = new Set<string>();

  for (const page of seed.pages) {
    if (pageIds.has(page.id)) {
      issues.push(issue({
        level: 'error',
        code: 'duplicate-page-id',
        message: `Duplicate page id: ${page.id}`,
        pageId: page.id,
      }));
    }
    pageIds.add(page.id);

    if (paths.has(page.path)) {
      issues.push(issue({
        level: 'error',
        code: 'duplicate-page-path',
        message: `Duplicate page path: ${page.path}`,
        pageId: page.id,
      }));
    }
    paths.add(page.path);

    if (!pageTemplateIds.has(page.templateId)) {
      issues.push(issue({
        level: 'error',
        code: 'unknown-template',
        message: `Unknown page template: ${page.templateId}`,
        pageId: page.id,
      }));
    }

    if (!page.sections.length) {
      issues.push(issue({
        level: 'warning',
        code: 'page-without-sections',
        message: 'Page has no CMS sections.',
        pageId: page.id,
      }));
    }

    for (const section of page.sections) {
      const preset = sectionPresetMap.get(section.presetId);
      if (!preset) {
        issues.push(issue({
          level: 'error',
          code: 'unknown-section-preset',
          message: `Unknown section preset: ${section.presetId}`,
          pageId: page.id,
          sectionId: section.id,
        }));
        continue;
      }

      for (const item of section.items) {
        for (const field of preset.requiredItemFields) {
          if (!hasValue(item[field])) {
            issues.push(issue({
              level: 'warning',
              code: 'required-item-field-missing',
              message: `Required item field is missing: ${String(field)}`,
              pageId: page.id,
              sectionId: section.id,
              itemId: item.id,
            }));
          }
        }

        validateImageItem(item, page, section.id, issues);

        if (section.params.clickMode === 'internal-page' && item.targetPageId && !knownPageIds.has(item.targetPageId)) {
          issues.push(issue({
            level: 'error',
            code: 'target-page-missing',
            message: `Internal target page does not exist: ${item.targetPageId}`,
            pageId: page.id,
            sectionId: section.id,
            itemId: item.id,
          }));
        }
      }
    }
  }

  const visibleNavPaths = new Set(seed.sidebar.map((item) => item.path));
  for (const page of seed.pages) {
    if (page.sidebar && page.navGroupId !== 'hidden' && !visibleNavPaths.has(page.path)) {
      issues.push(issue({
        level: 'warning',
        code: 'sidebar-page-not-in-nav',
        message: 'Page is marked for sidebar but is not visible in navigation.',
        pageId: page.id,
      }));
    }
  }

  return issues;
}
