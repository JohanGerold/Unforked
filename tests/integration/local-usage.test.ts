import { expect, it } from 'vitest';
import { reserveUsage } from '../../apps/api/src/usage/limits';
import { database } from '../helpers/database';
import type { Env } from '../../apps/api/src/env';
it('local action units remain separate from the Gemini reference-cost ceiling', async () => {
  const base: Env = { AI_PROVIDER: 'gemini', DB: database(), MONTHLY_BUDGET_MICRODOLLARS: '50', ACTION_RESERVATION_MICRODOLLARS: '50', DAILY_LIMIT: '10' };
  await reserveUsage(base, 'owner', crypto.randomUUID());
  await reserveUsage({ ...base, AI_PROVIDER: 'ollama', LOCAL_MONTHLY_ACTION_LIMIT: '2' } as Env, 'owner', crypto.randomUUID());
  await reserveUsage({ ...base, AI_PROVIDER: 'ollama', LOCAL_MONTHLY_ACTION_LIMIT: '2' } as Env, 'friend', crypto.randomUUID());
  await expect(reserveUsage(base, 'friend', crypto.randomUUID())).rejects.toMatchObject({ code: 'BUDGET_EXHAUSTED' });
  await expect(reserveUsage({ ...base, AI_PROVIDER: 'ollama', LOCAL_MONTHLY_ACTION_LIMIT: '2' } as Env, 'friend', crypto.randomUUID())).rejects.toMatchObject({ code: 'BUDGET_EXHAUSTED' });
});
it('owner local headroom does not raise friend allowances', async () => {
  const env = { DB: database(), AI_PROVIDER: 'ollama', OWNER_GITHUB_ID: 'owner', OWNER_DAILY_LIMIT: '2', LOCAL_DAILY_LIMIT: '1', LOCAL_MONTHLY_ACTION_LIMIT: '10' } as Env;
  await reserveUsage(env, 'owner', crypto.randomUUID()); await reserveUsage(env, 'owner', crypto.randomUUID());
  await reserveUsage(env, 'friend', crypto.randomUUID());
  await expect(reserveUsage(env, 'friend', crypto.randomUUID())).rejects.toMatchObject({ code: 'BUDGET_EXHAUSTED' });
});
