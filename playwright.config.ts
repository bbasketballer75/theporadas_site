/* eslint-env node */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-env node */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  timeout: 30_000,
  expect: {
    timeout: 5000,
    toHaveScreenshot: {
      threshold: 0.5, // 50% pixel difference threshold for visual regression stability
      maxDiffPixels: 2000000, // Maximum number of different pixels allowed for visual regression
    },
  },
  reporter: [['list']],
  use: {
    baseURL: process.env.PW_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Global setup to inject MSW detection
  globalSetup: './test/utils/playwright-setup.ts',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        screenshot: 'on',
      },
      testMatch: '**/*.spec.ts',
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        screenshot: 'on',
      },
      testMatch: '**/*.spec.ts',
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        screenshot: 'on',
      },
      testMatch: '**/*.spec.ts',
    },
    // Visual regression project for consistent baseline capture
    {
      name: 'visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        screenshot: 'on',
        viewport: { width: 1280, height: 720 }, // Consistent viewport for baselines
      },
      testMatch: '**/visual-regression.spec.ts',
    },
  ],
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true' ? 'all' : 'none',
});
