'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type Canto, type Cantica, getNextCanto, getPreviousCanto } from '@/lib/cantos';
import { getImagesForCanto, type ImageData } from '@/lib/image-mappings';
import type { AudioTimingData, AudioTimingsRoot } from '@/types/audio';
import AudioPlayerWordLevel from './AudioPlayerWordLevel';
import { TextWithWordHighlighting } from './TextWithWordHighlighting';

interface CantoDisplayProps {
  canto: Canto;
  canticaName: string;
  cantica: string;
}

type ContentBlock =
  | { type: 'text'; content: string[]; startLine: number; endLine: number; segmentId?: number }
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-lightbox-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

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
            src={`/images/${cantica}/${image.filename}`}
            alt={image.title}
            width={1200}
            height={1600}
            className="w-auto h-auto max-w-full max-h-[70vh] lg:max-h-[85vh] object-contain rounded-lg shadow-2xl"
            priority
          />
        </div>

        <div className="flex-1 max-w-lg text-center lg:text-left px-4 lg:px-0">
          <div className="space-y-6">
            <h3 className="text-2xl md:text-3xl font-light text-white tracking-tight">
              {image.title}
            </h3>
            <div className="w-16 h-px bg-gradient-to-r from-rose-400/60 to-transparent mx-auto lg:mx-0" />
            <blockquote className="text-lg md:text-xl font-serif italic text-white/80 leading-relaxed">
              "{image.quote}"
            </blockquote>
            <p className="text-sm font-sans tracking-widest text-white/50 uppercase">
              {image.lines.includes('–') || image.lines.includes('-') || image.lines.includes(',') ? 'Lines' : 'Line'} {image.lines}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Floating Image Component
function FloatingImage({
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
      className="group cursor-pointer transition-all duration-300 my-10 md:my-12 md:float-right md:ml-10 md:mb-8 w-full md:w-[50%] lg:w-[55%] clear-right"
      onClick={onClick}
    >
      <div className="relative overflow-hidden rounded-xl shadow-xl group-hover:shadow-2xl transition-shadow duration-300 bg-muted/10 ring-1 ring-border/50">
        <Image
          src={`/images/${cantica}/${image.filename}`}
          alt={image.title}
          width={600}
          height={800}
          className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-[1.02]"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 55vw"
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

      <figcaption className="mt-4 space-y-2 text-center md:text-left">
        <p className="text-sm font-sans tracking-wide text-muted-foreground/80 uppercase">
          {image.title}
        </p>
        <p className="text-sm font-serif italic text-muted-foreground/60 leading-relaxed">
          &ldquo;{image.quote}&rdquo;
        </p>
      </figcaption>
    </figure>
  );
}

export default function CantoDisplay({ canto, canticaName, cantica }: CantoDisplayProps) {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [timingData, setTimingData] = useState<AudioTimingData | null>(null);
  const [isActiveWordVisible, setIsActiveWordVisible] = useState(true);
  const [scrollToNarration, setScrollToNarration] = useState<(() => void) | null>(null);

  const images = getImagesForCanto(cantica, canto.number);
  const prevCanto = getPreviousCanto(cantica as Cantica, canto.number);
  const nextCanto = getNextCanto(cantica as Cantica, canto.number);

  // Load word-level timing data
  useEffect(() => {
    async function loadTimingData() {
      try {
        const response = await fetch('/audio-word-timings.json');
        const data: AudioTimingsRoot = await response.json();
        const cantoData = data[cantica]?.[canto.number];
        setTimingData(cantoData || null);
      } catch (error) {
        console.error('Failed to load word timing data:', error);
      }
    }
    loadTimingData();
  }, [cantica, canto.number]);

  // Create a merged segment with all words from all segments for highlighting
  const mergedSegment = useMemo(() => {
    if (!timingData?.segments?.length) return null;

    // Combine all words from all segments into one
    const allWords = timingData.segments.flatMap(seg => seg.words || []);
    const allText = timingData.segments.map(seg => seg.text).join('\n\n');

    return {
      id: 0,
      speaker: 'narrator',
      text: allText,
      startTime: timingData.segments[0].startTime,
      endTime: timingData.segments[timingData.segments.length - 1].endTime,
      duration: timingData.totalDuration,
      words: allWords,
    };
  }, [timingData]);

  // Update active segment based on current time
  useEffect(() => {
    if (!timingData) return;

    const segment = timingData.segments.find(
      (seg) => currentTime >= seg.startTime && currentTime < seg.endTime
    );

    const newSegmentId = segment?.id || null;
    if (newSegmentId !== activeSegmentId) {
      setActiveSegmentId(newSegmentId);
    }
  }, [currentTime, timingData, activeSegmentId]);

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

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // Map text to segments
  const modernContent = useMemo(() => {
    if (!canto.modern) return [];

    const blocks: ContentBlock[] = [];
    const rawStanzas = canto.modern.split(/\n\s*\n/);

    let currentLine = 1;
    let segmentIndex = 0;

    rawStanzas.forEach((stanza) => {
      const lines = stanza.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length === 0) return;

      const startLine = currentLine;
      const endLine = currentLine + lines.length - 1;

      // Try to match this text block with an audio segment
      let matchedSegmentId: number | undefined;
      if (timingData && segmentIndex < timingData.segments.length) {
        const segment = timingData.segments[segmentIndex];
        // Normalize both texts: replace newlines with spaces and trim
        const normalizeText = (t: string) => t.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 100);
        const stanzaText = normalizeText(lines.join(' '));
        const segmentText = normalizeText(segment.text);
        if (segmentText.includes(stanzaText.substring(0, 50)) || stanzaText.includes(segmentText.substring(0, 50))) {
          matchedSegmentId = segment.id;
          segmentIndex++;
        }
      }

      blocks.push({
        type: 'text',
        content: lines,
        startLine,
        endLine,
        segmentId: matchedSegmentId
      });

      // Check for images
      const relevantImages = images.filter(img => {
        const linesStr = img.lines;
        let imgStart: number;
        let imgEnd: number;

        if (linesStr.includes('–')) {
          const parts = linesStr.split('–').map(s => parseInt(s.trim(), 10));
          imgStart = parts[0];
          imgEnd = parts[1] ?? parts[0];
        } else if (linesStr.includes(',')) {
          const parts = linesStr.split(',').map(s => parseInt(s.trim(), 10));
          imgStart = parts[0];
          imgEnd = parts[parts.length - 1];
        } else {
          imgStart = imgEnd = parseInt(linesStr.trim(), 10);
        }

        return imgEnd >= startLine && imgEnd <= endLine;
      });

      relevantImages.forEach(img => {
        blocks.push({ type: 'image', data: img });
      });

      currentLine += lines.length;
    });

    return blocks;
  }, [canto.modern, images, timingData]);


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
          <span className="inline-block mb-4 text-sm font-bold tracking-[0.2em] uppercase text-primary">
            {canticaName}
          </span>
          
          {/* Title with Navigation Arrows */}
          <div className="flex items-center justify-center gap-4 md:gap-8 mb-6">
            {/* Previous Button */}
            {prevCanto ? (
              <Link
                href={`/${prevCanto.cantica}/${prevCanto.number}`}
                className="group flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 text-muted-foreground hover:text-foreground"
                aria-label="Previous canto"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            ) : (
              <div className="w-12 h-12 md:w-14 md:h-14" />
            )}
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-foreground tracking-tight">
              {canto.title}
            </h1>
            
            {/* Next Button */}
            {nextCanto ? (
              <Link
                href={`/${nextCanto.cantica}/${nextCanto.number}`}
                className="group flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 text-muted-foreground hover:text-foreground"
                aria-label="Next canto"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <div className="w-12 h-12 md:w-14 md:h-14" />
            )}
          </div>
          
          {canto.subtitle && (
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-serif italic leading-relaxed">
              {canto.subtitle}
            </p>
          )}
        </div>

        {/* Main Content */}
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
          <div className="space-y-8">

            {modernContent.map((block, idx) => {
              if (block.type === 'image') {
                return (
                  <FloatingImage
                    key={`img-${idx}`}
                    image={block.data}
                    cantica={cantica}
                    onClick={() => handleImageClick(block.data)}
                  />
                );
              }

              const textContent = block.content.join('\n');

              return (
                <div
                  key={`stanza-${idx}`}
                  className="poetry text-lg md:text-xl leading-relaxed text-foreground/90"
                >
                  <TextWithWordHighlighting
                    text={textContent}
                    segment={mergedSegment}
                    currentTime={currentTime}
                    isActive={true}
                    stanzaStartLine={block.startLine}
                    onActiveWordVisibilityChange={handleActiveWordVisibilityChange}
                  />
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
        onTimeUpdate={handleTimeUpdate}
        isNarrationVisible={isActiveWordVisible}
        onScrollToNarration={scrollToNarration}
      />
    </>
  );
}
