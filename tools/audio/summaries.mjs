#!/usr/bin/env node
/**
 * Records the one-minute spoken summaries in data/canto-summaries.json, in their own voice (`summary` in data/voices.json). Each summary
 * is one request. Recordings go to scripts/narrations_v4/summaries/, and nothing reaches the site until --publish
 * copies a summary into public/audio-summaries/.
 *
 *   node tools/audio/summaries.mjs --only inferno:1 --dry-run   what it would record, spends nothing
 *   node tools/audio/summaries.mjs --only inferno:1             record and build
 *   node tools/audio/summaries.mjs --only inferno:1 --publish   copy the built MP3 into public/
 *   node tools/audio/summaries.mjs --all --max-credits 40000    a run above the default 1,500 credit cap
 *
 *   node tools/audio/summaries.mjs --only inferno:1 --remix     mix the effects again over the existing recording
 *
 * A rerun skips a summary whose text, voice and settings are unchanged. Each summary is built twice: <n>.voice.mp3 is
 * the voice alone, and <n>.mp3, the one the site serves, has the quiet sound effects named in data/summary-effects.json
 * under it. Effects are generated once into scripts/narrations_v4/sfx/ and reused.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  CREDITS_PER_CHARACTER, MODEL, OUT_DIR, ROOT, fingerprint, loadEnv, log, probeDuration, readJson, selectCantos, tagFor, voiceFor,
} from './lib.mjs';

const API = 'https://api.elevenlabs.io/v1';
const DEFAULT_CREDIT_CAP = 1500;
const QUOTA_MARGIN = 500;
// A request that got no answer may still have been billed, so it is never retried automatically.
const SUMMARIES = readJson(path.join(ROOT, 'data', 'canto-summaries.json'));
const WORK = path.join(OUT_DIR, 'summaries');
const LIVE = path.join(ROOT, 'public', 'audio-summaries');
const EFFECTS = readJson(path.join(ROOT, 'data', 'summary-effects.json'));
const SFX = path.join(OUT_DIR, 'sfx');
const ledger = path.join(OUT_DIR, 'ledger.jsonl');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const publish = args.includes('--publish');
const remix = args.includes('--remix');
const capAt = args.indexOf('--max-credits');
const cap = capAt >= 0 ? parseInt(args[capAt + 1], 10) : DEFAULT_CREDIT_CAP;

function plan(cantica, n) {
  const text = SUMMARIES[cantica]?.[n];
  if (!text) return null;
  const { voiceId, voice_settings } = voiceFor('summary');
  const tag = tagFor('summary');
  const sent = tag ? `${tag} ${text}` : text;
  const base = path.join(WORK, cantica, String(n));
  return { cantica, n, label: `${cantica} ${n} summary`, text, sent, voiceId, voice_settings, base, fingerprint: fingerprint(voiceId, voice_settings, sent) };
}

function isRecorded(p) {
  try {
    return fs.existsSync(`${p.base}.raw.mp3`) && readJson(`${p.base}.json`).fingerprint === p.fingerprint;
  } catch {
    return false;
  }
}

const effectsFor = p => EFFECTS.cantos[`${p.cantica}:${p.n}`] || null;
const soundsFor = p => {
  const effects = effectsFor(p);
  return effects ? [effects.bed, ...(effects.cues || []).map(cue => cue.sound)].filter(Boolean) : [];
};
const soundFile = name => path.join(SFX, `${name}.mp3`);
const soundCost = name => Math.ceil(EFFECTS.sounds[name].seconds * EFFECTS.creditsPerSecond);

/** Generates a sound effect that isn't on disk yet. Returns what it cost. */
async function makeSound(name, apiKey) {
  const sound = EFFECTS.sounds[name];
  if (!sound) throw new Error(`data/summary-effects.json has no sound named ${name}`);
  const entry = { time: new Date().toISOString(), canto: `sound effect ${name}`, segment: 1, characters: 0, attempt: 1 };
  const res = await fetch(`${API}/sound-generation?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sound.prompt, duration_seconds: sound.seconds, loop: sound.loop, prompt_influence: 0.5, model_id: EFFECTS.model }),
    signal: AbortSignal.timeout(300000),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    fs.appendFileSync(ledger, `${JSON.stringify({ ...entry, ok: false, error: `HTTP ${res.status}: ${detail}` })}\n`);
    throw new Error(`Sound ${name}: HTTP ${res.status}: ${detail}`);
  }
  const cost = parseInt(res.headers.get('character-cost') || '0', 10);
  fs.mkdirSync(SFX, { recursive: true });
  fs.writeFileSync(soundFile(name), Buffer.from(await res.arrayBuffer()));
  fs.appendFileSync(ledger, `${JSON.stringify({ ...entry, cost, ok: true })}\n`);
  log(`sound ${name}: ${cost} credits`);
  return cost;
}

/** When a phrase of the summary starts in its recording, in seconds. */
function phraseTime(p, phrase) {
  const meta = readJson(`${p.base}.json`);
  const index = meta.text.indexOf(phrase);
  if (index < 0) throw new Error(`${p.label}: the cue phrase "${phrase}" is not in the recorded text`);
  return meta.alignment.character_start_times_seconds[meta.sent.length - meta.text.length + index];
}

/**
 * Builds the two copies of a summary: the voice alone, faded and levelled, and the one the site serves, with a quiet
 * background under the voice and any timed effects. The background starts a moment before the voice and outlasts it.
 */
function build(p) {
  const length = probeDuration(`${p.base}.raw.mp3`);
  const voice = `afade=t=in:d=0.01,afade=t=out:st=${Math.max(0, length - 0.05)}:d=0.05,loudnorm=I=-18:TP=-1.5:LRA=11`;
  const encode = ['-ac', '1', '-ar', '44100', '-b:a', '96k'];
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', `${p.base}.raw.mp3`, '-af', voice, ...encode, `${p.base}.voice.mp3`]);
  const effects = effectsFor(p);
  if (!effects) {
    fs.copyFileSync(`${p.base}.voice.mp3`, `${p.base}.mp3`);
    return probeDuration(`${p.base}.mp3`);
  }
  const { bedDb, cueDb, leadIn, tail } = EFFECTS.levels;
  const total = leadIn + length + tail;
  const inputs = ['-i', `${p.base}.raw.mp3`];
  const chains = [`[0:a]${voice},adelay=${Math.round(leadIn * 1000)}:all=1,apad=whole_dur=${total}[voice]`];
  const mixed = ['[voice]'];
  if (effects.bed) {
    inputs.push('-stream_loop', '-1', '-i', soundFile(effects.bed));
    chains.push(`[1:a]loudnorm=I=-20:TP=-2,atrim=0:${total},afade=t=in:d=2,afade=t=out:st=${total - 3}:d=3,volume=${bedDb}dB[bed]`);
    mixed.push('[bed]');
  }
  (effects.cues || []).forEach((cue, i) => {
    const input = inputs.filter(arg => arg === '-i').length;
    const at = leadIn + phraseTime(p, cue.at) + (cue.offset || 0);
    inputs.push('-i', soundFile(cue.sound));
    chains.push(`[${input}:a]loudnorm=I=-20:TP=-2,afade=t=in:d=0.2,volume=${cueDb}dB,adelay=${Math.round(at * 1000)}:all=1[cue${i}]`);
    mixed.push(`[cue${i}]`);
  });
  chains.push(`${mixed.join('')}amix=inputs=${mixed.length}:normalize=0:duration=first,alimiter=limit=0.8:level=disabled[out]`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', chains.join(';'), '-map', '[out]', ...encode, `${p.base}.mp3`]);
  return probeDuration(`${p.base}.mp3`);
}

const plans = selectCantos(args).map(([cantica, n]) => plan(cantica, n)).filter(Boolean);
if (!plans.length) throw new Error('None of those cantos has a summary in data/canto-summaries.json');

if (publish) {
  for (const p of plans) {
    if (!fs.existsSync(`${p.base}.mp3`) || readJson(`${p.base}.json`).text !== p.text) throw new Error(`${p.label}: not recorded, or its text changed since it was`);
    if (!isRecorded(p)) log(`${p.label}: note, this recording is not in the voice data/voices.json now names for summaries`);
    fs.mkdirSync(path.join(LIVE, p.cantica), { recursive: true });
    fs.copyFileSync(`${p.base}.mp3`, path.join(LIVE, p.cantica, `${p.n}.mp3`));
    log(`${p.label}: copied to public/audio-summaries/${p.cantica}/${p.n}.mp3`);
  }
  process.exit(0);
}

const missing = remix ? [] : plans.filter(p => !isRecorded(p));
const sounds = [...new Set(plans.flatMap(soundsFor))].filter(name => !fs.existsSync(soundFile(name)));
const soundEstimate = sounds.reduce((sum, name) => sum + soundCost(name), 0);
const estimate = missing.reduce((sum, p) => sum + Math.ceil(p.sent.length * CREDITS_PER_CHARACTER), 0) + soundEstimate;
for (const p of plans) {
  const words = p.text.trim().split(/\s+/).length;
  const state = isRecorded(p) ? 'already recorded' : remix ? 'recording kept as it is' : `about ${Math.ceil(p.sent.length * CREDITS_PER_CHARACTER)} credits`;
  log(`${p.label}: ${words} words, ${p.sent.length} characters, ${state}, effects: ${soundsFor(p).join(', ') || 'none'}`);
}
for (const name of sounds) log(`sound ${name}: ${EFFECTS.sounds[name]?.seconds}s to generate with ${EFFECTS.model}, about ${soundCost(name)} credits`);
log(`${missing.length} to record with ${MODEL}, ${sounds.length} sounds to generate, about ${estimate} credits. Cap ${cap}.`);
if (dryRun) process.exit(0);
if (estimate > cap) throw new Error(`About ${estimate} credits is over the ${cap} cap. Pass --max-credits to raise it.`);

let spent = 0;
if (missing.length || sounds.length) {
  loadEnv();
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');
  const subscription = await (await fetch(`${API}/user/subscription`, { headers: { 'xi-api-key': apiKey } })).json();
  const remaining = subscription.character_limit - subscription.character_count;
  if (estimate + QUOTA_MARGIN > remaining) throw new Error(`Only ${remaining} credits are left on the account, and this needs about ${estimate}.`);

  for (const name of sounds) spent += await makeSound(name, apiKey);

  for (const p of missing) {
    const entry = { time: new Date().toISOString(), canto: p.label, segment: 1, characters: p.sent.length, attempt: 1 };
    let res;
    try {
      res = await fetch(`${API}/text-to-speech/${p.voiceId}/with-timestamps`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: p.sent, model_id: MODEL, voice_settings: p.voice_settings }),
        signal: AbortSignal.timeout(600000),
      });
    } catch (error) {
      fs.appendFileSync(ledger, `${JSON.stringify({ ...entry, ok: false, error: error.message })}\n`);
      throw new Error(`${p.label} got no answer (${error.message}). It may still have been billed, so nothing was retried.`);
    }
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      fs.appendFileSync(ledger, `${JSON.stringify({ ...entry, ok: false, error: `HTTP ${res.status}: ${detail}` })}\n`);
      throw new Error(`${p.label}: HTTP ${res.status}: ${detail}`);
    }
    const body = await res.json();
    const cost = parseInt(res.headers.get('character-cost') || '0', 10);
    spent += cost;
    fs.mkdirSync(path.dirname(p.base), { recursive: true });
    fs.writeFileSync(`${p.base}.raw.mp3`, Buffer.from(body.audio_base64, 'base64'));
    fs.writeFileSync(`${p.base}.json`, JSON.stringify({
      text: p.text, sent: p.sent, voiceId: p.voiceId, voice_settings: p.voice_settings, model_id: MODEL, fingerprint: p.fingerprint, cost, alignment: body.alignment,
    }));
    fs.appendFileSync(ledger, `${JSON.stringify({ ...entry, cost, ok: true })}\n`);
    log(`${p.label}: recorded, ${cost} credits`);
  }
}

// Build what was just recorded, or with --remix every summary that has a recording
for (const p of remix ? plans.filter(p => fs.existsSync(`${p.base}.raw.mp3`)) : missing) {
  const seconds = build(p);
  log(`${p.label}: built, ${seconds.toFixed(1)}s${seconds > 85 || seconds < 40 ? ' (outside 40 to 85 seconds)' : ''}`);
}
log(`Done. ${spent} credits spent.`);
