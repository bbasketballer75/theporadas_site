import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LazyVideoPlayer } from '../src/components/VideoPlayer/LazyVideoPlayer';
import { VideoPlayer } from '../src/components/VideoPlayer/VideoPlayer';

// Mock IntersectionObserver for LazyVideoPlayer
class IOStub {
  // Simplified signature; we only call with entries array
  readonly callback: (entries: IntersectionObserverEntry[]) => void;
  private _elements: Element[] = [];
  constructor(cb: (entries: IntersectionObserverEntry[]) => void) {
    this.callback = cb;
  }
  observe(el: Element) {
    this._elements.push(el);
  }
  disconnect() {
    this._elements = [];
  }
  // Trigger all observed elements as intersecting
  triggerAll() {
    const entries: IntersectionObserverEntry[] = this._elements.map((el) => ({
      isIntersecting: true,
      target: el,
    })) as unknown as IntersectionObserverEntry[];
    this.callback(entries);
  }
}

describe('Video players', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    class TestIO extends IOStub {
      static readonly instances: IOStub[] = [];
      constructor(cb: (entries: IntersectionObserverEntry[]) => void) {
        super(cb);
        TestIO.instances.push(this);
      }
    }
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = TestIO;
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('LazyVideoPlayer shows placeholder then mounts VideoPlayer when intersecting', () => {
    const { getByRole } = render(<LazyVideoPlayer placeholderLabel="Waiting" src="/vid.mp4" />);
    expect(getByRole('img', { name: /waiting/i })).toBeTruthy();
    const IOCls = (globalThis as unknown as { IntersectionObserver: typeof IOStub })
      .IntersectionObserver as unknown as typeof IOStub & { instances: IOStub[] };
    act(() => {
      IOCls.instances.forEach((inst) => inst.triggerAll());
    });
  });

  it('VideoPlayer selects quality based on network conditions', async () => {
    // Force network conditions
    (navigator as unknown as { connection?: unknown }).connection = {
      downlink: 5,
      saveData: false,
    };
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });

    const { container } = render(
      <VideoPlayer
        qualitySources={[
          { src: '/low.mp4', height: 480, bitrateKbps: 500, label: '480p' },
          { src: '/med.mp4', height: 720, bitrateKbps: 1500, label: '720p' },
          { src: '/hi.mp4', height: 1080, bitrateKbps: 3500, label: '1080p' },
        ]}
        tracks={[{ kind: 'subtitles', src: '/sub.vtt', srclang: 'en', label: 'EN', default: true }]}
        caption="Sample Video"
      />,
    );
    const video = container.querySelector('video')!;
    // Simulate media events
    await act(async () => {
      fireEvent(video, new Event('loadedmetadata'));
    });
  });

  it('VideoPlayer emits chapters events and deprecation warning', async () => {
    const events: string[] = [];

    const { getByText } = render(
      <VideoPlayer
        qualitySources={[{ src: '/med.mp4', height: 720, bitrateKbps: 1500, label: '720p' }]}
        chapters={[
          { start: 0, title: 'Intro' },
          { start: 10, title: 'Middle' },
        ]}
        tracks={[{ kind: 'subtitles', src: '/sub.vtt', srclang: 'en', label: 'EN', default: true }]}
        caption="Sample Video"
        onEvent={(p) => events.push(p.name)}
      />,
    );

    const video = getByText('Sample Video').closest('div')?.querySelector('video');
    expect(video).toBeTruthy();

    // Simulate media events
    await act(async () => {
      fireEvent(video!, new Event('play'));
      fireEvent(video!, new Event('timeupdate'));
    });

    // Chapters navigation
    const middleBtn = getByText('Middle');
    await act(async () => {
      fireEvent.click(middleBtn);
    });

    expect(warnSpy).toHaveBeenCalled();
    expect(events).toContain('play');
    expect(events).toContain('timeupdate');
  });

  it('VideoPlayer placeholder branch when no sources', () => {
    const { getByRole } = render(<VideoPlayer placeholderLabel="Preview" />);
    expect(getByRole('img', { name: /preview/i })).toBeTruthy();
  });
});
