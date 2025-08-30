/**
 * Mock utilities for test files to reduce function nesting depth
 */

export class FakeIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '0px';
  readonly thresholds: ReadonlyArray<number> = [0];
  private readonly callback: (
    entries: IntersectionObserverEntry[],
    observer: IntersectionObserver,
  ) => void;

  constructor(cb: (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void) {
    this.callback = cb;
  }

  observe(el: Element) {
    this.callback([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this);
  }

  unobserve() {
    // Mock implementation - no-op
  }

  disconnect() {
    // Mock implementation - no-op
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

export class MockIntersectionObserverWithCallback implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  // store the callback so class isn't considered unused logic
  private readonly cbRef: (
    entries: IntersectionObserverEntry[],
    observer: IntersectionObserver,
  ) => void;

  constructor(cb: (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void) {
    this.cbRef = cb;
    (globalThis as unknown as { __LATEST_OBSERVER_CB?: typeof cb }).__LATEST_OBSERVER_CB = cb;
  }

  disconnect(): void {
    /* noop */
  }

  observe(): void {
    /* noop */
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  unobserve(): void {
    /* noop */
  }
}
