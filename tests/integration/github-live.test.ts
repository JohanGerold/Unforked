import { expect, it } from 'vitest';
import { GitHubClient } from '../../apps/api/src/github/client';
import { fetchEvidence } from '../../apps/api/src/github/evidence';
it.skipIf(process.env.UNFORKED_LIVE_SMOKE !== '1')('public GitHub evidence can be retrieved without an AI call', async () => {
  const evidence = await fetchEvidence({ owner: 'psf', name: 'requests' }, new GitHubClient());
  expect(evidence.isPublic).toBe(true); expect(evidence.languages).toContain('Python'); expect(evidence.sources.some(s => s.id === 'psf/requests:readme')).toBe(true);
}, 30000);
