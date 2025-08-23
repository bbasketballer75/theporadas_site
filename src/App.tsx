import React from "react";

import { HeroVideo } from "./components/HeroVideo";
import { MotionToggle } from "./components/MotionToggle";
import { VideoPlayer } from "./components/VideoPlayer/VideoPlayer";
import "./designSystem.css";

export default function App() {
  return (
    <div id="appShell" role="main" tabIndex={-1}>
      <section className="snap-section hero" aria-label="Welcome">
        <HeroVideo caption="Poradas Wedding Feature">
          <div className="stack" style={{ textAlign: "center" }}>
            <h1 className="display">
              <span className="hero-accent">The Poradas Wedding Videos</span>
            </h1>
            <p>
              A celebration in sage & blush. This is an evolving immersive
              experience—sections will appear here as they are completed.
            </p>
            <div className="stack" style={{ alignItems: "center" }}>
              <button className="btn btn-primary" type="button">
                Enter Story
              </button>
              <MotionToggle />
            </div>
          </div>
        </HeroVideo>
      </section>
      <section className="snap-section" aria-label="Video Feature">
        <div className="card stack">
          <h2>Feature Video</h2>
          <VideoPlayer
            src=""
            caption="Feature Video (placeholder)"
            placeholderLabel="placeholder"
          />
        </div>
      </section>
    </div>
  );
}
