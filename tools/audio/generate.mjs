#!/usr/bin/env node
/**
 * Records and assembles canto narration with ElevenLabs. Writes only to scripts/narrations_v4/, so the
 * live site is unaffected until tools/audio/publish.mjs publishes a canto.
 *
 * A segment is saved as soon as it is recorded, and a rerun skips any segment whose text, voice and
 * settings are unchanged. Changing a voice therefore only pays for that speaker's lines.
 *
 *   node tools/audio/generate.mjs --only inferno:1,inferno:2 --dry-run   what it would record, spends nothing
 *   node tools/audio/generate.mjs --only inferno:1                       record and assemble
 *   node tools/audio/generate.mjs --only inferno:1 --reassemble          rebuild the MP3 from existing segments
 *   node tools/audio/generate.mjs --all --max-credits 70000              a run above the default 1,000 credit cap
 *
 * Exit codes: 0 finished, 1 error, 3 stopped by the credit cap or the account allowance.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  CREDITS_PER_CHARACTER, MODEL, OUT_DIR, RATE, cantoPaths, decode, isRecorded, loadEnv, loadMapping, log, peakDb,
  planSegment, probeDuration, readJson, segmentBase, selectCantos, speechLevel,
} from './lib.mjs';

const API = 'https://api.elevenlabs.io/v1';
const CONCURRENCY = 3;
const MAX_ATTEMPTS = 6;
const QUOTA_MARGIN = 2000;
const DEFAULT_CREDIT_CAP = 1000;

// Assembly. Fades remove the ticks a recording can end on. Levelling keeps a voice change from jumping in volume.
const FADE_IN = 0.01;
const FADE_OUT = 0.04;
const TARGET_DB = -21.5;
const LEVEL_DEADBAND = 2;
const MAX_GAIN = 8;
const PEAK_CEILING = -1;

class StopError extends Error {}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const ledger = path.join(OUT_DIR, 'ledger.jsonl');
const record = entry => fs.appendFileSync(ledger, `${JSON.stringify({ time: new Date().toISOString(), ...entry })}\n`);

let apiKey;

async function getQuota() {
  const res = await fetch(`${API}/user/subscription`, { headers: { 'xi-api-key': apiKey } });
  if (!res.ok) throw new Error(`Subscription check failed: HTTP ${res.status}`);
  const body = await res.json();
  return { used: body.character_count, limit: body.character_limit, remaining: body.character_limit - body.character_count };
}

async function recordSegment(plan, dir, label) {
  for (let attempt = 1; ; attempt++) {
    let failure;
    try {
      const res = await fetch(`${API}/text-to-speech/${plan.voiceId}/with-timestamps`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: plan.sent, model_id: MODEL, voice_settings: plan.voice_settings }),
        signal: AbortSignal.timeout(600000),
      });
      if (res.ok) {
        const body = await res.json();
        const cost = parseInt(res.headers.get('character-cost') || '0', 10);
        const base = segmentBase(dir, plan.id);
        fs.writeFileSync(`${base}.mp3`, Buffer.from(body.audio_base64, 'base64'));
        // The JSON is written last, so its presence means the segment finished.
        fs.writeFileSync(`${base}.json`, JSON.stringify({
          id: plan.id,
          speaker: plan.speaker,
          text: plan.text,
          tag: plan.tag,
          sent: plan.sent,
          voiceId: plan.voiceId,
          voice_settings: plan.voice_settings,
          model_id: MODEL,
          fingerprint: plan.fingerprint,
          cost,
          alignment: body.alignment,
        }));
        record({ canto: label, segment: plan.id, characters: plan.sent.length, cost, attempt, ok: true });
        return cost;
      }
      const detail = (await res.text()).slice(0, 400);
      if (detail.includes('quota_exceeded')) throw new StopError(detail);
      if (res.status !== 429 && res.status < 500) throw new Error(`HTTP ${res.status}: ${detail}`);
      failure = `HTTP ${res.status}: ${detail}`;
    } catch (error) {
      if (error instanceof StopError || /^HTTP 4/.test(error.message)) throw error;
      failure = error.message;
    }
    // A request that timed out may still have been billed, which is why failures go in the ledger too.
    record({ canto: label, segment: plan.id, characters: plan.sent.length, attempt, ok: false, error: failure.slice(0, 200) });
    if (attempt >= MAX_ATTEMPTS) throw new Error(`Segment ${plan.id} failed after ${attempt} attempts: ${failure}`);
    const wait = 2000 * 2 ** (attempt - 1);
    log(`  segment ${plan.id}: ${failure.slice(0, 120)}. Retrying in ${wait / 1000}s`);
    await sleep(wait);
  }
}

async function recordMissing(plans, dir, label) {
  const queue = [...plans];
  let spent = 0;
  let firstError = null;
  const worker = async () => {
    while (queue.length && !firstError) {
      const plan = queue.shift();
      try {
        const cost = await recordSegment(plan, dir, label);
        spent += cost;
      } catch (error) {
        firstError = firstError || error;
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (firstError) throw firstError;
  return spent;
}

/** Word timings from the alignment, skipping the tag so it never appears in highlighting. */
function buildWords(meta) {
  const { characters: chars, character_start_times_seconds: starts, character_end_times_seconds: ends } = meta.alignment;
  const joined = chars.join('');
  let offset = 0;
  if (meta.tag) {
    if (joined.startsWith(meta.sent)) offset = meta.sent.length - meta.text.length;
    else if (joined.indexOf(meta.text) >= 0) offset = joined.indexOf(meta.text);
    else offset = joined.indexOf(']') + 1;
    while (offset < chars.length && /\s/.test(chars[offset])) offset++;
  }
  const words = [];
  let current = '';
  let start = null;
  let charStart = 0;
  for (let i = offset; i < chars.length; i++) {
    if (/\s/.test(chars[i])) {
      if (current) words.push({ word: current, start, end: ends[i], charStart, charEnd: i - offset });
      current = '';
    } else {
      if (!current) {
        start = starts[i];
        charStart = i - offset;
      }
      current += chars[i];
    }
  }
  if (current) words.push({ word: current, start, end: ends[chars.length - 1], charStart, charEnd: chars.length - offset });
  return { words, tagSeconds: offset ? starts[offset] : 0 };
}

function gainFor(samples) {
  const level = speechLevel(samples);
  if (level === null) return 0;
  const wanted = TARGET_DB - level;
  if (Math.abs(wanted) < LEVEL_DEADBAND) return 0;
  const limited = Math.max(-MAX_GAIN, Math.min(MAX_GAIN, wanted));
  return Math.min(limited, PEAK_CEILING - peakDb(samples));
}

function assembleCanto(cantica, cantoNumber, canto, plans) {
  const { dir, mp3, timings, qa } = cantoPaths(cantica, cantoNumber);
  const records = [];
  const flags = [];
  const inputs = [];
  const filters = [];
  let elapsed = 0;
  let levelled = 0;

  plans.forEach((plan, index) => {
    const base = segmentBase(dir, plan.id);
    const meta = readJson(`${base}.json`);
    const samples = decode(`${base}.mp3`);
    const duration = samples.length / RATE;
    const { words, tagSeconds } = buildWords(meta);
    const clamp = t => Math.min(t, duration);

    const expectedWords = meta.text.trim().split(/\s+/).length;
    if (words.length !== expectedWords) flags.push(`segment ${plan.id}: ${words.length} timed words, text has ${expectedWords}`);
    if (tagSeconds > 1) flags.push(`segment ${plan.id}: tag takes ${tagSeconds.toFixed(2)}s, it may be spoken aloud`);
    const rate = meta.text.length / duration;
    if (meta.text.length >= 40 && (rate < 6 || rate > 30)) flags.push(`segment ${plan.id}: unusual pace, ${rate.toFixed(1)} chars/s over ${duration.toFixed(1)}s`);
    if (words.some((w, i) => i && w.start < words[i - 1].start)) flags.push(`segment ${plan.id}: word timings go backwards`);
    if (words.some(w => /^\[|\]$/.test(w.word))) flags.push(`segment ${plan.id}: tag text in word timings`);

    const gain = gainFor(samples);
    if (gain) levelled++;
    const steps = ['asetpts=PTS-STARTPTS', 'aresample=44100', 'aformat=channel_layouts=mono'];
    if (gain) steps.push(`volume=${gain.toFixed(2)}dB`);
    if (duration > FADE_IN + FADE_OUT) {
      steps.push(`afade=t=in:st=0:d=${FADE_IN}`, `afade=t=out:st=${(duration - FADE_OUT).toFixed(3)}:d=${FADE_OUT}`);
    }
    inputs.push('-i', `${base}.mp3`);
    filters.push(`[${index}:a]${steps.join(',')}[a${index}]`);

    records.push({
      id: plan.id,
      speaker: plan.speaker,
      text: plan.text,
      startTime: elapsed,
      endTime: elapsed + duration,
      duration,
      words: words.map(w => ({ ...w, start: clamp(w.start) + elapsed, end: clamp(w.end) + elapsed })),
    });
    elapsed += duration;
  });

  const graph = `${filters.join(';')};${plans.map((_, i) => `[a${i}]`).join('')}concat=n=${plans.length}:v=0:a=1[out]`;
  const temp = `${mp3}.tmp.mp3`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', graph, '-map', '[out]', '-c:a', 'libmp3lame', '-b:a', '128k', temp]);
  fs.renameSync(temp, mp3);

  const total = probeDuration(mp3);
  if (Math.abs(total - elapsed) > 0.5) flags.push(`combined audio is ${total.toFixed(2)}s, segments sum to ${elapsed.toFixed(2)}s`);
  const scale = total / elapsed;
  for (const entry of records) {
    entry.startTime *= scale;
    entry.endTime *= scale;
    entry.duration *= scale;
    for (const word of entry.words) {
      word.start *= scale;
      word.end *= scale;
    }
  }

  fs.writeFileSync(timings, JSON.stringify({ cantica, cantoNumber, title: canto.title, totalDuration: total, segments: records }, null, 2));
  fs.writeFileSync(qa, JSON.stringify({ cantica, cantoNumber, totalDuration: total, levelledSegments: levelled, flags }, null, 2));
  return { total, flags, levelled };
}

/** True when the MP3 is missing, or the script or any recording has changed since it was built. */
function needsAssembly(cantica, cantoNumber, plans) {
  const { dir, mp3, timings } = cantoPaths(cantica, cantoNumber);
  if (!fs.existsSync(mp3) || !fs.existsSync(timings)) return true;
  const built = readJson(timings).segments;
  if (built.length !== plans.length || built.some((s, i) => s.id !== plans[i].id || s.text !== plans[i].text || s.speaker !== plans[i].speaker)) return true;
  const builtAt = fs.statSync(mp3).mtimeMs;
  return plans.some(plan => {
    const file = `${segmentBase(dir, plan.id)}.mp3`;
    return !fs.existsSync(file) || fs.statSync(file).mtimeMs > builtAt;
  });
}

async function main() {
  const args = process.argv.slice(2);
  const cantos = selectCantos(args);
  const dryRun = args.includes('--dry-run');
  const capIndex = args.indexOf('--max-credits');
  const creditCap = capIndex >= 0 ? parseInt(args[capIndex + 1], 10) : DEFAULT_CREDIT_CAP;
  if (!(creditCap > 0)) throw new Error('--max-credits needs a positive number');

  loadEnv();
  apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey && !dryRun) throw new Error('ELEVENLABS_API_KEY not found in the environment or .env.local');

  const mapping = loadMapping();
  const before = dryRun ? null : await getQuota();
  const totals = { spent: 0, characters: 0, segments: 0, assembled: 0, wouldRecord: 0, wouldCost: 0, wouldAssemble: 0 };
  const flagged = [];

  for (const [cantica, cantoNumber] of cantos) {
    const canto = mapping.cantos[cantica][String(cantoNumber)];
    const { dir } = cantoPaths(cantica, cantoNumber);
    const plans = canto.segments.map(segment => planSegment(cantica, cantoNumber, segment));
    const missing = plans.filter(plan => !isRecorded(plan, dir));
    const characters = missing.reduce((sum, plan) => sum + plan.sent.length, 0);
    const estimate = Math.ceil(characters * CREDITS_PER_CHARACTER);
    const assemble = missing.length > 0 || args.includes('--reassemble') || needsAssembly(cantica, cantoNumber, plans);

    if (dryRun) {
      totals.wouldRecord += missing.length;
      totals.wouldCost += estimate;
      if (assemble) totals.wouldAssemble++;
      if (missing.length) {
        log(`${cantica} ${cantoNumber}: ${missing.length} of ${plans.length} segments to record, ${characters} characters, about ${estimate} credits`);
        for (const plan of missing) log(`  #${plan.id} ${plan.speaker}: ${JSON.stringify(plan.text.slice(0, 70))}`);
      } else if (assemble) {
        log(`${cantica} ${cantoNumber}: nothing to record, MP3 needs rebuilding`);
      }
      continue;
    }

    if (missing.length) {
      if (totals.spent + estimate > creditCap) {
        throw new StopError(`Stopped before ${cantica} ${cantoNumber}: about ${estimate} credits more would pass the ${creditCap} credit cap, with ${totals.spent} spent. Raise it with --max-credits.`);
      }
      const quota = await getQuota();
      if (quota.remaining < estimate + QUOTA_MARGIN) {
        throw new StopError(`Stopped before ${cantica} ${cantoNumber}: needs about ${estimate} credits, ${quota.remaining} of ${quota.limit} left.`);
      }
      fs.mkdirSync(dir, { recursive: true });
      totals.spent += await recordMissing(missing, dir, `${cantica} ${cantoNumber}`);
      totals.characters += characters;
      totals.segments += missing.length;
    }

    if (assemble) {
      const { total, flags, levelled } = assembleCanto(cantica, cantoNumber, canto, plans);
      totals.assembled++;
      flagged.push(...flags.map(flag => `${cantica} ${cantoNumber} ${flag}`));
      const minutes = `${Math.floor(total / 60)}:${String(Math.floor(total % 60)).padStart(2, '0')}`;
      log(`DONE ${cantica} ${cantoNumber}: ${plans.length} segments, ${missing.length} recorded, ${levelled} levelled, ${minutes}, run credits ${totals.spent}`);
      for (const flag of flags) log(`  QA ${flag}`);
    }
  }

  if (dryRun) {
    log(`Would record ${totals.wouldRecord} segments for about ${totals.wouldCost} credits, and rebuild ${totals.wouldAssemble} MP3s. Nothing was spent.`);
    return;
  }
  const after = await getQuota();
  log(`Recorded ${totals.segments} segments, ${totals.characters} characters, ${totals.spent} credits. Rebuilt ${totals.assembled} MP3s.`);
  log(`Account: ${after.used} of ${after.limit} used, up ${after.used - before.used} this run. It can lag by a minute, and can exceed the count above if a timed-out request was billed.`);
  log(`QA flags: ${flagged.length}. Next: npm run audio:check -- --only <cantos>`);
}

main().catch(error => {
  log(error instanceof StopError ? `STOP ${error.message}` : `FAILED ${error.message}`);
  process.exit(error instanceof StopError ? 3 : 1);
});
