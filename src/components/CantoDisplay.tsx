'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import type { Canto } from '@/lib/cantos';
import { getImagesForCanto, type ImageData } from '@/lib/image-mappings';

interface CantoDisplayProps {
  canto: Canto;
  canticaName: string;
  cantica: string;
}

type ContentBlock = 
  | { type: 'text'; content: string[]; startLine: number; endLine: number }
  | { type: 'image'; data: ImageData };

// Lightbox Modal Component
function ImageLightbox({ 
  image, 
  cantica, 
  onClose 
}: { 
  image: ImageData; 
  cantica: string; 
  onClose: () => void;
}) {
  // Close on escape key
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
      
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all duration-200 group"
        aria-label="Close"
      >
        <svg className="w-6 h-6 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      {/* Content Container */}
      <div 
        className="relative z-10 flex flex-col lg:flex-row items-center gap-6 lg:gap-12 max-w-7xl w-full max-h-[90vh] animate-lightbox-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
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
        
        {/* Caption Panel */}
        <div className="flex-1 max-w-lg text-center lg:text-left px-4 lg:px-0">
          <div className="space-y-6">
            {/* Title */}
            <h3 className="text-2xl md:text-3xl font-light text-white tracking-tight">
              {image.title}
            </h3>
            
            {/* Decorative line */}
            <div className="w-16 h-px bg-gradient-to-r from-rose-400/60 to-transparent mx-auto lg:mx-0" />
            
            {/* Quote */}
            <blockquote className="text-lg md:text-xl font-serif italic text-white/80 leading-relaxed">
              "{image.quote}"
            </blockquote>
            
            {/* Line reference */}
            <p className="text-sm font-sans tracking-widest text-white/50 uppercase">
              Lines {image.lines}
            </p>
            
            {/* Hint */}
            <p className="text-xs text-white/30 mt-8">
              Press ESC or click outside to close
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Floating Image Thumbnail Component
function FloatingImage({ 
  image, 
  cantica, 
  onClick,
  position = 'right'
}: { 
  image: ImageData; 
  cantica: string; 
  onClick: () => void;
  position?: 'right' | 'inline';
}) {
  return (
    <figure 
      className={`group cursor-pointer transition-all duration-300 ${
        position === 'right' 
          ? 'float-right ml-8 mb-6 w-64 md:w-80 lg:w-96 clear-right' 
          : 'my-8 mx-auto max-w-lg'
      }`}
      onClick={onClick}
    >
      <div className="relative overflow-hidden rounded-lg shadow-lg group-hover:shadow-xl transition-shadow duration-300 bg-muted/20">
        <Image
          src={`/images/${cantica}/${image.filename}`}
          alt={image.title}
          width={400}
          height={533}
          className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 256px, (max-width: 1024px) 320px, 384px"
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
          <span className="text-white text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            View larger
          </span>
        </div>
      </div>
      
      {/* Compact caption */}
      <figcaption className="mt-3 space-y-1">
        <p className="text-xs font-sans tracking-wide text-muted-foreground/70 uppercase">
          {image.title}
        </p>
        <p className="text-xs font-serif italic text-muted-foreground/50 line-clamp-2">
          &ldquo;{image.quote}&rdquo;
        </p>
      </figcaption>
    </figure>
  );
}

export default function CantoDisplay({ canto, canticaName, cantica }: CantoDisplayProps) {
  const [isSplitView, setIsSplitView] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const images = getImagesForCanto(cantica, canto.number);

  const handleImageClick = useCallback((image: ImageData) => {
    setSelectedImage(image);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setSelectedImage(null);
  }, []);

  // Process text into stanzas and interleave images
  const modernContent = useMemo(() => {
    if (!canto.modern) return [];

    const blocks: ContentBlock[] = [];
    // Split by double newline to get stanzas
    const rawStanzas = canto.modern.split(/\n\s*\n/);
    
    let currentLine = 1;

    rawStanzas.forEach((stanza) => {
      // Split stanza into lines to count them
      const lines = stanza.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length === 0) return;

      const startLine = currentLine;
      const endLine = currentLine + lines.length - 1;

      // Add text block
      blocks.push({
        type: 'text',
        content: lines,
        startLine,
        endLine
      });

      // Check for images that should appear after this stanza
      // Logic: If an image's line range falls within or ends near this stanza
      // Parse formats: "1–3" (en-dash), "46, 47" (comma), or "136" (single)
      const relevantImages = images.filter(img => {
        const linesStr = img.lines;
        let imgStart: number;
        let imgEnd: number;
        
        if (linesStr.includes('–')) {
          // En-dash range: "1–3"
          const parts = linesStr.split('–').map(s => parseInt(s.trim(), 10));
          imgStart = parts[0];
          imgEnd = parts[1] ?? parts[0];
        } else if (linesStr.includes(',')) {
          // Comma-separated: "46, 47" - use first and last
          const parts = linesStr.split(',').map(s => parseInt(s.trim(), 10));
          imgStart = parts[0];
          imgEnd = parts[parts.length - 1];
        } else {
          // Single number: "136"
          imgStart = imgEnd = parseInt(linesStr.trim(), 10);
        }
        
        // precise placement: if image ends in this stanza
        return imgEnd >= startLine && imgEnd <= endLine;
      });

      relevantImages.forEach(img => {
        blocks.push({ type: 'image', data: img });
      });

      currentLine += lines.length;
    });

    return blocks;
  }, [canto.modern, images]);

  const originalContent = useMemo(() => {
    if (!canto.original) return [];

    const blocks: ContentBlock[] = [];
    // Split by double newline to get stanzas (matching modern processing)
    const rawStanzas = canto.original.split(/\n\s*\n/);

    let currentLine = 1;

    rawStanzas.forEach((stanza) => {
      // Split stanza into lines to count them
      const lines = stanza.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length === 0) return;

      const startLine = currentLine;
      const endLine = currentLine + lines.length - 1;

      // Add text block
      blocks.push({
        type: 'text',
        content: lines,
        startLine,
        endLine
      });

      currentLine += lines.length;
    });

    return blocks;
  }, [canto.original]);

  return (
    <>
      {/* Lightbox Modal */}
      {selectedImage && (
        <ImageLightbox 
          image={selectedImage} 
          cantica={cantica} 
          onClose={handleCloseLightbox} 
        />
      )}

      <div className="min-h-screen pb-24 bg-background transition-colors duration-500">
        {/* Hero Header */}
        <div className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto text-center">
          <span className="inline-block mb-4 text-sm font-bold tracking-[0.2em] uppercase text-primary">
            {canticaName}
          </span>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-light mb-6 text-foreground tracking-tight">
            {canto.title}
          </h1>
          {canto.subtitle && (
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-serif italic leading-relaxed">
              {canto.subtitle}
            </p>
          )}
        </div>

        {/* Controls Sticky Bar */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/40 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              {isSplitView ? 'Original Text Comparison' : 'Modern Reading View'}
            </div>
            
            <button
              onClick={() => setIsSplitView(!isSplitView)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors"
            >
              {isSplitView ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>Single View</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  <span>Split View</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className={`max-w-[1600px] mx-auto px-4 md:px-8 py-12 transition-all duration-500`}>
          <div className={`grid gap-12 ${isSplitView ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-3xl mx-auto'}`}>
            
            {/* Modern Translation (Left/Center) */}
            <div className="space-y-8">
              {modernContent.map((block, idx) => {
                if (block.type === 'image') {
                  return (
                    <FloatingImage
                      key={`img-${idx}`}
                      image={block.data}
                      cantica={cantica}
                      onClick={() => handleImageClick(block.data)}
                      position={isSplitView ? 'inline' : 'right'}
                    />
                  );
                }

                return (
                  <div key={`stanza-${idx}`} className="poetry text-lg md:text-xl leading-relaxed text-foreground/90">
                    {block.content.map((line, lineIdx) => (
                      <div key={lineIdx} className="mb-1">{line}</div>
                    ))}
                    {/* Line numbers for reference - optional/subtle */}
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

            {/* Original Translation (Right - Visible only in Split View) */}
            {isSplitView && (
              <div className="hidden lg:block space-y-8 border-l border-border/50 pl-12">
                <h3 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-8">
                  Original Text
                </h3>
                <div className="space-y-8">
                  {originalContent.map((block, idx) => {
                    if (block.type === 'text') {
                      return (
                        <div key={`orig-${idx}`} className="poetry text-base md:text-lg leading-relaxed text-muted-foreground font-serif opacity-80 hover:opacity-100 transition-opacity">
                          {block.content.map((line, lineIdx) => (
                            <div key={lineIdx} className="mb-1">{line}</div>
                          ))}
                          {/* Line numbers for reference */}
                          <div className="text-[10px] text-muted-foreground/30 text-right select-none" aria-hidden="true">
                            {block.endLine}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
