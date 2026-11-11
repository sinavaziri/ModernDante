'use client';

import Link from 'next/link';
import { Fragment, useEffect, useLayoutEffect, useRef } from 'react';
import type { Entity, Note, NoteArt, NotePlate } from '@/lib/annotations';
import { LAYOUT } from '@/lib/constants';

export interface OpenNote {
  /** The note's index in the canto's list of notes */
  index: number;
  /** The piece of the phrase the card points at */
  anchor: HTMLElement;
  /** A hover or focus card closes when the pointer or focus leaves. A pinned one waits to be closed. */
  mode: 'hover' | 'focus' | 'pinned';
  /** On a touch screen the card opens as a sheet from the bottom of the screen */
  sheet: boolean;
}

interface NoteCardProps {
  id: string;
  note: Note;
  entity?: Entity;
  /** A Doré plate for the top of the card */
  plate?: NotePlate;
  /** Or an artwork, for a figure Doré didn't draw */
  art?: NoteArt;
  open: OpenNote;
  onClose: () => void;
  /** Shows the plate full screen */
  onViewPlate: (plate: NotePlate) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

// Space between the phrase and the card, and the least space kept from the window's edges
/** How many other cantos a glossary card lists before it says "and N more" */
const ALSO_IN_LIMIT = 6;
const GAP = 10;
const MARGIN = 16;
// Beside the poem: how far the card sits from the end of the line, and how far above its phrase it starts
const SIDE_GAP = 24;
const SIDE_RISE = 14;

/**
 * A note's preview: beside the poem on a screen with a mouse (under or over its phrase when
 * the window is too narrow), and as a sheet from the bottom of the screen on a touch screen.
 */
export default function NoteCard({ id, note, entity, plate, art, open, onClose, onViewPlate, onPointerEnter, onPointerLeave }: NoteCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Beside the poem, level with its phrase, like a note in the margin, so it covers none of the
  // verse. On a narrower window it moves in over the ends of the lines, but never over its own
  // phrase; with no room for that it goes under the phrase, or over it. Kept there as the page
  // scrolls. A card too tall for its place scrolls.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || open.sheet) return;
    const place = () => {
      const phrase = open.anchor.getBoundingClientRect();
      const player = document.querySelector('[data-audio-player]');
      const top = LAYOUT.HEADER_HEIGHT;
      const bottom = window.innerHeight - (player?.getBoundingClientRect().height ?? 0);
      // The card's full height, even while its maximum height cuts it short
      const natural = card.scrollHeight;
      const width = card.offsetWidth;
      const line = open.anchor.closest('.narration-line')?.getBoundingClientRect();
      const furthestRight = window.innerWidth - MARGIN - width;
      const beside = Math.min((line?.right ?? phrase.right) + SIDE_GAP, furthestRight);
      let x: number;
      let y: number;
      if (beside >= phrase.right + GAP) {
        const room = Math.max(bottom - top - 2 * MARGIN, 120);
        card.style.maxHeight = `${room}px`;
        x = beside;
        // Level with the phrase, moved up only as far as it takes to fit above the player
        y = Math.max(Math.min(phrase.top - SIDE_RISE, bottom - MARGIN - Math.min(natural, room)), top + MARGIN);
      } else {
        const roomBelow = bottom - MARGIN - (phrase.bottom + GAP);
        const roomAbove = phrase.top - GAP - (top + MARGIN);
        const placeBelow = natural <= roomBelow || (natural > roomAbove && roomBelow >= roomAbove);
        const room = Math.max(placeBelow ? roomBelow : roomAbove, 120);
        card.style.maxHeight = `${room}px`;
        y = placeBelow ? phrase.bottom + GAP : phrase.top - GAP - Math.min(natural, room);
        x = Math.min(Math.max(phrase.left + phrase.width / 2 - width / 2, MARGIN), furthestRight);
      }
      card.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      // Hidden while its phrase is scrolled under the header or the player
      card.style.visibility = phrase.bottom < top || phrase.top > bottom ? 'hidden' : 'visible';
    };
    place();
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
    };
  }, [open.anchor, open.sheet, note]);

  // Escape closes the card. A pinned card also closes on a click anywhere but the card or a note.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target && (cardRef.current?.contains(target) || target.closest('[data-note]'))) return;
      onClose();
    };
    const closesOnClick = open.mode === 'pinned' && !open.sheet;
    document.addEventListener('keydown', onKeyDown);
    if (closesOnClick) document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (closesOnClick) document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open.mode, open.sheet, onClose]);

  // A sheet takes focus, so a screen reader announces it
  useEffect(() => {
    if (open.sheet) cardRef.current?.focus({ preventScroll: true });
  }, [open.sheet]);

  const title = entity ? entity.name : note.quote;

  // On a card the picture runs to the edges, like a Wikipedia preview's. On a sheet it sits inside the margins.
  const figureClass = open.sheet ? 'mb-4' : '-mt-3.5 -ml-3.5 -mr-9 mb-2.5';
  const frameClass = `block w-full overflow-hidden bg-black/30${open.sheet ? ' rounded-lg' : ''}`;
  const captionClass = `mt-1.5 text-[11px] text-note-muted${open.sheet ? '' : ' px-3.5'}`;
  // The sheet fills a phone's width, so its text stays a size up from the card's
  const textClass = open.sheet ? 'text-[15px] leading-[1.6]' : 'text-[13.5px] leading-[1.55]';
  const sizes = open.sheet ? '(max-width: 672px) 100vw, 672px' : '20rem';
  const linkClass = 'text-note-link underline underline-offset-2 decoration-note-link/50 hover:text-note-foreground hover:decoration-note-foreground';

  // A Doré plate opens full screen. Other art credits its artist and links to its page on Wikimedia Commons.
  const figure = plate ? (
    <figure className={figureClass}>
      <button
        type="button"
        onClick={() => onViewPlate(plate)}
        aria-label={`View larger: ${plate.title}`}
        className={`group ${frameClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-note-link`}
      >
        <img
          src={plate.src}
          srcSet={plate.srcSet}
          sizes={sizes}
          alt={plate.title}
          width={960}
          height={400}
          className="aspect-[12/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </button>
      <figcaption className={captionClass}>
        Doré, <span className="italic">{plate.title}</span>
        {' · '}
        {plate.href ? (
          <Link href={plate.href} className={linkClass}>
            {plate.label}
          </Link>
        ) : (
          plate.label
        )}
      </figcaption>
    </figure>
  ) : art ? (
    <figure className={figureClass}>
      <div className={frameClass}>
        <img
          src={art.src}
          srcSet={art.srcSet}
          sizes={sizes}
          alt={`${art.title}, by ${art.artist}`}
          width={960}
          height={400}
          className="aspect-[12/5] w-full object-cover"
        />
      </div>
      <figcaption className={captionClass}>
        {art.artist}, <span className="italic">{art.title}</span>, {art.date}
        {art.note && ` (${art.note})`}
        {' · '}
        <a href={art.source} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Wikimedia Commons
        </a>
      </figcaption>
    </figure>
  ) : null;

  const body = (
    <>
      {/* A plain note has no heading: its phrase is highlighted in the poem beside it */}
      {entity && (
        <>
          <h2 className="font-serif text-lg leading-snug text-note-foreground">{entity.name}</h2>
          <p className="text-xs text-note-muted">{entity.tagline}</p>
        </>
      )}
      <p className={`${textClass} text-note-foreground/90${entity ? ' mt-2' : ''}`}>
        {entity ? entity.summary : note.note}
      </p>
      {entity && note.context && (
        <p className={`mt-2.5 border-l-2 border-note-link/50 pl-2.5 ${textClass} text-note-foreground/90`}>
          {note.context}
        </p>
      )}
      {entity && entity.alsoIn.length > 0 && (
        <p className="mt-2.5 text-xs text-note-muted">
          Also in{' '}
          {/* Beatrice is in 34 cantos: the first few are enough for a card */}
          {entity.alsoIn.slice(0, ALSO_IN_LIMIT).map((c, i) => (
            <Fragment key={c.href}>
              {i > 0 && ', '}
              <Link href={c.href} className={linkClass}>
                {c.label}
              </Link>
            </Fragment>
          ))}
          {entity.alsoIn.length > ALSO_IN_LIMIT && ` and ${entity.alsoIn.length - ALSO_IN_LIMIT} more`}
        </p>
      )}
    </>
  );

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      className="absolute top-2 right-2 z-10 rounded-full bg-black/20 p-1.5 text-note-muted backdrop-blur-sm transition-colors hover:bg-black/25 hover:text-note-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-note-link"
      aria-label="Close note"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );

  if (open.sheet) {
    return (
      <>
        {/* Above the audio player (z-50) */}
        <div className="fixed inset-0 z-[60] bg-black/40 animate-note-fade" onClick={onClose} aria-hidden="true" />
        <div
          ref={cardRef}
          id={id}
          role="dialog"
          aria-label={title}
          tabIndex={-1}
          className="fixed inset-x-0 bottom-0 z-[61] mx-auto max-w-2xl max-h-[70vh] overflow-y-auto rounded-t-2xl bg-note font-sans text-note-foreground px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl outline-none animate-note-sheet"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-note-foreground/30" aria-hidden="true" />
          {closeButton}
          {figure}
          {/* Clear of the close button, which sits over the plate when there is one */}
          <div className={figure ? '' : 'pr-8'}>{body}</div>
        </div>
      </>
    );
  }

  return (
    <div
      ref={cardRef}
      id={id}
      role="dialog"
      aria-label={title}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={{ visibility: 'hidden' }}
      className="fixed top-0 left-0 z-[45] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain [scrollbar-width:thin] rounded-lg bg-note font-sans text-note-foreground p-3.5 pr-9 shadow-xl animate-note-fade"
    >
      {open.mode === 'pinned' && closeButton}
      {figure}
      {body}
    </div>
  );
}
