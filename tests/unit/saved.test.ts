import { expect, it } from 'vitest';
import { createLocalStore } from '../../apps/extension/lib/storage';
import type { Match } from '@unforked/contracts';
it('saves demo provenance and source references without duplicate repositories', async () => {
  const data: Record<string, unknown> = {};
  const store = createLocalStore({ get: async k => data[k], set: async (k, v) => { data[k] = v; }, remove: async k => { delete data[k]; } });
  const card: Match = { repo: { owner: 'psf', name: 'requests' }, purpose: 'HTTP client', readiness: 'small_stretch', fitReasons: ['Python'], skillGaps: [], issueNumber: null, limitations: [], sourceIds: ['repo'], checkedAt: '2026-10-31' };
  const sources = [{ id: 'repo', url: 'https://github.com/psf/requests', label: 'Repository', excerpt: 'HTTP client' }];
  await Promise.all([store.saveRepo(card, sources, true), store.saveRepo(card, sources, true)]);
  const saved = await store.listSaved(); expect(saved).toHaveLength(1); expect(saved[0].demo).toBe(true); expect(saved[0].savedSources[0].url).toBe('https://github.com/psf/requests');
});
