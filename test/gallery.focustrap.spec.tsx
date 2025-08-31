import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Gallery } from '../src/components/Gallery';
import { GalleryItemBase } from '../src/gallery/loader';

import { FakeIntersectionObserver } from './utils/intersectionObserverMock';

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
    (globalThis as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
      FakeIntersectionObserver;
  });

  it('opens modal and focuses close button', async () => {
    render(<Gallery headingId="g-head" />);
    const opener = screen.getByRole('button', { name: /first image/i });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog');
    const closeBtn = screen.getByRole('button', { name: 'Close' });

    // Wait for focus trap to run
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.activeElement).toBe(closeBtn);

    // Test that modal can be closed
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
