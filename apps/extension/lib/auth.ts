import { apiOrigin, ApiError } from './api-client';
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export async function signIn() {
  if (!globalThis.chrome?.identity) throw new Error('GitHub sign-in works in the installed Chrome extension. The browser preview supports local demo mode.');
  const verifier = encode(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = encode(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  const startResponse = await fetch(`${apiOrigin}/auth/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challenge }) });
  const start = await startResponse.json() as any;
  if (!startResponse.ok) throw new ApiError('AUTH_REQUIRED', start.error?.userMessage || 'GitHub sign-in is unavailable.');
  const authorize = new URL(start.url); if (authorize.origin !== 'https://github.com' || authorize.pathname !== '/login/oauth/authorize') throw new Error('The sign-in URL could not be verified.');
  const redirect = await chrome.identity.launchWebAuthFlow({ url: authorize.href, interactive: true });
  if (!redirect) throw new Error('GitHub sign-in was cancelled.');
  const result = new URL(redirect); const expected = new URL(chrome.identity.getRedirectURL('unforked'));
  if (result.origin !== expected.origin || result.pathname !== expected.pathname || result.searchParams.get('state') !== start.state) throw new Error('The sign-in response could not be verified.');
  const response = await fetch(`${apiOrigin}/auth/exchange`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: result.searchParams.get('code'), state: start.state, verifier }) });
  const session = await response.json() as any;
  if (!response.ok || typeof session.sessionToken !== 'string') throw new Error(session.error?.userMessage || 'GitHub sign-in could not finish.');
  await chrome.storage.session.set({ sessionToken: session.sessionToken, login: session.login }); return String(session.login);
}
export async function signOut() {
  if (!globalThis.chrome?.storage?.session) return;
  const data = await chrome.storage.session.get('sessionToken');
  if (typeof data.sessionToken === 'string') { const response = await fetch(`${apiOrigin}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${data.sessionToken}` } }); if (!response.ok) throw new Error('Could not revoke this session. Check the connection and retry.'); }
  await chrome.storage.session.remove(['sessionToken', 'login']);
}
