import { clone, createCmsStateHelpers } from './state.js';
import { renderCmsPreview } from './preview.js';
import { collectCmsDraftIssues } from './draftValidation.js';
import { createCmsPublishPackage } from './publishPackage.js';

(() => {
  const STORAGE_KEY = 'onovich:cms:draft';
  const PUBLISHED_KEY = 'onovich:cms:published';
  const seed = JSON.parse(document.getElementById('cms-seed').textContent);
  const seedIssues = JSON.parse(document.getElementById('cms-validation-seed').textContent || '[]');
  const pageTemplateMap = new Map(seed.presets.pageTemplates.map(template => [template.id, template]));
  const sectionPresetMap = new Map(seed.presets.sectionPresets.map(preset => [preset.id, preset]));

  let state = loadState();
  let activePageId = state.pages[0]?.id || 'home';
  let activeSectionId = state.pages[0]?.sections?.[0]?.id || '';
  let activeItemIndex = 0;
  const {
    slugify,
    ensurePage,
    syncNav,
    defaultSectionPreset,
    createSectionFromPreset,
    defaultItemForPreset,
    uniqueId,
  } = createCmsStateHelpers({
    getState: () => state,
    getActivePage: () => activePage(),
    pageTemplateMap,
    sectionPresetMap,
  });

  const els = {
    status: document.getElementById('cmsStatus'),
    categoryList: document.getElementById('categoryList'),
    pageList: document.getElementById('pageList'),
    categoryOptions: document.getElementById('categoryOptions'),
    currentPath: document.getElementById('currentPath'),
    currentTitle: document.getElementById('currentTitle'),
    pageTitle: document.getElementById('pageTitleInput'),
    pagePath: document.getElementById('pagePathInput'),
    pageCategory: document.getElementById('pageCategoryInput'),
    pageTemplate: document.getElementById('pageTemplateInput'),
    pageNavGroup: document.getElementById('pageNavGroupInput'),
    pageSidebar: document.getElementById('pageSidebarInput'),
    frameBack: document.getElementById('frameBackInput'),
    frameBackLabel: document.getElementById('frameBackLabelInput'),
    frameBackHref: document.getElementById('frameBackHrefInput'),
    frameTopSpacing: document.getElementById('frameTopSpacingInput'),
    frameContactDrawer: document.getElementById('frameContactDrawerInput'),
    templateHelp: document.getElementById('templateHelp'),
    sectionList: document.getElementById('sectionList'),
    sectionId: document.getElementById('sectionIdInput'),
    sectionTitle: document.getElementById('sectionTitleInput'),
    sectionPreset: document.getElementById('sectionPresetInput'),
    sectionColumns: document.getElementById('sectionColumnsInput'),
    sectionSpacing: document.getElementById('sectionSpacingInput'),
    sectionImageFit: document.getElementById('sectionImageFitInput'),
    sectionCaptionMode: document.getElementById('sectionCaptionModeInput'),
    sectionClickMode: document.getElementById('sectionClickModeInput'),
    sectionGap: document.getElementById('sectionGapInput'),
    sectionCaptions: document.getElementById('sectionCaptionsInput'),
    sectionWidth: document.getElementById('sectionWidthInput'),
    itemList: document.getElementById('itemList'),
    itemId: document.getElementById('itemIdInput'),
    itemTitle: document.getElementById('itemTitleInput'),
    itemDesc: document.getElementById('itemDescInput'),
    itemYear: document.getElementById('itemYearInput'),
    itemSrc: document.getElementById('itemSrcInput'),
    itemHref: document.getElementById('itemHrefInput'),
    itemTargetPage: document.getElementById('itemTargetPageInput'),
    itemWidth: document.getElementById('itemWidthInput'),
    itemHeight: document.getElementById('itemHeightInput'),
    itemCaptionHtml: document.getElementById('itemCaptionHtmlInput'),
    itemBodyHtml: document.getElementById('itemBodyHtmlInput'),
    itemLinks: document.getElementById('itemLinksInput'),
    richEditor: document.getElementById('richEditor'),
    rawJson: document.getElementById('rawJson'),
    validationList: document.getElementById('validationList'),
    preview: document.getElementById('previewFrame'),
  };

  function loadState() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return clone(seed);
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed.pages) || !parsed.presets || !parsed.pages.every(page => Array.isArray(page.sections))) {
        return clone(seed);
      }
      return parsed;
    } catch {
      return clone(seed);
    }
  }

  function setStatus(text) {
    els.status.textContent = text;
  }

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

  function activePage() {
    return state.pages.find(page => page.id === activePageId) || state.pages[0];
  }

  function activeSection(page = activePage()) {
    ensurePage(page);
    return page.sections.find(section => section.id === activeSectionId) || page.sections[0];
  }

  function saveDraft(message = '草稿已保存') {
    state.updatedAt = new Date().toISOString();
    state.pages.forEach(ensurePage);
    syncNav();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setStatus(`${message} ${new Date().toLocaleTimeString()}`);
  }

  function render() {
    state.pages.forEach(ensurePage);
    syncNav();
    const page = activePage();
    if (!page) return;
    if (!page.sections.some(section => section.id === activeSectionId)) {
      activeSectionId = page.sections[0]?.id || '';
      activeItemIndex = 0;
    }
    renderTemplateOptions();
    renderPresetOptions();
    renderCategories();
    renderPages();
    renderPageSettings(page);
    renderSections(page);
    renderItems(page);
    renderTextEditor(page);
    renderRaw();
    renderValidation();
    renderPreview(page);
  }

  function renderTemplateOptions() {
    els.pageTemplate.innerHTML = seed.presets.pageTemplates.map(template =>
      `<option value="${escapeAttr(template.id)}">${escapeHtml(template.label)}</option>`
    ).join('');
  }

  function renderPresetOptions() {
    els.sectionPreset.innerHTML = seed.presets.sectionPresets.map(preset =>
      `<option value="${escapeAttr(preset.id)}">${escapeHtml(preset.label)}</option>`
    ).join('');
  }

  function renderCategories() {
    const categories = Array.from(new Set([...(state.categories || []), ...state.pages.map(page => page.category || '未分类')]));
    state.categories = categories;
    els.categoryOptions.innerHTML = categories.map(cat => `<option value="${escapeAttr(cat)}"></option>`).join('');
    els.categoryList.innerHTML = categories.map(cat => {
      const count = state.pages.filter(page => (page.category || '未分类') === cat).length;
      return `<button class="cms-list-item" type="button" data-category="${escapeAttr(cat)}"><span>${escapeHtml(cat)}</span><small>${count}</small></button>`;
    }).join('');
    els.categoryList.querySelectorAll('[data-category]').forEach(button => {
      button.addEventListener('click', () => {
        const page = state.pages.find(item => (item.category || '未分类') === button.dataset.category);
        if (page) setActivePage(page.id);
      });
    });
  }

  function renderPages() {
    const page = activePage();
    els.pageList.innerHTML = state.pages.map(item => `
      <button class="cms-list-item ${item.id === page.id ? 'is-active' : ''}" type="button" data-page="${escapeAttr(item.id)}">
        <span>${escapeHtml(item.title || item.id)}</span>
        <small>${escapeHtml(item.templateId || '')}</small>
      </button>
    `).join('');
    els.pageList.querySelectorAll('[data-page]').forEach(button => {
      button.addEventListener('click', () => setActivePage(button.dataset.page));
    });
  }

  function setActivePage(pageId) {
    activePageId = pageId;
    const page = activePage();
    activeSectionId = page.sections[0]?.id || '';
    activeItemIndex = 0;
    render();
  }

  function renderPageSettings(page) {
    const template = pageTemplateMap.get(page.templateId);
    els.currentPath.textContent = page.path || '';
    els.currentTitle.textContent = page.title || page.id;
    els.pageTitle.value = page.title || '';
    els.pagePath.value = page.path || '';
    els.pageCategory.value = page.category || '';
    els.pageTemplate.value = page.templateId || 'gallery-page';
    els.pageNavGroup.value = page.navGroupId || 'hidden';
    els.pageSidebar.checked = page.sidebar !== false && page.navGroupId !== 'hidden';
    els.frameBack.checked = page.frame?.showBackLink !== false;
    els.frameBackLabel.value = page.frame?.backLabel || 'HOME';
    els.frameBackHref.value = page.frame?.backHref || '/';
    els.frameTopSpacing.value = page.frame?.topSpacingPreset || 'inner';
    els.frameContactDrawer.checked = Boolean(page.frame?.contactDrawer);
    els.templateHelp.textContent = template?.description || '';
  }

  function renderSections(page) {
    const selected = activeSection(page);
    els.sectionList.innerHTML = page.sections.map(section => {
      const preset = sectionPresetMap.get(section.presetId);
      return `
        <button class="cms-section-row ${section.id === selected.id ? 'is-active' : ''}" type="button" data-section="${escapeAttr(section.id)}">
          <span>
            <span class="cms-section-title-line">${escapeHtml(section.title || preset?.label || section.id)}</span>
            <span class="cms-section-meta">${escapeHtml(section.presetId)} · ${escapeHtml(section.type)}</span>
          </span>
          <span class="cms-section-count">${section.items?.length || 0}</span>
        </button>
      `;
    }).join('');
    els.sectionList.querySelectorAll('[data-section]').forEach(button => {
      button.addEventListener('click', () => {
        activeSectionId = button.dataset.section;
        activeItemIndex = 0;
        render();
      });
    });
    renderSectionSettings(selected);
  }

  function renderSectionSettings(section) {
    if (!section) return;
    els.sectionId.value = section.id || '';
    els.sectionTitle.value = section.title || '';
    els.sectionPreset.value = section.presetId || 'gallery-roomy-3';
    els.sectionColumns.value = String(section.params?.columns || 3);
    els.sectionSpacing.value = section.params?.spacing || 'roomy';
    els.sectionImageFit.value = section.params?.imageFit || 'natural';
    els.sectionCaptionMode.value = section.params?.captionMode || 'html';
    els.sectionClickMode.value = section.params?.clickMode || 'lightbox';
    els.sectionGap.value = section.params?.sectionGap || 'none';
    els.sectionCaptions.checked = section.params?.showCaptions !== false;
    els.sectionWidth.value = section.params?.customWidthPercent || '';
  }

  function renderItems(page) {
    const section = activeSection(page);
    const items = section?.items || [];
    if (activeItemIndex >= items.length) activeItemIndex = Math.max(0, items.length - 1);
    els.itemList.innerHTML = items.length ? items.map((item, index) => `
      <button class="cms-item-row ${index === activeItemIndex ? 'is-active' : ''}" type="button" data-item="${index}">
        <img class="cms-item-thumb" src="${escapeAttr(item.src || '')}" alt="" />
        <span class="cms-item-info">
          <span class="cms-item-title">${escapeHtml(item.title || item.id || 'Untitled')}</span>
          <span class="cms-item-sub">${escapeHtml(item.desc || item.year || item.href || item.src || item.targetPageId || '')}</span>
        </span>
        <span class="cms-item-index">${index + 1}</span>
      </button>
    `).join('') : '<div class="cms-list-item">暂无条目</div>';

    els.itemList.querySelectorAll('[data-item]').forEach(button => {
      button.addEventListener('click', () => {
        activeItemIndex = Number(button.dataset.item);
        renderItems(activePage());
        renderTextEditor(activePage());
        renderPreview(activePage());
      });
    });

    renderItemEditor(items[activeItemIndex] || {});
  }

  function renderItemEditor(item) {
    els.itemId.value = item.id || '';
    els.itemTitle.value = item.title || '';
    els.itemDesc.value = item.desc || '';
    els.itemYear.value = item.year || '';
    els.itemSrc.value = item.src || '';
    els.itemHref.value = item.href || '';
    els.itemTargetPage.value = item.targetPageId || '';
    els.itemWidth.value = item.width || '';
    els.itemHeight.value = item.height || '';
    els.itemCaptionHtml.value = item.captionHtml || '';
    els.itemBodyHtml.value = item.bodyHtml || '';
    els.itemLinks.value = JSON.stringify(item.links || [], null, 2);
  }

  function renderTextEditor(page) {
    const section = activeSection(page);
    const item = section?.items?.[activeItemIndex] || section?.items?.find(entry => entry.bodyHtml) || {};
    els.richEditor.innerHTML = section?.bodyHtml || item.bodyHtml || page.bodyHtml || '';
  }

  function renderRaw() {
    els.rawJson.value = JSON.stringify(state, null, 2);
  }

  function renderValidation() {
    const issues = collectDraftIssues();
    els.validationList.innerHTML = issues.slice(0, 5).map(issue =>
      `<div class="cms-issue">${escapeHtml(issue.level)}: ${escapeHtml(issue.message)}</div>`
    ).join('');
  }

  function collectDraftIssues() {
    return collectCmsDraftIssues({
      state,
      seedIssues,
      pageTemplateMap,
      sectionPresetMap,
    });
  }

  function renderPreview(page) {
    els.preview.innerHTML = renderCmsPreview({
      page,
      nav: state.nav,
      site: state.site,
    });
  }

  function updatePageFromInputs() {
    const page = activePage();
    const oldTemplate = page.templateId;
    page.title = els.pageTitle.value;
    page.path = els.pagePath.value;
    page.category = els.pageCategory.value || '未分类';
    page.templateId = els.pageTemplate.value;
    page.navGroupId = els.pageNavGroup.value;
    page.sidebar = els.pageSidebar.checked && page.navGroupId !== 'hidden';
    if (oldTemplate !== page.templateId) {
      const template = pageTemplateMap.get(page.templateId);
      page.frame = clone(template.defaultFrame);
      if (!page.sections.length || confirm('是否按新模板添加默认分段？')) {
        page.sections.push(createSectionFromPreset(defaultSectionPreset(page.templateId)));
        activeSectionId = page.sections[page.sections.length - 1].id;
      }
    }
    page.frame = {
      ...(page.frame || {}),
      showBackLink: els.frameBack.checked,
      backLabel: els.frameBackLabel.value || 'HOME',
      backHref: els.frameBackHref.value || '/',
      topSpacingPreset: els.frameTopSpacing.value,
      contactDrawer: els.frameContactDrawer.checked,
    };
    saveDraft();
    render();
  }

  function saveSectionFromInputs() {
    const page = activePage();
    const section = activeSection(page);
    const previousId = section.id;
    const preset = sectionPresetMap.get(els.sectionPreset.value);
    section.id = slugify(els.sectionId.value, previousId || 'section');
    section.title = els.sectionTitle.value;
    section.presetId = preset.id;
    section.type = preset.type;
    section.params = {
      ...clone(preset.defaults || {}),
      columns: Number(els.sectionColumns.value) || preset.defaults.columns,
      spacing: els.sectionSpacing.value,
      imageFit: els.sectionImageFit.value,
      captionMode: els.sectionCaptionMode.value,
      clickMode: els.sectionClickMode.value,
      sectionGap: els.sectionGap.value,
      showCaptions: els.sectionCaptions.checked,
      customWidthPercent: Number(els.sectionWidth.value) || undefined,
      widthMode: els.sectionWidth.value ? 'custom' : preset.defaults.widthMode,
    };
    if (activeSectionId === previousId) activeSectionId = section.id;
    saveDraft();
    render();
  }

  function saveItemFromInputs() {
    const section = activeSection();
    const items = section.items || [];
    const item = {
      ...(items[activeItemIndex] || {}),
      id: els.itemId.value || slugify(els.itemTitle.value, 'item-' + (items.length + 1)),
      title: els.itemTitle.value,
      desc: els.itemDesc.value,
      year: els.itemYear.value,
      src: els.itemSrc.value,
      href: els.itemHref.value,
      targetPageId: els.itemTargetPage.value,
      width: Number(els.itemWidth.value) || undefined,
      height: Number(els.itemHeight.value) || undefined,
      captionHtml: els.itemCaptionHtml.value,
      bodyHtml: els.itemBodyHtml.value,
    };
    try {
      item.links = JSON.parse(els.itemLinks.value || '[]');
    } catch {
      item.links = [];
    }
    if (!items.length) {
      items.push(item);
      activeItemIndex = 0;
    } else {
      items[activeItemIndex] = item;
    }
    if (item.bodyHtml) section.bodyHtml = item.bodyHtml;
    saveDraft();
    render();
  }

  function addPage() {
    const title = prompt('页面标题', 'NEW PAGE') || 'NEW PAGE';
    const templateId = prompt(`模板 ID：\n${seed.presets.pageTemplates.map(item => item.id).join('\n')}`, 'gallery-page') || 'gallery-page';
    const template = pageTemplateMap.get(templateId) || pageTemplateMap.get('gallery-page');
    const id = uniqueId(title);
    const section = createSectionFromPreset(defaultSectionPreset(template.id));
    const page = {
      id,
      title,
      path: '/' + id,
      type: template.id,
      templateId: template.id,
      category: template.id === 'links' ? '链接' : '作品',
      sidebar: true,
      navGroupId: template.id === 'links' ? 'social' : 'main',
      activeNavPath: '/' + id,
      frame: clone(template.defaultFrame),
      sections: [section],
      layout: { columns: 3, imageRatio: 'natural', caption: 'html', width: 100, top: 5.5, dividerColor: 'rgba(127, 127, 127, 0.4)', dividerSize: 1 },
      items: section.items,
    };
    state.pages.push(page);
    activePageId = id;
    activeSectionId = section.id;
    activeItemIndex = 0;
    saveDraft();
    render();
  }

  function duplicatePage() {
    const source = activePage();
    const copy = clone(source);
    copy.id = uniqueId(source.id + '-copy');
    copy.title = source.title + ' COPY';
    copy.path = '/' + copy.id;
    state.pages.push(copy);
    activePageId = copy.id;
    activeSectionId = copy.sections[0]?.id || '';
    activeItemIndex = 0;
    saveDraft();
    render();
  }

  function deletePage() {
    if (state.pages.length <= 1) return;
    const page = activePage();
    if (!confirm(`删除页面 ${page.title || page.id}?`)) return;
    state.pages = state.pages.filter(item => item.id !== page.id);
    activePageId = state.pages[0].id;
    activeSectionId = state.pages[0].sections[0]?.id || '';
    activeItemIndex = 0;
    saveDraft();
    render();
  }

  function movePage(delta) {
    const index = state.pages.findIndex(page => page.id === activePageId);
    const next = index + delta;
    if (next < 0 || next >= state.pages.length) return;
    [state.pages[index], state.pages[next]] = [state.pages[next], state.pages[index]];
    saveDraft();
    render();
  }

  function addSection() {
    const presetId = prompt(`分段预设：\n${seed.presets.sectionPresets.map(item => item.id).join('\n')}`, 'gallery-roomy-3') || 'gallery-roomy-3';
    const section = createSectionFromPreset(sectionPresetMap.has(presetId) ? presetId : 'gallery-roomy-3');
    const page = activePage();
    page.sections.push(section);
    activeSectionId = section.id;
    activeItemIndex = 0;
    saveDraft();
    render();
  }

  function deleteSection() {
    const page = activePage();
    if (page.sections.length <= 1) return;
    const section = activeSection(page);
    if (!confirm(`删除分段 ${section.title || section.id}?`)) return;
    page.sections = page.sections.filter(item => item.id !== section.id);
    activeSectionId = page.sections[0]?.id || '';
    activeItemIndex = 0;
    saveDraft();
    render();
  }

  function moveSection(delta) {
    const page = activePage();
    const index = page.sections.findIndex(section => section.id === activeSectionId);
    const next = index + delta;
    if (next < 0 || next >= page.sections.length) return;
    [page.sections[index], page.sections[next]] = [page.sections[next], page.sections[index]];
    saveDraft();
    render();
  }

  function addItem() {
    const section = activeSection();
    const preset = sectionPresetMap.get(section.presetId);
    const next = section.items.length + 1;
    const item = defaultItemForPreset(preset) || { id: `item-${next}` };
    item.id = `item-${next}`;
    section.items.push(item);
    activeItemIndex = section.items.length - 1;
    saveDraft();
    render();
  }

  function deleteItem() {
    const section = activeSection();
    if (!section.items.length) return;
    section.items.splice(activeItemIndex, 1);
    activeItemIndex = Math.max(0, activeItemIndex - 1);
    saveDraft();
    render();
  }

  function moveItem(delta) {
    const items = activeSection().items;
    const next = activeItemIndex + delta;
    if (next < 0 || next >= items.length) return;
    [items[activeItemIndex], items[next]] = [items[next], items[activeItemIndex]];
    activeItemIndex = next;
    saveDraft();
    render();
  }

  function saveRichText() {
    const section = activeSection();
    const item = section.items[activeItemIndex] || section.items.find(entry => entry.bodyHtml) || section.items[0];
    if (item) item.bodyHtml = els.richEditor.innerHTML;
    section.bodyHtml = els.richEditor.innerHTML;
    saveDraft();
    render();
  }

  function exportPackage() {
    const issues = collectDraftIssues();
    const errors = issues.filter(issue => issue.level === 'error');
    if (errors.length && !confirm(`当前有 ${errors.length} 个错误，仍要导出吗？`)) return;
    const payload = createCmsPublishPackage({ state, issues });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'onovich-cms-publish.json';
    a.click();
    URL.revokeObjectURL(url);
    setStatus('发布包已导出');
  }

  function applyImported(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported.pages) || !imported.presets) throw new Error('invalid cms package');
        state = imported;
        activePageId = state.pages[0]?.id;
        activeSectionId = state.pages[0]?.sections?.[0]?.id || '';
        activeItemIndex = 0;
        saveDraft('导入完成');
        render();
      } catch {
        setStatus('导入失败');
      }
    };
    reader.readAsText(file);
  }

  function publishPreview() {
    const issues = collectDraftIssues();
    const errors = issues.filter(issue => issue.level === 'error');
    if (errors.length) {
      setStatus(`发布预览已阻止：${errors.length} 个错误`);
      return;
    }
    saveDraft();
    localStorage.setItem(PUBLISHED_KEY, JSON.stringify(state));
    setStatus(`已发布到本地预览，${issues.length} 个提醒`);
  }

  [
    els.pageTitle,
    els.pagePath,
    els.pageCategory,
    els.pageTemplate,
    els.pageNavGroup,
    els.pageSidebar,
    els.frameBack,
    els.frameBackLabel,
    els.frameBackHref,
    els.frameTopSpacing,
    els.frameContactDrawer,
  ].forEach(input => input.addEventListener('change', updatePageFromInputs));

  document.getElementById('saveDraftBtn').addEventListener('click', () => saveDraft());
  document.getElementById('publishBtn').addEventListener('click', publishPreview);
  document.getElementById('exportBtn').addEventListener('click', exportPackage);
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('重置 CMS 草稿?')) return;
    localStorage.removeItem(STORAGE_KEY);
    state = clone(seed);
    activePageId = state.pages[0].id;
    activeSectionId = state.pages[0].sections[0]?.id || '';
    activeItemIndex = 0;
    render();
    setStatus('已重置');
  });
  document.getElementById('importFile').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) applyImported(file);
    event.target.value = '';
  });
  document.getElementById('addCategoryBtn').addEventListener('click', () => {
    const name = prompt('类目名称');
    if (!name) return;
    state.categories = Array.from(new Set([...(state.categories || []), name.trim()]));
    saveDraft();
    render();
  });
  document.getElementById('addPageBtn').addEventListener('click', addPage);
  document.getElementById('duplicatePageBtn').addEventListener('click', duplicatePage);
  document.getElementById('deletePageBtn').addEventListener('click', deletePage);
  document.getElementById('movePageUpBtn').addEventListener('click', () => movePage(-1));
  document.getElementById('movePageDownBtn').addEventListener('click', () => movePage(1));
  document.getElementById('addSectionBtn').addEventListener('click', addSection);
  document.getElementById('deleteSectionBtn').addEventListener('click', deleteSection);
  document.getElementById('moveSectionUpBtn').addEventListener('click', () => moveSection(-1));
  document.getElementById('moveSectionDownBtn').addEventListener('click', () => moveSection(1));
  document.getElementById('saveSectionBtn').addEventListener('click', saveSectionFromInputs);
  document.getElementById('addItemBtn').addEventListener('click', addItem);
  document.getElementById('saveItemBtn').addEventListener('click', saveItemFromInputs);
  document.getElementById('deleteItemBtn').addEventListener('click', deleteItem);
  document.getElementById('moveItemUpBtn').addEventListener('click', () => moveItem(-1));
  document.getElementById('moveItemDownBtn').addEventListener('click', () => moveItem(1));
  document.getElementById('saveBodyBtn').addEventListener('click', saveRichText);
  document.getElementById('applyRawBtn').addEventListener('click', () => {
    try {
      const next = JSON.parse(els.rawJson.value);
      if (!Array.isArray(next.pages) || !next.presets) throw new Error('invalid cms package');
      state = next;
      activePageId = state.pages[0]?.id;
      activeSectionId = state.pages[0]?.sections?.[0]?.id || '';
      activeItemIndex = 0;
      saveDraft('JSON 已应用');
      render();
    } catch {
      setStatus('JSON 无效');
    }
  });
  document.getElementById('copyRawBtn').addEventListener('click', async () => {
    await navigator.clipboard.writeText(els.rawJson.value);
    setStatus('JSON 已复制');
  });
  document.querySelectorAll('.cms-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cms-tab').forEach(item => item.classList.toggle('is-active', item === tab));
      document.querySelectorAll('.cms-tab-panel').forEach(panel => panel.classList.toggle('is-active', panel.dataset.panel === tab.dataset.tab));
      if (tab.dataset.tab === 'raw') renderRaw();
    });
  });
  document.querySelectorAll('.cms-rich-toolbar [data-command]').forEach(button => {
    button.addEventListener('click', () => {
      document.execCommand(button.dataset.command, false);
      els.richEditor.focus();
    });
  });
  document.getElementById('makeLinkBtn').addEventListener('click', () => {
    const href = prompt('链接 URL');
    if (href) document.execCommand('createLink', false, href);
    els.richEditor.focus();
  });
  document.getElementById('clearFormatBtn').addEventListener('click', () => {
    document.execCommand('removeFormat', false);
    els.richEditor.focus();
  });

  render();
})();
