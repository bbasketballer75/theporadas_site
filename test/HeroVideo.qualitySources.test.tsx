import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { HeroVideo } from '../src/components/HeroVideo';

describe('HeroVideo qualitySources override', () => {
  it('uses provided qualitySources instead of registry ladder', () => {
    document.documentElement.setAttribute('data-motion', 'no-preference');
    render(
      <HeroVideo
        caption="Custom Hero"
        qualitySources={[
          { src: '/media/encoded/custom-360.mp4', height: 360, label: '360p' },
          { src: '/media/encoded/custom-720.mp4', height: 720, label: '720p' },
        ]}
        poster="/media/posters/custom.jpg"
      />,
    );
    const region = screen.getByRole('region', { name: 'Custom Hero' });
    const video = region.querySelector('video');
    expect(video).toBeTruthy();
    expect(screen.getByText(/720p/)).toBeInTheDocument();
  });
});
