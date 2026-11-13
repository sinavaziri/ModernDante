// Joins Treachery and the cavern under it into one picture, 2048 square: Lucifer in the ice above,
// his legs hanging below, at one size. The cavern is the foot of the way-out painting turned over.
import { createRequire } from 'module';
const require = createRequire('/Users/Sina/ModernDante/package.json');
const sharp = require('sharp');
const A = '/Users/Sina/ModernDante/data/art/map/';
const S = 2048;
const top = await sharp(A + 'inferno-treachery-closeup.png').resize(S, 1024).png().toBuffer();
// Rock walls carried on downward: the lower part of Treachery mirrored, then darkened toward the foot
const mirror = await sharp(top).extract({ left: 0, top: 560, width: S, height: 464 }).flip().png().toBuffer();
const mirror2 = await sharp(mirror).flip().png().toBuffer();
const mirror3 = await sharp(mirror).extract({ left: 0, top: 0, width: S, height: 1024 - 928 }).png().toBuffer();
// The cavern is sized so the pair of legs is about three quarters as wide as his shoulders above
const cw = 922, ch = 547, cl = 525, ct = 846;
const source = sharp(A + 'passage-dore-2x.webp').extract({ left: 0, top: 2880, width: 2048, height: 1216 }).resize(cw, ch).rotate(180);
const whole = await source.clone().png().toBuffer();
const feather = async (buffer, w, h, l, r) => {
  const m = await sharp(Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect x="${l}" y="26" width="${w - l - r}" height="${h - 110}" fill="#fff"/></svg>`)).blur(24).png().toBuffer();
  return sharp(buffer).ensureAlpha().composite([{ input: m, blend: 'dest-in' }]).png().toBuffer();
};
// The cavern is narrower than the lake above it, so its sides are carried outward with parts of
// itself that hold no figures: its left part mirrored on the left, its left half again on the right
const sideW = Math.round(cw * 0.36);
const side = await sharp(whole).extract({ left: 0, top: 0, width: sideW, height: ch }).png().toBuffer();
const leftFill = await feather(await sharp(side).flop().png().toBuffer(), sideW, ch, 50, -60);
const rightFill = await feather(side, sideW, ch, -60, 50);
// The rock walls of the map, carried down both sides over the cavern's edges
const wallMask = await sharp(Buffer.from(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><rect x="-100" y="1040" width="330" height="1300" fill="#fff"/><rect x="1830" y="1040" width="330" height="1300" fill="#fff"/></svg>`)).blur(22).png().toBuffer();
const wallBase = await sharp({ create: { width: S, height: S, channels: 4, background: '#120e0c' } })
  .composite([{ input: mirror, left: 0, top: 1024 }, { input: mirror2, left: 0, top: 1488 }, { input: mirror3, left: 0, top: 1952 }]).png().toBuffer();
const walls = await sharp(wallBase).composite([{ input: wallMask, blend: 'dest-in' }]).png().toBuffer();
const cavern = await feather(whole, cw, ch, 40, 40);
const shade = Buffer.from(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.63" stop-color="#120e0c" stop-opacity="0"/><stop offset="0.68" stop-color="#120e0c" stop-opacity="0.4"/><stop offset="0.76" stop-color="#120e0c" stop-opacity="1"/></linearGradient></defs><rect width="${S}" height="${S}" fill="url(#g)"/></svg>`);
// Darken the mirrored ice behind the cavern so only rock shows at the sides
const centreDark = Buffer.from(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="b"><feGaussianBlur stdDeviation="40"/></filter></defs><rect x="300" y="1040" width="1450" height="1100" fill="#0d1420" filter="url(#b)"/></svg>`);
await sharp({ create: { width: S, height: S, channels: 3, background: '#120e0c' } })
  .composite([
    { input: top, left: 0, top: 0 },
    { input: mirror, left: 0, top: 1024 },
    { input: mirror2, left: 0, top: 1488 },
    { input: mirror3, left: 0, top: 1952 },
    { input: centreDark, left: 0, top: 0 },
    { input: leftFill, left: cl - sideW + 40, top: ct },
    { input: rightFill, left: cl + cw - 40, top: ct },
    { input: cavern, left: cl, top: ct },
    { input: walls, left: 0, top: 0 },
    { input: shade, left: 0, top: 0 },
  ])
  .png().toFile('dive.png');
await sharp('dive.png').resize(1000).jpeg({ quality: 85 }).toFile('dive-preview.jpg');
