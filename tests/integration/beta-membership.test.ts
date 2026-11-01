import { afterEach, expect, it, vi } from 'vitest';
import { app } from '../../apps/api/src';
import { exchangeCode, hash, oauthCallback, seal, requireSession } from '../../apps/api/src/auth/security';
import type { Env } from '../../apps/api/src/env';
import { database } from '../helpers/database';

afterEach(() => vi.unstubAllGlobals());
function config(): Env {
  return { DB: database(), BETA_ACCESS: 'invite-only', MODE: 'live', ENVIRONMENT: 'production', TOKEN_ENCRYPTION_KEY: 'a'.repeat(64), EXTENSION_ID: 'a'.repeat(32), GITHUB_CLIENT_ID: 'client', GITHUB_CLIENT_SECRET: 'secret', API_ORIGIN: 'https://beta.example.test' } as Env;
}
const github: typeof fetch = async url => String(url).includes('/access_token') ? Response.json({ access_token: 'provider-secret', scope: '', token_type: 'bearer' }) : Response.json({ id: 1, login: 'owner' });
async function exchange(env: Env) {
  const verifier = 'v'.repeat(43), state = 's'.repeat(43);
  await env.DB!.prepare('INSERT INTO oauth_states (state_hash,challenge,expires_at,ip) VALUES (?,?,?,?)').bind(await hash(state), await hash(verifier), Date.now() + 10000, 'test').run();
  const callback = new URL(await oauthCallback(env, state, 'github-code'));
  return exchangeCode(env, { state, verifier, code: callback.searchParams.get('code')! }, github);
}
it('uninvited GitHub identities cannot obtain a beta session', async () => {
  const env = config();
  await expect(exchange(env)).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 403 });
  expect(await env.DB!.prepare('SELECT COUNT(*) AS count FROM sessions').first()).toEqual({ count: 0 });
});
it('missing membership storage fails closed before a session is issued', async () => {
  const env = config();
  // A deployment accidentally missing its membership migration must not issue sessions.
  await env.DB!.prepare('DROP TABLE IF EXISTS beta_members').run();
  await expect(exchange(env)).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  expect(await env.DB!.prepare('SELECT COUNT(*) AS count FROM sessions').first()).toEqual({ count: 0 });
});
it('a beta request with a valid but uninvited session is denied before GitHub or allowance work', async () => {
  const env = config(), token = 't'.repeat(43);
  await env.DB!.prepare('INSERT INTO sessions (token_hash,user_id,encrypted_token,expires_at) VALUES (?,?,?,?)').bind(await hash(token), '1', await seal('provider-secret', env.TOKEN_ENCRYPTION_KEY!), Date.now() + 10000).run();
  const fetcher = vi.fn(github); vi.stubGlobal('fetch', fetcher);
  for (const action of ['summary', 'issue-check']) {
    const response = await app.request(`https://beta.example.test/v1/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: crypto.randomUUID(), repo: { owner: 'psf', name: 'requests' }, issueNumber: 1 }) }, env);
    expect(response.status).toBe(403);
  }
  expect(fetcher).not.toHaveBeenCalled();
  expect(await env.DB!.prepare('SELECT COUNT(*) AS count FROM usage_reservations').first()).toEqual({ count: 0 });
});
it('invited members sign in and revocation immediately denies their existing session', async () => {
  const env = config();
  await env.DB!.prepare('INSERT INTO beta_members (user_id,login) VALUES (?,?)').bind('1', 'owner').run();
  const session = await exchange(env);
  const request = new Request('https://beta.example.test', { headers: { Authorization: `Bearer ${session.sessionToken}` } });
  expect((await requireSession(request, env, github)).userId).toBe('1');
  await env.DB!.prepare('UPDATE beta_members SET active=0 WHERE user_id=?').bind('1').run();
  await expect(requireSession(request, env, github)).rejects.toMatchObject({ status: 403 });
});
it('unexpected OAuth failures return a safe response and emit diagnostics without exception text', async () => {
  const env = config();
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const broken = vi.spyOn(env.DB!, 'prepare').mockImplementation(() => { throw new TypeError('private-token-do-not-log'); });
  try {
    const response = await app.request('https://beta.example.test/auth/exchange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'c'.repeat(43), state: 's'.repeat(43), verifier: 'v'.repeat(43) }) }, env);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private-token-do-not-log');
    expect(log).toHaveBeenCalled();
    const diagnostic = JSON.parse(String(log.mock.calls[0][0]));
    expect(diagnostic).toMatchObject({ event: 'unhandled_action', route: '/auth/exchange', kind: 'TypeError' });
    expect(JSON.stringify(diagnostic)).not.toContain('private-token-do-not-log');
  } finally { broken.mockRestore(); log.mockRestore(); }
});
