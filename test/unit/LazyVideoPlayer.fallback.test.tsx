import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { LazyVideoPlayer } from '../src/components/VideoPlayer/LazyVideoPlayer';

describe('LazyVideoPlayer fallback no IntersectionObserver', () => {
  it('renders placeholder when IntersectionObserver unsupported', () => {
    const original: typeof window.IntersectionObserver | undefined = window.IntersectionObserver;
    // Force undefined to simulate unsupported environment
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: undefined,
      writable: true,
    });
    const { getByRole } = render(
      <LazyVideoPlayer
        qualitySources={[]}
        caption="Test"
        placeholderLabel="Loading test video"
        autoPlay={false}
        muted={false}
      />,
    );
    expect(getByRole('img', { name: /loading test video/i })).toBeTruthy();
    // Restore
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: original,
      writable: true,
    });
  });
});
