import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface VideoSource {
  src: string;
  type?: string; // e.g., "video/mp4" | "video/webm"
}

export type TrackKind =
  | "subtitles"
  | "captions"
  | "chapters"
  | "metadata"
  | "descriptions";

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
  | "play"
  | "pause"
  | "timeupdate"
  | "ended"
  | "seeking"
  | "seeked"
  | "error"
  | "loadedmetadata";

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

export function VideoPlayer(props: VideoPlayerProps) {
  const {
    src,
    sources,
    qualitySources,
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

  // Quality selection heuristic – choose ONE best source when qualitySources provided.
  const selectedQualitySource = useMemo<QualitySource | undefined>(() => {
    if (!qualitySources || qualitySources.length === 0) return undefined;
    const sorted = [...qualitySources].sort((a, b) => b.height - a.height);

    // Gather signals
    const rawConnection =
      typeof navigator !== "undefined" &&
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
      typeof connection.downlink === "number" ? connection.downlink : undefined; // Mbps
    const viewportH =
      typeof window !== "undefined" ? window.innerHeight || 0 : 0;

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
  }, [qualitySources]);

  // Merge single src into sources list for rendering (ignored if qualitySources active)
  const resolvedSources = useMemo<VideoSource[] | undefined>(() => {
    if (selectedQualitySource)
      return [
        { src: selectedQualitySource.src, type: selectedQualitySource.type },
      ];
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
        src: el ? el.currentSrc || el.getAttribute("src") : null,
        chapterIndex,
      });
    },
    [onEvent, chapterIndex],
  );

  // Attach media event listeners
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    function handleTimeUpdate() {
      if (!el) return;
      setCurrentTime(el.currentTime);
      emit("timeupdate");
    }
    function handleLoadedMetadata() {
      if (!el) return;
      setDuration(!Number.isNaN(el.duration) ? el.duration : null);
      emit("loadedmetadata");
    }
    const listeners: Array<[string, () => void]> = [
      ["play", () => emit("play")],
      ["pause", () => emit("pause")],
      ["ended", () => emit("ended")],
      ["seeking", () => emit("seeking")],
      ["seeked", () => emit("seeked")],
      ["error", () => emit("error")],
      ["timeupdate", handleTimeUpdate],
      ["loadedmetadata", handleLoadedMetadata],
    ];
    listeners.forEach(([evt, fn]) => el.addEventListener(evt, fn));
    return () =>
      listeners.forEach(([evt, fn]) => el.removeEventListener(evt, fn));
  }, [emit]);

  const handleSelectChapter = useCallback(
    (idx: number) => {
      const el = videoRef.current;
      if (!el || !chapters || !chapters[idx]) return;
      el.currentTime = chapters[idx].start;
      emit("seeking");
      // timeupdate will fire subsequently
    },
    [chapters, emit],
  );

  const sectionLabel = caption || "video player";
  return (
    <section aria-label={sectionLabel} style={{ maxWidth: 640 }}>
      {resolvedSources ? (
        <figure>
          <video
            ref={videoRef}
            controls
            style={{ maxWidth: "100%", display: "block" }}
            {...(poster ? { poster } : {})}
            {...(autoPlay ? { autoPlay: true } : {})}
            {...(muted ? { muted: true } : {})}
            {...(playsInline ? { playsInline: true } : {})}
            // If only one simple source (no type), keep src attribute for simplicity
            {...(resolvedSources.length === 1 && !resolvedSources[0].type
              ? { src: resolvedSources[0].src }
              : {})}
          >
            {resolvedSources.length > 1 &&
              resolvedSources.map((s, i) => (
                <source
                  key={i}
                  src={s.src}
                  {...(s.type ? { type: s.type } : {})}
                />
              ))}
            {tracks &&
              tracks.map((t, i) => {
                const lang = t.srcLang || t.srclang; // backward compatibility
                const meta = import.meta as unknown as {
                  env?: { MODE?: string };
                };
                const mode = meta.env?.MODE;
                if (mode !== "production" && t.srclang) {
                  console.warn(
                    "[VideoPlayer] 'srclang' prop is deprecated; use 'srcLang' instead.",
                  );
                }
                return (
                  <track
                    key={`${t.kind}-${t.label || i}-${lang || ""}`}
                    kind={t.kind}
                    src={t.src}
                    {...(lang ? { srcLang: lang } : {})}
                    {...(t.label ? { label: t.label } : {})}
                    {...(t.default ? { default: true } : {})}
                  />
                );
              })}
          </video>
          {selectedQualitySource?.label ? (
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
              {selectedQualitySource.label}
            </div>
          ) : null}
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
      ) : (
        <div
          role="img"
          aria-label={placeholderLabel || "Sample (placeholder)"}
          style={{
            width: 320,
            height: 180,
            background: "#ddd",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: "#555",
            fontFamily: "sans-serif",
          }}
        >
          {placeholderLabel || "Sample (placeholder)"}
        </div>
      )}
      {showChapters && chapters && chapters.length > 0 && (
        <nav aria-label="Chapters" style={{ marginTop: 12 }}>
          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {chapters.map((c, i) => {
              const active = i === chapterIndex;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => handleSelectChapter(i)}
                    aria-current={active ? "true" : undefined}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      background: active ? "#005fdd" : "#f3f3f3",
                      color: active ? "#fff" : "#222",
                      border: "1px solid #ccc",
                      padding: "4px 8px",
                      fontSize: 13,
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    {c.title}
                    {duration ? (
                      <span
                        style={{
                          opacity: 0.7,
                          marginLeft: 6,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {Math.floor(c.start / 60)
                          .toString()
                          .padStart(2, "0")}
                        :
                        {Math.floor(c.start % 60)
                          .toString()
                          .padStart(2, "0")}
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
