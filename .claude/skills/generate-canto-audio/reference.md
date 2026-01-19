# Audio Generation Reference

## ElevenLabs API

### Endpoint

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps
```

### Request Body

```json
{
  "text": "Text to synthesize",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.0,
    "use_speaker_boost": true,
    "speed": 1.0
  }
}
```

### Response

```json
{
  "audio_base64": "base64-encoded-mp3-data",
  "alignment": {
    "characters": ["M", "i", "d", "w", "a", "y", " ", ...],
    "character_start_times_seconds": [0.0, 0.05, 0.08, ...],
    "character_end_times_seconds": [0.05, 0.08, 0.12, ...]
  }
}
```

## MP3 Concatenation

### Why ffmpeg is Required

Buffer.concat produces corrupted MP3 files because:
- MP3 files have frame headers that must align
- Direct concatenation breaks frame boundaries
- Results in duration mismatch between reported and actual

### Correct Approach

```bash
# Create concat list
echo "file 'segment_001.mp3'
file 'segment_002.mp3'
file 'segment_003.mp3'" > concat_list.txt

# Concatenate with re-encoding
ffmpeg -y -f concat -safe 0 -i "concat_list.txt" -acodec libmp3lame -b:a 128k "output.mp3"
```

## Timing Calculation

### Character-to-Word Conversion

The ElevenLabs API returns character-level timing. The script converts to word-level:

```javascript
// Pseudocode
for each character in alignment:
  if character is space or newline:
    if currentWord is not empty:
      emit word with start/end times
    reset currentWord
  else:
    if wordStartTime is null:
      wordStartTime = character.startTime
    append character to currentWord
```

### Duration Scaling

After ffmpeg concatenation, actual duration may differ from sum of segments:

```javascript
const actualDuration = ffprobe(outputFile);
const scaleFactor = actualDuration / calculatedDuration;

// Scale all timings
segments.forEach(seg => {
  seg.startTime *= scaleFactor;
  seg.endTime *= scaleFactor;
  seg.words.forEach(word => {
    word.start *= scaleFactor;
    word.end *= scaleFactor;
  });
});
```

## Voice Settings Guide

| Setting | Range | Effect |
|---------|-------|--------|
| stability | 0-1 | Lower = more expressive/varied, Higher = more consistent |
| similarity_boost | 0-1 | Higher = closer to original voice sample |
| style | 0-1 | Style exaggeration (0 = neutral) |
| speed | 0.5-2.0 | Playback speed multiplier |

### Recommended Settings by Role

| Role | Stability | Similarity | Style | Speed |
|------|-----------|------------|-------|-------|
| Narrator | 0.50 | 0.75 | 0.0 | 1.0 |
| Dante (dialogue) | 0.20 | 0.72 | 0.80 | 1.05 |
| Virgil | 0.50 | 0.75 | 0.0 | 1.0 |
| Beatrice | 0.45 | 0.75 | 0.50 | 0.95 |
| Demons/Sinners | 0.35 | 0.65 | 0.40 | 0.92 |

## Rate Limiting

ElevenLabs has rate limits based on subscription tier:

| Tier | Requests/minute | Characters/month |
|------|-----------------|------------------|
| Free | 3 | 10,000 |
| Starter | 20 | 30,000 |
| Creator | 100 | 100,000 |
| Pro | Unlimited | 500,000 |

The script includes a 500ms delay between segments to avoid rate limiting.

## Troubleshooting

### "HTTP 401: Unauthorized"
- Check `ELEVENLABS_API_KEY` in `.env.local`
- Verify API key is valid at elevenlabs.io

### "HTTP 429: Too Many Requests"
- Wait 60 seconds and retry
- Consider upgrading ElevenLabs plan

### "voice_id not found"
- Verify voice exists in ElevenLabs account
- Check for typos in voice ID

### Audio plays but no highlighting
- Verify `public/audio-word-timings.json` was updated
- Check browser console for timing data loading errors
- Ensure segment IDs match between mapping and timings

### Highlighting drifts over time
- Duration mismatch between audio and timings
- Re-run generation with ffmpeg available
- Verify scaling was applied correctly

## Data Flow Diagram

```
speaker-mapping.json
        │
        ▼
┌───────────────────────────┐
│  generate-narration-      │
│  with-timestamps.js       │
│                           │
│  For each segment:        │
│  1. Get voice config      │
│  2. Call ElevenLabs API   │
│  3. Extract word timings  │
│  4. Save segment MP3      │
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│  ffmpeg concatenation     │
│  - Combine segment MPs    │
│  - Re-encode for quality  │
│  - Get actual duration    │
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│  Timing scaling           │
│  - Compare durations      │
│  - Apply scale factor     │
│  - Save word-timings.json │
└───────────────────────────┘
        │
        ▼
public/audio/{cantica}/{cantica}_canto_{n}.mp3
public/audio-word-timings.json
```

## Segment File Structure

After generation, the following files are created:

```
scripts/narrations/<cantica>/
├── <cantica>_canto_<n>.mp3          # Final combined audio
└── canto_<n>/
    ├── segment_001.mp3               # Individual segments
    ├── segment_002.mp3
    ├── ...
    ├── concat_list.txt               # ffmpeg input list
    └── word-timings.json             # Timing data
```
