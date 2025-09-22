import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { ThemeToggle } from '../src/components/ThemeToggle';

describe('ThemeToggle system light preference', () => {
  it('initializes to light when system prefers light', () => {
    const original = window.matchMedia;
    // @ts-expect-error override
    window.matchMedia = (q: string) => ({
      matches: q.includes('prefers-color-scheme: light'),
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
    const { getByRole } = render(<ThemeToggle />);
    const btn = getByRole('button');
    expect(btn).toHaveTextContent('Theme: Light');
    fireEvent.click(btn);
    expect(btn).toHaveTextContent('Theme: Dark');
    window.matchMedia = original;
  });
});
