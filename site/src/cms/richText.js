const RICH_TEXT_COMMANDS = new Set([
  'bold',
  'italic',
  'insertUnorderedList',
  'createLink',
  'removeFormat',
]);
const RICH_TEXT_ALLOWED_TAGS = new Set([
  'a',
  'b',
  'br',
  'em',
  'i',
  'li',
  'ol',
  'p',
  'strong',
  'u',
  'ul',
]);
const RICH_TEXT_BLOCKED_TAGS = [
  'base',
  'button',
  'embed',
  'form',
  'iframe',
  'input',
  'link',
  'math',
  'meta',
  'object',
  'script',
  'select',
  'style',
  'svg',
  'textarea',
];

export function isCmsRichTextCommand(command) {
  return RICH_TEXT_COMMANDS.has(command);
}

export function normalizeCmsRichTextHref(value) {
  const href = (value ?? '').toString().trim();
  if (!href) return '';
  if (/^(javascript|data):/i.test(href)) return '';
  return href;
}

export function isCmsRichTextAllowedTag(tagName) {
  return RICH_TEXT_ALLOWED_TAGS.has((tagName ?? '').toString().toLowerCase());
}

export function collectCmsRichTextHtmlIssues(value) {
  const html = (value ?? '').toString();
  if (!html) return [];
  const issues = [];
  const blockedTagPattern = new RegExp(`<\\s*\\/?\\s*(${RICH_TEXT_BLOCKED_TAGS.join('|')})\\b`, 'i');
  if (blockedTagPattern.test(html)) {
    issues.push('contains blocked tags');
  }
  if (/\son[a-z]+\s*=/i.test(html)) {
    issues.push('contains inline event handlers');
  }
  if (/\s(?:href|src)\s*=\s*(?:"|')?\s*(?:javascript|data):/i.test(html)) {
    issues.push('contains unsafe links');
  }
  return issues;
}

function escapeCmsRichText(value) {
  return (value ?? '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainTextToHtml(value) {
  return (value ?? '').toString().split(/\r?\n/).map(line => {
    const escaped = escapeCmsRichText(line);
    return `<p>${escaped || '<br>'}</p>`;
  }).join('');
}

function normalizeCmsRichTextPasteTag(tagName) {
  const tag = (tagName ?? '').toString().toLowerCase();
  if (['div', 'section', 'article'].includes(tag)) return 'p';
  return tag;
}

function sanitizeCmsRichTextNode(node, documentRef) {
  if (node.nodeType === Node.TEXT_NODE) {
    return documentRef.createTextNode(node.textContent || '');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return documentRef.createDocumentFragment();
  }

  const tag = normalizeCmsRichTextPasteTag(node.tagName);
  if (RICH_TEXT_BLOCKED_TAGS.includes(tag)) {
    return documentRef.createDocumentFragment();
  }
  const children = Array.from(node.childNodes || []).map(child => sanitizeCmsRichTextNode(child, documentRef));
  if (!isCmsRichTextAllowedTag(tag)) {
    const fragment = documentRef.createDocumentFragment();
    children.forEach(child => fragment.appendChild(child));
    return fragment;
  }

  const element = documentRef.createElement(tag);
  if (tag === 'a') {
    const href = normalizeCmsRichTextHref(node.getAttribute('href'));
    if (href) element.setAttribute('href', href);
  }
  children.forEach(child => element.appendChild(child));
  return element;
}

export function sanitizeCmsRichTextHtml(value, { documentRef = globalThis.document } = {}) {
  if (!documentRef?.createElement) return plainTextToHtml(value);
  const template = documentRef.createElement('template');
  template.innerHTML = (value ?? '').toString();
  const output = documentRef.createElement('template');
  Array.from(template.content.childNodes).forEach(node => {
    output.content.appendChild(sanitizeCmsRichTextNode(node, documentRef));
  });
  return output.innerHTML;
}

export function cmsRichTextSelectionBelongsToEditor({ editor, selection }) {
  if (!editor || !selection || selection.rangeCount < 1) return false;
  const anchors = [selection.anchorNode, selection.focusNode].filter(Boolean);
  if (!anchors.length) return false;
  return anchors.every(node => node === editor || editor.contains?.(node));
}

export function createCmsRichTextSelectionStore({ documentRef, editor } = {}) {
  let savedRange = null;

  function currentSelection() {
    return documentRef?.getSelection?.() || documentRef?.defaultView?.getSelection?.() || null;
  }

  return {
    capture() {
      const selection = currentSelection();
      if (!cmsRichTextSelectionBelongsToEditor({ editor, selection })) return false;
      savedRange = selection.getRangeAt(0).cloneRange();
      return true;
    },

    restore() {
      if (!savedRange) return false;
      const selection = currentSelection();
      if (!selection?.removeAllRanges || !selection?.addRange) return false;
      editor?.focus?.();
      selection.removeAllRanges();
      selection.addRange(savedRange);
      return true;
    },

    clear() {
      savedRange = null;
    },
  };
}

export function runCmsRichTextCommand({
  command,
  documentRef,
  editor,
  selectionStore,
  value = '',
}) {
  if (!isCmsRichTextCommand(command)) return false;

  const commandValue = command === 'createLink'
    ? normalizeCmsRichTextHref(value)
    : value;
  if (command === 'createLink' && !commandValue) {
    editor?.focus?.();
    return false;
  }

  if (!selectionStore?.restore?.()) editor?.focus?.();
  documentRef.execCommand(command, false, commandValue);
  editor?.focus?.();
  selectionStore?.capture?.();
  return true;
}

export function pasteCmsRichText({
  documentRef,
  editor,
  html = '',
  text = '',
  selectionStore,
}) {
  const payload = html ? sanitizeCmsRichTextHtml(html, { documentRef }) : plainTextToHtml(text);
  if (!payload) return false;
  if (!selectionStore?.restore?.()) editor?.focus?.();
  documentRef.execCommand('insertHTML', false, payload);
  editor?.focus?.();
  selectionStore?.capture?.();
  return true;
}

export function createCmsRichTextLinkPanel({
  root,
  documentRef,
  editor,
  selectionStore,
}) {
  const panel = root.getElementById('richLinkPanel');
  const input = root.getElementById('richLinkInput');
  const applyButton = root.getElementById('applyRichLinkBtn');
  const cancelButton = root.getElementById('cancelRichLinkBtn');

  function close({ focusEditor = true } = {}) {
    if (!panel) return false;
    panel.hidden = true;
    if (input) input.value = '';
    if (focusEditor) editor?.focus?.();
    return true;
  }

  function apply() {
    if (!input) return false;
    const applied = runCmsRichTextCommand({
      command: 'createLink',
      documentRef,
      editor,
      selectionStore,
      value: input.value,
    });
    if (!applied) {
      input.focus?.();
      return false;
    }
    close();
    return true;
  }

  function open() {
    if (!panel || !input) return false;
    panel.hidden = false;
    input.value = '';
    input.focus?.();
    return true;
  }

  applyButton?.addEventListener?.('click', apply);
  cancelButton?.addEventListener?.('click', () => close());
  input?.addEventListener?.('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      apply();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });

  return { apply, close, input, open, panel };
}

export function bindCmsRichTextToolbar({
  root,
  documentRef = root,
  editor,
}) {
  const selectionStore = createCmsRichTextSelectionStore({ documentRef, editor });
  const linkPanel = createCmsRichTextLinkPanel({
    root,
    documentRef,
    editor,
    selectionStore,
  });

  ['keyup', 'mouseup', 'touchend'].forEach(eventName => {
    editor?.addEventListener?.(eventName, () => selectionStore.capture());
  });
  editor?.addEventListener?.('paste', event => {
    const clipboard = event.clipboardData;
    if (!clipboard) return;
    const html = clipboard.getData('text/html');
    const text = clipboard.getData('text/plain');
    if (!html && !text) return;
    event.preventDefault();
    pasteCmsRichText({
      documentRef,
      editor,
      html,
      text,
      selectionStore,
    });
  });

  root.querySelectorAll('.cms-rich-toolbar [data-command]').forEach(button => {
    button.addEventListener('mousedown', event => {
      event.preventDefault();
      selectionStore.capture();
    });
    button.addEventListener('click', () => {
      runCmsRichTextCommand({
        command: button.dataset.command,
        documentRef,
        editor,
        selectionStore,
      });
    });
  });

  const makeLinkButton = root.getElementById('makeLinkBtn');
  makeLinkButton.addEventListener('mousedown', event => {
    event.preventDefault();
    selectionStore.capture();
  });
  makeLinkButton.addEventListener('click', () => {
    linkPanel.open();
  });

  const clearFormatButton = root.getElementById('clearFormatBtn');
  clearFormatButton.addEventListener('mousedown', event => {
    event.preventDefault();
    selectionStore.capture();
  });
  clearFormatButton.addEventListener('click', () => {
    runCmsRichTextCommand({
      command: 'removeFormat',
      documentRef,
      editor,
      selectionStore,
    });
  });
}
