import '@testing-library/jest-dom';

// Unconditional canvas mock (prevents jsdom "Not implemented: HTMLCanvasElement.prototype.getContext")
if (typeof window !== 'undefined') {
  const ctor =
    window.HTMLCanvasElement ||
    (class extends window.HTMLElement {} as typeof window.HTMLCanvasElement);
  if (!window.HTMLCanvasElement) window.HTMLCanvasElement = ctor;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window.HTMLCanvasElement.prototype as any).getContext = (type: string) => {
    if (type === '2d') {
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        measureText: (text: string): any => ({ width: text.length * 8 }),
      };
    }
    return null;
  };
}

// Provide a basic matchMedia mock for components relying on prefers-reduced-motion
if (typeof window !== 'undefined' && !window.matchMedia) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// IntersectionObserver shim for jsdom tests (LazyVideoPlayer)
if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
  type IOCallback = (entries: IntersectionObserverEntry[], observer: unknown) => void;
  class MockIntersectionObserver {
    private readonly cb: IOCallback;
    constructor(cb: IOCallback) {
      this.cb = cb;
    }
    observe(target: Element) {
      const rect = target.getBoundingClientRect();
      const entry: Partial<IntersectionObserverEntry> = {
        isIntersecting: true,
        target,
        intersectionRatio: 1,
        time: Date.now(),
        boundingClientRect: rect,
        intersectionRect: rect,
        rootBounds: rect,
      };
      this.cb([entry as IntersectionObserverEntry], this);
    }
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;
}

// Canvas getContext mock for axe-core color contrast rule
// (Legacy) retained: IntersectionObserver & matchMedia mocks above
