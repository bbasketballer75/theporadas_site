import { useEffect } from 'react';

import { GalleryItemBase } from '../gallery/loader';

interface InternalItem extends GalleryItemBase {
  loaded?: boolean;
  category?: string;
  videoLink?: string;
}

interface UseKeyboardProps {
  active: InternalItem | null;
  items: InternalItem[];
  setActive: (item: InternalItem | null) => void;
}

export function useKeyboard({ active, items, setActive }: UseKeyboardProps) {
  useEffect(() => {
    if (active) {
      const onDoc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setActive(null);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const currentIndex = items.findIndex((item) => item.id === active.id);
          if (currentIndex !== -1) {
            const nextIndex =
              e.key === 'ArrowRight'
                ? (currentIndex + 1) % items.length
                : (currentIndex - 1 + items.length) % items.length;
            setActive(items[nextIndex]);
          }
        }
      };
      document.addEventListener('keydown', onDoc);
      return () => document.removeEventListener('keydown', onDoc);
    }
  }, [active, items, setActive]);
}
