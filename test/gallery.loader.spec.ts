import { describe, it, expect, vi, beforeEach } from 'vitest';

// We will dynamically import after mocks
const PATH = 'content/gallery.index.json';

describe('gallery loader branches', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns empty array when file missing', async () => {
    vi.doMock('node:fs', () => {
      const existsSync = () => false;
      const readFileSync = vi.fn();
      return { existsSync, readFileSync, default: { existsSync, readFileSync } };
    });
    const { loadGallery } = await import('../src/gallery/loader');
    expect(loadGallery()).toEqual([]);
  });

  it('returns empty array on invalid JSON parse error', async () => {
    vi.doMock('node:fs', () => {
      const existsSync = (p: string) => p === PATH;
      const readFileSync = () => '{ invalid json';
      return { existsSync, readFileSync, default: { existsSync, readFileSync } };
    });
    const { loadGallery } = await import('../src/gallery/loader');
    expect(loadGallery()).toEqual([]);
  });

  it('returns empty array when JSON is not an array', async () => {
    vi.doMock('node:fs', () => {
      const existsSync = (p: string) => p === PATH;
      const readFileSync = () => JSON.stringify({ not: 'array' });
      return { existsSync, readFileSync, default: { existsSync, readFileSync } };
    });
    const { loadGallery } = await import('../src/gallery/loader');
    expect(loadGallery()).toEqual([]);
  });

  it('filters invalid entries and caches result', async () => {
    const data = [
      { id: 'a', src: '/x/a.jpg', type: 'image' },
      { id: 123, src: '/x/b.jpg', type: 'image' }, // invalid id
      { id: 'c', src: 42, type: 'image' }, // invalid src
    ];
    const readSpy = vi.fn(() => JSON.stringify(data));
    vi.doMock('node:fs', () => {
      const existsSync = (p: string) => p === PATH;
      const readFileSync = readSpy;
      return { existsSync, readFileSync, default: { existsSync, readFileSync } };
    });
    const { loadGallery } = await import('../src/gallery/loader');
    const first = loadGallery();
    const second = loadGallery();
    expect(first).toEqual([{ id: 'a', src: '/x/a.jpg', type: 'image' }]);
    expect(second).toBe(first); // cached
    expect(readSpy).toHaveBeenCalledTimes(1);
  });
});
