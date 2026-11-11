import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import artData from '../../data/art.json';
import glossaryData from '../../data/glossary.json';
import noteImages from '@/data/note-images.json';
import { getAllCanticas, getCanticaInfo, toRoman, type Cantica } from '@/lib/canticas';
import { getPlate, titleCase, type ImageData } from '@/lib/image-mappings';
import type { NoteAnchor } from '@/lib/note-anchors';

// Notes for the annotated reading. Each canto's notes are in data/annotations/<cantica>/<n>.json.
// The people, places and ideas they link to are written once, in data/glossary.json.

export interface Note extends NoteAnchor {
  /** A note on this passage alone */
  note?: string;
  /** Or the glossary entry this phrase links to */
  entity?: string;
  /** With an entry: what it means in this passage, shown under the entry's summary */
  context?: string;
  /** A Doré plate to show at the top of the card, by number. Takes the place of the entry's picture. */
  plate?: number;
  /** Or an artwork from data/art.json, by id */
  art?: string;
}

interface GlossaryEntry {
  name: string;
  /** A few words under the name, such as "Roman poet, 70–19 BC" */
  tagline: string;
  summary: string;
  /** A Doré plate to show at the top of the card wherever the entry is linked, by number */
  plate?: number;
  /** Or an artwork from data/art.json, by id, for a figure Doré didn't draw */
  art?: string;
}

/** Public-domain and CC0 art from Wikimedia Commons, credited on the card */
interface Artwork {
  artist: string;
  title: string;
  date: string;
  /** A remark after the date, such as "study" */
  note?: string;
  /** Its page on Wikimedia Commons */
  source: string;
}

/** An artwork as a note card shows it: a wide crop made by `npm run images:notes`, with its credit */
export interface NoteArt extends Artwork {
  src: string;
  srcSet: string;
}

/** A plate as a note card shows it: a wide crop made by `npm run images:notes`, and the full plate on a click */
export interface NotePlate {
  image: ImageData;
  cantica: Cantica;
  title: string;
  /** The canto the plate illustrates, such as "Inferno I" */
  label: string;
  /** A link to that canto, or null when it's this one */
  href: string | null;
  src: string;
  srcSet: string;
}

export interface Entity extends GlossaryEntry {
  /** The other annotated cantos that link to this entry, in the poem's order */
  alsoIn: { href: string; label: string }[];
}

export interface CantoNotes {
  notes: Note[];
  /** The glossary entries this canto's notes link to, by id */
  entities: Record<string, Entity>;
  /** The plates this canto's notes and entries show, by number */
  plates: Record<number, NotePlate>;
  /** The artworks they show, by id */
  art: Record<string, NoteArt>;
}

const glossary: Record<string, GlossaryEntry> = glossaryData;
const artworks: Record<string, Artwork> = artData;
const NOTES_DIR = path.join(process.cwd(), 'data', 'annotations');

function readNotes(cantica: Cantica, canto: number): Note[] | null {
  const file = path.join(NOTES_DIR, cantica, `${canto}.json`);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Note[]) : null;
}

function notePlate(number: number, here: { cantica: Cantica; canto: number }): NotePlate | null {
  const plate = getPlate(number);
  if (!plate) return null;
  const cantica = plate.cantica as Cantica;
  const [smallest] = noteImages.widths;
  return {
    image: plate,
    cantica,
    title: titleCase(plate.title),
    label: `${getCanticaInfo(cantica)?.displayName} ${toRoman(plate.canto)}`,
    href: cantica === here.cantica && plate.canto === here.canto ? null : `/${cantica}/${plate.canto}`,
    src: `/images-notes/${number}-${smallest}.webp`,
    srcSet: noteImages.widths.map(w => `/images-notes/${number}-${w}.webp ${w}w`).join(', '),
  };
}

function noteArt(id: string): NoteArt | null {
  const work = artworks[id];
  if (!work) return null;
  const [smallest] = noteImages.widths;
  return {
    artist: work.artist,
    title: work.title,
    date: work.date,
    ...(work.note && { note: work.note }),
    source: work.source,
    src: `/images-notes/art-${id}-${smallest}.webp`,
    srcSet: noteImages.widths.map(w => `/images-notes/art-${id}-${w}.webp ${w}w`).join(', '),
  };
}

let cantosByEntity: Map<string, { cantica: Cantica; canto: number }[]> | null = null;

/** Every annotated canto that links to each glossary entry, in the poem's order */
function entityMentions() {
  if (cantosByEntity) return cantosByEntity;
  const mentions = new Map<string, { cantica: Cantica; canto: number }[]>();
  for (const { name: cantica } of getAllCanticas()) {
    const dir = path.join(NOTES_DIR, cantica);
    if (!fs.existsSync(dir)) continue;
    const cantos = fs
      .readdirSync(dir)
      .flatMap(file => /^(\d+)\.json$/.exec(file)?.[1] ?? [])
      .map(Number)
      .sort((a, b) => a - b);
    for (const canto of cantos) {
      const ids = new Set(readNotes(cantica, canto)?.flatMap(n => n.entity ?? []));
      for (const id of ids) mentions.set(id, [...(mentions.get(id) ?? []), { cantica, canto }]);
    }
  }
  cantosByEntity = mentions;
  return mentions;
}

/** A canto's notes and the glossary entries they link to, or null for a canto without notes */
export function getCantoNotes(cantica: Cantica, canto: number): CantoNotes | null {
  // A link to a missing entry is dropped here. npm run notes:check reports it.
  const notes = readNotes(cantica, canto)?.filter(n => !n.entity || glossary[n.entity]);
  if (!notes?.length) return null;

  const entities: Record<string, Entity> = {};
  for (const id of new Set(notes.flatMap(n => n.entity ?? []))) {
    entities[id] = {
      ...glossary[id],
      alsoIn: (entityMentions().get(id) ?? [])
        .filter(m => m.cantica !== cantica || m.canto !== canto)
        .map(m => ({
          href: `/${m.cantica}/${m.canto}`,
          label: `${getCanticaInfo(m.cantica)?.displayName} ${toRoman(m.canto)}`,
        })),
    };
  }

  const plates: Record<number, NotePlate> = {};
  const numbers = [...notes.map(n => n.plate), ...Object.values(entities).map(e => e.plate)];
  for (const number of new Set(numbers)) {
    const plate = number ? notePlate(number, { cantica, canto }) : null;
    if (number && plate) plates[number] = plate;
  }
  const art: Record<string, NoteArt> = {};
  for (const id of new Set([...notes.map(n => n.art), ...Object.values(entities).map(e => e.art)])) {
    const work = id ? noteArt(id) : null;
    if (id && work) art[id] = work;
  }
  return { notes, entities, plates, art };
}
