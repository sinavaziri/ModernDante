// Sets the redrawn side sinners (facing the viewer) and the travellers on the crag (looking at Lucifer) into the
// under-ice picture and the band the smaller pictures are built from. node apply.mjs [write]
import { createRequire } from 'module';
const sharp = createRequire('/Users/Sina/ModernDante/package.json')('sharp');
const A = '/Users/Sina/ModernDante/data/art/map/', P = '/Users/Sina/ModernDante/public/images-map/';
const svg = (w, h, b) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${b}</svg>`);
const soft = async (img, w, h, blur) => sharp(img).ensureAlpha().composite([{ input: await sharp(svg(w, h, `<rect x="${blur * 2}" y="${blur * 2}" width="${w - blur * 4}" height="${h - blur * 4}" rx="${blur * 2}" fill="#fff"/>`)).blur(blur).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer();
// Each patch: the redrawn window, where that window lies in the 4096 picture, and the box to take from it (in the 2048x1024 window)
const PATCHES = [
  { file: 'luc.png', win: { left: 1536, top: 760, width: 1024 }, box: [440, 420, 290, 470] },
  { file: 'luc.png', win: { left: 1536, top: 760, width: 1024 }, box: [1350, 420, 270, 470] },
  { file: 'crag.png', win: { left: 2990, top: 800, width: 520 }, box: [600, 150, 700, 730] },
];
const layers = [];
for (const { file, win, box: [x, y, w, h] } of PATCHES) {
  const k = win.width / 2048, W = Math.round(w * k), H = Math.round(h * k);
  const img = await sharp(await sharp(file).resize(2048, 1024).extract({ left: x, top: y, width: w, height: h }).png().toBuffer()).resize(W, H, { kernel: 'lanczos3' }).png().toBuffer();
  layers.push({ input: await soft(img, W, H, Math.max(2, Math.round(12 * k))), left: Math.round(win.left + x * k), top: Math.round(win.top + y * k), W, H });
}
const big = await sharp('../up2/under-4096-coif.png').composite(layers.map(({ input, left, top }) => ({ input, left, top }))).png().toBuffer();
await sharp(big).toFile('../up2/under-4096-gaze.png');
await sharp(big).extract({ left: 1536, top: 760, width: 1024, height: 512 }).jpeg({ quality: 90 }).toFile('after-luc.jpg');
await sharp(big).extract({ left: 2900, top: 650, width: 700, height: 560 }).resize(1400).jpeg({ quality: 90 }).toFile('after-crag.jpg');
await sharp(big).extract({ left: 900, top: 380, width: 2800, height: 1400 }).resize(1600).jpeg({ quality: 88 }).toFile('after-wide.jpg');
if (process.argv[2] === 'write') {
  const out = sharp(big).extract({ left: 0, top: 0, width: 4096, height: 2952 });
  await out.clone().webp({ quality: 92 }).toFile(A + 'inferno-under-ice-2x.webp');
  await out.clone().webp({ quality: 82 }).toFile(P + 'inferno-under-ice-2x.webp');
  // The band: band = (x / 2 + 116) / 1.11328, (y / 2 - 300) / 1.11328 of the 4096 picture
  const kb = 1 / (2 * 1.11328), small = [];
  for (const c of layers) {
    const wb = Math.round(c.W * kb), hb = Math.round(c.H * kb);
    const piece = await sharp(await sharp(big).extract({ left: c.left, top: c.top, width: c.W, height: c.H }).png().toBuffer()).resize(wb, hb).png().toBuffer();
    small.push({ input: await soft(piece, wb, hb, 2), left: Math.round((c.left / 2 + 116) / 1.11328), top: Math.round((c.top / 2 - 300) / 1.11328) });
  }
  await sharp(await sharp(A + 'inferno-under-ice-front.png').composite(small).png().toBuffer()).toFile(A + 'inferno-under-ice-front.png');
  console.log('written');
}
