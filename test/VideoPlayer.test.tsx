import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

import { VideoPlayer } from "../src/components/VideoPlayer/VideoPlayer";

describe("VideoPlayer", () => {
  it("shows placeholder when no src", () => {
    render(<VideoPlayer src="" caption="Sample" />);
    expect(
      screen.getByRole("img", { name: /sample \(placeholder\)/i }),
    ).toBeInTheDocument();
  });

  it("renders video element when src provided", () => {
    render(<VideoPlayer src="video.mp4" caption="Clip" />);
    expect(screen.getByRole("region", { name: /clip/i })).toBeInTheDocument();
    expect(screen.getByRole("figure")).toBeInTheDocument();
  });

  it("renders multiple sources", () => {
    render(
      <VideoPlayer
        caption="Multi"
        sources={[
          { src: "video.webm", type: "video/webm" },
          { src: "video.mp4", type: "video/mp4" },
        ]}
      />,
    );
    // There should be two source elements
    expect(document.querySelectorAll("source").length).toBe(2);
  });

  it("renders tracks", () => {
    render(
      <VideoPlayer
        caption="Tracks"
        src="video.mp4"
        tracks={[
          {
            kind: "captions",
            src: "captions.vtt",
            srclang: "en",
            label: "English",
          },
          { kind: "chapters", src: "chapters.vtt", srclang: "en" },
        ]}
      />,
    );
    expect(document.querySelectorAll("track").length).toBe(2);
  });

  it("renders chapters navigation and highlights active chapter (timeupdate simulation)", () => {
    // jsdom won't play video; simulate chapter button click triggers seeking handler.
    const chapters = [
      { start: 0, title: "Intro" },
      { start: 10, title: "Middle" },
      { start: 25, title: "End" },
    ];
    render(
      <VideoPlayer caption="Chapters" src="video.mp4" chapters={chapters} />,
    );
    const buttons = screen.getAllByRole("button", {
      name: /intro|middle|end/i,
    });
    expect(buttons.length).toBe(3);
    // Click second chapter
    fireEvent.click(buttons[1]);
    // After click, the active chapter may change on timeupdate; simulate event
    const video = document.querySelector("video")!;
    // Manually set currentTime & dispatch event to update state
    Object.defineProperty(video, "currentTime", { value: 11, writable: true });
    fireEvent(video, new Event("timeupdate"));
    // Active (aria-current) should exist on "Middle"
    expect(buttons[1].getAttribute("aria-current")).toBe("true");
  });

  it("calls onEvent callback for media events (play, pause, timeupdate)", () => {
    const handler = vi.fn();
    render(<VideoPlayer src="video.mp4" caption="Cb" onEvent={handler} />);
    const video = document.querySelector("video")!;
    // Fire loadedmetadata
    fireEvent(video, new Event("loadedmetadata"));
    // Fire play
    fireEvent(video, new Event("play"));
    // Simulate timeupdate
    Object.defineProperty(video, "currentTime", { value: 5, writable: true });
    fireEvent(video, new Event("timeupdate"));
    // Fire pause
    fireEvent(video, new Event("pause"));
    const names = handler.mock.calls.map((c) => c[0].name);
    expect(names).toContain("loadedmetadata");
    expect(names).toContain("play");
    expect(names).toContain("timeupdate");
    expect(names).toContain("pause");
  });

  describe("qualitySources heuristic", () => {
    const originalInnerHeight = window.innerHeight;
    const setInnerHeight = (h: number) => {
      Object.defineProperty(window, "innerHeight", {
        value: h,
        configurable: true,
      });
    };
    const resetInnerHeight = () => setInnerHeight(originalInnerHeight);

    const mockConnection = (
      conn: Partial<{ saveData: boolean; downlink: number }>,
    ) => {
      Object.defineProperty(navigator, "connection", {
        value: conn,
        configurable: true,
      });
    };

    afterEach(() => {
      resetInnerHeight();
      mockConnection({});
    });

    const sample = [
      {
        src: "vid-1080.mp4",
        type: "video/mp4",
        height: 1080,
        bitrateKbps: 6000,
        label: "1080p",
      },
      {
        src: "vid-720.mp4",
        type: "video/mp4",
        height: 720,
        bitrateKbps: 3000,
        label: "720p",
      },
      {
        src: "vid-480.mp4",
        type: "video/mp4",
        height: 480,
        bitrateKbps: 1200,
        label: "480p",
      },
    ];

    it("selects 1080p for tall viewport and good connection", () => {
      setInnerHeight(1000);
      mockConnection({ saveData: false, downlink: 20 }); // 20 Mbps
      render(<VideoPlayer qualitySources={sample} caption="Qual" />);
      expect(document.body.textContent).toMatch(/1080p/);
    });

    it("clamps to 480p on save-data despite large viewport", () => {
      setInnerHeight(1000);
      mockConnection({ saveData: true, downlink: 10 });
      render(<VideoPlayer qualitySources={sample} caption="Qual" />);
      expect(document.body.textContent).toMatch(/480p/);
    });

    it("drops to 720p if bitrate exceeds downlink budget for 1080p", () => {
      setInnerHeight(1000); // would target 1080
      // Provide a downlink that is sufficient for 3000 kbps but not 6000 under 0.85 multiplier
      // Budget = 5 * 0.85 = 4.25 Mbps -> 1080 (6 Mbps) excluded, 720 (3 Mbps) allowed
      mockConnection({ saveData: false, downlink: 5 });
      render(<VideoPlayer qualitySources={sample} caption="Qual" />);
      expect(document.body.textContent).toMatch(/720p/);
    });
  });
});
