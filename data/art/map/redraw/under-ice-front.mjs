// Lucifer painted as one figure, front-on (prompt in prompt-under-ice-front.txt), set into the three
// pictures that show him: the under-ice picture, the Treachery close-up, and the map of Hell.
// The painting covers rows 300–1440 of the under-ice picture, widened 116px each side.
// Run from the project root: node data/art/map/redraw/under-ice-front.mjs
import sharp from 'sharp';
import { execSync } from 'child_process';
const A = 'data/art/map/';
const P = 'public/images-map/';
const S = 2048;
const TOP = 300, H = 1140, PAD = 116;
const svg = (w, h, body) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`);
const masked = async (img, w, h, rect, blur) => {
  const m = await sharp(svg(w, h, rect)).blur(blur).png().toBuffer();
  return sharp(img).ensureAlpha().composite([{ input: m, blend: 'dest-in' }]).png().toBuffer();
};

// 1. The under-ice picture
const band = await sharp(A + 'inferno-under-ice-front.png').resize(S + 2 * PAD, H).extract({ left: PAD, top: 0, width: S, height: H }).png().toBuffer();
const bandIn = await masked(band, S, H, `<rect x="-100" y="40" width="${S + 200}" height="${H + 100}" fill="#fff"/>`, 16);
const shade = svg(S, S, `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.686" stop-color="#0b0d12" stop-opacity="0"/><stop offset="0.703" stop-color="#0b0d12" stop-opacity="1"/></linearGradient></defs><rect width="${S}" height="${S}" fill="url(#g)"/>`);
const before = await sharp(A + 'inferno-under-ice.webp').png().toBuffer();
const under = await sharp(before).composite([{ input: bandIn, left: 0, top: TOP }, { input: shade, left: 0, top: 0 }]).png().toBuffer();
await sharp(under).webp({ quality: 90 }).toFile(A + 'inferno-under-ice.webp.tmp');

// 2. The close-up is the top half of it
const close = await sharp(under).extract({ left: 0, top: 0, width: S, height: 1024 }).png().toBuffer();
await sharp(close).toFile(A + 'inferno-treachery-closeup.png');
await sharp(close).webp({ quality: 88 }).toFile(P + 'inferno-treachery-closeup.webp');

// 3. The same Lucifer and wings on the map of Hell, in the box the close-up covers (212, 1748, 600×300 at 2×).
// Reads the committed map so it is safe to run again.
const box = { left: 424, top: 3496, width: 1200, height: 600 };
const small = await sharp(close).resize(box.width, box.height).png().toBuffer();
const smallIn = await masked(small, box.width, box.height, `<rect x="200" y="160" width="740" height="205" fill="#fff"/><rect x="480" y="300" width="250" height="92" fill="#fff"/>`, 12);
const hell = await sharp(execSync('git show HEAD~0:data/art/map/inferno-dore-2x.webp', { maxBuffer: 1 << 26 })).composite([{ input: smallIn, left: box.left, top: box.top }]).webp({ quality: 96 }).toBuffer();
await sharp(hell).toFile(A + 'inferno-dore-2x.webp.tmp');
