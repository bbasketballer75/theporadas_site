import { describe, it, expect } from 'vitest';

import { getAllContent } from '../src/content/loader';

describe('content ordering', () => {
  it('places rings after story and before wedding party', () => {
    const content = getAllContent();
    const storyIdx = content.findIndex((c) => c.frontmatter.slug === 'story');
    const ringsIdx = content.findIndex((c) => c.frontmatter.slug === 'rings');
    const partyIdx = content.findIndex((c) => c.frontmatter.slug === 'wedding-party');
    expect(storyIdx).toBeGreaterThan(-1);
    expect(ringsIdx).toBeGreaterThan(-1);
    expect(partyIdx).toBeGreaterThan(-1);
    expect(ringsIdx).toBe(storyIdx + 1);
    expect(partyIdx).toBe(ringsIdx + 1);
  });
});
