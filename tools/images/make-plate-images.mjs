#!/usr/bin/env node
/**
 * Makes the copies of Doré's plates that the site serves. The masters in plates/ are PNGs of about
 * 3 MB, so each plate gets two WebP files in public/images-plates/: <number>.webp at the master's
 * own size, for the full-screen view, and <number>-640.webp for the page. Each plate's size is
 * listed in src/data/plate-images.json, so pages can reserve its space before it loads.
 *
 *   npm run images:plates
 *
 * A plate's colorized master (plates/color/) is used when there is one, otherwise the original
 * engraving (plates/bw/). A plate whose copies are newer than its master is skipped. Re-run after
 * changing a master, then commit the new files.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT, plateMaster } from './lib.mjs';

const OUT = path.join(ROOT, 'public', 'images-plates');
const SMALL = 640;
const { images } = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/image-mappings.json'), 'utf8'));

fs.mkdirSync(OUT, { recursive: true });
const expected = new Set();
const sizes = {};
let made = 0;

for (const image of images) {
  const source = plateMaster(image);
  const { width, height } = await sharp(source).metadata();
  sizes[image.imageNumber] = [width, height];
  const changed = fs.statSync(source).mtimeMs;
  const copies = [
    [`${image.imageNumber}.webp`, null],
    [`${image.imageNumber}-${SMALL}.webp`, SMALL],
  ];
  for (const [name, resizeTo] of copies) {
    expected.add(name);
    const file = path.join(OUT, name);
    if (fs.existsSync(file) && fs.statSync(file).mtimeMs > changed) continue;
    const picture = resizeTo ? sharp(source).resize({ width: resizeTo }) : sharp(source);
    const info = await picture.webp({ quality: 82 }).toFile(file);
    made++;
    console.log(`${name}  ${Math.round(info.size / 1024)} KB`);
  }
}

// A plate taken out of image-mappings.json shouldn't stay on the site
for (const name of fs.readdirSync(OUT)) {
  if (!expected.has(name)) {
    fs.rmSync(path.join(OUT, name));
    console.log(`removed ${name}`);
  }
}

const listing = `{\n  "small": ${SMALL},\n  "sizes": {\n${Object.entries(sizes).map(([n, s]) => `    "${n}": [${s.join(', ')}]`).join(',\n')}\n  }\n}\n`;
fs.writeFileSync(path.join(ROOT, 'src/data/plate-images.json'), listing);
const total = [...expected].reduce((sum, name) => sum + fs.statSync(path.join(OUT, name)).size, 0);
console.log(`${made} made, ${expected.size} in all, ${(total / 1024 / 1024).toFixed(1)} MB`);
