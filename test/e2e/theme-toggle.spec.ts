import { test, expect } from '@playwright/test';

test.describe('Theme Toggle Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('loads correctly and displays theme toggle', async ({ page }) => {
    const themeToggle = page.getByTestId('theme-toggle');
    await expect(themeToggle).toBeVisible();
  });

  test('theme toggle switches between light and dark modes', async ({ page }) => {
    const themeToggle = page.getByTestId('theme-toggle').first();
    const body = page.locator('body');

    // Get initial theme
    const initialClass = (await body.getAttribute('class')) || '';
    const initialDataTheme = (await body.getAttribute('data-theme')) || '';

    // Click toggle
    await themeToggle.click();
    await page.waitForTimeout(300); // Wait for theme transition

    // Check if theme changed
    const newClass = (await body.getAttribute('class')) || '';
    const newDataTheme = (await body.getAttribute('data-theme')) || '';

    // At least one of these should have changed
    const themeChanged = initialClass !== newClass || initialDataTheme !== newDataTheme;
    expect(themeChanged).toBe(true);
  });

  test('theme toggle has proper accessibility attributes', async ({ page }) => {
    const themeToggle = page.getByTestId('theme-toggle').first();

    // Should have aria-label or aria-pressed
    const ariaLabel = await themeToggle.getAttribute('aria-label');
    const ariaPressed = await themeToggle.getAttribute('aria-pressed');
    const title = await themeToggle.getAttribute('title');

    expect(ariaLabel || ariaPressed || title).toBeTruthy();
  });

  test('theme persists across page reloads', async ({ page }) => {
    const themeToggle = page.getByTestId('theme-toggle').first();
    const body = page.locator('body');

    // Get initial theme
    const initialDataTheme = (await body.getAttribute('data-theme')) || '';
    const initialClass = (await body.getAttribute('class')) || '';

    // Toggle theme
    await themeToggle.click();
    await page.waitForTimeout(300);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if theme persisted
    const reloadedDataTheme = (await body.getAttribute('data-theme')) || '';
    const reloadedClass = (await body.getAttribute('class')) || '';

    // Theme should be the same as after toggle
    const themePersisted = initialDataTheme !== reloadedDataTheme || initialClass !== reloadedClass;
    expect(themePersisted).toBe(true);
  });

  test('theme toggle works with system preference', async ({ page, context }) => {
    // Set system preference to dark
    await context.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {},
        }),
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const themeToggle = page.getByTestId('theme-toggle').first();
    const body = page.locator('body');

    // Should respect system preference initially
    const initialTheme =
      (await body.getAttribute('data-theme')) || (await body.getAttribute('class')) || '';

    // Toggle should still work
    await themeToggle.click();
    await page.waitForTimeout(300);

    const newTheme =
      (await body.getAttribute('data-theme')) || (await body.getAttribute('class')) || '';
    expect(initialTheme).not.toBe(newTheme);
  });

  test('theme toggle shows correct icon/state', async ({ page }) => {
    const themeToggle = page.getByTestId('theme-toggle').first();

    // Check for theme icons
    const sunIcon = page.locator('.sun-icon, .light-icon, [data-testid="sun-icon"]');
    const moonIcon = page.locator('.moon-icon, .dark-icon, [data-testid="moon-icon"]');

    // At least one icon should be visible
    await expect(sunIcon.or(moonIcon)).toBeVisible();

    // After toggle, icons should change
    await themeToggle.click();
    await page.waitForTimeout(300);

    // The icon state should have changed (either visibility or class)
    const iconChanged = (await sunIcon.isVisible()) !== (await moonIcon.isVisible());
    expect(iconChanged).toBe(true);
  });

  test('multiple toggles work correctly', async ({ page }) => {
    const themeToggle = page.getByTestId('theme-toggle').first();
    const body = page.locator('body');

    // Get initial state
    const initialTheme =
      (await body.getAttribute('data-theme')) || (await body.getAttribute('class')) || '';

    // Toggle multiple times
    for (let i = 0; i < 4; i++) {
      await themeToggle.click();
      await page.waitForTimeout(200);
    }

    // Should be back to initial state (even number of toggles)
    const finalTheme =
      (await body.getAttribute('data-theme')) || (await body.getAttribute('class')) || '';
    expect(initialTheme).toBe(finalTheme);
  });

  test.describe('mobile responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('theme toggle is usable on mobile', async ({ page }) => {
      const themeToggle = page.getByTestId('theme-toggle').first();

      // Check button size is adequate for touch
      const box = await themeToggle.boundingBox();
      expect(box?.width).toBeGreaterThan(40);
      expect(box?.height).toBeGreaterThan(40);

      // Test functionality
      await themeToggle.click();
      await page.waitForTimeout(300);

      // Should still work on mobile
      await expect(themeToggle).toBeVisible();
    });
  });

  test.describe('tablet responsiveness', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('theme toggle displays correctly on tablet', async ({ page }) => {
      const themeToggle = page.getByTestId('theme-toggle').first();
      await expect(themeToggle).toBeVisible();

      // Test toggle functionality
      await themeToggle.click();
      await page.waitForTimeout(300);

      const body = page.locator('body');
      const themeChanged =
        (await body.getAttribute('data-theme')) || (await body.getAttribute('class'));
      expect(themeChanged).toBeTruthy();
    });
  });

  test.describe('desktop responsiveness', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('theme toggle displays correctly on desktop', async ({ page }) => {
      const themeToggle = page.getByTestId('theme-toggle').first();
      await expect(themeToggle).toBeVisible();

      // On desktop, should be properly positioned
      const box = await themeToggle.boundingBox();
      expect(box?.x).toBeGreaterThan(0);
      expect(box?.y).toBeGreaterThan(0);
    });
  });
});
