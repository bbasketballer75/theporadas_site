// Ensures that activating the skip link moves focus to the main content region.
// This improves accessibility because some browsers will scroll but not shift focus
// when navigating to an in-page anchor whose target is only programmatically focusable (tabIndex=-1).

function focusMainIfHashMatches() {
  if (location.hash === '#appShell') {
    const main = document.getElementById('appShell');
    if (main) {
      // Ensure it can receive focus programmatically
      if (!(main as HTMLElement).hasAttribute('tabindex')) {
        (main as HTMLElement).setAttribute('tabindex', '-1');
      }
      (main as HTMLElement).focus();
    }
  }
}

export function setupSkipLinkFocus() {
  // Run on initial load (in case of deep-link with hash)
  focusMainIfHashMatches();

  // Listen for hash changes triggered by anchor activation
  window.addEventListener('hashchange', focusMainIfHashMatches);

  // Also capture explicit click on skip link to force focus sooner (before hashchange fires)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (target && target.matches('a.skip-link')) {
      // Allow default to update hash, then focus in microtask
      queueMicrotask(() => focusMainIfHashMatches());
    }
  });
}

// Auto-initialize if running in a real browser environment.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Use DOMContentLoaded to ensure #appShell exists (it is rendered by React; run after hydration start)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupSkipLinkFocus();
    });
  } else {
    setupSkipLinkFocus();
  }
}
