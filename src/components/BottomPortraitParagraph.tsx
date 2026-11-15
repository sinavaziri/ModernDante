'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

/**
 * A paragraph with a picture floated in its bottom right corner, so the picture's foot sits on the last line.
 * CSS alone can't do this reliably: the space above the picture depends on the paragraph's height, which in turn
 * depends on that space. So the space is measured and set here, and set again whenever the width changes.
 * Before the script runs, and on narrow screens, the picture simply sits at the top.
 */
export default function BottomPortraitParagraph({ picture, children }: { picture: ReactNode; children: ReactNode }) {
  const paragraph = useRef<HTMLParagraphElement>(null);
  const spacer = useRef<HTMLSpanElement>(null);
  const frame = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const p = paragraph.current;
    const gap = spacer.current;
    const box = frame.current;
    if (!p || !gap || !box) return;

    const place = () => {
      gap.style.height = '0px';
      if (getComputedStyle(gap).display === 'none') return;
      const style = getComputedStyle(p);
      const line = parseFloat(style.lineHeight);
      // Leave the picture's foot on the last line's baseline, not at the very bottom of the line box
      const lift = parseFloat(style.fontSize) * 0.6;
      const picture = box.offsetHeight;
      // The text's height moves in whole lines as the picture moves down, so there is no formula for the right
      // spot. Try the picture one line lower at a time and keep the spot where its foot is nearest the last line.
      let best = 0;
      let bestMiss = Infinity;
      for (let start = 0; start < 60 * line; start += line) {
        gap.style.height = `${start}px`;
        const miss = p.offsetHeight - lift - (start + picture);
        if (Math.abs(miss) < Math.abs(bestMiss)) {
          best = start;
          bestMiss = miss;
        }
        if (miss < 0) break;
      }
      // Close the remaining gap, unless that nudge changes how the lines break
      gap.style.height = `${best}px`;
      const height = p.offsetHeight;
      gap.style.height = `${Math.max(0, best + bestMiss)}px`;
      if (p.offsetHeight !== height) gap.style.height = `${best}px`;
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(p.parentElement ?? p);
    document.fonts?.ready.then(place);
    return () => observer.disconnect();
  }, []);

  return (
    <p ref={paragraph}>
      <span ref={spacer} aria-hidden className="float-right hidden w-px sm:block" />
      <span ref={frame} className="relative mx-auto mb-6 block w-48 sm:float-right sm:clear-right sm:mb-0 sm:ml-8 sm:w-52">
        {picture}
      </span>
      {children}
    </p>
  );
}
