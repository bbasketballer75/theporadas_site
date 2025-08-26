import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMotionPreference } from '../src/hooks/useMotionPreference';

describe('useMotionPreference', () => {
  it('follows data-motion attribute then falls back to system and reacts to system change', () => {
    document.documentElement.setAttribute('data-motion', 'reduce');
    const listeners: Array<() => void> = [];
    type EventListenerOrEventListenerObject =
      | ((evt: Event) => void)
      | { handleEvent: (evt: Event) => void };
    interface MutableMQL extends MediaQueryList {
      matches: boolean;
    }
    const mql: MutableMQL = {
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        // Store only callable listeners we can invoke in tests
        if (typeof listener === 'function') listeners.push(() => listener(new Event('change')));
      },
      removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        if (typeof listener === 'function') {
          const idx = listeners.findIndex((l) => l.name === listener.name);
          if (idx >= 0) listeners.splice(idx, 1);
        }
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    };

    const originalMatch = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      if (query.includes('prefers-reduced-motion')) return mql;
      return { matches: false } as MediaQueryList;
    });

    const { result } = renderHook(() => useMotionPreference());
    expect(result.current).toBe('reduce');

    document.documentElement.removeAttribute('data-motion');
    mql.matches = true;
    act(() => {
      listeners.forEach((l) => l());
    });
    expect(result.current).toBe('reduce');

    mql.matches = false;
    act(() => {
      listeners.forEach((l) => l());
    });
    expect(result.current).toBe('no-preference');

    window.matchMedia = originalMatch;
  });

  it('gracefully handles matchMedia throwing and defaults', () => {
    document.documentElement.removeAttribute('data-motion');
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation(() => {
      throw new Error('boom');
    });
    const { result } = renderHook(() => useMotionPreference());
    expect(result.current).toBe('no-preference');
    window.matchMedia = original;
  });
});
