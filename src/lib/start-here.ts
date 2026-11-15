import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import page from '../../data/start-here.json';

// The Start here page: its words are in data/start-here.json, and its narration (every paragraph in
// order, in the summary voice) is public/audio-summaries/start-here.mp3, made by tools/audio/summaries.mjs --intro.

export interface StartHere {
  sections: { heading: string; paragraphs: string[] }[];
  /** The page read aloud, or null until it is recorded */
  src: string | null;
}

export function getStartHere(): StartHere {
  const file = 'audio-summaries/start-here.mp3';
  return { sections: page.sections, src: fs.existsSync(path.join(process.cwd(), 'public', file)) ? `/${file}` : null };
}
