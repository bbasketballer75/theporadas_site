import React, { useEffect, useRef, useState } from 'react';

import { detectBrowser } from '../utils/browserDetection';

interface BackgroundAudioProps {
  src: string;
  autoPlay?: boolean;
  loop?: boolean;
}

export function BackgroundAudio({ src, autoPlay = false, loop = true }: BackgroundAudioProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Loading state variables
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [volume, setVolume] = useState(0.3); // Start at 30% volume
  const [isMuted, setIsMuted] = useState(false);

  // Browser detection for compatibility fixes
  const browserInfo = React.useMemo(() => detectBrowser(), []);
  const browserName = browserInfo.name;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    // Auto-play if requested (may be blocked by browser)
    if (autoPlay) {
      // Browser-specific auto-play handling
      const canAutoPlay = () => {
        if (browserName === 'chrome' || browserName === 'edge') {
          // Chrome/Edge have strict auto-play policies
          return false; // Require user interaction
        } else if (browserName === 'firefox') {
          // Firefox allows auto-play with user interaction history
          return document.hasFocus();
        } else if (browserName === 'safari') {
          // Safari requires user gesture for auto-play
          return false;
        }
        return false; // Default to requiring user interaction
      };

      if (canAutoPlay()) {
        audio.play().catch(() => {
          // Auto-play failed, user interaction required
          console.log('Auto-play blocked by browser, user interaction required');
        });
      } else {
        console.log('Auto-play disabled for this browser, user interaction required');
      }
    }

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [autoPlay, browserName]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
      // Start 15-second timeout
      timeoutRef.current = window.setTimeout(() => {
        setHasError(true);
        setErrorMessage('Audio loading timed out after 15 seconds');
        setIsLoading(false);
        handleRetry();
      }, 15000);
    };

    const markLoadReady = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsLoading(false);
      setIsLoaded(true);
      setHasError(false);
      setErrorMessage('');
    };

    const handleError = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsLoading(false);
      setHasError(true);
      setErrorMessage('Failed to load audio');
      handleRetry();
    };

    const handleStalled = () => {
      // Audio loading stalled, but don't treat as error yet
      console.log('Audio loading stalled');
    };

    const handleWaiting = () => {
      // Audio is waiting for data, but don't treat as error yet
      console.log('Audio waiting for data');
    };

    const handleRetry = () => {
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        console.log(`Retrying audio load (attempt ${retryCountRef.current}/${maxRetries})`);
        setTimeout(() => {
          audio.load();
        }, 1000 * retryCountRef.current); // Exponential backoff
      } else {
        console.log('Max retries reached, giving up');
      }
    };

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', markLoadReady);
    audio.addEventListener('canplaythrough', markLoadReady);
    audio.addEventListener('error', handleError);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('waiting', handleWaiting);

    // Initial load
    audio.load();

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', markLoadReady);
      audio.removeEventListener('canplaythrough', markLoadReady);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('waiting', handleWaiting);
    };
  }, [src]); // Depend on src to reload when it changes

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((error) => {
        console.error('Failed to play audio:', error);
      });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  return (
    <div
      className="background-audio-player"
      data-testid="background-audio"
      data-loading={isLoading ? 'true' : 'false'}
      data-loaded={isLoaded ? 'true' : 'false'}
      data-error={hasError ? 'true' : 'false'}
    >
      <audio
        ref={audioRef}
        src={src}
        loop={loop}
        preload="metadata"
        aria-label="Background music player"
      >
        <track kind="captions" src="" label="No captions available" />
      </audio>
      {isLoading && (
        <output className="audio-loading" data-testid="audio-loading" aria-live="polite">
          <div className="audio-spinner" aria-hidden="true"></div>
          <span className="sr-only">Loading audio...</span>
        </output>
      )}
      {hasError && (
        <div className="audio-error" data-testid="audio-error">
          {errorMessage}
        </div>
      )}
      <div className="audio-controls">
        <button
          type="button"
          className="audio-play-pause"
          onClick={togglePlay}
          disabled={isLoading}
          aria-label={isPlaying ? 'Pause background music' : 'Play background music'}
          data-testid="play-button"
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        <div className="volume-control">
          <button
            type="button"
            className="volume-mute"
            onClick={toggleMute}
            disabled={isLoading}
            aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
            data-testid="volume-button"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            disabled={isLoading}
            className="volume-slider"
            aria-label="Background music volume"
            data-testid="volume-control"
          />
        </div>
      </div>
    </div>
  );
}
