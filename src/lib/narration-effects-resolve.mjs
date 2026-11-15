// Turns a canto's sound plan (data/narration-effects.json) into times in its recording.
// Plain JavaScript so that the site (src/lib/narration-effects.ts) and the tool
// (tools/audio/effects.mjs) place every sound with the same code.

/** A word as it is compared: lower case, letters and digits only */
const plain = word => word.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

/** Every spoken word of a timing file, in order, with its start time */
export function spokenWords(timing) {
  const words = [];
  for (const segment of timing.segments) {
    for (const { word, start } of segment.words) {
      const w = plain(word);
      if (w) words.push({ w, t: start });
    }
  }
  return words;
}

/** The index of the first place `phrase` is spoken at or after word `from`, or -1 */
function findPhrase(words, phrase, from) {
  const wanted = phrase.split(/\s+/).map(plain).filter(Boolean);
  if (!wanted.length) return -1;
  for (let i = from; i <= words.length - wanted.length; i++) {
    if (wanted.every((w, k) => words[i + k].w === w)) return i;
  }
  return -1;
}

/**
 * Places a canto's plan in time.
 * plan: [{ bed: name | null, at?: phrase }, { cue: name, at: phrase, offset?: seconds }, ...] in the order heard.
 * An entry without `at` starts with the recording. Entries that can't be placed are left out and reported.
 * Returns { beds: [{ t, sound }], cues: [{ t, sound }], problems: [text] }.
 */
export function resolvePlan(plan, timing, sounds) {
  const words = spokenWords(timing);
  const beds = [];
  const cues = [];
  const problems = [];
  let from = 0;

  plan.forEach((entry, i) => {
    const isBed = 'bed' in entry;
    const name = isBed ? entry.bed : entry.cue;
    const label = `entry ${i + 1} (${isBed ? 'bed' : 'cue'} ${name})`;
    if (!isBed && !('cue' in entry)) return void problems.push(`entry ${i + 1} has neither bed nor cue`);
    if (name !== null) {
      const sound = sounds[name];
      if (!sound) return void problems.push(`${label}: no such sound`);
      if (isBed !== !!sound.loop) return void problems.push(`${label}: ${sound.loop ? 'a background can\'t be a cue' : 'a one-off sound can\'t be a background'}`);
    } else if (!isBed) {
      return void problems.push(`${label}: a cue needs a sound`);
    }

    let t = 0;
    if (entry.at) {
      const index = findPhrase(words, entry.at, from);
      if (index < 0) {
        const earlier = findPhrase(words, entry.at, 0);
        return void problems.push(`${label}: "${entry.at}" ${earlier < 0 ? 'is not spoken in the recording' : 'is only spoken before the previous entry'}`);
      }
      from = index;
      t = words[index].t;
    } else if (i > 0 || !isBed) {
      return void problems.push(`${label}: needs "at"`);
    }

    if (isBed) {
      const last = beds[beds.length - 1];
      if (last && last.sound === name) return void problems.push(`${label}: the same background is already playing`);
      beds.push({ t: Math.max(0, t - 0.5), sound: name });
    } else {
      cues.push({ t: Math.max(0, t + (entry.offset ?? 0)), sound: name });
    }
  });

  return { beds, cues, problems };
}
