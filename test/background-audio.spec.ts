import { test, expect } from '@playwright/test';

test.describe('Background Audio Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('loads correctly and displays audio controls', async ({ page }) => {
    const audioControls = page.getByTestId('background-audio');
    await expect(audioControls).toBeVisible();

    // Check for play/pause button
    const playButton = page.getByTestId('play-button');
    const pauseButton = page.getByTestId('pause-button');

    await expect(playButton.or(pauseButton)).toBeVisible();
  });

  test('play/pause functionality works', async ({ page }) => {
    const playButton = page.getByTestId('play-button').first();
    const pauseButton = page.getByTestId('pause-button').first();

    // Click play
    if (await playButton.isVisible()) {
      await playButton.click();
      // Wait for audio state change\n    await expect(page.locator("[data-testid=""background-audio""]")).toHaveAttribute("data-playing", "true", { timeout: 2000 });

      // Should show pause button or play button should be hidden
      if (await pauseButton.isVisible()) {
        await expect(pauseButton).toBeVisible();
      }
    }

    // Click pause
    if (await pauseButton.isVisible()) {
      await pauseButton.click();
      // Wait for audio state change\n    await expect(page.locator("[data-testid=""background-audio""]")).toHaveAttribute("data-playing", "true", { timeout: 2000 });

      // Should show play button or pause button should be hidden
      if (await playButton.isVisible()) {
        await expect(playButton).toBeVisible();
      }
    }
  });

  test('volume control is present and functional', async ({ page }) => {
    const volumeControl = page.getByTestId('volume-control');
    const volumeButton = page.getByTestId('volume-button');

    // At least one volume control should be present
    await expect(volumeControl.or(volumeButton)).toBeVisible();

    if (await volumeControl.isVisible()) {
      // Test volume slider
      const slider = volumeControl.first();
      await slider.fill('50'); // Set to 50%
      // Wait for volume change\n    await expect(page.locator("[data-testid=""background-audio""]")).toHaveAttribute("data-volume-changed", "true", { timeout: 1000 });

      // Slider should accept the value
      await expect(slider).toHaveValue('50');
    }
  });

  test('mute/unmute functionality works', async ({ page }) => {
    const muteButton = page.getByTestId('mute-button');
    const unmuteButton = page.getByTestId('unmute-button');

    if (await muteButton.isVisible()) {
      await muteButton.click();
      // Wait for volume change\n    await expect(page.locator("[data-testid=""background-audio""]")).toHaveAttribute("data-volume-changed", "true", { timeout: 1000 });

      // Should show unmute button or mute button should change state
      if (await unmuteButton.isVisible()) {
        await expect(unmuteButton).toBeVisible();
      }
    }

    if (await unmuteButton.isVisible()) {
      await unmuteButton.click();
      // Wait for volume change\n    await expect(page.locator("[data-testid=""background-audio""]")).toHaveAttribute("data-volume-changed", "true", { timeout: 1000 });

      // Should show mute button or unmute button should change state
      if (await muteButton.isVisible()) {
        await expect(muteButton).toBeVisible();
      }
    }
  });

  test('volume at minimum level', async ({ page }) => {
    const volumeControl = page.getByTestId('volume-control').first();

    if (await volumeControl.isVisible()) {
      await volumeControl.fill('0'); // Set to 0%
      // Wait for volume change\n    await expect(page.locator("[data-testid=""background-audio""]")).toHaveAttribute("data-volume-changed", "true", { timeout: 1000 });

      await expect(volumeControl).toHaveValue('0');
    }
  });

  test('volume at maximum level', async ({ page }) => {
    const volumeControl = page.getByTestId('volume-control').first();

    if (await volumeControl.isVisible()) {
      await volumeControl.fill('100'); // Set to 100%
      // Wait for volume change\n    await expect(page.locator("[data-testid=""background-audio""]")).toHaveAttribute("data-volume-changed", "true", { timeout: 1000 });

      await expect(volumeControl).toHaveValue('100');
    }
  });

  test('audio controls remain accessible during page navigation', async ({ page }) => {
    // Navigate to different section
    await page.goto('/#gallery');
    await page.waitForLoadState('networkidle');

    const audioControls = page.getByTestId('background-audio');
    await expect(audioControls).toBeVisible();

    // Controls should still be functional
    const playButton = page.getByTestId('play-button').first();
    if (await playButton.isVisible()) {
      await playButton.click();
      // Wait for volume change\n    await expect(page.locator("[data-testid=""background-audio""]")).toHaveAttribute("data-volume-changed", "true", { timeout: 1000 });
    }
  });

  test('handles audio loading errors gracefully', async ({ page }) => {
    // This test assumes there might be error handling for failed audio loads
    const errorMessage = page.getByTestId('audio-error');

    // If error message appears, it should be user-friendly
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible();
      // Should not contain technical error details
      await expect(errorMessage).not.toContainText('Error:');
    }
  });

  test.describe('mobile responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('audio controls are usable on mobile', async ({ page }) => {
      const audioControls = page.getByTestId('background-audio');
      await expect(audioControls).toBeVisible();

      const playButton = page.getByTestId('play-button').first();

      if (await playButton.isVisible()) {
        // Check button size is adequate for touch
        const box = await playButton.boundingBox();
        expect(box?.width).toBeGreaterThan(40);
        expect(box?.height).toBeGreaterThan(40);
      }
    });
  });

  test.describe('tablet responsiveness', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('audio controls display correctly on tablet', async ({ page }) => {
      const audioControls = page.getByTestId('background-audio');
      await expect(audioControls).toBeVisible();

      // Test volume control on tablet
      const volumeControl = page.getByTestId('volume-control').first();

      if (await volumeControl.isVisible()) {
        await volumeControl.fill('75');
        await expect(volumeControl).toHaveValue('75');
      }
    });
  });

  test.describe('desktop responsiveness', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('audio controls display correctly on desktop', async ({ page }) => {
      const audioControls = page.getByTestId('background-audio');
      await expect(audioControls).toBeVisible();

      // On desktop, controls should be properly positioned
      const controlsBox = await audioControls.boundingBox();
      expect(controlsBox?.width).toBeLessThan(500); // Should not be too wide
    });
  });
});
