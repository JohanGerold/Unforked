import { expect, it } from 'vitest';
import { createSelectionConsumer } from '../../apps/extension/lib/selection-context';
function setup(url = 'https://github.com/psf/requests') {
  let data: Record<string, unknown> = { selectedRepo: { owner: 'psf', name: 'requests' }, selectedTab: 1, selectedPageUrl: url, selectionNonce: 'once', selectionCreatedAt: Date.now() };
  return createSelectionConsumer({ get: async () => data, remove: async () => { data = {}; } });
}
it('consumes a pending selection at most once, including concurrent listeners', async () => {
  const consume = setup(); const tab = { id: 1, url: 'https://github.com/psf/requests' };
  const results = await Promise.all([consume(tab), consume(tab)]); expect(results).toEqual([{ owner: 'psf', name: 'requests' }, null]);
});
it('discards a selection after the same tab navigates to another repository', async () => {
  const consume = setup(); expect(await consume({ id: 1, url: 'https://github.com/pallets/flask' })).toBeNull();
  expect(await consume({ id: 1, url: 'https://github.com/psf/requests' })).toBeNull();
});
