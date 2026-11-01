import { expect, it, vi } from 'vitest';
import { app } from '../../apps/api/src/index';
import { buildQueries, enforceLanguageConstraint } from '../../apps/api/src/search/recommend';
import { defaultProfile, type SearchIntent } from '@unforked/contracts';
const intent: SearchIntent = { goal: 'Python tools', languages: ['Python'], concepts: [], interests: ['http'], availableHours: 4, hardConstraints: [], preferences: [], queries: ['python tools', 'topic:http'] };
it('caps search expansion and always adds public and unarchived filters', () => {
  const queries = buildQueries({ ...intent, queries: ['a', 'b', 'c', 'd'] });
  expect(queries).toHaveLength(3); expect(queries.every(q => q.endsWith('archived:false is:public'))).toBe(true);
});
it('keeps explicit language constraints while allowing secondary repository languages', () => {
  expect(enforceLanguageConstraint('Python only, please', ['TypeScript'])).toBe(false);
  expect(enforceLanguageConstraint('only Python', ['TypeScript', 'Python'])).toBe(true);
  expect(enforceLanguageConstraint('I know Python', ['TypeScript'])).toBe(true);
});
const post = (path: string, input: unknown, env = { MODE: 'demo', ENVIRONMENT: 'development' }) => app.request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }, env);
it('demo search is usable without a key and is explicitly identified', async () => {
  const res = await post('/v1/search', { requestId: crypto.randomUUID(), request: 'Python contributions', profile: { ...defaultProfile, languages: ['Python'] } });
  expect(res.status).toBe(200); const body = await res.json(); expect(body.demo).toBe(true); expect(body.data.matches.length).toBeGreaterThan(0); expect(body.data.matches.length).toBeLessThanOrEqual(5);
});
it('rejects malformed input and missing live credentials clearly', async () => {
  expect((await post('/v1/summary', { repo: 'evil' })).status).toBe(400);
  const res = await post('/v1/summary', { requestId: crypto.randomUUID(), repo: { owner: 'psf', name: 'requests' } }, { MODE: 'live', ENVIRONMENT: 'development' });
  expect(res.status).toBe(503); expect((await res.json()).error.code).toBe('PROVIDER_UNAVAILABLE');
});
it('hosted live requests require authentication even with a configured provider', async () => {
  const res = await app.request('/v1/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: crypto.randomUUID(), request: 'Python' }) }, { MODE: 'live', ENVIRONMENT: 'production', AI_MODEL: 'test', GOOGLE_GENERATIVE_AI_API_KEY: 'test' });
  expect(res.status).toBe(401);
});
it('the API applies its configured GitHub allowance to live issue checks', async () => {
  let calls = 0;
  vi.stubGlobal('fetch', async () => { calls++; return Response.json({ private: false, archived: false, state: 'open', assignees: [] }); });
  try {
    const response = await app.request('http://127.0.0.1/v1/issue-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: crypto.randomUUID(), repo: { owner: 'example', name: 'project' }, issueNumber: 1 }) }, { MODE: 'live', ENVIRONMENT: 'development', GITHUB_REQUEST_LIMIT: '1' });
    expect(response.status).toBe(429);
    expect(calls).toBe(1);
  } finally { vi.unstubAllGlobals(); }
});
