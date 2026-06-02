import { test, expect } from '@playwright/test';

test('home page has a non-empty title', async ({ page }) => {
  await page.goto('/');
  const title = await page.title();
  expect(title.trim().length).toBeGreaterThan(0);
});
