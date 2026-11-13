// Blends the redrawn pieces back into each painting at twice its size.
import { createRequire } from 'module';
import fs from 'node:fs';
const require = createRequire('/Users/Sina/ModernDante/package.json');
const sharp = require('sharp');
const jobs = JSON.parse(fs.readFileSync('jobs.json', 'utf8'));
const K = 2;
const skip = new Set((process.argv[2] ?? '').split(',').filter(Boolean));
const groups = {};
for (const j of jobs) (groups[j.name.split('-')[0]] ??= []).push(j);
// Treachery was redrawn first, by hand
groups.inferno.push({ name: 'inferno-circle-9', cx: 212, cy: 1748, cw: 600, ch: 300, box: { top: 1812, bottom: 2004 }, file: '/Users/Sina/ModernDante/data/art/map/inferno-treachery-closeup.png', base: groups.inferno[0].base });

for (const [name, list] of Object.entries(groups)) {
  const base = list[0].base;
  const meta = await sharp(base).metadata();
  const comps = [];
  const used = [], missing = [];
  // Boundaries between neighbouring levels: each piece owns the rows from the midpoint to its
  // neighbour above to the midpoint to its neighbour below
  const sorted = [...list].sort((a, b) => (a.box ? a.box.top : a.cy) - (b.box ? b.box.top : b.cy));
  for (let i = 0; i < sorted.length; i++) {
    const j = sorted[i];
    const file = j.file ?? `out/${j.name}.png`;
    if (!fs.existsSync(file) || skip.has(j.name)) { missing.push(j.name); continue; }
    const prev = sorted[i - 1], next = sorted[i + 1];
    const top = j.box ? j.box.top : j.cy, bottom = j.box ? j.box.bottom : j.cy + j.ch;
    const pBottom = prev ? (prev.box ? prev.box.bottom : prev.cy + prev.ch) : 0;
    const nTop = next ? (next.box ? next.box.top : next.cy) : meta.height;
    // rows this piece owns, in painting pixels, kept inside its own crop
    const y0 = Math.max(j.cy, i === 0 ? 0 : (pBottom + top) / 2);
    const y1 = Math.min(j.cy + j.ch, i === sorted.length - 1 ? meta.height : (bottom + nTop) / 2);
    const f = 10; // feather, in painting pixels
    const w = j.cw * K, h = j.ch * K;
    const edgeL = j.cx > 0 ? f * 2 : -f * 4, edgeR = j.cx + j.cw < meta.width ? f * 2 : -f * 4;
    const my0 = (y0 - j.cy) * K + (y0 <= 0 ? -f * 4 : -f), my1 = (y1 - j.cy) * K + (y1 >= meta.height ? f * 4 : f);
    // On the mountain only the ledge itself is taken, so the open sky beside it stays one piece
    const shape = name === 'purgatorio' && j.outline
      ? `<clipPath id="rows"><rect x="${edgeL}" y="${my0}" width="${w - edgeL - edgeR}" height="${my1 - my0}"/></clipPath><polygon clip-path="url(#rows)" points="${j.outline.map(([x, y]) => `${(x - j.cx) * K},${(y - j.cy) * K}`).join(' ')}" fill="#fff" stroke="#fff" stroke-width="${f * K * 2.4}" stroke-linejoin="round"/>`
      : `<rect x="${edgeL}" y="${my0}" width="${w - edgeL - edgeR}" height="${my1 - my0}" fill="#fff"/>`;
    const mask = await sharp(Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" fill="#000"/>${shape}</svg>`)).blur(f * K * 0.6).extractChannel(0).toBuffer();
    // Keep each piece's broad tones those of the painting it came from, so no patch shows in sky or
    // rock: take the redraw's fine detail and the original's large areas of color
    const SIGMA = 20;
    const raw = img => img.removeAlpha().raw().toBuffer();
    const fine = await raw(sharp(file).resize(w, h));
    const fineLow = await raw(sharp(file).resize(w, h).blur(SIGMA));
    const origLow = await raw(sharp(base).extract({ left: j.cx, top: j.cy, width: j.cw, height: j.ch }).resize(w, h).blur(SIGMA));
    const mixed = Buffer.alloc(fine.length);
    for (let p = 0; p < fine.length; p++) mixed[p] = Math.min(255, Math.max(0, fine[p] - fineLow[p] + origLow[p]));
    // Only on the mountain, where a ledge's outline takes in some sky and the scenes barely changed.
    // Where a scene was recomposed after Doré, the old picture's tones would show through as a ghost.
    const keepTones = name === 'purgatorio';
    const piece = await sharp(keepTones ? mixed : fine, { raw: { width: w, height: h, channels: 3 } }).joinChannel(mask).png().toBuffer();
    comps.push({ input: piece, left: j.cx * K, top: j.cy * K });
    used.push(j.name);
  }
  const big = await sharp(base).resize(meta.width * K, meta.height * K, { kernel: 'lanczos3' }).png().toBuffer();
  await sharp(big).composite(comps).png().toFile(`${name}-2x.png`);
  console.log(name, 'used', used.length, 'missing', missing.join(',') || 'none');
}
