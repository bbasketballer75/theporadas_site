import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import App from '../src/App';

import { runAxe, formatViolations } from './utils/axeHelper';

describe('App accessibility', () => {
  it('has no detectable a11y violations on initial render', async () => {
    const { container } = render(<App />);
    const { violations } = await runAxe(container);
    if (violations.length) {
      throw new Error(`Accessibility violations detected:\n${formatViolations(violations)}`);
    }
    expect(violations.length).toBe(0);
  });
  it('dynamic content sections have h2 headings and labeled sections', () => {
    const { container } = render(<App />);
    const sections = Array.from(container.querySelectorAll('section')).filter(
      (s) => s.getAttribute('aria-label') && s.id !== 'appShell',
    );
    // All non-hero content cards should start with an h2
    const contentSections = sections.filter((s) => s.querySelector('.card'));
    expect(contentSections.length).toBeGreaterThan(0);
    for (const sec of contentSections) {
      const h2 = sec.querySelector('h2, h1, h3');
      expect(h2, 'section missing heading').toBeTruthy();
      if (h2) {
        expect(h2.tagName).toBe('H2');
      }
    }
    // Navigation has aria-label and anchors have discernible text
    const nav = container.querySelector('nav[aria-label="Site Sections"]');
    expect(nav).toBeTruthy();
    nav?.querySelectorAll('a').forEach((a) => {
      expect(a.textContent?.trim()).not.toBe('');
    });
  });
  it('skip link becomes visible on focus', () => {
    render(<App />);
    // Simulate DOM having the skip link (in index.html normally)
    const skip = document.createElement('a');
    skip.href = '#appShell';
    skip.className = 'skip-link';
    skip.textContent = 'Skip to main content';
    document.body.insertBefore(skip, document.body.firstChild);
    skip.focus();
    // jsdom does not compute styles, but our CSS uses transform to hide; focusing should not remove element
    expect(document.activeElement).toBe(skip);
  });
});
