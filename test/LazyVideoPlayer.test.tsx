import { render, screen, act } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';

import { LazyVideoPlayer } from '../src/components/VideoPlayer/LazyVideoPlayer';

interface IOEntry {
  isIntersecting: boolean;
}
type IOCallback = (entries: IOEntry[]) => void;
// Preserve original reference for cleanup

const origIO: any = (globalThis as unknown as { IntersectionObserver?: unknown })
  .IntersectionObserver;

afterEach(() => {
  (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver = origIO;
  vi.restoreAllMocks();
});

describe('LazyVideoPlayer', () => {
  it('renders placeholder then video (existing behavior smoke test)', () => {
    render(
      <LazyVideoPlayer
        caption="Lazy Clip"
        placeholderLabel="Prefetching"
        qualitySources={[
          { src: 'vid-480.mp4', height: 480 },
          { src: 'vid-720.mp4', height: 720 },
        ]}
      />,
    );
    expect(screen.getByRole('figure')).toBeInTheDocument();
    expect(screen.getByText(/lazy clip/i)).toBeInTheDocument();
  });

  it('immediately shows video when IntersectionObserver is unsupported', () => {
    (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver = undefined;
    render(<LazyVideoPlayer src="clip.mp4" />);
    expect(document.querySelector('video')).not.toBeNull();
  });

  it('disconnects observer after first intersection', () => {
    const disconnect = vi.fn();
    const observe = vi.fn();
    let storedCb: IOCallback | null = null;
    class MockIO {
      cb: IOCallback;
      constructor(cb: IOCallback) {
        this.cb = cb;
        storedCb = cb; // capture the callback used by component instance
      }
      observe(el: Element) {
        observe(el);
      }
      disconnect() {
        disconnect();
      }
    }
    (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver =
      MockIO as unknown;
    render(<LazyVideoPlayer src="clip2.mp4" />);
    expect(observe).toHaveBeenCalled();
    act(() => {
      storedCb?.([{ isIntersecting: true }]);
    });
    expect(document.querySelector('video')).not.toBeNull();
    expect(disconnect).toHaveBeenCalled();
  });
});
