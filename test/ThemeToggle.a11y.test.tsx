import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';

import { ThemeToggle } from '../src/components/ThemeToggle';

import { runAxe, formatViolations } from './utils/axeHelper';

describe('ThemeToggle accessibility', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('has no a11y violations (initial + after toggle)', async () => {
    const { container, getByRole } = render(<ThemeToggle />);
    let results = await runAxe(container);
    if (results.violations.length) {
      throw new Error(`Initial ThemeToggle violations:\n${formatViolations(results.violations)}`);
    }
    const btn = getByRole('button');
    fireEvent.click(btn);
    results = await runAxe(container);
    if (results.violations.length) {
      throw new Error(
        `Post-toggle ThemeToggle violations:\n${formatViolations(results.violations)}`,
      );
    }
    expect(results.violations.length).toBe(0);
  });
});
