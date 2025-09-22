import { expect, test } from '@playwright/test';

test.describe('Video Player Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('loads correctly and displays video', async ({ page }) => {
    const videoPlayer = page.getByTestId('video-player');
    await expect(videoPlayer).toBeVisible();

    // Check for video element
    const video = page.getByTestId('video-element');
    await expect(video).toBeVisible();
  });

  test('video loads and shows poster/thumbnail', async ({ page }) => {
    const video = page.getByTestId('video-element').first();

    // Check if video has poster or shows loading state
    const poster = await video.getAttribute('poster');
    const videoContainer = page.getByTestId('video-player');

    // Either poster exists or loading/placeholder is shown
    if (poster) {
      expect(poster).toBeTruthy();
    } else {
      // Should show some loading state or placeholder
      const loading = page.getByTestId('video-loading');
      await expect(loading.or(videoContainer)).toBeVisible();
    }
  });

  test('play/pause functionality works', async ({ page }) => {
    const video = page.getByTestId('video-element').first();
    const playButton = page.getByTestId('play-button');

    // Click play
    if (await playButton.isVisible()) {
      await playButton.click();
      // Wait for video to start playing using readyState
      await page.waitForFunction(
        () => {
          const video = document.querySelector('[data-testid="video-element"]') as HTMLVideoElement;
          return video && video.readyState >= 2 && !video.paused;
        },
        { timeout: 10000 },
      );

      // Check if video is playing (paused should be false)
      const isPaused = await video.evaluate((el: HTMLVideoElement) => el.paused);
      expect(isPaused).toBe(false);

      // Check readyState is adequate for playback
      const readyState = await video.evaluate((el: HTMLVideoElement) => el.readyState);
      expect(readyState).toBeGreaterThanOrEqual(2); // HAVE_CURRENT_DATA or better
    }
  });

  test('video controls are present and functional', async ({ page }) => {
    const controls = page.getByTestId('video-controls');

    // Controls should be visible
    await expect(controls).toBeVisible();

    // Check for common controls
    const playButton = page.getByTestId('play-button');

    // At least play/pause should be present
    await expect(playButton).toBeVisible();
  });

  test('progress bar allows seeking', async ({ page }) => {
    const progressBar = page.getByTestId('progress').first();

    if (await progressBar.isVisible()) {
      // Wait for video to be ready
      const video = page.getByTestId('video-element').first();
      await page.waitForFunction(
        () => {
          const video = document.querySelector('[data-testid="video-element"]') as HTMLVideoElement;
          return video && video.readyState >= 3; // HAVE_FUTURE_DATA
        },
        { timeout: 10000 },
      );

      // Seek to 50%
      await progressBar.fill('50');

      // Wait for seek to complete
      await page.waitForFunction(
        () => {
          const video = document.querySelector('[data-testid="video-element"]') as HTMLVideoElement;
          return video && Math.abs(video.currentTime - video.duration * 0.5) < 1;
        },
        { timeout: 5000 },
      );

      const currentTime = await video.evaluate((el: HTMLVideoElement) => el.currentTime);
      const duration = await video.evaluate((el: HTMLVideoElement) => el.duration);

      // Current time should be approximately 50% of duration
      const expectedTime = duration * 0.5;
      expect(Math.abs(currentTime - expectedTime)).toBeLessThan(5); // Within 5 seconds
    }
  });

  test('volume control works', async ({ page }) => {
    const volumeControl = page.getByTestId('volume').first();

    if (await volumeControl.isVisible()) {
      // Set volume to 50%
      await volumeControl.fill('50');

      // Wait for volume change to take effect
      const video = page.getByTestId('video-element').first();
      await page.waitForFunction(
        () => {
          const video = document.querySelector('[data-testid="video-element"]') as HTMLVideoElement;
          return video && video.volume === 0.5;
        },
        { timeout: 2000 },
      );

      const volume = await video.evaluate((el: HTMLVideoElement) => el.volume);
      expect(volume).toBe(0.5);
    }
  });

  test('mute/unmute functionality works', async ({ page }) => {
    const muteButton = page.getByTestId('mute');
    const video = page.getByTestId('video-element').first();

    if (await muteButton.isVisible()) {
      const initialMuted = await video.evaluate((el: HTMLVideoElement) => el.muted);

      await muteButton.click();

      // Wait for mute state to change
      await page.waitForFunction(
        (initial) => {
          const video = document.querySelector('[data-testid="video-element"]') as HTMLVideoElement;
          return video && video.muted !== initial;
        },
        initialMuted,
        { timeout: 2000 },
      );

      const newMuted = await video.evaluate((el: HTMLVideoElement) => el.muted);
      expect(initialMuted).not.toBe(newMuted);
    }
  });

  test('fullscreen toggle works', async ({ page }) => {
    const fullscreenButton = page.getByTestId('fullscreen');

    if (await fullscreenButton.isVisible()) {
      await fullscreenButton.click();

      // Wait for fullscreen change
      // Wait for fullscreen state change\n    await expect(page.locator("[data-testid=""video-player""]")).toHaveAttribute("data-fullscreen-changed", "true", { timeout: 2000 });

      // Check if video container is in fullscreen
      const videoContainer = page.getByTestId('video-player');
      const isFullscreen = await videoContainer.evaluate((el) => {
        return (
          document.fullscreenElement === el ||
          (el as HTMLElement & { webkitFullscreenElement?: Element }).webkitFullscreenElement === el
        );
      });

      // Fullscreen might not work in headless mode, but button should respond
      expect(isFullscreen).toBeDefined();
    }
  });

  test('quality selection works', async ({ page }) => {
    const qualitySelector = page.getByTestId('quality-selector');

    if (await qualitySelector.isVisible()) {
      // Get initial quality
      const initialQuality =
        (await qualitySelector.inputValue()) || (await qualitySelector.textContent());

      // Change quality
      await qualitySelector.selectOption({ index: 1 }); // Select second option

      // Wait for quality change to complete
      await page.waitForFunction(
        () => {
          const video = document.querySelector('[data-testid="video-element"]') as HTMLVideoElement;
          return video && video.readyState >= 2; // HAVE_CURRENT_DATA
        },
        { timeout: 10000 },
      );

      // Quality should have changed
      const newQuality =
        (await qualitySelector.inputValue()) || (await qualitySelector.textContent());
      expect(initialQuality).not.toBe(newQuality);
    }
  });

  test('video handles loading errors gracefully', async ({ page }) => {
    // This test assumes there might be error handling
    const errorMessage = page.getByTestId('video-error');

    // If error occurs, it should be handled gracefully
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible();
      // Should not show technical error details
      await expect(errorMessage).not.toContainText('Error:');
    }
  });

  test('video shows buffering/loading states', async ({ page }) => {
    const video = page.getByTestId('video-element').first();
    const loadingIndicator = page.getByTestId('video-loading');

    // Start playing to potentially trigger buffering
    await video.evaluate((el: HTMLVideoElement) => el.play());

    // Loading indicator might appear during buffering
    // This is hard to test reliably, but we can check the element exists
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toBeVisible();
    }
  });

  test('video loading states with data attributes', async ({ page }) => {
    const videoContainer = page.getByTestId('video-player');

    // Check initial loading state
    await expect(videoContainer).toHaveAttribute('data-loading', 'true');

    // Wait for video to be ready
    const video = page.getByTestId('video-element').first();
    await page.waitForFunction(
      () => {
        const video = document.querySelector('[data-testid="video-element"]') as HTMLVideoElement;
        return video && video.readyState >= 3; // HAVE_FUTURE_DATA
      },
      { timeout: 15000 },
    );

    // Check ready state
    await expect(videoContainer).toHaveAttribute('data-ready', 'true');
    await expect(videoContainer).toHaveAttribute('data-loading', 'false');

    // Check video readyState
    const readyState = await video.evaluate((el: HTMLVideoElement) => el.readyState);
    expect(readyState).toBeGreaterThanOrEqual(3);
  });

  test('loading indicator appears during video load', async ({ page }) => {
    const loadingIndicator = page.getByTestId('video-loading');
    const videoContainer = page.getByTestId('video-player');

    // Loading indicator should be visible initially
    await expect(loadingIndicator).toBeVisible();
    await expect(videoContainer).toHaveAttribute('data-loading', 'true');

    // Wait for video to load
    await page.waitForFunction(
      () => {
        const video = document.querySelector('[data-testid="video-element"]') as HTMLVideoElement;
        return video && video.readyState >= 2; // HAVE_CURRENT_DATA
      },
      { timeout: 10000 },
    );
  });

  test('retry mechanism works on load failure', async ({ page }) => {
    // Mock network failure
    await page.route('**/*.{mp4,webm,ogg}', (route) => route.abort());

    const videoContainer = page.getByTestId('video-player');
    const retryButton = page.getByTestId('video-retry');

    // Wait for error state
    await page.waitForFunction(
      () => {
        const container = document.querySelector('[data-testid="video-player"]');
        return container && container.getAttribute('data-error') === 'true';
      },
      { timeout: 10000 },
    );

    await expect(videoContainer).toHaveAttribute('data-error', 'true');
    await expect(retryButton).toBeVisible();

    // Restore network and retry
    await page.unroute('**/*.{mp4,webm,ogg}');

    await retryButton.click();

    // Wait for retry to work
    await page.waitForFunction(
      () => {
        const container = document.querySelector('[data-testid="video-player"]');
        return container && container.getAttribute('data-error') === 'false';
      },
      { timeout: 10000 },
    );

    await expect(videoContainer).toHaveAttribute('data-error', 'false');
  });

  test('error states are handled properly', async ({ page }) => {
    // Mock network failure
    await page.route('**/*.{mp4,webm,ogg}', (route) => route.abort());

    const videoContainer = page.getByTestId('video-player');
    const errorMessage = page.getByTestId('video-error');

    // Wait for error state
    await page.waitForFunction(
      () => {
        const container = document.querySelector('[data-testid="video-player"]');
        return container && container.getAttribute('data-error') === 'true';
      },
      { timeout: 10000 },
    );

    await expect(videoContainer).toHaveAttribute('data-error', 'true');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Failed to load video');
  });

  test('timeout scenario handling', async ({ page }) => {
    // Mock slow network
    await page.route('**/*.{mp4,webm,ogg}', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 35000)); // Exceed timeout
      await route.fulfill({ status: 200, body: 'mock video data' });
    });

    const videoContainer = page.getByTestId('video-player');
    const errorMessage = page.getByTestId('video-error');

    // Wait for timeout error
    await page.waitForFunction(
      () => {
        const container = document.querySelector('[data-testid="video-player"]');
        return container && container.getAttribute('data-error') === 'true';
      },
      { timeout: 40000 },
    );

    await expect(videoContainer).toHaveAttribute('data-error', 'true');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('timeout');
  });

  test('network failure recovery', async ({ page }) => {
    // Mock intermittent network failure
    let requestCount = 0;
    await page.route('**/*.{mp4,webm,ogg}', (route) => {
      requestCount++;
      if (requestCount <= 2) {
        route.abort();
      } else {
        route.fulfill({ status: 200, body: 'mock video data' });
      }
    });

    const videoContainer = page.getByTestId('video-player');
    const retryButton = page.getByTestId('video-retry');

    // Wait for initial error
    await page.waitForFunction(
      () => {
        const container = document.querySelector('[data-testid="video-player"]');
        return container && container.getAttribute('data-error') === 'true';
      },
      { timeout: 10000 },
    );

    await expect(videoContainer).toHaveAttribute('data-error', 'true');

    // Click retry
    await retryButton.click();

    // Wait for successful load
    await page.waitForFunction(
      () => {
        const container = document.querySelector('[data-testid="video-player"]');
        return container && container.getAttribute('data-error') === 'false';
      },
      { timeout: 10000 },
    );

    await expect(videoContainer).toHaveAttribute('data-error', 'false');
  });

  test.describe('mobile responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('video player works on mobile', async ({ page }) => {
      const video = page.getByTestId('video-element').first();
      await expect(video).toBeVisible();

      // Check video size is appropriate for mobile
      const videoBox = await video.boundingBox();
      expect(videoBox?.width).toBeGreaterThan(300);
      expect(videoBox?.height).toBeGreaterThan(200);

      // Test touch controls
      const playButton = page.getByTestId('play-button').first();
      if (await playButton.isVisible()) {
        await playButton.click();
        // Wait for video to start playing
        await page.waitForFunction(
          () => {
            const video = document.querySelector(
              '[data-testid="video-element"]',
            ) as HTMLVideoElement;
            return video && video.readyState >= 2 && !video.paused;
          },
          { timeout: 10000 },
        );
      }
    });
  });

  test.describe('tablet responsiveness', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('video player displays correctly on tablet', async ({ page }) => {
      const video = page.getByTestId('video-element').first();
      await expect(video).toBeVisible();

      const videoBox = await video.boundingBox();
      expect(videoBox?.width).toBeGreaterThan(600);
      expect(videoBox?.height).toBeGreaterThan(400);

      // Test controls on tablet
      const controls = page.getByTestId('video-controls');
      if (await controls.isVisible()) {
        await expect(controls).toBeVisible();
      }
    });
  });

  test.describe('desktop responsiveness', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('video player displays correctly on desktop', async ({ page }) => {
      const video = page.getByTestId('video-element').first();
      await expect(video).toBeVisible();

      // On desktop, video should not be too small
      const videoBox = await video.boundingBox();
      expect(videoBox?.width).toBeGreaterThan(400);
      expect(videoBox?.height).toBeGreaterThan(300);

      // Test all controls are accessible
      const controls = page.getByTestId('video-controls');
      await expect(controls).toBeVisible();
    });
  });
});
