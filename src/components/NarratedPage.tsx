'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import CantoSummaryPlayer from '@/components/CantoSummaryPlayer';

/**
 * A page that is read aloud as it stands: a play button, then the page's own words. Each word the page
 * renders as <span class="narration-word" data-t="seconds"> lights up as it is spoken and can be clicked
 * to listen from there. Without such spans (no timings) it is the button alone.
 */
export default function NarratedPage({ src, paragraphs, label, children }: { src: string; paragraphs: string[]; label: string; children: ReactNode }) {
  const body = useRef<HTMLDivElement>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [timed, setTimed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const root = body.current;
    if (!audio || !root) return;
    const words = [...root.querySelectorAll<HTMLElement>('[data-t]')];
    const starts = words.map(word => Number(word.dataset.t));
    setTimed(words.length > 0);
    if (!words.length) return;

    let current: HTMLElement | null = null;
    let frame = 0;
    const mark = (word: HTMLElement | null) => {
      if (word === current) return;
      current?.classList.remove('is-current');
      word?.classList.add('is-current');
      current = word;
    };
    /** The word being spoken at the recording's present time: the last one that has started */
    const sync = () => {
      const now = audio.currentTime + 0.05;
      let low = 0;
      let high = starts.length - 1;
      let found = -1;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (starts[mid] <= now) {
          found = mid;
          low = mid + 1;
        } else high = mid - 1;
      }
      mark(found < 0 || (audio.paused && audio.currentTime === 0) ? null : words[found]);
    };
    const tick = () => {
      sync();
      frame = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      setPlaying(true);
      cancelAnimationFrame(frame);
      tick();
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(frame);
      sync();
    };
    const onEnded = () => mark(null);

    /** Listen from the clicked word. The recording isn't loaded until first played, so the jump may have to wait for it. */
    const onClick = (event: MouseEvent) => {
      const word = (event.target as HTMLElement).closest<HTMLElement>('[data-t]');
      if (!word || !root.contains(word) || window.getSelection()?.toString()) return;
      const jump = () => {
        audio.currentTime = Number(word.dataset.t);
      };
      if (audio.readyState >= 1) jump();
      else audio.addEventListener('loadedmetadata', jump, { once: true });
      audio.play().catch(() => {});
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('seeked', sync);
    root.addEventListener('click', onClick);
    return () => {
      cancelAnimationFrame(frame);
      mark(null);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('seeked', sync);
      root.removeEventListener('click', onClick);
    };
  }, [audio]);

  return (
    <>
      <div className="text-center">
        <CantoSummaryPlayer summary={{ paragraphs, src }} label={label} words={false} onAudio={setAudio} />
      </div>
      <div ref={body} className={`${timed ? 'has-narration' : ''} ${playing ? 'is-playing' : ''}`}>
        {children}
      </div>
    </>
  );
}
