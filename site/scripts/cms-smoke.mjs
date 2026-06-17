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
const dialogs = [];
const smokePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);

page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(err.message));
page.on('dialog', (dialog) => {
  dialogs.push(dialog.message());
  dialog.accept('gallery-roomy-3');
});

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

  await page.click('[data-tab="items"]');
  await page.click('#addItemBtn');
  await page.setInputFiles('#itemUploadInput', {
    name: 'Smoke Upload.png',
    mimeType: 'image/png',
    buffer: smokePng,
  });
  await page.waitForFunction(() => document.querySelector('#itemSrcInput')?.value === '/images/uploads/smoke-upload.png');
  const afterUpload = await page.evaluate(() => {
    const draft = JSON.parse(localStorage.getItem('onovich:cms:draft') || 'null');
    const asset = draft?.assets?.find(item => item.src === '/images/uploads/smoke-upload.png');
    const page = draft?.pages?.find(item => item.id === 'home');
    const uploadedItem = page?.sections?.flatMap(section => section.items || []).find(item => item.src === '/images/uploads/smoke-upload.png');
    return {
      src: document.querySelector('#itemSrcInput')?.value || '',
      width: document.querySelector('#itemWidthInput')?.value || '',
      height: document.querySelector('#itemHeightInput')?.value || '',
      asset,
      uploadedItem,
    };
  });
  const afterAssetLibrary = await page.evaluate(() => ({
    rows: document.querySelectorAll('#assetLibraryList .cms-asset-row').length,
    text: document.querySelector('#assetLibraryList')?.textContent || '',
    reuseButtons: document.querySelectorAll('#assetLibraryList [data-asset-src]').length,
  }));
  await page.click('#addItemBtn');
  await page.click('#assetLibraryList [data-asset-src="/images/uploads/smoke-upload.png"]');
  await page.waitForFunction(() => document.querySelector('#itemSrcInput')?.value === '/images/uploads/smoke-upload.png');
  const afterAssetReuse = await page.evaluate(() => {
    const draft = JSON.parse(localStorage.getItem('onovich:cms:draft') || 'null');
    const home = draft?.pages?.find(item => item.id === 'home');
    const reusedItems = home?.sections?.flatMap(section => section.items || []).filter(item => item.src === '/images/uploads/smoke-upload.png') || [];
    return {
      src: document.querySelector('#itemSrcInput')?.value || '',
      width: document.querySelector('#itemWidthInput')?.value || '',
      height: document.querySelector('#itemHeightInput')?.value || '',
      reusedCount: reusedItems.length,
      libraryText: document.querySelector('#assetLibraryList')?.textContent || '',
    };
  });

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

  await page.evaluate(() => {
    const editor = document.querySelector('#richEditor');
    editor.innerHTML = 'Make link';
    editor.focus();
    const textNode = editor.firstChild;
    const start = textNode.textContent.indexOf('link');
    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, start + 4);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.click('#makeLinkBtn');
  await page.fill('#richLinkInput', ' https://example.com/smoke ');
  await page.click('#applyRichLinkBtn');
  const afterLink = await page.evaluate(() => ({
    html: document.querySelector('#richEditor')?.innerHTML || '',
    panelHidden: document.querySelector('#richLinkPanel')?.hidden ?? null,
  }));

  await page.evaluate(() => {
    const seed = JSON.parse(document.querySelector('#cms-seed').textContent);
    seed.pages[0].path = 'missing-leading-slash';
    localStorage.setItem('onovich:cms:draft', JSON.stringify(seed));
  });
  await page.reload({ waitUntil: 'load' });
  await page.click('#exportBtn');
  await page.waitForSelector('#publishReviewPanel:not([hidden])');
  const afterErrorReview = await page.evaluate(() => ({
    panelOpen: !document.querySelector('#publishReviewPanel')?.hidden,
    downloadDisabled: document.querySelector('#publishReviewDownloadBtn')?.disabled ?? null,
    text: document.querySelector('#publishReviewPanel')?.textContent || '',
  }));
  await page.click('#publishReviewCancelBtn');

  await page.evaluate(() => {
    const seed = JSON.parse(document.querySelector('#cms-seed').textContent);
    const pageWithItem = seed.pages.find(page => (page.sections || []).some(section => (section.items || []).length));
    const sectionWithItem = pageWithItem.sections.find(section => (section.items || []).length);
    const item = sectionWithItem.items[0];
    item.src = 'https://example.com/warning.png';
    item.width = 100;
    item.height = 100;
    localStorage.setItem('onovich:cms:draft', JSON.stringify(seed));
  });
  await page.reload({ waitUntil: 'load' });
  await page.click('#exportBtn');
  await page.waitForSelector('#publishReviewPanel:not([hidden])');
  const afterWarningBeforeAck = await page.evaluate(() => ({
    panelOpen: !document.querySelector('#publishReviewPanel')?.hidden,
    acknowledgeHidden: document.querySelector('#publishReviewAcknowledgeWrap')?.hidden ?? null,
    downloadDisabled: document.querySelector('#publishReviewDownloadBtn')?.disabled ?? null,
    text: document.querySelector('#publishReviewPanel')?.textContent || '',
  }));
  await page.check('#publishReviewAcknowledge');
  const afterWarningReview = await page.evaluate(() => ({
    downloadDisabled: document.querySelector('#publishReviewDownloadBtn')?.disabled ?? null,
    acknowledged: document.querySelector('#publishReviewAcknowledge')?.checked ?? null,
  }));

  assert(errors.length === 0, `Console/page errors: ${errors.join(' | ')}`);
  assert(!dialogs.includes('链接 URL'), 'Rich text links must use the inline panel instead of browser prompt');
  assert(!dialogs.some(message => message.includes('仍要导出')), 'Publish export must not use a browser confirm for review');
  assert(before.title === 'Onovich CMS', 'Bad CMS title');
  assert(before.pageButtons >= 10, `Too few CMS pages: ${before.pageButtons}`);
  assert(before.structurePanelActive, 'Structure panel was not active initially');
  assert(before.previewText.includes('Onovich'), 'Preview did not render Onovich content');
  assert(afterAdd.sectionRows > before.sectionRows && afterAdd.draftSections > before.sectionRows, 'Add section did not update section state');
  assert(afterUpload.src === '/images/uploads/smoke-upload.png', 'Upload UI did not write the generated image path');
  assert(afterUpload.width === '1' && afterUpload.height === '1', 'Upload UI did not read image dimensions');
  assert(afterUpload.asset?.mimeType === 'image/png' && afterUpload.asset?.dataUrl?.startsWith('data:image/png;base64,'), 'Upload UI did not store upload asset metadata');
  assert(afterUpload.uploadedItem?.src === afterUpload.src, 'Upload UI did not attach the uploaded image to the active item');
  assert(afterAssetLibrary.rows === 1 && afterAssetLibrary.reuseButtons === 1, 'Asset library did not list uploaded assets');
  assert(afterAssetLibrary.text.includes('images/uploads/smoke-upload.png'), 'Asset library did not show the upload target path');
  assert(afterAssetReuse.src === '/images/uploads/smoke-upload.png', 'Asset library did not reuse the uploaded asset for the active item');
  assert(afterAssetReuse.width === '1' && afterAssetReuse.height === '1', 'Asset library reuse did not copy dimensions');
  assert(afterAssetReuse.reusedCount >= 2 && afterAssetReuse.libraryText.includes('使用 2 次'), 'Asset library did not update used-by counts after reuse');
  assert(afterRaw.rawPanelActive && afterRaw.rawHasSchema, 'Raw JSON tab did not render state');
  assert(afterPaste.textPanelActive, 'Rich text tab did not activate');
  assert(afterPaste.html.includes('<strong>Safe</strong>'), 'Rich text paste did not preserve allowed formatting');
  assert(!afterPaste.html.includes('onclick') && !afterPaste.html.includes('script') && !afterPaste.html.includes('javascript:'), 'Rich text paste did not sanitize unsafe HTML');
  assert(afterLink.html.includes('<a href="https://example.com/smoke">link</a>'), 'Rich text link panel did not apply the selected link');
  assert(afterLink.panelHidden, 'Rich text link panel did not close after applying a link');
  assert(afterErrorReview.panelOpen, 'Publish review panel did not open for blocking errors');
  assert(afterErrorReview.downloadDisabled, 'Publish review must disable download when errors exist');
  assert(afterErrorReview.text.includes('错误'), 'Publish review must show blocking error state');
  assert(afterWarningBeforeAck.panelOpen, 'Publish review panel did not open for warnings');
  assert(afterWarningBeforeAck.acknowledgeHidden === false, 'Publish review must show warning acknowledgement');
  assert(afterWarningBeforeAck.downloadDisabled, 'Publish review must require warning acknowledgement');
  assert(afterWarningBeforeAck.text.includes('警告'), 'Publish review must show warning state');
  assert(afterWarningReview.acknowledged && !afterWarningReview.downloadDisabled, 'Warning acknowledgement must enable publish package download');

  console.log(JSON.stringify({ before, afterAdd, afterUpload, afterAssetLibrary, afterAssetReuse, afterRaw, afterPaste, afterLink, afterErrorReview, afterWarningBeforeAck, afterWarningReview, dialogs, errors }, null, 2));
} finally {
  await browser.close();
  await closeServer();
}
