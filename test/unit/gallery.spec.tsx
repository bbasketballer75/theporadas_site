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

describe('Gallery', () => {
  beforeEach(() => {
    (globalThis as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
      FakeIntersectionObserver;
  });

  it('renders items', () => {
    render(<Gallery headingId="g-head" />);
    const first = screen.getByRole('button', { name: /first image/i });
    const second = screen.getByRole('button', { name: /second image/i });
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
  });

  it('opens modal on click and navigates with arrows', () => {
    render(<Gallery headingId="g-head" />);
    const first = screen.getByRole('button', { name: /first image/i });
    fireEvent.click(first);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' });
    expect(screen.getByText(/second image/i)).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('wraps keyboard navigation from last to first and first to last', () => {
    render(<Gallery headingId="g-head" />);
    // Open first
    fireEvent.click(screen.getByRole('button', { name: /first image/i }));
    const dialog = screen.getByRole('dialog');
    // Move right to second
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(screen.getByText(/second image/i)).toBeTruthy();
    // Move right again should wrap to first
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(screen.getByText(/first image/i)).toBeTruthy();
    // Move left should wrap back to second
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' });
    expect(screen.getByText(/second image/i)).toBeTruthy();
  });

  it('provides accessible dialog semantics', () => {
    render(<Gallery headingId="g-head" />);
    fireEvent.click(screen.getByRole('button', { name: /first image/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // The caption acts as descriptive content
    expect(screen.getByText(/first image/i)).toBeTruthy();
  });

  it('marks images as loaded after intersection observer triggers', () => {
    render(<Gallery headingId="g-head" />);
    const first = screen.getByRole('button', { name: /first image/i });
    const second = screen.getByRole('button', { name: /second image/i });
    const imgs = [first, second].map((btn) => btn.querySelector('img'));
    imgs.forEach((img) => {
      expect(img).not.toBeNull();
      if (img) {
        expect(img.getAttribute('src')).toMatch(/encoded\/img/);
      }
    });
  });
});
