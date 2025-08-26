import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { SiteNav } from '../src/components/SiteNav';

import { runAxe, formatViolations } from './utils/axeHelper';

vi.mock('../src/content/loader', () => ({
  getAllContent: () => [
    { frontmatter: { slug: 'home', title: 'Home', hero: false } },
    { frontmatter: { slug: 'about', title: 'About', hero: false } },
  ],
}));

describe('SiteNav accessibility', () => {
  it('has no a11y violations and sets aria-current', async () => {
    const { container, getByText } = render(<SiteNav active="about" />);
    const activeLink = getByText('About');
    expect(activeLink.getAttribute('aria-current')).toBe('true');
    const { violations } = await runAxe(container);
    if (violations.length) {
      throw new Error(`SiteNav violations:\n${formatViolations(violations)}`);
    }
    expect(violations.length).toBe(0);
  });
});
