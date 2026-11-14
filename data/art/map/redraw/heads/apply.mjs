// Sets the redrawn heads (Dante with his coif, Virgil wreathed and beardless) into the pictures they came from.
// Only a box around the heads is taken from each redrawn window. node apply.mjs
import { createRequire } from 'module';
import fs from 'fs';
import { ITEMS, A } from './items.mjs';
const sharp = createRequire('/Users/Sina/ModernDante/package.json')('sharp');
const P = '/Users/Sina/ModernDante/public/images-map/';
const svg = (w, h, b) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${b}</svg>`);
const soft = async (img, w, h, blur) => sharp(img).ensureAlpha().composite([{ input: await sharp(svg(w, h, `<rect x="${blur * 2}" y="${blur * 2}" width="${w - blur * 4}" height="${h - blur * 4}" rx="${blur * 2}" fill="#fff"/>`)).blur(blur).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer();
// The box around the heads in each 2048x1024 redrawn window
const BOX = { cavern: [780, 330, 500, 370], crag: [800, 120, 450, 360], path: [930, 60, 590, 560], shore: [790, 250, 570, 430], rising: [900, 230, 300, 330] };
/** The box from a redrawn window, sized for its source picture, and where it goes there */
async function patch(name) {
  const it = ITEMS.find(i => i.name === name), [x, y, w, h] = BOX[name], k = it.win.width / 2048;
  const W = Math.round(w * k), H = Math.round(h * k);
  const img = await sharp(await sharp(`${name}.png`).resize(2048, 1024).extract({ left: x, top: y, width: w, height: h }).png().toBuffer()).resize(W, H, { kernel: 'lanczos3' }).png().toBuffer();
  return { input: await soft(img, W, H, Math.max(2, Math.round(10 * k))), left: Math.round(it.win.left + x * k), top: Math.round(it.win.top + y * k), W, H };
}
const only = ({ input, left, top }) => ({ input, left, top });
const step = process.argv[2];
if (step === 'cavern') {
  // The cavern pair at twice the size: ../trav/paste.mjs then carries it to the way-out painting and under the ice
  await sharp(await sharp('../trav/out.png').resize(2048, 1024).png().toBuffer()).composite([only(await patch('cavern'))]).png().toFile('../trav/out2.png');
}
if (step === 'rest') {
  // Under the ice: the pair on the crag
  const c = await patch('crag');
  const big = await sharp('../up2/under-4096-trav.png').composite([only(c)]).png().toBuffer();
  await sharp(big).toFile('../up2/under-4096-coif.png');
  const out = sharp(big).extract({ left: 0, top: 0, width: 4096, height: 2952 });
  await out.clone().webp({ quality: 92 }).toFile(A + 'inferno-under-ice-2x.webp');
  await out.clone().webp({ quality: 82 }).toFile(P + 'inferno-under-ice-2x.webp');
  const kb = 1 / (2 * 1.11328), wb = Math.round(c.W * kb), hb = Math.round(c.H * kb);
  const small = await soft(await sharp(await sharp(big).extract({ left: c.left, top: c.top, width: c.W, height: c.H }).png().toBuffer()).resize(wb, hb).png().toBuffer(), wb, hb, 2);
  await sharp(await sharp(A + 'inferno-under-ice-front.png').composite([{ input: small, left: Math.round((c.left / 2 + 116) / 1.11328), top: Math.round((c.top / 2 - 300) / 1.11328) }]).png().toBuffer()).toFile(A + 'inferno-under-ice-front.png');
  // The way out of Hell: the pairs on the path and on the shore. The rising: Dante alone.
  for (const [file, names] of [['passage', ['path', 'shore']], ['ascent', ['rising']]]) {
    const layers = []; for (const n of names) layers.push(only(await patch(n)));
    const png = await sharp(A + `${file}-dore-2x.webp`).composite(layers).png().toBuffer();
    const before = fs.statSync(P + `${file}-dore-2x.webp`).size;
    await sharp(png).webp({ quality: 96 }).toFile(A + `${file}-dore-2x.webp.new`);
    fs.renameSync(A + `${file}-dore-2x.webp.new`, A + `${file}-dore-2x.webp`);
    let pick; for (const q of [86, 82, 78, 74]) { pick = await sharp(png).webp({ quality: q }).toBuffer(); if (pick.length <= before * 1.05) break; }
    fs.writeFileSync(P + `${file}-dore-2x.webp`, pick); console.log(file, before, '->', pick.length);
  }
}
