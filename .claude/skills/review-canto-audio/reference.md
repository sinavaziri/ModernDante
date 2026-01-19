# Audio System Reference

## Data Structures

### audio-word-timings.json

```json
{
  "inferno": {
    "1": {
      "totalDuration": 375.14,
      "segments": [
        {
          "id": 1,
          "speaker": "narrator",
          "startTime": 0.0,
          "endTime": 45.2,
          "words": [
            { "word": "Midway", "start": 0.0, "end": 0.45 },
            { "word": "upon", "start": 0.45, "end": 0.72 }
          ]
        }
      ]
    }
  }
}
```

### speaker-mapping.json

```json
{
  "inferno": {
    "1": [
      {
        "speaker": "narrator",
        "text": "Midway upon the journey of our life..."
      },
      {
        "speaker": "dante",
        "text": "\"I cannot well repeat how there I entered...\""
      }
    ]
  }
}
```

### character-voice-profiles.json

```json
{
  "narrator": {
    "voiceId": "ElevenLabs-voice-id",
    "stability": 0.5,
    "similarity": 0.75,
    "style": "default",
    "speed": 1.0
  }
}
```

## Audio Generation Pipeline

1. **Text Extraction**: Read modern text from `cantos.json`
2. **Speaker Assignment**: Apply mappings from `speaker-mapping.json`
3. **Voice Generation**: Call ElevenLabs API for each segment with character voice
4. **Timing Extraction**: Get word-level timestamps from ElevenLabs response
5. **Audio Concatenation**: Combine segments with ffmpeg (NOT Buffer.concat)
6. **Timing Adjustment**: Scale word timings to match actual audio duration

## Critical Implementation Details

### MP3 Concatenation

**WRONG** (causes duration mismatch):
```javascript
const combined = Buffer.concat(audioBuffers);
fs.writeFileSync(output, combined);
```

**CORRECT** (preserves frame boundaries):
```javascript
// Write concat list
fs.writeFileSync(concatList, segments.map(s => `file '${s}'`).join('\n'));

// Use ffmpeg to concatenate and re-encode
execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -acodec libmp3lame -b:a 128k "${output}"`);
```

### Timing Scaling

After concatenation, actual duration may differ from sum of segments. Scale timings:

```javascript
const actualDuration = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${output}"`));
const scaleFactor = actualDuration / calculatedDuration;

// Scale all word timings
words.forEach(w => {
  w.start *= scaleFactor;
  w.end *= scaleFactor;
});
```

## Validation Tolerances

| Check | Tolerance | Notes |
|-------|-----------|-------|
| Duration match | 1 second | Allows for encoding variance |
| Word timing gaps | 0.1 seconds | Small gaps between words OK |
| Segment boundaries | 0.5 seconds | Segment end vs next start |

## Speaker Identification

### Narrator vs Character

- **Narrator**: Third-person descriptive text (no quotes)
- **Dante**: First-person internal thoughts OR dialogue with "I"
- **Other characters**: Named speakers with dialogue in quotes

### Dialogue Detection

Text in quotation marks (`"..."`) is typically dialogue. Attribution determines speaker:
- "said Virgil" → speaker: virgil
- "I replied" → speaker: dante
- "the shade spoke" → may need context

## Common Voice Assignments by Cantica

### Inferno
- narrator, dante, virgil (most common)
- charon, minos, francesca, farinata, ugolino, ulysses

### Purgatorio
- narrator, dante, virgil, statius
- cato, casella, manfred, matelda

### Paradiso
- narrator, dante, beatrice
- piccarda, justinian, cacciaguida, st_peter, st_bernard
