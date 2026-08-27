import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  mergeEditorOverrides,
  normalizeEditorChanges,
} from './local-editor-core.mjs';

const DEFAULT_OVERRIDES_PATH = fileURLToPath(new URL('../src/content/editor-overrides.json', import.meta.url));
const MAX_REQUEST_BYTES = 180_000;

function isLocalHost(value) {
  return /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(value ?? '');
}

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_REQUEST_BYTES) {
        reject(new RangeError('Editor save request is too large.'));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });
    request.on('error', reject);
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

async function readOverrides(overridesPath) {
  try {
    return JSON.parse(await readFile(overridesPath, 'utf8'));
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return { version: 1, values: {} };
    throw error;
  }
}

export async function saveEditorChanges(overridesPath, payload) {
  const changes = normalizeEditorChanges(payload);
  const existing = await readOverrides(overridesPath);
  const updated = mergeEditorOverrides(existing, changes);

  await writeFile(overridesPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
  return { changedKeys: Object.keys(changes), overrideCount: Object.keys(updated.values).length };
}

export function localEditorPlugin({ overridesPath = DEFAULT_OVERRIDES_PATH, enabled = false } = {}) {
  return {
    name: 'onovich-local-content-editor',
    configureServer(server) {
      if (!enabled) return;
      server.middlewares.use('/__onovich-editor', (request, response, next) => {
        void (async () => {
          const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
          const isSaveRequest = requestUrl.pathname === '/save' || requestUrl.pathname === '/__onovich-editor/save';
          if (request.method !== 'POST' || !isSaveRequest) {
            next();
            return;
          }

          if (!isLocalHost(request.headers.host)) {
            sendJson(response, 403, { ok: false, error: 'The local editor only accepts localhost requests.' });
            return;
          }

          try {
            const rawBody = await readBody(request);
            const payload = JSON.parse(rawBody);
            const result = await saveEditorChanges(overridesPath, payload);
            server.ws.send({ type: 'full-reload', path: '*' });
            sendJson(response, 200, { ok: true, ...result });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not save local editor changes.';
            const status = error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError ? 400 : 500;
            sendJson(response, status, { ok: false, error: message });
          }
        })();
      });
    },
  };
}
