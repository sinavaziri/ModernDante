// Joins the six sharpened tiles into the under-ice picture at twice the size (4096 square), then
// sets the cavern's own legs back in at their native resolution.
import { createRequire } from 'module';
const sharp = createRequire('/Users/Sina/ModernDante/package.json')('sharp');
const A = '/Users/Sina/ModernDante/data/art/map/';
const svg = (w, h, b) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${b}</svg>`);
const masked = async (img, w, h, body, blur) => sharp(img).ensureAlpha().composite([{ input: await sharp(svg(w, h, body)).blur(blur).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer();
const base = await sharp(A + 'inferno-under-ice.webp').resize(4096, 4096, { kernel: 'lanczos3' }).png().toBuffer();
const rows = [[0, 300], [1, 790]], cols = [[0, 100], [2, 920], [1, 510]];
const layers = [];
for (const [r, y] of rows) for (const [c, x] of cols) {
  // What each tile owns, in its own pixels: the centre column lies over the side ones
  const l = c === 1 ? 110 : 30, rgt = c === 1 ? 110 : 30, t = r === 0 ? 30 : 22, b = r === 0 ? 0 : 30;
  const blur = c === 1 ? 24 : 12;
  const tile = await masked(`t${r}${c}.png`, 2048, 1024, `<rect x="${l}" y="${t}" width="${2048 - l - rgt}" height="${1024 - t - b + (r === 0 ? 40 : 0)}" fill="#fff"/>`, blur);
  layers.push({ input: tile, left: x * 2, top: y * 2 });
}
// The legs: the cavern's own, turned over, 8% smaller than the layout's (see under-ice-exact-legs.mjs)
const f = 2 * 1.11328, k = 0.92, n = 2048 / 1040;
const box = { left: 330, top: 175, width: 370, height: 415 };
const flipped = await sharp(await sharp(A + 'passage-dore-2x.webp').extract({ left: 0, top: 2880, width: 2048, height: 1216 }).png().toBuffer()).rotate(180).png().toBuffer();
const w = Math.round(box.width * k * f), h = Math.round(box.height * k * f);
const patch = await sharp(await sharp(flipped).extract({ left: Math.round(box.left * n), top: Math.round(box.top * n), width: Math.round(box.width * n), height: Math.round(box.height * n) }).png().toBuffer()).resize(w, h).png().toBuffer();
const m = f;
const legs = await masked(patch, w, h, `<rect x="${24 * m}" y="${8 * m}" width="${w - 48 * m}" height="${h - 30 * m}" rx="${40 * m}" fill="#fff"/>`, 12 * m);
const xb = 502 + box.left + (box.width - Math.round(box.width * k)) / 2, yb = 345 + box.top;
layers.push({ input: legs, left: Math.round((xb * 1.11328 - 116) * 2), top: Math.round((300 + yb * 1.11328) * 2) });
const shade = svg(4096, 4096, `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.686" stop-color="#0b0d12" stop-opacity="0"/><stop offset="0.703" stop-color="#0b0d12" stop-opacity="1"/></linearGradient></defs><rect width="4096" height="4096" fill="url(#g)"/>`);
layers.push({ input: shade, left: 0, top: 0 });
await sharp(base).composite(layers).png().toFile('under-4096.png');
await sharp('under-4096.png').extract({ left: 0, top: 500, width: 4096, height: 2400 }).resize(1500).jpeg().toFile('whole.jpg');
await sharp('under-4096.png').extract({ left: 1300, top: 700, width: 1500, height: 1100 }).jpeg().toFile('torso.jpg');
await sharp('under-4096.png').extract({ left: 1300, top: 1500, width: 1500, height: 1200 }).jpeg().toFile('legs.jpg');
