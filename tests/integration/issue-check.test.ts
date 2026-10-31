import { expect, it } from 'vitest';
import { GitHubClient } from '../../apps/api/src/github/client';
import { checkIssue } from '../../apps/api/src/github/issue-check';
it('rechecks public issue state before offering an actionable link', async () => {
  let checks = 0;
  const client = new GitHubClient(undefined, async input => {
    if (new URL(String(input)).pathname === '/repos/psf/requests') return Response.json({ private: false });
    checks++; return Response.json({ number: 1, state: 'open', assignees: checks === 1 ? [] : [{ login: 'someone' }], body: '' });
  });
  expect((await checkIssue({ owner: 'psf', name: 'requests' }, 1, client)).available).toBe(true);
  expect((await checkIssue({ owner: 'psf', name: 'requests' }, 1, client)).available).toBe(false);
});
