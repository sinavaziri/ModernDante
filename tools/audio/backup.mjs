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
const missing = source.files - copy.files;
log(`Source: ${source.files} files, ${(source.bytes / 1e9).toFixed(2)} GB. Backup: ${copy.files} files, ${(copy.bytes / 1e9).toFixed(2)} GB.`);
if (missing > 0) {
  log(`FAILED ${missing} files are missing from the backup.`);
  process.exit(1);
}
log('A cloud-synced folder finishes uploading in the background, so check its app before deleting anything local.');
