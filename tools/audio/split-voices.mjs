#!/usr/bin/env node
/**
 * Applies the speaker corrections in data/voice-fix-plans.json. Words that keep their voice are cut from the
 * existing recording, and only words that change voice are left for generate.mjs to record.
 *
 *   node tools/audio/split-voices.mjs estimate                  what the remaining plans would cost
 *   node tools/audio/split-voices.mjs apply inferno:33,...      split segments and update the mapping
 *   node tools/audio/split-voices.mjs recut inferno:33,...      redo a canto's existing cuts from the originals
 *
 * Makes no API calls. Original recordings stay in place, because a recut needs them.
 *
 * Alignment times drift on long recordings, so they only say roughly where a cut belongs. Every cut is then moved
 * into the real pause measured in the audio. If there is no pause, the words are recorded fresh rather than clipped.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import {
  CANTICAS, CREDITS_PER_CHARACTER, CUT_LIMITS, PLANS_PATH, cantoPaths, decode, fingerprint, loadMapping, log, pauseBetweenWords,
  readJson, saveMapping, segmentBase, spokenTimes, tagFor, voiceFor,
} from './lib.mjs';

// One voice with two deliveries: not worth paying to change only the delivery.
const SAME_VOICE = new Set(['narrator', 'dante']);
// How much of a pause to keep on the side facing the neighbouring voice.
const KEEP_PAUSE = 0.25;
const WORD_MARGIN = 0.04;

const sameConfig = (a, b) => JSON.stringify([voiceFor(a), tagFor(a)]) === JSON.stringify([voiceFor(b), tagFor(b)]);

function parseList(arg) {
  if (!arg) throw new Error('Name the cantos, for example inferno:33,purgatorio:3');
  return arg.split(',').map(item => {
    const [cantica, number] = item.split(':');
    if (!CANTICAS[cantica] || !(parseInt(number, 10) >= 1)) throw new Error(`Invalid canto: ${item}`);
    return [cantica, parseInt(number, 10)];
  });
}

/** Merges a plan into runs of one speaker, each marked to reuse the recording or be recorded fresh. */
function buildRuns(segment, recordedSpeaker, parts) {
  const runs = [];
  for (const part of parts) {
    const words = part.text.split(/\s+/).filter(word => word && word !== '/');
    if (!words.length) continue;
    let speaker = part.speaker;
    let reuse = false;
    if (SAME_VOICE.has(speaker) && SAME_VOICE.has(recordedSpeaker)) {
      speaker = recordedSpeaker;
      reuse = true;
    } else if (sameConfig(speaker, recordedSpeaker)) {
      reuse = true;
    }
    const last = runs[runs.length - 1];
    if (last && last.speaker === speaker && last.reuse === reuse) last.count += words.length;
    else runs.push({ speaker, reuse, count: words.length });
  }
  const spans = [...segment.text.matchAll(/\S+/g)].map(match => [match.index, match.index + match[0].length]);
  let next = 0;
  for (const run of runs) {
    run.charStart = spans[next][0];
    run.charEnd = spans[next + run.count - 1][1];
    run.text = segment.text.slice(run.charStart, run.charEnd);
    next += run.count;
  }
  if (next !== spans.length) throw new Error(`Segment ${segment.id}: the plan has ${next} words, the text has ${spans.length}`);
  return runs;
}

const endInPause = ([a, b]) => Math.min(a + KEEP_PAUSE, b - WORD_MARGIN);
const startInPause = ([a, b]) => Math.max(a, b - KEEP_PAUSE);

/**
 * Finds the real pause between two neighbouring pieces of a recording. Returns null if there is no pause, or if
 * cutting in it would break the check's rules, and either way those words get recorded fresh instead.
 */
function pauseBetween(meta, samples, left, right) {
  const before = spokenTimes(meta, left.charStart, left.charEnd);
  const after = spokenTimes(meta, right.charStart, right.charEnd);
  const pause = pauseBetweenWords(samples, before, after);
  if (!pause) return null;
  const end = endInPause(pause);
  const start = startInPause(pause);
  const keepsWords = before.lastLetterStart - end <= CUT_LIMITS.insideWord && start - after.start <= CUT_LIMITS.insideWord;
  const staysClose = end - before.end <= CUT_LIMITS.beyondWord && after.start - start <= CUT_LIMITS.beyondWord;
  return keepsWords && staysClose ? pause : null;
}

function cutPiece(dir, source, sourceId, piece, id, from, to) {
  const offset = source.sent.length - source.text.length;
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = source.alignment;
  const prefix = source.tag ? `${source.tag} ` : '';
  const sent = prefix + piece.text;
  const lo = offset + piece.charStart;
  const hi = offset + piece.charEnd;
  const zeros = Array(prefix.length).fill(0);
  const base = segmentBase(dir, id);
  const ffmpeg = ['-y', '-v', 'error', '-i', `${segmentBase(dir, sourceId)}.mp3`, '-ss', from.toFixed(3)];
  if (to !== null) ffmpeg.push('-to', to.toFixed(3));
  execFileSync('ffmpeg', [...ffmpeg, '-c:a', 'libmp3lame', '-b:a', '128k', `${base}.mp3`]);
  fs.writeFileSync(`${base}.json`, JSON.stringify({
    ...source,
    id,
    speaker: piece.speaker,
    text: piece.text,
    sent,
    cost: 0,
    reusedFrom: sourceId,
    cutFrom: from,
    cutTo: to,
    sourceCharStart: piece.charStart,
    sourceCharEnd: piece.charEnd,
    fingerprint: fingerprint(source.voiceId, source.voice_settings, sent),
    alignment: {
      characters: [...prefix, ...characters.slice(lo, hi)],
      character_start_times_seconds: [...zeros, ...starts.slice(lo, hi).map(t => Math.max(0, t - from))],
      character_end_times_seconds: [...zeros, ...ends.slice(lo, hi).map(t => Math.max(0, t - from))],
    },
  }));
}

function loadPlans() {
  return readJson(PLANS_PATH).segments;
}

function estimate() {
  const mapping = loadMapping();
  const cost = {};
  let segments = 0;
  let kept = 0;
  let applied = 0;
  for (const [key, plan] of Object.entries(loadPlans())) {
    const [cantica, number] = key.split(' ');
    const canto = mapping.cantos[cantica][number];
    const { dir } = cantoPaths(cantica, number);
    const byId = Object.fromEntries(canto.segments.map(segment => [segment.id, segment]));
    let pending = 0;
    for (const [id, parts] of Object.entries(plan)) {
      // A split replaces the segment with new ids, so a plan whose segment is gone has been applied.
      if (!byId[id]) continue;
      pending++;
      const meta = readJson(`${segmentBase(dir, id)}.json`);
      for (const run of buildRuns(byId[id], meta.speaker, parts)) {
        if (run.reuse) {
          kept += run.text.length;
        } else {
          const tag = tagFor(run.speaker);
          cost[key] = (cost[key] || 0) + run.text.length + (tag ? tag.length + 1 : 0);
        }
      }
    }
    segments += pending;
    if (!pending) applied++;
  }
  const characters = Object.values(cost).reduce((sum, n) => sum + n, 0);
  log(`Plans still to apply: ${segments} segments in ${Object.keys(loadPlans()).length - applied} cantos (${applied} cantos already done).`);
  log(`Characters kept from existing audio: ${kept}. To record: ${characters}, about ${Math.ceil(characters * CREDITS_PER_CHARACTER)} credits.`);
  log(`Largest: ${Object.entries(cost).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k} ${Math.ceil(n * CREDITS_PER_CHARACTER)}`).join(', ')}`);
}

function apply(cantos) {
  const mapping = loadMapping();
  const plans = loadPlans();
  for (const [cantica, number] of cantos) {
    const key = `${cantica} ${number}`;
    const plan = plans[key];
    if (!plan) {
      log(`${key}: no plan`);
      continue;
    }
    const { dir } = cantoPaths(cantica, number);
    const canto = mapping.cantos[cantica][String(number)];
    const files = fs.readdirSync(dir).filter(name => /^segment_\d{3}\.json$/.test(name)).map(name => parseInt(name.slice(8, 11), 10));
    let nextId = Math.max(...files, ...canto.segments.map(segment => segment.id)) + 1;
    const out = [];
    let cuts = 0;
    let unpaused = 0;
    for (const segment of canto.segments) {
      const parts = plan[String(segment.id)];
      if (!parts) {
        out.push(segment);
        continue;
      }
      const source = readJson(`${segmentBase(dir, segment.id)}.json`);
      const runs = buildRuns(segment, source.speaker, parts);
      if (runs.length === 1 && runs[0].reuse && runs[0].speaker === source.speaker) {
        out.push(segment);
        continue;
      }
      const samples = decode(`${segmentBase(dir, segment.id)}.mp3`);
      // A boundary with no real pause can't be cut cleanly, so both sides of it get recorded fresh.
      const pauses = runs.slice(1).map((run, i) => pauseBetween(source, samples, runs[i], run));
      pauses.forEach((pause, i) => {
        if (!pause) {
          runs[i].reuse = false;
          runs[i + 1].reuse = false;
          unpaused++;
        }
      });
      runs.forEach((run, i) => {
        const id = nextId++;
        if (run.reuse) {
          cutPiece(dir, source, segment.id, run, id, i ? startInPause(pauses[i - 1]) : 0, i < pauses.length ? endInPause(pauses[i]) : null);
          cuts++;
        }
        out.push({ id, speaker: run.speaker, text: run.text, isDialogue: run.speaker !== 'narrator', characterName: run.speaker });
      });
    }
    canto.segments = out;
    canto.totalSegments = out.length;
    log(`${key}: ${out.length} segments, ${cuts} pieces cut from existing audio${unpaused ? `, ${unpaused} boundaries without a pause will be recorded fresh` : ''}`);
  }
  saveMapping(mapping);
  log('Next: npm run audio:generate -- --only <cantos> --dry-run');
}

function recut(cantos) {
  const mapping = loadMapping();
  for (const [cantica, number] of cantos) {
    const { dir } = cantoPaths(cantica, number);
    const groups = new Map();
    for (const segment of mapping.cantos[cantica][String(number)].segments) {
      const file = `${segmentBase(dir, segment.id)}.json`;
      if (!fs.existsSync(file)) continue;
      const meta = readJson(file);
      if (meta.reusedFrom === undefined) continue;
      if (!groups.has(meta.reusedFrom)) groups.set(meta.reusedFrom, []);
      groups.get(meta.reusedFrom).push({ id: segment.id, speaker: meta.speaker, text: meta.text, charStart: meta.sourceCharStart });
    }
    let recutCount = 0;
    const problems = [];
    for (const [sourceId, pieces] of groups) {
      const source = readJson(`${segmentBase(dir, sourceId)}.json`);
      const samples = decode(`${segmentBase(dir, sourceId)}.mp3`);
      let cursor = 0;
      for (const piece of pieces) {
        // Searching can find the same words earlier in the recording, so the stored position comes first.
        piece.charStart ??= source.text.indexOf(piece.text, cursor);
        if (piece.charStart < 0) throw new Error(`${cantica} ${number} piece ${piece.id}: text not found in segment ${sourceId}`);
        piece.charEnd = piece.charStart + piece.text.length;
        cursor = piece.charEnd;
      }
      // Whatever is next to a piece in the recording, whether or not it was kept, is what it must be cut from.
      const wordsBefore = piece => ({ charStart: 0, charEnd: piece.charStart });
      const wordsAfter = piece => ({ charStart: piece.charEnd, charEnd: source.text.length });
      for (const piece of pieces) {
        let from = 0;
        let to = null;
        let ok = true;
        if (piece.charStart > 0) {
          const pause = pauseBetween(source, samples, wordsBefore(piece), piece);
          if (pause) from = startInPause(pause);
          else ok = false;
        }
        if (piece.charEnd < source.text.length) {
          const pause = pauseBetween(source, samples, piece, wordsAfter(piece));
          if (pause) to = endInPause(pause);
          else ok = false;
        }
        if (!ok) {
          problems.push(piece.id);
          continue;
        }
        cutPiece(dir, source, sourceId, piece, piece.id, from, to);
        recutCount++;
      }
    }
    log(`${cantica} ${number}: recut ${recutCount} pieces${problems.length ? `, no clean pause for ${problems.join(', ')}` : ''}`);
  }
}

const [command, list] = process.argv.slice(2);
try {
  if (command === 'estimate') estimate();
  else if (command === 'apply') apply(parseList(list));
  else if (command === 'recut') recut(parseList(list));
  else throw new Error('Commands: estimate, apply <cantos>, recut <cantos>');
} catch (error) {
  log(`FAILED ${error.message}`);
  process.exit(1);
}
