const enhancedImageSelector = '.thumb_image, .photo-card img, .gif-hero img, .home-avatar';

function markLoaded(img: HTMLImageElement) {
  img.classList.add('is-loaded');
}

function hasRenderableSize(img: HTMLImageElement) {
  return img.naturalWidth > 0 && img.naturalHeight > 0;
}

function enhanceImage(img: HTMLImageElement) {
  if (img.classList.contains('is-loaded')) return;

  if (img.complete || hasRenderableSize(img)) {
    markLoaded(img);
    return;
  }

  img.addEventListener('load', () => markLoaded(img), { once: true });
  img.addEventListener('error', () => markLoaded(img), { once: true });

  let attempts = 0;
  const revealWhenRenderable = () => {
    if (img.classList.contains('is-loaded')) return;
    if (hasRenderableSize(img)) {
      markLoaded(img);
      return;
    }
    attempts += 1;
    if (attempts < 60) window.setTimeout(revealWhenRenderable, 100);
  };
  window.setTimeout(revealWhenRenderable, 100);
}

function enhanceImages(root: ParentNode = document) {
  root
    .querySelectorAll<HTMLImageElement>(enhancedImageSelector)
    .forEach(enhanceImage);
}

document.documentElement.classList.add('js');
enhanceImages();

if (document.body) {
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;

        if (node.matches(enhancedImageSelector)) {
          enhanceImage(node as HTMLImageElement);
        }
        enhanceImages(node);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

document.addEventListener('astro:page-load', () => enhanceImages());
