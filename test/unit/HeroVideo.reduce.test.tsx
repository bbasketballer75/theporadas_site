import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { HeroVideo } from '../src/components/HeroVideo';

// Ensure reduce motion attribute pauses video autoplay

describe('HeroVideo reduce motion', () => {
  it('does not autoplay when data-motion=reduce', () => {
    document.documentElement.setAttribute('data-motion', 'reduce');
    const { container } = render(<HeroVideo />);
    const vid = container.querySelector('video');
    if (vid) {
      // jsdom video not actually playing; we assert attributes controlling autoplay/muted
      expect(vid.hasAttribute('autoplay')).toBe(false);
      expect(vid.hasAttribute('muted')).toBe(false);
    }
  });
});
