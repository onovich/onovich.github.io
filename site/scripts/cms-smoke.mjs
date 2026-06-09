import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
]);

if (!fs.existsSync(path.join(dist, 'cms', 'index.html'))) {
  console.error('CMS smoke requires a built dist. Run npm run build first.');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    let filePath = path.resolve(path.join(dist, pathname.replace(/^\//, '')));
    const distRoot = path.resolve(dist);
    if (!filePath.startsWith(distRoot)) throw new Error('bad path');
    if (!fs.existsSync(filePath)) {
      const asIndex = path.resolve(path.join(distRoot, pathname.replace(/^\//, ''), 'index.html'));
      if (fs.existsSync(asIndex)) filePath = asIndex;
    }
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

function listen() {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });
}

function closeServer() {
  return new Promise((resolve) => server.close(resolve));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const port = await listen();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];

page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(err.message));
page.on('dialog', (dialog) => dialog.accept('gallery-roomy-3'));

try {
  await page.goto(`http://127.0.0.1:${port}/cms/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.removeItem('onovich:cms:draft'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => ({
    title: document.title,
    pageButtons: document.querySelectorAll('#pageList .cms-list-item').length,
    sectionRows: document.querySelectorAll('#sectionList .cms-section-row').length,
    previewText: document.querySelector('#previewFrame')?.textContent?.slice(0, 80) || '',
    structurePanelActive: document.querySelector('[data-panel="sections"]')?.classList.contains('is-active') || false,
  }));

  await page.click('#addSectionBtn');
  await page.waitForTimeout(150);
  const afterAdd = await page.evaluate(() => ({
    sectionRows: document.querySelectorAll('#sectionList .cms-section-row').length,
    status: document.querySelector('#cmsStatus')?.textContent || '',
    draftSections: JSON.parse(localStorage.getItem('onovich:cms:draft') || 'null')?.pages?.[0]?.sections?.length ?? null,
  }));

  await page.click('[data-tab="raw"]');
  await page.waitForTimeout(100);
  const afterRaw = await page.evaluate(() => ({
    rawPanelActive: document.querySelector('[data-panel="raw"]')?.classList.contains('is-active') || false,
    rawHasSchema: document.querySelector('#rawJson')?.value?.includes('schemaVersion') || false,
  }));

  await page.click('[data-tab="text"]');
  await page.waitForTimeout(100);
  const afterPaste = await page.evaluate(() => {
    const editor = document.querySelector('#richEditor');
    editor.innerHTML = '';
    editor.focus();
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: {
        getData(type) {
          if (type === 'text/html') {
            return '<p onclick="alert(1)"><strong>Safe</strong><script>alert(1)</script><a href="javascript:alert(1)">Bad</a></p>';
          }
          if (type === 'text/plain') return 'Safe Bad';
          return '';
        },
      },
    });
    editor.dispatchEvent(event);
    return {
      html: editor.innerHTML,
      textPanelActive: document.querySelector('[data-panel="text"]')?.classList.contains('is-active') || false,
    };
  });

  assert(errors.length === 0, `Console/page errors: ${errors.join(' | ')}`);
  assert(before.title === 'Onovich CMS', 'Bad CMS title');
  assert(before.pageButtons >= 10, `Too few CMS pages: ${before.pageButtons}`);
  assert(before.structurePanelActive, 'Structure panel was not active initially');
  assert(before.previewText.includes('Onovich'), 'Preview did not render Onovich content');
  assert(afterAdd.sectionRows > before.sectionRows && afterAdd.draftSections > before.sectionRows, 'Add section did not update section state');
  assert(afterRaw.rawPanelActive && afterRaw.rawHasSchema, 'Raw JSON tab did not render state');
  assert(afterPaste.textPanelActive, 'Rich text tab did not activate');
  assert(afterPaste.html.includes('<strong>Safe</strong>'), 'Rich text paste did not preserve allowed formatting');
  assert(!afterPaste.html.includes('onclick') && !afterPaste.html.includes('script') && !afterPaste.html.includes('javascript:'), 'Rich text paste did not sanitize unsafe HTML');

  console.log(JSON.stringify({ before, afterAdd, afterRaw, afterPaste, errors }, null, 2));
} finally {
  await browser.close();
  await closeServer();
}
