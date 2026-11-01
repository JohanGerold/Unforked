import { chromium, expect, test } from '@playwright/test';
import { cpSync, mkdtempSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('beta identity survives installation from different folders', async () => {
  const root = mkdtempSync(resolve('.superpowers/beta-identity-'));
  const ids: string[] = [];
  for (const folder of ['first', 'second']) {
    const path = resolve(root, folder);
    cpSync(resolve('apps/extension/.output/chrome-mv3'), path, { recursive: true });
    const context = await chromium.launchPersistentContext(resolve(root, `${folder}-profile`), { channel: process.env.EXTENSION_TEST_CHANNEL || 'chrome', headless: true, ignoreDefaultArgs: ['--disable-extensions'], args: ['--enable-unsafe-extension-debugging'] });
    try {
      const cdp = await context.browser()!.newBrowserCDPSession();
      const loaded = await cdp.send('Extensions.loadUnpacked', { path });
      ids.push(loaded.id);
    } finally { await context.close(); }
  }
  expect(ids[0]).toBe(ids[1]);
  const identity = JSON.parse(readFileSync(resolve('apps/extension/beta-identity.json'), 'utf8'));
  expect(ids[0]).toBe(identity.extensionId);
});
