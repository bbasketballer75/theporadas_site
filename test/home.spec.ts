import { test, expect } from '@playwright/test';

// Basic visual regression of landing page hero area
test('home page loads and matches snapshot', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const hero = page.locator('body');
  await expect(hero).toHaveScreenshot('home-body.png');
});
