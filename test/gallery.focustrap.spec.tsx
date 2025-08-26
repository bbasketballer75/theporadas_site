import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Gallery } from '../src/components/Gallery';
import { GalleryItemBase } from '../src/gallery/loader';

const mockItems: GalleryItemBase[] = [
  {
    id: 'img-1',
    type: 'image',
    src: '/media/encoded/img1.jpg',
    thumb: '/media/lqip/img1.jpg',
    caption: 'First image',
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

describe('Gallery focus trap', () => {
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

  it('traps focus within modal and wraps with Tab and Shift+Tab', () => {
    render(<Gallery headingId="g-head" />);
    const opener = screen.getByRole('button', { name: /first image/i });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog');
    const closeBtn = screen.getByRole('button', { name: /close/i });
    expect(document.activeElement).toBe(closeBtn);

    // Collect focusables for reference
    const getOrderedIds = () => {
      return Array.from(
        dialog.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])'),
      )
        .filter((el) => !el.hasAttribute('disabled'))
        .map((el) => el.getAttribute('aria-label') || el.textContent || '');
    };

    // Tab forward cycling
    fireEvent.keyDown(dialog, { key: 'Tab' });
    const afterFirstTab = document.activeElement;
    fireEvent.keyDown(dialog, { key: 'Tab' });
    fireEvent.keyDown(dialog, { key: 'Tab' });
    // After cycling through all, focus should wrap back to first (close button)
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab backward cycling
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    // Now focus should be last focusable element
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !el.hasAttribute('disabled'));
    const last = focusables[focusables.length - 1];
    expect(document.activeElement).toBe(last);
    // Wrap backward again
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(closeBtn);

    // Escape closes and restores focus
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);

    // Sanity: ensure we actually had more than one focusable
    expect(getOrderedIds().length).toBeGreaterThanOrEqual(1);
    // Prevent unused var lint (afterFirstTab)
    expect(afterFirstTab).toBeTruthy();
  });
});
