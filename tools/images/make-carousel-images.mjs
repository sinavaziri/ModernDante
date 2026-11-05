#!/usr/bin/env node
/**
 * Makes the home page carousel's images. The plates are PNGs of about 3 MB, so each plate listed in
 * src/data/home-carousel.json gets a 4:5 WebP at each listed width, in public/images-carousel/.
 *
 *   npm run images:carousel
 *
 * Re-run after changing the list, then commit the new files. Uses sharp, which Next.js installs.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.join(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'public', 'images-carousel');
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));

const { widths, plates } = read('src/data/home-carousel.json');
const { images } = read('src/data/image-mappings.json');
const colorized = new Set(read('src/data/colorized-images.json'));

fs.mkdirSync(OUT, { recursive: true });
const made = new Set();
let total = 0;
for (const number of plates) {
  const image = images.find(i => i.imageNumber === number);
  if (!image) throw new Error(`Plate ${number} isn't in image-mappings.json`);
  const key = `${image.cantica}/${image.filename}`;
  const source = path.join(ROOT, 'public', colorized.has(key) ? 'images-color' : 'images', key);
  for (const width of widths) {
    const name = `${number}-${width}.webp`;
    const info = await sharp(source)
      .resize({ width, height: Math.round((width * 5) / 4), fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(path.join(OUT, name));
    made.add(name);
    total += info.size;
    console.log(`${name}  ${Math.round(info.size / 1024)} KB`);
  }
}

// Plates taken off the list shouldn't stay on the site
for (const name of fs.readdirSync(OUT)) {
  if (!made.has(name)) {
    fs.rmSync(path.join(OUT, name));
    console.log(`removed ${name}`);
  }
}
console.log(`${made.size} images, ${(total / 1024 / 1024).toFixed(1)} MB in all`);
