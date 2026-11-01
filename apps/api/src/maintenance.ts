import { AppError } from '@unforked/contracts';
import type { Env } from './env';

export async function cleanupExpiredData(env: Env, now = new Date()): Promise<void> {
  if (!env.DB) throw new AppError('PROVIDER_UNAVAILABLE', 'Maintenance storage is not configured.', 503);
  const cutoff = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM oauth_states WHERE expires_at <= ?').bind(now.getTime()),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now.getTime()),
    env.DB.prepare('DELETE FROM usage_reservations WHERE day <= ? AND month <> ?').bind(cutoff, now.toISOString().slice(0, 7))
  ]);
}
