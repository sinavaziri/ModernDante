// Words that stay lowercase inside a name, as in "Pier della Vigna".
const LOWERCASE_WORDS = new Set(['da', 'de', 'del', 'della', 'from']);

// Names that capitalizing each word can't get right.
const SPECIAL_LABELS: Record<string, string> = {
  abbot_san_zeno: 'Abbot of San Zeno',
  guido_montefeltro: 'Guido da Montefeltro',
  pisistratus_wife: "Pisistratus's Wife",
};

/** Turns a speaker id from the timing files into the name shown in the player. */
export function speakerLabel(speaker: string): string {
  if (SPECIAL_LABELS[speaker]) return SPECIAL_LABELS[speaker];
  return speaker
    .split('_')
    .map((word, index) => {
      if (word === 'st') return 'St.';
      if (index > 0 && LOWERCASE_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
