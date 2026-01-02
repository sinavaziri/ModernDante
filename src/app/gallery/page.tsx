'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import imageMappingsData from '@/data/image-mappings.json';

type Cantica = 'all' | 'inferno' | 'purgatorio' | 'paradiso';

interface ImageItem {
  imageNumber: number;
  title: string;
  quote: string;
  cantica: string;
  canto: number;
  lines: string;
  filename: string;
}

const canticaColors = {
  inferno: 'from-red-900/80 to-red-950/90',
  purgatorio: 'from-amber-800/80 to-amber-900/90',
  paradiso: 'from-sky-700/80 to-indigo-900/90',
};

const canticaLabels = {
  inferno: 'Inferno',
  purgatorio: 'Purgatorio',
  paradiso: 'Paradiso',
};

export default function GalleryPage() {
  const [activeFilter, setActiveFilter] = useState<Cantica>('all');
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});

  const images = useMemo(() => {
    return (imageMappingsData.images as ImageItem[]).filter(
      (img) => activeFilter === 'all' || img.cantica === activeFilter
    );
  }, [activeFilter]);

  const counts = useMemo(() => {
    const all = imageMappingsData.images as ImageItem[];
    return {
      all: all.length,
      inferno: all.filter((img) => img.cantica === 'inferno').length,
      purgatorio: all.filter((img) => img.cantica === 'purgatorio').length,
      paradiso: all.filter((img) => img.cantica === 'paradiso').length,
    };
  }, []);

  const handleImageLoad = (imageNumber: number) => {
    setImageLoaded((prev) => ({ ...prev, [imageNumber]: true }));
  };

  const navigateImage = useCallback((direction: 'prev' | 'next') => {
    if (!selectedImage) return;
    const currentIndex = images.findIndex((img) => img.imageNumber === selectedImage.imageNumber);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % images.length 
      : (currentIndex - 1 + images.length) % images.length;
    setSelectedImage(images[newIndex]);
  }, [selectedImage, images]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      
      if (e.key === 'Escape') {
        setSelectedImage(null);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        navigateImage('next');
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigateImage('prev');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, navigateImage]);

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="relative overflow-hidden pt-24 pb-16 border-b border-border">
          {/* Decorative background */}
          <div className="absolute inset-0 opacity-5">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
              Doré Gallery
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Browse all {counts.all} engravings by Gustave Doré, created for Dante's Divine Comedy between 1857–1868.
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-4 gap-2 overflow-x-auto">
              {(['all', 'inferno', 'purgatorio', 'paradiso'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 whitespace-nowrap ${
                    activeFilter === filter
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {filter === 'all' ? 'All Illustrations' : canticaLabels[filter]}
                  <span className={`ml-2 ${activeFilter === filter ? 'opacity-80' : 'opacity-60'}`}>
                    ({counts[filter]})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((image, index) => (
              <div
                key={image.imageNumber}
                className="group relative cursor-pointer"
                onClick={() => setSelectedImage(image)}
                style={{
                  animationDelay: `${Math.min(index * 50, 500)}ms`,
                }}
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-muted/30 border border-border hover:border-primary/50 transition-all duration-500 shadow-sm hover:shadow-xl">
                  {/* Skeleton loader */}
                  {!imageLoaded[image.imageNumber] && (
                    <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
                  )}
                  
                  <Image
                    src={`/images/${image.cantica}/${image.filename}`}
                    alt={image.title}
                    fill
                    className={`object-cover transition-all duration-700 group-hover:scale-105 ${
                      imageLoaded[image.imageNumber] ? 'opacity-100' : 'opacity-0'
                    }`}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    onLoad={() => handleImageLoad(image.imageNumber)}
                  />

                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${canticaColors[image.cantica as keyof typeof canticaColors]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  {/* Content overlay */}
                  <div className="absolute inset-0 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                    <div className="text-white space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
                        {canticaLabels[image.cantica as keyof typeof canticaLabels]} · Canto {image.canto}
                      </span>
                      <h3 className="text-lg font-bold leading-tight line-clamp-2">
                        {image.title}
                      </h3>
                    </div>
                  </div>

                  {/* View icon */}
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                    <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>

                {/* Image number badge */}
                <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-xs font-bold text-muted-foreground shadow-sm">
                  {image.imageNumber}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lightbox */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 bg-black/95 animate-lightbox-in"
            onClick={() => setSelectedImage(null)}
          >
            <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8">
              <div
                className="relative max-w-6xl w-full max-h-full flex flex-col lg:flex-row gap-6 lg:gap-8 animate-lightbox-content"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Image Container */}
                <div className="relative flex-1 min-h-0">
                  <div className="relative h-[50vh] lg:h-[80vh] w-full">
                    <Image
                      src={`/images/${selectedImage.cantica}/${selectedImage.filename}`}
                      alt={selectedImage.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      priority
                    />
                  </div>
                </div>

                {/* Details Panel */}
                <div className="lg:w-80 xl:w-96 flex-shrink-0 bg-card/95 backdrop-blur-sm rounded-sm p-6 lg:p-8 space-y-6 overflow-y-auto max-h-[40vh] lg:max-h-[80vh]">
                  {/* Cantica badge */}
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      selectedImage.cantica === 'inferno' ? 'bg-red-900/20 text-red-700' :
                      selectedImage.cantica === 'purgatorio' ? 'bg-amber-900/20 text-amber-700' :
                      'bg-sky-900/20 text-sky-700'
                    }`}>
                      {canticaLabels[selectedImage.cantica as keyof typeof canticaLabels]}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      Illustration #{selectedImage.imageNumber}
                    </span>
                  </div>

                  {/* Title */}
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight">
                      {selectedImage.title}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      Canto {selectedImage.canto}, Lines {selectedImage.lines}
                    </p>
                  </div>

                  {/* Quote */}
                  <blockquote className="relative pl-4 border-l-2 border-primary/50">
                    <p className="text-foreground/90 italic text-sm lg:text-base leading-relaxed">
                      "{selectedImage.quote}"
                    </p>
                  </blockquote>

                  {/* Action Button */}
                  <Link
                    href={`/${selectedImage.cantica}/${selectedImage.canto}`}
                    className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-sm hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>Read in Context</span>
                  </Link>

                  {/* Artist credit */}
                  <div className="pt-4 border-t border-border text-center text-sm text-muted-foreground">
                    <p>Engraving by <span className="font-semibold">Gustave Doré</span></p>
                    <p className="text-xs mt-1 opacity-75">Published 1857–1868</p>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 lg:top-0 lg:right-0 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={(e) => { e.stopPropagation(); navigateImage('prev'); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors hidden md:flex"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navigateImage('next'); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors hidden md:flex"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

          </div>
        )}
      </main>
    </>
  );
}

