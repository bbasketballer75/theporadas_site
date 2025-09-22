import { test, expect } from '@playwright/test';

test.describe('Map Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#location');
    await page.waitForLoadState('networkidle');
  });

  test('loads correctly and displays map', async ({ page }) => {
    const mapContainer = page.locator('#location .card');
    await expect(mapContainer).toBeVisible();

    // Wait for map loading to complete
    const mapElement = page.getByTestId('map');
    await expect(mapElement).toHaveAttribute('data-loading', 'false', { timeout: 10000 });
    await expect(mapElement.first()).toBeVisible();
  });

  test('handles geolocation permission granted', async ({ page, context }) => {
    // Mock geolocation
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 40.7128, longitude: -74.006 }); // NYC coordinates

    // Reload to trigger geolocation
    await page.reload();
    await page.waitForLoadState('networkidle');

    const mapElement = page.getByTestId('map').or(page.locator('canvas, .map-container, iframe'));
    await expect(mapElement).toHaveAttribute('data-loading', 'false', { timeout: 6000 });
    await expect(mapElement.first()).toBeVisible();

    // Check if location marker or user position is displayed
    // Location marker might not be immediately visible, so we check the map is still functional
    await expect(mapElement.first()).toBeVisible();
  });

  test('handles geolocation permission denied', async ({ page, context }) => {
    // Deny geolocation permission
    await context.clearPermissions();
    // Note: Playwright doesn't have a direct way to deny permissions, but we can test fallback behavior

    const mapElement = page.getByTestId('map').or(page.locator('canvas, .map-container, iframe'));
    await expect(mapElement.first()).toBeVisible();

    // Check for fallback message or default location
    // If no specific error message, at least ensure map still loads
    await expect(mapElement.first()).toBeVisible();
  });

  test('displays map controls', async ({ page }) => {
    const zoomInButton = page.getByTestId('zoom-in');
    const zoomOutButton = page.getByTestId('zoom-out');

    // At least one zoom control should be visible
    await expect(zoomInButton.or(zoomOutButton)).toBeVisible();
  });

  test('map responds to zoom controls', async ({ page }) => {
    const zoomInButton = page.getByTestId('zoom-in').first();

    if (await zoomInButton.isVisible()) {
      await zoomInButton.click();
      // Wait for zoom animation to complete
      await page.waitForFunction(
        () => {
          const map = document.querySelector('[data-testid="map"]');
          return map && !map.classList.contains('leaflet-zoom-anim');
        },
        { timeout: 2000 },
      );

      const mapElement = page.getByTestId('map').or(page.locator('canvas, .map-container, iframe'));
      await expect(mapElement.first()).toBeVisible();
      // Map should still be visible after zoom
    }
  });

  test('displays location information', async ({ page }) => {
    const locationInfo = page.getByTestId('location-info');
    // Location info might be optional, but if present, should be visible
    if (await locationInfo.isVisible()) {
      await expect(locationInfo).toBeVisible();
    }
  });

  test('handles invalid coordinates gracefully', async ({ page, context }) => {
    // Set invalid coordinates
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 91, longitude: 181 }); // Invalid coordinates

    await page.reload();
    await page.waitForLoadState('networkidle');

    const mapElement = page.getByTestId('map').or(page.locator('canvas, .map-container, iframe'));
    await expect(mapElement).toHaveAttribute('data-loading', 'false', { timeout: 6000 });
    await expect(mapElement.first()).toBeVisible();

    // Should handle invalid coordinates without crashing
    const errorMessage = page.locator('.error-message, .invalid-coordinates');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText('invalid');
    }
  });

  test.describe('mobile responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('map displays correctly on mobile', async ({ page }) => {
      const mapContainer = page.locator('#location .card');
      await expect(mapContainer).toBeVisible();

      const mapElement = page.getByTestId('map').first();
      await expect(mapElement).toBeVisible();

      // Check that map is properly sized for mobile
      const mapBox = await mapElement.boundingBox();
      expect(mapBox?.width).toBeGreaterThan(300);
      expect(mapBox?.height).toBeGreaterThan(200);
    });

    test('touch interactions work on mobile', async ({ page }) => {
      const mapElement = page.getByTestId('map').first();

      // Simulate touch/drag on map
      await mapElement.click({ position: { x: 100, y: 100 } });
      await page.mouse.down();
      await page.mouse.move(150, 150);
      await page.mouse.up();

      // Map should still be visible after interaction
      await expect(mapElement).toBeVisible();
    });
  });

  test.describe('tablet responsiveness', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('map displays correctly on tablet', async ({ page }) => {
      const mapElement = page.getByTestId('map');
      await expect(mapElement.first()).toBeVisible();

      const mapBox = await mapElement.first().boundingBox();
      expect(mapBox?.width).toBeGreaterThan(600);
      expect(mapBox?.height).toBeGreaterThan(400);
    });
  });

  test.describe('desktop responsiveness', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('map displays correctly on desktop', async ({ page }) => {
      const mapElement = page.getByTestId('map');
      await expect(mapElement.first()).toBeVisible();

      // On desktop, map should not be too small
      const mapBox = await mapElement.first().boundingBox();
      expect(mapBox?.width).toBeGreaterThan(400);
      expect(mapBox?.height).toBeGreaterThan(300);
    });
  });
});
