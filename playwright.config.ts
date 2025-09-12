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
      threshold: 0.2, // 0.2% pixel difference threshold
      maxDiffPixels: 100, // Maximum number of different pixels allowed
    },
  },
  reporter: [['list']],
  use: {
    baseURL: process.env.PW_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        screenshot: 'on',
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        screenshot: 'on',
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        screenshot: 'on',
      },
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
