import { describe, it, expect } from 'vitest';

describe('gallery loader (static manifest)', () => {
  it('loads gallery items and caches the result', async () => {
    const { loadGallery } = await import('../src/gallery/loader');
    const first = loadGallery();
    expect(Array.isArray(first)).toBe(true);
    expect(first.length).toBeGreaterThan(0);
    first.forEach((item) => {
      expect(typeof item.id).toBe('string');
      expect(typeof item.src).toBe('string');
      expect(['image', 'video']).toContain(item.type);
    });
    const second = loadGallery();
    expect(second).toBe(first); // cached
  });
});
