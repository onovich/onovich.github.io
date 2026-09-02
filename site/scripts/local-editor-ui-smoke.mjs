import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const baseUrl = process.env.LOCAL_EDITOR_URL ?? 'http://127.0.0.1:4321';
const overridesPath = fileURLToPath(new URL('../src/content/editor-overrides.json', import.meta.url));
const originalOverrides = await readFile(overridesPath, 'utf8');
const browser = await chromium.launch({ headless: true });

async function waitForSavedValue(key, value) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const saved = JSON.parse(await readFile(overridesPath, 'utf8'));
      if (saved.values?.[key] === value) return saved;
    } catch {
      // A local write may be visible between file replacement steps; retry it.
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${key} to be saved.`);
}

try {
  const page = await browser.newPage();
  page.setDefaultTimeout(5_000);
  await page.goto(new URL('/games-and-tools/', baseUrl).toString(), { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: 'Edit this page' }).click();
  const title = page.locator('[data-editor-key="copy.en.work.title"]').first();
  await title.waitFor();
  await page.waitForFunction(() => document.querySelector('[data-editor-key="copy.en.work.title"]')?.getAttribute('contenteditable') === 'true');

  await page.getByRole('button', { name: 'Exit editing' }).click();
  await page.waitForFunction(() => document.querySelector('[data-editor-key="copy.en.work.title"]')?.getAttribute('contenteditable') !== 'true');
  assert.equal(await page.getByRole('button', { name: 'Edit this page' }).count(), 1);

  await page.getByRole('button', { name: 'Edit this page' }).click();
  await page.waitForFunction(() => document.querySelector('[data-editor-key="copy.en.work.title"]')?.getAttribute('contenteditable') === 'true');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('[data-editor-key="copy.en.work.title"]')?.getAttribute('contenteditable') !== 'true');
  assert.equal(await page.getByRole('button', { name: 'Edit this page' }).count(), 1);

  await page.getByRole('button', { name: 'Edit this page' }).click();
  await page.waitForFunction(() => document.querySelector('[data-editor-key="copy.en.work.title"]')?.getAttribute('contenteditable') === 'true');

  await title.evaluate((element) => {
    element.textContent = 'Discarded local draft';
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  });
  const exitDialog = page.waitForEvent('dialog');
  const exitClick = page.getByRole('button', { name: 'Exit editing' }).click();
  const dialog = await exitDialog;
  assert.equal(dialog.message(), 'You have unsaved changes. Exit and discard them?');
  await dialog.accept();
  await exitClick;
  await page.waitForFunction(() => document.querySelector('[data-editor-key="copy.en.work.title"]')?.getAttribute('contenteditable') !== 'true');
  assert.equal(await title.textContent(), 'Games & Tools');

  await page.getByRole('button', { name: 'Edit this page' }).click();
  await page.waitForFunction(() => document.querySelector('[data-editor-key="copy.en.work.title"]')?.getAttribute('contenteditable') === 'true');
  await title.evaluate((element) => {
    element.textContent = 'Local editor smoke title';
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  });

  const saveButton = page.getByRole('button', { name: 'Save locally' });
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-editor-save]');
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  await saveButton.click({ noWaitAfter: true });

  await waitForSavedValue('copy.en.work.title', 'Local editor smoke title');
  await page.waitForFunction(
    () => document.querySelector('[data-editor-toggle-label]')?.textContent === 'Edit this page'
      && document.querySelector('[data-editor-key="copy.en.work.title"]')?.getAttribute('contenteditable') !== 'true'
      && document.querySelector('[data-editor-key="copy.en.work.title"]')?.textContent === 'Local editor smoke title',
  );
} finally {
  await writeFile(overridesPath, originalOverrides, 'utf8');
  await browser.close();
}
