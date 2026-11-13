// Turns the two travellers on the crag to face Lucifer by mirroring the small patch they stand in.
import { createRequire } from 'module';
const sharp = createRequire('/Users/Sina/ModernDante/package.json')('sharp');
const A = '/Users/Sina/ModernDante/data/art/map/', P = '/Users/Sina/ModernDante/public/images-map/';
const svg = (w, h, b) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${b}</svg>`);
async function flip(file, box, blur) {
  const img = await sharp(file).png().toBuffer();
  const patch = await sharp(await sharp(img).extract(box).png().toBuffer()).flop().png().toBuffer();
  const mask = await sharp(svg(box.width, box.height, `<rect x="${blur * 2}" y="${blur * 2}" width="${box.width - blur * 4}" height="${box.height - blur * 4}" rx="${blur * 2}" fill="#fff"/>`)).blur(blur).png().toBuffer();
  const soft = await sharp(patch).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  return sharp(img).composite([{ input: soft, left: box.left, top: box.top }]).png().toBuffer();
}
const big = await flip('up2/under-4096.png', { left: 3160, top: 822, width: 172, height: 206 }, 5);
await sharp(big).toFile('up2/under-4096-flipped.png');
await sharp(big).extract({ left: 2950, top: 700, width: 600, height: 500 }).resize(1200).png().toFile('trav2.png');
if (process.argv[2] === 'write') {
  const out = sharp(big).extract({ left: 0, top: 0, width: 4096, height: 2952 });
  await out.clone().webp({ quality: 92 }).toFile(A + 'inferno-under-ice-2x.webp');
  await out.clone().webp({ quality: 82 }).toFile(P + 'inferno-under-ice-2x.webp');
  // The band the smaller pictures are built from: band = (x + 116) / 1.11328, (y - 300) / 1.11328 of the 2048 picture
  const band = await flip(A + 'inferno-under-ice-front.png', { left: 1523, top: 99, width: 78, height: 93 }, 2.5);
  await sharp(band).toFile(A + 'inferno-under-ice-front.png');
}
