import { database } from '../helpers/database';
import { expect, it } from 'vitest';
import { reserveUsage } from '../../apps/api/src/usage/limits';
import { hash, seal, unseal, requireSession, exchangeCode, logout, oauthCallback } from '../../apps/api/src/auth/security';
import type { Env } from '../../apps/api/src/env';
const env = (): Env => ({ DB: database(), TOKEN_ENCRYPTION_KEY: 'a'.repeat(64), EXTENSION_ID: 'a'.repeat(32), GITHUB_CLIENT_ID: 'client', GITHUB_CLIENT_SECRET: 'secret', API_ORIGIN: 'https://api.example.test', MONTHLY_BUDGET_MICRODOLLARS: '100', ACTION_RESERVATION_MICRODOLLARS: '60', DAILY_LIMIT: '10' });
it('concurrent reservations cannot exceed the global budget', async () => {
  const config = env(); const results = await Promise.allSettled([reserveUsage(config, 'u1', crypto.randomUUID()), reserveUsage(config, 'u2', crypto.randomUUID())]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
});
it('duplicate request IDs cannot start a second generation', async () => {
  const config = env(); const id = crypto.randomUUID(); await reserveUsage(config, 'u1', id);
  await expect(reserveUsage(config, 'u1', id)).rejects.toMatchObject({ code: 'DUPLICATE_REQUEST' });
});
it('daily usage limits hold even with a large monthly budget', async () => {
  const config = { ...env(), DAILY_LIMIT: '1', MONTHLY_BUDGET_MICRODOLLARS: '10000' };
  await reserveUsage(config, 'u1', crypto.randomUUID()); await expect(reserveUsage(config, 'u1', crypto.randomUUID())).rejects.toMatchObject({ code: 'BUDGET_EXHAUSTED' });
});
it('encrypted tokens round-trip and tampering fails', async () => {
  const config = env(); const token = await seal('secret-token', config.TOKEN_ENCRYPTION_KEY!); expect(token).not.toContain('secret-token'); expect(await unseal(token, config.TOKEN_ENCRYPTION_KEY!)).toBe('secret-token');
  await expect(unseal(token.slice(0, -4) + 'aaaa', config.TOKEN_ENCRYPTION_KEY!)).rejects.toBeDefined();
});
it('expired and revoked sessions require a new sign-in', async () => {
  const config = env(); const token = crypto.randomUUID();
  await config.DB!.prepare('INSERT INTO sessions (token_hash,user_id,encrypted_token,expires_at) VALUES (?,?,?,?)').bind(await hash(token), '1', await seal('github-token', config.TOKEN_ENCRYPTION_KEY!), Date.now() - 1).run();
  await expect(requireSession(new Request('https://api.example.test', { headers: { Authorization: `Bearer ${token}` } }), config)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
});
it('OAuth state mismatches and reused exchange codes fail before contacting GitHub', async () => {
  const config = env(); const verifier = 'v'.repeat(43); const challenge = await hash(verifier);
  await config.DB!.prepare('INSERT INTO oauth_states (state_hash,challenge,expires_at,exchange_hash,github_code,ip) VALUES (?,?,?,?,?,?)').bind(await hash('state'), challenge, Date.now() + 10000, await hash('exchange'), 'encrypted-code', 'test').run();
  await expect(exchangeCode(config, { code: 'exchange', state: 'wrong-state', verifier })).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  await expect(exchangeCode(config, { code: 'exchange', state: 'state', verifier: 'wrong'.repeat(12) })).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
});
it('OAuth exchange is bound to PKCE and can succeed only once', async () => {
  const config = env(); const verifier = 'v'.repeat(43); const state = 'state'.repeat(10);
  await config.DB!.prepare('INSERT INTO oauth_states (state_hash,challenge,expires_at,ip) VALUES (?,?,?,?)').bind(await hash(state), await hash(verifier), Date.now() + 10000, 'test').run();
  const callback = new URL(await oauthCallback(config, state, 'github-authorization-code'));
  expect(callback.origin).toBe(`https://${config.EXTENSION_ID}.chromiumapp.org`);
  const input = { code: callback.searchParams.get('code')!, state, verifier };
  const fetcher: typeof fetch = async url => String(url).includes('/access_token') ? Response.json({ access_token: 'provider-secret', scope: '', token_type: 'bearer' }) : Response.json({ id: 1, login: 'contributor' });
  const session = await exchangeCode(config, input, fetcher); expect(session.login).toBe('contributor'); expect(session.sessionToken).not.toBe('provider-secret');
  await expect(exchangeCode(config, input, fetcher)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  const request = new Request('https://api.example.test', { headers: { Authorization: `Bearer ${session.sessionToken}` } });
  expect((await requireSession(request, config, fetcher)).userId).toBe('1');
  await logout(request, config); await expect(requireSession(request, config, fetcher)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
});
it('OAuth and session checks work with the Workers-supported manual redirect mode', async () => {
  const config = env(), state = 's'.repeat(43), verifier = 'v'.repeat(43);
  await config.DB!.prepare('INSERT INTO oauth_states (state_hash,challenge,expires_at,ip) VALUES (?,?,?,?)').bind(await hash(state), await hash(verifier), Date.now() + 10000, 'test').run();
  const callback = new URL(await oauthCallback(config, state, 'github-code'));
  const workerFetch: typeof fetch = async (url, init) => {
    // workerd constructs Request before sending and rejects redirect:"error".
    if (init?.redirect !== 'manual') throw new TypeError('Invalid redirect value, must be follow or manual');
    return String(url).includes('/access_token') ? Response.json({ access_token: 'provider-secret', scope: '', token_type: 'bearer' }) : Response.json({ id: 1, login: 'owner' });
  };
  const session = await exchangeCode(config, { state, verifier, code: callback.searchParams.get('code')! }, workerFetch);
  const request = new Request('https://api.example.test', { headers: { Authorization: `Bearer ${session.sessionToken}` } });
  expect((await requireSession(request, config, workerFetch)).userId).toBe('1');
});
