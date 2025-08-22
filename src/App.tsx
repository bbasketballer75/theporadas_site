import React from "react";

import { VideoPlayer } from "./components/VideoPlayer/VideoPlayer";

export default function App() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "1rem" }}>
      <h1>The Poradas Wedding Videos</h1>
      <p>Welcome! This is the early scaffold of the site.</p>
      <VideoPlayer
        src=""
        caption="Sample"
        placeholderLabel="Sample (placeholder)"
      />
    </main>
  );
}
