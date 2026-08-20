import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = join(scriptDirectory, '..', 'public', 'images', 'social');
const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8130').replace(/\/$/, '');

const previews = [
  { path: '/', file: 'onovich-en.png' },
  { path: '/zh/', file: 'onovich-zh.png' },
];

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 640 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });

  for (const preview of previews) {
    const page = await context.newPage();
    await page.goto(`${baseUrl}${preview.path}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content: `
        html { scrollbar-width: none; }
        html::-webkit-scrollbar { display: none; }
        *, *::before, *::after { animation: none !important; transition: none !important; }
      `,
    });
    await page.screenshot({
      path: join(outputDirectory, preview.file),
      animations: 'disabled',
      fullPage: false,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`Created ${previews.length} social previews in ${outputDirectory}`);
