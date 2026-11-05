#!/usr/bin/env node
// Compares what the live MP3s actually say with their script, using local speech-to-text.
// Speech-to-text mishears names and old words, so a finding is a place to listen to, not proof.
//   npm run audio:speech -- --all
//   npm run audio:speech -- --only inferno:10
// Needs `uv` and an Apple Silicon Mac. Costs no credits. The first run downloads a 1.6 GB model.

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { RATE, ROOT, SILENCE_DB, cantoPaths, decode, log, rangeDb, readJson, selectCantos } from './lib.mjs';

const TRANSCRIPTS = path.join(ROOT, 'scripts', 'transcripts');
const CLIPS = path.join(TRANSCRIPTS, 'clips');
const REPORT = path.join(TRANSCRIPTS, 'report.json');
const CLIP_REACH = 8; // seconds either side of a finding to listen to again
const CLIP_SECONDS_PER_WORD = 0.6; // extra clip length, so a long passage fits inside its own clip
const CLIP_MATCH = 0.75; // how alike the words must be to count as heard on the second listen

const LIMITS = {
  minWords: 3, // shorter differences are nearly always mishearing
  maxSimilarity: 0.6, // how alike the two sides' letters can be and still count as different
  mergeAcross: 2, // matched words a single difference can span, since a stray "the" can split one
  timingJump: 1.5, // seconds speech can move against the timings between neighbouring words
  jumpWords: 7, // words on each side whose median timing is compared
  unheardSeconds: 2, // seconds of sound with no words before it counts as speech nobody heard
};

const normalize = text => text
  .toLowerCase()
  .replace(/\[[^\]]*\]/g, ' ') // delivery tags aren't spoken
  .replace(/['’‘]/g, '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .split(/\s+/)
  .filter(Boolean);

function similarity(a, b) {
  const x = a.join('');
  const y = b.join('');
  if (!x.length && !y.length) return 1;
  let row = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const next = [i];
    for (let j = 1; j <= y.length; j++) {
      next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return 1 - row[y.length] / Math.max(x.length, y.length);
}

/** Longest common subsequence, as index pairs. */
function matchWords(expected, heard) {
  const width = heard.length + 1;
  const table = new Uint16Array((expected.length + 1) * width);
  for (let i = expected.length - 1; i >= 0; i--) {
    for (let j = heard.length - 1; j >= 0; j--) {
      table[i * width + j] = expected[i].word === heard[j].word
        ? table[(i + 1) * width + j + 1] + 1
        : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  const pairs = [];
  for (let i = 0, j = 0; i < expected.length && j < heard.length;) {
    if (expected[i].word === heard[j].word) pairs.push([i++, j++]);
    else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) i++;
    else j++;
  }
  return pairs;
}

/** The stretches where script and speech differ, joined across very short agreements. */
function differences(expected, heard) {
  const pairs = matchWords(expected, heard);
  const gaps = [];
  let lastExpected = 0;
  let lastHeard = 0;
  for (const [i, j] of [...pairs, [expected.length, heard.length]]) {
    if (i > lastExpected || j > lastHeard) gaps.push({ e0: lastExpected, e1: i, h0: lastHeard, h1: j });
    lastExpected = i + 1;
    lastHeard = j + 1;
  }
  const merged = [];
  for (const gap of gaps) {
    const previous = merged[merged.length - 1];
    if (previous && gap.e0 - previous.e1 <= LIMITS.mergeAcross && gap.h0 - previous.h1 <= LIMITS.mergeAcross) {
      previous.e1 = gap.e1;
      previous.h1 = gap.h1;
    } else {
      merged.push({ ...gap });
    }
  }
  return merged;
}

const median = values => [...values].sort((a, b) => a - b)[values.length >> 1];
const wordsAfter = (expected, index) => expected.slice(index, index + 10).map(w => w.word).join(' ');

/**
 * Places where speech falls out of step with the timings. Speech-to-text tidies away
 * repeats and stutters as it writes, so a repeated passage never shows in the words,
 * but every word after it runs late.
 */
function timingJumps(expected, heard) {
  const pairs = matchWords(expected, heard);
  const offsets = pairs.map(([i, j]) => heard[j].start - expected[i].start);
  const reach = LIMITS.jumpWords;
  const jumps = offsets.map((_, k) => (k >= reach && k + reach <= offsets.length
    ? median(offsets.slice(k, k + reach)) - median(offsets.slice(k - reach, k))
    : 0));

  const found = [];
  jumps.forEach((jump, k) => {
    if (Math.abs(jump) < LIMITS.timingJump) return;
    if (found.length && k - found[found.length - 1] <= reach) return;
    const nearby = jumps.slice(k, k + reach + 1).map(Math.abs);
    found.push(k + nearby.indexOf(Math.max(...nearby)));
  });
  return found.map(k => {
    const [i, j] = pairs[k];
    return { time: heard[j].start, segment: expected[i].segment, seconds: jumps[k], script: wordsAfter(expected, i) };
  });
}

/**
 * Long stretches of audible sound where no words were heard. A repeat the voice model
 * made itself is inside that recording's timings too, so it causes no timing jump.
 */
function unheardSpeech(samples, heard) {
  const duration = samples.length / RATE;
  const frame = Math.floor(RATE * 0.05);
  const edges = [{ start: 0 }, ...heard, { start: duration }];
  const found = [];
  for (let k = 1; k < edges.length; k++) {
    // A word is under a second long, so anything beyond that isn't the word itself.
    const from = edges[k - 1].start + (k === 1 ? 0 : 1);
    const to = edges[k].start;
    if (to - from < LIMITS.unheardSeconds) continue;
    let voiced = 0;
    for (let at = Math.floor(from * RATE); at + frame <= to * RATE; at += frame) {
      if (rangeDb(samples, at, at + frame) > SILENCE_DB) voiced += 0.05;
    }
    if (voiced >= LIMITS.unheardSeconds) found.push({ time: from, index: k - 1, seconds: voiced });
  }
  return found;
}

function compareCanto(cantica, n, transcript, timing, samples) {
  const expected = timing.segments.flatMap(segment =>
    segment.words.flatMap(word =>
      normalize(word.word).map(token => ({ word: token, start: word.start, segment }))));
  const heard = transcript.segments.flatMap(segment =>
    (segment.words || []).flatMap(word =>
      normalize(word.word).map(token => ({ word: token, start: word.start, end: word.end }))));

  const measured = timingJumps(expected, heard).map(jump => ({
    canto: `${cantica}:${n}`,
    time: Number(jump.time.toFixed(1)),
    segment: jump.segment.id,
    speaker: jump.segment.speaker,
    kind: jump.seconds > 0 ? 'runs long, possibly repeated' : 'runs short, possibly lost',
    seconds: Number(jump.seconds.toFixed(1)),
    script: jump.script,
    speech: '',
  }));
  for (const gap of unheardSpeech(samples, heard)) {
    const after = expected.find(word => word.start >= gap.time) ?? expected[expected.length - 1];
    measured.push({
      canto: `${cantica}:${n}`,
      time: Number(gap.time.toFixed(1)),
      segment: after.segment.id,
      speaker: after.segment.speaker,
      kind: 'sound with no words heard',
      seconds: Number(gap.seconds.toFixed(1)),
      script: wordsAfter(expected, expected.indexOf(after)),
      speech: '',
    });
  }

  const findings = [];
  let minor = 0;
  for (const gap of differences(expected, heard)) {
    const script = expected.slice(gap.e0, gap.e1);
    const speech = heard.slice(gap.h0, gap.h1);
    const words = Math.max(script.length, speech.length);
    const score = similarity(script.map(w => w.word), speech.map(w => w.word));
    // Speech-to-text writes numbers as digits, which never look like the spelled-out script.
    const hasDigits = speech.some(w => /\d/.test(w.word));
    if (words < LIMITS.minWords || score >= LIMITS.maxSimilarity || hasDigits) {
      minor++;
      continue;
    }
    const before = heard[gap.h0 - 1];
    const time = speech[0]?.start ?? before?.end ?? 0;
    const segment = script[0]?.segment ?? expected[Math.min(gap.e0, expected.length - 1)].segment;
    findings.push({
      canto: `${cantica}:${n}`,
      time: Number(time.toFixed(1)),
      segment: segment.id,
      speaker: segment.speaker,
      kind: !speech.length ? 'not heard' : !script.length ? 'extra speech' : 'different',
      similarity: Number(score.toFixed(2)),
      script: script.map(w => w.word).join(' '),
      speech: speech.map(w => w.word).join(' '),
    });
  }
  return { canto: `${cantica}:${n}`, scriptWords: expected.length, heardWords: heard.length, minor, findings, measured };
}

function transcribe(pairs) {
  const run = spawnSync('uv', ['run', '--quiet', '--script', path.join(ROOT, 'tools/audio/transcribe.py'), ...pairs], { stdio: 'inherit' });
  if (run.status !== 0) throw new Error(`Transcription failed with status ${run.status}`);
}

/** How closely the best run of words in `heard` matches `target`. */
function bestMatch(target, heard) {
  let best = 0;
  for (let size = Math.max(1, target.length - 1); size <= target.length + 1; size++) {
    for (let start = 0; start + size <= heard.length; start++) {
      best = Math.max(best, similarity(target, heard.slice(start, start + size)));
    }
  }
  return best;
}

/**
 * Listens to each finding again from a clip around it. Speech-to-text works in 30-second
 * windows and can drop words at their edges, so a real problem should still be there
 * when the windows fall somewhere else.
 */
function recheck(findings) {
  if (!findings.length) return findings;
  fs.rmSync(CLIPS, { recursive: true, force: true });
  fs.mkdirSync(CLIPS, { recursive: true });

  const pairs = findings.flatMap((finding, index) => {
    const [cantica, n] = finding.canto.split(':');
    finding.clip = path.join(CLIPS, `${index}.wav`);
    const words = (finding.script || finding.speech).split(' ').length;
    const cut = spawnSync('ffmpeg', [
      '-y', '-loglevel', 'error', '-ss', String(Math.max(0, finding.time - CLIP_REACH)), '-t', String(CLIP_REACH * 2 + words * CLIP_SECONDS_PER_WORD),
      '-i', cantoPaths(cantica, Number(n)).liveMp3, '-ar', '16000', '-ac', '1', finding.clip,
    ]);
    if (cut.status !== 0) throw new Error(`Could not cut a clip for ${finding.canto} at ${finding.time}s`);
    return [finding.clip, `${finding.clip}.json`];
  });
  log(`Listening again to ${findings.length} place(s)`);
  transcribe(pairs);

  return findings.filter(finding => {
    const heard = normalize(readJson(`${finding.clip}.json`).text);
    const isExtra = finding.kind === 'extra speech';
    const score = bestMatch((isExtra ? finding.speech : finding.script).split(' '), heard);
    finding.heardAgain = heard.join(' ');
    delete finding.clip;
    return isExtra ? score >= CLIP_MATCH : score < CLIP_MATCH;
  });
}

const cantos = selectCantos(process.argv.slice(2));
fs.mkdirSync(TRANSCRIPTS, { recursive: true });

const transcriptPath = (cantica, n) => path.join(TRANSCRIPTS, `${cantica}_canto_${n}.json`);
const stale = cantos.filter(([cantica, n]) => {
  const file = transcriptPath(cantica, n);
  return !fs.existsSync(file) || fs.statSync(file).mtimeMs < fs.statSync(cantoPaths(cantica, n).liveMp3).mtimeMs;
});

if (stale.length) {
  log(`Transcribing ${stale.length} canto(s)`);
  transcribe(stale.flatMap(([cantica, n]) => [cantoPaths(cantica, n).liveMp3, transcriptPath(cantica, n)]));
}

const results = cantos.map(([cantica, n]) => compareCanto(
  cantica,
  n,
  readJson(transcriptPath(cantica, n)),
  readJson(cantoPaths(cantica, n).liveTimings),
  decode(cantoPaths(cantica, n).liveMp3),
));

const firstPass = results.flatMap(result => result.findings);
const confirmed = new Set(recheck(firstPass));
const cleared = firstPass.filter(finding => !confirmed.has(finding));
const kept = cleared.length;

// Words dropped on the first pass also leave sound with no words, and the second listen has accounted for that sound.
const explained = gap => gap.kind === 'sound with no words heard' && cleared.some(finding =>
  finding.canto === gap.canto && finding.time >= gap.time - CLIP_REACH && finding.time <= gap.time + gap.seconds);

for (const result of results) {
  result.findings = [
    ...result.findings.filter(finding => confirmed.has(finding)),
    ...result.measured.filter(gap => !explained(gap)),
  ];
  delete result.measured;
}
fs.writeFileSync(REPORT, JSON.stringify(results, null, 2));

for (const finding of results.flatMap(result => result.findings)) {
  const amount = finding.seconds === undefined ? `similarity ${finding.similarity}` : `${finding.seconds}s`;
  console.log(`\n${finding.canto} at ${finding.time}s, segment ${finding.segment} (${finding.speaker}), ${finding.kind}, ${amount}`);
  console.log(`  script: ${finding.script || '(nothing)'}`);
  if (finding.speech) console.log(`  speech: ${finding.speech}`);
  if (finding.heardAgain) console.log(`  heard again: ${finding.heardAgain}`);
}

const scriptWords = results.reduce((sum, r) => sum + r.scriptWords, 0);
const heardWords = results.reduce((sum, r) => sum + r.heardWords, 0);
const minor = results.reduce((sum, r) => sum + r.minor, 0);
const found = results.reduce((sum, r) => sum + r.findings.length, 0);
console.log(`\n${results.length} canto(s), ${scriptWords} script words, ${heardWords} heard`);
console.log(`${found} place(s) to listen to, ${kept} cleared on a second listen, ${minor} small difference(s) ignored. Report: ${path.relative(ROOT, REPORT)}`);
