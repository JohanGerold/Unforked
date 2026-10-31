import { defineConfig } from 'vite';
export default defineConfig({ root: 'apps/extension/entrypoints/sidepanel', server: { port: 5173, strictPort: true, fs: { allow: ['../../../..'] } }, define: { __API_ORIGIN__: JSON.stringify('http://127.0.0.1:8787') } });
