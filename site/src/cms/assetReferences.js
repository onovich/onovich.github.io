export function collectCmsAssetReferences(state) {
  return (state.pages || []).flatMap(page =>
    (page.sections || []).flatMap(section =>
      (section.items || [])
        .filter(item => item.src)
        .map(item => ({
          src: item.src,
          pageId: page.id,
          pageTitle: page.title,
          sectionId: section.id,
          itemId: item.id,
          width: item.width,
          height: item.height,
        }))
    )
  );
}

export function classifyCmsAssetSrc(src) {
  if (!src) return { kind: 'empty', publishable: true };
  if (src.startsWith('/images/')) return { kind: 'site-image', publishable: true };
  if (/^https?:\/\//i.test(src)) return { kind: 'remote-image', publishable: false };
  if (src.startsWith('data:')) return { kind: 'embedded-image', publishable: false };
  return { kind: 'relative-image', publishable: false };
}

export function cmsAssetPublicPath(src) {
  return classifyCmsAssetSrc(src).kind === 'site-image' ? src.slice(1) : '';
}

export function collectCmsAssetPublishIssues(state, { assetExists = () => true } = {}) {
  return collectCmsAssetReferences(state).flatMap(ref => {
    const classification = classifyCmsAssetSrc(ref.src);
    if (!classification.publishable) {
      return [{
        level: 'error',
        code: 'asset-path-unpublishable',
        message: `${ref.pageTitle || ref.pageId}/${ref.sectionId}/${ref.itemId}: 图片路径需要在 /images/ 下`,
        ...ref,
      }];
    }

    const publicPath = cmsAssetPublicPath(ref.src);
    if (publicPath && !assetExists(publicPath, ref)) {
      return [{
        level: 'error',
        code: 'asset-file-missing',
        message: `${ref.pageTitle || ref.pageId}/${ref.sectionId}/${ref.itemId}: 图片文件不存在 ${ref.src}`,
        publicPath,
        ...ref,
      }];
    }

    return [];
  });
}
