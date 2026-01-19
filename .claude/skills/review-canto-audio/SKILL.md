---
name: review-canto-audio
description: Review generated canto audio for quality assurance. Use after generating audio to verify word-level highlighting sync, audio duration accuracy, speaker voice assignments, and text alignment. Catches sync issues, duration mismatches, and voice assignment errors.
allowed-tools: Read, Bash, Glob, Grep
user-invocable: true
---

# Review Canto Audio

Complete quality assurance review for generated Divine Comedy canto audio.

## When to Use

Run this skill after generating audio for any canto to verify:
- Word-level highlighting synchronizes with audio playback
- Audio duration matches timing data
- Speaker segments are assigned to correct characters
- Text in speaker mapping matches canto text

## Required Parameters

Provide the cantica and canto number:
- Example: "inferno 1" or "purgatorio 33"

## Review Checklist

### 1. Audio File Verification
- [ ] File exists at `public/audio/{cantica}/{cantica}_canto_{number}.mp3`
- [ ] File size is reasonable (not 0 bytes, not corrupted)
- [ ] Get actual duration using ffprobe

### 2. Timing Data Verification
- [ ] Entry exists in `public/audio-word-timings.json` for `{cantica}.{canto}`
- [ ] `totalDuration` matches ffprobe duration (within 1 second tolerance)
- [ ] All segments have word-level timing arrays
- [ ] Word timing `end` values don't exceed `totalDuration`
- [ ] No negative durations (start > end)

### 3. Speaker Segment Verification
- [ ] Entry exists in `data/speaker-mapping.json` for `{cantica}.{canto}`
- [ ] All speakers have valid voice profiles in `data/character-voice-profiles.json`
- [ ] Speaker assignments make sense (narrator for narration, named characters for dialogue)
- [ ] No orphan segments or missing speakers

### 4. Text Alignment Verification
- [ ] Modern text in `data/cantos.json` matches combined speaker segment text
- [ ] No text drift between sources
- [ ] Quotation marks preserved correctly for dialogue

## Verification Commands

```bash
# 1. Check audio file exists and get duration
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "public/audio/{cantica}/{cantica}_canto_{number}.mp3"

# 2. Check file size
ls -lh "public/audio/{cantica}/{cantica}_canto_{number}.mp3"

# 3. Validate JSON files are well-formed
python3 -c "import json; json.load(open('public/audio-word-timings.json'))"
python3 -c "import json; json.load(open('data/speaker-mapping.json'))"
```

## Common Issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| Duration mismatch | Highlighting ends early/late | Regenerate with ffmpeg concat |
| Text drift | Highlighting tracks wrong words | Sync cantos.json with speaker-mapping |
| Missing speaker | Segment plays with wrong voice | Add speaker to character-voice-profiles |
| Corrupted MP3 | Plays longer than reported duration | Re-encode with ffmpeg |

## Output Report Format

After running all checks, provide:

```
## Audio Review: {Cantica} Canto {Number}

### Summary
- Status: PASS/FAIL
- Audio Duration: X:XX (ffprobe) vs X:XX (timing data)
- Segments: N segments, M speakers
- Word Count: N words with timestamps

### Checks
- [x] Audio file exists (X.X MB)
- [x] Duration matches (+/- N.N seconds)
- [x] All speakers have voice profiles
- [x] Text alignment verified
- [ ] ISSUE: Description of any problems

### Recommendations
- List any fixes needed
```

## File Locations

| File | Purpose |
|------|---------|
| `public/audio/{cantica}/{cantica}_canto_{n}.mp3` | Generated audio |
| `public/audio-word-timings.json` | Word-level timestamps |
| `data/speaker-mapping.json` | Character-to-segment mapping |
| `data/character-voice-profiles.json` | Voice configurations |
| `data/cantos.json` | Source text (original + modern) |
