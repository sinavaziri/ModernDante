// Puts the cavern's own legs (exact pixels, turned over) back over the painted copy, optionally a little smaller.
// node exact.mjs <painted band> [scale]   The legs shrink about the point where they leave the ice.
import { createRequire } from 'module';
import { cavern, masked, L, T } from './under-ice-layout.mjs';
const sharp = createRequire('/Users/Sina/ModernDante/package.json')('sharp');
const k = Number(process.argv[3] ?? 1);
const box = { left: 330, top: 175, width: 370, height: 415 };
const w = Math.round(box.width * k), h = Math.round(box.height * k);
const patch = await sharp(await sharp(await cavern()).extract(box).png().toBuffer()).resize(w, h).png().toBuffer();
const legs = await masked(patch, w, h, `<rect x="24" y="8" width="${w - 48}" height="${h - 30}" rx="40" fill="#fff"/>`, 12);
await sharp(process.argv[2] ?? 'verE.png').composite([{ input: legs, left: L + box.left + Math.round((box.width - w) / 2), top: T + box.top }]).png().toFile('verE-exact.png');
await sharp('verE-exact.png').extract({ left: 560, top: 0, width: 930, height: 1000 }).jpeg().toFile('verE-exact.jpg');
