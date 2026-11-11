// Where each note attaches to the poem. A note gives its line number and quotes the exact
// words it explains, rather than counting words, so it survives edits elsewhere in the
// translation. `npm run notes:check` reports any quote that no longer matches its line.
//
// No imports, so the check script can load this file too.

/** The part of a note that says where it goes */
export interface NoteAnchor {
  /** Line number as printed beside the poem, counting from 1 across the whole canto */
  line: number;
  /** The exact words the note explains, all on that one line */
  quote: string;
}

/** Where a note sits in one line's text, the line's words joined by single spaces */
export interface NoteMark {
  /** The note's index in the canto's list of notes */
  note: number;
  start: number;
  end: number;
  quote: string;
}

export type QuoteMatch = { start: number; end: number } | { error: string };

const isWordChar = (ch: string | undefined) => !!ch && /[\p{L}\p{N}]/u.test(ch);

/** Find a quote in a line as whole words. It must appear exactly once. */
export function findQuote(text: string, quote: string): QuoteMatch {
  const q = quote.split(/\s+/).filter(Boolean).join(' ');
  if (!q) return { error: 'the quote is empty' };
  const found: number[] = [];
  for (let i = text.indexOf(q); i >= 0; i = text.indexOf(q, i + 1)) {
    if (!isWordChar(text[i - 1]) && !isWordChar(text[i + q.length])) found.push(i);
  }
  if (found.length === 0) return { error: 'the quote is not on its line' };
  if (found.length > 1) return { error: `the quote is on its line ${found.length} times` };
  return { start: found[0], end: found[0] + q.length };
}

/**
 * Place the canto's notes on its lines, given each line's words.
 * Returns each line's marks in order, by line index from 0. A note that can't be
 * placed, or that overlaps one already placed, is left out.
 */
export function placeNotes(lines: string[][], notes: NoteAnchor[]): Map<number, NoteMark[]> {
  const marks = new Map<number, NoteMark[]>();
  notes.forEach((n, note) => {
    const words = lines[n.line - 1];
    if (!words) return;
    const match = findQuote(words.join(' '), n.quote);
    if ('error' in match) return;
    const onLine = marks.get(n.line - 1) ?? [];
    if (onLine.some(m => m.start < match.end && match.start < m.end)) return;
    onLine.push({ note, start: match.start, end: match.end, quote: n.quote });
    marks.set(n.line - 1, onLine);
  });
  for (const onLine of marks.values()) onLine.sort((a, b) => a.start - b.start);
  return marks;
}
