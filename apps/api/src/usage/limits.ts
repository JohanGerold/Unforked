import { AppError } from '@unforked/contracts';
import type { Env } from '../env';
export function positiveInteger(value: string | undefined, fallback: number) { const number = value === undefined ? fallback : Number(value); if (!Number.isSafeInteger(number) || number <= 0) throw new AppError('PROVIDER_UNAVAILABLE', 'Usage limits are not configured correctly.', 503); return number; }
export async function reserveUsage(env: Env, user: string, id: string, calculatedBound = 0): Promise<void> {
  if (!env.DB) throw new AppError('PROVIDER_UNAVAILABLE', 'Hosted usage storage is not configured.', 503);
  const previous = await env.DB.prepare('SELECT request_id FROM usage_reservations WHERE user_id=? AND request_id=?').bind(user, id).first();
  if (previous) throw new AppError('DUPLICATE_REQUEST', 'This action was already started. Submit a new request to retry.', 409);
  const day = new Date().toISOString().slice(0, 10), month = day.slice(0, 7);
  const cost = Math.max(positiveInteger(env.ACTION_RESERVATION_MICRODOLLARS, 50000), calculatedBound), budget = positiveInteger(env.MONTHLY_BUDGET_MICRODOLLARS, 10000000), daily = positiveInteger(env.DAILY_LIMIT, 10);
  try {
    const result = await env.DB.prepare(`INSERT INTO usage_reservations (user_id,request_id,day,month,reserved_cost)
      SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM usage_reservations WHERE user_id=? AND day=?) < ?
      AND (SELECT COALESCE(SUM(reserved_cost),0) FROM usage_reservations WHERE month=?) + ? <= ?`).bind(user, id, day, month, cost, user, day, daily, month, cost, budget).run();
    if (!result.meta.changes) throw new AppError('BUDGET_EXHAUSTED', 'The daily allowance or workspace generation budget has been reached. Please try later.', 429);
  } catch (e) { if (e instanceof AppError) throw e; if (/unique|constraint/i.test(String(e))) throw new AppError('DUPLICATE_REQUEST', 'This action was already started.', 409); throw e; }
}
export async function finishUsage(env: Env, user: string, id: string, failed: boolean) {
  // Conservatively retain the full reservation, including failed/cancelled provider work.
  await env.DB?.prepare('UPDATE usage_reservations SET status=? WHERE user_id=? AND request_id=?').bind(failed ? 'failed' : 'complete', user, id).run();
}
