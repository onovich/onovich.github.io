import { clone } from './state.js';

export function isCmsPackage(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    Array.isArray(value.pages) &&
    value.presets &&
    value.pages.every(page => Array.isArray(page.sections))
  );
}

export function assertCmsPackage(value) {
  if (!isCmsPackage(value)) throw new Error('invalid cms package');
  return value;
}

export function parseCmsPackageJson(source) {
  const parsed = JSON.parse(source);
  return clone(assertCmsPackage(parsed));
}

export function parseCmsPackageJsonOrFallback(source, fallback) {
  if (!source) return clone(fallback);
  try {
    return parseCmsPackageJson(source);
  } catch {
    return clone(fallback);
  }
}
