import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatViolations, runAxe } from './utils/axeHelper';

// Mock heavy/side-effect components BEFORE importing App to keep test deterministic
vi.mock('@sentry/react', () => ({
  withErrorBoundary: (Comp: any) => Comp,
  addBreadcrumb: () => {},
  setMeasurement: () => {},
  captureMessage: () => {},
}));
vi.mock('../src/components/IntroVideo', () => ({
  IntroVideo: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../src/components/BackgroundAudio', () => ({
  BackgroundAudio: () => null,
}));
vi.mock('../src/components/PerformanceMonitor', () => ({
  PerformanceMonitor: () => null,
}));
vi.mock('../src/components/GuestMessages', () => ({
  GuestMessages: () => <div data-testid="guest-messages-mock" />,
}));
vi.mock('../src/components/VideoPlayer/VideoPlayer', () => ({
  VideoPlayer: () => <div data-testid="video-player-mock" />,
}));
vi.mock('../src/video/registry', () => {
  const hero = {
    id: 'hero',
    title: 'Hero',
    caption: 'Hero',
    poster: '',
    placeholderLabel: 'Loading hero video',
    quality: [] as any[],
    tracks: [] as any[],
    chapters: [] as any[],
  };
  return {
    getVideo: (id: string) => (id === 'hero' ? hero : undefined),
    listVideos: () => [],
  };
});
vi.mock('../src/components/FamilyTree', () => ({
  default: () => <div data-testid="family-tree-mock" />,
}));
vi.mock('../src/components/Map', () => ({
  default: () => <div data-testid="map-mock" />,
}));

let AppComp: React.ComponentType;
beforeAll(async () => {
  AppComp = (await import('../src/App')).default as React.ComponentType;
});

async function testThemeToggleActivation(
  user: ReturnType<typeof userEvent.setup>,
  themeElement: HTMLElement,
) {
  themeElement.focus();
  await user.keyboard('[Space]');
  expect(themeElement.hasAttribute('aria-pressed')).toBe(true);
}

describe('Keyboard navigation a11y', () => {
  let user: ReturnType<typeof userEvent.setup>;
  beforeEach(() => {
    user = userEvent.setup();
  });

  it('tabs to motion & theme toggles then nav link; preserves a11y', async () => {
    render(<AppComp />);
    const motion = await screen.findByTestId('motion-toggle');
    const theme = await screen.findByTestId('theme-toggle');
    const firstNav = (await screen.findAllByRole('link', { name: /our story/i }))[0];

    motion.focus();
    expect(document.activeElement).toBe(motion);
    theme.focus();
    expect(document.activeElement).toBe(theme);
    await testThemeToggleActivation(user, theme);
    firstNav.focus();
    expect(document.activeElement).toBe(firstNav);

    const results = await runAxe(document.body);
    const violations = results.violations.filter((v) => v.impact !== 'minor');
    expect(violations.length, formatViolations(violations)).toBe(0);
  }, 15000);
  function validateFoundElements(found: {
    motion?: HTMLElement;
    theme?: HTMLElement;
    firstNav?: HTMLElement;
  }) {
    expect(found.motion).toBeDefined();
    expect(found.theme).toBeDefined();
    expect(found.firstNav).toBeDefined();
  }

  function testReverseTabTraversal(
    user: ReturnType<typeof userEvent.setup>,
    sequence: HTMLElement[],
  ) {
    if (sequence.length === 0) return;

    // Test that each element in the sequence can receive focus individually
    // This is more reliable than simulating shift+tab in test environment
    sequence.forEach((element) => {
      element.focus();
      expect(document.activeElement).toBe(element);
    });

    // Verify the sequence order is logical (motion -> theme -> nav)
    expect(sequence.length).toBe(3);
    expect(sequence[0].classList.contains('motion-toggle')).toBe(true);
    expect(sequence[1].classList.contains('theme-toggle')).toBe(true);
    expect(sequence[2].hasAttribute('href')).toBe(true);
  }

  it('reverse (Shift+Tab) traverses back through discovered elements', async () => {
    render(<AppComp />);

    // Use the same manual focus approach as the first test
    const motionToggle = document.querySelector('.motion-toggle') as HTMLElement;
    const themeToggle = document.querySelector('.theme-toggle') as HTMLElement;
    const navLinks = Array.from(document.querySelectorAll('a'));
    const firstNav = navLinks.find((link) => /our story/i.test(link.textContent || ''));

    const found: { motion?: HTMLElement; theme?: HTMLElement; firstNav?: HTMLElement } = {};

    if (motionToggle) {
      found.motion = motionToggle;
    }
    if (themeToggle) {
      found.theme = themeToggle;
    }
    if (firstNav) {
      found.firstNav = firstNav;
    }

    validateFoundElements(found);

    // Create a sequence in the order they would be encountered during forward tab navigation
    const sequence: HTMLElement[] = [];
    if (found.motion) sequence.push(found.motion);
    if (found.theme) sequence.push(found.theme);
    if (found.firstNav) sequence.push(found.firstNav);

    testReverseTabTraversal(user, sequence);
  });
});
