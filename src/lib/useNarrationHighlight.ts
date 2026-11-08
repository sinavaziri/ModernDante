'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { LAYOUT } from '@/lib/constants';
import { findTokenAt, type TimedToken } from '@/lib/narration-alignment';

// Keep the last word lit this long after it ends (covers pauses between segments)
const LINGER_SECONDS = 1;

// Following scrolls the spoken line to this far down the visible area
const FOLLOW_POSITION = 0.3;

// Keys that scroll the page, so pressing one means the reader is moving it themselves
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);

export interface FollowState {
  /** The spoken line is on screen, or no line is being spoken */
  lineVisible: boolean;
  /** Where the spoken line is when it's off screen */
  direction: 'up' | 'down';
  /** Scroll to the spoken line and keep it in view from now on */
  follow: () => void;
}

/**
 * Drives narration highlighting straight from the audio element, and keeps the
 * spoken line on screen.
 *
 * Reads audio.currentTime every animation frame while playing and toggles
 * `is-active` on the current line and `is-current` on the current word.
 * Only the affected elements change, so the canto never re-renders during playback.
 *
 * While playing, the page follows the narration: when the spoken line reaches the
 * bottom of the screen it scrolls up to sit near the top. Scrolling the line out of
 * view yourself stops this, so it never fights the reader. It starts again once the
 * spoken line is back on screen, whether the reader scrolled back to it or the
 * narration caught up with them, or when they press play or call `follow`.
 */
export function useNarrationHighlight(
  containerRef: RefObject<HTMLElement | null>,
  audio: HTMLAudioElement | null,
  timed: TimedToken[],
  onFollowChange?: (state: FollowState) => void
) {
  const onFollowChangeRef = useRef(onFollowChange);
  useEffect(() => {
    onFollowChangeRef.current = onFollowChange;
  }, [onFollowChange]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !audio || timed.length === 0) return;

    let currentWord = -1;
    let currentLine = -1;
    let lineLit = false;
    let lineEl: HTMLElement | null = null;
    let wordEl: HTMLElement | null = null;
    let frame = 0;
    let following = true;
    // The reader has moved the page since this hook last scrolled it
    let readerScrolling = false;
    let reported = '';

    // The part of the window between the sticky header and the audio player
    const viewport = () => {
      const player = document.querySelector('[data-audio-player]');
      return {
        top: LAYOUT.HEADER_HEIGHT,
        bottom: window.innerHeight - (player?.getBoundingClientRect().height ?? 0),
      };
    };

    const linePosition = (): 'above' | 'below' | 'in' | null => {
      if (!lineEl) return null;
      const rect = lineEl.getBoundingClientRect();
      const { top, bottom } = viewport();
      if (rect.bottom <= top || rect.top < top - rect.height / 2) return 'above';
      if (rect.top >= bottom || rect.bottom > bottom + rect.height / 2) return 'below';
      return 'in';
    };

    const scrollToActive = () => {
      if (!lineEl) return;
      const rect = lineEl.getBoundingClientRect();
      const { top, bottom } = viewport();
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      readerScrolling = false;
      window.scrollTo({
        top: window.scrollY + rect.top - (top + (bottom - top) * FOLLOW_POSITION),
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    };

    const report = () => {
      const position = linePosition();
      const state = `${position}`;
      if (state === reported) return;
      reported = state;
      onFollowChangeRef.current?.({
        lineVisible: position !== 'above' && position !== 'below',
        direction: position === 'above' ? 'up' : 'down',
        follow,
      });
    };

    function follow() {
      following = true;
      scrollToActive();
    }

    // Scroll on when the spoken line nears the bottom, or has been left above the top
    const keepInView = () => {
      if (audio.paused || !lineEl) return;
      // A reader who scrolled ahead is followed again once the narration catches up with them
      if (!following) following = linePosition() === 'in';
      if (!following) return;
      const rect = lineEl.getBoundingClientRect();
      const { top, bottom } = viewport();
      if (rect.bottom > bottom - rect.height || rect.top < top) scrollToActive();
    };

    const update = () => {
      const time = audio.currentTime;
      const found = findTokenAt(timed, time);
      const lingering = found >= 0 && time > timed[found].end + LINGER_SECONDS;
      const word = lingering ? -1 : found;
      // Through a pause, the last spoken line stays the one to follow, though it's no longer lit
      const line = found >= 0 ? timed[found].line : -1;

      if (word !== currentWord) {
        currentWord = word;
        wordEl?.classList.remove('is-current');
        wordEl = word >= 0 ? root.querySelector<HTMLElement>(`[data-token="${timed[word].token}"]`) : null;
        wordEl?.classList.add('is-current');
      }

      if (line !== currentLine) {
        lineEl?.classList.remove('is-active');
        lineLit = false;
        currentLine = line;
        lineEl = line >= 0 ? root.querySelector<HTMLElement>(`[data-line="${line}"]`) : null;
        keepInView();
        report();
      }

      if (lineLit !== word >= 0) {
        lineLit = word >= 0;
        lineEl?.classList.toggle('is-active', lineLit);
      }
    };

    const loop = () => {
      update();
      frame = requestAnimationFrame(loop);
    };
    // While playing, the other lines fade back so the spoken one stands out
    const start = () => {
      root.classList.add('is-playing');
      cancelAnimationFrame(frame);
      update();
      // Pressing play means listening along, so bring the spoken line back into view
      following = true;
      if (linePosition() !== 'in') scrollToActive();
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      root.classList.remove('is-playing');
      cancelAnimationFrame(frame);
      update();
    };

    const onReaderInput = () => {
      readerScrolling = true;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key)) onReaderInput();
    };
    // Dragging the page's scrollbar
    const onPointerDown = (e: PointerEvent) => {
      if (e.target === document.documentElement) onReaderInput();
    };
    const onScroll = () => {
      // Follow for as long as the reader keeps the spoken line on screen
      if (readerScrolling && lineEl) following = linePosition() === 'in';
      report();
    };

    audio.addEventListener('play', start);
    audio.addEventListener('pause', stop);
    audio.addEventListener('ended', stop);
    audio.addEventListener('seeked', update);
    window.addEventListener('wheel', onReaderInput, { passive: true });
    window.addEventListener('touchmove', onReaderInput, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', report);

    update();
    report();
    if (!audio.paused) start();

    return () => {
      cancelAnimationFrame(frame);
      audio.removeEventListener('play', start);
      audio.removeEventListener('pause', stop);
      audio.removeEventListener('ended', stop);
      audio.removeEventListener('seeked', update);
      window.removeEventListener('wheel', onReaderInput);
      window.removeEventListener('touchmove', onReaderInput);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', report);
      root.classList.remove('is-playing');
      wordEl?.classList.remove('is-current');
      lineEl?.classList.remove('is-active');
    };
  }, [containerRef, audio, timed]);
}
