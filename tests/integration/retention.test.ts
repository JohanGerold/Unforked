import { expect, it } from 'vitest';
import worker, { app } from '../../apps/api/src';
import { database } from '../helpers/database';
import type { Env } from '../../apps/api/src/env';

it('scheduled cleanup removes expired auth and old usage without resetting current allowance or members', async () => {
  const env: Env = { DB: database() };
  const now = new Date('2026-11-01T01:00:00Z');
  for (const [id, expiry] of [['expired', now.getTime() - 1], ['active', now.getTime() + 60000]] as const) {
    await env.DB!.prepare('INSERT INTO sessions VALUES (?,?,?,?)').bind(id, '1', 'ciphertext', expiry).run();
    await env.DB!.prepare('INSERT INTO oauth_states (state_hash,challenge,expires_at,ip) VALUES (?,?,?,?)').bind(id, 'challenge', expiry, 'test').run();
  }
  for (const day of ['2026-08-01', '2026-08-03', '2026-08-04', '2026-11-01']) {
    await env.DB!.prepare('INSERT INTO usage_reservations (user_id,request_id,day,month,reserved_cost) VALUES (?,?,?,?,?)').bind('1', day, day, day.slice(0, 7), 50000).run();
  }
  await env.DB!.prepare('INSERT INTO beta_members (user_id,login) VALUES (?,?)').bind('1', 'owner').run();
  const handler = worker as unknown as { scheduled?: (event: { scheduledTime: number }, env: Env) => Promise<void> };
  await handler.scheduled?.({ scheduledTime: now.getTime() }, env);
  expect((await env.DB!.prepare('SELECT token_hash FROM sessions').all()).results).toEqual([{ token_hash: 'active' }]);
  expect((await env.DB!.prepare('SELECT state_hash FROM oauth_states').all()).results).toEqual([{ state_hash: 'active' }]);
  expect((await env.DB!.prepare('SELECT day FROM usage_reservations ORDER BY day').all()).results).toEqual([{ day: '2026-08-04' }, { day: '2026-11-01' }]);
  expect(await env.DB!.prepare('SELECT active FROM beta_members WHERE user_id=?').bind('1').first()).toEqual({ active: 1 });
});
it('beta homepage and privacy expose support and explain free-tier data processing', async () => {
  const env: Env = { SUPPORT_EMAIL: 'support@example.test' };
  for (const path of ['/', '/privacy']) {
    const response = await app.request(`https://beta.example.test${path}`, {}, env);
    expect(response.status).toBe(200);
    const page = await response.text();
    expect(page).toContain('support@example.test');
    expect(page).toContain('90 days');
    expect(page).toContain('Google');
  }
});
