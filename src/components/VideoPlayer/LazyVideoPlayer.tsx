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
        <img
          src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjE2QzE0IDE3LjEgMTMuMSAxOCA5LjUgMTJDOS41IDE4IDggMTcuMSAxNiAxNkMxNiAxNC45IDE2LjkgMTQgMTggMTRIMTJDMTguMSAxNCAxOSAxNC45IDE5IDE2VjE4QzE5IDE5LjEgMTguMSAyMCAxNyAyMEgxN0MxNS45IDIwIDE1IDE5LjEgMTUgMThWNFoiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+"
          alt={rest.placeholderLabel || 'Video loading placeholder'}
          className="lazy-video-placeholder"
        />
      )}
    </div>
  );
}
