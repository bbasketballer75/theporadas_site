import type { QualitySource } from '../components/VideoPlayer/VideoPlayer';

export interface VideoMeta {
  id: string;
  title: string;
  caption: string;
  poster: string;
  placeholderLabel: string;
  quality: QualitySource[];
  // Future: tracks, chapters, durations, aspect ratio, etc.
}

const heroQuality: QualitySource[] = [
  {
    src: '/media/encoded/hero-480.mp4',
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

const videos: Record<string, VideoMeta> = {
  hero: {
    id: 'hero',
    title: 'Poradas Wedding Feature',
    caption: 'Poradas Wedding Feature',
    poster: '/media/posters/hero.jpg', // TODO: supply actual poster asset
    placeholderLabel: 'Loading hero video',
    quality: heroQuality,
  },
};

export function getVideo(id: string): VideoMeta | undefined {
  return videos[id];
}

export function listVideos(): VideoMeta[] {
  return Object.values(videos);
}

export type { QualitySource };
