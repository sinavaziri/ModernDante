// Redraws a 2048x4096 map painting in five overlapping bands, in the manner of a reference picture.
// node tiles.mjs <painting> : writes t0..t4.png beside prompt.txt and, if there is one, the reference ref.png.
// TOPS=1024,1848 in the environment redraws other bands.
import { createRequire } from 'module';
import fs from 'fs';
import { spawn } from 'child_process';
const sharp = createRequire('/Users/Sina/ModernDante/package.json')('sharp');
const src = process.argv[2];
const key = fs.readFileSync('/Users/Sina/ModernDante/.env.local', 'utf8').match(/OPENAI_API_KEY=(.*)/)[1].trim().replace(/^["']|["']$/g, '');
export const TOPS = (process.env.TOPS ?? '0,768,1536,2304,3072').split(',').map(Number);
async function run(i) {
  const name = `t${i}`;
  if (fs.existsSync(`${name}.png`)) return;
  await sharp(src).extract({ left: 0, top: TOPS[i], width: 2048, height: 1024 }).png().toFile(`${name}-in.png`);
  for (let attempt = 0; attempt < 2; attempt++) {
    const args = ['-sS', '--http1.1', '-N', '--keepalive-time', '15', '-H', 'Expect:', '-o', `${name}.sse`, 'https://api.openai.com/v1/images/edits', '-H', `Authorization: Bearer ${key}`,
      '-F', 'model=gpt-image-2.6-sunburst', '-F', `image[]=@${name}-in.png`, ...(fs.existsSync('ref.png') ? ['-F', 'image[]=@ref.png'] : []), '-F', 'prompt=<prompt.txt', '-F', 'size=2048x1024', '-F', 'quality=high', '-F', 'moderation=low', '-F', 'n=1', '-F', 'stream=true', '-F', 'partial_images=2'];
    await new Promise(res => spawn('curl', args, { stdio: 'ignore' }).on('close', res));
    let done = null;
    const text = fs.existsSync(`${name}.sse`) ? fs.readFileSync(`${name}.sse`, 'utf8') : '';
    for (const line of text.split('\n')) { if (!line.startsWith('data: ')) continue; try { const d = JSON.parse(line.slice(6)); if (d.type === 'image_edit.completed') done = d; } catch {} }
    if (done) { fs.writeFileSync(`${name}.png`, Buffer.from(done.b64_json, 'base64')); console.log(name, 'ok', done.usage?.output_tokens); return; }
    console.log(name, 'failed attempt', attempt + 1, text.slice(0, 160) || 'no reply');
  }
}
if (process.argv[1].endsWith('tiles.mjs')) {
  const queue = TOPS.map((_, i) => i);
  await Promise.all(Array.from({ length: 3 }, async () => { while (queue.length) await run(queue.shift()); }));
}
