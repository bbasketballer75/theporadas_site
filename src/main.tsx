import * as Sentry from '@sentry/react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './skipLinkFocus';
import { initCoreWebVitals } from './utils/performance';
import { registerServiceWorker } from './utils/pwa';

const isTestRuntime =
  (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.VITEST === '1' ||
  (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.NODE_ENV === 'test' ||
  Boolean((import.meta as unknown as { vitest?: boolean }).vitest);

if (!isTestRuntime) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0,
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });

  // Initialize Core Web Vitals tracking
  initCoreWebVitals();

  // Register Service Worker for PWA functionality
  registerServiceWorker();
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');
createRoot(rootEl).render(<App />);
