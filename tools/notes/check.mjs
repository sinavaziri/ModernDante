// Checks the notes in data/annotations against the translation and the glossary.
//
//   npm run notes:check
//
// Fails if a quote isn't on its line exactly once, two notes overlap, a note links to a
// glossary entry that doesn't exist, a note is missing its text, or a plate doesn't exist or
// hasn't had its card image made (npm run images:notes), and the same for artworks in data/art.json. Warns about glossary entries nothing
// links to and entries linked more than once in the same canto.
//
// While drafting, a batch can be checked on its own, with glossary entries that aren't merged yet:
//   node --experimental-strip-types --no-warnings tools/notes/check.mjs --only inferno/2,inferno/3 --extra drafts/inferno-2.json

import fs from 'node:fs';
import path from 'node:path';
import { findQuote } from '../../src/lib/note-anchors.ts';

const root = path.resolve(import.meta.dirname, '../..');
const cantos = JSON.parse(fs.readFileSync(path.join(root, 'data/cantos.json'), 'utf8'));
const glossary = JSON.parse(fs.readFileSync(path.join(root, 'data/glossary.json'), 'utf8'));
const notesDir = path.join(root, 'data/annotations');

const arg = name => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
/** Only these cantos, as "inferno/2,inferno/3"; all of them when not given */
const only = arg('--only')?.split(',');
/** A file of glossary entries to check the notes against as well */
const extra = arg('--extra');
if (extra) Object.assign(glossary, JSON.parse(fs.readFileSync(path.resolve(extra), 'utf8')), glossary);
const { images } = JSON.parse(fs.readFileSync(path.join(root, 'src/data/image-mappings.json'), 'utf8'));
const { widths } = JSON.parse(fs.readFileSync(path.join(root, 'src/data/note-images.json'), 'utf8'));
const art = JSON.parse(fs.readFileSync(path.join(root, 'data/art.json'), 'utf8'));

let errors = 0;
let warnings = 0;
const linked = new Set();

const error = (where, message) => {
  errors++;
  console.log(`  ✗ ${where}: ${message}`);
};
const warn = (where, message) => {
  warnings++;
  console.log(`  ! ${where}: ${message}`);
};

// Each displayed line's words, split as the canto page splits them (CantoDisplayWithAudio)
function cantoLines(modern) {
  return modern
    .split(/\n\s*\n/)
    .flatMap(stanza => stanza.split('\n').map(l => l.trim()).filter(Boolean))
    .map(line => line.split(/\s+/).filter(Boolean));
}

function checkPlate(where, number) {
  if (number === undefined) return;
  if (!images.some(i => i.imageNumber === number)) {
    error(where, `no plate ${number}`);
    return;
  }
  const missing = widths.filter(w => !fs.existsSync(path.join(root, 'public/images-notes', `${number}-${w}.webp`)));
  if (missing.length) error(where, `plate ${number} has no card image yet: run npm run images:notes`);
}

function checkArt(where, id) {
  if (id === undefined) return;
  const work = art[id];
  if (!work) {
    error(where, `no artwork "${id}" in data/art.json`);
    return;
  }
  for (const field of ['artist', 'title', 'date', 'source', 'license']) {
    if (!work[field]) error(`artwork "${id}"`, `has no ${field}`);
  }
  const missing = widths.filter(w => !fs.existsSync(path.join(root, 'public/images-notes', `art-${id}-${w}.webp`)));
  if (missing.length) error(where, `artwork "${id}" has no card image yet: run npm run images:notes`);
}

for (const [id, entry] of Object.entries(glossary)) {
  for (const field of ['name', 'tagline', 'summary']) {
    if (typeof entry[field] !== 'string' || !entry[field].trim()) error(`glossary "${id}"`, `has no ${field}`);
  }
  checkPlate(`glossary "${id}"`, entry.plate);
  checkArt(`glossary "${id}"`, entry.art);
}

for (const cantica of ['inferno', 'purgatorio', 'paradiso']) {
  const dir = path.join(notesDir, cantica);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => /^\d+\.json$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));

  for (const file of files) {
    const number = parseInt(file);
    if (only && !only.includes(`${cantica}/${number}`)) continue;
    const canto = cantos[cantica]?.find(c => c.number === number);
    console.log(`${cantica} ${number}`);
    if (!canto?.modern) {
      error(file, 'no such canto, or it has no translation');
      continue;
    }

    const lines = cantoLines(canto.modern);
    const notes = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const ranges = new Map();
    const entitiesHere = new Map();

    notes.forEach((n, i) => {
      const where = `note ${i + 1} (line ${n.line}, "${n.quote}")`;
      if (!Number.isInteger(n.line) || n.line < 1 || n.line > lines.length) {
        error(where, `line must be 1 to ${lines.length}`);
        return;
      }
      if (!!n.note === !!n.entity) error(where, 'needs either "note" or "entity", not both');
      if (n.context && !n.entity) error(where, '"context" goes only with "entity"');
      checkPlate(where, n.plate);
      checkArt(where, n.art);
      if (n.entity) {
        if (!glossary[n.entity]) error(where, `no glossary entry "${n.entity}"`);
        linked.add(n.entity);
        entitiesHere.set(n.entity, (entitiesHere.get(n.entity) ?? 0) + 1);
      }

      const match = findQuote(lines[n.line - 1].join(' '), n.quote ?? '');
      if ('error' in match) {
        error(where, `${match.error}: "${lines[n.line - 1].join(' ')}"`);
        return;
      }
      const onLine = ranges.get(n.line) ?? [];
      const overlap = onLine.find(r => r.start < match.end && match.start < r.end);
      if (overlap) error(where, `overlaps "${overlap.quote}"`);
      onLine.push({ ...match, quote: n.quote });
      ranges.set(n.line, onLine);
    });

    for (const [id, count] of entitiesHere) {
      if (count > 1) warn(`glossary "${id}"`, `linked ${count} times in this canto`);
    }
    console.log(`  ${notes.length} notes`);
  }
}

for (const id of only ? [] : Object.keys(glossary)) {
  if (!linked.has(id)) warn(`glossary "${id}"`, 'no note links to it');
}

console.log(`\n${errors} errors, ${warnings} warnings`);
process.exit(errors ? 1 : 0);
