import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LazyVideoPlayer } from '../src/components/VideoPlayer/LazyVideoPlayer';

import { MockIntersectionObserverWithCallback } from './utils/intersectionObserverMock';

vi.mock('../src/components/VideoPlayer/VideoPlayer', () => ({
  VideoPlayer: (props: { caption?: string }) => (
    <div data-testid="video-player" aria-label={props.caption || 'video'} />
  ),
}));

const placeholderLabel = 'Loading Feature Video';

type IOCB = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

function triggerIO(entries: Partial<IntersectionObserverEntry>[]) {
  const cb: IOCB | undefined = (globalThis as unknown as { __LATEST_OBSERVER_CB?: IOCB })
    .__LATEST_OBSERVER_CB;
  if (!cb) return;
  const full: IntersectionObserverEntry[] = entries.map((e) => ({
    isIntersecting: false,
    intersectionRatio: 0,
    target: document.createElement('div'),
    time: Date.now(),
    boundingClientRect: {} as DOMRectReadOnly,
    intersectionRect: {} as DOMRectReadOnly,
    rootBounds: null,
    ...e,
  }));
  cb(full, {} as IntersectionObserver);
}

type IntersectionObserverConstructor = new (cb: IOCB) => IntersectionObserver;

describe('LazyVideoPlayer (observer branches)', () => {
  const OriginalIO = (
    globalThis as unknown as { IntersectionObserver?: IntersectionObserverConstructor }
  ).IntersectionObserver;
  beforeEach(() => {
    (globalThis as unknown as { __LATEST_OBSERVER_CB?: IOCB }).__LATEST_OBSERVER_CB = undefined;
    (
      globalThis as unknown as { IntersectionObserver?: IntersectionObserverConstructor }
    ).IntersectionObserver =
      MockIntersectionObserverWithCallback as unknown as IntersectionObserverConstructor;
  });
  afterEach(() => {
    (
      globalThis as unknown as { IntersectionObserver?: IntersectionObserverConstructor }
    ).IntersectionObserver = OriginalIO;
  });

  it('renders placeholder then loads video once intersection occurs', () => {
    render(
      <LazyVideoPlayer
        placeholderLabel={placeholderLabel}
        caption="Feature"
        qualitySources={[{ src: 'x.mp4', height: 720 }]}
      />,
    );
    expect(screen.getByRole('img', { name: placeholderLabel })).toBeInTheDocument();
    act(() => {
      triggerIO([{ isIntersecting: true }]);
    });
    expect(screen.getByTestId('video-player')).toBeInTheDocument();
  });

  it('falls back immediately without IntersectionObserver support', () => {
    (
      globalThis as unknown as { IntersectionObserver?: IntersectionObserverConstructor }
    ).IntersectionObserver = undefined;
    render(
      <LazyVideoPlayer
        placeholderLabel={placeholderLabel}
        caption="Immediate"
        qualitySources={[{ src: 'y.mp4', height: 480 }]}
      />,
    );
    expect(screen.getByTestId('video-player')).toBeInTheDocument();
  });
});
