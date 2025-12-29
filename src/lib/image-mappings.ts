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

// Type assertion for the imported JSON
const cantoMapping = imageMappingsData.cantoMapping as CantoMapping;

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
