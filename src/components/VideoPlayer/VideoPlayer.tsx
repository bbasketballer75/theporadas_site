import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import './VideoPlayer.css';
import { detectBrowser } from '../../utils/browserDetection';

export interface VideoSource {
  src: string;
  type?: string; // e.g., "video/mp4" | "video/webm"
}

export type TrackKind = 'subtitles' | 'captions' | 'chapters' | 'metadata' | 'descriptions';

export interface VideoTrackDef {
  kind: TrackKind;
  src: string;
  /**
   * @deprecated Use `srcLang` (camelCase) instead. Kept for backward compatibility.
   */
  srclang?: string;
  /** React uses camelCase srcLang attribute; accept either for inputs. */
  srcLang?: string;
  label?: string;
  default?: boolean;
}

export interface ChapterDef {
  start: number; // seconds
  title: string;
}

export type VideoPlayerEventName =
  | 'play'
  | 'pause'
  | 'timeupdate'
  | 'ended'
  | 'seeking'
  | 'seeked'
  | 'error'
  | 'loadedmetadata';

export interface VideoPlayerEventPayload {
  name: VideoPlayerEventName;
  currentTime: number;
  duration: number | null;
  src: string | null;
  chapterIndex: number | null;
}

export interface VideoPlayerProps {
  src?: string; // convenience single source
  sources?: VideoSource[]; // multi-source list
  /**
   * Optional quality-tiered sources. If provided, overrides `src` / `sources`.
   * The component will select the most appropriate single source to load
   * (not multiple <source> elements) based on network + viewport heuristics.
   */
  qualitySources?: QualitySource[];
  /** If true, always pick the highest height quality source ignoring heuristics. */
  preferHighestQuality?: boolean;
  tracks?: VideoTrackDef[];
  chapters?: ChapterDef[];
  caption?: string;
  placeholderLabel?: string;
  onEvent?: (payload: VideoPlayerEventPayload) => void;
  showChapters?: boolean;
  /** Optional poster image shown before playback begins. */
  poster?: string;
  /** Attempt to autoplay (caller must ensure muted for browsers). */
  autoPlay?: boolean;
  /** Pass through muted attribute (often required for autoplay). */
  muted?: boolean;
  /** Pass through playsInline attribute (iOS inline playback). */
  playsInline?: boolean;
}

export interface QualitySource extends VideoSource {
  /** Approx vertical resolution of the encoded asset (e.g., 1080, 720). */
  height: number;
  /** Approximate bitrate in kbps (used to compare against connection). */
  bitrateKbps?: number;
  /** Optional label ("1080p", etc.). */
  label?: string;
  /** Mark as default fallback if heuristic uncertain. */
  default?: boolean;
}

export const ReadyAndLoadedVideoState = "ReadyAndLoadedVideoState";

export function VideoPlayer(props: VideoPlayerProps) {
  const {
    src,
    sources,
    qualitySources,
    preferHighestQuality,
    tracks,
    chapters,
    caption,
    placeholderLabel,
    onEvent,
    showChapters = true,
    poster,
    autoPlay,
    muted,
    playsInline,
  } = props;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [retryTimeout, setRetryTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const maxRetries = 3;
  const loadingTimeoutMs = 10000; // 10 seconds

  // Browser detection for compatibility fixes
  const browserInfo = useMemo(() => detectBrowser(), []);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeout) clearTimeout(loadingTimeout);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [loadingTimeout, retryTimeout]);

  // Handle loading timeout
  const handleLoadingTimeout = useCallback(() => {
    if (isLoading && loadAttempts < maxRetries) {
      setHasError(true);
      setIsLoading(false);
      // Trigger retry after a delay
      const retryId = setTimeout(() => {
        setLoadAttempts(prev => prev + 1);
        setHasError(false);
        setIsLoading(true);
        // Force reload by changing src temporarily
        const video = videoRef.current;
        if (video) {
          const currentSrc = video.src;
          video.src = '';
          video.load();
          setTimeout(() => {
            if (video) {
              video.src = currentSrc;
              video.load();
            }
          }, 100);
        }
      }, 2000); // 2 second delay before retry
      setRetryTimeout(retryId);
    } else if (loadAttempts >= maxRetries) {
      setHasError(true);
      setIsLoading(false);
    }
  }, [isLoading, loadAttempts, maxRetries]);

  // Check video readyState for granular loading states
  const checkReadyState = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const readyState = video.readyState;
    switch (readyState) {
      case 0: // HAVE_NOTHING
        setIsLoading(true);
        break;
      case 1: // HAVE_METADATA
        setIsLoading(true);
        break;
      case 2: // HAVE_CURRENT_DATA
        setIsLoading(true);
        break;
      case 3: // HAVE_FUTURE_DATA
        setIsLoading(false);
        break;
      case 4: // HAVE_ENOUGH_DATA
        setIsLoading(false);
        break;
    }
  }, []);

  // Start loading timeout when loading begins
  const startLoadingTimeout = useCallback(() => {
    if (loadingTimeout) clearTimeout(loadingTimeout);
    const timeoutId = setTimeout(handleLoadingTimeout, loadingTimeoutMs);
    setLoadingTimeout(timeoutId);
  }, [handleLoadingTimeout, loadingTimeout, loadingTimeoutMs]);

  // Clear loading timeout when loading completes
  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }
  }, [loadingTimeout]);

  // Quality selection heuristic – choose ONE best source when qualitySources provided.
  const selectedQualitySource = useMemo<QualitySource | undefined>(() => {
    if (!qualitySources || qualitySources.length === 0) return undefined;
    if (preferHighestQuality) {
      return [...qualitySources].sort((a, b) => b.height - a.height)[0];
    }
    const sorted = [...qualitySources].sort((a, b) => b.height - a.height);

    // Gather signals
    const rawConnection =
      typeof navigator !== 'undefined' &&
      (navigator as unknown as { connection?: unknown }).connection
        ? (navigator as unknown as { connection?: unknown }).connection
        : undefined;
    interface NetInfo {
      saveData?: boolean;
      downlink?: number; // Mbps
    }
    const connection: NetInfo = (rawConnection || {}) as NetInfo;
    const saveData: boolean = !!connection.saveData;
    const downlink: number | undefined =
      typeof connection.downlink === 'number' ? connection.downlink : undefined; // Mbps
    const viewportH = typeof window !== 'undefined' ? window.innerHeight || 0 : 0;

    // Establish target resolution based on viewport height (simple mapping).
    let targetHeight = 480;
    if (viewportH >= 900) targetHeight = 1080;
    else if (viewportH >= 720) targetHeight = 720;
    else if (viewportH >= 540) targetHeight = 540;

    // If save-data requested, clamp target lower.
    if (saveData) targetHeight = Math.min(targetHeight, 480);

    // Filter candidates under or equal to targetHeight (fallback to smallest if none)
    let candidates = sorted.filter((q) => q.height <= targetHeight);
    if (candidates.length === 0) candidates = [sorted[sorted.length - 1]]; // smallest

    // If connection downlink present & bitrate data exists, prefer medium that fits budget.
    if (downlink && downlink > 0) {
      const mbpsBudget = downlink * (saveData ? 0.6 : 0.85);
      // Convert candidate bitrate to Mbps and filter under budget
      const bitrateFiltered = candidates.filter((c) => {
        if (!c.bitrateKbps) return true; // unknown bitrate -> keep
        return c.bitrateKbps / 1000 <= mbpsBudget;
      });
      if (bitrateFiltered.length) candidates = bitrateFiltered;
    }

    // Prefer highest resolution within candidates.
    return candidates.sort((a, b) => b.height - a.height)[0];
  }, [qualitySources, preferHighestQuality]);

  // Merge single src into sources list for rendering (ignored if qualitySources active)
  const resolvedSources = useMemo<VideoSource[] | undefined>(() => {
    if (selectedQualitySource)
      return [{ src: selectedQualitySource.src, type: selectedQualitySource.type }];
    if (sources && sources.length) return sources;
    if (src) return [{ src }];
    return undefined;
  }, [sources, src, selectedQualitySource]);

  const chapterIndex = useMemo(() => {
    if (!chapters || !chapters.length) return null;
    // Find last chapter whose start <= currentTime
    let idx: number | null = null;
    for (let i = 0; i < chapters.length; i += 1) {
      if (currentTime >= chapters[i].start) idx = i;
      else break;
    }
    return idx;
  }, [chapters, currentTime]);

  const emit = useCallback(
    (name: VideoPlayerEventName) => {
      if (!onEvent) return;
      const el = videoRef.current;
      onEvent({
        name,
        currentTime: el ? el.currentTime : 0,
        duration: el && !Number.isNaN(el.duration) ? el.duration : null,
        src: el ? el.currentSrc || el.getAttribute('src') : null,
        chapterIndex,
      });
    },
    [onEvent, chapterIndex],
  );

  // Select best video source based on browser codec support
  const selectBestSource = useCallback((sources: VideoSource[]): VideoSource | null => {
    if (!sources || sources.length === 0) return null;

    // Firefox prefers WebM, Safari prefers MP4 with H.264, Chrome supports both
    const preferredOrder = browserInfo.name === 'firefox'
      ? ['video/webm', 'video/mp4']
      : browserInfo.name === 'safari'
      ? ['video/mp4', 'video/webm']
      : ['video/mp4', 'video/webm'];

    for (const mimeType of preferredOrder) {
      const source = sources.find(s => s.type === mimeType);
      if (source) {
        // Additional codec check for MP4
        if (mimeType === 'video/mp4' && !browserInfo.supportsVideoCodecs.h264) {
          continue;
        }
        // Additional codec check for WebM
        if (mimeType === 'video/webm' && !browserInfo.supportsVideoCodecs.webm) {
          continue;
        }
        return source;
      }
    }

    // Fallback to first available source
    return sources[0];
  }, [browserInfo]);

  // Get the best source for rendering
  const bestSource = useMemo(() => {
    if (selectedQualitySource) {
      return selectedQualitySource;
    }
    if (resolvedSources && resolvedSources.length > 0) {
      return selectBestSource(resolvedSources);
    }
    return null;
  }, [selectedQualitySource, resolvedSources, selectBestSource]);

  const handleSelectChapter = useCallback(
    (idx: number) => {
      const el = videoRef.current;
      if (!el || !chapters || !chapters[idx]) return;
      el.currentTime = chapters[idx].start;
      emit('seeking');
      // timeupdate will fire subsequently
    },
    [chapters, emit],
  );

  // Attach media event listeners
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    function handleTimeUpdate() {
      if (!el) return;
      setCurrentTime(el.currentTime);
      emit('timeupdate');
    }
    function handleLoadedMetadata() {
      if (!el) return;
      setDuration(!Number.isNaN(el.duration) ? el.duration : null);
      emit('loadedmetadata');
    }
    function handleLoadStart() {
      setIsLoading(true);
      setHasError(false);
      startLoadingTimeout();
      checkReadyState();
    }
    function handleCanPlay() {
      setIsLoading(false);
      clearLoadingTimeout();
      checkReadyState();
    }
    function handleError() {
      setIsLoading(false);
      clearLoadingTimeout();
      if (loadAttempts < maxRetries) {
        // Trigger retry
        const retryId = setTimeout(() => {
          setLoadAttempts(prev => prev + 1);
          setHasError(false);
          setIsLoading(true);
          // Force reload
          if (el) {
            const currentSrc = el.src;
            el.src = '';
            el.load();
            setTimeout(() => {
              if (el) {
                el.src = currentSrc;
                el.load();
              }
            }, 100);
          }
        }, 2000);
        setRetryTimeout(retryId);
      } else {
        setHasError(true);
        emit('error');
      }
    }
    function handleProgress() {
      checkReadyState();
    }

    // Browser-specific event handling
    function handleCanPlayThrough() {
      // Safari sometimes doesn't fire canplay reliably
      if (browserInfo.name === 'safari') {
        setIsLoading(false);
        clearLoadingTimeout();
      }
    }

    function handleStalled() {
      // Firefox may stall on certain video formats
      if (browserInfo.name === 'firefox' && !isLoading) {
        setIsLoading(true);
        // Attempt to recover by reloading
        setTimeout(() => {
          if (el) {
            el.load();
          }
        }, 1000);
      }
    }

    function handleWaiting() {
      // Handle buffering states
      if (!isLoading) {
        setIsLoading(true);
      }
    }

    const listeners: Array<[string, () => void]> = [
      ['play', () => emit('play')],
      ['pause', () => emit('pause')],
      ['ended', () => emit('ended')],
      ['seeking', () => emit('seeking')],
      ['seeked', () => emit('seeked')],
      ['loadstart', handleLoadStart],
      ['canplay', handleCanPlay],
      ['error', handleError],
      ['progress', handleProgress],
      ['timeupdate', handleTimeUpdate],
      ['loadedmetadata', handleLoadedMetadata],
    ];

    // Add browser-specific listeners
    if (browserInfo.name === 'safari') {
      listeners.push(['canplaythrough', handleCanPlayThrough]);
    }
    if (browserInfo.name === 'firefox') {
      listeners.push(['stalled', handleStalled]);
    }
    listeners.push(['waiting', handleWaiting]);

    listeners.forEach(([evt, fn]) => el.addEventListener(evt, fn));
    return () => listeners.forEach(([evt, fn]) => el.removeEventListener(evt, fn));
  }, [emit, startLoadingTimeout, clearLoadingTimeout, checkReadyState, loadAttempts, maxRetries, browserInfo.name, isLoading]);

  return (
    <section
      className="video-player"
      data-testid="video-player"
      data-loading={isLoading ? 'true' : 'false'}
      data-ready={!isLoading && !hasError ? 'true' : 'false'}
      data-error={hasError ? 'true' : 'false'}
    >
      {bestSource ? (
        <>
          {isLoading && (
            <div className="video-loading-indicator" data-testid="video-loading-indicator">
              <div className="loading-spinner"></div>
              <span>Loading video... {loadAttempts > 0 && `(Attempt ${loadAttempts + 1}/${maxRetries + 1})`}</span>
            </div>
          )}
          <video
            ref={videoRef}
            className="video-element"
            poster={poster}
            autoPlay={autoPlay}
            muted={muted}
            playsInline={playsInline}
            data-testid="video-element"
            preload={browserInfo.name === 'safari' ? 'metadata' : 'auto'}
            crossOrigin={browserInfo.name === 'firefox' ? 'anonymous' : undefined}
          >
            {bestSource ? (
              <source src={bestSource.src} type={bestSource.type} />
            ) : (
              resolvedSources?.map((source, index) => (
                <source key={index} src={source.src} type={source.type} />
              ))
            )}
            {tracks?.map((track, index) => (
              <track
                key={index}
                kind={track.kind}
                src={track.src}
                srcLang={track.srcLang || track.srclang}
                label={track.label}
                default={track.default}
              />
            ))}
            Your browser does not support the video tag.
          </video>
        </>
      ) : (
        <div
          className="video-placeholder"
          role="img"
          aria-label={placeholderLabel || 'Video loading placeholder'}
          data-testid="video-loading"
        >
          {placeholderLabel || 'Loading video...'}
        </div>
      )}

      {/* Video Controls */}
      {bestSource && (
        <div className="video-controls" data-testid="video-controls">
          <button
            type="button"
            className="video-play-pause"
            onClick={() => {
              const video = videoRef.current;
              if (video) {
                if (video.paused) {
                  video.play();
                } else {
                  video.pause();
                }
              }
            }}
            aria-label="Play/Pause video"
            data-testid="play-button"
          >
            {videoRef.current?.paused ? '▶️' : '⏸️'}
          </button>

          <div className="video-progress" data-testid="progress">
            <div
              className="video-progress-bar"
              style={{
                width: duration ? `${((currentTime || 0) / duration) * 100}%` : '0%'
              }}
            />
          </div>

          <div className="video-time">
            {duration ? (
              <>
                {Math.floor((currentTime || 0) / 60)}:{Math.floor((currentTime || 0) % 60).toString().padStart(2, '0')} /{' '}
                {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
              </>
            ) : (
              '0:00 / 0:00'
            )}
          </div>

          <div className="volume-control">
            <button
              type="button"
              className="volume-mute"
              onClick={() => {
                const video = videoRef.current;
                if (video) {
                  video.muted = !video.muted;
                }
              }}
              aria-label="Mute/Unmute"
              data-testid="mute"
            >
              🔊
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue="0.7"
              className="volume-slider"
              onChange={(e) => {
                const video = videoRef.current;
                if (video) {
                  video.volume = parseFloat(e.target.value);
                }
              }}
              aria-label="Volume"
              data-testid="volume"
            />
          </div>

          <button
            type="button"
            className="video-fullscreen"
            onClick={() => {
              const video = videoRef.current;
              if (video) {
                if (video.requestFullscreen) {
                  video.requestFullscreen();
                }
              }
            }}
            aria-label="Fullscreen"
            data-testid="fullscreen"
          >
            ⛶
          </button>
        </div>
      )}

      {/* Error handling */}
      {hasError && (
        <div
          className="video-error"
          data-testid="video-error"
        >
          <div className="error-content">
            <span>Video failed to load</span>
            {loadAttempts >= maxRetries ? (
              <span> (Maximum retries exceeded)</span>
            ) : (
              <span> (Retrying...)</span>
            )}
          </div>
        </div>
      )}

      {/* Chapters */}
      {showChapters && chapters && chapters.length > 0 && (
        <nav className="chapters-nav" aria-label="Video chapters">
          <ol className="chapters-list">
            {chapters.map((c, i) => {
              const active = i === chapterIndex;
              return (
                <li key={i}>
                  <button
                    type="button"
                    className={`chapter-button ${active ? 'active' : ''}`}
                    onClick={() => handleSelectChapter(i)}
                    aria-current={active ? 'true' : undefined}
                  >
                    {c.title}
                    {duration ? (
                      <span>
                        {Math.floor(c.start / 60)
                          .toString()
                          .padStart(2, '0')}
                        :
                        {Math.floor(c.start % 60)
                          .toString()
                          .padStart(2, '0')}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </section>
  );
}
