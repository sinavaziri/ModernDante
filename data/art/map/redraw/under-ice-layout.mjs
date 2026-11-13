import { createRequire } from 'module';
const sharp = createRequire('/Users/Sina/ModernDante/package.json')('sharp');
const A = '/Users/Sina/ModernDante/data/art/map/';
export const W = 1040, H = Math.round(W * 1216 / 2048), L = 502, T = 345;
export const cavern = async () => sharp(await sharp(A + 'passage-dore-2x.webp').extract({ left: 0, top: 2880, width: 2048, height: 1216 }).png().toBuffer()).rotate(180).resize(W, H).png().toBuffer();
const svg = (w, h, b) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${b}</svg>`);
export const masked = async (img, w, h, body, blur) => sharp(img).ensureAlpha().composite([{ input: await sharp(svg(w, h, body)).blur(blur).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer();
if (process.argv[2] === 'layout') {
  const dark = svg(2048, 1024, `<defs><filter id="b"><feGaussianBlur stdDeviation="14"/></filter></defs><rect x="315" y="${T + 6}" width="1340" height="760" fill="#0a1220" filter="url(#b)"/>`);
  const c = await masked(await cavern(), W, H, `<rect x="40" y="-50" width="${W - 80}" height="${H + 20}" fill="#fff"/>`, 22);
  await sharp(process.argv[3]).composite([{ input: dark, left: 0, top: 0 }, { input: c, left: L, top: T }]).png().toFile('lay.png');
  await sharp('lay.png').resize(1400).jpeg().toFile('lay.jpg');
}
