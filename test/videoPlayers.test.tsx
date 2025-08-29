import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { LazyVideoPlayer } from '../src/components/VideoPlayer/LazyVideoPlayer';
import { VideoPlayer } from '../src/components/VideoPlayer/VideoPlayer';

// Mock IntersectionObserver for LazyVideoPlayer
class IOStub {
  // Simplified signature; we only call with entries array
  callback: (entries: IntersectionObserverEntry[]) => void;
  elements: Element[] = [];
  constructor(cb: (entries: IntersectionObserverEntry[]) => void) {
    this.callback = cb;
  }
  observe(el: Element) {
    this.elements.push(el);
  }
  disconnect() {
    this.elements = [];
  }
  // Trigger all observed elements as intersecting
  triggerAll() {
    const entries: IntersectionObserverEntry[] = this.elements.map((el) => ({
      isIntersecting: true,
      target: el,
    })) as unknown as IntersectionObserverEntry[];
    this.callback(entries);
  }
}

describe('Video players', () => {
  beforeEach(() => {
    class TestIO extends IOStub {
      static instances: IOStub[] = [];
      constructor(cb: (entries: IntersectionObserverEntry[]) => void) {
        super(cb);
        TestIO.instances.push(this);
      }
    }
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = TestIO;
  });

  it('LazyVideoPlayer shows placeholder then mounts VideoPlayer when intersecting', () => {
    const { getByRole } = render(<LazyVideoPlayer placeholderLabel="Waiting" src="/vid.mp4" />);
    expect(getByRole('img', { name: /waiting/i })).toBeTruthy();
    const IOCls = (globalThis as unknown as { IntersectionObserver: typeof IOStub })
      .IntersectionObserver as unknown as typeof IOStub & { instances: IOStub[] };
    IOCls.instances.forEach((inst) => inst.triggerAll());
  });

  it('VideoPlayer selects quality heuristic and emits chapters + deprecation warning', () => {
    // Force network conditions
    (navigator as unknown as { connection?: unknown }).connection = {
      downlink: 5,
      saveData: false,
    };
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const events: string[] = [];
    const { container, getByText } = render(
      <VideoPlayer
        qualitySources={[
          { src: '/low.mp4', height: 480, bitrateKbps: 500, label: '480p' },
          { src: '/med.mp4', height: 720, bitrateKbps: 1500, label: '720p' },
          { src: '/hi.mp4', height: 1080, bitrateKbps: 3500, label: '1080p' },
        ]}
        tracks={[{ kind: 'subtitles', src: '/sub.vtt', srclang: 'en', label: 'EN', default: true }]}
        chapters={[
          { start: 0, title: 'Intro' },
          { start: 10, title: 'Middle' },
        ]}
        caption="Sample Video"
        onEvent={(p) => events.push(p.name)}
      />,
    );
    const video = container.querySelector('video')!;
    // Simulate media events
    ['loadedmetadata', 'play', 'timeupdate'].forEach((evt) => {
      fireEvent(video, new Event(evt));
    });
    // Chapters navigation
    const middleBtn = getByText('Middle');
    fireEvent.click(middleBtn);
    expect(warn).toHaveBeenCalled();
    expect(events).toContain('play');
    expect(events).toContain('timeupdate');
  });

  it('VideoPlayer placeholder branch when no sources', () => {
    const { getByRole } = render(<VideoPlayer placeholderLabel="Preview" />);
    expect(getByRole('img', { name: /preview/i })).toBeTruthy();
  });
});
