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
