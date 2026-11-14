'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { toRoman, type Cantica } from '@/lib/canticas';
import { getInfernoLevels } from '@/lib/inferno-map';
import { LEVEL_WORD, PAINTING, getMapOutlines, getRealmLevels, outlineBox, outlinePoints, type MapLevel } from '@/lib/realm-maps';

// Where a canto takes place, shown on a small copy of its realm's map: under the canto's title, and
// on a wide screen again in the margin once the title has scrolled away.

interface CantoMapMarkerProps {
  cantica: Cantica;
  /** The levels the canto passes through, in order */
  levels: MapLevel[];
}

/** How many levels already passed the close view shows before the canto's own */
const BEHIND = 2;
const GROUND = 'hsl(24 14% 7%)';

/**
 * The realm's painting with the canto's levels lit and the levels already passed in gray. Nothing
 * further along the journey is shown: the whole view leaves it dark, and the close view ends at
 * the canto's own level, with up to two of the levels before it.
 */
function MapThumb({ cantica, levels, close, className }: CantoMapMarkerProps & { close?: boolean; className?: string }) {
  const id = useId();
  const outlines = getMapOutlines(cantica);
  const journey = cantica === 'inferno' ? getInfernoLevels() : getRealmLevels(cantica);
  const lit = levels.map(level => outlines[level.id]).filter(Boolean);
  const { width, height } = PAINTING;
  const at = levels.map(level => journey.findIndex(other => other.id === level.id)).filter(n => n >= 0);
  const reached = at.length ? Math.max(...at) : journey.length - 1;
  const span = (from: number) => {
    const boxes = journey.slice(from, reached + 1).map(level => outlines[level.id]).filter(Boolean).map(outlineBox);
    return { top: Math.min(...boxes.map(box => box.top)), bottom: Math.max(...boxes.map(box => box.bottom)) };
  };
  // Everything from the start of the journey to the canto's level, and the part of it the close view shows
  const passed = span(0);
  const shown = close ? span(Math.max(0, (at.length ? Math.min(...at) : 0) - BEHIND)) : { top: 0, bottom: height };
  const tall = shown.bottom - shown.top;
  const picture = { href: `/images-map/${cantica}-thumb.webp`, width, height, preserveAspectRatio: 'none' };
  return (
    <svg
      viewBox={`0 ${shown.top} ${width} ${tall}`}
      aria-hidden="true"
      className={className}
      style={{ backgroundColor: GROUND, ...(close ? { aspectRatio: `${width} / ${tall}` } : {}) }}
    >
      <defs>
        <clipPath id={`${id}-passed`}>
          <rect y={passed.top} width={width} height={passed.bottom - passed.top} />
        </clipPath>
        <clipPath id={`${id}-lit`}>
          {lit.map((outline, i) => (
            <polygon key={i} points={outlinePoints(outline)} />
          ))}
        </clipPath>
      </defs>
      <image {...picture} clipPath={`url(#${id}-passed)`} style={{ filter: 'grayscale(1) brightness(0.55)' }} />
      <image {...picture} clipPath={`url(#${id}-lit)`} />
      {lit.map((outline, i) => (
        <polygon key={i} points={outlinePoints(outline)} fill="none" stroke="hsl(40 70% 88%)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

const nameOf = (cantica: Cantica, level: MapLevel) => (level.circle ? `${LEVEL_WORD[cantica]} ${level.circle}: ${level.name}` : level.name);

function cantosOf(level: MapLevel) {
  const first = level.cantos[0];
  const last = level.cantos[level.cantos.length - 1];
  return first === last ? `Canto ${toRoman(first)}` : `Cantos ${toRoman(first)}–${toRoman(last)}`;
}

export default function CantoMapMarker({ cantica, levels }: CantoMapMarkerProps) {
  const block = useRef<HTMLDivElement>(null);
  const [passed, setPassed] = useState(false);
  const mapPath = cantica === 'inferno' ? '/map' : `/map/${cantica}`;

  // The marker in the margin comes in once the one under the title has gone off the top
  useEffect(() => {
    if (!block.current) return;
    const seen = new IntersectionObserver(([entry]) => setPassed(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    seen.observe(block.current);
    return () => seen.disconnect();
  }, []);

  if (levels.length === 0) return null;
  const linkClass = 'text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary';
  const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <>
      <div ref={block} className="mx-auto mt-8 w-full max-w-3xl">
        <Link href={`${mapPath}#${levels[0].id}`} aria-label="Open the map at this canto" className={`block overflow-hidden rounded-lg shadow-md ${ring}`}>
          <MapThumb cantica={cantica} levels={levels} close className="block w-full" />
        </Link>
        <p className="mt-3 font-sans text-sm text-muted-foreground">
          On the map:{' '}
          {levels.map((level, i) => (
            <span key={level.id}>
              {i > 0 && ', '}
              <Link href={`${mapPath}#${level.id}`} className={linkClass}>
                {nameOf(cantica, level)}
              </Link>{' '}
              ({cantosOf(level)})
            </span>
          ))}
        </p>
      </div>

      <Link
        href={`${mapPath}#${levels[0].id}`}
        aria-label={`On the map: ${levels.map(level => nameOf(cantica, level)).join(', ')}`}
        tabIndex={passed ? 0 : -1}
        className={`fixed top-1/2 left-[calc(50%-36rem)] z-30 hidden w-32 -translate-y-1/2 transition-opacity duration-300 xl:block ${ring} ${
          passed ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <MapThumb cantica={cantica} levels={levels} className="block h-64 w-32 rounded-md shadow-md" />
        <span className="mt-2 block text-center font-sans text-sm leading-snug text-muted-foreground">
          {levels.map(level => (level.circle ? `${LEVEL_WORD[cantica]} ${level.circle}` : (level.shortName ?? level.name))).join(', ')}
        </span>
      </Link>
    </>
  );
}
