import { createRoot } from 'react-dom/client';

import App from './App';
import './skipLinkFocus';

// Initialize Sentry for error tracking
import * as Sentry from '@sentry/react';

// Initialize performance monitoring
import { initCoreWebVitals } from './utils/performance';

// Initialize PWA Service Worker
import { registerServiceWorker } from './utils/pwa';

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
  tracesSampleRate: 1.0, // Capture 100% of the transactions
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

// Initialize Core Web Vitals tracking
initCoreWebVitals();

// Register Service Worker for PWA functionality
registerServiceWorker();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');
createRoot(rootEl).render(<App />);
