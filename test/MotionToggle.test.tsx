import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { MotionToggle } from '../src/components/MotionToggle';

describe('MotionToggle', () => {
  const originalMatchMedia = window.matchMedia;

  function setSystemPref(reduced: boolean) {
    window.matchMedia = (query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  beforeEach(() => {
    window.localStorage.clear();
    window.matchMedia = originalMatchMedia;
  });

  it('uses system preference (no local override) reduced', () => {
    setSystemPref(true);
    const { getByRole } = render(<MotionToggle />);
    const btn = getByRole('button');
    expect(btn).toHaveTextContent('System (Reduced)');
  });

  it('cycles through reduce -> full -> system -> reduce', () => {
    setSystemPref(false);
    const { getByRole } = render(<MotionToggle />);
    const btn = getByRole('button');
    // Initially system full
    expect(btn).toHaveTextContent('System');
    fireEvent.click(btn); // sets reduce
    expect(btn).toHaveTextContent('Reduced');
    fireEvent.click(btn); // sets no-preference
    expect(btn).toHaveTextContent('Full');
    fireEvent.click(btn); // sets null (system again)
    expect(btn).toHaveTextContent('System');
  });

  it('sets data-motion attribute and tolerates localStorage errors', () => {
    setSystemPref(false);
    const setItem = vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new Error('fail');
    });
    const removeItem = vi
      .spyOn(window.localStorage.__proto__, 'removeItem')
      .mockImplementation(() => {
        throw new Error('fail');
      });
    const { getByRole } = render(<MotionToggle />);
    const btn = getByRole('button');
    fireEvent.click(btn); // reduce
    expect(document.documentElement.dataset.motion).toBe('reduce');
    fireEvent.click(btn); // no-preference
    expect(document.documentElement.dataset.motion).toBe('no-preference');
    fireEvent.click(btn); // system (null)
    expect(document.documentElement.getAttribute('data-motion')).toBeNull();
    setItem.mockRestore();
    removeItem.mockRestore();
  });
});
