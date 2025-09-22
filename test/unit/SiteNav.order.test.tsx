import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { SiteNav } from '../src/components/SiteNav';
import { getAllContent } from '../src/content/loader';

describe('SiteNav order', () => {
  it('renders links in ascending frontmatter.order excluding hero content', () => {
    const pages = getAllContent().filter((p) => !p.frontmatter.hero);
    const expected = pages.map((p) => p.frontmatter.title);

    render(<SiteNav />);
    const nav = screen.getByRole('navigation', { name: /site sections/i });
    const list = within(nav).getByRole('list');
    const items = within(list).getAllByRole('listitem');
    const linkTexts = items.map((li) => within(li).getByRole('link').textContent?.trim());
    expect(linkTexts).toEqual(expected);
  });
});
