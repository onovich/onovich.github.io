import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let sharp;
try {
  sharp = require('sharp');
} catch {
  throw new Error(
    'Sharp is required to generate brand assets. Use the configured Codex workspace Node runtime with NODE_PATH set to its node_modules directory.',
  );
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const siteDirectory = resolve(scriptDirectory, '..');
const publicDirectory = join(siteDirectory, 'public');
const socialDirectory = join(publicDirectory, 'images', 'social');
const avatarPath = join(publicDirectory, 'images', 'profile', 'avatar.jpg');
const ninjaMingPath = join(publicDirectory, 'images', 'games', 'ninja-ming-cover.png');
const golfPath = join(publicDirectory, 'images', 'covers', '2dprogolf.png');

function escapeXml(value) {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&apos;',
    '"': '&quot;',
  })[character]);
}

function pngDataUri(buffer) {
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

function jpegDataUri(buffer) {
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

function socialPreviewSvg({ language, avatar, ninjaMing, golf }) {
  const copy = language === 'zh-CN'
    ? {
        title: 'Onovich 的游戏、系统、工具与艺术创作',
        description: 'Onovich 的个人作品集：游戏、游戏系统、开发工具与艺术创作。',
        wordmark: 'Onovich',
        eyebrow: '个人作品集',
        titleLines: ['游戏、系统、工具', '与艺术创作。'],
        bodyLines: ['奥诺维奇的个人作品集：', '游戏、游戏系统、开发工具与艺术创作。'],
        categories: ['游戏与工具', '系统与编辑器', '艺术创作'],
        categoryLabel: '作品方向',
        font: 'Microsoft YaHei, Noto Sans CJK SC, Arial, sans-serif',
        titleSize: 53,
        bodySize: 20,
      }
    : {
        title: 'Onovich — Games, Systems, Tools & Art',
        description: 'Onovich’s personal portfolio of games, game systems, development tools, and art.',
        wordmark: 'Onovich',
        eyebrow: 'Personal portfolio',
        titleLines: ['Games, systems,', 'tools & art.'],
        bodyLines: ['A personal portfolio of games, game systems,', 'development tools, and art by Onovich.'],
        categories: ['Playable projects', 'Systems & editors', 'Art & notes'],
        categoryLabel: 'Areas of work',
        font: 'Nunito, Arial, sans-serif',
        titleSize: 58,
        bodySize: 20,
      };

  const categoryRows = copy.categories.map((label, index) => {
    const y = 458 + index * 31;
    return `
      <line x1="250" y1="${y - 16}" x2="498" y2="${y - 16}" stroke="#dedfd9" stroke-width="1" />
      <text x="250" y="${y}" class="category">${escapeXml(label)}</text>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1280" height="640" viewBox="0 0 1280 640" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(copy.title)}</title>
  <desc id="desc">${escapeXml(copy.description)}</desc>
  <defs>
    <clipPath id="golf-card"><rect x="612" y="72" width="596" height="298" /></clipPath>
    <clipPath id="ninja-card"><rect x="770" y="352" width="432" height="240" /></clipPath>
  </defs>
  <rect width="1280" height="640" fill="#ffffff" />

  <g font-family="${copy.font}">
    <line x1="72" y1="99" x2="110" y2="99" stroke="#759d18" stroke-width="2" />
    <text x="120" y="106" fill="#181a17" font-size="32" font-weight="400" letter-spacing="1.2">${escapeXml(copy.wordmark)}</text>
    <text x="72" y="146" fill="#70736a" font-size="13" font-weight="400" letter-spacing="2.2">${escapeXml(copy.eyebrow).toUpperCase()}</text>

    <text x="72" y="225" fill="#181a17" font-size="${copy.titleSize}" font-weight="300" letter-spacing="-1.5">
      <tspan x="72" dy="0">${escapeXml(copy.titleLines[0])}</tspan>
      <tspan x="72" dy="64">${escapeXml(copy.titleLines[1])}</tspan>
    </text>

    <line x1="72" y1="334" x2="528" y2="334" stroke="#dedfd9" stroke-width="1" />
    <text x="72" y="369" fill="#363832" font-size="${copy.bodySize}" font-weight="300">
      <tspan x="72" dy="0">${escapeXml(copy.bodyLines[0])}</tspan>
      <tspan x="72" dy="29">${escapeXml(copy.bodyLines[1])}</tspan>
    </text>

    <rect x="72" y="430" width="132" height="132" fill="#181a17" stroke="#dedfd9" stroke-width="1" />
    <image x="72" y="430" width="132" height="132" href="${avatar}" xlink:href="${avatar}" preserveAspectRatio="xMidYMid slice" image-rendering="pixelated" />
    <text x="250" y="430" fill="#96998f" font-size="12" font-weight="400" letter-spacing="1.8">${escapeXml(copy.categoryLabel).toUpperCase()}</text>
    ${categoryRows}
  </g>

  <g clip-path="url(#golf-card)">
    <image x="612" y="72" width="596" height="298" href="${golf}" xlink:href="${golf}" preserveAspectRatio="xMidYMid slice" />
  </g>
  <rect x="612" y="72" width="596" height="298" fill="none" stroke="#dedfd9" stroke-width="1" />

  <g clip-path="url(#ninja-card)">
    <image x="770" y="352" width="432" height="240" href="${ninjaMing}" xlink:href="${ninjaMing}" preserveAspectRatio="xMidYMid slice" />
  </g>
  <rect x="770" y="352" width="432" height="240" fill="none" stroke="#ffffff" stroke-width="10" />
  <rect x="770" y="352" width="432" height="240" fill="none" stroke="#dedfd9" stroke-width="1" />
</svg>`;
}

function faviconSvg(avatar) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="128" height="128" viewBox="0 0 128 128" role="img" aria-labelledby="title desc">
  <title id="title">Onovich frog astronaut avatar</title>
  <desc id="desc">The Onovich pixel-art frog astronaut avatar.</desc>
  <image x="0" y="0" width="128" height="128" href="${avatar}" xlink:href="${avatar}" preserveAspectRatio="xMidYMid slice" image-rendering="pixelated" />
</svg>`;
}

function safariMaskSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-labelledby="title desc">
  <title id="title">Onovich frog astronaut silhouette</title>
  <desc id="desc">A monochrome silhouette derived from the Onovich frog astronaut avatar for Safari pinned tabs.</desc>
  <path fill="#000" fill-rule="evenodd" d="M25 114v-16h7V84h8V72h8V61h-6V49h7V42h8v7h7v-7h8v7h7v12h-6v11h8v12h8v14h7v16H25Zm22-53h34V31H75v-7H53v7h-6v30Zm6-8v-6h7v6h8v-6h7v6h-6v8h-9v-8h-7Zm-8 45h38v8H45v-8Zm-6-14h50v8H39v-8Z" />
</svg>`;
}

function icoBuffer(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + entries.length * 16;
  const directory = entries.map(({ size, buffer }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffer.length;
    return entry;
  });

  return Buffer.concat([header, ...directory, ...entries.map(({ buffer }) => buffer)]);
}

async function avatarPng(size) {
  return sharp(avatarPath)
    .resize(size, size, { fit: 'cover', kernel: sharp.kernel.nearest })
    .png({ compressionLevel: 9, palette: size <= 64 })
    .toBuffer();
}

async function main() {
  await mkdir(socialDirectory, { recursive: true });

  const [avatarBuffer, ninjaMingBuffer, golfBuffer] = await Promise.all([
    readFile(avatarPath),
    readFile(ninjaMingPath),
    readFile(golfPath),
  ]);
  const avatar = jpegDataUri(avatarBuffer);
  const ninjaMing = pngDataUri(ninjaMingBuffer);
  const golf = pngDataUri(golfBuffer);
  const avatarFaviconSvg = faviconSvg(avatar);

  await Promise.all([
    writeFile(join(socialDirectory, 'onovich-en-v2.svg'), socialPreviewSvg({ language: 'en', avatar, ninjaMing, golf }), 'utf8'),
    writeFile(join(socialDirectory, 'onovich-zh-v2.svg'), socialPreviewSvg({ language: 'zh-CN', avatar, ninjaMing, golf }), 'utf8'),
    writeFile(join(publicDirectory, 'favicon.svg'), avatarFaviconSvg, 'utf8'),
    writeFile(join(publicDirectory, 'favicon-avatar.svg'), avatarFaviconSvg, 'utf8'),
    writeFile(join(publicDirectory, 'safari-pinned-tab.svg'), safariMaskSvg(), 'utf8'),
    writeFile(join(publicDirectory, 'site.webmanifest'), `${JSON.stringify({
      name: 'Onovich — Games, Systems & Tools',
      short_name: 'Onovich',
      start_url: '/',
      scope: '/',
      display: 'browser',
      background_color: '#ffffff',
      theme_color: '#ffffff',
      icons: [
        { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/android-chrome-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }, null, 2)}\n`, 'utf8'),
  ]);

  const [favicon16, favicon32, favicon48, favicon64, favicon256, appleTouch, android192, android512] = await Promise.all([
    avatarPng(16),
    avatarPng(32),
    avatarPng(48),
    avatarPng(64),
    avatarPng(256),
    avatarPng(180),
    avatarPng(192),
    avatarPng(512),
  ]);

  const maskableAvatar = await sharp(avatarPath)
    .resize(352, 352, { fit: 'cover', kernel: sharp.kernel.nearest })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const maskable = await sharp({
    create: { width: 512, height: 512, channels: 4, background: '#ffffff' },
  })
    .composite([
      { input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect x="63" y="63" width="386" height="386" fill="#181a17"/><rect x="63" y="63" width="386" height="386" fill="none" stroke="#759d18" stroke-width="6"/></svg>') },
      { input: maskableAvatar, left: 80, top: 80 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
  const avatarIco = icoBuffer([
    { size: 16, buffer: favicon16 },
    { size: 32, buffer: favicon32 },
    { size: 48, buffer: favicon48 },
    { size: 64, buffer: favicon64 },
    { size: 256, buffer: favicon256 },
  ]);

  await Promise.all([
    writeFile(join(publicDirectory, 'favicon-16x16.png'), favicon16),
    writeFile(join(publicDirectory, 'favicon-32x32.png'), favicon32),
    writeFile(join(publicDirectory, 'favicon-avatar-16.png'), favicon16),
    writeFile(join(publicDirectory, 'favicon-avatar-32.png'), favicon32),
    writeFile(join(publicDirectory, 'apple-touch-icon.png'), appleTouch),
    writeFile(join(publicDirectory, 'android-chrome-192x192.png'), android192),
    writeFile(join(publicDirectory, 'android-chrome-512x512.png'), android512),
    writeFile(join(publicDirectory, 'android-chrome-maskable-512x512.png'), maskable),
    writeFile(join(publicDirectory, 'favicon.ico'), avatarIco),
    writeFile(join(publicDirectory, 'favicon-avatar.ico'), avatarIco),
  ]);

  console.log('Generated avatar-derived browser and device icons.');
  console.log('Generated editable v2 social-preview SVG sources.');
}

await main();
