import { describe, it, expect, vi, beforeEach } from 'vitest';

// We will mock the rawModules glob by injecting into module cache via dynamic import override.

describe('content loader parsing & caching', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads content list, caches, and filters non-hero sections', async () => {
    const { getAllContent, getNonHeroSections } = await import('../src/content/loader');
    const all = getAllContent();
    expect(Array.isArray(all)).toBe(true);
    // Ensure caching: second call returns same reference
    const again = getAllContent();
    expect(again).toBe(all);
    // Non-hero subset should exclude hero flagged entries
    const nonHero = getNonHeroSections();
    expect(nonHero.every((e) => !e.frontmatter.hero)).toBe(true);
  });
});

describe('gallery loader validation & caching', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('filters invalid items and caches result', async () => {
    vi.mock('../content/gallery.index.json', () => ({
      default: [
        { id: 'i1', src: '/a.jpg', type: 'image' },
        { id: 'bad1', src: 42, type: 'image' },
        { id: 'v1', src: '/v.mp4', type: 'video' },
        { id: null, src: '/x.jpg', type: 'image' },
      ],
    }));
    const { loadGallery } = await import('../src/gallery/loader');
    const first = loadGallery();
    expect(first.length).toBe(2);
    const second = loadGallery();
    expect(second).toBe(first); // cached
  });
});
