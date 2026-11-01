import { AppError } from '@unforked/contracts';
import type { Database, Env } from '../env';

export async function requireBetaMember(db: Database | undefined, githubUserId: string): Promise<void> {
  if (!db) throw new AppError('PROVIDER_UNAVAILABLE', 'Beta access is not configured.', 503);
  let member: { active: number } | null;
  try { member = await db.prepare('SELECT active FROM beta_members WHERE user_id=?').bind(githubUserId).first<{ active: number }>(); }
  catch { throw new AppError('PROVIDER_UNAVAILABLE', 'Beta access could not be checked. Please try again later.', 503); }
  if (member?.active !== 1) throw new AppError('AUTH_REQUIRED', 'Unforked is invite-only. Contact the beta owner for access.', 403);
}

export async function checkMembership(env: Env, userId: string): Promise<void> {
  if (env.BETA_ACCESS === 'invite-only') await requireBetaMember(env.DB, userId);
}
