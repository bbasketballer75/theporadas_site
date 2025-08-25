import React, { useEffect, useRef, useState } from 'react';

import { VideoPlayer, VideoPlayerProps } from './VideoPlayer';

export interface LazyVideoPlayerProps extends VideoPlayerProps {
  rootMargin?: string;
  aspectRatio?: string; // e.g. "16/9"
}

export function LazyVideoPlayer(props: LazyVideoPlayerProps) {
  const { rootMargin = '200px', aspectRatio = '16/9', ...rest } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = containerRef.current;
    if (!el) return;
    const supports = typeof IntersectionObserver !== 'undefined';
    if (!supports) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio,
        display: 'block',
      }}
    >
      {visible ? (
        <VideoPlayer {...rest} />
      ) : (
        <div
          role="img"
          aria-label={rest.placeholderLabel || 'Video loading placeholder'}
          style={{
            inset: 0,
            position: 'absolute',
            background: '#e2e2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            color: '#555',
            fontFamily: 'sans-serif',
          }}
        >
          {rest.placeholderLabel || 'Loading video'}
        </div>
      )}
    </div>
  );
}
