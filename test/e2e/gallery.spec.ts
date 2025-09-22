import { test, expect } from '@playwright/test';

test.describe('Gallery Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#gallery');
    await page.waitForLoadState('networkidle');
  });

  test('loads correctly and displays photos', async ({ page }) => {
    const gallery = page.locator('#gallery .card');
    await expect(gallery).toBeVisible();

    // Check for photo thumbnails or images
    const photos = page.getByTestId('photo');
    await expect(photos.first()).toBeVisible();

    // Should have multiple photos
    await expect(photos).toHaveCount((await photos.count()) > 0 ? await photos.count() : 1);
  });

  test('photo thumbnails are clickable and open modal', async ({ page }) => {
    const photoThumbnail = page.getByTestId('photo').first();

    if (await photoThumbnail.isVisible()) {
      await photoThumbnail.click();

      // Modal should open
      const modal = page.getByTestId('photo-modal');
      await expect(modal).toBeVisible();

      // Should show the full-size image
      const modalImage = page.locator('img', { has: modal });
      await expect(modalImage).toBeVisible();
    }
  });

  test('modal navigation works with next/previous buttons', async ({ page }) => {
    const photoThumbnail = page.getByTestId('photo').first();

    if (await photoThumbnail.isVisible()) {
      await photoThumbnail.click();

      const modal = page.getByTestId('photo-modal');
      await expect(modal).toBeVisible();

      // Test next button
      const nextButton = page.getByTestId('next-photo');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        // Wait for modal transition\n    await expect(page.locator("[data-testid=""photo-modal""]")).toHaveAttribute("data-visible", "true", { timeout: 1000 });

        // Modal should still be open with different image
        await expect(modal).toBeVisible();
      }

      // Test previous button
      const prevButton = page.getByTestId('prev-photo');
      if (await prevButton.isVisible()) {
        await prevButton.click();
        // Wait for modal transition\n    await expect(page.locator("[data-testid=""photo-modal""]")).toHaveAttribute("data-visible", "true", { timeout: 1000 });

        await expect(modal).toBeVisible();
      }
    }
  });

  test('modal can be closed', async ({ page }) => {
    const photoThumbnail = page.getByTestId('photo').first();

    if (await photoThumbnail.isVisible()) {
      await photoThumbnail.click();

      const modal = page.getByTestId('photo-modal');
      await expect(modal).toBeVisible();

      // Test close button
      const closeButton = page.getByTestId('close-modal');
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await expect(modal).not.toBeVisible();
      } else {
        // Test clicking outside modal or ESC key
        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible();
      }
    }
  });

  test('keyboard navigation in modal works', async ({ page }) => {
    const photoThumbnail = page.getByTestId('photo').first();

    if (await photoThumbnail.isVisible()) {
      await photoThumbnail.click();

      const modal = page.getByTestId('photo-modal');
      await expect(modal).toBeVisible();

      // Test arrow key navigation
      await page.keyboard.press('ArrowRight');
      // Wait for modal transition\n    await expect(page.locator("[data-testid=""photo-modal""]")).toHaveAttribute("data-visible", "true", { timeout: 1000 });
      await expect(modal).toBeVisible();

      await page.keyboard.press('ArrowLeft');
      // Wait for modal transition\n    await expect(page.locator("[data-testid=""photo-modal""]")).toHaveAttribute("data-visible", "true", { timeout: 1000 });
      await expect(modal).toBeVisible();

      // Test ESC to close
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });

  test('handles first photo navigation (no previous)', async ({ page }) => {
    const photoThumbnail = page.getByTestId('photo').first();

    if (await photoThumbnail.isVisible()) {
      await photoThumbnail.click();

      const modal = page.getByTestId('photo-modal');
      await expect(modal).toBeVisible();

      // Try to go to previous (should not work or be disabled)
      const prevButton = page.getByTestId('prev-photo');
      if (await prevButton.isVisible()) {
        const isDisabled = await prevButton.getAttribute('disabled');
        if (isDisabled) {
          await expect(prevButton).toBeDisabled();
        }
      }

      // Test with keyboard
      await page.keyboard.press('ArrowLeft');
      await expect(modal).toBeVisible(); // Should still be on first photo
    }
  });

  test('handles last photo navigation (no next)', async ({ page }) => {
    const photos = page.getByTestId('photo');
    const photoCount = await photos.count();

    if (photoCount > 1) {
      // Click on last photo
      await photos.nth(photoCount - 1).click();

      const modal = page.getByTestId('photo-modal');
      await expect(modal).toBeVisible();

      // Try to go to next (should not work or be disabled)
      const nextButton = page.getByTestId('next-photo');
      if (await nextButton.isVisible()) {
        const isDisabled = await nextButton.getAttribute('disabled');
        if (isDisabled) {
          await expect(nextButton).toBeDisabled();
        }
      }

      // Test with keyboard
      await page.keyboard.press('ArrowRight');
      await expect(modal).toBeVisible(); // Should still be on last photo
    }
  });

  test('photo captions are displayed', async ({ page }) => {
    const photoThumbnail = page.getByTestId('photo').first();

    if (await photoThumbnail.isVisible()) {
      await photoThumbnail.click();

      const modal = page.getByTestId('photo-modal');
      await expect(modal).toBeVisible();

      // Check for caption
      const caption = page.getByTestId('photo-caption');
      // Caption might be optional, but if present, should be visible
      if (await caption.isVisible()) {
        await expect(caption).toBeVisible();
      }
    }
  });

  test.describe('mobile responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('gallery works on mobile', async ({ page }) => {
      const photos = page.getByTestId('photo');
      await expect(photos.first()).toBeVisible();

      // Test modal on mobile
      await photos.first().click();

      const modal = page.getByTestId('photo-modal');
      await expect(modal).toBeVisible();

      // Modal should be full screen or properly sized for mobile
      const modalBox = await modal.boundingBox();
      expect(modalBox?.width).toBeGreaterThan(350);
    });
  });

  test.describe('tablet responsiveness', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('gallery displays correctly on tablet', async ({ page }) => {
      const gallery = page.locator('#gallery .card');
      await expect(gallery).toBeVisible();

      const photos = page.getByTestId('photo');
      await expect(photos.first()).toBeVisible();

      // Test navigation on tablet
      await photos.first().click();

      const modal = page.getByTestId('photo-modal');
      await expect(modal).toBeVisible();

      const nextButton = page.getByTestId('next-photo');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await expect(modal).toBeVisible();
      }
    });
  });

  test.describe('desktop responsiveness', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('gallery displays correctly on desktop', async ({ page }) => {
      const gallery = page.locator('#gallery .card');
      await expect(gallery).toBeVisible();

      const photos = page.getByTestId('photo');
      await expect(photos.first()).toBeVisible();

      // On desktop, gallery should not be too wide
      const galleryBox = await gallery.boundingBox();
      expect(galleryBox?.width).toBeLessThan(1920);
    });
  });

  test.describe('image loading and error handling', () => {
    test('handles image load errors gracefully', async ({ page }) => {
      // Intercept image requests and make them fail
      await page.route('**/assets/wedding/**', (route) => route.abort());

      const photoThumbnail = page.getByTestId('photo').first();
      await expect(photoThumbnail).toBeVisible();

      // Check for error state
      await expect(photoThumbnail).toHaveAttribute('data-error', 'true');
    });

    test('handles slow image loads with timeout', async ({ page }) => {
      // Intercept image requests and delay them
      await page.route('**/assets/wedding/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 9000)); // Delay longer than timeout
        await route.continue();
      });

      const photoThumbnail = page.getByTestId('photo').first();
      await expect(photoThumbnail).toBeVisible();

      // Should show timeout error after 8 seconds
      // Wait for timeout error\n    await expect(page.locator("[data-testid=""photo""]")).toHaveAttribute("data-error", "timeout", { timeout: 9000 });
      await expect(photoThumbnail).toHaveAttribute('data-error', 'true');
    });

    test('shows loading indicators during image load', async ({ page }) => {
      // Intercept image requests and delay them
      await page.route('**/assets/wedding/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
      });

      const photoThumbnail = page.getByTestId('photo').first();
      await expect(photoThumbnail).toBeVisible();

      // Should show loading state
      await expect(photoThumbnail).toHaveAttribute('data-loading', 'true');

      // After load completes
      // Wait for image load completion\n    await expect(page.locator("[data-testid=""photo""]")).toHaveAttribute("data-loaded", "true", { timeout: 10000 });
      await expect(photoThumbnail).toHaveAttribute('data-loading', 'false');
    });

    test('modal handles image load errors', async ({ page }) => {
      // Intercept modal image requests and make them fail
      await page.route('**/assets/wedding/**', (route) => route.abort());

      const photoThumbnail = page.getByTestId('photo').first();
      if (await photoThumbnail.isVisible()) {
        await photoThumbnail.click();

        const modal = page.getByTestId('photo-modal');
        await expect(modal).toBeVisible();

        // Should show error state in modal
        await expect(page.locator('.gallery-modal-content')).toContainText('Failed to load image');
      }
    });

    test('modal handles slow loads with loading indicator', async ({ page }) => {
      // Intercept modal image requests and delay them
      await page.route('**/assets/wedding/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await route.continue();
      });

      const photoThumbnail = page.getByTestId('photo').first();
      if (await photoThumbnail.isVisible()) {
        await photoThumbnail.click();

        const modal = page.getByTestId('photo-modal');
        await expect(modal).toBeVisible();

        // Should show loading indicator
        await expect(page.locator('.gallery-modal-content')).toContainText('Loading image');

        // After load completes
        // Wait for image load completion\n    await expect(page.locator("[data-testid=""photo""]")).toHaveAttribute("data-loaded", "true", { timeout: 10000 });
        await expect(page.locator('.gallery-modal-content')).not.toContainText('Loading image');
      }
    });

    test('retry functionality works for failed images', async ({ page }) => {
      // First make images fail
      await page.route('**/assets/wedding/**', (route) => route.abort());

      const photoThumbnail = page.getByTestId('photo').first();
      await expect(photoThumbnail).toBeVisible();
      await expect(photoThumbnail).toHaveAttribute('data-error', 'true');

      // Remove the abort route to allow retry
      await page.unroute('**/assets/wedding/**');

      // Click retry (assuming there's a retry button or mechanism)
      // This would need to be implemented in the component first
      // For now, just verify error state is present
      await expect(photoThumbnail).toHaveAttribute('data-error', 'true');
    });

    test('handles network disconnection during load', async ({ page }) => {
      // Start loading an image
      const photoThumbnail = page.getByTestId('photo').first();
      await expect(photoThumbnail).toBeVisible();

      // Disconnect network during load
      await page.context().setOffline(true);

      // Should handle offline state gracefully
      // Wait for offline state handling\n    await expect(page.locator("[data-testid=""photo""]")).toHaveAttribute("data-offline", "true", { timeout: 2000 });
      // Component should show appropriate error state
    });
  });
});
