import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { HeroVideo } from '../src/components/HeroVideo';

vi.mock('../src/video/registry', () => ({
  getVideo: () => undefined,
  listVideos: () => [],
}));

describe('HeroVideo registry fallback', () => {
  it('falls back to hardcoded defaults when registry undefined', () => {
    document.documentElement.setAttribute('data-motion', 'reduce');
    render(<HeroVideo />);
    const region = screen.getByRole('region', { name: 'Hero Feature' });
    expect(region).toBeInTheDocument();
    expect(screen.queryByText(/1080p|720p|480p/)).toBeNull();
    // No figcaption rendered because no registry caption supplied; caption prop missing.
    // The accessible name is exposed via region aria-label already asserted.
  });
});
