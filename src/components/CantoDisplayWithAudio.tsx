'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { Canto } from '@/lib/cantos';
import { getImageSrc, getImagesForCanto, titleCase, type ImageData } from '@/lib/image-mappings';
import { lightboxFocus } from '@/lib/lightbox-focus';
import type { AudioTimingData } from '@/types/audio';
import AudioPlayerWordLevel from './AudioPlayerWordLevel';
import { TextWithWordHighlighting } from './TextWithWordHighlighting';
import { alignNarration, tokenizeStanzas, type TokenizedLine } from '@/lib/narration-alignment';
import { useNarrationHighlight } from '@/lib/useNarrationHighlight';

interface CantoDisplayProps {
  canto: Canto;
  canticaName: string;
  cantica: string;
}

type ContentBlock =
  | { type: 'text'; content: string[]; lines: TokenizedLine[]; startLine: number; endLine: number }
  | { type: 'image'; data: ImageData };

// Lightbox Modal Component (same as before)
function ImageLightbox({
  image,
  cantica,
  onClose
}: {
  image: ImageData;
  cantica: string;
  onClose: () => void;
}) {
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
          <Image
            src={getImageSrc(cantica, image.filename)}
            alt={titleCase(image.title)}
            width={1200}
            height={1600}
            className="w-auto h-auto max-w-full max-h-[70vh] lg:max-h-[85vh] object-contain rounded-lg shadow-2xl"
            priority
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
              {image.lines.includes('–') || image.lines.includes('-') || image.lines.includes(',') ? 'Lines' : 'Line'} {image.lines}
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
  cantica,
  onClick
}: {
  image: ImageData;
  cantica: string;
  onClick: () => void;
}) {
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
        <Image
          src={getImageSrc(cantica, image.filename)}
          alt={titleCase(image.title)}
          width={800}
          height={1067}
          className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-[1.02]"
          sizes="(max-width: 768px) 100vw, 672px"
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

export default function CantoDisplay({ canto, canticaName, cantica }: CantoDisplayProps) {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [timingData, setTimingData] = useState<AudioTimingData | null>(null);
  const [isActiveWordVisible, setIsActiveWordVisible] = useState(true);
  const [scrollToNarration, setScrollToNarration] = useState<(() => void) | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const narrationRef = useRef<HTMLDivElement>(null);

  const images = getImagesForCanto(cantica, canto.number);

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

  // Handle visibility changes from the text highlighting component
  const handleActiveWordVisibilityChange = useCallback((isVisible: boolean, scrollFn: () => void) => {
    setIsActiveWordVisible(isVisible);
    setScrollToNarration(() => scrollFn);
  }, []);

  const handleImageClick = useCallback((image: ImageData) => {
    setSelectedImage(image);
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

  // Match each spoken word to its word in the displayed text
  const timedTokens = useMemo(() => {
    if (!timingData) return [];
    const stanzas = modernContent.flatMap(b => (b.type === 'text' ? [b.lines] : []));
    return alignNarration(stanzas, timingData);
  }, [modernContent, timingData]);

  useNarrationHighlight(narrationRef, audioElement, timedTokens, handleActiveWordVisibilityChange);


  return (
    <>
      {selectedImage && (
        <ImageLightbox
          image={selectedImage}
          cantica={cantica}
          onClose={handleCloseLightbox}
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
        </div>

        {/* Main Content */}
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
          <div
            ref={narrationRef}
            className={`space-y-8${timedTokens.length ? ' has-narration' : ''}`}
            style={{ '--poem-measure': poemMeasure } as React.CSSProperties}
          >

            {modernContent.map((block, idx) => {
              if (block.type === 'image') {
                return (
                  <InlineImage
                    key={`img-${idx}`}
                    image={block.data}
                    cantica={cantica}
                    onClick={() => handleImageClick(block.data)}
                  />
                );
              }

              return (
                <div
                  key={`stanza-${idx}`}
                  className="poetry mx-auto w-full max-w-[min(100%,var(--poem-measure))] text-lg md:text-xl leading-relaxed text-foreground/90"
                >
                  <TextWithWordHighlighting lines={block.lines} />
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
        onAudioElement={setAudioElement}
        isNarrationVisible={isActiveWordVisible}
        onScrollToNarration={scrollToNarration}
      />
    </>
  );
}
