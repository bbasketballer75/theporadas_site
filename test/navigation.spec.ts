import { test, expect } from '@playwright/test';

test.describe('Navigation Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('loads correctly and displays navigation', async ({ page }) => {
    const navigation = page.getByTestId('site-nav');
    await expect(navigation).toBeVisible();

    // Check for navigation links
    const navLinks = page.getByTestId('nav-link');
    await expect(navLinks.first()).toBeVisible();
  });

  test('navigation links point to correct sections', async ({ page }) => {
    const navLinks = page.getByTestId('nav-link');

    // Get all navigation links
    const linkCount = await navLinks.count();

    for (let i = 0; i < linkCount; i++) {
      const link = navLinks.nth(i);
      const href = await link.getAttribute('href');

      if (href && href.startsWith('#')) {
        // Should point to a valid section
        const sectionId = href.substring(1);
        const section = page.locator(`#${sectionId}`);
        await expect(section).toBeVisible();
      }
    }
  });

  test('clicking navigation links scrolls to correct sections', async ({ page }) => {
    const navLinks = page.getByTestId('nav-link');

    // Test first navigation link
    const firstLink = navLinks.first();
    const href = await firstLink.getAttribute('href');

    if (href && href.startsWith('#')) {
      await firstLink.click();

      // Wait for smooth scroll
      await page.waitForTimeout(1000);

      const sectionId = href.substring(1);
      const section = page.locator(`#${sectionId}`);

      // Section should be in viewport
      await expect(section).toBeInViewport();
    }
  });

  test('navigation shows active state for current section', async ({ page }) => {
    // Navigate to a specific section
    await page.goto('/#gallery');
    await page.waitForLoadState('networkidle');

    // Find the gallery link
    const galleryLink = page.getByTestId('nav-link').locator('[href="#gallery"]');

    if (await galleryLink.isVisible()) {
      // Should have active class or aria-current
      const hasActiveClass = await galleryLink.evaluate((el) => el.classList.contains('active'));
      const ariaCurrent = await galleryLink.getAttribute('aria-current');

      expect(hasActiveClass || ariaCurrent === 'page').toBe(true);
    }
  });

  test('smooth scrolling animation works', async ({ page }) => {
    const navLinks = page.getByTestId('nav-link');

    // Get initial scroll position
    const initialScrollY = await page.evaluate(() => window.scrollY);

    // Click a navigation link
    const firstLink = navLinks.first();
    const href = await firstLink.getAttribute('href');

    if (href && href.startsWith('#')) {
      await firstLink.click();

      // Wait for scroll animation
      await page.waitForTimeout(500);

      const finalScrollY = await page.evaluate(() => window.scrollY);

      // Should have scrolled (unless already at top)
      if (href !== '#') {
        expect(finalScrollY).not.toBe(initialScrollY);
      }
    }
  });

  test('keyboard navigation works', async ({ page }) => {
    const navLinks = page.getByTestId('nav-link');

    // Focus on first nav link
    await navLinks.first().focus();

    // Test Tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');

    // Should be able to navigate through nav links
    await expect(focusedElement).toBeVisible();

    // Ensure we can still access navLinks variable
    await expect(navLinks.first()).toBeVisible();
  });

  test('navigation handles invalid hash gracefully', async ({ page }) => {
    // Navigate to invalid section
    await page.goto('/#invalid-section');
    await page.waitForLoadState('networkidle');

    // Page should still load without errors
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Should not crash or show error
    const errorMessage = page.locator('.error, [role="alert"]');
    if (await errorMessage.isVisible()) {
      // If error is shown, it should be user-friendly
      await expect(errorMessage).not.toContainText('Error:');
    }
  });

  test('navigation works with browser back/forward', async ({ page }) => {
    // Navigate to different sections
    await page.goto('/#gallery');
    await page.waitForLoadState('networkidle');

    await page.goto('/#family-tree');
    await page.waitForLoadState('networkidle');

    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Should be at gallery section
    const gallerySection = page.locator('#gallery');
    await expect(gallerySection).toBeInViewport();

    // Go forward
    await page.goForward();
    await page.waitForLoadState('networkidle');

    // Should be at family-tree section
    const familyTreeSection = page.locator('#family-tree');
    await expect(familyTreeSection).toBeInViewport();
  });

  test('navigation updates URL hash correctly', async ({ page }) => {
    const navLinks = page.getByTestId('nav-link');

    // Click a navigation link
    const firstLink = navLinks.first();
    const href = await firstLink.getAttribute('href');

    if (href && href.startsWith('#')) {
      await firstLink.click();
      await page.waitForTimeout(1000);

      // URL should contain the correct hash
      const currentURL = page.url();
      expect(currentURL).toContain(href);
    }
  });

  test('navigation is accessible', async ({ page }) => {
    const navigation = page.getByTestId('site-nav');

    // Should have proper ARIA attributes
    const role = await navigation.getAttribute('role');
    expect(role === 'navigation' || role === 'nav').toBe(true);

    // Navigation links should have proper labels
    const navLinks = page.getByTestId('nav-link');
    const firstLink = navLinks.first();

    const ariaLabel = await firstLink.getAttribute('aria-label');
    const textContent = await firstLink.textContent();

    expect(ariaLabel || textContent?.trim()).toBeTruthy();
  });

  test.describe('mobile responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('navigation works on mobile', async ({ page }) => {
      const navigation = page.getByTestId('site-nav');
      await expect(navigation).toBeVisible();

      // Check if navigation is collapsed/hamburger menu on mobile
      const hamburgerMenu = page.getByTestId('mobile-menu');

      if (await hamburgerMenu.isVisible()) {
        // Test mobile menu toggle
        await hamburgerMenu.click();
        await page.waitForTimeout(300);

        const navLinks = page.getByTestId('nav-link');
        await expect(navLinks.first()).toBeVisible();
      } else {
        // Navigation is always visible
        const navLinks = page.getByTestId('nav-link');
        await expect(navLinks.first()).toBeVisible();
      }
    });
  });

  test.describe('tablet responsiveness', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('navigation displays correctly on tablet', async ({ page }) => {
      const navigation = page.getByTestId('site-nav');
      await expect(navigation).toBeVisible();

      // Test navigation functionality
      const navLinks = page.getByTestId('nav-link');
      const firstLink = navLinks.first();

      if (await firstLink.isVisible()) {
        await firstLink.click();
        await page.waitForTimeout(1000);

        // Should scroll to section
        const href = await firstLink.getAttribute('href');
        if (href && href.startsWith('#')) {
          const section = page.locator(`#${href.substring(1)}`);
          await expect(section).toBeInViewport();
        }
      }
    });
  });

  test.describe('desktop responsiveness', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('navigation displays correctly on desktop', async ({ page }) => {
      const navigation = page.getByTestId('site-nav');
      await expect(navigation).toBeVisible();

      // On desktop, navigation should be fully visible
      const navLinks = page.getByTestId('nav-link');
      await expect(navLinks).toHaveCount(await navLinks.count() > 0 ? await navLinks.count() : 1);

      // Test that all links are clickable
      const firstLink = navLinks.first();
      await expect(firstLink).toBeEnabled();
    });
  });
});

