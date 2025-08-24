import { useEffect, useState } from 'react';

export type MotionPreference = 'reduce' | 'no-preference';

function readAttribute(): MotionPreference | null {
  if (typeof document === 'undefined') return null;
  const attr = document.documentElement.getAttribute('data-motion');
  return attr === 'reduce' || attr === 'no-preference' ? attr : null;
}

function systemPref(): MotionPreference | null {
  if (typeof window === 'undefined' || !window.matchMedia) return null;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'reduce'
      : 'no-preference';
  } catch {
    return null;
  }
}

export function useMotionPreference(): MotionPreference {
  const [pref, setPref] = useState<MotionPreference>(
    () => readAttribute() || systemPref() || 'no-preference',
  );

  useEffect(() => {
    const docEl = document.documentElement;
    const observer = new MutationObserver(() => {
      const next = readAttribute();
      if (next && next !== pref) setPref(next);
    });
    observer.observe(docEl, {
      attributes: true,
      attributeFilter: ['data-motion'],
    });

    // Fallback: listen to system changes
    let mql: MediaQueryList | null = null;
    if (window.matchMedia) {
      try {
        mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handler = () => {
          if (!readAttribute()) setPref(mql!.matches ? 'reduce' : 'no-preference');
        };
        mql.addEventListener('change', handler);
        return () => {
          observer.disconnect();
          mql?.removeEventListener('change', handler);
        };
      } catch {
        // ignore
      }
    }
    return () => observer.disconnect();
  }, [pref]);

  return pref;
}
