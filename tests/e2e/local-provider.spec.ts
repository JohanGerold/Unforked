import { expect, test } from '@playwright/test';
test('local server availability is visible and can recover without changing provider', async ({ page }) => {
  let online = false;
  await page.route('**/health', route => route.fulfill({ json: { mode: 'live', aiProvider: 'ollama', configured: true, aiAvailable: online } }));
  await page.goto('/'); await expect(page.getByText('Local AI server is offline', { exact: true })).toBeVisible();
  await page.screenshot({ path: '.superpowers/local-ai/local-offline.png' });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByText(/beta owner’s laptop/)).toBeVisible();
  online = true; await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await expect(page.getByText('Connected to GitHub + local AI', { exact: true })).toBeVisible();
  await page.screenshot({ path: '.superpowers/local-ai/local-ready.png' });
});
test('a busy laptop gives a safe retry instruction', async ({ page }) => {
  await page.route('**/health', route => route.fulfill({ json: { mode: 'live', aiProvider: 'ollama', configured: true, aiAvailable: true } }));
  await page.route('**/v1/search', route => route.fulfill({ status: 429, json: { error: { code: 'LOCAL_AI_BUSY', userMessage: 'The local AI is busy. Please wait and try again.', retryAfterSeconds: 15 } } }));
  await page.goto('/'); await page.getByLabel('Contribution goal').fill('Python tools'); await page.getByRole('button', { name: 'Find repositories', exact: true }).click();
  await expect(page.getByText('The local AI is busy. Please wait and try again.', { exact: true })).toBeVisible();
  await expect(page.getByText(/15/)).toBeVisible();
});
