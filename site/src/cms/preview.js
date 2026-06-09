function escapeHtml(value) {
  return (value ?? '').toString().replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

export function renderCmsPreview({ page, nav, site }) {
  const topMap = { home: 7.3, inner: 5.5, tight: 5.5, photo: 4.7, contact: 7.3 };
  const mainLinks = nav?.groups?.find(group => group.id === 'main')?.items.filter(item => item.visible) || [];
  const socialLinks = nav?.groups?.find(group => group.id === 'social')?.items.filter(item => item.visible) || [];
  const top = topMap[page.frame?.topSpacingPreset] ?? 5.5;

  return `
    <div class="preview-site" style="--preview-top:${top}">
      <div class="preview-nav">
        <div class="preview-logo">${escapeHtml(site?.title || 'Onovich')}</div>
        <h2>${mainLinks.map(link => `<a href="${escapeAttr(link.path || '#')}">${escapeHtml(link.label || link.id)}</a>`).join('<br>')}</h2>
        <h2 class="preview-social">${socialLinks.map(link => `<a href="${escapeAttr(link.path || '#')}">${escapeHtml(link.label || link.id)}</a>`).join('<br>')}</h2>
      </div>
      <div class="preview-main">
        ${page.frame?.showBackLink ? `<div class="preview-back">&lt; ${escapeHtml(page.frame.backLabel || 'HOME')}</div>` : ''}
        ${page.sections.map(section => renderPreviewSection(section)).join('')}
      </div>
    </div>
  `;
}

export function renderPreviewSection(section) {
  const params = section.params || {};
  const gap = params.sectionGap === 'large' ? 52 : params.sectionGap === 'normal' ? 34 : 0;
  const width = params.widthMode === 'custom' && params.customWidthPercent
    ? `${Number(params.customWidthPercent)}%`
    : '100%';

  if (section.type === 'profile') {
    const item = section.items?.[0] || {};
    return `<div class="preview-section preview-rich" style="--section-gap:${gap}px;--preview-width:${width}">
      ${item.src ? `<img class="preview-profile-image" src="${escapeAttr(item.src)}" alt="">` : ''}
      <hr>
      ${item.bodyHtml || section.bodyHtml || ''}
    </div>`;
  }
  if (section.type === 'gif-hero') {
    const item = section.items?.[0] || {};
    return `<div class="preview-section preview-gif-hero" style="--section-gap:${gap}px;--preview-width:${width}">
      ${item.src ? `<img src="${escapeAttr(item.src)}" alt="">` : ''}
    </div>`;
  }
  if (section.type === 'rich-text' || section.type === 'contact') {
    const body = section.bodyHtml || section.items?.find(item => item.bodyHtml)?.bodyHtml || '';
    return `<div class="preview-section preview-rich" style="--section-gap:${gap}px;--preview-width:${width}">${body}</div>`;
  }
  if (section.type === 'links') {
    return `<div class="preview-section preview-link-list" style="--section-gap:${gap}px;--preview-width:${width}">
      ${(section.items || []).map(item => `<a href="${escapeAttr(item.href || '#')}">${escapeHtml(item.title || item.id)}</a>`).join('')}
    </div>`;
  }
  return renderPreviewGallery(section, gap, width);
}

function renderPreviewGallery(section, gap, width) {
  const params = section.params || {};
  const columns = Math.max(1, Math.min(3, Number(params.columns) || 3));
  const spacing = params.spacing === 'flush' ? 0 : params.spacing === 'dense' ? 6 : 10;
  const ratio = params.imageFit === 'cover-square'
    ? '1 / 1'
    : params.imageFit === 'cover-16-9'
      ? '16 / 9'
      : 'auto';
  return `<div class="preview-section preview-gallery" style="--section-gap:${gap}px;--preview-columns:${columns};--preview-gap:${spacing}px;--preview-ratio:${ratio};--preview-width:${width}">
    ${(section.items || []).map(item => `
      <figure class="preview-card" data-fit="${escapeAttr(params.imageFit || 'natural')}">
        ${previewItemOpen(section, item)}
        ${item.src ? `<img src="${escapeAttr(item.src)}" alt="${escapeAttr(item.title || '')}">` : '<div style="height:72px;background:rgba(0,0,0,.08)"></div>'}
        ${previewItemClose(section, item)}
        ${previewCaption(section, item)}
      </figure>
    `).join('')}
  </div>`;
}

function previewItemOpen(section, item) {
  const mode = section.params?.clickMode;
  const href = mode === 'internal-page'
    ? (item.href || (item.targetPageId ? `/${item.targetPageId}` : ''))
    : mode === 'external-link'
      ? item.href
      : mode === 'lightbox'
        ? item.src
        : '';
  return href ? `<a href="${escapeAttr(href)}">` : '';
}

function previewItemClose(section, item) {
  return previewItemOpen(section, item) ? '</a>' : '';
}

function previewCaption(section, item) {
  const params = section.params || {};
  if (params.showCaptions === false || params.captionMode === 'none') return '';
  if (params.captionMode === 'html' && item.captionHtml) return `<figcaption>${item.captionHtml}</figcaption>`;
  const links = (item.links || []).map(link => `<a href="${escapeAttr(link.url || '#')}">${escapeHtml(link.label || 'Link')}</a>`).join(' / ');
  return `<figcaption>
    ${item.title ? `<div>${escapeHtml(item.title)}</div>` : ''}
    ${(params.captionMode === 'title-desc-links' && item.desc) ? `<div>${escapeHtml(item.desc)}</div>` : ''}
    ${item.year ? `<div>${escapeHtml(item.year)}</div>` : ''}
    ${links ? `<div>${links}</div>` : ''}
  </figcaption>`;
}
