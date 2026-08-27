// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { localEditorPlugin } from './scripts/local-editor-server.mjs';

const localEditorEnabled = process.env.ONOVICH_EDITOR === '1';

export default defineConfig({
  site: 'https://onovich.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
  vite: {
    plugins: [localEditorPlugin({ enabled: localEditorEnabled })],
  },
});
