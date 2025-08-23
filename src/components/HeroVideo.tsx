import React from "react";

import { LazyVideoPlayer } from "./VideoPlayer/LazyVideoPlayer";
import { QualitySource } from "./VideoPlayer/VideoPlayer";

export interface HeroVideoProps {
  /** Primary hero video sources with quality metadata. Provide once available. */
  qualitySources?: QualitySource[];
  /** Fallback single src if quality ladder not yet encoded. */
  src?: string;
  /** Accessible caption for the video content. */
  caption?: string;
  /** Optional overlay content (e.g., headline) */
  children?: React.ReactNode;
}

export function HeroVideo({
  qualitySources,
  src,
  caption,
  children,
}: HeroVideoProps) {
  const placeholderQuality: QualitySource[] = [
    {
      src: src || "/media/encoded/hero-480.mp4",
      type: "video/mp4",
      height: 480,
      bitrateKbps: 1200,
      label: "480p",
      default: true,
    },
    {
      src: "/media/encoded/hero-720.mp4",
      type: "video/mp4",
      height: 720,
      bitrateKbps: 3000,
      label: "720p",
    },
    {
      src: "/media/encoded/hero-1080.mp4",
      type: "video/mp4",
      height: 1080,
      bitrateKbps: 6000,
      label: "1080p",
    },
  ];

  const ladder =
    qualitySources && qualitySources.length > 0
      ? qualitySources
      : placeholderQuality;

  return (
    <div className="hero-video-shell" aria-label={caption || "Hero video"}>
      <LazyVideoPlayer
        qualitySources={ladder}
        caption={caption || "Hero Feature"}
        placeholderLabel="Loading hero video"
        showChapters={false}
      />
      <div className="hero-video-overlay">{children}</div>
    </div>
  );
}
