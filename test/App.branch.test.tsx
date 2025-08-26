import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import App from '../src/App';

// Force listVideos to return empty array (cover else branch)
vi.mock('../src/video/registry', () => ({
  listVideos: () => [],
  getVideo: () => undefined,
}));

describe('App feature video fallback', () => {
  it('renders fallback paragraph when no hero video exists', () => {
    render(<App />);
    expect(screen.getByText('No video available.')).toBeInTheDocument();
  });
});
