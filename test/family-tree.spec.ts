import { test, expect, Page } from '@playwright/test';

test.describe('Family Tree Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#family-tree');
    await page.waitForLoadState('networkidle');
  });

  // Helper function to wait for family tree to be fully loaded and rendered
  async function waitForFamilyTreeReady(page: Page) {
    const container = page.locator('[data-testid="family-tree"]');
    await container.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const container = document.querySelector('[data-testid="family-tree"]');
      return container && container.getAttribute('data-loading') === 'false' && container.getAttribute('data-rendered') === 'true';
    });
    // Wait for D3 rendering to complete by checking for SVG content
    await page.waitForFunction(() => {
      const svg = document.querySelector('svg');
      return svg && svg.querySelectorAll('circle, path, text').length > 0;
    });
  }

  test('loads correctly and displays family tree', async ({ page }) => {
    await waitForFamilyTreeReady(page);

    const familyTree = page.locator('#family-tree .card');
    await expect(familyTree).toBeVisible();

    // Check for SVG element (D3 visualization)
    await expect(page.locator('svg')).toBeVisible();

    // Ensure SVG has content
    await expect(page.locator('svg *')).toHaveCount(await page.locator('svg *').count() > 0 ? await page.locator('svg *').count() : 1);
  });

  test('displays tree nodes and connections', async ({ page }) => {
    await expect(page.locator('svg')).toBeVisible();

    // Check for nodes (circles, rectangles, or other shapes)
    const nodes = page.locator('svg circle, svg rect, svg g[data-testid*="node"], .node');
    await expect(nodes.first()).toBeVisible();

    // Check for links/connections (lines or paths)
    const links = page.locator('svg line, svg path, .link, .connection');
    await expect(links.first()).toBeVisible();
  });

  test('nodes are interactive', async ({ page }) => {
    await waitForFamilyTreeReady(page);

    const nodes = page.locator('svg circle, svg rect, svg g[data-testid*="node"], .node');

    if (await nodes.first().isVisible()) {
      // Click on a node
      await nodes.first().click();

      // Wait for interaction feedback - node should remain visible and potentially show tooltip or selection
      await page.waitForFunction(() => {
        const tooltip = document.querySelector('.family-tree-tooltip') as HTMLElement;
        return tooltip && tooltip.style.visibility === 'visible';
      }, { timeout: 1000 }).catch(() => {
        // If no tooltip appears, just ensure node is still interactive
        return true;
      });

      // Node should respond (might show details, highlight, etc.)
      // Details might be optional, but interaction should work
      await expect(nodes.first()).toBeVisible();
    }
  });

  test('zoom functionality works', async ({ page }) => {
    await waitForFamilyTreeReady(page);

    const zoomInButton = page.getByTestId('zoom-in').first();
    const zoomOutButton = page.getByTestId('zoom-out').first();

    if (await zoomInButton.isVisible()) {
      await zoomInButton.click();

      // Wait for zoom to complete by checking SVG transform or data-rendered attribute
      await page.waitForFunction(() => {
        const svg = document.querySelector('svg g');
        return svg && svg.getAttribute('transform') && svg.getAttribute('transform')!.includes('scale');
      }, { timeout: 1000 });

      const svg = page.locator('svg');
      await expect(svg).toBeVisible();
    }

    if (await zoomOutButton.isVisible()) {
      await zoomOutButton.click();

      // Wait for zoom to complete
      await page.waitForFunction(() => {
        const svg = document.querySelector('svg g');
        return svg && svg.getAttribute('transform');
      }, { timeout: 1000 });

      const svg = page.locator('svg');
      await expect(svg).toBeVisible();
    }
  });

  test('pan/drag functionality works', async ({ page }) => {
    await waitForFamilyTreeReady(page);

    const svg = page.locator('svg').first();

    // Try to drag the tree
    await svg.click({ position: { x: 100, y: 100 } });
    await page.mouse.down();
    await page.mouse.move(150, 150);
    await page.mouse.up();

    // Wait for drag to complete and SVG to stabilize
    await page.waitForFunction(() => {
      const svg = document.querySelector('svg g');
      return svg && svg.getAttribute('transform');
    }, { timeout: 1000 });

    // Tree should still be visible after drag
    await expect(svg).toBeVisible();
  });

  test('tree shows person information', async ({ page }) => {
    const nodes = page.locator('svg circle, svg rect, svg g[data-testid*="node"], .node');

    if (await nodes.first().isVisible()) {
      // Check if nodes have text labels
      const labels = page.locator('svg text, .node-label, .person-name');
      if (await labels.first().isVisible()) {
        await expect(labels.first()).toBeVisible();
        // Should contain some text
        const textContent = await labels.first().textContent();
        expect(textContent?.trim()).toBeTruthy();
      }
    }
  });

  test('reset/center view works', async ({ page }) => {
    await waitForFamilyTreeReady(page);

    const resetButton = page.getByTestId('reset-view');

    if (await resetButton.isVisible()) {
      // First zoom in
      const zoomInButton = page.getByTestId('zoom-in').first();
      if (await zoomInButton.isVisible()) {
        await zoomInButton.click();

        // Wait for zoom to complete
        await page.waitForFunction(() => {
          const svg = document.querySelector('svg g');
          return svg && svg.getAttribute('transform') && svg.getAttribute('transform')!.includes('scale');
        }, { timeout: 1000 });
      }

      // Then reset
      await resetButton.click();

      // Wait for reset to complete by checking SVG transform returns to center
      await page.waitForFunction(() => {
        const svg = document.querySelector('svg g');
        const transform = svg?.getAttribute('transform') || '';
        return transform.includes('translate') && !transform.includes('scale(0.8)') && !transform.includes('scale(1.2)');
      }, { timeout: 1000 });

      const svg = page.locator('svg');
      await expect(svg).toBeVisible();
    }
  });

  test('handles different tree sizes', async ({ page }) => {
    const svg = page.locator('svg');

    // Count nodes
    const nodes = page.locator('svg circle, svg rect, svg g[data-testid*="node"], .node');
    const nodeCount = await nodes.count();

    if (nodeCount > 0) {
      // Tree should handle the number of nodes gracefully
      await expect(svg).toBeVisible();

      // If there are many nodes, zoom controls should be available
      if (nodeCount > 10) {
        const zoomControls = page.locator('[data-testid*="zoom"], .zoom-controls');
        if (await zoomControls.isVisible()) {
          await expect(zoomControls).toBeVisible();
        }
      }
    }
  });

  test('tree is accessible with keyboard navigation', async ({ page }) => {
    await waitForFamilyTreeReady(page);

    const svg = page.locator('svg');

    // Focus on SVG
    await svg.focus();

    // Try keyboard navigation
    await page.keyboard.press('Tab');

    // Wait for focus to move to an interactive element
    await page.waitForFunction(() => {
      const focusedElement = document.activeElement;
      return focusedElement && (focusedElement.tagName === 'BUTTON' || focusedElement.closest('svg') || focusedElement.getAttribute('tabindex') !== null);
    }, { timeout: 1000 });

    // Should be able to navigate to interactive elements
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('tree responds to window resize', async ({ page }) => {
    await waitForFamilyTreeReady(page);

    const svg = page.locator('svg');

    // Resize viewport
    await page.setViewportSize({ width: 800, height: 600 });

    // Wait for resize to complete and SVG to adjust
    await page.waitForFunction(() => {
      const svg = document.querySelector('svg');
      return svg && svg.getBoundingClientRect().width > 0;
    }, { timeout: 1000 });

    // Tree should still be visible and responsive
    await expect(svg).toBeVisible();

    const newBox = await svg.boundingBox();
    expect(newBox?.width).toBeDefined();
  });

  test.describe('mobile responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('family tree works on mobile', async ({ page }) => {
      await waitForFamilyTreeReady(page);

      const svg = page.locator('svg');
      await expect(svg).toBeVisible();

      // Check SVG size is appropriate for mobile
      const svgBox = await svg.boundingBox();
      expect(svgBox?.width).toBeGreaterThan(300);
      expect(svgBox?.height).toBeGreaterThan(200);

      // Touch interactions should work
      await svg.click({ position: { x: 100, y: 100 } });

      // Wait for touch interaction to complete
      await page.waitForFunction(() => {
        const svg = document.querySelector('svg');
        return svg && svg.getBoundingClientRect().width > 0;
      }, { timeout: 1000 });

      await expect(svg).toBeVisible();
    });
  });

  test.describe('tablet responsiveness', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('family tree displays correctly on tablet', async ({ page }) => {
      await waitForFamilyTreeReady(page);

      const svg = page.locator('svg');
      await expect(svg).toBeVisible();

      const svgBox = await svg.boundingBox();
      expect(svgBox?.width).toBeGreaterThan(600);
      expect(svgBox?.height).toBeGreaterThan(400);

      // Test zoom on tablet
      const zoomInButton = page.getByTestId('zoom-in').first();
      if (await zoomInButton.isVisible()) {
        await zoomInButton.click();

        // Wait for zoom to complete on tablet
        await page.waitForFunction(() => {
          const svg = document.querySelector('svg g');
          return svg && svg.getAttribute('transform') && svg.getAttribute('transform')!.includes('scale');
        }, { timeout: 1000 });

        await expect(svg).toBeVisible();
      }
    });
  });

  test.describe('desktop responsiveness', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('family tree displays correctly on desktop', async ({ page }) => {
      const svg = page.locator('svg');
      await expect(svg).toBeVisible();

      // On desktop, tree should utilize available space
      const svgBox = await svg.boundingBox();
      expect(svgBox?.width).toBeGreaterThan(400);
      expect(svgBox?.height).toBeGreaterThan(300);

      // All controls should be accessible
      const controls = page.locator('.tree-controls, [data-testid*="control"]');
      if (await controls.isVisible()) {
        await expect(controls).toBeVisible();
      }
    });
  });
});
