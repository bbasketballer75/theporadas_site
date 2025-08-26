import { render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  VideoPlayer,
  QualitySource,
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
});
