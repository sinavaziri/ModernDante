// Small copies of the three map paintings for the marker on canto pages.
// Run from the project root: node data/art/map/redraw/map-thumbs.mjs
import sharp from 'sharp';
for (const realm of ['inferno', 'purgatorio', 'paradiso'])
  await sharp(`public/images-map/${realm}-dore-2x.webp`).resize(640, 1280).webp({ quality: 76 }).toFile(`public/images-map/${realm}-thumb.webp`);
