'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { toRoman } from '@/lib/canticas';
import { AUDIO } from '@/lib/constants';
import { speakerLabel } from '@/lib/speaker-label';
import type { AudioTimingData } from '@/types/audio';

interface AudioPlayerProps {
  cantica: string;
  cantoNumber: number;
  timingData: AudioTimingData | null;
  /** Receives the underlying audio element, for frame-accurate sync */
  onAudioElement?: (audio: HTMLAudioElement | null) => void;
  isNarrationVisible?: boolean;
  onScrollToNarration?: (() => void) | null;
}

export default function AudioPlayerWordLevel({
  cantica,
  cantoNumber,
  timingData,
  onAudioElement,
  isNarrationVisible = true,
  onScrollToNarration,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const setAudioRef = useCallback((audio: HTMLAudioElement | null) => {
    audioRef.current = audio;
    onAudioElement?.(audio);
  }, [onAudioElement]);

  const hasAudio = !!timingData;

  // Current segment for playback time; holds the last started segment through gaps
  const currentSegment = useMemo(() => {
    if (!timingData) return null;
    return timingData.segments.findLast(seg => currentTime >= seg.startTime) ?? null;
  }, [currentTime, timingData]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  // Handle metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  // Handle audio loading errors
  const handleAudioError = useCallback(() => {
    setAudioError('Unable to load audio. Please try again later.');
    setIsPlaying(false);
  }, []);

  // Play/pause toggle. isPlaying follows the element's play and pause events,
  // so a refused play() can't leave the button showing Pause over silence.
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    // WebKit reports an element whose file failed to load as not paused.
    if (!audio.paused && !audio.error) {
      audio.pause();
      return;
    }

    try {
      // A failed file stays failed until it's told to load again.
      if (audio.error) audio.load();
      await audio.play();
      setAudioError(null);
    } catch (error) {
      // AbortError only means a pause arrived before playback started.
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setAudioError('Unable to play audio. Please try again.');
      }
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    if (!audioRef.current || !duration) return;
    const newTime = Math.min(Math.max(time, 0), duration);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo(((e.clientX - rect.left) / rect.width) * duration);
  }, [duration, seekTo]);

  const handleSeekKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const time = audioRef.current?.currentTime ?? 0;
    const targets: Record<string, number> = {
      ArrowLeft: time - AUDIO.ARROW_SEEK_DURATION,
      ArrowDown: time - AUDIO.ARROW_SEEK_DURATION,
      ArrowRight: time + AUDIO.ARROW_SEEK_DURATION,
      ArrowUp: time + AUDIO.ARROW_SEEK_DURATION,
      PageDown: time - AUDIO.SKIP_DURATION,
      PageUp: time + AUDIO.SKIP_DURATION,
      Home: 0,
      End: duration,
    };
    if (!(e.key in targets)) return;
    e.preventDefault();
    seekTo(targets[e.key]);
  }, [duration, seekTo]);

  const skipForward = useCallback(() => {
    seekTo((audioRef.current?.currentTime ?? 0) + AUDIO.SKIP_DURATION);
  }, [seekTo]);

  const skipBackward = useCallback(() => {
    seekTo((audioRef.current?.currentTime ?? 0) - AUDIO.SKIP_DURATION);
  }, [seekTo]);

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

  if (!hasAudio) {
    return null;
  }

  const audioSrc = `/audio/${cantica}/${cantica}_canto_${cantoNumber}.mp3`;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <audio
        ref={setAudioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onSeeked={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={handleAudioError}
      />

      {/* Sticky Bottom Bar */}
      <div data-audio-player className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-lg border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        {/* Progress Bar - Full Width at Top */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          className="h-1 bg-secondary cursor-pointer group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={handleSeek}
          onKeyDown={handleSeekKey}
        >
          <div
            className="h-full bg-primary transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
          {/* Hover scrubber */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity shadow-md"
            style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>

        {/* Controls */}
        <div className="max-w-4xl mx-auto px-4 py-3">
          {/* The status area below is hidden on phones, where errors would otherwise never show */}
          {audioError && (
            <p className="sm:hidden pb-2 text-sm text-red-500">
              {audioError}
            </p>
          )}

          <div className="flex items-center gap-4">

            {/* Left: Current Speaker & Text */}
            <div className="flex-1 min-w-0 hidden sm:block">
              {audioError ? (
                <p className="text-sm text-red-500">
                  {audioError}
                </p>
              ) : currentSegment && isPlaying ? (
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    {speakerLabel(currentSegment.speaker)}
                  </span>
                  <p className="text-sm text-muted-foreground truncate italic">
                    &ldquo;{currentSegment.text.substring(0, AUDIO.TEXT_PREVIEW_LENGTH)}{currentSegment.text.length > AUDIO.TEXT_PREVIEW_LENGTH ? '...' : ''}&rdquo;
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {cantica.charAt(0).toUpperCase() + cantica.slice(1)}, Canto {toRoman(cantoNumber)}
                </p>
              )}
            </div>

            {/* Center: Main Controls */}
            <div className="flex items-center gap-2">
              {/* Scroll to Narration */}
              {!isNarrationVisible && isPlaying && onScrollToNarration && (
                <button
                  onClick={onScrollToNarration}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors animate-pulse"
                  aria-label="Scroll to current narration"
                  title="Follow along"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                    <circle cx="17" cy="17" r="3" fill="currentColor" />
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
