'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// One scroll through the whole poem. The view goes down through Hell to Lucifer, closes in on him
// until he fills the picture, and gives way to the cavern under him, where his legs are as large. Then
// it climbs: scrolling on moves it UP through Purgatory and Paradise. The two legs lie one over the
// other with their feet level, and the scroll position drives where the view is.

type Stop = 'inferno' | 'purgatorio' | 'paradiso';

const STOPS: { stop: Stop; name: string }[] = [
  { stop: 'inferno', name: 'Inferno' },
  { stop: 'purgatorio', name: 'Purgatorio' },
  { stop: 'paradiso', name: 'Paradiso' },
];

interface JourneyScrollerProps {
  /** Where the page opens when the address names no level */
  start: Stop;
  /** Hell, read from the top down */
  descent: ReactNode;
  /** The way out, Purgatory and Paradise, read from the bottom up */
  climb: ReactNode;
}

interface Measures {
  /** The view's height */
  view: number;
  /** How far the view travels down Hell, through the turn at the center, and up the climb */
  down: number;
  across: number;
  up: number;
  /** Whether the turn closes in on Lucifer: only where the painting, not a list, is at the foot of Hell */
  zoom: boolean;
}

/** How much larger Lucifer's legs are in the cavern than he is on the map of Hell */
const CLOSE_UP = 3.2;
const ease = (t: number) => t * t * (3 - 2 * t);

const clamp = (n: number, low: number, high: number) => Math.min(Math.max(n, low), high);

export default function JourneyScroller({ start, descent, climb }: JourneyScrollerProps) {
  const outer = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const descentLeg = useRef<HTMLDivElement>(null);
  const climbLeg = useRef<HTMLDivElement>(null);
  const measures = useRef<Measures | null>(null);
  const touched = useRef(false);
  const [current, setCurrent] = useState<Stop>(start);

  /** How far along the journey the page is scrolled */
  const progress = useCallback(() => {
    if (!outer.current || !stage.current) return 0;
    return stage.current.getBoundingClientRect().top - outer.current.getBoundingClientRect().top;
  }, []);

  /** Scrolls the page so the journey is this far along */
  const travelTo = useCallback((p: number, behavior: ScrollBehavior) => {
    if (!outer.current || !stage.current) return;
    const pinnedAt = parseFloat(getComputedStyle(stage.current).top) || 0;
    const top = outer.current.getBoundingClientRect().top + window.scrollY - pinnedAt + p;
    window.scrollTo({ top, behavior });
  }, []);

  /** How far along the journey an element is in the middle of the view */
  const whereIs = useCallback((el: Element) => {
    const m = measures.current;
    if (!m || !world.current) return 0;
    const box = el.getBoundingClientRect();
    const origin = world.current.getBoundingClientRect();
    const top = box.top - origin.top + box.height / 2 - m.view / 2;
    if (!climbLeg.current?.contains(el)) return clamp(top, 0, m.down);
    return m.down + m.across + (m.down - clamp(top, m.down - m.up, m.down));
  }, []);

  const stopAt = useCallback(
    (stop: Stop) => {
      const m = measures.current;
      if (!m) return 0;
      if (stop === 'inferno') return 0;
      if (stop === 'purgatorio') return m.down + m.across;
      const ascent = document.getElementById('rising') ?? document.getElementById('ascent');
      return ascent ? whereIs(ascent) : m.down + m.across + m.up;
    },
    [whereIs]
  );

  const place = useCallback(() => {
    const m = measures.current;
    if (!m || !world.current) return;
    const p = clamp(progress(), 0, m.down + m.across + m.up);
    let y = -p;
    if (p > m.down + m.across) y = -m.down + (p - m.down - m.across);
    else if (p > m.down) y = -m.down;
    world.current.style.transform = `translate3d(0, ${y}px, 0)`;

    // The turn at the center. Hell grows around Lucifer and fades; the cavern grows from small to its
    // own size around his legs and appears. Away from the turn only the leg in view shows.
    const t = m.across ? clamp((p - m.down) / m.across, 0, 1) : 1;
    const shown = ease(clamp((t - 0.3) / 0.55, 0, 1));
    const legs = [
      { leg: descentLeg.current, opacity: 1 - shown, scale: t < 1 ? 1 + (CLOSE_UP - 1) * ease(t) : 1 },
      { leg: climbLeg.current, opacity: shown, scale: t > 0 ? 1 / CLOSE_UP + (1 - 1 / CLOSE_UP) * ease(t) : 1 },
    ];
    for (const { leg, opacity, scale } of legs) {
      if (!leg) continue;
      leg.style.opacity = String(opacity);
      leg.style.visibility = opacity === 0 ? 'hidden' : 'visible';
      leg.style.transform = m.zoom && scale !== 1 ? `scale(${scale})` : '';
    }
    // A sharper picture of Lucifer comes in over the map as the view closes in on him
    const closeup = descentLeg.current?.querySelector<SVGImageElement>('[data-closeup]');
    if (closeup) closeup.style.opacity = String(m.zoom ? ease(clamp(t / 0.2, 0, 1)) : 0);
    const paradiso = stopAt('paradiso');
    setCurrent(p < m.down + m.across / 2 ? 'inferno' : p < paradiso - m.view / 3 ? 'purgatorio' : 'paradiso');
  }, [progress, stopAt]);

  const measure = useCallback(() => {
    if (!outer.current || !stage.current || !descentLeg.current || !climbLeg.current) return;
    const view = stage.current.clientHeight;
    const hell = descentLeg.current.offsetHeight;
    const rest = climbLeg.current.offsetHeight;
    measures.current = {
      view,
      down: Math.max(0, hell - view),
      across: Math.round(view * 0.9),
      up: Math.max(0, rest - view),
      zoom: window.matchMedia('(min-width: 1280px)').matches,
    };
    const m = measures.current;
    outer.current.style.height = `${m.down + m.across + m.up + view}px`;

    // Each leg grows around the same figure: Lucifer on the map of Hell, his legs in the cavern
    const pin = (leg: HTMLElement, at: Element | null, down: number) => {
      if (!at) return;
      const frame = leg.getBoundingClientRect();
      const box = at.getBoundingClientRect();
      const scale = frame.width / leg.offsetWidth || 1;
      const x = (box.left + box.width / 2 - frame.left) / scale;
      const yAt = (box.top + box.height * down - frame.top) / scale;
      leg.style.transformOrigin = `${x}px ${yAt}px`;
    };
    pin(descentLeg.current, descentLeg.current.querySelector('a[href="#circle-9"] polygon'), 0.5);
    pin(climbLeg.current, climbLeg.current.querySelector('#way-out img'), 0.86);
  }, []);

  /** Opens at the level in the address, or at the realm the page was asked for */
  const open = useCallback(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    travelTo(target ? whereIs(target) : stopAt(start), 'instant');
  }, [start, stopAt, travelTo, whereIs]);

  useLayoutEffect(() => {
    measure();
    open();
    place();
  }, [measure, open, place]);

  useEffect(() => {
    const onScroll = () => place();
    const onTouch = () => {
      touched.current = true;
    };
    const onHash = () => open();
    // Sizes settle as fonts load: until the visitor moves, stay at the place the page opened on
    const sizes = new ResizeObserver(() => {
      measure();
      if (!touched.current) open();
      place();
    });
    for (const el of [stage.current, descentLeg.current, climbLeg.current]) if (el) sizes.observe(el);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('hashchange', onHash);
    for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) window.addEventListener(type, onTouch, { passive: true });
    return () => {
      sizes.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('hashchange', onHash);
      for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) window.removeEventListener(type, onTouch);
    };
  }, [measure, open, place]);

  /** A link to a level on this page travels there, in place of the browser's own jump */
  const onClick = (event: React.MouseEvent) => {
    const link = (event.target as Element).closest('a[href^="#"]');
    const id = link?.getAttribute('href')?.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    event.preventDefault();
    window.history.replaceState(null, '', `#${id}`);
    travelTo(whereIs(target), 'smooth');
  };

  /** Keeps a link reached with the keyboard in view */
  const onFocus = (event: React.FocusEvent) => {
    if (!stage.current || !(event.target as Element).matches(':focus-visible')) return;
    const box = event.target.getBoundingClientRect();
    const frame = stage.current.getBoundingClientRect();
    const seen = box.top >= frame.top && box.bottom <= frame.bottom && box.left >= frame.left && box.right <= frame.right;
    if (!seen) travelTo(whereIs(event.target), 'instant');
  };

  return (
    <div ref={outer} data-journey className="relative">
      <div ref={stage} className="sticky top-20 h-[calc(100dvh-5rem)] overflow-clip">
        <nav
          aria-label="Realms"
          className="absolute top-3 left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-full border border-border bg-background/85 p-1 font-sans text-sm shadow-md backdrop-blur-md"
        >
          {STOPS.map(({ stop, name }) => (
            <button
              key={stop}
              type="button"
              aria-current={stop === current ? 'true' : undefined}
              onClick={() => {
                touched.current = true;
                travelTo(stopAt(stop), 'smooth');
              }}
              className={`rounded-full px-3.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                stop === current ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {name}
            </button>
          ))}
        </nav>

        <div ref={world} className="relative will-change-transform" onClick={onClick} onFocus={onFocus}>
          <div ref={descentLeg}>{descent}</div>
          <div ref={climbLeg} className="absolute bottom-0 left-0 w-full">
            {climb}
          </div>
        </div>
      </div>
    </div>
  );
}
