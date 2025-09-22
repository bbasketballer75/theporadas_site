import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import App from '../src/App';

// Mock IntroVideo to immediately render children
vi.mock('../src/components/IntroVideo', () => ({
  IntroVideo: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('hash navigation', () => {
  it('marks active nav item when hash matches', async () => {
    // Set hash before rendering
    window.location.hash = '#story';

    const { container } = render(<App />);

    // Wait for useEffect to run and update the component
    await new Promise((resolve) => setTimeout(resolve, 0));

    const active = container.querySelector('nav.site-nav li.active a');
    expect(active?.getAttribute('href')).toBe('#story');
  });
});
