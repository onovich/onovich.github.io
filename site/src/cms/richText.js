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

export function runCmsRichTextCommand({
  command,
  documentRef,
  editor,
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

  documentRef.execCommand(command, false, commandValue);
  editor?.focus?.();
  return true;
}

export function bindCmsRichTextToolbar({
  root,
  documentRef = root,
  editor,
  promptForHref,
}) {
  root.querySelectorAll('.cms-rich-toolbar [data-command]').forEach(button => {
    button.addEventListener('click', () => {
      runCmsRichTextCommand({
        command: button.dataset.command,
        documentRef,
        editor,
      });
    });
  });

  root.getElementById('makeLinkBtn').addEventListener('click', () => {
    runCmsRichTextCommand({
      command: 'createLink',
      documentRef,
      editor,
      value: promptForHref(),
    });
  });

  root.getElementById('clearFormatBtn').addEventListener('click', () => {
    runCmsRichTextCommand({
      command: 'removeFormat',
      documentRef,
      editor,
    });
  });
}
