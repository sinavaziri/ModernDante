#!/usr/bin/env node
/**
 * Makes the images shown at the top of note cards, as wide 12:5 WebP crops at each listed width,
 * in public/images-notes/:
 *
 * - every Doré plate a glossary entry or a note names (data/glossary.json, data/annotations/),
 *   from its master in plates/, a PNG of about 3 MB, as <number>-<width>.webp
 * - every artwork in data/art.json, from the files in data/art/ (public-domain and CC0 art from
 *   Wikimedia Commons), as art-<id>-<width>.webp
 *
 *   npm run images:notes
 *
 * Each crop centers on a focus, "x% y%" of the picture like CSS object-position: for plates in
 * src/data/note-images.json, for art in data/art.json. A zoom above 1 crops tighter than the
 * largest 12:5 window, for a small figure in a big scene. A brightness above 1 lifts a painting too
 * dark to read at card size, such as Rembrandt's. Re-run after adding a picture to a note
 * or changing a crop, then commit the new files.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT, plateMaster } from './lib.mjs';

const OUT = path.join(ROOT, 'public', 'images-notes');
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));

const { widths, aspect: [aspectW, aspectH], focus: plateFocus, zoom: plateZoom = {} } = read('src/data/note-images.json');
const { images } = read('src/data/image-mappings.json');
const art = read('data/art.json');

// Every plate named in the glossary or in any canto's notes
const plates = new Set(Object.values(read('data/glossary.json')).flatMap(e => e.plate ?? []));
const notesDir = path.join(ROOT, 'data', 'annotations');
for (const cantica of fs.existsSync(notesDir) ? fs.readdirSync(notesDir) : []) {
  for (const file of fs.readdirSync(path.join(notesDir, cantica)).filter(f => f.endsWith('.json'))) {
    for (const note of read(path.join('data', 'annotations', cantica, file))) {
      if (note.plate) plates.add(note.plate);
    }
  }
}

const parseFocus = value => {
  const [x, y] = (value ?? '50% 50%').split(/\s+/).map(v => parseFloat(v) / 100);
  return { x, y };
};

fs.mkdirSync(OUT, { recursive: true });
const made = new Set();
let total = 0;

async function crop(source, name, focus, zoom = 1, brightness = 1) {
  // The largest 12:5 window that fits the picture, made smaller by the zoom, and centered on
  // the focus as far as the edges allow
  const { width: w, height: h } = await sharp(source).metadata();
  const cropW = Math.round(Math.min(w, (h * aspectW) / aspectH) / zoom);
  const cropH = Math.round(Math.min(h, (w * aspectH) / aspectW) / zoom);
  const f = parseFocus(focus);
  const left = Math.min(Math.max(Math.round(f.x * w - cropW / 2), 0), w - cropW);
  const top = Math.min(Math.max(Math.round(f.y * h - cropH / 2), 0), h - cropH);

  for (const width of widths) {
    const file = `${name}-${width}.webp`;
    const info = await sharp(source)
      .extract({ left, top, width: cropW, height: cropH })
      .resize({ width })
      .modulate({ brightness })
      .webp({ quality: 80 })
      .toFile(path.join(OUT, file));
    made.add(file);
    total += info.size;
    const upscaled = width > cropW ? `  (upscaled from ${cropW} px)` : '';
    console.log(`${file}  ${Math.round(info.size / 1024)} KB${upscaled}`);
  }
}

for (const number of [...plates].sort((a, b) => a - b)) {
  const image = images.find(i => i.imageNumber === number);
  if (!image) throw new Error(`Plate ${number} isn't in image-mappings.json`);
  await crop(plateMaster(image), String(number), plateFocus[number], plateZoom[number]);
}

for (const [id, work] of Object.entries(art)) {
  await crop(path.join(ROOT, 'data', 'art', work.file), `art-${id}`, work.focus, work.zoom, work.brightness);
}

// Pictures no note uses any more shouldn't stay on the site
for (const name of fs.readdirSync(OUT)) {
  if (!made.has(name)) {
    fs.rmSync(path.join(OUT, name));
    console.log(`removed ${name}`);
  }
}
console.log(`${made.size} images, ${(total / 1024 / 1024).toFixed(1)} MB in all`);
