#!/usr/bin/env node
/**
 * Publishes named cantos and nothing else. It refuses unless they pass the check, copies their MP3 and timings into
 * public/, and commits them with only their entries from data/speaker-mapping.json. Work on other cantos stays
 * uncommitted, even though it lives in the same file.
 *
 *   node tools/audio/publish.mjs --only inferno:10                commit locally
 *   node tools/audio/publish.mjs --only inferno:10 --dry-run      show what would be committed
 *   node tools/audio/publish.mjs --only inferno:10 --push         commit and push, which deploys
 *   node tools/audio/publish.mjs --only inferno:10 --verify       compare the live site with public/
 *   Add --message "..." to set the commit message.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { MAPPING_PATH, ROOT, SITE_URL, cantoPaths, loadMapping, log, readJson, selectCantos, toWebTiming } from './lib.mjs';

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 30 }).trim();
const relative = file => path.relative(ROOT, file);

function checkCantos(list) {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', path.join(ROOT, 'tools/audio/check.mjs'), '--only', list], { stdio: 'inherit' });
  return result.status === 0;
}

/** The committed mapping with only these cantos' entries taken from the working copy. */
function mappingForCommit(cantos) {
  const committed = JSON.parse(git('show', `HEAD:${relative(MAPPING_PATH)}`));
  const working = loadMapping();
  for (const [cantica, n] of cantos) committed.cantos[cantica][String(n)] = working.cantos[cantica][String(n)];
  return JSON.stringify(committed, null, 2);
}

async function verify(cantos) {
  let bad = 0;
  for (const [cantica, n] of cantos) {
    const { liveMp3, liveTimings } = cantoPaths(cantica, n);
    const head = await fetch(`${SITE_URL}/audio/${cantica}/${cantica}_canto_${n}.mp3`, { method: 'HEAD' });
    const size = parseInt(head.headers.get('content-length') || '0', 10);
    const timing = await fetch(`${SITE_URL}/audio-timings/${cantica}/${n}.json`);
    const sameTiming = timing.ok && (await timing.text()) === fs.readFileSync(liveTimings, 'utf8');
    const ok = head.ok && size === fs.statSync(liveMp3).size && sameTiming;
    if (!ok) bad++;
    log(`${ok ? 'ok  ' : 'FAIL'} ${cantica} ${n}: MP3 ${head.status}, ${size} bytes; timings ${timing.status}${sameTiming ? ', identical' : ', DIFFER'}`);
  }
  return bad === 0;
}

async function main() {
  const args = process.argv.slice(2);
  const cantos = selectCantos(args);
  const list = cantos.map(([cantica, n]) => `${cantica}:${n}`).join(',');

  if (args.includes('--verify')) {
    if (!(await verify(cantos))) process.exit(1);
    return;
  }

  const staged = git('diff', '--cached', '--name-only');
  if (staged) throw new Error(`Other changes are already staged, so a commit would include them:\n${staged}`);
  if (!checkCantos(list)) throw new Error('The check failed. Nothing was published.');

  const dryRun = args.includes('--dry-run');
  const files = [];
  for (const [cantica, n] of cantos) {
    const { mp3, timings, liveMp3, liveTimings } = cantoPaths(cantica, n);
    const web = JSON.stringify(toWebTiming(readJson(timings)));
    if (dryRun) {
      files.push(relative(liveMp3), relative(liveTimings));
      continue;
    }
    fs.mkdirSync(path.dirname(liveTimings), { recursive: true });
    fs.copyFileSync(mp3, liveMp3);
    fs.writeFileSync(liveTimings, web);
    files.push(relative(liveMp3), relative(liveTimings));
  }
  log(`${dryRun ? 'Would commit' : 'Committing'}: ${relative(MAPPING_PATH)} (these cantos' entries only), ${files.length} files`);
  if (dryRun) {
    for (const file of files) log(`  ${file}`);
    return;
  }

  const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], { cwd: ROOT, input: mappingForCommit(cantos), encoding: 'utf8', maxBuffer: 1 << 30 }).trim();
  git('update-index', '--cacheinfo', `100644,${blob},${relative(MAPPING_PATH)}`);
  git('add', '--', ...files);

  const messageAt = args.indexOf('--message');
  const message = messageAt >= 0 ? args[messageAt + 1] : `Publish narration: ${cantos.map(([cantica, n]) => `${cantica} ${n}`).join(', ')}`;
  git('commit', '-m', message);
  log(`Committed ${git('rev-parse', '--short', 'HEAD')}: ${git('diff', '--stat', 'HEAD~1', 'HEAD').split('\n').pop().trim()}`);

  if (args.includes('--push')) {
    git('push', 'origin', 'HEAD:main');
    log('Pushed. When Vercel finishes, confirm with --verify, then listen on the live page.');
  } else {
    log('Not pushed. Add --push to deploy.');
  }
}

main().catch(error => {
  log(`FAILED ${error.message}`);
  process.exit(1);
});
