import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { useMotionPreference } from '../src/hooks/useMotionPreference';

describe('useMotionPreference attribute change', () => {
  it('updates preference when data-motion attribute changes', async () => {
    document.documentElement.removeAttribute('data-motion');
    // @ts-expect-error test override
    window.matchMedia = () => ({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
    const { result } = renderHook(() => useMotionPreference());
    expect(result.current).toBe('no-preference');
    await act(async () => {
      document.documentElement.setAttribute('data-motion', 'reduce');
      // Allow mutation observer callback
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current).toBe('reduce');
  });
});
