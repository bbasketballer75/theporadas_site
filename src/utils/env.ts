export const IS_DEV: boolean = (() => {
  try {
    return (
      typeof import.meta !== 'undefined' &&
      Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV)
    );
  } catch {
    return false;
  }
})();

export const VITE_SENTRY_DSN: string | undefined = (() => {
  try {
    return (import.meta as unknown as { env?: { VITE_SENTRY_DSN?: string } }).env?.VITE_SENTRY_DSN;
  } catch {
    return undefined;
  }
})();
