const leavingClass = 'is-navigating';
const fallbackDelay = 110;

function isPlainLeftClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function shouldEnhance(link: HTMLAnchorElement, event: MouseEvent) {
  if (!isPlainLeftClick(event)) return false;
  if (event.defaultPrevented) return false;
  if (link.target && link.target !== '_self') return false;
  if (link.hasAttribute('download')) return false;
  if (link.matches('[data-pswp-width][data-pswp-height]')) return false;

  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return false;

  const current = new URL(window.location.href);
  if (url.pathname === current.pathname && url.search === current.search) {
    return false;
  }

  return true;
}

document.addEventListener('click', (event) => {
  const link = event.target instanceof Element
    ? event.target.closest<HTMLAnchorElement>('a[href]')
    : null;

  if (!link || !shouldEnhance(link, event)) return;

  document.documentElement.classList.add(leavingClass);

  if (!('startViewTransition' in document)) {
    event.preventDefault();
    window.setTimeout(() => {
      window.location.assign(link.href);
    }, fallbackDelay);
  }
});

window.addEventListener('pageshow', () => {
  document.documentElement.classList.remove(leavingClass);
});
