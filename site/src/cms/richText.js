const RICH_TEXT_COMMANDS = new Set([
  'bold',
  'italic',
  'insertUnorderedList',
  'createLink',
  'removeFormat',
]);

export function isCmsRichTextCommand(command) {
  return RICH_TEXT_COMMANDS.has(command);
}

export function normalizeCmsRichTextHref(value) {
  const href = (value ?? '').toString().trim();
  if (!href) return '';
  if (/^(javascript|data):/i.test(href)) return '';
  return href;
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

  selectionStore?.restore?.();
  documentRef.execCommand(command, false, commandValue);
  editor?.focus?.();
  selectionStore?.capture?.();
  return true;
}

export function bindCmsRichTextToolbar({
  root,
  documentRef = root,
  editor,
  promptForHref,
}) {
  const selectionStore = createCmsRichTextSelectionStore({ documentRef, editor });

  ['keyup', 'mouseup', 'touchend'].forEach(eventName => {
    editor?.addEventListener?.(eventName, () => selectionStore.capture());
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
    runCmsRichTextCommand({
      command: 'createLink',
      documentRef,
      editor,
      selectionStore,
      value: promptForHref(),
    });
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
