import React, { useEffect, useRef, useState } from 'react';

interface BackgroundAudioProps {
  src: string;
  autoPlay?: boolean;
  loop?: boolean;
}

export function BackgroundAudio({ src, autoPlay = false, loop = true }: BackgroundAudioProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3); // Start at 30% volume
  const [isMuted, setIsMuted] = useState(false);

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
      audio.play().catch(() => {
        // Auto-play failed, user interaction required
        console.log('Auto-play blocked by browser, user interaction required');
      });
    }

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [autoPlay]);

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
    <div className="background-audio-player">
      <audio
        ref={audioRef}
        src={src}
        loop={loop}
        preload="metadata"
        aria-label="Background music player"
      >
        <track kind="captions" src="" label="No captions available" />
      </audio>
      <div className="audio-controls">
        <button
          type="button"
          className="audio-play-pause"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause background music' : 'Play background music'}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        <div className="volume-control">
          <button
            type="button"
            className="volume-mute"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
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
            className="volume-slider"
            aria-label="Background music volume"
          />
        </div>
      </div>
    </div>
  );
}
