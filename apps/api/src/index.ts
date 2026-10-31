import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { AppError, RequestSchema, defaultProfile, repoKey, type Evidence } from '@unforked/contracts';
import { createModel } from './ai/provider';
import { analyzeSummary, buildLearningPath, answerQuestion } from './ai/analysis';
import { GitHubClient } from './github/client';
import { fetchEvidence } from './github/evidence';
import { recommend } from './search/recommend';
import { demoEvidence, demoLearning, demoSearch, demoSummary, findDemo } from './demo';
import type { Env } from './env';
import { exchangeCode, logout, oauthCallback, requireSession, startAuth } from './auth/security';
import { finishUsage, reserveUsage } from './usage/limits';
import { configuredCostBound } from './ai/budget';
export const app = new Hono<{ Bindings: Env }>();
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin'); const local = c.env.ENVIRONMENT === 'development';
  const allowed = !!origin && ((local && /^http:\/\/(?:127\.0\.0\.1|localhost):(?:5173|3000)$/.test(origin)) || (!!c.env.EXTENSION_ID && origin === `chrome-extension://${c.env.EXTENSION_ID}`));
  if (allowed) { c.header('Access-Control-Allow-Origin', origin!); c.header('Vary', 'Origin'); c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization'); c.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS'); }
  c.header('Cache-Control', 'no-store'); c.header('X-Content-Type-Options', 'nosniff');
  if (c.req.method === 'OPTIONS') return c.body(null, allowed ? 204 : 403);
  await next();
});
app.use('/v1/*', bodyLimit({ maxSize: 64000, onError: c => c.json({ error: { code: 'INVALID_INPUT', userMessage: 'This request is too large.' } }, 413) }));
app.get('/health', c => c.json({ name: 'Unforked', mode: c.env.MODE === 'live' ? 'live' : 'demo', configured: !!(c.env.AI_MODEL && c.env.GOOGLE_GENERATIVE_AI_API_KEY) }));
app.use('/auth/*', bodyLimit({ maxSize: 4000 }));
app.post('/auth/start', async c => { const body = await c.req.json().catch(() => ({})) as any; if (typeof body.challenge !== 'string') throw new AppError('INVALID_INPUT', 'A sign-in challenge is required.'); return c.json(await startAuth(c.env, body.challenge, c.req.header('CF-Connecting-IP') || 'local')); });
app.get('/auth/callback', async c => c.redirect(await oauthCallback(c.env, c.req.query('state') || '', c.req.query('code') || '')));
app.post('/auth/exchange', async c => { const body = await c.req.json().catch(() => ({})) as any; if (!['code', 'state', 'verifier'].every(k => typeof body[k] === 'string' && body[k].length >= 20 && body[k].length <= 200)) throw new AppError('INVALID_INPUT', 'Invalid sign-in exchange.'); return c.json(await exchangeCode(c.env, body)); });
app.post('/auth/logout', async c => { await logout(c.req.raw, c.env); return c.json({ ok: true }); });
app.post('/v1/:action', async c => {
  const input = RequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) throw new AppError('INVALID_INPUT', 'Check the repository, request, or profile and try again.');
  const action = c.req.param('action'); const data = input.data;
  if (!['summary', 'search', 'learning-path', 'repo-question'].includes(action)) throw new AppError('NOT_FOUND', 'Unknown action.', 404);
  if (action === 'search' && !data.request || action !== 'search' && !data.repo || action === 'repo-question' && !data.question) throw new AppError('INVALID_INPUT', 'This action is missing a repository or question.');
  const demo = c.env.MODE !== 'live'; let result: unknown; let evidence: Evidence[];
  if (demo) {
    if (action === 'search') { result = demoSearch(data.request!, data.profile || defaultProfile); evidence = demoEvidence(); }
    else { const e = findDemo(data.repo!); if (!e) throw new AppError('NOT_FOUND', 'Demo mode contains Requests, Rich, and Flask. Switch the backend to live mode to inspect other repositories.', 404); evidence = [e]; result = action === 'summary' ? demoSummary(e) : action === 'learning-path' ? demoLearning(e) : { answer: e.description, sourceIds: e.sources.map(s => s.id), limitation: 'Illustrative demo answer. No implementation code or live activity was inspected.' }; }
  } else {
    const local = c.env.ENVIRONMENT === 'development' && ['127.0.0.1', 'localhost'].includes(new URL(c.req.url).hostname);
    const session = local ? null : await requireSession(c.req.raw, c.env);
    const model = createModel(c.env.GOOGLE_GENERATIVE_AI_API_KEY, c.env.AI_MODEL, c.req.raw.signal);
    if (session) await reserveUsage(c.env, session.userId, data.requestId, configuredCostBound(c.env));
    const client = new GitHubClient(session?.githubToken || c.env.GITHUB_TOKEN, fetch, c.req.raw.signal);
    try {
      if (action === 'search') { const found = await recommend(data.request!, data.profile || defaultProfile, client, model); result = found.result; evidence = found.evidence; }
      else { const e = await fetchEvidence(data.repo!, client); evidence = [e]; result = action === 'summary' ? await analyzeSummary(e, model) : action === 'learning-path' ? await buildLearningPath(data.request || `Contribute to ${repoKey(e.repo)}`, data.profile || defaultProfile, e, model) : await answerQuestion(data.question!, e, model); }
      if (session) await finishUsage(c.env, session.userId, data.requestId, false);
    } catch (e) { if (session) await finishUsage(c.env, session.userId, data.requestId, true); throw e; }
  }
  return c.json({ data: result, demo, requestId: data.requestId, sources: evidence.flatMap(e => e.sources), checkedAt: new Date().toISOString() });
});
app.onError((e, c) => {
  const error = e instanceof AppError ? e : new AppError('PROVIDER_UNAVAILABLE', 'The action could not finish. Try again shortly.', 503);
  if (error.retryAfterSeconds) c.header('Retry-After', String(error.retryAfterSeconds));
  return c.json({ error: { code: error.code, userMessage: error.message, retryAfterSeconds: error.retryAfterSeconds } }, error.status as any);
});
export default app;
