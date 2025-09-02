import React, { useEffect, useState } from 'react';

import { VideoPlayer } from './VideoPlayer/VideoPlayer';

interface IntroVideoProps {
  onComplete?: () => void;
  children: React.ReactNode;
}

export function IntroVideo({ onComplete = () => {}, children }: IntroVideoProps) {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    // Auto-advance after intro video ends or after 10 seconds as fallback
    const timer = setTimeout(() => {
      setShowIntro(false);
      onComplete?.();
    }, 10000); // 10 second fallback

    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleVideoEnd = () => {
    setShowIntro(false);
    onComplete?.();
  };

  if (!showIntro) {
    return <>{children}</>;
  }

  return (
    <div className="intro-video-overlay">
      <VideoPlayer
        src="/media/videos/intro.mp4"
        autoPlay
        muted
        playsInline
        onEvent={(payload) => {
          if (payload.name === 'ended') {
            handleVideoEnd();
          }
        }}
      />
      <button
        className="skip-intro-button"
        onClick={() => {
          setShowIntro(false);
          onComplete?.();
        }}
        aria-label="Skip intro video"
      >
        Skip Intro
      </button>
    </div>
  );
}
