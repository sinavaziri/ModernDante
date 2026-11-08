import type { AudioTimingData } from '@/types/audio';

/** One spoken word, matched to a word token in the displayed text */
export interface TimedToken {
  /** Global token index across the whole canto (matches data-token on the rendered span) */
  token: number;
  /** Global line index across the whole canto (matches data-line on the rendered line) */
  line: number;
  start: number;
  end: number;
}

/** A displayed line split into word tokens, with global indices for highlighting */
export interface TokenizedLine {
  line: number;
  tokens: { token: number; text: string }[];
}

// How far ahead to look for a match when the spoken and displayed words disagree
const LOOKAHEAD = 8;

function normalize(word: string): string {
  return word.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Split stanzas into lines and word tokens, numbering lines and tokens
 * sequentially across the whole canto.
 */
export function tokenizeStanzas(stanzas: string[][]): TokenizedLine[][] {
  let line = 0;
  let token = 0;
  return stanzas.map(lines =>
    lines.map(text => ({
      line: line++,
      tokens: text.split(/\s+/).filter(Boolean).map(t => ({ token: token++, text: t })),
    }))
  );
}

/**
 * Align spoken words to displayed tokens in a single forward pass over the
 * whole canto. Mismatches (punctuation, dashes, small wording differences)
 * are skipped with a bounded lookahead so one bad word can't derail the rest.
 * Returns timed tokens sorted by start time.
 */
export function alignNarration(stanzas: TokenizedLine[][], timing: AudioTimingData): TimedToken[] {
  const tokens = stanzas
    .flat()
    .flatMap(l => l.tokens.map(t => ({ token: t.token, line: l.line, norm: normalize(t.text) })))
    .filter(t => t.norm);
  const words = timing.segments
    .flatMap(seg => seg.words)
    .map(w => ({ ...w, norm: normalize(w.word) }))
    .filter(w => w.norm);

  const timed: TimedToken[] = [];
  let ti = 0;
  let wi = 0;

  while (ti < tokens.length && wi < words.length) {
    if (tokens[ti].norm === words[wi].norm) {
      timed.push({ token: tokens[ti].token, line: tokens[ti].line, start: words[wi].start, end: words[wi].end });
      ti++;
      wi++;
      continue;
    }

    // Resync on the nearest pair (token ahead, word ahead) that matches
    let best: [number, number] | null = null;
    for (let d = 1; d <= LOOKAHEAD && !best; d++) {
      for (let a = 0; a <= d; a++) {
        const t = tokens[ti + a];
        const w = words[wi + d - a];
        if (t && w && t.norm === w.norm) {
          best = [ti + a, wi + d - a];
          break;
        }
      }
    }
    if (best) {
      [ti, wi] = best;
    } else {
      ti++;
      wi++;
    }
  }

  return timed;
}

/** Index of the last timed token that has started by `time`, or -1 */
export function findTokenAt(timed: TimedToken[], time: number): number {
  let lo = 0;
  let hi = timed.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (timed[mid].start <= time) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/**
 * When the narration reaches a displayed word, for clicking a word to listen from it.
 * A word the narration skipped (a dash, or wording that differs slightly) borrows the
 * time of the nearest spoken word on its own line, preferring the one after it.
 */
export function timeForToken(timed: TimedToken[], token: number, line: number): number | null {
  if (timed.length === 0) return null;
  // Tokens rise with time, so the first timed token at or after this one is found by bisection
  let lo = 0;
  let hi = timed.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (timed[mid].token < token) lo = mid + 1;
    else hi = mid;
  }
  const after = timed[lo];
  const before = timed[lo - 1];
  if (after && (after.token === token || after.line === line)) return after.start;
  if (before && before.line === line) return before.start;
  return (after ?? before).start;
}
