import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyTextOverrides,
  normalizeEditorChanges,
  sanitizeRichText,
} from './local-editor-core.mjs';

test('applies saved text overrides without mutating the base content', () => {
  const base = {
    en: {
      title: 'Welcome',
      lines: ['One', 'Two'],
    },
    count: 2,
  };

  const result = applyTextOverrides(base, 'copy', {
    'copy.en.title': 'Hello',
    'copy.en.lines.1': 'Changed',
    'copy.missing': 'Ignored',
  });

  assert.deepEqual(result, {
    en: {
      title: 'Hello',
      lines: ['One', 'Changed'],
    },
    count: 2,
  });
  assert.deepEqual(base, {
    en: {
      title: 'Welcome',
      lines: ['One', 'Two'],
    },
    count: 2,
  });
});

test('accepts only supported local editor changes', () => {
  const result = normalizeEditorChanges({
    changes: {
      'copy.en.home.title': 'Updated title',
      'projects.ninja.name': 'Ninja Ming',
      'poem.html': '<small>Line one</small><br>Line two',
    },
  });

  assert.deepEqual(result, {
    'copy.en.home.title': 'Updated title',
    'projects.ninja.name': 'Ninja Ming',
    'poem.html': '<small>Line one</small><br>Line two',
  });

  assert.throws(
    () => normalizeEditorChanges({ changes: { '../package.json': 'nope' } }),
    /unsupported content key/i,
  );
  assert.throws(
    () => normalizeEditorChanges({ changes: { 'copy.en.home.title': 42 } }),
    /strings/i,
  );
});

test('keeps only the safe rich-text subset for poems', () => {
  const result = sanitizeRichText('<script>alert(1)</script><small onclick="alert(2)">A</small><img src=x><br><em>B</em>');

  assert.equal(result, '<small>A</small><br><em>B</em>');
});
