import { describe, it, expect } from 'vitest';

import { getContentBySlug, getNonHeroSections, getAllContent } from '../src/content/loader';

describe('content accessors', () => {
  it('retrieves content by specific slug', () => {
    const item = getContentBySlug('rings');
    expect(item).toBeTruthy();
    expect(item?.frontmatter.title.toLowerCase()).toContain('ring');
  });
  it('excludes hero sections in non-hero listing', () => {
    const all = getAllContent();
    const nonHero = getNonHeroSections();
    // home.md has hero: true
    const home = all.find((c) => c.frontmatter.slug === 'home');
    expect(home?.frontmatter.hero).toBe(true);
    expect(nonHero.find((c) => c.frontmatter.slug === 'home')).toBeUndefined();
    // sanity: rings (non-hero) should be present
    expect(nonHero.find((c) => c.frontmatter.slug === 'rings')).toBeTruthy();
  });
});
