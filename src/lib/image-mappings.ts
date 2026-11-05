// Mapping of cantos to Doré illustration data
// Generated from imagecaptions.md

import imageMappingsData from '@/data/image-mappings.json';
import colorizedImages from '@/data/colorized-images.json';
import homeCarousel from '@/data/home-carousel.json';
import { getAllCanticas } from '@/lib/canticas';

export interface ImageData {
  imageNumber: number;
  filename: string;
  title: string;
  quote: string;
  lines: string;
}

type CantoMapping = Record<string, ImageData[]>;

interface ImageMappingsFile {
  images: ImageData[];
  cantoMapping: CantoMapping;
}

/**
 * Type guard to validate ImageMappingsFile structure
 */
function isImageMappingsFile(data: unknown): data is ImageMappingsFile {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    Array.isArray(obj.images) &&
    typeof obj.cantoMapping === 'object' &&
    obj.cantoMapping !== null
  );
}

// Validate and extract mapping with runtime type checking
const mappingsFile: ImageMappingsFile = imageMappingsData as ImageMappingsFile;

if (!isImageMappingsFile(mappingsFile)) {
  throw new Error('Invalid image-mappings.json structure');
}

const cantoMapping: CantoMapping = mappingsFile.cantoMapping;

// Shared so a canto without images returns the same array on every render
const NO_IMAGES: ImageData[] = [];

/**
 * Get all images for a specific canto
 * @param cantica - The cantica name (inferno, purgatorio, paradiso)
 * @param cantoNumber - The canto number
 * @returns Array of image data for the canto, or empty array if none exist
 */
export function getImagesForCanto(cantica: string, cantoNumber: number): ImageData[] {
  const key = `${cantica}-${cantoNumber}`;
  return cantoMapping[key] || NO_IMAGES;
}

const colorized = new Set<string>(colorizedImages);

/**
 * Public URL for an illustration: the colorized version when one exists,
 * otherwise the original black-and-white engraving
 * @param cantica - The cantica name
 * @param filename - The image filename, e.g. "1.png"
 */
export function getImageSrc(cantica: string, filename: string): string {
  const key = `${cantica}/${filename}`;
  return colorized.has(key) ? `/images-color/${key}` : `/images/${key}`;
}

export interface CarouselSlide {
  imageNumber: number;
  title: string;
  /** Display name, e.g. "Inferno" */
  canticaName: string;
  canto: number;
  href: string;
  src: string;
  srcSet: string;
}

const MINOR_WORDS = new Set(['a', 'an', 'and', 'of', 'the', 'to', 'in', 'on']);

/** Plate titles are stored in capitals: "THE WAY TO THE UPPER WORLD" becomes "The Way to the Upper World" */
export function titleCase(title: string): string {
  return title
    .toLowerCase()
    .split(/(\s+|—)/)
    .map((word, i, parts) => {
      const startsPart = i === 0 || parts[i - 1] === '—';
      return !startsPart && MINOR_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
}

/** The lighter WebP copies of a home page plate, made by `npm run images:carousel` */
function homePlateImage(number: number): { src: string; srcSet: string } {
  const [smallest] = homeCarousel.widths;
  return {
    src: `/images-carousel/${number}-${smallest}.webp`,
    srcSet: homeCarousel.widths.map(w => `/images-carousel/${number}-${w}.webp ${w}w`).join(', '),
  };
}

/** The plate shown on a cantica's card on the home page */
export function getCanticaPlate(cantica: string): { src: string; srcSet: string } {
  const number = homeCarousel.canticaPlates[cantica as keyof typeof homeCarousel.canticaPlates];
  if (!number) throw new Error(`No home page plate for ${cantica} in home-carousel.json`);
  return homePlateImage(number);
}

/**
 * The home page carousel's plates, in the order listed in src/data/home-carousel.json.
 */
export function getCarouselSlides(): CarouselSlide[] {
  const all = imageMappingsData.images as Array<ImageData & { cantica: string; canto: number }>;
  const canticaNames = new Map(getAllCanticas().map(c => [c.name as string, c.displayName]));

  return homeCarousel.plates.map(number => {
    const image = all.find(i => i.imageNumber === number);
    if (!image) throw new Error(`Carousel plate ${number} isn't in image-mappings.json`);
    return {
      imageNumber: number,
      title: titleCase(image.title),
      canticaName: canticaNames.get(image.cantica) ?? image.cantica,
      canto: image.canto,
      href: `/${image.cantica}/${image.canto}`,
      ...homePlateImage(number),
    };
  });
}
