import { describe, expect, it, vi } from 'vitest';

function resetDom() {
  document.body.innerHTML = `
    <a href="#appShell" class="skip-link">Skip to content</a>
    <main id="appShell">Main</main>
  `;
}

describe('skipLinkFocus auto-init and click', () => {
  it('focuses main when hash already present on load', async () => {
    resetDom();
    window.location.hash = '#appShell';
    const main = document.getElementById('appShell') as HTMLElement;
    const focusSpy = vi.spyOn(main, 'focus');
    await import('../src/skipLinkFocus');
    expect(focusSpy).toHaveBeenCalled();
  });

  it('focuses main after clicking skip link via microtask queue', async () => {
    resetDom();
    const main = document.getElementById('appShell') as HTMLElement;
    const focusSpy = vi.spyOn(main, 'focus');
    await import('../src/skipLinkFocus');
    const link = document.querySelector('a.skip-link') as HTMLAnchorElement;
    link.click();
    await Promise.resolve();
    expect(focusSpy).toHaveBeenCalled();
  });
});
