import fs from 'fs';
import { spawn } from 'child_process';
import { ITEMS } from './items.mjs';
const key = fs.readFileSync('/Users/Sina/ModernDante/.env.local', 'utf8').match(/OPENAI_API_KEY=(.*)/)[1].trim().replace(/^["']|["']$/g, '');
async function run(it) {
  if (fs.existsSync(`${it.name}.png`)) return;
  for (let attempt = 0; attempt < 2; attempt++) {
    const args = ['-sS', '--http1.1', '-N', '--keepalive-time', '15', '-H', 'Expect:', '-o', `${it.name}.sse`, 'https://api.openai.com/v1/images/edits', '-H', `Authorization: Bearer ${key}`,
      '-F', 'model=gpt-image-2.6-sunburst', '-F', `image[]=@${it.name}-in.png`, '-F', 'prompt=<prompt.txt', '-F', 'size=2048x1024', '-F', 'quality=high', '-F', 'moderation=low', '-F', 'n=1', '-F', 'stream=true', '-F', 'partial_images=2'];
    await new Promise(res => spawn('curl', args, { stdio: 'ignore' }).on('close', res));
    let done = null; const text = fs.existsSync(`${it.name}.sse`) ? fs.readFileSync(`${it.name}.sse`, 'utf8') : '';
    for (const line of text.split('\n')) { if (!line.startsWith('data: ')) continue; try { const d = JSON.parse(line.slice(6)); if (d.type === 'image_edit.completed') done = d; } catch {} }
    if (done) { fs.writeFileSync(`${it.name}.png`, Buffer.from(done.b64_json, 'base64')); console.log(it.name, 'ok'); return; }
    console.log(it.name, 'failed attempt', attempt + 1, text.slice(0, 160) || 'no reply');
  }
}
const queue = [...ITEMS];
await Promise.all(Array.from({ length: 3 }, async () => { while (queue.length) await run(queue.shift()); }));
