import { expect, it, vi } from 'vitest';
import { createModel } from '../../apps/api/src/ai/provider';
import { recommend } from '../../apps/api/src/search/recommend';
import { GitHubClient } from '../../apps/api/src/github/client';
import { defaultProfile } from '@unforked/contracts';
function setup(languages: Record<string, number>, archived = false) {
  const queries: string[] = [];
  const client = new GitHubClient(undefined, async input => {
    const url = new URL(String(input)); queries.push(url.pathname + url.search);
    if (url.pathname.startsWith('/search/')) return Response.json({ incomplete_results: true, items: [{ owner: { login: 'example' }, name: 'mixed', full_name: 'example/mixed', private: false, archived: false, language: 'TypeScript', has_issues: true }] });
    if (url.pathname === '/repos/example/mixed') return Response.json({ private: false, archived, description: 'Mixed language tools', topics: ['tools'], language: 'TypeScript', default_branch: 'main', pushed_at: '2026-10-30' });
    if (url.pathname.endsWith('/languages')) return Response.json(languages);
    if (url.pathname.includes('CONTRIBUTING') || url.pathname.endsWith('/readme')) return Response.json({ encoding: 'base64', content: btoa('Run tests before contributing.') });
    return Response.json([]);
  });
  let calls = 0;
  const model = { generate: async () => ++calls === 1 ? { goal: 'Python tools', languages: ['Python'], concepts: ['functions'], interests: ['tools'], availableHours: 4, hardConstraints: ['Python only'], preferences: [], queries: ['tools'] } : { noStrongMatch: false, limitations: [], matches: [{ repo: { owner: 'example', name: 'mixed' }, purpose: 'Mixed language tools', readiness: 'small_stretch', fitReasons: ['Has Python code'], skillGaps: ['TypeScript'], issueNumber: null, limitations: [], sourceIds: ['example/mixed:repo'], checkedAt: '2026-10-30' }] } };
  return { client, model, queries };
}
it('retrieves secondary language evidence before applying explicit constraints', async () => {
  const { client, model } = setup({ TypeScript: 90, Python: 10 }); const result = await recommend('Python only', defaultProfile, client, model);
  expect(result.result.matches[0].repo).toEqual({ owner: 'example', name: 'mixed' }); expect(result.result.status).toBe('partial'); expect(client.remaining).toBeGreaterThanOrEqual(70);
});
it('returns an honest empty result when verified candidates violate a hard language constraint', async () => {
  const { client, model } = setup({ TypeScript: 100 }); const result = await recommend('Python only', defaultProfile, client, model);
  expect(result.result.matches).toEqual([]); expect(result.result.status).toBe('no_strong_match');
});
it('filters a repository archived between search and evidence inspection', async () => {
  const { client, model } = setup({ Python: 100 }, true); const result = await recommend('Python only', defaultProfile, client, model);
  expect(result.result.matches).toEqual([]);
});
it('ranking completes through the Google adapter with bounded nested output arrays', async () => {
  const { client, model: fixture } = setup({ Python: 100 });
  const intent = await fixture.generate();
  const adapter = createModel('test-key', 'gemini-3.5-flash-lite');
  vi.stubGlobal('fetch', async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    const hasComplexArrays = (node: any): boolean => node !== null && typeof node === 'object' && (node.type === 'array' && node.maxItems > 5 || Object.values(node).some(hasComplexArrays));
    // Google rejects the observed nested-20-item ranking schema with INVALID_ARGUMENT.
    if (hasComplexArrays(body.generationConfig.responseJsonSchema)) return Response.json({ error: { code: 400, message: 'Request contains an invalid argument.', status: 'INVALID_ARGUMENT' } }, { status: 400 });
    return Response.json({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify({ matches: [], noStrongMatch: true, limitations: ['No verified starting task.'] }) }] }, finishReason: 'STOP', index: 0 }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 30, totalTokenCount: 130 }, modelVersion: 'gemini-3.5-flash-lite' });
  });
  let calls = 0;
  try {
    const result = await recommend('Python only', defaultProfile, client, { generate: (schema, prompt) => ++calls === 1 ? Promise.resolve(intent) : adapter.generate(schema, prompt) });
    expect(result.result.status).toBe('no_strong_match');
    expect(result.result.matches).toEqual([]);
  } finally { vi.unstubAllGlobals(); }
});
