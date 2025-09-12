import { useEffect, useRef, useState } from 'react';

import './LazyVideoPlayer.css';
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

  const arClass = aspectRatio === '4/3' ? 'ar-4x3' : 'ar-16x9';
  return (
    <div ref={containerRef} className={`lazy-video-container ${arClass}`}>
      {visible ? (
        <VideoPlayer {...rest} />
      ) : (
        <div
          className="lazy-video-placeholder"
          role="img"
          aria-label={rest.placeholderLabel || 'Video loading placeholder'}
        >
          {rest.placeholderLabel || 'Loading video'}
        </div>
      )}
    </div>
  );
}
