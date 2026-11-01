import { AppError } from '@unforked/contracts';
import type { Env } from '../env';
import { checkMembership } from './membership';
const bytes = (text: string) => new TextEncoder().encode(text);
const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
export async function hash(value: string): Promise<string> { return encode(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes(value)))); }
async function key(raw: string) { if (!/^[a-f\d]{64}$/i.test(raw)) throw new AppError('PROVIDER_UNAVAILABLE', 'Token encryption is not configured.', 503); return crypto.subtle.importKey('raw', Uint8Array.from(raw.match(/../g)!, b => parseInt(b, 16)), 'AES-GCM', false, ['encrypt', 'decrypt']); }
export async function seal(value: string, raw: string): Promise<string> { const iv = crypto.getRandomValues(new Uint8Array(12)); const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(raw), bytes(value))); return `${encode(iv)}.${encode(encrypted)}`; }
export async function unseal(value: string, raw: string): Promise<string> { const [iv, encrypted] = value.split('.'); return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(iv) }, await key(raw), decode(encrypted))); }
export function authConfig(env: Env) {
  if (!env.DB || !env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.TOKEN_ENCRYPTION_KEY || !env.API_ORIGIN || !env.EXTENSION_ID || !/^[a-p]{32}$/.test(env.EXTENSION_ID)) throw new AppError('PROVIDER_UNAVAILABLE', 'Hosted GitHub sign-in is not configured. Use the local demo until setup is complete.', 503);
  const api = new URL(env.API_ORIGIN); if (api.protocol !== 'https:' || api.username || api.password || api.pathname !== '/') throw new AppError('PROVIDER_UNAVAILABLE', 'The hosted API origin must be an HTTPS origin.', 503);
  return { db: env.DB, key: env.TOKEN_ENCRYPTION_KEY, callback: `${api.origin}/auth/callback`, returnUrl: `https://${env.EXTENSION_ID}.chromiumapp.org/unforked` };
}
export async function startAuth(env: Env, challenge: string, ip: string) {
  const config = authConfig(env); if (!/^[\w-]{43}$/.test(challenge)) throw new AppError('INVALID_INPUT', 'The sign-in challenge is invalid.');
  const state = encode(crypto.getRandomValues(new Uint8Array(32))); const now = Date.now();
  await config.db.prepare('DELETE FROM oauth_states WHERE expires_at < ?').bind(now).run();
  const result = await config.db.prepare('INSERT INTO oauth_states (state_hash,challenge,expires_at,ip) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM oauth_states WHERE ip=?) < 10').bind(await hash(state), challenge, now + 600000, ip, ip).run();
  if (!result.meta.changes) throw new AppError('RATE_LIMITED', 'Too many sign-in attempts. Wait a few minutes.', 429);
  const url = new URL('https://github.com/login/oauth/authorize'); url.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID!, redirect_uri: config.callback, scope: '', state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
  return { url: url.href, state };
}
export async function oauthCallback(env: Env, state: string, code: string) {
  const config = authConfig(env); if (state.length > 100 || code.length > 1000 || !state || !code) throw new AppError('AUTH_REQUIRED', 'GitHub sign-in was cancelled or invalid.', 401);
  const exchange = encode(crypto.getRandomValues(new Uint8Array(32)));
  const result = await config.db.prepare('UPDATE oauth_states SET exchange_hash=?,github_code=? WHERE state_hash=? AND expires_at>? AND github_code IS NULL').bind(await hash(exchange), await seal(code, config.key), await hash(state), Date.now()).run();
  if (!result.meta.changes) throw new AppError('AUTH_REQUIRED', 'This sign-in attempt expired or was already used.', 401);
  const target = new URL(config.returnUrl); target.search = new URLSearchParams({ code: exchange, state }).toString(); return target.href;
}
export async function exchangeCode(env: Env, input: { code: string; state: string; verifier: string }, fetcher: typeof fetch = fetch) {
  const config = authConfig(env);
  const row = await config.db.prepare('DELETE FROM oauth_states WHERE exchange_hash=? AND state_hash=? AND challenge=? AND expires_at>? RETURNING github_code').bind(await hash(input.code), await hash(input.state), await hash(input.verifier), Date.now()).first<{ github_code: string }>();
  if (!row?.github_code) throw new AppError('AUTH_REQUIRED', 'This sign-in attempt is invalid or expired. Start again.', 401);
  const code = await unseal(row.github_code, config.key);
  const tokenResponse = await fetcher('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, code_verifier: input.verifier, redirect_uri: config.callback }), redirect: 'manual', signal: AbortSignal.timeout(15000) });
  const token = await tokenResponse.json() as any;
  if (!tokenResponse.ok || !token.access_token || token.scope?.trim() || token.token_type !== 'bearer') throw new AppError('AUTH_REQUIRED', 'Public-only sign-in could not be completed. Revoke any older broader Unforked grant in GitHub and try again.', 401);
  const identity = await fetcher('https://api.github.com/user', { headers: { Authorization: `Bearer ${token.access_token}`, 'User-Agent': 'Unforked/0.1', Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(15000), redirect: 'manual' });
  const user = await identity.json() as any; if (!identity.ok || !Number.isSafeInteger(user.id)) throw new AppError('AUTH_REQUIRED', 'GitHub identity could not be verified.', 401);
  await checkMembership(env, String(user.id));
  const sessionToken = encode(crypto.getRandomValues(new Uint8Array(32))); const expiresAt = Date.now() + Math.min(28800, Number(token.expires_in) || 28800) * 1000;
  await config.db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()).run();
  await config.db.prepare('INSERT INTO sessions (token_hash,user_id,encrypted_token,expires_at) VALUES (?,?,?,?)').bind(await hash(sessionToken), String(user.id), await seal(token.access_token, config.key), expiresAt).run();
  return { sessionToken, expiresAt, login: String(user.login || '') };
}
export async function requireSession(request: Request, env: Env, fetcher: typeof fetch = fetch): Promise<{ userId: string; githubToken: string }> {
  const token = request.headers.get('Authorization')?.match(/^Bearer ([\w-]{20,200})$/)?.[1];
  if (!token || !env.DB || !env.TOKEN_ENCRYPTION_KEY) throw new AppError('AUTH_REQUIRED', 'Sign in with GitHub to use hosted AI.', 401);
  const digest = await hash(token);
  const row = await env.DB.prepare('SELECT user_id,encrypted_token,expires_at FROM sessions WHERE token_hash=?').bind(digest).first<{ user_id: string; encrypted_token: string; expires_at: number }>();
  if (!row || row.expires_at <= Date.now()) throw new AppError('AUTH_REQUIRED', 'Your session expired. Sign in again.', 401);
  await checkMembership(env, row.user_id);
  let githubToken: string; try { githubToken = await unseal(row.encrypted_token, env.TOKEN_ENCRYPTION_KEY); } catch { throw new AppError('AUTH_REQUIRED', 'Your session could not be read. Sign in again.', 401); }
  const identity = await fetcher('https://api.github.com/user', { headers: { Authorization: `Bearer ${githubToken}`, 'User-Agent': 'Unforked/0.1' }, signal: AbortSignal.timeout(15000), redirect: 'manual' });
  if (identity.status === 401) { await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(digest).run(); throw new AppError('AUTH_REQUIRED', 'GitHub access was revoked. Sign in again.', 401); }
  if (!identity.ok) throw new AppError('PROVIDER_UNAVAILABLE', 'GitHub sign-in could not be checked. Try again shortly.', 503);
  const user = await identity.json() as any; if (String(user.id) !== row.user_id) throw new AppError('AUTH_REQUIRED', 'The GitHub account did not match this session.', 401);
  return { userId: row.user_id, githubToken };
}
export async function logout(request: Request, env: Env) { const token = request.headers.get('Authorization')?.replace(/^Bearer /, ''); if (token && env.DB) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(token)).run(); }
