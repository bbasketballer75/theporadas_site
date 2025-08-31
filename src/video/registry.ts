import type {
  ChapterDef,
  QualitySource,
  VideoTrackDef,
} from '../components/VideoPlayer/VideoPlayer';

export interface VideoMeta {
  id: string;
  title: string;
  caption: string;
  poster: string;
  placeholderLabel: string;
  quality: QualitySource[];
  tracks?: VideoTrackDef[];
  chapters?: ChapterDef[];
  // Future: durations, aspect ratio, etc.
}

const heroQuality: QualitySource[] = [
  {
    src: '/media/videos/final-wedding-video.mp4',
    type: 'video/mp4',
    height: 1080,
    bitrateKbps: 6000,
    label: '1080p',
    default: true,
  },
];

const videos: Record<string, VideoMeta> = {
  hero: {
    id: 'hero',
    title: 'Poradas Wedding Feature',
    caption: 'Poradas Wedding Feature',
    // Poster currently a placeholder frame; replace with final exported still when available.
    poster: '/media/posters/hero.jpg',
    placeholderLabel: 'Loading hero video',
    quality: heroQuality,
    tracks: [
      {
        kind: 'chapters',
        src: '/media/videos/main-film-chapters.vtt',
        srcLang: 'en',
        label: 'Chapters',
        default: true,
      },
      {
        kind: 'captions',
        src: '/media/videos/main-film-chapters.vtt', // Using chapters file as placeholder for captions
        srcLang: 'en',
        label: 'English Captions',
        default: false,
      },
    ],
    chapters: [
      { start: 0, title: 'Opening' },
      { start: 30, title: 'Ceremony' },
      { start: 90, title: 'Reception' },
      { start: 150, title: 'First Dance' },
    ],
  },
};

export function getVideo(id: string): VideoMeta | undefined {
  return videos[id];
}

export function listVideos(): VideoMeta[] {
  return Object.values(videos);
}

export type { QualitySource };
