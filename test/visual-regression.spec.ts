import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.describe('Gallery Component', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/#gallery');
      await page.waitForLoadState('networkidle');
    });

    test('gallery grid layout matches baseline', async ({ page }) => {
      const gallery = page.locator('#gallery .card');
      await expect(gallery).toBeVisible();

      // Wait for images to load
      await page.waitForFunction(() => {
        const images = document.querySelectorAll('#gallery img');
        return Array.from(images).every((img) => img.complete && img.naturalHeight > 0);
      });

      // Take screenshot of gallery grid
      await expect(gallery).toHaveScreenshot('gallery-grid.png', {
        fullPage: false,
        mask: [
          page.locator('[data-testid="photo"]').locator('[data-loading="true"]'),
          page.locator('[data-testid="photo"]').locator('[data-error="true"]'),
        ],
      });
    });

    test('gallery modal matches baseline', async ({ page }) => {
      const photoThumbnail = page.getByTestId('photo').first();

      if (await photoThumbnail.isVisible()) {
        await photoThumbnail.click();

        const modal = page.getByTestId('photo-modal');
        await expect(modal).toBeVisible();

        // Wait for modal image to load
        await page.waitForFunction(() => {
          const modalImg = document.querySelector('[data-testid="photo-modal"] img');
          return modalImg && modalImg.complete && modalImg.naturalHeight > 0;
        });

        // Take screenshot of modal
        await expect(modal).toHaveScreenshot('gallery-modal.png', {
          fullPage: false,
          mask: [page.locator('.gallery-modal-content [data-loading="true"]')],
        });
      }
    });

    test('gallery responsive layout on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const gallery = page.locator('#gallery .card');
      await expect(gallery).toBeVisible();

      await expect(gallery).toHaveScreenshot('gallery-mobile.png', {
        fullPage: false,
      });
    });

    test('gallery responsive layout on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      const gallery = page.locator('#gallery .card');
      await expect(gallery).toBeVisible();

      await expect(gallery).toHaveScreenshot('gallery-tablet.png', {
        fullPage: false,
      });
    });
  });

  test.describe('Family Tree Component', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/#family-tree');
      await page.waitForLoadState('networkidle');

      // Wait for family tree container to appear (may show loading or error state)
      await page.waitForSelector(
        '[data-testid="family-tree"], .family-tree-loading, .family-tree-error',
        { timeout: 10000 },
      );
    });

    test('family tree container matches baseline', async ({ page }) => {
      const familyTreeContainer = page
        .locator('[data-testid="family-tree"], .family-tree-loading, .family-tree-error')
        .first();
      await expect(familyTreeContainer).toBeVisible();

      // Take screenshot of the family tree area (loading, error, or rendered state)
      await expect(familyTreeContainer).toHaveScreenshot('family-tree-container.png', {
        fullPage: false,
      });
    });

    test('family tree responsive layout on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const familyTreeContainer = page
        .locator('[data-testid="family-tree"], .family-tree-loading, .family-tree-error')
        .first();
      await expect(familyTreeContainer).toBeVisible();

      await expect(familyTreeContainer).toHaveScreenshot('family-tree-mobile.png', {
        fullPage: false,
      });
    });

    test('family tree responsive layout on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      const familyTreeContainer = page
        .locator('[data-testid="family-tree"], .family-tree-loading, .family-tree-error')
        .first();
      await expect(familyTreeContainer).toBeVisible();

      await expect(familyTreeContainer).toHaveScreenshot('family-tree-tablet.png', {
        fullPage: false,
      });
    });
  });

  test.describe('Navigation Component', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    test('navigation area matches baseline', async ({ page }) => {
      // Try to find navigation by test ID or class
      const navigation = page.locator('[data-testid="site-nav"], .site-nav, nav').first();
      await expect(navigation).toBeVisible();

      // Take screenshot of navigation area
      await expect(navigation).toHaveScreenshot('navigation-area.png', {
        fullPage: false,
      });
    });

    test('navigation with gallery section matches baseline', async ({ page }) => {
      // Navigate to gallery section
      await page.goto('/#gallery');
      await page.waitForLoadState('networkidle');

      const navigation = page.locator('[data-testid="site-nav"], .site-nav, nav').first();
      await expect(navigation).toBeVisible();

      // Take screenshot with navigation state
      await expect(navigation).toHaveScreenshot('navigation-gallery-section.png', {
        fullPage: false,
      });
    });

    test('navigation mobile layout matches baseline', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const navigation = page.locator('[data-testid="site-nav"], .site-nav, nav').first();
      await expect(navigation).toBeVisible();

      await expect(navigation).toHaveScreenshot('navigation-mobile-layout.png', {
        fullPage: false,
      });
    });

    test('navigation tablet layout matches baseline', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      const navigation = page.locator('[data-testid="site-nav"], .site-nav, nav').first();
      await expect(navigation).toBeVisible();

      await expect(navigation).toHaveScreenshot('navigation-tablet-layout.png', {
        fullPage: false,
      });
    });
  });

  test.describe('Full Page Visual Regression', () => {
    test('home page layout matches baseline', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Take screenshot of main content area
      const mainContent = page.locator('body');
      await expect(mainContent).toHaveScreenshot('home-page-layout.png', {
        fullPage: false,
        mask: [
          page.locator('[data-loading="true"]'),
          page.locator('[data-testid="photo"][data-error="true"]'),
        ],
      });
    });

    test('gallery section layout matches baseline', async ({ page }) => {
      await page.goto('/#gallery');
      await page.waitForLoadState('networkidle');

      const gallerySection = page.locator('#gallery');
      await expect(gallerySection).toBeVisible();

      await expect(gallerySection).toHaveScreenshot('gallery-section-layout.png', {
        fullPage: false,
        mask: [
          page.locator('[data-loading="true"]'),
          page.locator('[data-testid="photo"][data-error="true"]'),
        ],
      });
    });

    test('family tree section layout matches baseline', async ({ page }) => {
      await page.goto('/#family-tree');
      await page.waitForLoadState('networkidle');

      const familyTreeSection = page.locator('#family-tree');
      await expect(familyTreeSection).toBeVisible();

      await expect(familyTreeSection).toHaveScreenshot('family-tree-section-layout.png', {
        fullPage: false,
      });
    });
  });
});
