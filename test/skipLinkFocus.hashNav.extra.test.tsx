import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import '../src/skipLinkFocus';
import { useHashNavigation } from '../src/hooks/useHashNavigation';

function HashNavProbe({ focus = true }: { focus?: boolean }) {
  const { hash } = useHashNavigation(focus);
  return <div data-hash={hash}>hash:{hash}</div>;
}

describe('skipLinkFocus & useHashNavigation extended coverage', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <a href="#appShell" class="skip-link">Skip</a>
      <main id="appShell"><h1>Shell</h1></main>
      <div id="targetA"></div>`;
    history.replaceState(null, '', '#');
  });

  it('applies tabindex and attempts focus on skip link activation logic', async () => {
    const main = document.getElementById('appShell') as HTMLElement;
    // Simulate location hash
    history.replaceState(null, '', '#appShell');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await Promise.resolve();
    expect(main.getAttribute('tabindex')).toBe('-1');
  });

  it('useHashNavigation applies and restores tabindex on focused element', async () => {
    const target = document.getElementById('targetA') as HTMLElement;
    // jsdom allows overriding for spying
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    target.scrollIntoView = vi.fn();
    const { container } = render(<HashNavProbe />);
    history.replaceState(null, '', '#targetA');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await new Promise((r) => setTimeout(r, 10));
    expect(container.querySelector('[data-hash="targetA"]')).toBeTruthy();
    expect(target.scrollIntoView as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    expect(target.getAttribute('tabindex')).toBe('-1');
    await new Promise((r) => setTimeout(r, 120));
    expect(target.getAttribute('tabindex')).toBeNull();
  });

  it('useHashNavigation with focus=false does not mutate tabindex', async () => {
    const target = document.getElementById('targetA') as HTMLElement;
    render(<HashNavProbe focus={false} />);
    history.replaceState(null, '', '#targetA');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await new Promise((r) => setTimeout(r, 10));
    expect(target.getAttribute('tabindex')).toBeNull();
  });
});
