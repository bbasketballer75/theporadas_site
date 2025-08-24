import React, { useEffect, useRef } from 'react';

import { useMotionPreference } from '../hooks/useMotionPreference';

import { LazyVideoPlayer } from './VideoPlayer/LazyVideoPlayer';
import { QualitySource } from './VideoPlayer/VideoPlayer';

export interface HeroVideoProps {
  qualitySources?: QualitySource[];
  src?: string;
  poster?: string;
  caption?: string;
  children?: React.ReactNode;
}

export function HeroVideo({ qualitySources, src, poster, caption, children }: HeroVideoProps) {
  const videoWrapperRef = useRef<HTMLDivElement | null>(null);

  const motionPref = useMotionPreference();

  useEffect(() => {
    const root = videoWrapperRef.current;
    if (!root) return;
    const vid = root.querySelector<HTMLVideoElement>('video');
    if (!vid) return;
    if (motionPref === 'reduce') vid.pause();
  }, [motionPref]);

  const placeholderQuality: QualitySource[] = [
    {
      src: src || '/media/encoded/hero-480.mp4',
      type: 'video/mp4',
      height: 480,
      bitrateKbps: 1200,
      label: '480p',
      default: true,
    },
    {
      src: '/media/encoded/hero-720.mp4',
      type: 'video/mp4',
      height: 720,
      bitrateKbps: 3000,
      label: '720p',
    },
    {
      src: '/media/encoded/hero-1080.mp4',
      type: 'video/mp4',
      height: 1080,
      bitrateKbps: 6000,
      label: '1080p',
    },
  ];

  const ladder = qualitySources && qualitySources.length > 0 ? qualitySources : placeholderQuality;
  const shouldAutoplay = motionPref === 'no-preference';

  return (
    <div className="hero-video-shell" aria-label={caption || 'Hero video'} ref={videoWrapperRef}>
      <LazyVideoPlayer
        qualitySources={ladder}
        poster={poster}
        caption={caption || 'Hero Feature'}
        placeholderLabel="Loading hero video"
        showChapters={false}
        autoPlay={shouldAutoplay}
        muted={shouldAutoplay}
        playsInline
      />
      <div className="hero-video-overlay">{children}</div>
    </div>
  );
}
