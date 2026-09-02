import editorOverrides from './editor-overrides.json';
import { applyTextOverrides } from '../../scripts/local-editor-core.mjs';

type OverrideDocument = {
  values?: unknown;
};

const rawValues = (editorOverrides as OverrideDocument).values;

export const editorValues: Record<string, string> = rawValues && typeof rawValues === 'object' && !Array.isArray(rawValues)
  ? Object.fromEntries(Object.entries(rawValues).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  : {};

export const localEditorEnabled = import.meta.env.DEV && import.meta.env.VITE_ONOVICH_EDITOR === '1';

export function editorText(key: string, fallback: string): string {
  return Object.prototype.hasOwnProperty.call(editorValues, key) ? editorValues[key] : fallback;
}

export function editable(key: string, format: 'text' | 'html' = 'text'): Record<string, string> {
  if (!localEditorEnabled || !key) return {};

  return format === 'html'
    ? { 'data-editor-key': key, 'data-editor-format': 'html' }
    : { 'data-editor-key': key };
}

export function applyEditorTextOverrides<T>(value: T, key: string): T {
  return applyTextOverrides(value, key, editorValues);
}
