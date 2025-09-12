import { act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock heavy/side-effect components BEFORE importing main
vi.mock('../src/components/BackgroundAudio', () => ({
  BackgroundAudio: () => null,
}));
vi.mock('../src/components/PerformanceMonitor', () => ({
  PerformanceMonitor: () => null,
}));
vi.mock('../src/components/GuestMessages', () => ({
  GuestMessages: () => null,
}));
vi.mock('../src/components/VideoPlayer/VideoPlayer', () => ({
  VideoPlayer: () => null,
}));
vi.mock('../src/video/registry', () => ({
  listVideos: () => [],
}));

describe('main bootstrap', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });
  it('mounts App into #root with #appShell present', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    await act(async () => {
      await import('../src/main');
    });
    await waitFor(() => {
      expect(document.getElementById('appShell')).toBeTruthy();
    });
  });

  it('throws if #root missing', async () => {
    const existing = document.getElementById('root');
    if (existing) existing.remove();
    // Dynamically import with a unique query to avoid module cache
    const unique = Date.now();
    await expect(import(`../src/main?raw=${unique}`)).rejects.toThrow(/Root element/);
  });
});
