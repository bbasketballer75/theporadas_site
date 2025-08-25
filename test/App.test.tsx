import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import App from '../src/App';

describe('App', () => {
  it('renders heading and feature video caption', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /the poradas wedding videos/i }),
    ).toBeInTheDocument();
    // Caption text is rendered twice (hero + feature); ensure at least one instance
    expect(screen.getAllByText(/Poradas Wedding Feature/i).length).toBeGreaterThan(0);
  });
});
