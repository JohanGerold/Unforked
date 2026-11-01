import { expect, it } from 'vitest';
import { GitHubClient } from '../../apps/api/src/github/client';
import { fetchEvidence } from '../../apps/api/src/github/evidence';
const ref = { owner: 'psf', name: 'requests' };
const metadata = { private: false, archived: false, description: 'HTTP for humans', language: 'Python', topics: ['http'], pushed_at: '2026-10-01T00:00:00Z' };
function github(metadataOverride = metadata) {
  return new GitHubClient(undefined, async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === '/repos/psf/requests') return Response.json(metadataOverride);
    if (path.endsWith('/readme') || path.includes('CONTRIBUTING')) return Response.json({ message: 'not found' }, { status: 404 });
    if (path.endsWith('/languages')) return Response.json({ Python: 100 });
    return Response.json([]);
  });
}
it('rejects private repositories before retrieving their contents', async () => {
  await expect(fetchEvidence(ref, github({ ...metadata, private: true }))).rejects.toMatchObject({ code: 'INVALID_INPUT' });
});
it('missing README and contribution instructions still return limited public evidence', async () => {
  const data = await fetchEvidence(ref, github());
  expect(data.repo).toEqual(ref); expect(data.completeness).toBe('partial'); expect(data.sources[0].url).toBe('https://github.com/psf/requests'); expect(data.languages).toEqual(['Python']);
});
it('public retrieval works on Workers and does not follow credential-bearing redirects', async () => {
  let calls = 0;
  const client = new GitHubClient('test-token', async (_url, init) => {
    calls++;
    if (init?.redirect !== 'manual') throw new TypeError('Invalid redirect value, must be follow or manual');
    return calls === 1 ? Response.json({ description: 'Public metadata' }) : new Response(null, { status: 302, headers: { Location: 'https://untrusted.example.test' } });
  });
  expect(await client.get('/repos/example/project')).toEqual({ description: 'Public metadata' });
  await expect(client.get('/repos/example/project/issues')).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  expect(calls).toBe(2);
});
it('surfaces rate-limit reset information', async () => {
  const client = new GitHubClient(undefined, async () => Response.json({}, { status: 429, headers: { 'Retry-After': '30' } }));
  await expect(client.get('/repos/psf/requests')).rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfterSeconds: 30 });
});
it('stops before exhausting its retrieval budget', async () => {
  const client = github(); client.remaining = 0;
  await expect(fetchEvidence(ref, client)).rejects.toMatchObject({ code: 'BUDGET_EXHAUSTED' });
});
it('refuses arbitrary fetch URLs and unsafe API paths', async () => {
  const client = github();
  await expect(client.get('https://evil.test/data')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  await expect(client.get('/repos/../user')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
});
it('uses conditional requests and the cached body on 304', async () => {
  let calls = 0;
  const client = new GitHubClient(undefined, async (_url, options) => {
    calls++; if (calls === 1) return Response.json({ ok: true }, { headers: { ETag: 'test-tag' } });
    expect(new Headers(options?.headers).get('If-None-Match')).toBe('test-tag'); return new Response(null, { status: 304 });
  });
  expect(await client.get('/repos/a/b')).toEqual({ ok: true }); expect(await client.get('/repos/a/b', true)).toEqual({ ok: true });
});
it('refreshes issue state even while public documentation is cached', async () => {
  let checks = 0;
  const client = new GitHubClient(undefined, async input => {
    const path = new URL(String(input)).pathname;
    if (path === '/repos/psf/requests') return Response.json(metadata);
    if (path.endsWith('/issues')) { checks++; return Response.json(checks === 1 ? [{ number: 1, title: 'Fix test', body: '', labels: [], assignees: [], updated_at: '2026-10-31', state: 'open' }] : []); }
    if (path.endsWith('/languages')) return Response.json({ Python: 1 });
    return Response.json([]);
  });
  expect((await fetchEvidence(ref, client)).issues).toHaveLength(1);
  expect((await fetchEvidence(ref, client)).issues).toHaveLength(0);
});
