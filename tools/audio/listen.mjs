#!/usr/bin/env node
/**
 * Builds a local page for hearing built audio before it is published: the new version beside the live one, with a
 * button for each line that changed. The check can't judge voices or performance, so this step is how that gets done.
 *
 *   node tools/audio/listen.mjs inferno:10 paradiso:23
 *   node tools/audio/listen.mjs purgatorio:9@290.2      add a button at a time in the new version
 *
 * Writes scripts/narrations_v4/listen.html and opens it.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { OUT_DIR, cantoPaths, log, readJson } from './lib.mjs';

const escapeHtml = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clock = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const label = speaker => speaker.split('_').map(part => part[0].toUpperCase() + part.slice(1)).join(' ');
const relative = file => path.relative(OUT_DIR, file).split(path.sep).join('/');

const items = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
if (!items.length) {
  console.error('Name the cantos, for example: node tools/audio/listen.mjs inferno:10 purgatorio:9@290.2');
  process.exit(1);
}

const sections = items.map((item, index) => {
  const [name, at] = item.split('@');
  const [cantica, n] = name.split(':');
  const { mp3, timings, liveMp3, liveTimings } = cantoPaths(cantica, n);
  const timing = readJson(timings);
  const live = fs.existsSync(liveTimings) ? readJson(liveTimings) : null;
  const before = new Set((live ? live.segments : []).map(s => `${s.speaker}|${s.text}`));
  const changed = timing.segments.filter(s => !before.has(`${s.speaker}|${s.text}`));
  const buttons = changed.map(s => `<button data-t="${Math.max(0, s.startTime - 1).toFixed(2)}"><b>${clock(s.startTime)} ${escapeHtml(label(s.speaker))}</b> ${escapeHtml(s.text.replace(/\s+/g, ' ').slice(0, 70))}</button>`);
  if (at) buttons.unshift(`<button data-t="${Math.max(0, parseFloat(at) - 3).toFixed(2)}"><b>${clock(parseFloat(at))}</b> The spot to check</button>`);
  const title = `${cantica[0].toUpperCase()}${cantica.slice(1)} ${n}`;
  const liveAudio = fs.existsSync(liveMp3) ? `<p class="k">Live now</p><audio controls preload="none" src="${relative(liveMp3)}"></audio>` : '';
  return `<section><h2>${title}</h2><p class="k">New version, ${clock(timing.totalDuration)}</p><audio id="a${index}" controls preload="metadata" src="${relative(mp3)}"></audio><div class="b" data-a="a${index}">${buttons.join('') || '<p>No lines changed.</p>'}</div>${liveAudio}</section>`;
});

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Audio Before Publishing</title><style>
:root{--bg:#15130f;--fg:#efe9dc;--m:#a89f90;--card:#211e19;--line:#3a352c}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 -apple-system,system-ui,sans-serif}main{max-width:760px;margin:auto;padding:20px 16px 40px}h1{font-size:22px;margin:0 0 4px}.lead{color:var(--m);margin:0 0 18px}section{background:var(--card);border-radius:8px;padding:12px 14px;margin-bottom:12px}h2{font-size:16px;margin:0 0 6px}.k{margin:8px 0 2px;color:var(--m);font-size:13px}audio{width:100%}.b{margin:8px 0}button{display:block;width:100%;text-align:left;background:none;color:var(--fg);border:1px solid var(--line);border-radius:6px;padding:6px 10px;margin-top:6px;font:14px/1.4 inherit;cursor:pointer}button b{color:var(--m);font-weight:600;margin-right:6px}button:hover{border-color:var(--m)}
</style></head><body><main><h1>Audio before publishing</h1><p class="lead">None of this is live. Listen for whether each voice is right and whether the switches sound natural. A button jumps to just before that line.</p>${sections.join('')}</main><script>
document.querySelectorAll('.b').forEach(function(g){var a=document.getElementById(g.dataset.a);g.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;a.currentTime=parseFloat(b.dataset.t);a.play();});});
</script></body></html>
`;
const file = path.join(OUT_DIR, 'listen.html');
fs.writeFileSync(file, page);
log(`Wrote ${path.relative(process.cwd(), file)}`);
if (!process.argv.includes('--no-open')) execFileSync('open', [file]);
