import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import App from '../src/App';

describe('hash navigation', () => {
  it('marks active nav item when hash matches', () => {
    window.location.hash = '#story';
    const { container } = render(<App />);
    const active = container.querySelector('nav.site-nav li.active a');
    expect(active?.getAttribute('href')).toBe('#story');
  });
});
