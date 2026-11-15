// Sets the shore figures redrawn after Doré's Cato of Utica into the Purgatorio map. node apply.mjs [write]
import { createRequire } from 'module';
const sharp = createRequire('/Users/Sina/ModernDante/package.json')('sharp');
const A = '/Users/Sina/ModernDante/data/art/map/', P = '/Users/Sina/ModernDante/public/images-map/';
const svg = (w, h, b) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${b}</svg>`);
const soft = async (img, w, h, blur) => sharp(img).ensureAlpha().composite([{ input: await sharp(svg(w, h, `<rect x="${blur * 2}" y="${blur * 2}" width="${w - blur * 4}" height="${h - blur * 4}" rx="${blur * 2}" fill="#fff"/>`)).blur(blur).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer();
// The redrawn window (2048x1024) is the 1024x512 piece of the 2048x4096 map at left 800, top 3584
const win = { left: 800, top: 3584, width: 1024 }, [x, y, w, h] = [440, 50, 1130, 860];
const k = win.width / 2048, W = Math.round(w * k), H = Math.round(h * k);
const piece = await sharp(await sharp('shore-a.png').resize(2048, 1024).extract({ left: x, top: y, width: w, height: h }).png().toBuffer()).resize(W, H, { kernel: 'lanczos3' }).png().toBuffer();
const big = await sharp('purg-4096-before.png').composite([{ input: await soft(piece, W, H, 14), left: Math.round(win.left + x * k), top: Math.round(win.top + y * k) }]).png().toBuffer();
await sharp(big).toFile('purg-4096-cato.png');
await sharp(big).extract({ left: 0, top: 3500, width: 2048, height: 596 }).jpeg({ quality: 90 }).toFile('after-band.jpg');
await sharp(big).extract({ left: 900, top: 3560, width: 900, height: 536 }).resize(1800).jpeg({ quality: 90 }).toFile('after-close.jpg');
if (process.argv[2] === 'write') {
  await sharp(big).webp({ quality: 92 }).toFile(A + 'purgatorio-dore-2x.webp');
  await sharp(big).webp({ quality: 82 }).toFile(P + 'purgatorio-dore-2x.webp');
  console.log('written');
}
