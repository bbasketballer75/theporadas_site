import { describe, it, expect } from 'vitest';

import { setupSkipLinkFocus } from '../src/skipLinkFocus';

function createDom() {
  const skip = document.createElement('a');
  skip.className = 'skip-link';
  skip.href = '#appShell';
  skip.textContent = 'Skip to main content';
  document.body.appendChild(skip);

  const main = document.createElement('div');
  main.id = 'appShell';
  main.tabIndex = -1;
  document.body.appendChild(main);
  return { skip, main };
}

describe('skipLinkFocus', () => {
  it('focuses main on hashchange to #appShell', () => {
    const { main } = createDom();
    setupSkipLinkFocus();
    expect(document.activeElement).not.toBe(main);
    window.location.hash = '#appShell';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect((document.activeElement as HTMLElement | null)?.id).toBe('appShell');
  });

  it('focuses main when loading with initial hash', () => {
    window.location.hash = '#appShell';
    createDom();
    setupSkipLinkFocus();
    expect((document.activeElement as HTMLElement | null)?.id).toBe('appShell');
  });

  it('focuses main after clicking skip link (pre-hashchange)', () => {
    const { skip, main } = createDom();
    setupSkipLinkFocus();
    expect(document.activeElement).not.toBe(main);
    skip.click();
    window.location.hash = '#appShell';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect((document.activeElement as HTMLElement | null)?.id).toBe('appShell');
  });
});
