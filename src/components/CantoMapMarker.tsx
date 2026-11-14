'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { toRoman, type Cantica } from '@/lib/canticas';
import { LEVEL_WORD, PAINTING, getMapOutlines, outlineBox, outlinePoints, type MapLevel } from '@/lib/realm-maps';

// Where a canto takes place, shown on a small copy of its realm's map: under the canto's title, and
// on a wide screen again in the margin once the title has scrolled away.

interface CantoMapMarkerProps {
  cantica: Cantica;
  /** The levels the canto passes through, in order */
  levels: MapLevel[];
}

/** The height of the close view of the map, in the painting's pixels: a window as wide as the painting */
const WINDOW = 600;

/** The realm's painting with these levels lit and the rest in shade: the whole of it, or a close view of the levels and their neighbors */
function MapThumb({ cantica, levels, close, className }: CantoMapMarkerProps & { close?: boolean; className?: string }) {
  const shade = useId();
  const outlines = getMapOutlines(cantica);
  const lit = levels.map(level => outlines[level.id]).filter(Boolean);
  const { width, height } = PAINTING;
  let top = 0;
  let tall = height;
  if (close && lit.length) {
    const boxes = lit.map(outlineBox);
    const first = Math.min(...boxes.map(box => box.top));
    const last = Math.max(...boxes.map(box => box.bottom));
    // Room above and below for the levels on either side
    tall = Math.min(height, Math.max(WINDOW, (last - first) / 0.6));
    top = Math.min(Math.max((first + last) / 2 - tall / 2, 0), height - tall);
  }
  return (
    <svg viewBox={`0 ${top} ${width} ${tall}`} aria-hidden="true" className={className} style={close ? { aspectRatio: `${width} / ${tall}` } : undefined}>
      <defs>
        <mask id={shade}>
          <rect width={width} height={height} fill="white" />
          {lit.map((outline, i) => (
            <polygon key={i} points={outlinePoints(outline)} fill="black" />
          ))}
        </mask>
      </defs>
      <image href={`/images-map/${cantica}-thumb.webp`} width={width} height={height} preserveAspectRatio="none" />
      <rect width={width} height={height} fill="hsl(24 14% 7%)" opacity={close ? 0.45 : 0.6} mask={`url(#${shade})`} />
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
      <div ref={block} className="mx-auto mt-8 w-full max-w-md">
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
