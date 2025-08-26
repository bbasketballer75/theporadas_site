import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { VideoPlayer } from '../src/components/VideoPlayer/VideoPlayer';

import { runAxe, formatViolations } from './utils/axeHelper';

describe('VideoPlayer accessibility', () => {
  const chapters = [
    { title: 'Intro', start: 0 },
    { title: 'Middle', start: 10 },
  ];

  it('placeholder mode + chapters nav has no violations', async () => {
    const { container } = render(
      <VideoPlayer showChapters chapters={chapters} placeholderLabel="Sample Placeholder" />,
    );
    const { violations } = await runAxe(container);
    if (violations.length) {
      throw new Error(`VideoPlayer placeholder violations:\n${formatViolations(violations)}`);
    }
    expect(violations.length).toBe(0);
  });

  it('chapter selection updates aria-current without violations', async () => {
    const { container, getAllByRole } = render(
      <VideoPlayer showChapters chapters={chapters} src="data:video/mp4;base64,AAAA" />,
    );
    let buttons = getAllByRole('button');
    expect(buttons[0].getAttribute('aria-current')).toBe('true');
    await act(async () => {
      fireEvent.click(buttons[1]);
      const vidEl = container.querySelector('video');
      if (vidEl) {
        (vidEl as HTMLVideoElement).currentTime = 10;
        vidEl.dispatchEvent(new Event('seeking'));
        vidEl.dispatchEvent(new Event('timeupdate'));
      }
    });
    buttons = getAllByRole('button');
    expect(buttons[1].getAttribute('aria-current')).toBe('true');
    const { violations } = await runAxe(container);
    if (violations.length) {
      throw new Error(`VideoPlayer chapter change violations:\n${formatViolations(violations)}`);
    }
    expect(violations.length).toBe(0);
  });
});
