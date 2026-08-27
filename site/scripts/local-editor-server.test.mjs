import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { saveEditorChanges } from './local-editor-server.mjs';

test('writes approved local editor changes into the override document', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'onovich-local-editor-'));
  const overridesPath = join(directory, 'editor-overrides.json');

  try {
    await writeFile(overridesPath, JSON.stringify({
      version: 1,
      values: { 'copy.en.home.title': 'Previous title' },
    }), 'utf8');

    const result = await saveEditorChanges(overridesPath, {
      changes: {
        'copy.en.home.title': 'Updated title',
        'poem.html': '<small onclick="ignored()">A</small><script>bad()</script>',
      },
    });

    assert.deepEqual(result.changedKeys, ['copy.en.home.title', 'poem.html']);
    assert.equal(result.overrideCount, 2);
    assert.deepEqual(JSON.parse(await readFile(overridesPath, 'utf8')), {
      version: 1,
      values: {
        'copy.en.home.title': 'Updated title',
        'poem.html': '<small>A</small>',
      },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
