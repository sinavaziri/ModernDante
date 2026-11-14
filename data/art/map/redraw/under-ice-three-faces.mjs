// node under-ice-three-faces.mjs <folder holding out.png> [write]
// Sets the three-faced Lucifer (head, hands and torso above the ice) into the under-ice picture, and into the band the smaller pictures are built from.
import { createRequire } from 'module';
const sharp = createRequire('/Users/Sina/ModernDante/package.json')('sharp');
const A = '/Users/Sina/ModernDante/data/art/map/', P = '/Users/Sina/ModernDante/public/images-map/';
const svg = (w, h, b) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${b}</svg>`);
const at = { left: 1024, top: 480 };                               // where the 2048x1024 crop was taken
const box = { left: 540, top: 80, width: 960, height: 830 };      // in the crop: horns to the ice line
const patch = await sharp((process.argv[2] + '/out.png')).resize(2048, 1024).extract(box).png().toBuffer();
const soft = async (img, w, h, blur) => sharp(img).ensureAlpha().composite([{ input: await sharp(svg(w, h, `<rect x="${blur * 2}" y="${blur * 2}" width="${w - blur * 4}" height="${h - blur * 4}" rx="${blur * 2}" fill="#fff"/>`)).blur(blur).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer();
const big = await sharp('../up2/under-4096-clean.png').composite([{ input: await soft(patch, box.width, box.height, 12), left: at.left + box.left, top: at.top + box.top }]).png().toBuffer();
await sharp(big).toFile('../up2/under-4096-faces.png');
await sharp(big).extract({ left: 1024, top: 480, width: 2048, height: 1300 }).resize(1400).jpeg().toFile('after.jpg');
await sharp(big).extract({ left: 1500, top: 620, width: 1100, height: 800 }).jpeg().toFile('after-close.jpg');
if (process.argv[3] === 'write') {
  const out = sharp(big).extract({ left: 0, top: 0, width: 4096, height: 2952 });
  await out.clone().webp({ quality: 92 }).toFile(A + 'inferno-under-ice-2x.webp');
  await out.clone().webp({ quality: 82 }).toFile(P + 'inferno-under-ice-2x.webp');
  const k = 1 / (2 * 1.11328);
  const w = Math.round(box.width * k), h = Math.round(box.height * k);
  const small = await soft(await sharp(patch).resize(w, h).png().toBuffer(), w, h, 5);
  const band = await sharp(A + 'inferno-under-ice-front.png').composite([{ input: small, left: Math.round(((at.left + box.left) / 2 + 116) / 1.11328), top: Math.round(((at.top + box.top) / 2 - 300) / 1.11328) }]).png().toBuffer();
  await sharp(band).toFile(A + 'inferno-under-ice-front.png');
}
