'use client';

import { Fragment, memo } from 'react';
import type { TokenizedLine } from '@/lib/narration-alignment';

interface TextWithWordHighlightingProps {
  lines: TokenizedLine[];
}

/**
 * Renders a stanza as lines of word spans. Highlighting is applied by
 * useNarrationHighlight via the data-line / data-token attributes, so this
 * component never re-renders during playback.
 */
export const TextWithWordHighlighting = memo(function TextWithWordHighlighting({ lines }: TextWithWordHighlightingProps) {
  return (
    <div className="space-y-1">
      {lines.map((line) => (
        <div key={line.line} data-line={line.line} className="narration-line mb-1">
          {line.tokens.map((t, i) => (
            <Fragment key={t.token}>
              {i > 0 && ' '}
              <span data-token={t.token} className="narration-word">{t.text}</span>
            </Fragment>
          ))}
        </div>
      ))}
    </div>
  );
});
