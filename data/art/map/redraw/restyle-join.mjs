// Joins the five redrawn bands (t0..t4.png) into one 2048x4096 painting: node join.mjs <base painting> <out.png>
import { createRequire } from 'module';
const sharp = createRequire('/Users/Sina/ModernDante/package.json')('sharp');
const TOPS = (process.env.TOPS ?? '0,768,1536,2304,3072').split(',').map(Number);
const layers = [];
for (let i = 0; i < TOPS.length; i++) {
  const img = await sharp(`t${i}.png`).resize(2048, 1024).ensureAlpha().png().toBuffer();
  // Each band fades in over the middle of its overlap with the one above
  const mask = Buffer.from(`<svg width="2048" height="1024" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="${TOPS[i] ? 0.06 : 0}" stop-color="#fff" stop-opacity="${TOPS[i] ? 0 : 1}"/><stop offset="${TOPS[i] ? 0.19 : 0}" stop-color="#fff"/></linearGradient></defs><rect width="2048" height="1024" fill="url(#g)"/></svg>`);
  layers.push({ input: await sharp(img).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer(), left: 0, top: TOPS[i] });
}
await sharp(process.argv[2]).composite(layers).png().toFile(process.argv[3]);
