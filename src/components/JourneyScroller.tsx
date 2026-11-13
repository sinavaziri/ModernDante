'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// One scroll through the whole poem. The view goes down through Hell to Lucifer, closes in on him,
// sinks under the ice to his legs and rolls over, so that down becomes up. Then it climbs: scrolling
// on moves it UP through Purgatory and Paradise. The two legs lie one over the other with their feet
// level, and the scroll position drives where the view is.

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
  /** The turn is acted out in full only where the painting, not a list, is at the foot of Hell */
  turn: {
    /** Lucifer on the map of Hell, and how far the map's foot is below him */
    lucifer: { x: number; y: number };
    /** The middle of his legs in the cavern: the point the view rolls over about */
    legs: { x: number; y: number; inClimb: { x: number; y: number } };
    /** How far the view sinks from Lucifer to his legs */
    dive: number;
  } | null;
}

/** How much larger Lucifer's legs are in the cavern than he is on the map of Hell */
const CLOSE_UP = 3.2;
/** Where his legs are in the picture of the cavern, as a share of its height: their middle, and how far below it the picture ends */
const LEGS = { middle: 0.812, toFoot: 0.188 };
/** Under the ice the cavern is seen from closer, so it fills more of the view; it draws back as the view rolls over */
const NEAR = 1.45;
/** How much closer still the view presses in halfway through the roll, so the turning picture fills it */
const ROLL_IN = 1.3;
/** The turn's three moves, as shares of its scroll: closing in, sinking under the ice, rolling over */
const MOVES = { zoom: 0.3, dive: 0.62 };
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

    const t = m.across ? clamp((p - m.down) / m.across, 0, 1) : 1;
    const hell = descentLeg.current;
    const rest = climbLeg.current;
    if (!hell || !rest) return;
    const show = (leg: HTMLElement, opacity: number, transform: string) => {
      leg.style.opacity = String(opacity);
      leg.style.visibility = opacity === 0 ? 'hidden' : 'visible';
      leg.style.transform = transform;
    };
    const closeup = hell.querySelector<SVGImageElement>('[data-closeup]');

    if (!m.turn) {
      // No room to act the turn out: Hell gives way to the cavern
      const shown = ease(clamp((t - 0.2) / 0.6, 0, 1));
      show(hell, 1 - shown, '');
      show(rest, shown, '');
      if (closeup) closeup.style.opacity = '0';
    } else {
      // The turn at the center of the earth, in three moves. The view closes in on Lucifer. It sinks
      // through the ice, and under it his legs hang down: the cavern, upside down, as it is seen
      // from Hell. Then the view rolls over about his legs, as Virgil does, and down becomes up.
      const { lucifer, legs, dive } = m.turn;
      const zoom = ease(clamp(t / MOVES.zoom, 0, 1));
      const sink = ease(clamp((t - MOVES.zoom) / (MOVES.dive - MOVES.zoom), 0, 1));
      const roll = ease(clamp((t - MOVES.dive) / (1 - MOVES.dive), 0, 1));
      const scale = 1 + (CLOSE_UP - 1) * zoom;
      const about = (point: { x: number; y: number }, what: string) =>
        `translate(${point.x}px, ${point.y}px) ${what} translate(${-point.x}px, ${-point.y}px)`;
      show(
        hell,
        1 - ease(clamp((roll - 0.05) / 0.5, 0, 1)),
        t === 0 || t === 1 ? '' : `${about(legs, `rotate(${180 * roll}deg)`)} translateY(${-dive * sink}px) ${about(lucifer, `scale(${scale})`)}`
      );
      show(rest, t <= MOVES.zoom ? 0 : 1, t === 0 || t === 1 ? '' : `translateY(${dive * (1 - sink)}px) ${about(legs.inClimb, `rotate(${180 + 180 * roll}deg) scale(${NEAR - (NEAR - 1) * roll + ROLL_IN * Math.sin(Math.PI * roll)})`)}`);
      // A sharper picture of Lucifer comes in over the map as the view closes in on him
      if (closeup) closeup.style.opacity = String(ease(clamp(zoom / 0.6, 0, 1)));
    }
    // The words beside the pictures step aside while the view turns
    world.current.toggleAttribute('data-turning', !!m.turn && t > 0.04 && t < 0.97);
    const paradiso = stopAt('paradiso');
    setCurrent(p < m.down + m.across / 2 ? 'inferno' : p < paradiso - m.view / 3 ? 'purgatorio' : 'paradiso');
  }, [progress, stopAt]);

  const measure = useCallback(() => {
    if (!outer.current || !stage.current || !descentLeg.current || !climbLeg.current) return;
    const hellLeg = descentLeg.current;
    const climbing = climbLeg.current;
    const view = stage.current.clientHeight;
    const hell = hellLeg.offsetHeight;
    const rest = climbing.offsetHeight;
    const wide = window.matchMedia('(min-width: 1280px)').matches;

    // Where things are on each leg, measured with the legs at rest
    hellLeg.style.transform = '';
    climbing.style.transform = '';
    const within = (leg: HTMLElement, el: Element) => {
      const frame = leg.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      return { left: box.left - frame.left, top: box.top - frame.top, width: box.width, height: box.height };
    };
    const luciferEl = hellLeg.querySelector('a[href="#circle-9"] polygon');
    const mapEl = hellLeg.querySelector('nav svg');
    const cavernEl = climbing.querySelector('#way-out img');
    let turn: Measures['turn'] = null;
    if (wide && luciferEl && mapEl && cavernEl) {
      const l = within(hellLeg, luciferEl);
      const map = within(hellLeg, mapEl);
      const cavern = within(climbing, cavernEl);
      const lucifer = { x: l.left + l.width / 2, y: l.top + l.height / 2 };
      const inClimb = { x: cavern.left + cavern.width / 2, y: cavern.top + cavern.height * LEGS.middle };
      // The climb lies over Hell with its foot level with Hell's
      const legs = { x: inClimb.x, y: inClimb.y + hell - rest, inClimb };
      // Seen from Hell the cavern hangs upside down from the foot of the map: its floor of ice at the
      // top. The view sinks until the legs' middle is where it will be once the view has rolled over.
      const footOfMap = lucifer.y + CLOSE_UP * (map.top + map.height - lucifer.y);
      const iceOverhead = legs.y - cavern.height * LEGS.toFoot * NEAR;
      turn = { lucifer, legs, dive: footOfMap - iceOverhead };
    }
    measures.current = {
      view,
      down: Math.max(0, hell - view),
      across: Math.round(view * (turn ? 2.2 : 0.9)),
      up: Math.max(0, rest - view),
      turn,
    };
    const m = measures.current;
    outer.current.style.height = `${m.down + m.across + m.up + view}px`;
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

        <div
          ref={world}
          className="relative will-change-transform [&_[data-turn-text]]:transition-opacity [&_[data-turn-text]]:duration-300 [&_ol]:transition-opacity [&_ol]:duration-300 [&[data-turning]_[data-turn-text]]:opacity-0 [&[data-turning]_ol]:opacity-0"
          onClick={onClick}
          onFocus={onFocus}
        >
          <div ref={descentLeg} className="origin-top-left">{descent}</div>
          <div ref={climbLeg} className="absolute bottom-0 left-0 w-full origin-top-left">
            {climb}
          </div>
        </div>
      </div>
    </div>
  );
}
