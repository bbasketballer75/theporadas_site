// Browser-friendly gallery loader. We statically import the JSON manifest so
// Vite can bundle it without relying on Node's fs at runtime.
// If the file is missing or not an array, we gracefully fall back to empty list.
// (Generation of gallery.index.json is handled outside this module.)
import rawData from '../../content/gallery.index.json';

export interface GalleryItemBase {
  id: string;
  type: 'image' | 'video';
  src: string;
  thumb?: string;
  caption?: string;
  contributorName?: string;
  createdAt?: string;
}

let cache: GalleryItemBase[] | null = null;

export function loadGallery(): GalleryItemBase[] {
  if (cache) return cache;
  const parsed: unknown = rawData;
  if (Array.isArray(parsed)) {
    const items = (parsed as unknown[])
      .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
      .map((r) => {
        const id = r.id;
        const src = r.src;
        const type = r.type;
        if (
          typeof id === 'string' &&
          typeof src === 'string' &&
          (type === 'image' || type === 'video')
        ) {
          return { id, src, type } as GalleryItemBase;
        }
        return null;
      })
      .filter((r): r is GalleryItemBase => r !== null);
    cache = items as GalleryItemBase[];
  } else {
    cache = [];
  }
  return cache as GalleryItemBase[];
}
