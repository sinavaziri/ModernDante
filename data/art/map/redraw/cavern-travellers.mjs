// The cavern's two travellers, redrawn with clear heads (out.png: rows 3400-3912, columns 0-1024 of the way-out
// painting at twice the size), set into that painting and, turned over, under the ice in the under-ice picture.
// node paste.mjs [write]
import { createRequire } from 'module';
const sharp = createRequire('/Users/Sina/ModernDante/package.json')('sharp');
const A = '/Users/Sina/ModernDante/data/art/map/', P = '/Users/Sina/ModernDante/public/images-map/';
const svg = (w, h, b) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${b}</svg>`);
const soft = async (img, w, h, blur) => sharp(img).ensureAlpha().composite([{ input: await sharp(svg(w, h, `<rect x="${blur * 2}" y="${blur * 2}" width="${w - blur * 4}" height="${h - blur * 4}" rx="${blur * 2}" fill="#fff"/>`)).blur(blur).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer();
const box = { left: 580, top: 240, width: 380, height: 440 };      // the two figures in out.png
const patch = await sharp('../trav/out2.png').resize(2048, 1024).extract(box).png().toBuffer();

// 1. The way-out painting: half size, where it came from
const w1 = box.width / 2, h1 = box.height / 2;
const passage = await sharp(A + 'passage-dore-2x.webp').composite([{ input: await soft(await sharp(patch).resize(w1, h1).png().toBuffer(), w1, h1, 5), left: box.left / 2, top: 3400 + box.top / 2 }]).png().toBuffer();

// 2. Under the ice: the cavern lies there turned over, 1040 wide at (502, 345) in the band, the band at
// x * 1.11328 - 116, y * 1.11328 + 300 in the 2048 picture
const k = (1040 / 2048) * 1.11328;                                  // cavern pixels to the 2048 picture
const cav = { right: 2048 - box.left / 2, bottom: 1216 - (3400 - 2880 + box.top / 2) };   // the box's far corner, turned over
const x2 = ((cav.right - w1) * (1040 / 2048) + 502) * 1.11328 - 116, y2 = ((cav.bottom - h1) * (1040 / 2048) + 345) * 1.11328 + 300;
const turned = await sharp(patch).rotate(180).png().toBuffer();
const wB = Math.round(w1 * k * 2), hB = Math.round(h1 * k * 2);
const big = await sharp('../up2/under-4096-faces.png').composite([{ input: await soft(await sharp(turned).resize(wB, hB).png().toBuffer(), wB, hB, 6), left: Math.round(x2 * 2), top: Math.round(y2 * 2) }]).png().toBuffer();
await sharp(big).toFile('../up2/under-4096-trav.png');
await sharp(big).extract({ left: Math.round(x2 * 2) - 150, top: Math.round(y2 * 2) - 150, width: wB + 300, height: hB + 250 }).png().toFile('under-after.png');
await sharp(passage).extract({ left: 150, top: 3440, width: 500, height: 400 }).png().toFile('passage-after.png');
if (process.argv[2] === 'write') {
  await sharp(passage).webp({ quality: 96 }).toFile(A + 'passage-dore-2x.webp.new');
  const out = sharp(big).extract({ left: 0, top: 0, width: 4096, height: 2952 });
  await out.clone().webp({ quality: 92 }).toFile(A + 'inferno-under-ice-2x.webp');
  await out.clone().webp({ quality: 82 }).toFile(P + 'inferno-under-ice-2x.webp');
  const wS = Math.round(w1 * (1040 / 2048)), hS = Math.round(h1 * (1040 / 2048));
  const band = await sharp(A + 'inferno-under-ice-front.png').composite([{ input: await soft(await sharp(turned).resize(wS, hS).png().toBuffer(), wS, hS, 3), left: Math.round((cav.right - w1) * (1040 / 2048) + 502), top: Math.round((cav.bottom - h1) * (1040 / 2048) + 345) }]).png().toBuffer();
  await sharp(band).toFile(A + 'inferno-under-ice-front.png');
}
