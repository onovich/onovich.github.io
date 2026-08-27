export function isSupportedEditorKey(key: string): boolean;

export function sanitizeRichText(value: string): string;

export function normalizeEditorChanges(payload: unknown): Record<string, string>;

export function mergeEditorOverrides(
  existing: unknown,
  changes: Record<string, string>,
): { version: number; values: Record<string, string> };

export function applyTextOverrides<T>(
  value: T,
  key: string,
  values: Record<string, string>,
): T;
