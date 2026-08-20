import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const srcContentDir = path.join(root, 'src', 'content');
const portfolioFile = path.join(srcContentDir, 'portfolio.ts');
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    return [key, rest.length > 0 ? rest.join('=') : true];
  })
);

const largeThreshold = Number(args.largeBytes ?? 1_000_000);
const maxWarnings = Number(args.maxWarnings ?? 20);
const contentFiles = [
  'pixel.json',
  'illustrations.json',
  'gifs.json',
  'graphics.json',
  'photoAlbums.json',
];

const references = [];
const failures = [];
const largeThumbCandidates = [];

for (const file of contentFiles) {
  const absolute = path.join(srcContentDir, file);
  if (!fs.existsSync(absolute)) {
    failures.push(`${file}: missing content file`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  collectAssetReferences(data, file);
}

if (!fs.existsSync(portfolioFile)) {
  failures.push('portfolio.ts: missing production portfolio content file');
} else {
  const source = fs.readFileSync(portfolioFile, 'utf8');
  for (const match of source.matchAll(/['"](\/images\/[^'"]+)['"]/g)) {
    references.push({
      key: 'portfolio asset',
      value: match[1],
      context: 'portfolio.ts',
      item: null,
    });
  }
}

for (const ref of references) {
  const localPath = localPublicPath(ref.value);
  if (!localPath) {
    failures.push(`${ref.context}: ${ref.key} must be a local /images/ path, got ${ref.value}`);
    continue;
  }

  if (!fs.existsSync(localPath)) {
    failures.push(`${ref.context}: missing ${ref.key} ${ref.value}`);
    continue;
  }

  ref.bytes = fs.statSync(localPath).size;
}

const itemRefs = references.filter((ref) => ref.key === 'src' && ref.item && !ref.item.thumbSrc && ref.bytes > largeThreshold);
for (const ref of itemRefs) {
  largeThumbCandidates.push(ref);
}

const uniqueFiles = new Map();
for (const ref of references) {
  if (!ref.bytes) continue;
  const current = uniqueFiles.get(ref.value);
  if (!current || ref.bytes > current.bytes) uniqueFiles.set(ref.value, ref);
}

if (failures.length > 0) {
  console.error(`Asset check failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Asset check passed: ${references.length} references, ${uniqueFiles.size} local files, 0 missing.`
);

if (largeThumbCandidates.length > 0) {
  largeThumbCandidates.sort((a, b) => b.bytes - a.bytes);
  console.log(
    `Large thumbnail candidates > ${formatBytes(largeThreshold)} without thumbSrc: ${largeThumbCandidates.length}.`
  );
  for (const ref of largeThumbCandidates.slice(0, maxWarnings)) {
    console.log(`- ${formatBytes(ref.bytes)} ${ref.value} (${ref.context})`);
  }
  if (largeThumbCandidates.length > maxWarnings) {
    console.log(`- ... ${largeThumbCandidates.length - maxWarnings} more`);
  }
}

function collectAssetReferences(value, context, item = null) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectAssetReferences(entry, `${context}[${index}]`, entry && typeof entry === 'object' ? entry : item));
    return;
  }

  if (!value || typeof value !== 'object') return;

  const itemLabel = value.id || value.slug || value.title;
  const nextContext = itemLabel ? `${context} ${itemLabel}` : context;
  const nextItem = value.src ? value : item;

  for (const key of ['src', 'thumbSrc']) {
    if (typeof value[key] === 'string') {
      references.push({
        key,
        value: value[key],
        context: nextContext,
        item: nextItem,
      });
    }
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === 'src' || key === 'thumbSrc') continue;
    collectAssetReferences(child, `${nextContext}.${key}`, nextItem);
  }
}

function localPublicPath(src) {
  if (!src.startsWith('/images/')) return null;
  return path.join(publicDir, src.slice(1).replaceAll('/', path.sep));
}

function formatBytes(bytes) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)}MB`;
  if (bytes >= 1000) return `${Math.round(bytes / 1000)}KB`;
  return `${bytes}B`;
}
