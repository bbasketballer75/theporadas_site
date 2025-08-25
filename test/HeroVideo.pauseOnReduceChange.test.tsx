import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { HeroVideo } from '../src/components/HeroVideo';

describe('HeroVideo pauses when motion preference changes to reduce', () => {
  it('calls pause on video when data-motion toggles to reduce', async () => {
    document.documentElement.setAttribute('data-motion', 'no-preference');
    render(<HeroVideo caption="Dynamic" />);
    const region = screen.getByRole('region', { name: 'Dynamic' });
    const video = region.querySelector('video') as HTMLVideoElement | null;
    expect(video).toBeTruthy();
    if (!video) return;
    const pauseSpy = vi.spyOn(video, 'pause').mockImplementation(() => {});
    await act(async () => {
      document.documentElement.setAttribute('data-motion', 'reduce');
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(pauseSpy).toHaveBeenCalledTimes(1);
    pauseSpy.mockRestore();
  });
});
