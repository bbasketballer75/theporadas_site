import React, { useEffect, useRef } from 'react';

import { useMotionPreference } from '../hooks/useMotionPreference';
import { getVideo } from '../video/registry';

import { LazyVideoPlayer } from './VideoPlayer/LazyVideoPlayer';
import { QualitySource } from './VideoPlayer/VideoPlayer';

export interface HeroVideoProps {
  qualitySources?: QualitySource[];
  src?: string;
  poster?: string;
  caption?: string;
  children?: React.ReactNode;
}

export function HeroVideo({ qualitySources, poster, caption, children }: HeroVideoProps) {
  const videoWrapperRef = useRef<HTMLDivElement | null>(null);

  const motionPref = useMotionPreference();

  useEffect(() => {
    const root = videoWrapperRef.current;
    if (!root) return;
    const vid = root.querySelector<HTMLVideoElement>('video');
    if (!vid) return;
    if (motionPref === 'reduce') vid.pause();
  }, [motionPref]);

  const heroMeta = getVideo('hero');
  const ladder =
    qualitySources && qualitySources.length > 0
      ? qualitySources
      : heroMeta?.quality.map((q) => ({ ...q, src: q.src })) || [];
  const effectivePoster = poster || heroMeta?.poster;
  const effectiveCaption = caption || heroMeta?.caption || 'Hero Feature';
  const placeholderLabel = heroMeta?.placeholderLabel || 'Loading hero video';
  const shouldAutoplay = motionPref === 'no-preference';

  return (
    <div
      className="hero-video-shell"
      aria-label={effectiveCaption || 'Hero video'}
      ref={videoWrapperRef}
    >
      <LazyVideoPlayer
        qualitySources={ladder}
        poster={effectivePoster}
        caption={effectiveCaption}
        placeholderLabel={placeholderLabel}
        showChapters={false}
        autoPlay={shouldAutoplay}
        muted={shouldAutoplay}
        playsInline
      />
      <div className="hero-video-overlay">{children}</div>
    </div>
  );
}
