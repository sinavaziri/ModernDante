// Shared by the image tools
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.join(import.meta.dirname, '..', '..');

/** A plate's master file: the colorized PNG when there is one, otherwise the original engraving */
export function plateMaster(image) {
  const key = path.join(image.cantica, image.filename);
  const color = path.join(ROOT, 'plates', 'color', key);
  return fs.existsSync(color) ? color : path.join(ROOT, 'plates', 'bw', key);
}
