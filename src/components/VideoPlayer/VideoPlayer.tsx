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
  srclang?: string;
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
  tracks?: VideoTrackDef[];
  chapters?: ChapterDef[];
  caption?: string;
  placeholderLabel?: string;
  onEvent?: (payload: VideoPlayerEventPayload) => void;
  showChapters?: boolean;
}

export function VideoPlayer(props: VideoPlayerProps) {
  const {
    src,
    sources,
    tracks,
    chapters,
    caption,
    placeholderLabel,
    onEvent,
    showChapters = true,
  } = props;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);

  // Merge single src into sources list for rendering.
  const resolvedSources = useMemo<VideoSource[] | undefined>(() => {
    if (sources && sources.length) return sources;
    if (src) return [{ src }];
    return undefined;
  }, [sources, src]);

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
              tracks.map((t, i) => (
                <track
                  key={`${t.kind}-${t.label || i}-${t.srclang || ""}`}
                  kind={t.kind}
                  src={t.src}
                  {...(t.srclang ? { srclang: t.srclang } : {})}
                  {...(t.label ? { label: t.label } : {})}
                  {...(t.default ? { default: true } : {})}
                />
              ))}
          </video>
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
