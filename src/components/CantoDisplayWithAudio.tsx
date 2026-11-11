'use client';

import { Fragment, useState, useMemo, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import type { Cantica } from '@/lib/canticas';
import type { Canto } from '@/lib/cantos';
import { getInfernoLevelsForCanto, infernoLevelLabel } from '@/lib/inferno-map';
import { getImagesForCanto, getPlateImage, titleCase, type ImageData } from '@/lib/image-mappings';
import { lightboxFocus } from '@/lib/lightbox-focus';
import type { AudioTimingData } from '@/types/audio';
import AudioPlayerWordLevel, { type NarrationControls } from './AudioPlayerWordLevel';
import NoteCard, { type OpenNote } from './NoteCard';
import NotesToggle from './NotesToggle';
import { TextWithWordHighlighting } from './TextWithWordHighlighting';
import type { CantoNotes, NotePlate } from '@/lib/annotations';
import { alignNarration, findTokenAt, timeForToken, tokenizeStanzas, type TokenizedLine } from '@/lib/narration-alignment';
import { placeNotes } from '@/lib/note-anchors';
import { getNotesOn, setNotesOn, subscribeToNotes } from '@/lib/notes-preference';
import { useNarrationHighlight, type FollowState } from '@/lib/useNarrationHighlight';

interface CantoDisplayProps {
  canto: Canto;
  canticaName: string;
  cantica: Cantica;
  /** The canto's notes, or null for a canto without them */
  notes: CantoNotes | null;
}

// A note's card opens when the pointer rests on its phrase this long, and closes this long after it
// leaves. The card sits beside the poem, so closing waits long enough for the pointer to cross to it.
const NOTE_OPEN_DELAY = 150;
const NOTE_CLOSE_DELAY = 500;
const NOTE_CARD_ID = 'note-card';

// Touch screens get a note as a sheet from the bottom of the screen, since nothing can hover
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

const noteAt = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>('[data-note]') : null);

type ContentBlock =
  | { type: 'text'; content: string[]; lines: TokenizedLine[]; startLine: number; endLine: number }
  | { type: 'image'; data: ImageData };

// Lightbox Modal Component (same as before)
function ImageLightbox({
  image,
  where,
  onClose
}: {
  image: ImageData;
  /** The canto the plate illustrates, such as "Paradiso XXI", when it isn't the one being read */
  where?: string;
  onClose: () => void;
}) {
  const picture = getPlateImage(image.imageNumber);
  const several = image.lines.includes('–') || image.lines.includes('-') || image.lines.includes(',');
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      ref={lightboxFocus}
      role="dialog"
      aria-modal="true"
      aria-label={titleCase(image.title)}
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 animate-lightbox-in outline-none"
      onClick={onClose}
    >
      {/* Above the audio player (z-50), and opaque so the page's copy of the plate doesn't show through */}
      <div className="absolute inset-0 bg-black" />

      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all duration-200 group"
        aria-label="Close"
      >
        <svg className="w-6 h-6 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div
        className="relative z-10 flex flex-col lg:flex-row items-center gap-6 lg:gap-12 max-w-7xl w-full max-h-[90vh] animate-lightbox-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex-shrink-0 w-full lg:w-auto lg:max-w-[60%] max-h-[70vh] lg:max-h-[85vh]">
          <img
            src={picture.src}
            alt={titleCase(image.title)}
            width={picture.width}
            height={picture.height}
            className="w-auto h-auto max-w-full max-h-[70vh] lg:max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
        </div>

        <div className="flex-1 max-w-lg text-center lg:text-left px-4 lg:px-0">
          <div className="space-y-6">
            <h3 className="text-2xl md:text-3xl font-light text-white tracking-tight">
              {titleCase(image.title)}
            </h3>
            <div className="w-16 h-px bg-gradient-to-r from-rose-400/60 to-transparent mx-auto lg:mx-0" />
            <blockquote className="text-lg md:text-xl font-serif italic text-white/80 leading-relaxed">
              &ldquo;{image.quote}&rdquo;
            </blockquote>
            <p className="text-sm text-white/60">
              {where ? `${where}, ${several ? 'lines' : 'line'}` : several ? 'Lines' : 'Line'} {image.lines}
            </p>
            <p className="text-sm text-white/50">
              Engraving by Gustave Doré, colorized for this site
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline Image Component
function InlineImage({
  image,
  onClick
}: {
  image: ImageData;
  onClick: () => void;
}) {
  const picture = getPlateImage(image.imageNumber);
  return (
    <figure
      className="group cursor-pointer transition-all duration-300 my-12 md:my-16 mx-auto max-w-2xl"
      onClick={onClick}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`View larger: ${titleCase(image.title)}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className="relative overflow-hidden rounded-xl shadow-xl group-hover:shadow-2xl transition-shadow duration-300 bg-muted/10 ring-1 ring-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <img
          src={picture.src}
          srcSet={picture.srcSet}
          sizes="(max-width: 768px) 100vw, 672px"
          alt={titleCase(image.title)}
          width={picture.width}
          height={picture.height}
          loading="lazy"
          className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-[1.02]"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
          <span className="text-white text-sm font-medium flex items-center gap-2 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            View larger
          </span>
        </div>
      </div>

      <figcaption className="mt-4 space-y-2 text-center">
        <p className="text-base text-foreground/80">
          {titleCase(image.title)}
        </p>
        <p className="text-sm font-serif italic text-muted-foreground leading-relaxed">
          &ldquo;{image.quote}&rdquo;
        </p>
      </figcaption>
    </figure>
  );
}

export default function CantoDisplay({ canto, canticaName, cantica, notes }: CantoDisplayProps) {
  const [selectedImage, setSelectedImage] = useState<{ image: ImageData; where?: string } | null>(null);
  const [timingData, setTimingData] = useState<AudioTimingData | null>(null);
  const [follow, setFollow] = useState<FollowState | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const narrationRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<NarrationControls>(null);
  const notesOn = useSyncExternalStore(subscribeToNotes, getNotesOn, () => false) && !!notes;
  const [openNote, setOpenNote] = useState<OpenNote | null>(null);
  const noteTimer = useRef<number | undefined>(undefined);

  const images = getImagesForCanto(cantica, canto.number);
  // Where an Inferno canto is in Hell, linked to the map
  const mapLevels = cantica === 'inferno' ? getInfernoLevelsForCanto(canto.number) : [];

  // Load this canto's word-level timing data. A canto without a file has no audio.
  useEffect(() => {
    async function loadTimingData() {
      try {
        const response = await fetch(`/audio-timings/${cantica}/${canto.number}.json`);
        setTimingData(response.ok ? ((await response.json()) as AudioTimingData) : null);
      } catch (error) {
        console.error('Failed to load word timing data:', error);
      }
    }
    loadTimingData();
  }, [cantica, canto.number]);

  const handleImageClick = useCallback((image: ImageData) => {
    setSelectedImage({ image });
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setSelectedImage(null);
  }, []);

  // Split the text into stanzas and place each illustration after the stanza holding its last line
  const modernContent = useMemo(() => {
    if (!canto.modern) return [];

    const stanzas = canto.modern
      .split(/\n\s*\n/)
      .map(stanza => stanza.split('\n').map(l => l.trim()).filter(l => l))
      .filter(lines => lines.length > 0);
    const totalLines = stanzas.reduce((sum, lines) => sum + lines.length, 0);

    const blocks: ContentBlock[] = [];
    let currentLine = 1;

    stanzas.forEach((lines) => {
      const startLine = currentLine;
      const endLine = currentLine + lines.length - 1;

      blocks.push({ type: 'text', content: lines, lines: [], startLine, endLine });

      // Check for images
      const relevantImages = images.filter(img => {
        const linesStr = img.lines;
        let imgEnd: number;

        if (linesStr.includes('–')) {
          const parts = linesStr.split('–').map(s => parseInt(s.trim(), 10));
          imgEnd = parts[1] ?? parts[0];
        } else if (linesStr.includes(',')) {
          const parts = linesStr.split(',').map(s => parseInt(s.trim(), 10));
          imgEnd = parts[parts.length - 1];
        } else {
          imgEnd = parseInt(linesStr.trim(), 10);
        }

        // A line number past the end of the text would otherwise drop the image entirely
        imgEnd = Math.min(imgEnd, totalLines);
        return imgEnd >= startLine && imgEnd <= endLine;
      });

      relevantImages.forEach(img => {
        blocks.push({ type: 'image', data: img });
      });

      currentLine += lines.length;
    });

    const textBlocks = blocks.filter(b => b.type === 'text');
    tokenizeStanzas(textBlocks.map(b => b.content)).forEach((lines, i) => {
      textBlocks[i].lines = lines;
    });

    return blocks;
  }, [canto.modern, images]);

  // The poem's column is as wide as its longest line and centered, so it sits under the centered title
  const poemMeasure = useMemo(() => {
    const lengths = modernContent.flatMap(b => (b.type === 'text' ? b.content.map(line => line.length) : []));
    return `${Math.max(0, ...lengths)}ch`;
  }, [modernContent]);

  // Where each note sits in the text, while the notes are on
  const noteMarks = useMemo(() => {
    if (!notes || !notesOn) return null;
    const lines = modernContent.flatMap(b => (b.type === 'text' ? b.lines.map(l => l.tokens.map(t => t.text)) : []));
    return placeNotes(lines, notes.notes);
  }, [notes, notesOn, modernContent]);

  const changeNotesOn = useCallback((on: boolean) => {
    setOpenNote(null);
    setNotesOn(on);
  }, []);

  // The open note's glossary entry, and its picture: the note's own, or else its entry's
  const openNoteData = openNote ? notes?.notes[openNote.index] : undefined;
  const openEntity = openNoteData?.entity ? notes?.entities[openNoteData.entity] : undefined;
  const pictured = openNoteData?.plate || openNoteData?.art ? openNoteData : openEntity;
  const openPlate = pictured?.plate ? notes?.plates[pictured.plate] : undefined;
  const openArt = pictured?.art ? notes?.art[pictured.art] : undefined;

  // A note's plate opens full screen in place of the note
  const viewPlate = useCallback((plate: NotePlate) => {
    window.clearTimeout(noteTimer.current);
    setOpenNote(null);
    setSelectedImage({ image: plate.image, where: plate.href ? plate.label : undefined });
  }, []);

  const closeNote = useCallback(() => {
    window.clearTimeout(noteTimer.current);
    setOpenNote(null);
  }, []);

  // Clicking or tapping a phrase pins its note open, and clicking it again closes it
  const pinNote = useCallback((el: HTMLElement) => {
    window.clearTimeout(noteTimer.current);
    const index = Number(el.dataset.note);
    setOpenNote(current =>
      current?.index === index && current.mode === 'pinned'
        ? null
        : { index, anchor: el, mode: 'pinned', sheet: !window.matchMedia(HOVER_QUERY).matches }
    );
  }, []);

  // Resting the mouse on a phrase previews its note. Moving straight to another phrase swaps it at once.
  const handleNotePointerOver = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const el = noteAt(e.target);
    if (!el) return;
    window.clearTimeout(noteTimer.current);
    const index = Number(el.dataset.note);
    if (openNote?.index === index || openNote?.sheet) return;
    noteTimer.current = window.setTimeout(
      () => setOpenNote({ index, anchor: el, mode: 'hover', sheet: false }),
      openNote ? 0 : NOTE_OPEN_DELAY
    );
  };

  const handleNotePointerOut = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const el = noteAt(e.target);
    if (!el || noteAt(e.relatedTarget)?.dataset.note === el.dataset.note) return;
    window.clearTimeout(noteTimer.current);
    if (openNote?.mode === 'hover') noteTimer.current = window.setTimeout(() => setOpenNote(null), NOTE_CLOSE_DELAY);
  };

  // Tabbing to a phrase previews its note, and Enter or Space pins it
  const handleNoteFocus = (e: React.FocusEvent) => {
    const el = noteAt(e.target);
    if (!el || !el.matches(':focus-visible')) return;
    window.clearTimeout(noteTimer.current);
    setOpenNote({ index: Number(el.dataset.note), anchor: el, mode: 'focus', sheet: false });
  };

  const handleNoteBlur = (e: React.FocusEvent) => {
    if (openNote?.mode === 'focus' && noteAt(e.target)) setOpenNote(null);
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = noteAt(e.target);
    if (!el || el !== e.target) return;
    // Also keeps Space from playing the narration
    e.preventDefault();
    pinNote(el);
  };

  // Light up every piece of the open note's phrase, and point the phrase at its card
  useEffect(() => {
    const root = narrationRef.current;
    if (!root || !openNote) return;
    const pieces = root.querySelectorAll<HTMLElement>(`[data-note="${openNote.index}"]`);
    const first = root.querySelector<HTMLElement>(`[data-note="${openNote.index}"][tabindex]`);
    pieces.forEach(p => p.classList.add('is-open'));
    first?.setAttribute('aria-describedby', NOTE_CARD_ID);
    return () => {
      pieces.forEach(p => p.classList.remove('is-open'));
      first?.removeAttribute('aria-describedby');
    };
  }, [openNote, noteMarks]);

  useEffect(() => () => window.clearTimeout(noteTimer.current), []);

  // The A key turns the annotations on and off
  useEffect(() => {
    if (!notes) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'a' || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
      e.preventDefault();
      changeNotesOn(!getNotesOn());
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [notes, changeNotesOn]);

  // Match each spoken word to its word in the displayed text
  const timedTokens = useMemo(() => {
    if (!timingData) return [];
    const stanzas = modernContent.flatMap(b => (b.type === 'text' ? [b.lines] : []));
    return alignNarration(stanzas, timingData);
  }, [modernContent, timingData]);

  useNarrationHighlight(narrationRef, audioElement, timedTokens, setFollow);

  // Each displayed line's text, by its index across the whole canto
  const lineTexts = useMemo(
    () => modernContent.flatMap(b => (b.type === 'text' ? b.content : [])),
    [modernContent]
  );

  const lineAt = useCallback((time: number) => {
    const index = findTokenAt(timedTokens, time);
    return index >= 0 ? lineTexts[timedTokens[index].line] ?? null : null;
  }, [timedTokens, lineTexts]);

  // Clicking a word plays the narration from that word, and clicking a noted phrase opens its note.
  // Selecting text to copy it does neither.
  const handleNarrationClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (window.getSelection()?.toString()) return;
    const noteEl = noteAt(e.target);
    if (noteEl) {
      pinNote(noteEl);
      return;
    }
    if (timedTokens.length === 0) return;
    const target = e.target as HTMLElement;
    const lineEl = target.closest<HTMLElement>('[data-line]');
    if (!lineEl) return;
    // A click between words starts the line from its first word
    const wordEl = target.closest<HTMLElement>('[data-token]') ?? lineEl.querySelector<HTMLElement>('[data-token]');
    if (!wordEl) return;
    const time = timeForToken(timedTokens, Number(wordEl.dataset.token), Number(lineEl.dataset.line));
    if (time !== null) controlsRef.current?.playFrom(time);
  }, [timedTokens, pinNote]);

  // The canto's first plate, or the site's icon of Dante for a canto without one
  const artwork = images[0] ? getPlateImage(images[0].imageNumber).small : '/apple-icon.png';


  return (
    <>
      {selectedImage && (
        <ImageLightbox
          image={selectedImage.image}
          where={selectedImage.where}
          onClose={handleCloseLightbox}
        />
      )}

      {openNote && notes?.notes[openNote.index] && (
        <NoteCard
          // A card and a sheet are different elements, so neither inherits the other's placement
          key={openNote.sheet ? 'sheet' : 'card'}
          id={NOTE_CARD_ID}
          note={notes.notes[openNote.index]}
          entity={openEntity}
          plate={openPlate}
          art={openArt}
          onViewPlate={viewPlate}
          open={openNote}
          onClose={closeNote}
          onPointerEnter={() => window.clearTimeout(noteTimer.current)}
          onPointerLeave={() => {
            if (openNote.mode === 'hover') noteTimer.current = window.setTimeout(() => setOpenNote(null), NOTE_CLOSE_DELAY);
          }}
        />
      )}

      <div className="min-h-screen bg-background transition-colors duration-500">
        {/* Hero Header */}
        <div className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto text-center">
          <span className="inline-block mb-3 text-lg italic text-primary">
            {canticaName}
          </span>
          
          {/* Previous and next cantos are in the bar under the menu, so the title can sit centered */}
          <h1 className="mb-6 text-3xl md:text-4xl lg:text-5xl font-light text-foreground tracking-tight">
            {canto.title}
          </h1>
          
          {canto.subtitle && (
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-serif italic leading-relaxed">
              {canto.subtitle}
            </p>
          )}

          {mapLevels.length > 0 && (
            <p className="mt-5 font-sans text-sm text-muted-foreground">
              On the map:{' '}
              {mapLevels.map((level, i) => (
                <Fragment key={level.id}>
                  {i > 0 && ', '}
                  <Link href={`/map#${level.id}`} className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary">
                    {infernoLevelLabel(level)}
                  </Link>
                </Fragment>
              ))}
            </p>
          )}

          {notes && notes.notes.length > 0 && (
            <div className="mt-8 flex justify-center">
              <NotesToggle on={notesOn} onChange={changeNotesOn} />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
          <div
            ref={narrationRef}
            className={`space-y-8${timedTokens.length ? ' has-narration' : ''}`}
            style={{ '--poem-measure': poemMeasure } as React.CSSProperties}
            onClick={handleNarrationClick}
            onPointerOver={noteMarks ? handleNotePointerOver : undefined}
            onPointerOut={noteMarks ? handleNotePointerOut : undefined}
            onFocus={noteMarks ? handleNoteFocus : undefined}
            onBlur={noteMarks ? handleNoteBlur : undefined}
            onKeyDown={noteMarks ? handleNoteKeyDown : undefined}
          >

            {modernContent.map((block, idx) => {
              if (block.type === 'image') {
                return (
                  <InlineImage
                    key={`img-${idx}`}
                    image={block.data}
                    onClick={() => handleImageClick(block.data)}
                  />
                );
              }

              return (
                <div
                  key={`stanza-${idx}`}
                  className="poetry mx-auto w-full max-w-[min(100%,var(--poem-measure))] text-lg md:text-xl leading-relaxed text-foreground/90"
                >
                  <TextWithWordHighlighting lines={block.lines} marks={noteMarks} />
                  <div className="text-[10px] text-muted-foreground/30 text-right select-none" aria-hidden="true">
                    {block.endLine}
                  </div>
                </div>
              );
            })}

            {!canto.modern && (
               <div className="text-center py-20 text-muted-foreground italic">
                 Modern translation coming soon...
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Audio Player */}
      <AudioPlayerWordLevel
        cantica={cantica}
        cantoNumber={canto.number}
        timingData={timingData}
        artwork={artwork}
        onAudioElement={setAudioElement}
        controlsRef={controlsRef}
        follow={follow}
        lineAt={lineAt}
      />
    </>
  );
}
