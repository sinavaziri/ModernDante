---
name: generate-canto-audio
description: Generate character-voiced audio narration for a Divine Comedy canto with word-level timestamps. Use this skill to create MP3 audio files with synchronized word highlighting for any canto.
allowed-tools: Read, Bash, Glob, Grep, Write, Edit
user-invocable: true
---

# Generate Canto Audio

Generate character-voiced audio narration for Divine Comedy cantos using ElevenLabs TTS with word-level timestamps for synchronized text highlighting.

## When to Use

Use this skill when you need to:
- Generate audio for a new canto
- Regenerate audio after editing speaker segments
- Create audio with updated voice assignments

## Required Parameters

Provide the cantica and canto number:
- Example: "inferno 1" or "purgatorio 33"

## Prerequisites

Before generating audio, ensure:

1. **Environment Variable**: `ELEVENLABS_API_KEY` is set in `.env.local`
2. **Speaker Mapping**: Entry exists in `data/speaker-mapping.json` for the canto
3. **Voice Profiles**: All speakers have voice IDs in `scripts/generate-narration-with-timestamps.js`

## Generation Workflow

### Option A: Full Deploy (Recommended)

Use the deploy script for complete workflow:

```bash
node scripts/deploy-canto-audio.js <cantica> <canto>
```

This script:
1. Generates audio with word-level timestamps
2. Copies audio to `public/audio/<cantica>/`
3. Updates `public/audio-word-timings.json`
4. Verifies audio file integrity
5. Verifies word timings match audio duration

### Option B: Generate Only

For generation without deployment:

```bash
node scripts/generate-narration-with-timestamps.js <cantica> <canto>
```

Output locations:
- Audio: `scripts/narrations/<cantica>/<cantica>_canto_<n>.mp3`
- Timings: `scripts/narrations/<cantica>/canto_<n>/word-timings.json`
- Segments: `scripts/narrations/<cantica>/canto_<n>/segment_*.mp3`

## Pre-Generation Checklist

### 1. Verify Speaker Mapping Exists

```bash
# Check if mapping exists for the canto
node -e "const m = require('./data/speaker-mapping.json'); console.log(m.cantos['<cantica>']['<canto>'] ? '✓ Mapping exists' : '✗ No mapping')"
```

### 2. Preview Segments

```bash
node scripts/show-character-segments.js --cantica <cantica> --canto <canto>
```

### 3. Check Voice Configuration

Verify speakers in mapping have voice configs in `scripts/generate-narration-with-timestamps.js`:

| Speaker | Description |
|---------|-------------|
| narrator | Dante as poet (narration) |
| dante | Dante the Pilgrim (dialogue) |
| virgil | The Ancient Guide |
| beatrice | Divine Love |
| character | Generic fallback |

Additional voices: charon, minos, homer, brunetto_latini, ciacco, lucia

## Generation Steps

1. **Start Generation**
   ```bash
   node scripts/deploy-canto-audio.js <cantica> <canto>
   ```

2. **Monitor Progress**
   - Each segment shows: `[001/045] narrator   Generating... ✓ (45.2 KB, 89 words)`
   - Watch for errors or missing voice warnings

3. **Verify Output**
   ```bash
   # Check audio file exists and get duration
   ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "public/audio/<cantica>/<cantica>_canto_<n>.mp3"

   # Check file size
   ls -lh "public/audio/<cantica>/<cantica>_canto_<n>.mp3"
   ```

## Post-Generation

After generation completes:

1. **Run QA Review** (recommended)
   ```
   /review-canto-audio <cantica> <canto>
   ```

2. **Test in Browser**
   - Navigate to `http://localhost:3000/<cantica>/<canto>`
   - Verify audio plays correctly
   - Verify word highlighting syncs with audio
   - Verify all speaker voices are correct

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Canto not found" | Missing speaker mapping | Add mapping to `data/speaker-mapping.json` |
| "Using 'character' voice for X" | Missing voice config | Add voice to `VOICE_CONFIG` in script |
| Rate limiting (429) | Too many API calls | Wait and retry, or reduce batch size |
| ffmpeg not found | Missing dependency | Install ffmpeg: `brew install ffmpeg` |
| Duration mismatch | Buffer.concat fallback used | Re-run with ffmpeg available |

## Voice Configuration

To add or modify voices, edit `VOICE_CONFIG` in `scripts/generate-narration-with-timestamps.js`:

```javascript
speaker_name: {
  voiceId: 'ElevenLabs-voice-id',
  volume: 1.0,
  model_id: 'eleven_multilingual_v2',
  voice_settings: {
    stability: 0.50,      // 0-1: Lower = more expressive
    similarity_boost: 0.75, // 0-1: Higher = closer to original
    style: 0.0,           // 0-1: Style exaggeration
    use_speaker_boost: true,
    speed: 1.0            // Playback speed multiplier
  }
}
```

## File Locations

| File | Purpose |
|------|---------|
| `data/speaker-mapping.json` | Character-to-segment mapping |
| `scripts/generate-narration-with-timestamps.js` | Main generation script |
| `scripts/deploy-canto-audio.js` | Full deploy workflow |
| `public/audio/<cantica>/<cantica>_canto_<n>.mp3` | Final audio output |
| `public/audio-word-timings.json` | Word-level timestamps |
| `scripts/narrations/` | Intermediate generation files |

## Output Report Format

After generation, provide:

```
## Audio Generation: {Cantica} Canto {Number}

### Summary
- Status: SUCCESS/FAILED
- Duration: X:XX
- Segments: N segments
- File Size: X.X MB

### Files Generated
- Audio: public/audio/{cantica}/{cantica}_canto_{n}.mp3
- Timings: Updated in public/audio-word-timings.json

### Next Steps
- [ ] Run /review-canto-audio to verify quality
- [ ] Test at http://localhost:3000/{cantica}/{n}
```
