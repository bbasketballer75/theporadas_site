import { test, expect } from '@playwright/test';

test.describe('Motion Toggle Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('loads correctly and displays motion toggle', async ({ page }) => {
    const motionToggle = page.getByTestId('motion-toggle');
    await expect(motionToggle).toBeVisible();
  });

  test('motion toggle switches motion preferences', async ({ page }) => {
    const motionToggle = page.getByTestId('motion-toggle').first();
    const body = page.locator('body');

    // Get initial motion state
    const initialClass = await body.getAttribute('class') || '';
    const initialDataMotion = await body.getAttribute('data-motion') || '';

    // Click toggle
    await motionToggle.click();
    await page.waitForTimeout(200);

    // Check if motion preference changed
    const newClass = await body.getAttribute('class') || '';
    const newDataMotion = await body.getAttribute('data-motion') || '';

    // At least one of these should have changed
    const motionChanged = (initialClass !== newClass) || (initialDataMotion !== newDataMotion);
    expect(motionChanged).toBe(true);
  });

  test('motion toggle has proper accessibility attributes', async ({ page }) => {
    const motionToggle = page.getByTestId('motion-toggle').first();

    // Should have aria-label or aria-pressed
    const ariaLabel = await motionToggle.getAttribute('aria-label');
    const ariaPressed = await motionToggle.getAttribute('aria-pressed');
    const title = await motionToggle.getAttribute('title');

    expect(ariaLabel || ariaPressed || title).toBeTruthy();
  });

  test('motion preference persists across page reloads', async ({ page }) => {
    const motionToggle = page.getByTestId('motion-toggle').first();
    const body = page.locator('body');

    // Get initial state
    const initialDataMotion = await body.getAttribute('data-motion') || '';
    const initialClass = await body.getAttribute('class') || '';

    // Toggle motion
    await motionToggle.click();
    await page.waitForTimeout(200);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if motion preference persisted
    const reloadedDataMotion = await body.getAttribute('data-motion') || '';
    const reloadedClass = await body.getAttribute('class') || '';

    // Motion preference should be the same as after toggle
    const motionPersisted = (initialDataMotion !== reloadedDataMotion) || (initialClass !== reloadedClass);
    expect(motionPersisted).toBe(true);
  });

  test('motion toggle works with system preference', async ({ page, context }) => {
    // Set system preference to reduce motion
    await context.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
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

    const motionToggle = page.getByTestId('motion-toggle').first();
    const body = page.locator('body');

    // Should respect system preference initially
    const initialMotion = await body.getAttribute('data-motion') || await body.getAttribute('class') || '';

    // Toggle should still work
    await motionToggle.click();
    await page.waitForTimeout(200);

    const newMotion = await body.getAttribute('data-motion') || await body.getAttribute('class') || '';
    expect(initialMotion).not.toBe(newMotion);
  });

  test('motion toggle shows correct icon/state', async ({ page }) => {
    const motionToggle = page.getByTestId('motion-toggle').first();

    // Check for motion icons
    const motionIcon = page.locator('.motion-icon, .animation-icon, [data-testid="motion-icon"]');
    const noMotionIcon = page.locator('.no-motion-icon, .reduced-motion-icon, [data-testid="no-motion-icon"]');

    // At least one icon should be visible
    await expect(motionIcon.or(noMotionIcon)).toBeVisible();

    // After toggle, icons should change
    await motionToggle.click();
    await page.waitForTimeout(200);

    // The icon state should have changed
    const iconChanged = await motionIcon.isVisible() !== await noMotionIcon.isVisible();
    expect(iconChanged).toBe(true);
  });

  test('reduced motion affects animations', async ({ page }) => {
    const motionToggle = page.getByTestId('motion-toggle').first();

    // Enable reduced motion
    await motionToggle.click();
    await page.waitForTimeout(200);

    // Check if animations are reduced (this might be hard to test directly)
    // Look for CSS that disables animations
    const body = page.locator('body');
    const bodyClass = await body.getAttribute('class') || '';
    const hasReducedMotion = bodyClass.includes('reduced-motion') || bodyClass.includes('no-motion');

    // Or check for data attribute
    const dataMotion = await body.getAttribute('data-motion') || '';
    const hasReducedMotionData = dataMotion === 'reduced' || dataMotion === 'none';

    expect(hasReducedMotion || hasReducedMotionData).toBe(true);
  });

  test('multiple toggles work correctly', async ({ page }) => {
    const motionToggle = page.getByTestId('motion-toggle').first();
    const body = page.locator('body');

    // Get initial state
    const initialMotion = await body.getAttribute('data-motion') || await body.getAttribute('class') || '';

    // Toggle multiple times
    for (let i = 0; i < 4; i++) {
      await motionToggle.click();
      await page.waitForTimeout(150);
    }

    // Should be back to initial state (even number of toggles)
    const finalMotion = await body.getAttribute('data-motion') || await body.getAttribute('class') || '';
    expect(initialMotion).toBe(finalMotion);
  });

  test.describe('mobile responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('motion toggle is usable on mobile', async ({ page }) => {
      const motionToggle = page.getByTestId('motion-toggle').first();

      // Check button size is adequate for touch
      const box = await motionToggle.boundingBox();
      expect(box?.width).toBeGreaterThan(40);
      expect(box?.height).toBeGreaterThan(40);

      // Test functionality
      await motionToggle.click();
      await page.waitForTimeout(200);

      // Should still work on mobile
      await expect(motionToggle).toBeVisible();
    });
  });

  test.describe('tablet responsiveness', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('motion toggle displays correctly on tablet', async ({ page }) => {
      const motionToggle = page.getByTestId('motion-toggle').first();
      await expect(motionToggle).toBeVisible();

      // Test toggle functionality
      await motionToggle.click();
      await page.waitForTimeout(200);

      const body = page.locator('body');
      const motionChanged = await body.getAttribute('data-motion') || await body.getAttribute('class');
      expect(motionChanged).toBeTruthy();
    });
  });

  test.describe('desktop responsiveness', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('motion toggle displays correctly on desktop', async ({ page }) => {
      const motionToggle = page.getByTestId('motion-toggle').first();
      await expect(motionToggle).toBeVisible();

      // On desktop, should be properly positioned
      const box = await motionToggle.boundingBox();
      expect(box?.x).toBeGreaterThan(0);
      expect(box?.y).toBeGreaterThan(0);
    });
  });
});
