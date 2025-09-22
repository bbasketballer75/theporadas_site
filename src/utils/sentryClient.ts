let sentryPromise: Promise<typeof import('@sentry/react')> | null = null;

function loadSentry() {
  if (!sentryPromise) {
    sentryPromise = import('@sentry/react');
  }
  return sentryPromise;
}

export async function initSentry(dsn: string | undefined) {
  if (!dsn) return;
  const Sentry = await loadSentry();
  const release: string | undefined =
    (globalThis as unknown as { __GIT_SHA__?: string }).__GIT_SHA__ ||
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GIT_SHA ||
    undefined;
  const environment: string =
    (import.meta as unknown as { env?: Record<string, string> }).env?.MODE ||
    (import.meta as unknown as { env?: Record<string, string> }).env?.NODE_ENV ||
    'production';
  Sentry.init({
    dsn,
    release,
    environment,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: environment === 'production' ? 0.3 : 1.0,
  });
  // Lazy import web-vitals and send as custom measurements (non-blocking)
  try {
    // dynamic import only if browser
    if (typeof window !== 'undefined') {
      const { onCLS, onLCP, onINP } = await import('web-vitals');
      type Metric = { value: number };
      const send = (name: string, metric: Metric) => {
        void setMeasurement(name, metric.value);
      };
      onCLS((m) => send('CLS', m));
      onLCP((m) => send('LCP', m));
      onINP((m) => send('INP', m));
    }
  } catch {
    // ignore failures silently
  }
}

export type SentryLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' | 'critical';
export type SentryBreadcrumb = {
  category?: string;
  message?: string;
  level?: SentryLevel;
  data?: Record<string, unknown>;
};

export async function addBreadcrumb(breadcrumb: SentryBreadcrumb) {
  try {
    const Sentry = await loadSentry();
    type S = typeof import('@sentry/react');
    Sentry.addBreadcrumb(breadcrumb as Parameters<S['addBreadcrumb']>[0]);
  } catch {
    return;
  }
}

export async function setMeasurement(name: string, value: number, unit?: string) {
  try {
    const Sentry = await loadSentry();
    const anySentry = Sentry as unknown as {
      setMeasurement?: (n: string, v: number, u?: string) => void;
    };
    anySentry.setMeasurement?.(name, value, unit);
  } catch {
    return;
  }
}

export async function captureMessage(
  message: string,
  options?: { level?: SentryLevel; extra?: Record<string, unknown> },
) {
  try {
    const Sentry = await loadSentry();
    type S = typeof import('@sentry/react');
    Sentry.captureMessage(message, options as Parameters<S['captureMessage']>[1]);
  } catch {
    return;
  }
}
