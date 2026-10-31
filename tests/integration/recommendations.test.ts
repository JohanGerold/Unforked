import { expect, it } from 'vitest';
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
