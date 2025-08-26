import { existsSync, readFileSync } from 'node:fs';

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
  const path = 'content/gallery.index.json';
  if (!existsSync(path)) return (cache = []);
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cache = parsed.filter((r) => r && typeof r.id === 'string' && typeof r.src === 'string');
    } else {
      cache = [];
    }
  } catch {
    cache = [];
  }
  return cache;
}
