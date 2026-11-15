import { useEffect } from 'react';

/** A canto's sound effects, placed in time (made by lib/narration-effects.ts) */
export interface NarrationEffects {
  /** The background from each time on, in order; null is silence */
  beds: { t: number; sound: string | null }[];
  /** One-off sounds and when they start */
  cues: { t: number; sound: string }[];
  /** Each sound's file, and the gain that brings it to its quiet level under the voice */
  sounds: Record<string, { src: string; gain: number }>;
  /** Seconds a background takes to fade in, or to give way to the next */
  fade: number;
}

// How quickly the background drops out when the narration is paused, in seconds
const PAUSE_FADE = 0.4;
// A jump in the narration's clock longer than this is a seek, and the cues passed over are not played
const SEEK_GAP = 1.5;

/**
 * Plays a canto's quiet sound effects alongside its narration. The narration's MP3 has no effects in it; this
 * follows the audio element's clock and plays the background for the current place, crossfading at scene
 * changes, and each one-off sound as its moment is reached. Everything stops with the narration. If the
 * browser won't play (no Web Audio, or no gesture yet), the narration simply plays alone.
 */
export function useNarrationEffects(audio: HTMLAudioElement | null, effects: NarrationEffects | null, on: boolean) {
  useEffect(() => {
    if (!audio || !effects || !on) return;
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;

    let context: AudioContext | null = null;
    let closed = false;
    const buffers = new Map<string, Promise<AudioBuffer | null>>();
    let bed: { name: string; source: AudioBufferSourceNode; gain: GainNode } | null = null;
    let wanted: string | null = null;
    let lastTime = audio.currentTime;

    // Browsers only let sound start from a tap or key press, so the context is made or woken in one
    const wake = () => {
      try {
        context ??= new Context();
        if (context.state === 'suspended') void context.resume().catch(() => {});
      } catch {
        context = null;
      }
      return context;
    };

    const load = (name: string) => {
      let buffer = buffers.get(name);
      if (!buffer) {
        const ctx = context!;
        buffer = fetch(effects.sounds[name].src)
          .then(response => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(String(response.status)))))
          .then(data => ctx.decodeAudioData(data))
          .catch(() => null);
        buffers.set(name, buffer);
      }
      return buffer;
    };

    const stopBed = (seconds: number) => {
      if (!bed || !context) return;
      const { source, gain } = bed;
      bed = null;
      const now = context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + seconds);
      source.stop(now + seconds + 0.05);
    };

    const startBed = async (name: string) => {
      const buffer = await load(name);
      if (closed || !context || !buffer || wanted !== name || bed) return;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(effects.sounds[name].gain, context.currentTime + effects.fade);
      source.connect(gain).connect(context.destination);
      source.start(0, audio.currentTime % buffer.duration);
      bed = { name, source, gain };
    };

    const playCue = async (name: string) => {
      const buffer = await load(name);
      if (closed || !context || !buffer || audio.paused) return;
      const source = context.createBufferSource();
      source.buffer = buffer;
      const gain = context.createGain();
      gain.gain.value = effects.sounds[name].gain;
      source.connect(gain).connect(context.destination);
      source.start();
    };

    const sync = () => {
      const playing = !audio.paused && !audio.ended;
      const time = audio.currentTime;
      if (playing && !wake()) return;

      let name: string | null = null;
      if (playing) {
        for (const next of effects.beds) {
          if (next.t > time) break;
          name = next.sound;
        }
        if (name && !effects.sounds[name]) name = null;
        // Have every sound of the canto ready before its moment comes
        Object.keys(effects.sounds).forEach(load);
      }
      if (name !== wanted) {
        wanted = name;
        stopBed(playing ? effects.fade : PAUSE_FADE);
        if (name) void startBed(name);
      }

      if (playing && time > lastTime && time - lastTime < SEEK_GAP) {
        for (const cue of effects.cues) {
          if (cue.t > lastTime && cue.t <= time && effects.sounds[cue.sound]) void playCue(cue.sound);
        }
      }
      lastTime = time;
    };

    const events = ['play', 'playing', 'pause', 'ended', 'seeked', 'timeupdate'] as const;
    events.forEach(event => audio.addEventListener(event, sync));
    document.addEventListener('pointerdown', wake, true);
    document.addEventListener('keydown', wake, true);
    sync();

    return () => {
      closed = true;
      events.forEach(event => audio.removeEventListener(event, sync));
      document.removeEventListener('pointerdown', wake, true);
      document.removeEventListener('keydown', wake, true);
      void context?.close().catch(() => {});
    };
  }, [audio, effects, on]);
}
