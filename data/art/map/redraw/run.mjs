import { createRequire } from 'module';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { REALMS, TILES } from './spec.mjs';
const require = createRequire('/Users/Sina/ModernDante/package.json');
const sharp = require('sharp');
const { getMapOutlines, outlineBox } = await import('/Users/Sina/ModernDante/src/lib/realm-maps.ts');
const env = Object.fromEntries(fs.readFileSync('/Users/Sina/ModernDante/.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]));
const only = process.argv[2] ? process.argv[2].split(',') : null;
const STYLE = 'Crisp fine hatching and cross-hatching as in a nineteenth-century steel engraving by Gustave Doré glazed with translucent oil color, with the engraved linework visible. No text, no letters, no numbers, no border, no frame, no signature. Do not crop and do not zoom.';

const jobs = [];
for (const [realm, r] of Object.entries(REALMS)) {
  const outlines = getMapOutlines(realm);
  for (const [id, [plates, scene]] of Object.entries(r.levels)) {
    const b = outlineBox(outlines[id]);
    const w = b.right - b.left, h = b.bottom - b.top;
    let cw = Math.min(1024, Math.max(w + 40, 2 * (h + 40)));
    cw = Math.ceil(cw / 2) * 2;
    const ch = cw / 2;
    const cx = Math.round(Math.min(Math.max((b.left + b.right) / 2 - cw / 2, 0), 1024 - cw));
    const cy = Math.round(Math.min(Math.max((b.top + b.bottom) / 2 - ch / 2, 0), 2048 - ch));
    const at = ((b.top + b.bottom) / 2 - cy) / ch;
    const where = at < 0.38 ? 'in the upper part' : at > 0.62 ? 'in the lower part' : 'across the middle';
    const n = plates.length;
    const prompt = n
      ? `Two images are given. The FIRST image is a small, low-resolution detail of a painted map of ${r.place}, from Dante's Divine Comedy, a classic of world literature. The SECOND image is a reference sheet of ${n === 1 ? 'one labelled illustration' : n + ' labelled illustrations'} by Gustave Doré (1868) for the same poem, shown in color.

Redraw the FIRST image at much higher resolution. Keep its layout exactly: the same framing and edges, and every ${r.unit}, rock, wall, cloud and stretch of sky in the same place and at the same size. Everything outside the one scene named below stays as it is, only sharper and more finely drawn.

The ${r.unit} ${where} of the first image shows: ${scene}. Repaint this one scene so that it follows Doré's ${n === 1 ? 'picture' : 'pictures'} closely: his figures, their poses and grouping, his setting, light and color, fitted to the wide, low shape the scene has in the first image. ${r.pair}

The second image is only a reference; do not reproduce the sheet, its grid or its labels. ${STYLE}`
      : `This image is a small, low-resolution detail of a painted map of ${r.place}, from Dante's Divine Comedy, a classic of world literature. It shows ${scene}.

Redraw this same image at much higher resolution. Keep it exactly: the same composition, the same framing and edges, every shape in the same position and at the same size, the same colors and light. Do not add, remove or move anything. Only make it sharp and finely drawn where the original is soft. ${STYLE}`;
    jobs.push({ name: `${realm}-${id}`, base: r.base, cx, cy, cw, ch, plates, prompt, box: b, outline: outlines[id] });
  }
}
for (const [name, t] of Object.entries(TILES)) {
  t.crops.forEach(([cx, cy], i) => jobs.push({ name: `${name}-tile${i}`, base: t.base, cx, cy, cw: 1024, ch: 512, plates: [],
    prompt: `This image is a low-resolution detail of a painting: ${t.what}.

Redraw this same image at much higher resolution. Keep it exactly: the same composition, the same framing and edges, every shape in the same position and at the same size, the same colors and light. Do not add, remove or move anything. Only make it sharp and finely drawn where the original is soft. ${STYLE}` }));
}
fs.writeFileSync('jobs.json', JSON.stringify(jobs, null, 1));
if (process.argv.includes('--plan')) { for (const j of jobs) console.log(j.name, j.cx, j.cy, j.cw + 'x' + j.ch, j.plates.join('+')); process.exit(); }

async function sheet(plates, file) {
  const cw = 660, ch = 560, comps = [];
  for (let i = 0; i < plates.length; i++) {
    const img = await sharp(`/Users/Sina/ModernDante/public/images-plates/${plates[i]}.webp`).resize(cw - 20, ch - 50, { fit: 'contain', background: '#fff' }).png().toBuffer();
    comps.push({ input: img, left: i * cw + 10, top: 44 });
    comps.push({ input: Buffer.from(`<svg width="${cw}" height="40"><text x="10" y="30" font-size="26" font-family="Helvetica" font-weight="bold">Plate ${plates[i]}</text></svg>`), left: i * cw, top: 0 });
  }
  await sharp({ create: { width: cw * plates.length, height: ch, channels: 3, background: '#fff' } }).composite(comps).png().toFile(file);
}

async function run(j) {
  const out = `out/${j.name}.png`;
  if (fs.existsSync(out)) return;
  await sharp(j.base).extract({ left: j.cx, top: j.cy, width: j.cw, height: j.ch }).png().toFile(`in/${j.name}.png`);
  fs.writeFileSync(`in/${j.name}.txt`, j.prompt);
  const args = ['-sS', '--http1.1', '-N', '-o', `sse/${j.name}.txt`, 'https://api.openai.com/v1/images/edits', '-H', `Authorization: Bearer ${env.OPENAI_API_KEY}`,
    '-F', 'model=gpt-image-2.6-sunburst', '-F', `image[]=@in/${j.name}.png`];
  if (j.plates.length) { await sheet(j.plates, `in/${j.name}-sheet.png`); args.push('-F', `image[]=@in/${j.name}-sheet.png`); }
  args.push('-F', `prompt=<in/${j.name}.txt`, '-F', 'size=2048x1024', '-F', 'quality=high', '-F', 'moderation=low', '-F', 'n=1', '-F', 'stream=true', '-F', 'partial_images=2');
  const t0 = Date.now();
  await new Promise(res => spawn('curl', args, { stdio: 'ignore' }).on('close', res));
  let done = null, err = '';
  for (const line of fs.readFileSync(`sse/${j.name}.txt`, 'utf8').split('\n')) {
    if (!line.startsWith('data: ')) continue;
    try { const d = JSON.parse(line.slice(6)); if (d.type === 'image_edit.completed') done = d; else if (d.error || d.type === 'error') err = JSON.stringify(d).slice(0, 300); } catch {}
  }
  if (done) { fs.writeFileSync(out, Buffer.from(done.b64_json, 'base64')); console.log(j.name, 'ok', Math.round((Date.now() - t0) / 1000) + 's', done.usage?.output_tokens); }
  else console.log(j.name, 'FAILED', err || fs.readFileSync(`sse/${j.name}.txt`, 'utf8').slice(0, 300));
}
for (const d of ['in', 'out', 'sse']) fs.mkdirSync(d, { recursive: true });
const queue = jobs.filter(j => !only || only.some(o => j.name.startsWith(o)));
await Promise.all(Array.from({ length: 3 }, async () => { while (queue.length) await run(queue.shift()); }));
console.log('done');
