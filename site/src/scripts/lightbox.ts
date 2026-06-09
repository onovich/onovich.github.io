const gallerySelector = '.pswp-gallery';
const itemSelector = 'a[data-pswp-width][data-pswp-height]';
let opening = false;

declare global {
  interface Window {
    __onovichLightboxBound?: boolean;
  }
}

function toNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function slideFromLink(link: HTMLAnchorElement) {
  const img = link.querySelector('img');
  const width = toNumber(link.dataset.pswpWidth ?? null, img?.naturalWidth || 1200);
  const height = toNumber(link.dataset.pswpHeight ?? null, img?.naturalHeight || 900);

  return {
    src: link.href,
    width,
    height,
    w: width,
    h: height,
    msrc: img?.currentSrc || img?.src,
    alt: img?.alt || link.getAttribute('aria-label') || '',
    element: link,
  };
}

async function openGallery(link: HTMLAnchorElement, event: MouseEvent) {
  if (opening) return;

  const gallery = link.closest(gallerySelector);
  if (!gallery) return;

  const links = Array.from(gallery.querySelectorAll<HTMLAnchorElement>(itemSelector));
  const index = links.indexOf(link);
  if (index < 0) return;

  opening = true;

  try {
    const [{ default: PhotoSwipe }] = await Promise.all([
      import('photoswipe'),
      import('photoswipe/style.css'),
    ]);

    const lightbox = new PhotoSwipe({
      dataSource: links.map(slideFromLink),
      index,
      bgOpacity: 0.95,
      showHideAnimationType: 'zoom',
      initialPointerPos: { x: event.clientX, y: event.clientY },
    });

    lightbox.on('destroy', () => {
      opening = false;
    });
    lightbox.init();
  } catch (error) {
    opening = false;
    console.error('Photo preview failed to open.', error);
  }
}

if (!window.__onovichLightboxBound) {
  window.__onovichLightboxBound = true;

  document.addEventListener(
    'click',
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>(itemSelector)
        : null;

      if (!target || !target.closest(gallerySelector)) return;

      event.preventDefault();
      event.stopPropagation();
      openGallery(target, event);
    },
    true,
  );
}
