import { createRoot } from 'react-dom/client';

import App from './App';
import './skipLinkFocus';
import { VITE_SENTRY_DSN } from './utils/env';
import './utils/msw'; // MSW setup for Playwright tests
import { initCoreWebVitals } from './utils/performance';
import { registerServiceWorker } from './utils/pwa';
import { initSentry } from './utils/sentryClient';

const isTestRuntime =
  (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.VITEST === '1' ||
  (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.NODE_ENV === 'test' ||
  Boolean((import.meta as unknown as { vitest?: boolean }).vitest);

if (!isTestRuntime) {
  // Initialize Sentry lazily to keep main bundle slim
  initSentry(VITE_SENTRY_DSN);

  // Initialize Core Web Vitals tracking
  initCoreWebVitals();

  // Register Service Worker for PWA functionality
  registerServiceWorker();
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');
const root = createRoot(rootEl);
root.render(<App />);

// Provide a cleanup hook during tests to avoid work after teardown
if (isTestRuntime) {
  (globalThis as unknown as { __unmountApp?: () => void }).__unmountApp = () => {
    try {
      root.unmount();
    } catch {
      // no-op in case root already unmounted
    }
  };
}
