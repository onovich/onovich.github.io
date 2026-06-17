import { collectCmsUploadAssets, normalizeCmsUploadAsset } from './uploadAssets.js';

export function createCmsAssetLibrary({ state }) {
  return collectCmsUploadAssets(state).map(asset => {
    const normalized = normalizeCmsUploadAsset(asset);
    return {
      ...normalized,
      usedBy: collectCmsAssetUsage({ state, src: normalized.src }),
    };
  });
}

export function createCmsAssetItemPatch(asset) {
  const normalized = normalizeCmsUploadAsset(asset);
  return {
    src: normalized.src,
    width: normalized.width,
    height: normalized.height,
    originalUrl: normalized.src,
  };
}

function collectCmsAssetUsage({ state, src }) {
  const usage = [];
  for (const page of state?.pages || []) {
    for (const section of page.sections || []) {
      for (const item of section.items || []) {
        if (item?.src !== src) continue;
        usage.push({
          pageId: page.id,
          pageTitle: page.title || page.id,
          sectionId: section.id,
          itemId: item.id,
        });
      }
    }
  }
  return usage;
}
