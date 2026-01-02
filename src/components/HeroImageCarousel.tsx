'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ANIMATION } from '@/lib/constants';

// Generate all 135 image paths
function getAllImages(): string[] {
  const images: string[] = [];
  
  // Inferno: 1-75
  for (let i = 1; i <= 75; i++) {
    images.push(`/images/inferno/${i}.png`);
  }
  
  // Purgatorio: 76-117
  for (let i = 76; i <= 117; i++) {
    images.push(`/images/purgatorio/${i}.png`);
  }
  
  // Paradiso: 118-135
  for (let i = 118; i <= 135; i++) {
    images.push(`/images/paradiso/${i}.png`);
  }
  
  return images;
}

const allImages = getAllImages();

function getRandomImage(excludePath?: string): string {
  let newImage: string;
  do {
    newImage = allImages[Math.floor(Math.random() * allImages.length)];
  } while (newImage === excludePath && allImages.length > 1);
  return newImage;
}

// Preload an image
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

export default function HeroImageCarousel() {
  const [currentImage, setCurrentImage] = useState(() => getRandomImage());
  const [nextImage, setNextImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isNextImageReady, setIsNextImageReady] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const transitionToNextImage = useCallback(async () => {
    const newImage = getRandomImage(currentImage);
    
    // Preload the next image first
    setNextImage(newImage);
    await preloadImage(newImage);
    setIsNextImageReady(true);
    
    // Small delay to ensure image is rendered, then start transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsTransitioning(true);
      });
    });
    
    // After fade completes, swap images
    timeoutRef.current = setTimeout(() => {
      setCurrentImage(newImage);
      setNextImage(null);
      setIsTransitioning(false);
      setIsNextImageReady(false);
    }, ANIMATION.CAROUSEL_TRANSITION_DURATION);
  }, [currentImage]);

  useEffect(() => {
    const interval = setInterval(transitionToNextImage, ANIMATION.CAROUSEL_ROTATION_INTERVAL);
    return () => {
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [transitionToNextImage]);

  return (
    <div className="relative w-full">
      <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 rounded-sm blur-2xl" />
      <div className="relative overflow-hidden rounded-sm shadow-2xl border border-border/20">
        {/* Current image - always visible as base layer */}
        <img
          src={currentImage}
          alt="Gustave Doré illustration from Dante's Divine Comedy"
          className="w-full h-auto object-contain"
        />
        {/* Next image - fades in on top */}
        {nextImage && (
          <img
            src={nextImage}
            alt="Gustave Doré illustration from Dante's Divine Comedy"
            style={{
              transition: `opacity ${ANIMATION.CAROUSEL_TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            }}
            className={`
              absolute inset-0 w-full h-auto object-contain
              ${isTransitioning && isNextImageReady ? 'opacity-100' : 'opacity-0'}
            `}
          />
        )}
      </div>
    </div>
  );
}

