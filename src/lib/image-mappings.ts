// Doré's plates: which canto each one illustrates, its caption and where it sits in the text

import imageMappingsData from '@/data/image-mappings.json';
import plateImages from '@/data/plate-images.json';
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

/** A plate, with the canto it illustrates */
export interface PlateData extends ImageData {
  cantica: string;
  canto: number;
}

/** Every plate, in order from 1 to 135 */
export function getAllPlates(): PlateData[] {
  return imageMappingsData.images as PlateData[];
}

/** A plate by its number, 1 to 135 */
export function getPlate(imageNumber: number): PlateData | undefined {
  return getAllPlates().find(i => i.imageNumber === imageNumber);
}

export interface PlateImage {
  /** The plate at its full size, for the full-screen view */
  src: string;
  /** The full size and a smaller copy, for the browser to choose from */
  srcSet: string;
  /** The smaller copy by itself */
  small: string;
  width: number;
  height: number;
}

/** The WebP copies of a plate, made by `npm run images:plates` */
export function getPlateImage(imageNumber: number): PlateImage {
  const size = (plateImages.sizes as Record<string, number[]>)[imageNumber];
  if (!size) throw new Error(`Plate ${imageNumber} isn't in plate-images.json. Run npm run images:plates.`);
  const [width, height] = size;
  const src = `/images-plates/${imageNumber}.webp`;
  const small = `/images-plates/${imageNumber}-${plateImages.small}.webp`;
  return { src, small, srcSet: `${small} ${plateImages.small}w, ${src} ${width}w`, width, height };
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
  const all = getAllPlates();
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
