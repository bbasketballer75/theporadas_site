import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { useMotionPreference } from '../src/hooks/useMotionPreference';

describe('useMotionPreference system change', () => {
  it('updates when system media query changes and no attribute present', () => {
    // Setup fake matchMedia with change event support
    let matches = false;
    const listeners: Array<(ev?: unknown) => void> = [];
    // @ts-expect-error override
    window.matchMedia = () =>
      ({
        get matches() {
          return matches;
        },
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addListener: (fn: () => void) => listeners.push(fn),
        removeListener: () => {},
        addEventListener: (_: string, fn: (ev?: unknown) => void) => listeners.push(fn),
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as typeof window.matchMedia;
    const { result } = renderHook(() => useMotionPreference());
    expect(result.current).toBe('no-preference');
    matches = true;
    act(() => {
      listeners.forEach((l) => l({ matches: true }));
    });
    expect(result.current).toBe('reduce');
  });
});
