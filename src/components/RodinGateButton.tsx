'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

const IMAGE = '/images/gate-of-hell-rodin.webp';
// Where the two door panels sit in the drawing, as fractions of its width and height
const DOORS = { left: 0.2406, seam: 0.4939, right: 0.7472, top: 0.417, bottom: 0.996 };
// What lies behind the doors: darkness, with a little ember light low down
const BEYOND = 'radial-gradient(ellipse 90% 60% at 50% 100%, #4a1a1d 0%, #1f0e10 55%, #0d0708 100%)';
const EASE = 'cubic-bezier(0.45, 0, 0.2, 1)';

/** One door panel: the same drawing, shown only where that panel is, hinged on its outer edge */
function Door({ side }: { side: 'left' | 'right' }) {
  const from = side === 'left' ? DOORS.left : DOORS.seam;
  const width = (side === 'left' ? DOORS.seam : DOORS.right) - from;
  const height = DOORS.bottom - DOORS.top;
  return (
    <span
      aria-hidden
      data-door={side}
      className="absolute"
      style={{
        left: `${from * 100}%`,
        top: `${DOORS.top * 100}%`,
        width: `${width * 100}%`,
        height: `${height * 100}%`,
        backgroundImage: `url(${IMAGE})`,
        backgroundSize: `${100 / width}% ${100 / height}%`,
        backgroundPosition: `${(from / (1 - width)) * 100}% ${(DOORS.top / (1 - height)) * 100}%`,
        transformOrigin: side,
      }}
    />
  );
}

/**
 * Kept as an alternative to GateButton, which the home page uses now.
 * If it is used again, the footer must credit the photograph the drawing derives from:
 * Jean-Pierre Dalbéra, CC BY 2.0, Wikimedia Commons file 36730465084.
 *
 * Walks the visitor through the gate. A copy of the gate is laid over the page; the page behind it dims,
 * the doors swing slowly open on the dark, and the view moves forward through the doorway until the dark
 * fills the screen. The next page then comes up out of it.
 * The copy is added to the document directly so that it outlives the change of page.
 */
function walkThrough(gate: HTMLElement, arrive: () => void, hasArrived: () => boolean) {
  const at = gate.getBoundingClientRect();
  const ground = getComputedStyle(document.body).backgroundColor;

  const veil = document.createElement('div');
  const dim = document.createElement('div');
  const cover = document.createElement('div');
  const copy = gate.cloneNode(true) as HTMLElement;
  Object.assign(veil.style, { position: 'fixed', inset: '0', zIndex: '100', overflow: 'hidden' });
  Object.assign(dim.style, { position: 'absolute', inset: '0', background: ground, opacity: '0' });
  Object.assign(cover.style, { position: 'absolute', inset: '0', background: ground, opacity: '0' });
  Object.assign(copy.style, { position: 'absolute', left: `${at.left}px`, top: `${at.top}px`, width: `${at.width}px`, margin: '0' });
  veil.append(dim, copy, cover);
  document.body.append(veil);
  gate.style.visibility = 'hidden';

  const doorway = copy.querySelector<HTMLElement>('[data-doorway]')!;
  doorway.style.opacity = '1';
  // The doors turn away from the light as they open, so they darken
  for (const door of copy.querySelectorAll<HTMLElement>('[data-door]')) {
    const turn = door.dataset.door === 'left' ? 72 : -72;
    door.animate(
      [
        { transform: 'rotateY(0deg)', filter: 'brightness(1)' },
        { transform: `rotateY(${turn}deg)`, filter: 'brightness(0.35)' },
      ],
      { duration: 1700, easing: EASE, fill: 'forwards' },
    );
  }
  // The rest of the page falls away
  dim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1100, delay: 200, easing: 'ease-in-out', fill: 'forwards' });

  // Move forward until the doorway is wider and taller than the screen
  const door = { x: (DOORS.left + DOORS.right) / 2, y: (DOORS.top + DOORS.bottom) / 2, w: DOORS.right - DOORS.left, h: DOORS.bottom - DOORS.top };
  const scale = 1.25 * Math.max(window.innerWidth / (at.width * door.w), window.innerHeight / (at.height * door.h));
  const dx = window.innerWidth / 2 - (at.left + at.width * door.x);
  const dy = window.innerHeight / 2 - (at.top + at.height * door.y);
  copy.style.transformOrigin = `${door.x * 100}% ${door.y * 100}%`;
  const forward = copy.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(${scale})` }], {
    duration: 2200,
    delay: 700,
    easing: 'cubic-bezier(0.7, 0, 0.6, 1)',
    fill: 'forwards',
  });
  // By the time we are through, the dark has become the colour of the page
  cover.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 2000, easing: 'ease-in-out', fill: 'forwards' });

  forward.finished.then(() => {
    arrive();
    const started = Date.now();
    const lift = () => {
      // Wait for the next page, but never leave the veil up if it fails to come
      if (!hasArrived() && Date.now() - started < 4000) return void window.setTimeout(lift, 40);
      veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1200, easing: 'ease-in-out', fill: 'forwards' }).finished.then(() => {
        veil.remove();
        gate.style.visibility = '';
      });
    };
    window.setTimeout(lift, 120);
  });
}

/** The home page's way in: Rodin's Gates of Hell, drawn as an engraving. Clicking it walks you through. */
export default function RodinGateButton({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  const gate = useRef<HTMLSpanElement>(null);
  const leaving = useRef(false);

  const enter = (event: React.MouseEvent) => {
    // New-tab clicks, and people who asked for less motion, go straight there
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !gate.current) return;
    event.preventDefault();
    if (leaving.current) return;
    leaving.current = true;
    router.prefetch(href);
    walkThrough(
      gate.current,
      () => {
        leaving.current = false;
        router.push(href);
      },
      () => window.location.pathname.replace(/\/$/, '') === href,
    );
  };

  return (
    <Link
      href={href}
      onClick={enter}
      className="group inline-block rounded-sm text-center focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-primary"
    >
      <span ref={gate} className="relative block w-44 md:w-48" style={{ perspective: '900px' }}>
        <img src={IMAGE} width={640} height={932} alt="The Gates of Hell, after Auguste Rodin" className="gate-image block w-full" />
        <span
          aria-hidden
          data-doorway
          className="absolute"
          style={{
            left: `${DOORS.left * 100}%`,
            top: `${DOORS.top * 100}%`,
            width: `${(DOORS.right - DOORS.left) * 100}%`,
            height: `${(DOORS.bottom - DOORS.top) * 100}%`,
            background: BEYOND,
            opacity: 0,
          }}
        />
        <Door side="left" />
        <Door side="right" />
      </span>
      <span className="mt-3 block font-serif text-2xl italic text-foreground underline decoration-transparent underline-offset-[6px] transition-colors duration-300 group-hover:text-primary group-hover:decoration-primary/50">
        {children}
      </span>
    </Link>
  );
}
