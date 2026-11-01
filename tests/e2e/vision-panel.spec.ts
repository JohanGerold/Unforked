import { expect, test, type Page } from '@playwright/test';
import { imageFixture, visionAnswer } from '../helpers/vision';
async function imageSelection(page: Page) {
  await page.addInitScript(image => {
    const data: Record<string, unknown> = { selectedImage: { image, repo: { owner: 'psf', name: 'requests' }, pageUrl: 'https://github.com/psf/requests' }, selectedTab: 1, selectedPageUrl: 'https://github.com/psf/requests', selectionNonce: 'test', selectionCreatedAt: Date.now() };
    const noop = { addListener() {}, removeListener() {} }; const listeners: ((...args: any[]) => void)[] = []; let url = 'https://github.com/psf/requests';
    (globalThis as any).__imageNavigate = () => { url = 'https://github.com/pallets/flask'; for (const listener of listeners) listener({ type: 'UNFORKED_NAVIGATED' }, { id: 'test', tab: { id: 1 } }); };
    (globalThis as any).chrome = { runtime: { id: 'test', onMessage: { addListener(listener: (...args: any[]) => void) { listeners.push(listener); }, removeListener() {} } }, tabs: { query: async () => [{ id: 1, url }], onActivated: noop, onUpdated: noop }, storage: { onChanged: noop, session: { get: async () => structuredClone(data), remove: async (keys: string[]) => { for (const key of keys) delete data[key]; } } } };
  }, imageFixture());
  await page.route('**/health', route => route.fulfill({ json: { mode: 'live', aiProvider: 'ollama', aiAvailable: true, visionAvailable: true } }));
}
test('a circle image is previewed before upload and can be explained with an optional question', async ({ page }) => {
  await imageSelection(page);
  let uploads = 0;
  await page.route('**/v1/vision', route => {
    uploads++; const input = route.request().postDataJSON(); expect(input.question).toBe('How does square work?');
    expect(input.image).toEqual(imageFixture());
    return route.fulfill({ json: { data: visionAnswer, demo: false, aiProvider: 'ollama', requestId: input.requestId, sources: [], checkedAt: new Date().toISOString() } });
  });
  await page.goto('/'); await expect(page.getByAltText('Selected GitHub area')).toBeVisible(); expect(uploads).toBe(0);
  await page.getByLabel('Question about this image').fill('How does square work?'); await page.getByRole('button', { name: 'Explain image', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Python function', exact: true })).toBeVisible(); expect(uploads).toBe(1);
  await expect(page.getByText('Based on the selected image', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.superpowers/circle-image/panel.png', fullPage: true });
  await page.getByRole('button', { name: 'Discard image', exact: true }).click(); await expect(page.getByAltText('Selected GitHub area')).toHaveCount(0);
});
test('navigation clears an image and rejects its late explanation', async ({ page }) => {
  await imageSelection(page);
  let release!: () => void; let started = false;
  await page.route('**/v1/vision', async route => {
    started = true; const input = route.request().postDataJSON(); await new Promise<void>(done => { release = done; });
    await route.fulfill({ json: { data: visionAnswer, demo: false, aiProvider: 'ollama', requestId: input.requestId, sources: [], checkedAt: new Date().toISOString() } }).catch(() => {});
  });
  await page.goto('/'); await expect(page.getByAltText('Selected GitHub area')).toBeVisible();
  await page.getByRole('button', { name: 'Explain image', exact: true }).click(); await expect.poll(() => started).toBe(true);
  await page.evaluate(() => (globalThis as any).__imageNavigate()); release();
  await expect(page.getByAltText('Selected GitHub area')).toHaveCount(0); await expect(page.getByRole('heading', { name: 'Python function', exact: true })).toHaveCount(0);
});
