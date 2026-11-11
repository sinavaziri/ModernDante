// Prints a canto's translation with the line numbers the notes use.
//
//   node tools/notes/lines.mjs inferno 5
//
// Each line is "number<TAB>modern line". With --original, Longfellow's text follows for reference.

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const [cantica, number] = process.argv.slice(2);
const cantos = JSON.parse(fs.readFileSync(path.join(root, 'data/cantos.json'), 'utf8'));
const canto = cantos[cantica]?.find(c => c.number === Number(number));
if (!canto?.modern) {
  console.error('Usage: node tools/notes/lines.mjs <inferno|purgatorio|paradiso> <canto number> [--original]');
  process.exit(1);
}

// Split as the canto page splits it (CantoDisplayWithAudio), which is also how notes:check counts
const lines = canto.modern
  .split(/\n\s*\n/)
  .flatMap(stanza => stanza.split('\n').map(l => l.trim()).filter(Boolean))
  .map(line => line.split(/\s+/).filter(Boolean).join(' '));

console.log(`${cantica} ${canto.number}: ${canto.subtitle ?? ''}`.slice(0, 200));
lines.forEach((line, i) => console.log(`${i + 1}\t${line}`));
if (process.argv.includes('--original')) console.log(`\n--- Longfellow ---\n${canto.original}`);
