// What the narration player remembers for a listener: their place in each canto,
// their playback speed and how they like the clock shown. All of it lives in this
// browser's storage, which can be missing or refuse writes (private windows, blocked
// site data), so every read falls back to a default and every write may silently fail.

import { AUDIO } from '@/lib/constants';

const positionKey = (cantica: string, canto: number) => `narration:position:${cantica}:${canto}`;
const RATE_KEY = 'narration:rate';
const REMAINING_KEY = 'narration:show-remaining';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage is unavailable; the player still works, it just won't remember
  }
}

/** Where the listener stopped in this canto, or 0 to start from the top */
export function getSavedPosition(cantica: string, canto: number, duration: number): number {
  const saved = Number(read(positionKey(cantica, canto)));
  return Number.isFinite(saved) && saved > AUDIO.RESUME_MARGIN && saved < duration - AUDIO.RESUME_MARGIN ? saved : 0;
}

/** Remember the listener's place. A place near either end is forgotten instead. */
export function savePosition(cantica: string, canto: number, time: number, duration: number) {
  const worthKeeping = time > AUDIO.RESUME_MARGIN && time < duration - AUDIO.RESUME_MARGIN;
  write(positionKey(cantica, canto), worthKeeping ? time.toFixed(1) : null);
}

export function getSavedRate(): number {
  const saved = Number(read(RATE_KEY));
  return (AUDIO.RATES as readonly number[]).includes(saved) ? saved : 1;
}

export function saveRate(rate: number) {
  write(RATE_KEY, rate === 1 ? null : String(rate));
}

export function getShowRemaining(): boolean {
  return read(REMAINING_KEY) === '1';
}

export function saveShowRemaining(show: boolean) {
  write(REMAINING_KEY, show ? '1' : null);
}

// The canto the player should start by itself when it opens: set just before moving
// on to the next canto, so continuous listening survives the page change. It's kept
// in memory rather than storage, so reloading a page never starts sound by surprise.
let autoplayCanto: string | null = null;

export function requestAutoplay(cantica: string, canto: number) {
  autoplayCanto = `${cantica}/${canto}`;
}

export function isAutoplayRequested(cantica: string, canto: number): boolean {
  return autoplayCanto === `${cantica}/${canto}`;
}

export function clearAutoplay() {
  autoplayCanto = null;
}
