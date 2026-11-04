#!/usr/bin/env node
/**
 * The one check audio must pass before it can be published. Failures exit 1, and publish.mjs refuses to continue.
 * Run with: npm run audio:check -- --only inferno:10      or --all, adding --live to check what is on the site.
 *
 * It measures text, timing and sound. It can't tell whether the right character is speaking or how a line
 * was performed, so someone still has to listen (npm run audio:listen).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  CREDITS_PER_CHARACTER, CUT_LIMITS, MODEL, OUT_DIR, RATE, ROOT, cantoPaths, decode, isRecorded, levelAt, loadMapping, pauseBetweenWords,
  peakDb, planSegment, probeDuration, rangeDb, readJson, segmentBase, selectCantos, speechLevel, speechPastPause, spokenTimes, voiceFor,
} from './lib.mjs';

const LIMITS = {
  minHighlightCoverage: 0.98,
  maxDrift: 0.25,
  maxMissingRun: 5, // consecutive page words the audio may skip before it counts as lost text
  maxExtraRun: 3, // consecutive spoken words the page doesn't have, which is how repeats show up
  tickFail: -40,
  tickWarn: -55,
  cutMax: -40,
  strayPause: 0.1, // seconds of quiet that separate a cut piece's own words from another line's
  straySpeech: 0.03,
  jumpFail: 8,
  jumpWarn: 6,
  peakMax: -0.1,
  longestSilence: 2.5,
};

const { tokenizeStanzas, alignNarration } = await import(path.join(ROOT, 'src/lib/narration-alignment.ts'));

const cantosRaw = readJson(path.join(ROOT, 'data', 'cantos.json'));
const pageText = (cantica, n) => {
  const value = cantosRaw[cantica];
  return (Array.isArray(value) ? value : Object.values(value)).find(c => String(c.number) === String(n));
};
const stanzasFor = modern => modern.split(/\n\s*\n/).map(s => s.split('\n').map(l => l.trim()).filter(Boolean)).filter(l => l.length);
const words = text => text.toLowerCase().replace(/’/g, "'").replace(/[—–-]/g, ' ').replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean);

/** Runs of words only on the page, and only in the audio, from a longest-common-subsequence comparison. */
function compareWords(page, spoken) {
  const width = spoken.length + 1;
  const table = new Int32Array((page.length + 1) * width);
  for (let i = page.length - 1; i >= 0; i--) {
    for (let j = spoken.length - 1; j >= 0; j--) {
      table[i * width + j] = page[i] === spoken[j]
        ? table[(i + 1) * width + j + 1] + 1
        : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  const pageOnly = [];
  const spokenOnly = [];
  let i = 0;
  let j = 0;
  const push = (runs, word, atPrevious) => {
    if (atPrevious && runs.length) runs[runs.length - 1].push(word);
    else runs.push([word]);
  };
  let lastKind = null;
  while (i < page.length || j < spoken.length) {
    if (i < page.length && j < spoken.length && page[i] === spoken[j]) {
      i++;
      j++;
      lastKind = null;
    } else if (j >= spoken.length || (i < page.length && table[(i + 1) * width + j] >= table[i * width + j + 1])) {
      push(pageOnly, page[i++], lastKind === 'page');
      lastKind = 'page';
    } else {
      push(spokenOnly, spoken[j++], lastKind === 'spoken');
      lastKind = 'spoken';
    }
  }
  return { pageOnly, spokenOnly };
}

function checkSound(file, timing, fail, warn) {
  const samples = decode(file);
  const peak = peakDb(samples);
  if (peak > LIMITS.peakMax) fail.push(`clipping: peak ${peak.toFixed(1)} dB`);

  let quiet = 0;
  let longest = 0;
  const step = Math.floor(RATE * 0.1);
  for (let i = 0; i < samples.length; i += step) {
    quiet = rangeDb(samples, i, i + step) < -45 ? quiet + 1 : 0;
    longest = Math.max(longest, quiet);
  }
  if (longest / 10 >= LIMITS.longestSilence) fail.push(`${(longest / 10).toFixed(1)}s of silence`);

  const stats = { joins: timing.segments.length - 1, ticks: 0 };
  const levels = new Map(timing.segments.map(s => [s.id, speechLevel(samples, Math.floor(s.startTime * RATE), Math.floor(s.endTime * RATE))]));
  timing.segments.slice(1).forEach((right, index) => {
    const left = timing.segments[index];
    const join = right.startTime;
    const where = `at ${join.toFixed(1)}s, "${left.text.split(/\s+/).pop()}" to "${right.text.split(/\s+/)[0]}"`;
    let peakHere = -99;
    for (let k = -8; k <= 8; k++) peakHere = Math.max(peakHere, levelAt(samples, join + k * 0.0025, 0.0025));
    const before = rangeDb(samples, Math.floor((join - 0.065) * RATE), Math.floor((join - 0.035) * RATE));
    const after = rangeDb(samples, Math.floor((join + 0.035) * RATE), Math.floor((join + 0.065) * RATE));
    if (before > -40 && after > -40) fail.push(`join runs through speech ${where}`);
    if (before < -55 && after < -55 && peakHere > LIMITS.tickWarn) {
      stats.ticks++;
      if (peakHere > LIMITS.tickFail) fail.push(`tick of ${peakHere.toFixed(0)} dB ${where}`);
      else warn.push(`faint tick of ${peakHere.toFixed(0)} dB ${where}`);
    }
    const a = levels.get(left.id);
    const b = levels.get(right.id);
    if (a !== null && b !== null) {
      const jump = Math.abs(a - b);
      if (jump >= LIMITS.jumpFail) fail.push(`volume jumps ${jump.toFixed(1)} dB ${where}`);
      else if (jump >= LIMITS.jumpWarn) warn.push(`volume jumps ${jump.toFixed(1)} dB ${where}`);
    }
  });
  return stats;
}

function checkRecordings(cantica, n, timing, mapping, fail, warn) {
  const { dir, qa } = cantoPaths(cantica, n);
  const canto = mapping.cantos[cantica][String(n)];
  const plans = canto.segments.map(segment => planSegment(cantica, n, segment));
  const stale = plans.filter(plan => !isRecorded(plan, dir));
  if (stale.length) {
    const characters = stale.reduce((sum, plan) => sum + plan.sent.length, 0);
    fail.push(`${stale.length} segments not recorded for the current script, about ${Math.ceil(characters * CREDITS_PER_CHARACTER)} credits`);
  }
  if (plans.length !== timing.segments.length || plans.some((p, i) => p.id !== timing.segments[i].id || p.text !== timing.segments[i].text)) {
    fail.push('the built MP3 is out of date with the script: run generate --reassemble');
  }
  for (const plan of plans) {
    const base = segmentBase(dir, plan.id);
    if (!fs.existsSync(`${base}.json`)) continue;
    const meta = readJson(`${base}.json`);
    if (meta.model_id !== MODEL) fail.push(`segment ${plan.id} was recorded with ${meta.model_id}`);
    if (meta.reusedFrom === undefined || !fs.existsSync(`${base}.mp3`)) continue;
    const piece = decode(`${base}.mp3`);
    const duration = piece.length / RATE;
    const start = levelAt(piece, 0.012, 0.012);
    const end = levelAt(piece, duration - 0.012, 0.012);
    if (meta.cutFrom !== 0 && start > LIMITS.cutMax) fail.push(`segment ${plan.id} is cut mid-speech at its start (${start.toFixed(0)} dB): "${meta.text.slice(0, 30)}"`);
    if (meta.cutTo !== null && end > LIMITS.cutMax) fail.push(`segment ${plan.id} is cut mid-speech at its end (${end.toFixed(0)} dB): "${meta.text.slice(-30)}"`);

    // Silence alone doesn't prove a cut is right: it could be a pause between other words.
    const source = readJson(`${segmentBase(dir, meta.reusedFrom)}.json`);
    const at = meta.sourceCharStart ?? source.text.indexOf(meta.text);
    if (at < 0 || source.text.slice(at, at + meta.text.length) !== meta.text) {
      fail.push(`segment ${plan.id}: its text isn't in the recording it was cut from`);
      continue;
    }
    const { start: firstWord, end: lastWord, lastLetterStart } = spokenTimes(source, at, at + meta.text.length);
    if (meta.cutFrom > 0) {
      const lead = firstWord - meta.cutFrom;
      if (lead < -CUT_LIMITS.insideWord) fail.push(`segment ${plan.id} starts ${(-lead).toFixed(2)}s after its first word: "${meta.text.slice(0, 30)}"`);
      if (lead > CUT_LIMITS.beyondWord) fail.push(`segment ${plan.id} starts ${lead.toFixed(2)}s before its first word: "${meta.text.slice(0, 30)}"`);
    }
    if (meta.cutTo !== null) {
      const early = lastLetterStart - meta.cutTo;
      const late = meta.cutTo - lastWord;
      if (early > CUT_LIMITS.insideWord) fail.push(`segment ${plan.id} ends ${early.toFixed(2)}s before its last letter: "${meta.text.slice(-30)}"`);
      if (late > CUT_LIMITS.beyondWord) fail.push(`segment ${plan.id} ends ${late.toFixed(2)}s after its last word: "${meta.text.slice(-30)}"`);
    }

    // A short dip inside a word can pass everything above, so the cut must be in the pause that belongs to this gap.
    const sourceSamples = decode(`${segmentBase(dir, meta.reusedFrom)}.mp3`);
    const textEnd = at + meta.text.length;
    const outside = (cut, pause) => pause && (cut < pause[0] - 0.01 || cut > pause[1] + 0.01);
    if (meta.cutFrom > 0 && at > 0 && outside(meta.cutFrom, pauseBetweenWords(sourceSamples, spokenTimes(source, 0, at), spokenTimes(source, at, textEnd)))) {
      fail.push(`segment ${plan.id} starts outside the pause before its first word: "${meta.text.slice(0, 30)}"`);
    }
    if (meta.cutTo !== null && textEnd < source.text.length && outside(meta.cutTo, pauseBetweenWords(sourceSamples, spokenTimes(source, at, textEnd), spokenTimes(source, textEnd, source.text.length)))) {
      fail.push(`segment ${plan.id} ends outside the pause after its last word: "${meta.text.slice(-30)}"`);
    }
    // Speech on the far side of a pause, before its first word or after its last, is another line's word.
    if (meta.cutFrom > 0 && speechPastPause(piece, firstWord - meta.cutFrom, 0, LIMITS.strayPause) >= LIMITS.straySpeech) {
      fail.push(`segment ${plan.id} has stray speech before its first word: "${meta.text.slice(0, 30)}"`);
    }
    if (meta.cutTo !== null && speechPastPause(piece, lastLetterStart - meta.cutFrom - 0.1, duration, LIMITS.strayPause) >= LIMITS.straySpeech) {
      fail.push(`segment ${plan.id} has stray speech after its last word: "${meta.text.slice(-30)}"`);
    }
  }
  if (fs.existsSync(qa)) for (const flag of readJson(qa).flags || []) warn.push(`generator: ${flag}`);
  for (const plan of plans) if (!voiceFor(plan.speaker)) fail.push(`no voice for ${plan.speaker}`);
}

const sha = file => crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');

const args = process.argv.slice(2);
const live = args.includes('--live');
const cantos = selectCantos(args);
const mapping = loadMapping();
const results = {};

for (const [cantica, n] of cantos) {
  const paths = cantoPaths(cantica, n);
  const mp3 = live ? paths.liveMp3 : paths.mp3;
  const timingFile = live ? paths.liveTimings : paths.timings;
  const fail = [];
  const warn = [];
  const key = `${cantica} ${n}`;

  if (!fs.existsSync(mp3) || !fs.existsSync(timingFile)) {
    results[key] = { fail: [`missing ${!fs.existsSync(mp3) ? 'MP3' : 'timings'}`], warn };
    continue;
  }
  const timing = readJson(timingFile);

  const duration = probeDuration(mp3);
  if (Math.abs(duration - timing.totalDuration) > LIMITS.maxDrift) fail.push(`MP3 is ${duration.toFixed(2)}s, timings say ${timing.totalDuration.toFixed(2)}s`);
  const allWords = timing.segments.flatMap(s => s.words);
  if (timing.segments.some(s => !s.words.length)) fail.push('a segment has no word timings');
  if (allWords.some((w, i) => i && w.start < allWords[i - 1].start - 0.001)) fail.push('word timings go backwards');
  if (allWords.some(w => w.end > timing.totalDuration + 0.1)) fail.push('a word ends after the audio does');

  const canto = pageText(cantica, n);
  const { pageOnly, spokenOnly } = compareWords(words(canto.modern), words(timing.segments.map(s => s.text).join(' ')));
  for (const run of pageOnly) if (run.length >= LIMITS.maxMissingRun) fail.push(`the audio skips "${run.join(' ').slice(0, 80)}"`);
  for (const run of spokenOnly) if (run.length >= LIMITS.maxExtraRun) fail.push(`the audio says what the page doesn't: "${run.join(' ').slice(0, 80)}"`);

  const stanzas = tokenizeStanzas(stanzasFor(canto.modern));
  const tokens = stanzas.flat().flatMap(line => line.tokens).length;
  const coverage = alignNarration(stanzas, timing).length / tokens;
  if (coverage < LIMITS.minHighlightCoverage) fail.push(`only ${(coverage * 100).toFixed(1)}% of the page's words highlight`);

  const sound = checkSound(mp3, timing, fail, warn);
  if (!live) checkRecordings(cantica, n, timing, mapping, fail, warn);

  results[key] = {
    fail,
    warn,
    coverage,
    duration,
    missingWords: pageOnly.flat().length,
    ticks: sound.ticks,
    joins: sound.joins,
    pending: !live && (!fs.existsSync(paths.liveMp3) || sha(mp3) !== sha(paths.liveMp3)),
  };
}

const entries = Object.entries(results);
const failed = entries.filter(([, r]) => r.fail.length);
const warned = entries.filter(([, r]) => !r.fail.length && r.warn.length);
for (const [key, r] of failed) {
  console.log(`FAIL ${key}`);
  for (const message of r.fail) console.log(`  ${message}`);
  for (const message of r.warn) console.log(`  (warning) ${message}`);
}
for (const [key, r] of warned) console.log(`warn ${key}: ${r.warn.join('; ')}`);

const covered = entries.filter(([, r]) => r.coverage !== undefined);
const mean = covered.reduce((sum, [, r]) => sum + r.coverage, 0) / (covered.length || 1);
const lowest = covered.length ? covered.reduce((a, b) => (b[1].coverage < a[1].coverage ? b : a)) : null;
console.log(`\nChecked ${entries.length} cantos (${live ? 'live files' : 'local build'}): ${entries.length - failed.length} pass, ${failed.length} fail, ${warned.length} with warnings only.`);
if (lowest) console.log(`Highlighting: mean ${(mean * 100).toFixed(1)}%, lowest ${(lowest[1].coverage * 100).toFixed(1)}% (${lowest[0]}). Ticks: ${entries.reduce((s, [, r]) => s + (r.ticks || 0), 0)} across ${entries.reduce((s, [, r]) => s + (r.joins || 0), 0)} joins. Words on the page not spoken: ${entries.reduce((s, [, r]) => s + (r.missingWords || 0), 0)}.`);
if (!live) {
  const pending = entries.filter(([, r]) => r.pending).map(([key]) => key);
  console.log(`Built locally but not live: ${pending.length ? pending.join(', ') : 'none'}.`);
}
fs.writeFileSync(path.join(OUT_DIR, `check-report${live ? '-live' : ''}.json`), JSON.stringify(results, null, 1));
process.exit(failed.length ? 1 : 0);
