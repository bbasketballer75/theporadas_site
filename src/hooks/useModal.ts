import { useState } from 'react';

import { GalleryItemBase } from '../gallery/loader';

interface InternalItem extends GalleryItemBase {
  loaded?: boolean;
  category?: string;
  videoLink?: string;
}

export function useModal() {
  const [active, setActive] = useState<InternalItem | null>(null);

  return {
    active,
    setActive,
  };
}
