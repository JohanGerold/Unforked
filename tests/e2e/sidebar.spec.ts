import { expect, test } from '@playwright/test';
test('contributor can search, save a repository, and build a learning path', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Demo workspace', { exact: false })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/discover.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 }); await page.screenshot({ path: 'docs/screenshots/store-preview.png' }); await page.setViewportSize({ width: 430, height: 900 });
  await page.getByLabel('Contribution goal').fill('I know Python and want a first contribution in developer tools.');
  await page.getByRole('button', { name: 'Find repositories', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'requests', exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/results.png', fullPage: true });
  await page.getByRole('button', { name: 'Save psf/requests' }).click();
  await page.getByRole('button', { name: /Saved/ }).click();
  await expect(page.getByRole('heading', { name: 'requests', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Learning path for psf/requests' }).click();
  await expect(page.getByRole('heading', { name: 'What to learn' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Python', exact: true })).toBeVisible();
});
test('profile survives a reload and can be cleared', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Your skills', exact: true }).click();
  await page.getByLabel('Languages').fill('Python, JavaScript'); await page.getByLabel('Concepts you know').fill('functions, classes, requests');
  await page.getByRole('button', { name: 'Save profile' }).click(); await page.reload();
  await page.getByRole('button', { name: 'Your skills', exact: true }).click(); await expect(page.getByLabel('Languages')).toHaveValue('Python, JavaScript');
  await page.getByRole('button', { name: 'Settings', exact: true }).click(); page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Clear local data' }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click(); await page.getByRole('button', { name: 'Your skills', exact: true }).click(); await expect(page.getByLabel('Languages')).toHaveValue('');
});
test('sidebar remains usable at a narrow Chrome panel width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 }); await page.goto('/');
  await page.getByLabel('Contribution goal').fill('Python first contribution'); await page.getByRole('button', { name: 'Find repositories', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'requests', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: 'docs/screenshots/narrow.png', fullPage: true });
});
test('repository summaries show sources and allow follow-up questions', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Repository', exact: true }).click();
  await page.getByLabel('GitHub repository').fill('https://github.com/psf/requests'); await page.getByRole('button', { name: 'Explain repository', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'About this repository' })).toBeVisible();
  await page.getByLabel('Repository question').fill('What should I learn first?'); await page.getByRole('button', { name: 'Ask about this repository' }).click();
  await expect(page.getByText('No implementation code or live activity was inspected.', { exact: false })).toBeVisible();
});
test('errors preserve the request and offer recovery', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Repository', exact: true }).click(); await page.getByLabel('GitHub repository').fill('https://github.com.evil.test/a/b');
  await page.getByRole('button', { name: 'Explain repository', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('GitHub');
});
