const enhancedImageSelector = '.thumb_image, .photo-card img, .gif-hero img, .home-avatar';

function markLoaded(img: HTMLImageElement) {
  img.classList.add('is-loaded');
}

function enhanceImage(img: HTMLImageElement) {
  if (img.classList.contains('is-loaded')) return;

  if (img.complete) {
    markLoaded(img);
    return;
  }

  img.addEventListener('load', () => markLoaded(img), { once: true });
  img.addEventListener('error', () => markLoaded(img), { once: true });
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
