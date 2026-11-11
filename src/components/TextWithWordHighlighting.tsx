'use client';

import { Fragment, memo, type ReactNode } from 'react';
import type { TokenizedLine } from '@/lib/narration-alignment';
import type { NoteMark } from '@/lib/note-anchors';

interface TextWithWordHighlightingProps {
  lines: TokenizedLine[];
  /** The notes to underline, by line index, or null with notes off */
  marks?: ReadonlyMap<number, NoteMark[]> | null;
}

/**
 * Renders a stanza as lines of word spans. Highlighting is applied by
 * useNarrationHighlight via the data-line / data-token attributes, so this
 * component never re-renders during playback.
 */
export const TextWithWordHighlighting = memo(function TextWithWordHighlighting({ lines, marks }: TextWithWordHighlightingProps) {
  return (
    <div className="space-y-1">
      {lines.map((line) => (
        <div key={line.line} data-line={line.line} className="narration-line mb-1">
          {renderLine(line, marks?.get(line.line))}
        </div>
      ))}
    </div>
  );
});

/**
 * A line's words, with each noted phrase wrapped in `data-note` spans. The note spans sit
 * inside the word spans, so narration highlighting and click-to-play still find every word,
 * and a phrase's punctuation stays outside its underline. The spaces inside a phrase get
 * their own note spans so the underline runs unbroken.
 */
function renderLine(line: TokenizedLine, lineMarks: NoteMark[] | undefined): ReactNode {
  if (!lineMarks?.length) {
    return line.tokens.map((t, i) => (
      <Fragment key={t.token}>
        {i > 0 && ' '}
        <span data-token={t.token} className="narration-word">{t.text}</span>
      </Fragment>
    ));
  }

  const started = new Set<number>();
  const piece = (m: NoteMark, text: string, key: string) => {
    // Only a phrase's first piece takes focus, and it names the whole phrase
    const first = !started.has(m.note);
    started.add(m.note);
    return (
      <span
        key={key}
        data-note={m.note}
        className="note-mark"
        {...(first && { role: 'button', tabIndex: 0, 'aria-label': `Note: ${m.quote}` })}
      >
        {text}
      </span>
    );
  };

  let offset = 0;
  return line.tokens.map((t, i) => {
    const start = offset;
    const end = start + t.text.length;
    offset = end + 1;

    const spaceMark = i > 0 ? lineMarks.find(m => m.start < start && start <= m.end - 1) : undefined;

    const parts: ReactNode[] = [];
    let cursor = start;
    for (const m of lineMarks) {
      if (m.end <= start || m.start >= end) continue;
      const from = Math.max(m.start, start);
      const to = Math.min(m.end, end);
      if (from > cursor) parts.push(t.text.slice(cursor - start, from - start));
      parts.push(piece(m, t.text.slice(from - start, to - start), `n${m.note}-${t.token}`));
      cursor = to;
    }
    if (cursor < end) parts.push(t.text.slice(cursor - start));

    return (
      <Fragment key={t.token}>
        {i > 0 && (spaceMark ? piece(spaceMark, ' ', `s${t.token}`) : ' ')}
        <span data-token={t.token} className="narration-word">{parts}</span>
      </Fragment>
    );
  });
}
