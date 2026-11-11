// Shared by every audio tool: paths, voice lookup, fingerprints and sound measurement.
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT_DIR = path.join(ROOT, 'scripts', 'narrations_v4');
export const MAPPING_PATH = path.join(ROOT, 'data', 'speaker-mapping.json');
export const PLANS_PATH = path.join(ROOT, 'data', 'voice-fix-plans.json');
export const CANTICAS = { inferno: 34, purgatorio: 33, paradiso: 33 };
export const SITE_URL = 'https://modern-dante.vercel.app';

export const pad = n => String(n).padStart(3, '0');
export const log = line => console.log(`${new Date().toISOString().slice(11, 19)} ${line}`);
export const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

const voiceFile = readJson(path.join(ROOT, 'data', 'voices.json'));
const femaleSpeakers = new Set(voiceFile.femaleSpeakers);
const narrationOverrides = new Set(voiceFile.narrationOverrides);

export const MODEL = voiceFile.model;
export const CREDITS_PER_CHARACTER = voiceFile.creditsPerCharacter;

export function loadEnv() {
  try {
    process.loadEnvFile(path.join(ROOT, '.env.local'));
  } catch {
    // No .env.local: rely on the shell environment.
  }
}

export const loadMapping = () => readJson(MAPPING_PATH);
export const saveMapping = data => fs.writeFileSync(MAPPING_PATH, JSON.stringify(data, null, 2));

/** Parses "--all", or "--only inferno:1,paradiso:3", into [cantica, number] pairs. */
export function selectCantos(args) {
  if (args.includes('--all')) {
    return Object.entries(CANTICAS).flatMap(([cantica, count]) =>
      Array.from({ length: count }, (_, i) => [cantica, i + 1]));
  }
  const index = args.indexOf('--only');
  if (index < 0 || !args[index + 1]) throw new Error('Name the cantos: --all, or --only inferno:1,paradiso:3');
  return args[index + 1].split(',').map(item => {
    const [cantica, number] = item.split(':');
    const n = parseInt(number, 10);
    if (!CANTICAS[cantica] || !(n >= 1 && n <= CANTICAS[cantica])) throw new Error(`Invalid canto: ${item}`);
    return [cantica, n];
  });
}

export function cantoPaths(cantica, n) {
  return {
    dir: path.join(OUT_DIR, cantica, `canto_${n}`),
    mp3: path.join(OUT_DIR, cantica, `${cantica}_canto_${n}.mp3`),
    timings: path.join(OUT_DIR, cantica, `canto_${n}`, 'word-timings.json'),
    qa: path.join(OUT_DIR, cantica, `canto_${n}`, 'qa.json'),
    liveMp3: path.join(ROOT, 'public', 'audio', cantica, `${cantica}_canto_${n}.mp3`),
    liveTimings: path.join(ROOT, 'public', 'audio-timings', cantica, `${n}.json`),
  };
}

/** The configuration a speaker records with: their own voice, or the shared one for their gender. */
export function voiceFor(speaker) {
  const { voices, fallback } = voiceFile;
  return voices[speaker] || voices[femaleSpeakers.has(speaker) ? fallback.female : fallback.male];
}

export const tagFor = speaker => voiceFile.tags[speaker] || '';
export const isFemale = speaker => femaleSpeakers.has(speaker);

/** A changed fingerprint means the recording no longer matches its text, voice or settings. */
export function fingerprint(voiceId, voice_settings, sent) {
  const MODEL_ID = MODEL;
  return crypto.createHash('sha1').update(JSON.stringify({ MODEL_ID, voiceId, voice_settings, sent })).digest('hex');
}

/** Everything that determines a segment's audio. */
export function planSegment(cantica, cantoNumber, segment) {
  // Reporting clauses the mapping labels as Dante's dialogue take the narrator's delivery.
  const speaker = narrationOverrides.has(`${cantica}:${cantoNumber}:${segment.id}`) && segment.speaker === 'dante'
    ? 'narrator'
    : segment.speaker;
  const { voiceId, voice_settings } = voiceFor(speaker);
  const tag = tagFor(speaker);
  const sent = tag ? `${tag} ${segment.text}` : segment.text;
  return { id: segment.id, speaker, text: segment.text, tag, sent, voiceId, voice_settings, fingerprint: fingerprint(voiceId, voice_settings, sent) };
}

export const segmentBase = (dir, id) => path.join(dir, `segment_${pad(id)}`);

const isSpoken = char => /[\p{L}\p{N}]/u.test(char);

/**
 * Where the words in text[from, to) really start and end in a recording's alignment. Punctuation can't be used:
 * alignment gives closing punctuation a duration that stretches across the pause, right up to the next word.
 */
export function spokenTimes(meta, from, to) {
  const offset = meta.sent.length - meta.text.length;
  const { character_start_times_seconds: starts, character_end_times_seconds: ends } = meta.alignment;
  let first = from;
  let last = to - 1;
  while (first < to - 1 && !isSpoken(meta.text[first])) first++;
  while (last > from && !isSpoken(meta.text[last])) last--;
  // A last letter's start is reliable even when its end has been stretched across a pause.
  return { start: starts[offset + first], end: ends[offset + last], lastLetterStart: starts[offset + last] };
}

export function isRecorded(plan, dir) {
  const base = segmentBase(dir, plan.id);
  if (!fs.existsSync(`${base}.json`) || !fs.existsSync(`${base}.mp3`)) return false;
  try {
    return readJson(`${base}.json`).fingerprint === plan.fingerprint;
  } catch {
    return false;
  }
}

export function probeDuration(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' });
  return parseFloat(out.trim());
}

/** The site's timing format: only what the player uses, with times rounded to the millisecond. */
export function toWebTiming(timing) {
  const ms = t => Math.round(t * 1000) / 1000;
  return {
    cantica: timing.cantica,
    cantoNumber: timing.cantoNumber,
    title: timing.title,
    totalDuration: ms(timing.totalDuration),
    segments: timing.segments.map(s => ({
      id: s.id,
      speaker: s.speaker,
      text: s.text,
      startTime: ms(s.startTime),
      endTime: ms(s.endTime),
      words: s.words.map(w => ({ word: w.word, start: ms(w.start), end: ms(w.end) })),
    })),
  };
}

// --- Sound measurement. All levels are in dBFS, measured on 16 kHz mono. ---

export const RATE = 16000;

// A cut this far inside a piece's first or last word has lost words, even if it lands in silence.
// One this far outside them has picked up a neighbour's. Shared so the splitter and the check can't disagree.
export const CUT_LIMITS = { insideWord: 0.12, beyondWord: 0.6 };
export const SILENCE_DB = -45;
const CUT_SPEECH_DB = -40;
// Below this the speaker ran straight into the next word, so there is nothing clean to cut in.
const MIN_CUT_PAUSE = 0.06;
// How far alignment can be off. A pause further away than this belongs between other words, and cutting there loses them.
const BOUNDARY_TOLERANCE = 0.12;

export function decode(file) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 's16le', '-ac', '1', '-ar', String(RATE), '-'], { maxBuffer: 1 << 30 });
  return new Int16Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 2));
}

export function rangeDb(samples, from, to) {
  const a = Math.max(0, from);
  const b = Math.min(samples.length, to);
  if (b <= a) return -99;
  let sum = 0;
  for (let i = a; i < b; i++) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / (b - a));
  return rms > 0 ? 20 * Math.log10(rms / 32768) : -99;
}

export const levelAt = (samples, t, half = 0.005) => rangeDb(samples, Math.floor((t - half) * RATE), Math.floor((t + half) * RATE));

export function peakDb(samples) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  return peak ? 20 * Math.log10(peak / 32768) : -99;
}

/** Average level of the frames that contain speech, or null if nothing does. */
export function speechLevel(samples, from = 0, to = samples.length) {
  const frame = Math.floor(RATE * 0.02);
  let power = 0;
  let count = 0;
  for (let i = from; i + frame <= to; i += frame) {
    const db = rangeDb(samples, i, i + frame);
    if (db > SILENCE_DB) {
      power += 10 ** (db / 10);
      count++;
    }
  }
  return count ? 10 * Math.log10(power / count) : null;
}

/**
 * The pause that best covers the gap between two aligned words, or null. The nearest pause won't do: a short dip inside
 * the next word can sit closer than the real pause, and cutting there moves that word to the wrong side of the cut.
 */
export function pauseBetweenWords(samples, before, after) {
  const covered = ([a, b]) => Math.min(b, after.start) - Math.max(a, before.lastLetterStart);
  return pausesNear(samples, (before.end + after.start) / 2)
    .filter(([a, b]) => b - a >= MIN_CUT_PAUSE && b >= before.end - BOUNDARY_TOLERANCE && a <= after.start + BOUNDARY_TOLERANCE)
    .sort((x, y) => covered(y) - covered(x))[0] || null;
}

/** Seconds of speech reached after crossing a real pause, scanning from one time towards another in either direction. */
export function speechPastPause(samples, from, to, minPause) {
  const step = to >= from ? 0.005 : -0.005;
  let quiet = 0;
  let crossed = false;
  let speech = 0;
  for (let t = from; step > 0 ? t < to : t > to; t += step) {
    const level = levelAt(samples, t);
    if (level < SILENCE_DB) {
      quiet += 0.005;
      if (quiet >= minPause) crossed = true;
    } else {
      quiet = 0;
      if (crossed && level > CUT_SPEECH_DB) speech += 0.005;
    }
  }
  return speech;
}

/** Quiet stretches of at least 30 ms within reach of t, as [start, end], nearest first. */
export function pausesNear(samples, t, reach = 0.6) {
  const step = 0.005;
  const found = [];
  let start = null;
  for (let p = t - reach; p <= t + reach; p += step) {
    const quiet = p >= 0 && levelAt(samples, p) < SILENCE_DB;
    if (quiet && start === null) start = p;
    if (!quiet && start !== null) {
      if (p - start >= 0.03) found.push([start, p]);
      start = null;
    }
  }
  if (start !== null && t + reach - start >= 0.03) found.push([start, t + reach]);
  return found.sort((x, y) => Math.abs((x[0] + x[1]) / 2 - t) - Math.abs((y[0] + y[1]) / 2 - t));
}
