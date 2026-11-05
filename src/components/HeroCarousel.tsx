'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { toRoman } from '@/lib/canticas';
import type { CarouselSlide } from '@/lib/image-mappings';

const ADVANCE_MS = 7000;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const subscribeToMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

/**
 * Crossfades through Doré plates beside the home page title. It pauses while the pointer is over it or keyboard
 * focus is inside it, and doesn't start on its own for visitors who ask for reduced motion.
 */
export default function HeroCarousel({ slides }: { slides: CarouselSlide[] }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  // Only the shown slide and the next one load. Each stays in the page afterwards, so it isn't fetched again.
  const [requested, setRequested] = useState(() => new Set([0, 1 % count]));
  const [choice, setChoice] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const reducedMotion = useSyncExternalStore(subscribeToMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
  const playing = choice ?? !reducedMotion;
  const advancing = playing && !hovered && !focused;

  const goTo = useCallback((target: number) => {
    const next = (target + count) % count;
    if (next === index) return;
    setPrevious(index);
    setIndex(next);
    setRequested(shown => new Set(shown).add(next).add((next + 1) % count));
  }, [count, index]);

  useEffect(() => {
    if (!advancing) return;
    const timer = setTimeout(() => goTo(index + 1), ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [advancing, goTo, index]);

  const slide = slides[index];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Doré's illustrations"
      className="relative w-full max-w-[calc(56vh*0.8)] lg:max-w-[calc(64vh*0.8)]"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
    >
      <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 rounded-sm blur-2xl" />

      {/* The caption link below is the keyboard route to the canto, so this one is for pointers only */}
      <Link
        href={slide.href}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[4/5] overflow-hidden rounded-sm shadow-2xl border border-border/20 bg-muted"
      >
        {slides.map((s, i) => requested.has(i) && (
          <img
            key={s.imageNumber}
            src={s.src}
            srcSet={s.srcSet}
            sizes="(min-width: 1024px) 560px, 90vw"
            alt=""
            fetchPriority={i === 0 ? 'high' : 'low'}
            className={`absolute inset-0 h-full w-full object-cover ${
              i === previous
                ? 'z-20 opacity-0 transition-opacity duration-[1200ms] ease-out motion-reduce:transition-none'
                : i === index
                  ? 'z-10 opacity-100'
                  : 'z-0 opacity-0'
            }`}
          />
        ))}
      </Link>

      <div className="relative mt-4 flex items-center justify-between gap-4">
        <div aria-live={advancing ? 'off' : 'polite'} className="min-w-0">
          <Link href={slide.href} className="group block min-w-0 rounded-sm">
            <span className="block text-sm text-muted-foreground">
              {slide.canticaName}, Canto {toRoman(slide.canto)}
            </span>
            <span className="block truncate font-serif italic text-foreground group-hover:text-primary transition-colors">
              {slide.title}
            </span>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
          <button
            onClick={() => goTo(index - 1)}
            aria-label="Previous illustration"
            className="p-2 rounded-sm hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="w-12 text-center text-xs tabular-nums">
            {index + 1} / {count}
          </span>
          <button
            onClick={() => goTo(index + 1)}
            aria-label="Next illustration"
            className="p-2 rounded-sm hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => setChoice(!playing)}
            aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
            className="p-2 rounded-sm hover:bg-muted hover:text-foreground transition-colors"
          >
            {playing ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
