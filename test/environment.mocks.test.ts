import { describe, expect, it } from 'vitest';

describe('vitest.setup environment shims', () => {
  it('provides canvas 2d context with measureText', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d') as unknown as {
      measureText: (t: string) => { width: number };
    };
    expect(ctx).toBeTruthy();
    const metrics = ctx.measureText('abc');
    expect(metrics).toBeTruthy();
    expect(metrics.width).toBeGreaterThan(0);
  });

  it('provides window.matchMedia', () => {
    expect(typeof window.matchMedia).toBe('function');
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    expect(mql).toBeTruthy();
    expect(mql.media).toContain('prefers-reduced-motion');
  });

  it('provides IntersectionObserver shim', () => {
    expect(typeof (window as any).IntersectionObserver).toBe('function');
    const el = document.createElement('div');
    document.body.appendChild(el);
    const ObsCtor = (window as any).IntersectionObserver as new (cb: () => void) => {
      observe: (el: Element) => void;
    };
    const obs = new ObsCtor(() => {});
    expect(typeof (obs as any).observe).toBe('function');
    obs.observe(el);
  });
});
