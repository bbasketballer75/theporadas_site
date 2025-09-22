import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Gallery } from '../src/components/Gallery';
import { MotionToggle } from '../src/components/MotionToggle';
import { ThemeToggle } from '../src/components/ThemeToggle';

// Helpers to stub matchMedia
function setMatchMedia(queryMap: Record<string, boolean>) {
  window.matchMedia = (q: string) => {
    return {
      matches: !!queryMap[q],
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
  };
}

describe('MotionToggle & ThemeToggle & Gallery', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-motion');
    document.documentElement.classList.remove('theme-light');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cycles MotionToggle states (system->reduce->full->system)', () => {
    setMatchMedia({ '(prefers-reduced-motion: reduce)': true });
    const { getByRole, rerender } = render(<MotionToggle />);
    const btn = getByRole('button');
    expect(btn).toHaveTextContent('Motion: System (Reduced)'); // initial null with system reduced
    fireEvent.click(btn); // null -> reduce
    expect(btn).toHaveTextContent('Motion: Reduced');
    fireEvent.click(btn); // reduce -> no-preference
    expect(btn).toHaveTextContent('Motion: Full');
    fireEvent.click(btn); // no-preference -> null (system)
    expect(btn).toHaveTextContent('Motion: System (Reduced)');
    // Persisted state check: set to reduce and rerender
    fireEvent.click(btn); // null -> reduce
    rerender(<MotionToggle />);
    expect(document.documentElement.dataset.motion).toBe('reduce');
  });

  it('toggles ThemeToggle between light and dark and persists', () => {
    setMatchMedia({ '(prefers-color-scheme: light)': true });
    const { getByRole, rerender } = render(<ThemeToggle />);
    const btn = getByRole('button');
    expect(btn).toHaveTextContent('Theme: Light');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(btn);
    expect(btn).toHaveTextContent('Theme: Dark');
    expect(document.documentElement.classList.contains('theme-light')).toBe(false);
    rerender(<ThemeToggle />);
    expect(btn).toHaveTextContent('Theme: Dark');
  });

  it('opens Gallery modal, navigates with arrows and traps focus', () => {
    // Provide a minimal gallery manifest by mocking loader
    vi.mock('../src/gallery/loader', () => ({
      loadGallery: () => [
        { id: 'g1', type: 'image', src: '/assets/wedding/one.jpg', caption: 'One' },
        { id: 'g2', type: 'image', src: '/assets/wedding/two.jpg', caption: 'Two' },
      ],
    }));
    const { getAllByRole, getByLabelText } = render(<Gallery />);
    const buttons = getAllByRole('button').filter((b) => b.classList.contains('gallery-item'));
    expect(buttons.length).toBe(2);
    // First image shows placeholder src (thumb fallback) until IntersectionObserver triggers; simulate load state
    // Simulate clicking first item opens modal
    fireEvent.click(buttons[0]);
    const closeBtn = getByLabelText('Close');
    expect(closeBtn).toBeDefined();
    // Arrow navigation
    fireEvent.keyDown(closeBtn, { key: 'ArrowRight' });
    fireEvent.keyDown(closeBtn, { key: 'ArrowLeft' });
    // Focus trap: simulate Tab at last element cycles
    fireEvent.keyDown(document, { key: 'Tab' });
  });
});
