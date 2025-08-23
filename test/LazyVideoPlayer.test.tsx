import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { LazyVideoPlayer } from "../src/components/VideoPlayer/LazyVideoPlayer";

describe("LazyVideoPlayer", () => {
  it("renders placeholder immediately and video after intersection (shim triggers instantly)", () => {
    render(
      <LazyVideoPlayer
        caption="Lazy Clip"
        placeholderLabel="Prefetching"
        qualitySources={[
          { src: "vid-480.mp4", height: 480 },
          { src: "vid-720.mp4", height: 720 },
        ]}
      />,
    );
    expect(
      screen.getByRole("region", { name: /lazy clip/i }),
    ).toBeInTheDocument();
  });
});
