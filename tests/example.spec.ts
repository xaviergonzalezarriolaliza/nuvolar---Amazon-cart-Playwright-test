import { test, expect } from '@playwright/test';

test('simple Amazon search shows results', async ({ page }) => {
  await page.goto('https://www.amazon.com');

  const search = page.locator('input#twotabsearchtextbox, input[name="field-keywords"], input[aria-label*="Search"]').first();
  await expect(search).toBeVisible({ timeout: 20000 });
  await search.fill('hats for men');
  await search.press('Enter');

  await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 30000 });
  const count = await page.locator('[data-component-type="s-search-result"]').count();
  expect(count).toBeGreaterThan(0);
});
