import { chromium, expect, test } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
test('installed extension registers its sidebar and selects a real GitHub link', async () => {
  const extension = resolve('apps/extension/.output/chrome-mv3');
  const profile = mkdtempSync(resolve('.superpowers/chromium-'));
  const context = await chromium.launchPersistentContext(profile, { channel: process.env.EXTENSION_TEST_CHANNEL || 'chrome', headless: true, ignoreDefaultArgs: ['--disable-extensions'], args: ['--enable-unsafe-extension-debugging'] });
  try {
    const cdp = await context.browser()!.newBrowserCDPSession();
    await cdp.send('Extensions.loadUnpacked', { path: extension });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 8000 });
    await expect.poll(() => worker.evaluate(async () => (await chrome.sidePanel.getPanelBehavior()).openPanelOnActionClick)).toBe(true);
    const github = await context.newPage();
    await github.route('https://github.com/psf/requests', route => route.fulfill({ contentType: 'text/html', body: '<html><head><title>GitHub fixture</title></head><body style="padding:80px"><a href="https://github.com/psf/requests" style="display:block;width:180px;height:40px">psf / requests</a></body></html>' }));
    await github.goto('https://github.com/psf/requests');
    const tabId = await worker.evaluate(async () => (await chrome.tabs.query({ url: 'https://github.com/psf/requests' }))[0].id!);
    await worker.evaluate(async id => { await chrome.tabs.sendMessage(id, { type: 'UNFORKED_CIRCLE' }); }, tabId);
    await expect(github.locator('#unforked-circle-overlay')).toBeVisible();
    await github.mouse.move(65, 65); await github.mouse.down(); await github.mouse.move(300, 65, { steps: 10 }); await github.mouse.move(300, 150, { steps: 10 }); await github.mouse.move(65, 150, { steps: 10 }); await github.mouse.move(65, 65, { steps: 10 }); await github.mouse.up();
    await expect.poll(() => worker.evaluate(async () => (await chrome.storage.session.get('selectedRepo')).selectedRepo)).toEqual({ owner: 'psf', name: 'requests' });
    await expect(github.locator('#unforked-circle-overlay')).toHaveCount(0);
    await worker.evaluate(async id => { await chrome.tabs.sendMessage(id, { type: 'UNFORKED_CIRCLE' }); }, tabId);
    await github.keyboard.press('Escape'); await expect(github.locator('#unforked-circle-overlay')).toHaveCount(0);
  } finally { await context.close(); }
});
