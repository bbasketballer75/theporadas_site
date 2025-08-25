import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import App from '../src/App';

// Basic smoke test that the feature video section renders with caption from registry.

describe('Video registry integration', () => {
  it('renders hero video caption (at least once)', () => {
    render(<App />);
    const captions = screen.getAllByText(/Poradas Wedding Feature/i);
    expect(captions.length).toBeGreaterThan(0);
  });
});
