import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { useMotionPreference } from '../src/hooks/useMotionPreference';

describe('useMotionPreference without matchMedia', () => {
  it('defaults to no-preference when system API missing and no attribute', () => {
    const original = window.matchMedia;
    // @ts-expect-error test override of matchMedia
    window.matchMedia = undefined;
    document.documentElement.removeAttribute('data-motion');
    const { result } = renderHook(() => useMotionPreference());
    expect(result.current).toBe('no-preference');
    window.matchMedia = original;
  });
});
