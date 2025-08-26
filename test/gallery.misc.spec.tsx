import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, vi, beforeEach, expect } from 'vitest';

import { Gallery } from '../src/components/Gallery';
import { GalleryItemBase } from '../src/gallery/loader';

// Include one item without caption to hit default aria-label path
const mockItems: GalleryItemBase[] = [
  {
    id: 'img-1',
    type: 'image',
    src: '/media/encoded/img1.jpg',
    thumb: '/media/lqip/img1.jpg',
    contributorName: 'Tester',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'img-2',
    type: 'image',
    src: '/media/encoded/img2.jpg',
    thumb: '/media/lqip/img2.jpg',
    caption: 'Second image',
    contributorName: 'Tester',
    createdAt: '2024-01-02T00:00:00Z',
  },
];

vi.mock('../src/gallery/loader', () => ({
  loadGallery: () => mockItems,
}));

describe('Gallery misc behaviors', () => {
  beforeEach(() => {
    class FakeIntersectionObserver implements IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string = '0px';
      readonly thresholds: ReadonlyArray<number> = [0];
      private readonly callback: (
        entries: IntersectionObserverEntry[],
        observer: IntersectionObserver,
      ) => void;
      constructor(
        cb: (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void,
      ) {
        this.callback = cb;
      }
      observe(el: Element) {
        this.callback([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this);
      }
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }
    (globalThis as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
      FakeIntersectionObserver;
  });

  it('opens with default aria-label when no caption and closes via backdrop & close button', () => {
    render(<Gallery headingId="g-head" />);
    const first = screen.getAllByRole('button', { name: /image/i })[0]; // no caption item labeled "Image"
    fireEvent.click(first);
    const dialog = screen.getByRole('dialog');
    // Trigger non-Tab key path (ArrowRight handled; ensure keydown listener present)
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    // Backdrop click closes
    const backdrop = document.querySelector('.gallery-modal-backdrop') as HTMLElement;
    fireEvent.click(backdrop);
    expect(screen.queryByRole('dialog')).toBeNull();

    // Re-open second item with caption and close via close button
    const second = screen.getByRole('button', { name: /second image/i });
    fireEvent.click(second);
    expect(screen.getByRole('dialog')).toBeTruthy();
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
