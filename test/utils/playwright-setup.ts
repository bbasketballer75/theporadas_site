// Global setup for Playwright to enable MSW in browser context
export default async function globalSetup() {
  // This runs before all tests
  console.log('[Playwright Setup] MSW will be enabled for browser tests');

  // We don't need to do anything here since MSW detection is handled in the app
  // The key is that Playwright tests run against the dev server which now imports MSW setup
}
