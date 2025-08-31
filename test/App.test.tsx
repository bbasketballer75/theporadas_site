import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import App from '../src/App';

// Mock IntroVideo to skip the intro overlay
vi.mock('../src/components/IntroVideo', () => ({
  IntroVideo: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('App', () => {
  it('renders heading and feature video caption', () => {
    render(<App />);
    // Look for the specific h1 element instead of any heading
    const heading = screen.getByRole('heading', { level: 1, name: /the poradas wedding videos/i });
    expect(heading).toBeInTheDocument();
    // Caption text is rendered twice (hero + feature); ensure at least one instance
    expect(screen.getAllByText(/Poradas Wedding Feature/i).length).toBeGreaterThan(0);
  });
});
