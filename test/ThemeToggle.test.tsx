import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ThemeToggle } from '../src/components/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    cleanup();
    document.documentElement.classList.remove('theme-light');
    localStorage.clear();
  });

  it('initializes with stored theme', () => {
    localStorage.setItem('siteTheme', 'light');
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    expect(screen.getByRole('button', { name: /switch to dark/i })).toBeInTheDocument();
  });

  it('toggles from dark to light', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: /switch to light/i });
    expect(document.documentElement.classList.contains('theme-light')).toBe(false);
    fireEvent.click(btn);
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    expect(localStorage.getItem('siteTheme')).toBe('light');
  });

  it('persists light back to dark', () => {
    localStorage.setItem('siteTheme', 'light');
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: /switch to dark/i });
    fireEvent.click(btn);
    expect(document.documentElement.classList.contains('theme-light')).toBe(false);
    expect(localStorage.getItem('siteTheme')).toBe('dark');
  });
});
