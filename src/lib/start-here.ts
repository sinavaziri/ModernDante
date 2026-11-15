import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import page from '../../data/start-here.json';
import timings from '../../data/start-here-timings.json';

// The Start here page: its words are in data/start-here.json, and its narration (every paragraph in
// order, in the summary voice) is public/audio-summaries/start-here.mp3, made by tools/audio/summaries.mjs --intro.

export interface StartHere {
  sections: { heading: string; paragraphs: string[] }[];
  /** The page read aloud, or null until it is recorded */
  src: string | null;
  /**
   * When each word is spoken, in seconds: a list per paragraph, in page order. Null when the words have
   * changed since the recording, so the page never highlights against the wrong text.
   */
  starts: number[][] | null;
}

export function getStartHere(): StartHere {
  const file = 'audio-summaries/start-here.mp3';
  const src = fs.existsSync(path.join(process.cwd(), 'public', file)) ? `/${file}` : null;
  const text = page.sections.flatMap(section => section.paragraphs).join('\n\n');
  return { sections: page.sections, src, starts: src && timings.text === text ? timings.starts : null };
}
