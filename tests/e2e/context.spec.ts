import { expect, test } from '@playwright/test';
test('full navigation while Discover is visible invalidates old repository results', async ({ page }) => {
  await page.addInitScript(() => {
    let active = { id: 1, url: 'https://github.com/psf/requests' };
    const updated = new Set<(...args: any[]) => void>();
    const activated = new Set<(...args: any[]) => void>();
    const emptyEvent = { addListener() {}, removeListener() {} };
    Object.assign((window as any).chrome || ((window as any).chrome = {}), { runtime: { id: 'test', onMessage: emptyEvent }, storage: { local: { get: async () => ({}), set: async () => {}, remove: async () => {} }, session: { get: async () => ({}), remove: async () => {} }, onChanged: emptyEvent }, tabs: { query: async () => [active], onActivated: { addListener: (f: any) => activated.add(f), removeListener: (f: any) => activated.delete(f) }, onUpdated: { addListener: (f: any) => updated.add(f), removeListener: (f: any) => updated.delete(f) } } });
    (window as any).navigateFixture = (url: string, type = 'updated') => { active = { ...active, url }; if (type === 'updated') updated.forEach(fn => fn(1, { status: 'complete', url }, active)); else activated.forEach(fn => fn({ tabId: 1 })); };
  });
  await page.goto('/'); await page.getByRole('button', { name: 'Repository', exact: true }).click(); await page.getByLabel('GitHub repository').fill('psf/requests'); await page.getByRole('button', { name: 'Explain repository', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'About this repository' })).toBeVisible();
  await page.getByRole('button', { name: 'Discover', exact: true }).click(); await page.evaluate(() => (window as any).navigateFixture('https://github.com/pallets/flask'));
  await page.getByRole('button', { name: 'Repository', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'About this repository' })).toHaveCount(0);
  await expect(page.getByLabel('GitHub repository')).toHaveValue('pallets/flask');
  await page.evaluate(() => (window as any).navigateFixture('https://example.test'));
  await expect(page.getByLabel('GitHub repository')).toHaveValue('');
});
test('recommendations display uncertainty and snapshot provenance', async ({ page }) => {
  await page.goto('/'); await page.getByLabel('Contribution goal').fill('Python first contribution'); await page.getByRole('button', { name: 'Find repositories', exact: true }).click();
  await expect(page.getByText('Readiness is an estimate.', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Example snapshot', { exact: false }).first()).toBeVisible();
  await page.getByText('Limits of this recommendation', { exact: false }).first().click();
  await expect(page.getByText('Demo snapshot. Repository activity and issue availability have not been checked.').first()).toBeVisible();
});
test('suggested issue links require a fresh availability check', async ({ page }) => {
  await page.route('**/v1/search', async route => {
    const response = await route.fetch(); const body = await response.json(); body.data.matches[0].issueNumber = 1; await route.fulfill({ response, json: body });
  });
  await page.route('**/v1/issue-check', async route => {
    const input = route.request().postDataJSON(); await route.fulfill({ json: { data: { repo: { owner: 'psf', name: 'requests' }, issueNumber: 1, available: false, reasons: ['This issue is already assigned.'], checkedAt: new Date().toISOString() }, demo: false, requestId: input.requestId, sources: [], checkedAt: new Date().toISOString() } });
  });
  await page.goto('/'); await page.getByLabel('Contribution goal').fill('Python'); await page.getByRole('button', { name: 'Find repositories', exact: true }).click();
  await expect(page.locator('a[href="https://github.com/psf/requests/issues/1"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Check issue #1' }).click(); await expect(page.getByText('This issue is already assigned.')).toBeVisible();
  await expect(page.locator('a[href="https://github.com/psf/requests/issues/1"]')).toHaveCount(0);
});
