import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useHashNavigation } from '../src/hooks/useHashNavigation';

describe('useHashNavigation', () => {
  it('updates hash state and focuses target when focus=true', () => {
    document.body.innerHTML = '<div id="target" />';
    const focusSpy = vi.spyOn(document.getElementById('target') as HTMLElement, 'focus');
    const { result } = renderHook(() => useHashNavigation(true));
    expect(result.current.hash).toBe('');
    act(() => {
      window.location.hash = '#target';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current.hash).toBe('target');
    expect(focusSpy).toHaveBeenCalled();
  });

  it('updates hash but does not focus when focus=false', () => {
    document.body.innerHTML = '<div id="nfocus" />';
    const focusSpy = vi.spyOn(document.getElementById('nfocus') as HTMLElement, 'focus');
    const { result } = renderHook(() => useHashNavigation(false));
    act(() => {
      window.location.hash = '#nfocus';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current.hash).toBe('nfocus');
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('applies initial hash on mount if present', () => {
    document.body.innerHTML = '<div id="initEl" />';
    window.location.hash = '#initEl';
    const { result } = renderHook(() => useHashNavigation(true));
    expect(result.current.hash).toBe('initEl');
  });

  it('handles missing target element gracefully', () => {
    document.body.innerHTML = '';
    window.location.hash = '#nope';
    const { result } = renderHook(() => useHashNavigation(true));
    expect(result.current.hash).toBe('nope');
  });
});
