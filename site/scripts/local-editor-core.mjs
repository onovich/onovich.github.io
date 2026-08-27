const MAX_CHANGE_COUNT = 300;
const MAX_VALUE_LENGTH = 80_000;
const MAX_TOTAL_LENGTH = 160_000;
const SAFE_KEY = /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/;
const SUPPORTED_PREFIXES = [
  'copy.',
  'projects.',
  'artCategories.',
  'art.',
  'photoAlbums.',
  'site.',
  'system.',
];
const SAFE_RICH_TEXT_TAGS = new Set(['br', 'small', 'em', 'strong', 'b', 'i', 'p', 'div', 'span']);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function isSupportedEditorKey(key) {
  if (key === 'poem.html') return true;
  if (!SAFE_KEY.test(key)) return false;
  if (key.split('.').some(segment => segment === '__proto__' || segment === 'prototype' || segment === 'constructor')) {
    return false;
  }

  return SUPPORTED_PREFIXES.some(prefix => key.startsWith(prefix));
}

export function sanitizeRichText(value) {
  const withoutComments = value.replace(/<!--[\s\S]*?-->/g, '');
  const withoutBlockedElements = withoutComments.replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1\s*>/gi, '');

  return withoutBlockedElements.replace(/<\/?([A-Za-z0-9]+)(?:\s[^<>]*)?\s*\/?\s*>/g, (tag, rawName) => {
    const name = rawName.toLowerCase();
    if (!SAFE_RICH_TEXT_TAGS.has(name)) return '';
    if (tag.startsWith('</')) return `</${name}>`;
    return name === 'br' ? '<br>' : `<${name}>`;
  });
}

export function normalizeEditorChanges(payload) {
  if (!isRecord(payload) || !isRecord(payload.changes)) {
    throw new TypeError('Editor save payload must include a changes object.');
  }

  const entries = Object.entries(payload.changes);
  if (entries.length === 0) throw new TypeError('Editor save payload must include at least one change.');
  if (entries.length > MAX_CHANGE_COUNT) throw new RangeError('Too many editor changes in one save.');

  let totalLength = 0;
  const normalized = {};

  for (const [key, rawValue] of entries) {
    if (!isSupportedEditorKey(key)) throw new TypeError(`Unsupported content key: ${key}`);
    if (typeof rawValue !== 'string') throw new TypeError('Editor values must be strings.');
    if (rawValue.length > MAX_VALUE_LENGTH) throw new RangeError(`Editor value is too large: ${key}`);

    totalLength += rawValue.length;
    if (totalLength > MAX_TOTAL_LENGTH) throw new RangeError('Editor save payload is too large.');

    normalized[key] = key === 'poem.html' ? sanitizeRichText(rawValue) : rawValue.replace(/\r\n?/g, '\n');
  }

  return normalized;
}

export function mergeEditorOverrides(existing, changes) {
  const existingValues = isRecord(existing) && isRecord(existing.values) ? existing.values : {};
  const values = {};

  for (const [key, value] of Object.entries(existingValues)) {
    if (isSupportedEditorKey(key) && typeof value === 'string') values[key] = value;
  }

  return {
    version: 1,
    values: {
      ...values,
      ...changes,
    },
  };
}

export function applyTextOverrides(value, key, values) {
  if (typeof value === 'string') {
    return hasOwn(values, key) ? values[key] : value;
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) => applyTextOverrides(entry, `${key}.${index}`, values));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        applyTextOverrides(entryValue, `${key}.${entryKey}`, values),
      ]),
    );
  }

  return value;
}
