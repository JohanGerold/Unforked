import { expect, it } from 'vitest';
import { createImageSelectionConsumer } from '../../apps/extension/lib/image-selection';
import { captureCircle } from '../../apps/extension/features/selection/capture-image';
import { visionInput } from '../helpers/vision';
it('consumes a valid temporary crop once and discards it after navigation', async () => {
  const input = visionInput(); const selectedImage = { repo: input.repo, pageUrl: input.pageUrl, image: input.image };
  let data: Record<string, unknown> = { selectedImage, selectedTab: 1, selectedPageUrl: selectedImage.pageUrl, selectionNonce: 'once', selectionCreatedAt: Date.now() };
  const consume = createImageSelectionConsumer({ get: async () => data, remove: async () => { data = {}; } });
  const tab = { id: 1, url: selectedImage.pageUrl };
  expect(await Promise.all([consume(tab), consume(tab)])).toEqual([selectedImage, null]);
  data = { selectedImage, selectedTab: 1, selectedPageUrl: selectedImage.pageUrl, selectionNonce: 'next', selectionCreatedAt: Date.now() };
  expect(await consume({ id: 1, url: 'https://github.com/pallets/flask' })).toBe(null); expect(data).toEqual({});
});
it('discards a capture if the active tab changes before or after screenshot acquisition', async () => {
  const region = { points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }], viewport: { width: 640, height: 300, scrollX: 0, scrollY: 0 } };
  const tab = { id: 1, windowId: 2, url: 'https://github.com/psf/requests', active: true };
  for (const switchAfter of [false, true]) {
    let calls = 0; let captures = 0;
    const api = { current: async () => ++calls === 1 && switchAfter ? tab : { ...tab, id: 9 }, context: async () => ({ url: tab.url, ...region.viewport }), capture: async () => { captures++; return 'data:image/png;base64,fixture'; }, crop: async () => visionInput().image };
    await expect(captureCircle(tab, { pageUrl: tab.url, region }, api)).rejects.toThrow(/changed/);
    expect(captures).toBe(switchAfter ? 1 : 0);
  }
});
it('rejects a tab switch away and back during capture even if final snapshots match', async () => {
  const region = { points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }], viewport: { width: 640, height: 300, scrollX: 0, scrollY: 0 } };
  const tab = { id: 1, windowId: 2, url: 'https://github.com/psf/requests', active: true }; let generation = 0; let cropped = false;
  const api = { current: async () => tab, context: async () => ({ url: tab.url, ...region.viewport }), capture: async () => { generation += 2; return 'data:image/png;base64,other-tab'; }, crop: async () => { cropped = true; return visionInput().image; } };
  await expect(captureCircle(tab, { pageUrl: tab.url, region }, api, () => generation === 0)).rejects.toThrow(/changed/); expect(cropped).toBe(false);
});
