#!/usr/bin/env node
/**
 * Makes the site's icons and header logo from the Dante portrait engraving: the favicon (src/app/icon.png),
 * the Apple touch icon (src/app/apple-icon.png) and the header logo (public/images/dante-logo.webp).
 *
 * The scan has a light printed frame about 30px wide on every side. At icon size it shows as pale strips
 * down the edges, so it's cropped off first.
 *
 *   npm run images:icons
 *
 * Uses sharp, which Next.js installs.
 */
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.join(import.meta.dirname, '..', '..');
const SOURCE = path.join(ROOT, 'public', 'images', 'Dante Portrait.png');
// Measured on the scan: the frame ends about 36px in on the left, 38px on the right and 29px at the top and bottom
const FRAME = { left: 40, right: 42, top: 32, bottom: 32 };
const MAROON = { r: 122, g: 41, b: 48 }; // --color-brand, hsl(355 50% 32%)

const { width, height } = await sharp(SOURCE).metadata();
const portrait = () =>
  sharp(SOURCE)
    .extract({ left: FRAME.left, top: FRAME.top, width: width - FRAME.left - FRAME.right, height: height - FRAME.top - FRAME.bottom })
    .flatten({ background: '#ffffff' });

// Icons: grey on the site's maroon, as the header shows the portrait, framed from the top so the laurel shows
for (const [file, size] of [['src/app/icon.png', 64], ['src/app/apple-icon.png', 180]]) {
  const grey = await portrait().grayscale().resize(size, size, { fit: 'cover', position: 'top' }).toBuffer();
  const info = await sharp(grey)
    .composite([{ input: { create: { width: size, height: size, channels: 4, background: { ...MAROON, alpha: 0.35 } } } }])
    .png()
    .toFile(path.join(ROOT, file));
  console.log(`${file}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
}

// Header logo: drawn 40px wide, so 120px covers screens up to 3x. The header greys and tints it with CSS.
const logo = await portrait().resize(120, 120, { fit: 'cover' }).webp({ quality: 85 }).toFile(path.join(ROOT, 'public/images/dante-logo.webp'));
console.log(`public/images/dante-logo.webp  ${logo.width}x${logo.height}  ${Math.round(logo.size / 1024)} KB`);
