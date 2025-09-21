import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  QualitySource,
  VideoPlayer,
  VideoPlayerEventPayload,
  VideoTrackDef,
} from '../src/components/VideoPlayer/VideoPlayer';

// Minimal typing for the NetworkInformation subset we need.
interface NetworkInformationLike {
  saveData?: boolean;
  downlink?: number;
  [k: string]: unknown;
}
interface NavigatorWithConn extends Navigator {
  connection?: NetworkInformationLike;
}
function setupConnection(overrides: Partial<NetworkInformationLike> = {}) {
  (navigator as NavigatorWithConn).connection = { saveData: false, downlink: 5, ...overrides };
}
function clearConnection() {
  delete (navigator as NavigatorWithConn).connection;
}

describe('VideoPlayer quality heuristics', () => {
  const baseSources: QualitySource[] = [
    { src: 'v144.mp4', height: 144, bitrateKbps: 200 },
    { src: 'v360.mp4', height: 360, bitrateKbps: 500 },
    { src: 'v540.mp4', height: 540, bitrateKbps: 1200 },
    { src: 'v720.mp4', height: 720, bitrateKbps: 2500 },
    { src: 'v1080.mp4', height: 1080, bitrateKbps: 4500 },
  ];

  let origInnerHeight: number;
  beforeEach(() => {
    origInnerHeight = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  });
  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', { value: origInnerHeight, configurable: true });
    clearConnection();
  });

  it('chooses highest quality when preferHighestQuality', () => {
    render(<VideoPlayer qualitySources={baseSources} preferHighestQuality />);
    expect(document.querySelector('source')).toBeNull();
    expect(document.querySelector('video')?.getAttribute('src')).toContain('1080');
  });

  it('respects saveData lowering target resolution', () => {
    setupConnection({ saveData: true, downlink: 5 });
    render(<VideoPlayer qualitySources={baseSources} />);
    // saveData lowers potential target; innerHeight=800 -> target 720 then clamped to <=480
    const src = document.querySelector('video')?.getAttribute('src') || '';
    expect(src).toMatch(/(360|144|480)/); // should not be 720/1080
  });

  it('fallbacks to smallest when none under targetHeight', () => {
    // Force target smaller than smallest by mocking viewport extremely small so targetHeight=480 but filter later
    Object.defineProperty(window, 'innerHeight', { value: 10, configurable: true });
    // Provide only very large sources so filter yields empty -> fallback last (smallest after sort -> originally largest height)
    const huge: QualitySource[] = [
      { src: 'big1.mp4', height: 4000 },
      { src: 'big2.mp4', height: 3000 },
    ];
    render(<VideoPlayer qualitySources={huge} />);
    const src = document.querySelector('video')?.getAttribute('src') || '';
    // After sort desc, fallback uses smallest => 3000
    expect(src).toContain('big2');
  });

  it('filters by bitrate using downlink budget', () => {
    setupConnection({ downlink: 3 }); // 3 Mbps, budget 0.85 * 3 = 2.55 Mbps (~2550 kbps)
    render(<VideoPlayer qualitySources={baseSources} />);
    const chosen = document.querySelector('video')?.getAttribute('src') || '';
    // 720 has 2500 kbps within budget, 1080 (4500) should be excluded
    expect(chosen).toMatch(/720|540/);
    expect(chosen).not.toContain('1080');
  });

  it('warns on deprecated srclang in dev', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tracks: VideoTrackDef[] = [
      { kind: 'subtitles', src: 'subs.vtt', srclang: 'en', label: 'English' },
    ];
    render(<VideoPlayer src="only.mp4" tracks={tracks} />);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('retains candidates when all exceed bitrate budget (empty filter result)', () => {
    // downlink very small so budget ~0.85 * 0.5 = 0.425 Mbps; all bitrates above
    setupConnection({ downlink: 0.5 });
    const qs: QualitySource[] = [
      { src: 'low.mp4', height: 144, bitrateKbps: 600 },
      { src: 'med.mp4', height: 360, bitrateKbps: 800 },
    ];
    render(<VideoPlayer qualitySources={qs} />);
    const chosen = document.querySelector('video')?.getAttribute('src') || '';
    // Should pick highest height (360) despite over-budget bitrates.
    expect(chosen).toContain('med');
  });

  it('preferHighestQuality ignores saveData and slow downlink', () => {
    setupConnection({ saveData: true, downlink: 0.3 });
    const qs: QualitySource[] = [
      { src: 'hi.mp4', height: 1080, bitrateKbps: 8000 },
      { src: 'mid.mp4', height: 720, bitrateKbps: 2500 },
    ];
    render(<VideoPlayer qualitySources={qs} preferHighestQuality />);
    const chosen = document.querySelector('video')?.getAttribute('src') || '';
    expect(chosen).toContain('hi');
  });

  it('does not warn in production mode when srclang present', () => {
    (globalThis as unknown as { __VIDEOPLAYER_MODE__?: string }).__VIDEOPLAYER_MODE__ =
      'production';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tracks: VideoTrackDef[] = [
      { kind: 'subtitles', src: 'subs.vtt', srclang: 'en', label: 'English' },
    ];
    render(<VideoPlayer src="only.mp4" tracks={tracks} />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    delete (globalThis as unknown as { __VIDEOPLAYER_MODE__?: string }).__VIDEOPLAYER_MODE__;
  });

  it('renders multiple <source> elements when given sources array (no qualitySources)', () => {
    const sources: QualitySource[] = [
      { src: 'a.mp4', height: 480 },
      { src: 'b.webm', height: 480, type: 'video/webm' },
    ];
    // Use the regular sources prop, not qualitySources, to trigger <source> rendering.
    render(<VideoPlayer sources={sources.map((s) => ({ src: s.src, type: s.type }))} />);
    const video = document.querySelector('video');
    expect(video?.getAttribute('src')).toBeNull(); // using <source> children instead
    const srcEls = document.querySelectorAll('source');
    expect(srcEls.length).toBe(2);
  });

  it('renders placeholder when no src/sources/qualitySources provided', () => {
    render(<VideoPlayer />);
    expect(document.querySelector('video')).toBeNull();
    const placeholder = document.querySelector('img[alt="Sample (placeholder)"]');
    expect(placeholder).not.toBeNull();
  });

  it('single oversized quality source still selected via fallback path', () => {
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true }); // target 720
    const qs: QualitySource[] = [{ src: 'giant.mp4', height: 4000, bitrateKbps: 12000 }];
    render(<VideoPlayer qualitySources={qs} />);
    const chosen = document.querySelector('video')?.getAttribute('src') || '';
    expect(chosen).toContain('giant');
  });
});

// Chapter & timestamp behavior coverage
describe('VideoPlayer chapters & timestamps', () => {
  const chapters = [
    { start: 0, title: 'Intro' },
    { start: 65, title: 'Middle' },
    { start: 130, title: 'End' },
  ];

  function dispatch(el: HTMLVideoElement, name: string) {
    el.dispatchEvent(new Event(name));
  }

  it('renders no chapter timestamps before metadata, then shows and updates chapter index', async () => {
    const events: VideoPlayerEventPayload[] = [];
    const onEvent = (p: VideoPlayerEventPayload) => events.push(p);
    const { container } = render(
      <VideoPlayer src="video.mp4" chapters={chapters} onEvent={onEvent} />,
    );
    const video = container.querySelector('video') as HTMLVideoElement;
    expect(container.querySelectorAll('nav[aria-label="Chapters"] span').length).toBe(0);
    Object.defineProperty(video, 'duration', {
      configurable: true,
      get: () => 300,
    });
    fireEvent(video, new Event('loadedmetadata'));
    await waitFor(() => {
      const spans = container.querySelectorAll('nav[aria-label="Chapters"] span');
      expect(spans.length).toBe(chapters.length);
      expect(spans[1].textContent).toBe('01:05');
    });
    let ct = 0;
    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      get: () => ct,
      set: (v) => {
        ct = v;
      },
    });
    video.currentTime = 70;
    fireEvent(video, new Event('timeupdate'));
    await waitFor(() => {
      const buttons = container.querySelectorAll('nav[aria-label="Chapters"] button');
      expect(buttons[1].getAttribute('aria-current')).toBe('true');
    });
    // Fire a second timeupdate so the listener bound after re-render emits with updated chapterIndex
    fireEvent(video, new Event('timeupdate'));
    const lastTime = events.filter((e) => e.name === 'timeupdate').pop();
    expect(lastTime?.chapterIndex).toBe(1);
  });

  it('chapter button click seeks and emits seeking event', async () => {
    const events: VideoPlayerEventPayload[] = [];
    const onEvent = (p: VideoPlayerEventPayload) => events.push(p);
    const { container } = render(
      <VideoPlayer src="video.mp4" chapters={chapters} onEvent={onEvent} />,
    );
    const video = container.querySelector('video') as HTMLVideoElement;
    await act(async () => {
      Object.defineProperty(video, 'duration', { value: 300, configurable: true });
      dispatch(video, 'loadedmetadata');
    });
    const buttons = container.querySelectorAll('nav[aria-label="Chapters"] button');
    await act(async () => {
      fireEvent.click(buttons[2]);
    });
    expect(events.find((e) => e.name === 'seeking')).toBeTruthy();
    expect((video as unknown as { currentTime: number }).currentTime).toBe(130);
  });

  it('warns when using deprecated srclang prop in non-production mode', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tracks = [
      { kind: 'subtitles', src: 'subs.vtt', srclang: 'en', label: 'English', default: true },
    ];
    render(<VideoPlayer src="video.mp4" tracks={tracks as unknown as VideoTrackDef[]} />);
    // Trigger effect: add a dummy metadata event so track mapping already executed; mapping happens on initial render
    expect(warnSpy).toHaveBeenCalledWith(
      "[VideoPlayer] 'srclang' prop is deprecated; use 'srcLang' instead.",
    );
    warnSpy.mockRestore();
  });
});
