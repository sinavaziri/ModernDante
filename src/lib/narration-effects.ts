import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import plans from '../../data/narration-effects.json';
import type { Cantica } from '@/lib/canticas';
import type { NarrationEffects } from '@/lib/useNarrationEffects';
import type { AudioTimingData } from '@/types/audio';
import { resolvePlan } from './narration-effects-resolve.mjs';

// The quiet sounds played under a canto's full reading: which background plays where, and the few one-off
// sounds. The plan is in data/narration-effects.json and names its places by the words spoken there, so the
// times are worked out here, at build time, from the word timings the site serves. A canto recorded again
// keeps its sounds in the right places.

interface Sound {
  loop: boolean;
  /** Its loudness as generated, in LUFS */
  lufs: number;
}

type PlanEntry = { at?: string; offset?: number } & ({ bed: string | null } | { cue: string });

const { levels, sounds, cantos } = plans as unknown as {
  levels: { bedLufs: number; cueLufs: number; fade: number };
  sounds: Record<string, Sound>;
  cantos: Record<string, PlanEntry[]>;
};

/** A canto's sounds and their times, or null for a canto read with the voice alone */
export function getNarrationEffects(cantica: Cantica, cantoNumber: number): NarrationEffects | null {
  const plan = cantos[`${cantica}:${cantoNumber}`];
  const timingFile = path.join(process.cwd(), 'public', 'audio-timings', cantica, `${cantoNumber}.json`);
  if (!plan || !fs.existsSync(timingFile)) return null;

  const timing = JSON.parse(fs.readFileSync(timingFile, 'utf8')) as AudioTimingData;
  const { beds, cues } = resolvePlan(plan, timing, sounds);
  const used: NarrationEffects['sounds'] = {};
  for (const { sound } of [...beds, ...cues]) {
    if (!sound || used[sound]) continue;
    const file = `audio-effects/${sound}.mp3`;
    if (!fs.existsSync(path.join(process.cwd(), 'public', file))) continue;
    const target = sounds[sound].loop ? levels.bedLufs : levels.cueLufs;
    used[sound] = { src: `/${file}`, gain: Math.round(10 ** ((target - sounds[sound].lufs) / 20) * 1000) / 1000 };
  }
  if (!Object.keys(used).length) return null;
  return { beds, cues, sounds: used, fade: levels.fade };
}
