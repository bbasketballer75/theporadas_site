/* eslint-disable import/no-extraneous-dependencies */
import { setupWorker } from 'msw/browser';

import { createApiHandlers } from '../../test/mocks/apiMocks';

// Determine if we're running in Playwright tests
// For now, enable MSW when running on localhost:5173 (Playwright's dev server)
const isPlaywrightTest =
  window.location.hostname === 'localhost' && window.location.port === '5173';

// Only set up MSW in test environments
if (isPlaywrightTest) {
  // Use a relative base URL for MSW to intercept all requests
  const baseUrl = '';

  const worker = setupWorker(...createApiHandlers(baseUrl));

  // Start the worker
  worker.start({
    onUnhandledRequest: 'warn', // Warn about unhandled requests instead of erroring
    quiet: true, // Reduce console noise
  });

  // Make worker available globally for debugging
  (globalThis as unknown as { mswWorker: typeof worker }).mswWorker = worker;

  console.log('[MSW] Mock Service Worker started for Playwright tests');
}
