'use client';

import { useState, useRef, useCallback, useMemo, useEffect, useImperativeHandle, type Ref } from 'react';
import { useRouter } from 'next/navigation';
import { getCanticaInfo, getNextCanto, toRoman, type Cantica } from '@/lib/canticas';
import { AUDIO } from '@/lib/constants';
import {
  clearAutoplay,
  getSavedPosition,
  getSavedRate,
  getShowRemaining,
  isAutoplayRequested,
  requestAutoplay,
  savePosition,
  saveRate,
  saveShowRemaining,
} from '@/lib/listening-progress';
import { speakerLabel } from '@/lib/speaker-label';
import type { FollowState } from '@/lib/useNarrationHighlight';
import type { AudioTimingData } from '@/types/audio';

/** What the page can ask of the player */
export interface NarrationControls {
  /** Jump to a time in the narration and play from there */
  playFrom: (time: number) => void;
}

interface AudioPlayerProps {
  cantica: Cantica;
  cantoNumber: number;
  timingData: AudioTimingData | null;
  /** Cover art for the phone's lock screen and the system media controls */
  artwork: string;
  /** Receives the underlying audio element, for frame-accurate sync */
  onAudioElement?: (audio: HTMLAudioElement | null) => void;
  controlsRef?: Ref<NarrationControls>;
  /** Whether the spoken line is on screen, and how to scroll back to it */
  follow?: FollowState | null;
  /** The displayed line spoken at a time, shown when hovering over or dragging the progress bar */
  lineAt?: (time: number) => string | null;
}

// Save the listener's place at most this often while playing, in seconds
const SAVE_INTERVAL = 5;

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** A circular arrow with the number of seconds it skips written inside */
function SkipIcon({ seconds, forward = false }: { seconds: number; forward?: boolean }) {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g transform={forward ? 'matrix(-1 0 0 1 24 0)' : undefined}>
        <path d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5" />
        <path d="M14.5 1 12 3.5 14.5 6" />
      </g>
      <text x="12" y="14.9" textAnchor="middle" fontSize="8" fontWeight="600" fill="currentColor" stroke="none">
        {seconds}
      </text>
    </svg>
  );
}

export default function AudioPlayerWordLevel(props: AudioPlayerProps) {
  if (!props.timingData) return null;
  // Each canto gets a fresh player, so nothing carries over from the last one
  return <NarrationPlayer key={`${props.cantica}/${props.cantoNumber}`} {...props} timingData={props.timingData} />;
}

function NarrationPlayer({
  cantica,
  cantoNumber,
  timingData,
  artwork,
  onAudioElement,
  controlsRef,
  follow,
  lineAt,
}: AudioPlayerProps & { timingData: AudioTimingData }) {
  const router = useRouter();
  const canticaName = getCanticaInfo(cantica)?.displayName ?? cantica;
  const next = useMemo(() => getNextCanto(cantica, cantoNumber), [cantica, cantoNumber]);
  const nextLabel = next
    ? next.cantica === cantica
      ? `Canto ${toRoman(next.number)}`
      : `${getCanticaInfo(next.cantica)?.displayName}, Canto ${toRoman(next.number)}`
    : '';

  // Continuing on from the last canto starts at the top; otherwise pick up where the listener stopped
  const [start] = useState(() => {
    const autoplay = isAutoplayRequested(cantica, cantoNumber);
    return { autoplay, time: autoplay ? 0 : getSavedPosition(cantica, cantoNumber, timingData.totalDuration) };
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(start.time);
  // The timing file knows the length, so the clock is right before the audio has loaded
  const [duration, setDuration] = useState(timingData.totalDuration);
  const [playbackRate, setPlaybackRate] = useState(getSavedRate);
  const [showRemaining, setShowRemaining] = useState(getShowRemaining);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // A time asked for before the audio could seek (some browsers load nothing until play)
  const pendingTimeRef = useRef<number | null>(start.time > 0 ? start.time : null);
  const lastSavedRef = useRef(start.time);
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const setAudioRef = useCallback((audio: HTMLAudioElement | null) => {
    audioRef.current = audio;
    onAudioElement?.(audio);
  }, [onAudioElement]);

  // The default rate survives the browser reloading the file, which resets the rate itself
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.defaultPlaybackRate = playbackRate;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  /** The listener's place, including one the audio hasn't been able to seek to yet */
  const now = useCallback(() => pendingTimeRef.current ?? audioRef.current?.currentTime ?? 0, []);

  const updateLockScreenPosition = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !('mediaSession' in navigator) || !Number.isFinite(audio.duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: Math.min(audio.currentTime, audio.duration),
      });
    } catch {
      // Older browsers have no position state
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.min(Math.max(time, 0), duration);
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      audio.currentTime = newTime;
      pendingTimeRef.current = null;
    } else {
      pendingTimeRef.current = newTime;
    }
    setCurrentTime(newTime);
    setCountdown(null);
  }, [duration]);

  // isPlaying follows the element's play and pause events, so a refused play()
  // can't leave the button showing Pause over silence.
  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      // A failed file stays failed until it's told to load again
      if (audio.error) audio.load();
      await audio.play();
      setAudioError(null);
      setAutoplayBlocked(false);
    } catch (error) {
      // AbortError only means a pause arrived before playback started
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setAudioError('Unable to play audio. Please try again.');
    }
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // WebKit reports an element whose file failed to load as not paused
    if (!audio.paused && !audio.error) audio.pause();
    else play();
  }, [play]);

  const skip = useCallback((seconds: number) => seekTo(now() + seconds), [seekTo, now]);

  const playFrom = useCallback((time: number) => {
    seekTo(time);
    play();
  }, [seekTo, play]);

  useImperativeHandle(controlsRef, () => ({ playFrom }), [playFrom]);

  const goToNext = useCallback(() => {
    if (!next) return;
    requestAutoplay(next.cantica, next.number);
    router.push(`/${next.cantica}/${next.number}`);
  }, [next, router]);

  // Count down to the next canto, one second at a time
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      goToNext();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, goToNext]);

  // Arriving here by continuing from the last canto: carry on playing
  useEffect(() => {
    clearAutoplay();
    const audio = audioRef.current;
    if (!start.autoplay || !audio) return;
    // The browser may want a tap before it plays sound on a page the listener hasn't touched
    audio.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'NotAllowedError') setAutoplayBlocked(true);
    });
  }, [start.autoplay]);

  // Remember the listener's place when they leave, whether to another page or by closing the tab
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const save = () => {
      if (pendingTimeRef.current === null && audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
        savePosition(cantica, cantoNumber, audio.currentTime, audio.duration);
      }
    };
    window.addEventListener('pagehide', save);
    return () => {
      save();
      window.removeEventListener('pagehide', save);
    };
  }, [cantica, cantoNumber]);

  // The phone's lock screen, the system media controls and headphone buttons
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    session.metadata = new MediaMetadata({
      title: `${canticaName}, Canto ${toRoman(cantoNumber)}`,
      artist: 'Dante Alighieri',
      album: 'The Divine Comedy',
      artwork: [{ src: new URL(artwork, window.location.href).href }],
    });
    const actions: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => play()],
      ['pause', () => audioRef.current?.pause()],
      ['seekbackward', d => skip(-(d.seekOffset ?? AUDIO.SKIP_BACK))],
      ['seekforward', d => skip(d.seekOffset ?? AUDIO.SKIP_FORWARD)],
      ['seekto', d => d.seekTime !== undefined && seekTo(d.seekTime)],
    ];
    for (const [action, handler] of actions) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // This browser doesn't offer that control
      }
    }
    return () => {
      for (const [action] of actions) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // As above
        }
      }
      session.metadata = null;
    };
  }, [canticaName, cantoNumber, artwork, play, skip, seekTo]);

  // Keyboard: Space or K plays and pauses, the arrows or J and L skip
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
      switch (e.key) {
        case ' ':
          // Space presses a focused button or link itself
          if (target?.closest('button, a, summary, [role="button"], [role="slider"]')) return;
          togglePlay();
          break;
        case 'k':
        case 'K':
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          skip(-AUDIO.SKIP_BACK);
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          skip(AUDIO.SKIP_FORWARD);
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [togglePlay, skip]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || pendingTimeRef.current !== null) return;
    setCurrentTime(audio.currentTime);
    if (Math.abs(audio.currentTime - lastSavedRef.current) >= SAVE_INTERVAL) {
      lastSavedRef.current = audio.currentTime;
      savePosition(cantica, cantoNumber, audio.currentTime, audio.duration);
    }
  }, [cantica, cantoNumber]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    if (pendingTimeRef.current !== null) {
      audio.currentTime = pendingTimeRef.current;
      pendingTimeRef.current = null;
    }
    updateLockScreenPosition();
  }, [updateLockScreenPosition]);

  const handleDurationChange = useCallback(() => {
    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration)) setDuration(audio.duration);
  }, []);

  const handlePlay = useCallback(() => {
    const audio = audioRef.current;
    setIsPlaying(true);
    setHasPlayed(true);
    setCountdown(null);
    if (audio && audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) setIsBuffering(true);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    updateLockScreenPosition();
  }, [updateLockScreenPosition]);

  const handlePause = useCallback(() => {
    const audio = audioRef.current;
    setIsPlaying(false);
    setIsBuffering(false);
    if (audio && pendingTimeRef.current === null) {
      lastSavedRef.current = audio.currentTime;
      savePosition(cantica, cantoNumber, audio.currentTime, audio.duration);
    }
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    updateLockScreenPosition();
  }, [cantica, cantoNumber, updateLockScreenPosition]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setIsBuffering(false);
    savePosition(cantica, cantoNumber, 0, 0);
    if (next) {
      router.prefetch(`/${next.cantica}/${next.number}`);
      setCountdown(AUDIO.NEXT_CANTO_COUNTDOWN);
    }
  }, [cantica, cantoNumber, next, router]);

  const handleAudioError = useCallback(() => {
    setAudioError('Unable to load audio. Please try again later.');
    setIsPlaying(false);
    setIsBuffering(false);
  }, []);

  const cyclePlaybackRate = useCallback(() => {
    const rates = AUDIO.RATES as readonly number[];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    saveRate(nextRate);
  }, [playbackRate]);

  const toggleRemaining = useCallback(() => {
    setShowRemaining(show => {
      saveShowRemaining(!show);
      return !show;
    });
  }, []);

  const startOver = useCallback(() => {
    savePosition(cantica, cantoNumber, 0, 0);
    playFrom(0);
  }, [cantica, cantoNumber, playFrom]);

  // Progress bar: click or drag anywhere along it; hovering shows the time and line there
  const timeAtPointer = useCallback((clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1) * duration;
  }, [duration]);

  const handleBarPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setScrubTime(timeAtPointer(e.clientX));
  }, [timeAtPointer]);

  const handleBarPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const time = timeAtPointer(e.clientX);
    if (draggingRef.current) setScrubTime(time);
    if (e.pointerType === 'mouse') setHoverTime(time);
  }, [timeAtPointer]);

  const handleBarPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    seekTo(timeAtPointer(e.clientX));
    setScrubTime(null);
  }, [seekTo, timeAtPointer]);

  const handleBarPointerCancel = useCallback(() => {
    draggingRef.current = false;
    setScrubTime(null);
  }, []);

  const handleSeekKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const time = now();
    const targets: Record<string, number> = {
      ArrowLeft: time - AUDIO.ARROW_SEEK_DURATION,
      ArrowDown: time - AUDIO.ARROW_SEEK_DURATION,
      ArrowRight: time + AUDIO.ARROW_SEEK_DURATION,
      ArrowUp: time + AUDIO.ARROW_SEEK_DURATION,
      PageDown: time - AUDIO.SKIP_BACK,
      PageUp: time + AUDIO.SKIP_FORWARD,
      Home: 0,
      End: duration,
    };
    if (!(e.key in targets)) return;
    e.preventDefault();
    seekTo(targets[e.key]);
  }, [duration, now, seekTo]);

  const shownTime = scrubTime ?? currentTime;
  const previewTime = scrubTime ?? hoverTime;
  const progress = duration > 0 ? (shownTime / duration) * 100 : 0;

  // The segment spoken at a time; holds the last started segment through gaps
  const segmentAt = useCallback(
    (time: number) => timingData.segments.findLast(seg => time >= seg.startTime) ?? null,
    [timingData]
  );
  const currentSegment = useMemo(() => segmentAt(currentTime), [segmentAt, currentTime]);
  const previewSegment = previewTime !== null ? segmentAt(previewTime) : null;
  const previewLine = previewTime !== null ? lineAt?.(previewTime) : null;

  const audioSrc = `/audio/${cantica}/${cantica}_canto_${cantoNumber}.mp3`;
  const showResume = !hasPlayed && start.time > 0 && currentTime === start.time;

  let status: React.ReactNode;
  if (audioError) {
    status = <p className="text-xs sm:text-sm text-red-500">{audioError}</p>;
  } else if (isPlaying && currentSegment) {
    status = (
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
          {speakerLabel(currentSegment.speaker)}
        </span>
        <p className="text-xs sm:text-sm text-muted-foreground truncate italic">
          &ldquo;{currentSegment.text.substring(0, AUDIO.TEXT_PREVIEW_LENGTH)}{currentSegment.text.length > AUDIO.TEXT_PREVIEW_LENGTH ? '...' : ''}&rdquo;
        </p>
      </div>
    );
  } else if (autoplayBlocked) {
    status = <p className="text-xs sm:text-sm text-foreground/80">Press play to keep listening</p>;
  } else if (showResume) {
    status = (
      <p className="text-xs sm:text-sm text-muted-foreground truncate">
        Continuing from {formatTime(start.time)}
        <span className="mx-1.5" aria-hidden="true">&middot;</span>
        <button onClick={startOver} className="text-primary hover:underline underline-offset-2">
          Start over
        </button>
      </p>
    );
  } else {
    status = (
      <div className="min-w-0">
        <p className="hidden sm:block text-sm text-foreground/80 truncate">
          {canticaName}, Canto {toRoman(cantoNumber)}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          <span className="pointer-coarse:hidden">Click</span>
          <span className="hidden pointer-coarse:inline">Tap</span> any word to listen from there
        </p>
      </div>
    );
  }

  return (
    <>
      <audio
        ref={setAudioRef}
        src={audioSrc}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleDurationChange}
        onSeeked={() => {
          handleTimeUpdate();
          updateLockScreenPosition();
        }}
        onRateChange={updateLockScreenPosition}
        onEnded={handleEnded}
        onPlay={handlePlay}
        onPlaying={() => setIsBuffering(false)}
        onWaiting={() => setIsBuffering(true)}
        onPause={handlePause}
        onError={handleAudioError}
      />

      {/* Sticky Bottom Bar */}
      <div data-audio-player className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-lg border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        {/* Back to the spoken line, once the reader has scrolled away from it */}
        {isPlaying && follow && !follow.lineVisible && (
          <div className="pointer-events-none absolute inset-x-0 bottom-full flex justify-center pb-4">
            <button
              onClick={follow.follow}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg hover:bg-brand/90 transition-colors animate-follow-in"
            >
              <svg className={`w-4 h-4${follow.direction === 'up' ? ' rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0 6.75-6.75M12 19.5l-6.75-6.75" />
              </svg>
              Follow along
            </button>
          </div>
        )}

        {/* Progress bar along the top edge, with a taller invisible strip to grab */}
        <div
          ref={barRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(shownTime)}
          aria-valuetext={`${formatTime(shownTime)} of ${formatTime(duration)}`}
          className="group absolute inset-x-0 -top-2 h-6 cursor-pointer touch-none select-none focus-visible:outline-none"
          onPointerDown={handleBarPointerDown}
          onPointerMove={handleBarPointerMove}
          onPointerUp={handleBarPointerUp}
          onPointerCancel={handleBarPointerCancel}
          onPointerLeave={() => setHoverTime(null)}
          onKeyDown={handleSeekKey}
        >
          <div className={`absolute inset-x-0 top-2 bg-secondary transition-[height] duration-150 group-hover:h-1.5 group-focus-visible:h-1.5 group-focus-visible:ring-2 group-focus-visible:ring-primary ${scrubTime !== null ? 'h-1.5' : 'h-1'}`}>
            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <div
            className={`absolute top-2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 mt-[3px] rounded-full bg-primary shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100 ${scrubTime !== null ? 'opacity-100' : 'opacity-0'}`}
            style={{ left: `${progress}%` }}
          />

          {previewTime !== null && (
            <div
              className="pointer-events-none absolute bottom-full -translate-x-1/2 w-max max-w-[min(18rem,calc(100vw-2rem))] rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-lg"
              style={{ left: `clamp(min(9rem, 50% - 1rem), ${(previewTime / duration) * 100}%, max(100% - 9rem, 50% + 1rem))` }}
            >
              <span className="font-mono">{formatTime(previewTime)}</span>
              {previewSegment && <span className="opacity-75"> &middot; {speakerLabel(previewSegment.speaker)}</span>}
              {previewLine && <p className="font-serif italic text-sm truncate">{previewLine}</p>}
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {/* Moving on to the next canto */}
          {countdown !== null && next && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pb-3 text-sm">
              <span className="sr-only" role="status">{nextLabel} will start in {AUDIO.NEXT_CANTO_COUNTDOWN} seconds</span>
              <span className="text-foreground/80" aria-hidden="true">
                Next: {nextLabel} in <span className="font-mono tabular-nums">{countdown}</span>
              </span>
              <button onClick={goToNext} className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-brand/90 transition-colors">
                Play now
              </button>
              <button onClick={() => setCountdown(null)} className="text-xs text-muted-foreground hover:text-foreground hover:underline underline-offset-2">
                Cancel
              </button>
            </div>
          )}

          {/* On phones, status and time share the top row and the controls sit below */}
          <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-2">
            <div className="min-w-0 col-start-1 row-start-1">{status}</div>

            <div className="col-span-2 row-start-2 justify-self-center sm:col-span-1 sm:col-start-2 sm:row-start-1 flex items-center gap-2">
              <button
                onClick={() => skip(-AUDIO.SKIP_BACK)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`Back ${AUDIO.SKIP_BACK} seconds`}
                aria-keyshortcuts="ArrowLeft J"
                title={`Back ${AUDIO.SKIP_BACK} seconds (←)`}
              >
                <SkipIcon seconds={AUDIO.SKIP_BACK} />
              </button>

              <button
                onClick={togglePlay}
                className="relative w-12 h-12 flex items-center justify-center rounded-full bg-brand hover:bg-brand/90 text-primary-foreground transition-all hover:scale-105"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                aria-keyshortcuts="Space K"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
                {isBuffering && isPlaying && (
                  <span className="player-spinner absolute -inset-1 rounded-full border-2 border-brand/25 border-t-brand" aria-hidden="true" />
                )}
              </button>

              <button
                onClick={() => skip(AUDIO.SKIP_FORWARD)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`Forward ${AUDIO.SKIP_FORWARD} seconds`}
                aria-keyshortcuts="ArrowRight L"
                title={`Forward ${AUDIO.SKIP_FORWARD} seconds (→)`}
              >
                <SkipIcon seconds={AUDIO.SKIP_FORWARD} forward />
              </button>

              <button
                onClick={cyclePlaybackRate}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
                aria-label={`Playback speed ${playbackRate}x, change`}
                title="Playback speed"
              >
                {playbackRate}x
              </button>
            </div>

            <div className="col-start-2 row-start-1 sm:col-start-3 justify-self-end">
              <button
                onClick={toggleRemaining}
                className="text-xs sm:text-sm font-mono tabular-nums text-muted-foreground hover:text-foreground transition-colors"
                title={showRemaining ? 'Show total length' : 'Show time remaining'}
              >
                <span className="text-foreground">{formatTime(shownTime)}</span>
                <span className="mx-1">/</span>
                <span>{showRemaining ? `−${formatTime(Math.ceil(Math.max(0, duration - shownTime)))}` : formatTime(duration)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind player */}
      <div className="h-28 sm:h-20" />
    </>
  );
}
