import { createRequire } from 'module';
import fs from 'fs';
import { spawn } from 'child_process';
const sharp = createRequire('/Users/Sina/ModernDante/package.json')('sharp');
const src = '/Users/Sina/ModernDante/data/art/map/inferno-under-ice.webp';
const key = fs.readFileSync('/Users/Sina/ModernDante/.env.local', 'utf8').match(/OPENAI_API_KEY=(.*)/)[1].trim().replace(/^["']|["']$/g, '');
const jobs = [];
for (const [r, y] of [[0, 300], [1, 790]]) for (const [c, x] of [[0, 100], [1, 510], [2, 920]]) jobs.push({ name: `t${r}${c}`, x, y });
async function run(j) {
  if (fs.existsSync(`${j.name}.png`)) return;
  await sharp(src).extract({ left: j.x, top: j.y, width: 1024, height: 512 }).resize(2048, 1024, { kernel: 'lanczos3' }).png().toFile(`${j.name}-in.png`);
  for (let attempt = 0; attempt < 2; attempt++) {
    const args = ['-sS', '--http1.1', '-N', '--keepalive-time', '15', '-H', 'Expect:', '-o', `${j.name}.sse`, 'https://api.openai.com/v1/images/edits', '-H', `Authorization: Bearer ${key}`,
      '-F', 'model=gpt-image-2.6-sunburst', '-F', `image[]=@${j.name}-in.png`, '-F', 'prompt=<prompt.txt', '-F', 'size=2048x1024', '-F', 'quality=high', '-F', 'moderation=low', '-F', 'n=1', '-F', 'stream=true', '-F', 'partial_images=2'];
    await new Promise(res => spawn('curl', args, { stdio: 'ignore' }).on('close', res));
    let done = null, err = '';
    const text = fs.existsSync(`${j.name}.sse`) ? fs.readFileSync(`${j.name}.sse`, 'utf8') : '';
    for (const line of text.split('\n')) { if (!line.startsWith('data: ')) continue; try { const d = JSON.parse(line.slice(6)); if (d.type === 'image_edit.completed') done = d; else if (d.error || d.type === 'error') err = JSON.stringify(d).slice(0, 200); } catch {} }
    if (done) { fs.writeFileSync(`${j.name}.png`, Buffer.from(done.b64_json, 'base64')); console.log(j.name, 'ok', done.usage?.output_tokens); return; }
    console.log(j.name, 'failed attempt', attempt + 1, err || text.slice(0, 120) || 'no reply');
  }
}
const queue = [...jobs];
await Promise.all(Array.from({ length: 3 }, async () => { while (queue.length) await run(queue.shift()); }));
