/* eslint-env node */
/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig, devices } from '@playwright/test';

const proc =
  typeof globalThis !== 'undefined' && globalThis.process ? globalThis.process : undefined;

export default defineConfig({
  testDir: './pw-tests',
  timeout: 30_000,
  expect: { timeout: 5000 },
  reporter: [['list']],
  use: {
    baseURL: proc?.env.PW_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
