/* Onovich Admin — Renderer Logic */
'use strict';

// ── Section field schemas ──────────────────────────────────────────────────
const SCHEMAS = {
  codes: [
    { key: 'id',    label: 'ID',    type: 'text' },
    { key: 'title', label: '标题',  type: 'text' },
    { key: 'desc',  label: '描述',  type: 'text' },
    { key: 'src',   label: '图片路径', type: 'text' },
    { key: 'width', label: '宽', type: 'number' },
    { key: 'height',label: '高', type: 'number' },
    { key: '_links',label: '链接（JSON）', type: 'textarea', serialize: true },
  ],
  games: [
    { key: 'id',    label: 'ID',    type: 'text' },
    { key: 'title', label: '标题',  type: 'text' },
    { key: 'desc',  label: '描述',  type: 'text' },
    { key: 'src',   label: '图片路径', type: 'text' },
    { key: 'width', label: '宽', type: 'number' },
    { key: 'height',label: '高', type: 'number' },
    { key: '_links',label: '链接（JSON）', type: 'textarea', serialize: true },
  ],
  pixel: [
    { key: 'id',    label: 'ID',    type: 'text' },
    { key: 'title', label: '标题',  type: 'text' },
    { key: 'year',  label: '年份',  type: 'text' },
    { key: 'src',   label: '图片路径', type: 'text' },
    { key: 'width', label: '宽', type: 'number' },
    { key: 'height',label: '高', type: 'number' },
  ],
  illustrations: [
    { key: 'id',    label: 'ID',    type: 'text' },
    { key: 'title', label: '标题',  type: 'text' },
    { key: 'year',  label: '年份',  type: 'text' },
    { key: 'src',   label: '图片路径', type: 'text' },
    { key: 'width', label: '宽', type: 'number' },
    { key: 'height',label: '高', type: 'number' },
  ],
  gifs: [
    { key: 'id',    label: 'ID',    type: 'text' },
    { key: 'title', label: '标题',  type: 'text' },
    { key: 'year',  label: '年份',  type: 'text' },
    { key: 'src',   label: '图片路径', type: 'text' },
    { key: 'width', label: '宽', type: 'number' },
    { key: 'height',label: '高', type: 'number' },
  ],
  graphics: [
    { key: 'id',    label: 'ID',    type: 'text' },
    { key: 'title', label: '标题',  type: 'text' },
    { key: 'year',  label: '年份',  type: 'text' },
    { key: 'src',   label: '图片路径', type: 'text' },
    { key: 'width', label: '宽', type: 'number' },
    { key: 'height',label: '高', type: 'number' },
  ],
  photos: [
    { key: 'id',    label: 'ID',    type: 'text' },
    { key: 'title', label: '标题',  type: 'text' },
    { key: 'year',  label: '年份',  type: 'text' },
    { key: 'src',   label: '图片路径', type: 'text' },
    { key: 'width', label: '宽', type: 'number' },
    { key: 'height',label: '高', type: 'number' },
  ],
  poems: [
    { key: 'id',    label: 'ID',    type: 'text' },
    { key: 'title', label: '标题',  type: 'text' },
    { key: 'year',  label: '年份',  type: 'text' },
    { key: 'body',  label: '正文',  type: 'textarea' },
  ],
  sns: [
    { key: 'label', label: '平台名称', type: 'text' },
    { key: 'url',   label: '链接',    type: 'text' },
  ],
};

// ── State ──────────────────────────────────────────────────────────────────
let currentSection = null;
let currentData = [];
let editingIndex = -1;

// ── DOM refs ───────────────────────────────────────────────────────────────
const sectionNav   = document.getElementById('sectionNav');
const editorTitle  = document.getElementById('editorTitle');
const itemList     = document.getElementById('itemList');
const itemEditor   = document.getElementById('itemEditor');
const itemForm     = document.getElementById('itemForm');
const btnAddItem   = document.getElementById('btnAddItem');
const btnImportImg = document.getElementById('btnImportImg');
const btnSaveItem  = document.getElementById('btnSaveItem');
const btnCancelItem= document.getElementById('btnCancelItem');
const btnDeleteItem= document.getElementById('btnDeleteItem');
const btnPreview   = document.getElementById('btnPreview');
const btnPublish   = document.getElementById('btnPublish');
const commitMsg    = document.getElementById('commitMsg');
const publishStatus= document.getElementById('publishStatus');

// ── Init ───────────────────────────────────────────────────────────────────
(async () => {
  const sections = await window.api.listSections();
  sections.forEach(section => {
    const el = document.createElement('div');
    el.className = 'nav-item';
    el.textContent = section.toUpperCase();
    el.dataset.section = section;
    el.addEventListener('click', () => loadSection(section));
    sectionNav.appendChild(el);
  });
})();

// ── Section loading ────────────────────────────────────────────────────────
async function loadSection(section) {
  currentSection = section;
  currentData = await window.api.readSection(section);

  // Update nav highlight
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === section);
  });

  editorTitle.textContent = section.toUpperCase();
  btnAddItem.disabled = false;
  btnImportImg.disabled = false;

  renderList();
}

function renderList() {
  itemList.innerHTML = '';
  if (!currentData.length) {
    itemList.innerHTML = '<p style="color:#aaa; font-size:0.8rem;">暂无条目，点击「+ 新增条目」开始添加。</p>';
    return;
  }

  currentData.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <img class="item-row__thumb"
           src="${item.src || ''}"
           alt="${item.title || ''}"
           onerror="this.style.background='#ddd'" />
      <div class="item-row__info">
        <div class="item-row__title">${item.title || item.label || item.id || '（无标题）'}</div>
        <div class="item-row__sub">${item.desc || item.year || item.url || ''}</div>
      </div>
      <span class="item-row__drag">⠿</span>
    `;
    row.addEventListener('click', () => openEditor(idx));
    itemList.appendChild(row);
  });
}

// ── Editor ─────────────────────────────────────────────────────────────────
function openEditor(idx) {
  editingIndex = idx;
  const item = idx === -1 ? {} : currentData[idx];
  const schema = SCHEMAS[currentSection] || [];

  itemForm.innerHTML = '';
  schema.forEach(field => {
    const div = document.createElement('div');
    div.className = 'field';

    let rawValue = field.serialize
      ? JSON.stringify(item[field.key.replace('_', '')] || [], null, 2)
      : (item[field.key] ?? '');

    if (field.type === 'textarea') {
      div.innerHTML = `
        <label>${field.label}</label>
        <textarea data-key="${field.key}">${rawValue}</textarea>
      `;
    } else {
      div.innerHTML = `
        <label>${field.label}</label>
        <input type="${field.type}" data-key="${field.key}" value="${rawValue}" />
      `;
    }
    itemForm.appendChild(div);
  });

  btnDeleteItem.style.display = idx === -1 ? 'none' : '';
  itemEditor.classList.remove('hidden');
}

function closeEditor() {
  itemEditor.classList.add('hidden');
  editingIndex = -1;
}

function collectFormData() {
  const schema = SCHEMAS[currentSection] || [];
  const obj = {};
  schema.forEach(field => {
    const el = itemForm.querySelector(`[data-key="${field.key}"]`);
    if (!el) return;
    const realKey = field.key.startsWith('_') ? field.key.slice(1) : field.key;
    if (field.type === 'number') {
      obj[realKey] = Number(el.value) || 0;
    } else if (field.serialize) {
      try { obj[realKey] = JSON.parse(el.value); } catch { obj[realKey] = []; }
    } else {
      obj[realKey] = el.value;
    }
  });
  return obj;
}

// ── Buttons ────────────────────────────────────────────────────────────────
btnAddItem.addEventListener('click', () => openEditor(-1));

btnImportImg.addEventListener('click', async () => {
  const paths = await window.api.importImages(currentSection);
  if (paths.length) {
    alert('已导入图片：\n' + paths.join('\n'));
  }
});

btnSaveItem.addEventListener('click', async () => {
  const data = collectFormData();
  if (editingIndex === -1) {
    currentData.push(data);
  } else {
    currentData[editingIndex] = data;
  }
  await window.api.writeSection(currentSection, currentData);
  closeEditor();
  renderList();
});

btnCancelItem.addEventListener('click', closeEditor);

btnDeleteItem.addEventListener('click', async () => {
  if (!confirm('确认删除该条目？')) return;
  currentData.splice(editingIndex, 1);
  await window.api.writeSection(currentSection, currentData);
  closeEditor();
  renderList();
});

btnPreview.addEventListener('click', async () => {
  await window.api.startPreview();
});

btnPublish.addEventListener('click', async () => {
  btnPublish.disabled = true;
  publishStatus.textContent = '发布中…';
  try {
    const msg = commitMsg.value.trim() || `Update site ${new Date().toLocaleDateString()}`;
    const result = await window.api.publish(msg);
    publishStatus.textContent = result;
  } catch (err) {
    publishStatus.textContent = '发布失败：' + err.message;
  } finally {
    btnPublish.disabled = false;
  }
});
