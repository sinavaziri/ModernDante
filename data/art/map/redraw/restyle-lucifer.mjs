// Puts Lucifer and his wings from the Treachery close-up back on a map of Hell: node lucifer.mjs <map.png> <out.png>
import { createRequire } from 'module';
const sharp = createRequire('/Users/Sina/ModernDante/package.json')('sharp');
const svg = (w, h, body) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`);
const box = { left: 424, top: 3496, width: 1200, height: 600 };
const small = await sharp('/Users/Sina/ModernDante/data/art/map/inferno-treachery-closeup.png').resize(box.width, box.height).ensureAlpha().png().toBuffer();
const m = await sharp(svg(box.width, box.height, `<rect x="200" y="160" width="740" height="205" fill="#fff"/><rect x="480" y="300" width="250" height="92" fill="#fff"/>`)).blur(12).png().toBuffer();
const smallIn = await sharp(small).composite([{ input: m, blend: 'dest-in' }]).png().toBuffer();
await sharp(process.argv[2]).composite([{ input: smallIn, left: box.left, top: box.top }]).png().toFile(process.argv[3]);
