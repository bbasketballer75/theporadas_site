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
  Sentry.init({
    dsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 1.0,
  });
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
