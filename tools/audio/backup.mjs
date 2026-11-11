#!/usr/bin/env node
/**
 * Copies the recorded segments to AUDIO_BACKUP_DIR (set it in .env.local). Those recordings exist nowhere else, and
 * they are what make small edits cheap: without them, changing one line means re-recording its whole canto.
 * Run it after any generation. It only adds and updates, and never deletes from the backup.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { OUT_DIR, loadEnv, log } from './lib.mjs';

function tally(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const inner = tally(full);
      files += inner.files;
      bytes += inner.bytes;
    } else {
      files++;
      bytes += fs.statSync(full).size;
    }
  }
  return { files, bytes };
}

loadEnv();
const target = process.env.AUDIO_BACKUP_DIR;
if (!target) {
  log('FAILED Set AUDIO_BACKUP_DIR in .env.local to the folder the backup should go in.');
  process.exit(1);
}
fs.mkdirSync(target, { recursive: true });
execFileSync('rsync', ['-rt', `${OUT_DIR}/`, `${target}/`], { stdio: 'inherit' });
const source = tally(OUT_DIR);
const copy = tally(target);
log(`Source: ${source.files} files, ${(source.bytes / 1e9).toFixed(2)} GB. Backup: ${copy.files} files, ${(copy.bytes / 1e9).toFixed(2)} GB.`);
// A second pass that copies nothing lists whatever still differs. Counting files wouldn't do: the backup
// never deletes, so old files left in it could make up the numbers for new ones that are missing.
const differing = execFileSync('rsync', ['-rtn', '--out-format=%n', `${OUT_DIR}/`, `${target}/`], { encoding: 'utf8', maxBuffer: 1 << 28 })
  .split('\n').filter(name => name && !name.endsWith('/'));
if (differing.length > 0) {
  log(`FAILED ${differing.length} files are missing from the backup or differ from it, such as ${differing.slice(0, 3).join(', ')}.`);
  process.exit(1);
}
log('A cloud-synced folder finishes uploading in the background, so check its app before deleting anything local.');
