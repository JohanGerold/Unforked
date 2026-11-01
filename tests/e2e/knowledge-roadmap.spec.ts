import { expect, test } from '@playwright/test';

test('learning is grouped by language and library, with profile matches and separate evidence limits', async ({ page }) => {
  const source = { id: 'psf/requests:manifest', label: 'Dependency manifest: pyproject.toml', url: 'https://github.com/psf/requests/blob/main/pyproject.toml', excerpt: 'pytest' };
  await page.route('**/v1/learning-path', async route => {
    const input = route.request().postDataJSON();
    await route.fulfill({ json: { requestId: input.requestId, demo: false, aiProvider: 'ollama', checkedAt: new Date().toISOString(), sources: [source], data: { overview: 'Knowledge needed for the Python HTTP library.', languages: [{ name: 'Python', priority: 'core', depth: 'working', concepts: ['Functions', 'Classes and objects'], libraries: [{ name: 'pytest', priority: 'core', concepts: ['Fixtures', 'Parametrization'], sourceIds: [source.id] }], reason: 'The library and its tests use Python.', sourceIds: [source.id] }], supportingSkills: [], limitations: ['Only selected source snippets were inspected.'], sourceIds: [source.id] } } });
  });
  await page.goto('/'); await page.getByRole('button', { name: 'Your skills', exact: true }).click();
  await page.getByLabel('Languages').fill('Python'); await page.getByLabel('Concepts you know').fill('Functions'); await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await page.getByLabel('Contribution goal').fill('Python tests'); await page.getByRole('button', { name: 'Find repositories', exact: true }).click();
  await page.getByRole('button', { name: 'Learning path for psf/requests' }).click();
  await expect(page.getByRole('heading', { name: 'What to learn', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Python', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'pytest', exact: true })).toBeVisible();
  await expect(page.getByText('Fixtures', { exact: true })).toBeVisible();
  await expect(page.getByText('Listed in your profile', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Classes and objects', { exact: true })).toBeVisible();
  await expect(page.getByText(/need to learn|lack knowledge|no known concepts/i)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Your next steps' })).toHaveCount(0);
  await page.getByText('Evidence and limits', { exact: true }).click();
  await expect(page.getByText('Only selected source snippets were inspected.', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '.superpowers/knowledge-roadmap.png', fullPage: true });
});
