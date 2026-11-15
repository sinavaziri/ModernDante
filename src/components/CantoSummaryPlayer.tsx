'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { CantoSummary } from '@/lib/summaries';

// The canto told in about a minute, in plainer words than the poem: a button under the title that plays
// the recording and opens its words. It is separate from the full narration, and only one of the two plays.

interface CantoSummaryPlayerProps {
  summary: CantoSummary;
  /** The full narration's audio, which stops when the summary starts and stops the summary when it starts */
  narration?: HTMLAudioElement | null;
  /** The button's words. A canto's summary is the default */
  label?: string;
  /** Whether playing opens the words under the button. Off where the page itself is what is read */
  words?: boolean;
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function CantoSummaryPlayer({ summary, narration = null, label = 'Canto summary', words = true }: CantoSummaryPlayerProps) {
  const audio = useRef<HTMLAudioElement>(null);
  const panel = useId();
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!narration) return;
    const stop = () => audio.current?.pause();
    narration.addEventListener('play', stop);
    return () => narration.removeEventListener('play', stop);
  }, [narration]);

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (!el.paused) return el.pause();
    narration?.pause();
    if (words) setOpen(true);
    if (el.error) el.load();
    el.play().then(() => setFailed(false), error => {
      if ((error as DOMException).name !== 'AbortError') setFailed(true);
    });
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audio.current) return;
    audio.current.currentTime = Number(e.target.value);
    setTime(Number(e.target.value));
  };

  return (
    <div className="mx-auto mt-8 w-full max-w-2xl">
      <audio
        ref={audio}
        src={summary.src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setTime(0)}
        onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={e => setLength(e.currentTarget.duration)}
      />

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Pause: ${label}` : `Play: ${label}`}
          className="inline-flex items-center gap-3 rounded-full border border-border py-2 pl-2 pr-5 font-sans text-sm text-foreground transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-primary-foreground">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
              {playing ? <path d="M3.5 2h3v12h-3zM9.5 2h3v12h-3z" /> : <path d="M4.5 2.2v11.6L13.5 8z" />}
            </svg>
          </span>
          {label}
        </button>
        {open && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-controls={panel}
            className="font-sans text-sm text-muted-foreground underline decoration-border underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Hide the words
          </button>
        )}
      </div>

      {(playing || time > 0) && (
        <div className="mt-4 flex items-center gap-3 font-sans text-xs tabular-nums text-muted-foreground">
          <span>{clock(time)}</span>
          <input
            type="range"
            min={0}
            max={length || 1}
            step={0.1}
            value={time}
            onChange={seek}
            aria-label="Place in the recording"
            className="h-1 flex-1 cursor-pointer accent-[var(--color-brand)]"
          />
          <span>{length ? clock(length) : ''}</span>
        </div>
      )}

      {failed && <p className="mt-3 font-sans text-sm text-muted-foreground">The recording couldn&rsquo;t be played. Check your connection and press play again.</p>}

      {open && (
        <div id={panel} className="mt-5 space-y-3 border-l-2 border-primary/30 pl-5 text-left font-serif text-base leading-relaxed text-foreground/90">
          {summary.paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      )}
    </div>
  );
}
