export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createCmsStateHelpers({
  getState,
  getActivePage,
  pageTemplateMap,
  sectionPresetMap,
}) {
  function slugify(value, fallback = 'page') {
    const slug = (value || '').toString().trim().toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || fallback;
  }

  function ensurePage(page) {
    const template = pageTemplateMap.get(page.templateId) || pageTemplateMap.get('gallery-page');
    page.templateId = page.templateId || template.id;
    page.type = page.type || template.id;
    page.category = page.category || '作品';
    page.navGroupId = page.navGroupId || (page.sidebar === false ? 'hidden' : 'main');
    page.sidebar = page.sidebar !== false && page.navGroupId !== 'hidden';
    page.frame = {
      ...(template.defaultFrame || {}),
      ...(page.frame || {}),
    };
    page.sections = Array.isArray(page.sections) && page.sections.length
      ? page.sections
      : [createSectionFromPreset(defaultSectionPreset(page.templateId))];
    page.sections.forEach(ensureSection);
    syncPageItems(page);
  }

  function ensureSection(section) {
    const preset = sectionPresetMap.get(section.presetId) || sectionPresetMap.get('gallery-roomy-3');
    section.presetId = section.presetId || preset.id;
    section.type = section.type || preset.type;
    section.params = {
      ...(preset.defaults || {}),
      ...(section.params || {}),
    };
    section.items = Array.isArray(section.items) ? section.items : [];
    if (section.bodyHtml && !section.items.length) {
      section.items.push({ id: section.id + '-body', bodyHtml: section.bodyHtml });
    }
  }

  function syncPageItems(page) {
    page.items = page.sections.flatMap(section => section.items || []);
    if (page.sections.some(section => section.type === 'rich-text' || section.type === 'contact' || section.type === 'profile')) {
      const rich = page.sections.find(section => section.bodyHtml || section.items?.some(item => item.bodyHtml));
      page.bodyHtml = rich?.bodyHtml || rich?.items?.find(item => item.bodyHtml)?.bodyHtml || page.bodyHtml || '';
    }
  }

  function syncNav() {
    const state = getState();
    const labels = { main: '作品', social: '链接', hidden: '隐藏' };
    const groups = ['main', 'social', 'hidden'].map((id, groupIndex) => ({
      id,
      label: labels[id],
      order: groupIndex + 1,
      items: state.pages
        .filter(page => (page.navGroupId || 'hidden') === id)
        .map((page, order) => ({
          pageId: page.id,
          id: page.id,
          label: page.title,
          path: page.path,
          group: labels[id],
          navGroupId: id,
          visible: id !== 'hidden' && page.sidebar !== false,
          order,
        })),
    }));
    state.nav = { title: state.nav?.title || 'Onovich', groups };
    state.sidebar = groups.flatMap(group => group.items).filter(item => item.visible);
  }

  function defaultSectionPreset(templateId) {
    return ({
      'home-profile': 'home-profile',
      'gallery-page': 'gallery-roomy-3',
      'segmented-gallery-page': 'gallery-roomy-3',
      'gif-page': 'gif-hero',
      'photo-index': 'photo-index-columns',
      'photo-detail': 'photo-detail-columns',
      'rich-text': 'rich-text-poem',
      links: 'single-link',
      'contact-drawer': 'contact-message',
    })[templateId] || 'gallery-roomy-3';
  }

  function createSectionFromPreset(presetId, page = getActivePage()) {
    const preset = sectionPresetMap.get(presetId) || sectionPresetMap.get('gallery-roomy-3');
    const id = uniqueSectionId(preset.id, page);
    const item = defaultItemForPreset(preset);
    return {
      id,
      type: preset.type,
      presetId: preset.id,
      title: preset.label,
      params: clone(preset.defaults || {}),
      items: item ? [item] : [],
      bodyHtml: item?.bodyHtml || '',
    };
  }

  function defaultItemForPreset(preset) {
    if (preset.type === 'rich-text') return { id: 'body', bodyHtml: '<p>New text</p>' };
    if (preset.type === 'contact') return { id: 'message', title: 'MESSAGE', bodyHtml: '<p>MESSAGE</p>' };
    if (preset.type === 'links') return { id: 'link-1', title: 'New link', href: 'https://' };
    if (preset.type === 'profile') {
      return { id: 'avatar', title: 'Avatar', src: '/images/profile/avatar.jpg', width: 400, height: 400, bodyHtml: '<p>New profile text</p>' };
    }
    if (preset.type === 'gif-hero') return { id: 'gif-hero', title: 'GIF hero', src: '/images/gifs/hero.gif', width: 750, height: 553 };
    return { id: 'item-1', title: 'Untitled', src: '', width: undefined, height: undefined, links: [] };
  }

  function uniqueId(base) {
    const state = getState();
    let id = slugify(base);
    let n = 2;
    while (state.pages.some(page => page.id === id)) {
      id = `${slugify(base)}-${n}`;
      n += 1;
    }
    return id;
  }

  function uniqueSectionId(base, page = getActivePage()) {
    let id = slugify(base, 'section');
    let n = 2;
    while (page?.sections?.some(section => section.id === id)) {
      id = `${slugify(base, 'section')}-${n}`;
      n += 1;
    }
    return id;
  }

  return {
    slugify,
    ensurePage,
    syncNav,
    defaultSectionPreset,
    createSectionFromPreset,
    defaultItemForPreset,
    uniqueId,
  };
}
