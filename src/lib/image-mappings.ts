// Mapping of cantos to Doré illustration data
// Generated from imagecaptions.md

import imageMappingsData from '@/data/image-mappings.json';

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

/**
 * Get all images for a specific canto
 * @param cantica - The cantica name (inferno, purgatorio, paradiso)
 * @param cantoNumber - The canto number
 * @returns Array of image data for the canto, or empty array if none exist
 */
export function getImagesForCanto(cantica: string, cantoNumber: number): ImageData[] {
  const key = `${cantica}-${cantoNumber}`;
  return cantoMapping[key] || [];
}

/**
 * Get the first image for a canto (for backward compatibility)
 * @param cantica - The cantica name
 * @param cantoNumber - The canto number
 * @returns The filename of the first image, or null if none exist
 */
export function getImageForCanto(cantica: string, cantoNumber: number): string | null {
  const images = getImagesForCanto(cantica, cantoNumber);
  return images.length > 0 ? images[0].filename : null;
}

/**
 * Get all image data from the mappings file
 */
export function getAllImageData() {
  return imageMappingsData;
}
