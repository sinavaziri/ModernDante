'use client';

import { useMemo, useRef, useEffect, useCallback } from 'react';
import { LAYOUT } from '@/lib/constants';

interface WordTiming {
  word: string;
  start: number;
  end: number;
  charStart: number;
  charEnd: number;
}

interface AudioSegment {
  id: number;
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  duration: number;
  words: WordTiming[];
}

interface TextWithWordHighlightingProps {
  text: string;
  segment: AudioSegment | null;
  currentTime: number;
  isActive: boolean;
  onActiveWordVisibilityChange?: (isVisible: boolean, scrollToWord: () => void) => void;
}

// Normalize text for comparison
function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^\w']/g, '');
}

export function TextWithWordHighlighting({
  text,
  segment,
  currentTime,
  isActive,
  onActiveWordVisibilityChange,
}: TextWithWordHighlightingProps) {
  const activeLineRef = useRef<HTMLDivElement>(null);
  const lastVisibilityRef = useRef<boolean | null>(null);

  // Parse text into lines
  const parsedLines = useMemo(() => {
    return text.split('\n').map((line, index) => ({
      lineIndex: index,
      text: line,
      isEmpty: !line.trim(),
    }));
  }, [text]);

  // Build mapping of lines to timing data
  const lineTimings = useMemo(() => {
    if (!segment || !segment.words.length) return null;

    // Split text into lines and map words to lines
    const lines = text.split('\n');
    const timings: Array<{ lineIndex: number; startTime: number; endTime: number }> = [];

    const segmentWords = segment.words;

    // Find the starting word index by matching the first few words of our text
    const textWords = text.split(/\s+/).filter(w => w.trim()).map(w => normalizeWord(w));
    if (textWords.length === 0) return null;

    // Search for where this stanza starts in the segment words
    let startWordIndex = 0;
    const searchWindowSize = Math.min(3, textWords.length);

    for (let i = 0; i < segmentWords.length; i++) {
      let matched = true;
      for (let j = 0; j < searchWindowSize && i + j < segmentWords.length; j++) {
        if (normalizeWord(segmentWords[i + j].word) !== textWords[j]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        startWordIndex = i;
        break;
      }
    }

    let wordIndex = startWordIndex;

    lines.forEach((line, lineIndex) => {
      if (!line.trim()) return;

      // Count words in this line
      const lineWords = line.split(/\s+/).filter(w => w.trim());
      const normalizedLineWords = lineWords.map(w => normalizeWord(w));

      // Find matching words in segment
      let lineStartTime: number | null = null;
      let lineEndTime: number | null = null;
      let matchedWords = 0;

      // Try to match line words with segment words
      for (let i = wordIndex; i < segmentWords.length && matchedWords < lineWords.length; i++) {
        const segmentWord = normalizeWord(segmentWords[i].word);
        if (segmentWord === normalizedLineWords[matchedWords]) {
          if (lineStartTime === null) {
            lineStartTime = segmentWords[i].start;
          }
          lineEndTime = segmentWords[i].end;
          matchedWords++;
          wordIndex = i + 1;
        }
      }

      if (lineStartTime !== null && lineEndTime !== null) {
        timings.push({
          lineIndex,
          startTime: lineStartTime,
          endTime: lineEndTime,
        });
      }
    });

    return timings;
  }, [text, segment]);

  // Find the currently active line
  const activeLineIndex = useMemo(() => {
    if (!lineTimings || !isActive) return null;

    for (const timing of lineTimings) {
      if (currentTime >= timing.startTime && currentTime <= timing.endTime) {
        return timing.lineIndex;
      }
    }
    return null;
  }, [lineTimings, currentTime, isActive]);

  // Function to scroll to the active line
  const scrollToActiveLine = useCallback(() => {
    if (!activeLineRef.current) return;

    const element = activeLineRef.current;
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const targetY = window.scrollY + rect.top - (viewportHeight / 2) + (rect.height / 2);

    window.scrollTo({
      top: targetY,
      behavior: 'smooth',
    });
  }, []);

  // Track visibility of active line
  useEffect(() => {
    if (!activeLineRef.current || !onActiveWordVisibilityChange) return;

    const element = activeLineRef.current;

    const checkVisibility = () => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const isVisible = rect.top >= LAYOUT.HEADER_HEIGHT && rect.bottom <= (viewportHeight - LAYOUT.AUDIO_PLAYER_HEIGHT);

      if (lastVisibilityRef.current !== isVisible) {
        lastVisibilityRef.current = isVisible;
        onActiveWordVisibilityChange(isVisible, scrollToActiveLine);
      }
    };

    checkVisibility();
    window.addEventListener('scroll', checkVisibility, { passive: true });

    return () => {
      window.removeEventListener('scroll', checkVisibility);
    };
  }, [activeLineIndex, onActiveWordVisibilityChange, scrollToActiveLine]);

  // Calculate style for a line based on timing
  const getLineStyle = useCallback((lineIndex: number): React.CSSProperties => {
    if (!isActive || !lineTimings) {
      return { opacity: 0.6 };
    }

    const timing = lineTimings.find(t => t.lineIndex === lineIndex);
    if (!timing) {
      return { opacity: 0.6 };
    }

    const lineStart = timing.startTime;
    const lineEnd = timing.endTime;

    // Currently reading this line - only this line is highlighted
    if (currentTime >= lineStart && currentTime <= lineEnd) {
      return {
        opacity: 1,
        color: `rgb(128, 0, 32)`,
        fontWeight: 500,
      };
    }

    // All other lines (unread or already read) - same dim style
    return { opacity: 0.6 };
  }, [currentTime, isActive, lineTimings]);

  // If no timing data, render plain text
  if (!segment) {
    return (
      <div className="space-y-1">
        {parsedLines.map((line) => (
          <div key={line.lineIndex} className="mb-1">
            {line.isEmpty ? '\u00A0' : line.text}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {parsedLines.map((line) => {
        if (line.isEmpty) {
          return <div key={line.lineIndex} className="mb-1">&nbsp;</div>;
        }

        const isActiveLine = line.lineIndex === activeLineIndex;
        const style = getLineStyle(line.lineIndex);

        return (
          <div
            key={line.lineIndex}
            ref={isActiveLine ? activeLineRef : null}
            className="mb-1"
            style={style}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
}
