'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { LAYOUT } from '@/lib/constants';
import { findTokenAt, type TimedToken } from '@/lib/narration-alignment';

// Keep the last word lit this long after it ends (covers pauses between segments)
const LINGER_SECONDS = 1;

/**
 * Drives narration highlighting straight from the audio element.
 *
 * Reads audio.currentTime every animation frame while playing and toggles
 * `is-active` on the current line and `is-current` on the current word.
 * Only the affected elements change, so the canto never re-renders during playback.
 */
export function useNarrationHighlight(
  containerRef: RefObject<HTMLElement | null>,
  audio: HTMLAudioElement | null,
  timed: TimedToken[],
  onVisibilityChange?: (isVisible: boolean, scrollToActive: () => void) => void
) {
  const onVisibilityChangeRef = useRef(onVisibilityChange);
  useEffect(() => {
    onVisibilityChangeRef.current = onVisibilityChange;
  }, [onVisibilityChange]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !audio || timed.length === 0) return;

    let current = -1;
    let lineEl: HTMLElement | null = null;
    let wordEl: HTMLElement | null = null;
    let lastVisible: boolean | null = null;
    let frame = 0;

    const scrollToActive = () => {
      if (!lineEl) return;
      const rect = lineEl.getBoundingClientRect();
      window.scrollTo({
        top: window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2,
        behavior: 'smooth',
      });
    };

    const checkVisibility = () => {
      if (!lineEl) return;
      const rect = lineEl.getBoundingClientRect();
      const isVisible = rect.top >= LAYOUT.HEADER_HEIGHT && rect.bottom <= window.innerHeight - LAYOUT.AUDIO_PLAYER_HEIGHT;
      if (isVisible !== lastVisible) {
        lastVisible = isVisible;
        onVisibilityChangeRef.current?.(isVisible, scrollToActive);
      }
    };

    const update = () => {
      const time = audio.currentTime;
      let index = findTokenAt(timed, time);
      if (index >= 0 && time > timed[index].end + LINGER_SECONDS) index = -1;
      if (index === current) return;

      const prevLine = current >= 0 ? timed[current].line : -1;
      const nextLine = index >= 0 ? timed[index].line : -1;
      current = index;

      wordEl?.classList.remove('is-current');
      wordEl = index >= 0 ? root.querySelector<HTMLElement>(`[data-token="${timed[index].token}"]`) : null;
      wordEl?.classList.add('is-current');

      if (nextLine !== prevLine) {
        lineEl?.classList.remove('is-active');
        lineEl = nextLine >= 0 ? root.querySelector<HTMLElement>(`[data-line="${nextLine}"]`) : null;
        lineEl?.classList.add('is-active');
        checkVisibility();
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
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      root.classList.remove('is-playing');
      cancelAnimationFrame(frame);
      update();
    };

    audio.addEventListener('play', start);
    audio.addEventListener('pause', stop);
    audio.addEventListener('ended', stop);
    audio.addEventListener('seeked', update);
    window.addEventListener('scroll', checkVisibility, { passive: true });

    update();
    if (!audio.paused) start();

    return () => {
      cancelAnimationFrame(frame);
      audio.removeEventListener('play', start);
      audio.removeEventListener('pause', stop);
      audio.removeEventListener('ended', stop);
      audio.removeEventListener('seeked', update);
      window.removeEventListener('scroll', checkVisibility);
      root.classList.remove('is-playing');
      wordEl?.classList.remove('is-current');
      lineEl?.classList.remove('is-active');
    };
  }, [containerRef, audio, timed]);
}
