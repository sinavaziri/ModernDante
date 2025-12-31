'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AUDIO } from '@/lib/constants';
import type { AudioTimingData } from '@/types/audio';

interface AudioPlayerProps {
  cantica: string;
  cantoNumber: number;
  onTimeUpdate?: (currentTime: number) => void;
  isNarrationVisible?: boolean;
  onScrollToNarration?: (() => void) | null;
}

export default function AudioPlayerWordLevel({
  cantica,
  cantoNumber,
  onTimeUpdate,
  isNarrationVisible = true,
  onScrollToNarration,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSegment, setCurrentSegment] = useState<{ id: number; speaker: string; text: string } | null>(null);
  const [timingData, setTimingData] = useState<AudioTimingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAudio, setHasAudio] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Load word-level timing data
  useEffect(() => {
    async function loadTimingData() {
      try {
        const response = await fetch('/audio-word-timings.json');
        const data = await response.json();
        const cantoData = data[cantica]?.[cantoNumber];

        if (cantoData) {
          setTimingData(cantoData);
          setHasAudio(true);
        } else {
          setHasAudio(false);
        }
      } catch (error) {
        console.error('Failed to load word timing data:', error);
        setHasAudio(false);
      } finally {
        setIsLoading(false);
      }
    }

    loadTimingData();
  }, [cantica, cantoNumber]);

  // Update current segment based on playback time
  useEffect(() => {
    if (!timingData) return;

    const segment = timingData.segments.find(
      seg => currentTime >= seg.startTime && currentTime < seg.endTime
    );

    if (segment && segment.id !== currentSegment?.id) {
      setCurrentSegment({
        id: segment.id,
        speaker: segment.speaker,
        text: segment.text
      });
    }
  }, [currentTime, timingData, currentSegment?.id]);

  // Handle time updates - notify parent component
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  }, [onTimeUpdate]);

  // Handle metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  // Play/pause toggle
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Seek to position
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  // Skip forward
  const skipForward = useCallback(() => {
    if (!audioRef.current) return;
    const newTime = Math.min(audioRef.current.currentTime + AUDIO.SKIP_DURATION, duration);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  // Skip backward
  const skipBackward = useCallback(() => {
    if (!audioRef.current) return;
    const newTime = Math.max(audioRef.current.currentTime - AUDIO.SKIP_DURATION, 0);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  // Cycle playback rate
  const cyclePlaybackRate = useCallback(() => {
    const rates = [1, 1.25, 1.5, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }, [playbackRate]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format speaker name
  const formatSpeaker = (speaker: string) => {
    return speaker.charAt(0).toUpperCase() + speaker.slice(1).replace(/_/g, ' ');
  };

  if (isLoading) {
    return null;
  }

  if (!hasAudio) {
    return null;
  }

  const audioSrc = `/audio/${cantica}/${cantica}_canto_${cantoNumber}.mp3`;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-lg border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        {/* Progress Bar - Full Width at Top */}
        <div
          ref={progressRef}
          className="h-1 bg-secondary cursor-pointer group relative"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
          {/* Hover scrubber */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>

        {/* Controls */}
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">

            {/* Left: Current Speaker & Text */}
            <div className="flex-1 min-w-0 hidden sm:block">
              {currentSegment && isPlaying ? (
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    {formatSpeaker(currentSegment.speaker)}
                  </span>
                  <p className="text-sm text-muted-foreground truncate italic">
                    &ldquo;{currentSegment.text.substring(0, 60)}{currentSegment.text.length > 60 ? '...' : ''}&rdquo;
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {cantica.charAt(0).toUpperCase() + cantica.slice(1)} &middot; Canto {cantoNumber}
                </p>
              )}
            </div>

            {/* Center: Main Controls */}
            <div className="flex items-center gap-2">
              {/* Scroll to Narration */}
              {!isNarrationVisible && isPlaying && onScrollToNarration && (
                <button
                  onClick={onScrollToNarration}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Scroll to current narration"
                  title="Jump to narration"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                  </svg>
                </button>
              )}

              {/* Rewind */}
              <button
                onClick={skipBackward}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`Rewind ${AUDIO.SKIP_DURATION} seconds`}
                title={`-${AUDIO.SKIP_DURATION}s`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 16.811c0 .864-.933 1.405-1.683.977l-7.108-4.062a1.125 1.125 0 010-1.953l7.108-4.062A1.125 1.125 0 0121 8.688v8.123zM11.25 16.811c0 .864-.933 1.405-1.683.977l-7.108-4.062a1.125 1.125 0 010-1.953l7.108-4.062a1.125 1.125 0 011.683.977v8.123z" />
                </svg>
              </button>

              {/* Play/Pause Button */}
              <button
                onClick={togglePlay}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:scale-105"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Forward */}
              <button
                onClick={skipForward}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`Forward ${AUDIO.SKIP_DURATION} seconds`}
                title={`+${AUDIO.SKIP_DURATION}s`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.81V8.688zM12.75 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z" />
                </svg>
              </button>

              {/* Playback Speed */}
              <button
                onClick={cyclePlaybackRate}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
                aria-label="Change playback speed"
                title="Playback speed"
              >
                {playbackRate}x
              </button>
            </div>

            {/* Right: Time Display */}
            <div className="flex-1 flex justify-end">
              <div className="text-sm font-mono text-muted-foreground">
                <span className="text-foreground">{formatTime(currentTime)}</span>
                <span className="mx-1">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind player */}
      <div className="h-20" />
    </>
  );
}
