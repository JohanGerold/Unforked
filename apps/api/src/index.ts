import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { AppError, RequestSchema, defaultProfile, repoKey, type Evidence } from '@unforked/contracts';
import { createConfiguredModel, providerHealth } from './ai/configured-provider';
import { selectedProvider } from './ai/provider-selection';
import { analyzeSummary, buildLearningPath, answerQuestion } from './ai/analysis';
import { GitHubClient } from './github/client';
import { fetchEvidence } from './github/evidence';
import { fetchLearningEvidence } from './github/learning-evidence';
import { recommend } from './search/recommend';
import { demoEvidence, demoLearning, demoSearch, demoSummary, findDemo } from './demo';
import type { Env } from './env';
import { exchangeCode, logout, oauthCallback, requireSession, startAuth } from './auth/security';
import { finishUsage, reserveUsage } from './usage/limits';
import { configuredCostBound } from './ai/budget';
import { checkIssue } from './github/issue-check';
import { cleanupExpiredData } from './maintenance';
import { betaInformation } from './privacy';
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
app.get('/health', async c => c.json({ name: 'Unforked', mode: c.env.MODE === 'live' ? 'live' : 'demo', ...await providerHealth(c.env) }));
app.get('/', c => c.text(betaInformation(c.env)));
app.get('/privacy', c => c.text(betaInformation(c.env)));
app.use('/auth/*', bodyLimit({ maxSize: 4000 }));
app.post('/auth/start', async c => { const body = await c.req.json().catch(() => ({})) as any; if (typeof body.challenge !== 'string') throw new AppError('INVALID_INPUT', 'A sign-in challenge is required.'); return c.json(await startAuth(c.env, body.challenge, c.req.header('CF-Connecting-IP') || 'local')); });
app.get('/auth/callback', async c => c.redirect(await oauthCallback(c.env, c.req.query('state') || '', c.req.query('code') || '')));
app.post('/auth/exchange', async c => { const body = await c.req.json().catch(() => ({})) as any; if (!['code', 'state', 'verifier'].every(k => typeof body[k] === 'string' && body[k].length >= 20 && body[k].length <= 200)) throw new AppError('INVALID_INPUT', 'Invalid sign-in exchange.'); return c.json(await exchangeCode(c.env, body)); });
app.post('/auth/logout', async c => { await logout(c.req.raw, c.env); return c.json({ ok: true }); });
app.post('/v1/:action', async c => {
  const input = RequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) throw new AppError('INVALID_INPUT', 'Check the repository, request, or profile and try again.');
  const action = c.req.param('action'); const data = input.data;
  if (action === 'issue-check') {
    if (!data.repo || !data.issueNumber) throw new AppError('INVALID_INPUT', 'An issue number and repository are required.');
    const demo = c.env.MODE !== 'live';
    const local = c.env.ENVIRONMENT === 'development' && ['127.0.0.1', 'localhost'].includes(new URL(c.req.url).hostname);
    const session = !demo && !local ? await requireSession(c.req.raw, c.env) : null;
    const result = demo ? { repo: data.repo, issueNumber: data.issueNumber, available: false, reasons: ['Demo mode does not verify live issue availability. Switch to a live backend first.'], checkedAt: new Date().toISOString() } : await checkIssue(data.repo, data.issueNumber, new GitHubClient(session?.githubToken || c.env.GITHUB_TOKEN, fetch, c.req.raw.signal, Number(c.env.GITHUB_REQUEST_LIMIT || '80')));
    return c.json({ data: result, demo, aiProvider: demo ? undefined : selectedProvider(c.env), requestId: data.requestId, sources: [], checkedAt: result.checkedAt });
  }
  if (!['summary', 'search', 'learning-path', 'repo-question'].includes(action)) throw new AppError('NOT_FOUND', 'Unknown action.', 404);
  if (action === 'search' && !data.request || action !== 'search' && !data.repo || action === 'repo-question' && !data.question) throw new AppError('INVALID_INPUT', 'This action is missing a repository or question.');
  const demo = c.env.MODE !== 'live'; let result: unknown; let evidence: Evidence[];
  if (demo) {
    if (action === 'search') { result = demoSearch(data.request!, data.profile || defaultProfile); evidence = demoEvidence(); }
    else { const e = findDemo(data.repo!); if (!e) throw new AppError('NOT_FOUND', 'Demo mode contains Requests, Rich, and Flask. Switch the backend to live mode to inspect other repositories.', 404); evidence = [e]; result = action === 'summary' ? demoSummary(e) : action === 'learning-path' ? demoLearning(e) : { answer: e.description, sourceIds: e.sources.map(s => s.id), limitation: 'Illustrative demo answer. No implementation code or live activity was inspected.' }; }
  } else {
    const local = c.env.ENVIRONMENT === 'development' && ['127.0.0.1', 'localhost'].includes(new URL(c.req.url).hostname);
    const session = local ? null : await requireSession(c.req.raw, c.env);
    const model = createConfiguredModel(c.env, c.req.raw.signal);
    if (session) await reserveUsage(c.env, session.userId, data.requestId, selectedProvider(c.env) === 'ollama' ? 0 : configuredCostBound(c.env));
    const client = new GitHubClient(session?.githubToken || c.env.GITHUB_TOKEN, fetch, c.req.raw.signal, Number(c.env.GITHUB_REQUEST_LIMIT || '80'));
    try {
      if (action === 'search') { const found = await recommend(data.request!, data.profile || defaultProfile, client, model); result = found.result; evidence = found.evidence; }
      else { const e = action === 'learning-path' ? await fetchLearningEvidence(data.repo!, client) : await fetchEvidence(data.repo!, client); evidence = [e]; result = action === 'summary' ? await analyzeSummary(e, model) : action === 'learning-path' ? await buildLearningPath(data.request || `Contribute to ${repoKey(e.repo)}`, data.profile || defaultProfile, e, model) : await answerQuestion(data.question!, e, model); }
      if (session) await finishUsage(c.env, session.userId, data.requestId, false);
    } catch (e) { if (session) await finishUsage(c.env, session.userId, data.requestId, true); throw e; }
  }
  return c.json({ data: result, demo, aiProvider: demo ? undefined : selectedProvider(c.env), requestId: data.requestId, sources: evidence.flatMap(e => e.sources), checkedAt: new Date().toISOString() });
});
app.onError((e, c) => {
  if (!(e instanceof AppError)) {
    // Never log exception messages, request URLs/queries, headers or bodies.
    const route = ['/auth/start', '/auth/callback', '/auth/exchange', '/auth/logout'].includes(c.req.path) ? c.req.path : '/v1/action';
    const kind = ['Error', 'TypeError', 'SyntaxError', 'OperationError', 'DataError'].includes(e.name) ? e.name : 'Error';
    const frames = (e.stack || '').split('\n').slice(1).map(line => line.match(/^\s*at (?:async )?([\w.$<>]{1,100})(?:\s|\()/)?.[1]).filter(Boolean).slice(0, 5);
    console.error(JSON.stringify({ event: 'unhandled_action', route, kind, frames }));
  }
  const error = e instanceof AppError ? e : new AppError('PROVIDER_UNAVAILABLE', 'The action could not finish. Try again shortly.', 503);
  if (error.retryAfterSeconds) c.header('Retry-After', String(error.retryAfterSeconds));
  return c.json({ error: { code: error.code, userMessage: error.message, retryAfterSeconds: error.retryAfterSeconds } }, error.status as any);
});
export default {
  fetch: app.fetch,
  async scheduled(event: { scheduledTime: number }, env: Env) {
    await cleanupExpiredData(env, new Date(event.scheduledTime));
  }
};
