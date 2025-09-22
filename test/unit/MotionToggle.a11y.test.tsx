import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';

import { MotionToggle } from '../src/components/MotionToggle';

import { runAxe, formatViolations } from './utils/axeHelper';

describe('MotionToggle accessibility', () => {
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
    document.documentElement.removeAttribute('data-motion');
  });

  it('has no a11y violations (system -> reduce)', async () => {
    setSystemPref(false);
    const { container, getByRole } = render(<MotionToggle />);
    let results = await runAxe(container);
    if (results.violations.length) {
      throw new Error(`Initial MotionToggle violations:\n${formatViolations(results.violations)}`);
    }
    const btn = getByRole('button');
    fireEvent.click(btn); // go to reduce
    results = await runAxe(container);
    if (results.violations.length) {
      throw new Error(
        `Post-reduce MotionToggle violations:\n${formatViolations(results.violations)}`,
      );
    }
    expect(results.violations.length).toBe(0);
  });
});
