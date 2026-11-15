import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import summaries from '../../data/canto-summaries.json';
import type { Cantica } from '@/lib/canticas';

// The one-minute spoken summaries: their words are in data/canto-summaries.json, and their recordings
// in public/audio-summaries/<cantica>/<n>.mp3 (made by tools/audio/summaries.mjs).

export interface CantoSummary {
  /** The summary's words, a paragraph each */
  paragraphs: string[];
  /** Its recording */
  src: string;
}

/** A canto's summary, or null until it has both its words and its recording */
export function getCantoSummary(cantica: Cantica, cantoNumber: number): CantoSummary | null {
  const text = (summaries as Record<string, Record<string, string>>)[cantica]?.[cantoNumber];
  const file = `audio-summaries/${cantica}/${cantoNumber}.mp3`;
  if (!text || !fs.existsSync(path.join(process.cwd(), 'public', file))) return null;
  return { paragraphs: text.split(/\n\s*\n/), src: `/${file}` };
}
