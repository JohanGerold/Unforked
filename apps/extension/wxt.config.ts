import { defineConfig } from 'wxt';
import identity from './beta-identity.json';
const api = new URL(process.env.UNFORKED_API_ORIGIN || 'http://127.0.0.1:8787');
if (api.username || api.password || !(api.protocol === 'https:' || api.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(api.hostname))) throw new Error('API origin must be HTTPS or loopback HTTP.');
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  // Public key pins the unpacked beta ID across install locations.
  manifestVersion: 3,
  manifest: { key: identity.publicKey, name: 'Unforked', description: 'Find GitHub projects that fit your skills, understand repositories, and plan your next open-source contribution.', version: '0.1.0', minimum_chrome_version: '116', icons: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' }, permissions: ['sidePanel', 'storage', 'contextMenus', 'identity'], host_permissions: ['https://github.com/*', `${api.origin}/*`], action: { default_title: 'Open Unforked', default_icon: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' } }, commands: { 'circle-repository': { suggested_key: { default: 'Alt+Shift+U' }, description: 'Circle a GitHub repository' } } },
  vite: () => ({ define: { __API_ORIGIN__: JSON.stringify(api.origin) } })
});
