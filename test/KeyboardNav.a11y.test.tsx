import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';

import App from '../src/App';

import { runAxe, formatViolations } from './utils/axeHelper';

describe('Keyboard navigation a11y', () => {
  let user: ReturnType<typeof userEvent.setup>;
  beforeEach(() => {
    user = userEvent.setup();
  });

  it('tabs to motion & theme toggles then nav link; preserves a11y', async () => {
    render(<App />);

    // Tab forward up to a sane cap to encounter both toggles and first nav link
    const found: Record<string, HTMLElement> = {};
    for (let i = 0; i < 25; i++) {
      await user.tab();
      const active = document.activeElement as HTMLElement | null;
      if (active?.getAttribute('class')?.includes('motion-toggle')) found.motion = active;
      if (active?.getAttribute('class')?.includes('theme-toggle')) found.theme = active;
      if (!found.firstNav) {
        const link =
          active?.tagName === 'A' && /our story/i.test(active.textContent || '') ? active : null;
        if (link) found.firstNav = link;
      }
      if (found.motion && found.theme && found.firstNav) break;
    }

    expect(found.motion, 'Motion toggle should receive focus via Tab').toBeDefined();
    expect(found.theme, 'Theme toggle should receive focus via Tab').toBeDefined();
    expect(found.firstNav, 'First nav link should receive focus via Tab').toBeDefined();

    // Activate theme toggle via keyboard (space)
    if (found.theme) {
      found.theme.focus();
      await user.keyboard('[Space]');
      expect(found.theme).toHaveAttribute('aria-pressed');
    }

    const results = await runAxe(document.body);
    const violations = results.violations.filter((v) => v.impact !== 'minor');
    expect(violations.length, formatViolations(violations)).toBe(0);
  });
  it('reverse (Shift+Tab) traverses back through discovered elements', async () => {
    render(<App />);

    const sequence: HTMLElement[] = [];
    const found: { motion?: HTMLElement; theme?: HTMLElement; firstNav?: HTMLElement } = {};
    for (let i = 0; i < 25; i++) {
      await user.tab();
      const active = document.activeElement as HTMLElement | null;
      if (!active) continue;
      // Record unique focused elements up until we have all three
      if (!sequence.includes(active)) sequence.push(active);
      if (active.getAttribute('class')?.includes('motion-toggle')) found.motion = active;
      if (active.getAttribute('class')?.includes('theme-toggle')) found.theme = active;
      if (!found.firstNav && active.tagName === 'A' && /our story/i.test(active.textContent || ''))
        found.firstNav = active;
      if (found.motion && found.theme && found.firstNav) break;
    }
    // Ensure we actually collected them
    expect(found.motion).toBeDefined();
    expect(found.theme).toBeDefined();
    expect(found.firstNav).toBeDefined();

    // Start from the last collected element and shift+tab backwards across the earlier ones
    // Focus last element first
    sequence[sequence.length - 1].focus();

    for (let i = sequence.length - 2; i >= 0; i--) {
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(sequence[i]);
      if (i === 0) break;
    }
  });
});
