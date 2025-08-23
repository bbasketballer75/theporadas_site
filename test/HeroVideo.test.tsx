import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, it, expect } from "vitest";

import { HeroVideo } from "../src/components/HeroVideo";

function setMotion(value: string) {
  document.documentElement.setAttribute("data-motion", value);
}

describe("HeroVideo", () => {
  it("does not autoplay when motion preference is reduce", () => {
    setMotion("reduce");
    render(
      <HeroVideo
        caption="hv"
        src="/media/encoded/hero-480.mp4"
        poster="/poster.jpg"
      />,
    );
    const region = screen.getByRole("region", { name: "hv" });
    const video = region.querySelector("video") as HTMLVideoElement | null;
    expect(video).toBeTruthy();
    expect(video?.hasAttribute("autoplay")).toBe(false);
  });

  it("autoplays (with muted) when motion preference is no-preference", () => {
    setMotion("no-preference");
    render(
      <HeroVideo
        caption="hv2"
        src="/media/encoded/hero-480.mp4"
        poster="/poster.jpg"
      />,
    );
    const region = screen.getByRole("region", { name: "hv2" });
    const video = region.querySelector("video") as HTMLVideoElement | null;
    expect(video).toBeTruthy();
    // Autoplay attribute should be present; muted may not reflect due to jsdom limitations
    expect(video?.hasAttribute("autoplay")).toBe(true);
    // Our component sets muted when autoplay; verify either attribute or property
    expect(video?.muted || video?.hasAttribute("muted")).toBe(true);
  });
});
