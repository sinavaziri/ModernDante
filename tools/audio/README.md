# Audio Pipeline

How canto narration gets from text to the live site. Everything here runs from the project root.

Needs `ffmpeg`, `ELEVENLABS_API_KEY` in `.env.local`, and `AUDIO_BACKUP_DIR` in `.env.local` for backups.

## The steps

```bash
npm run audio:generate -- --only inferno:10 --dry-run   # 1. See what it would record and cost
npm run audio:generate -- --only inferno:10             # 2. Record and build the MP3
npm run audio:check -- --only inferno:10                # 3. Must pass
npm run audio:listen -- inferno:10                      # 4. Listen to the changed lines
npm run audio:publish -- --only inferno:10 --push       # 5. Publish only this canto
npm run audio:publish -- --only inferno:10 --verify     # 6. After Vercel finishes, confirm the live files
npm run audio:backup                                    # 7. Back up the new recordings
```

Nothing reaches the site until step 5, and step 5 refuses audio that fails the check.

## Files

| Path | What it is |
|---|---|
| `data/speaker-mapping.json` | The script: each canto's segments, who speaks them, and their text |
| `data/voices.json` | The only place voices are defined: model, voice IDs, settings, delivery tags, fallbacks |
| `data/voice-fix-plans.json` | Who really speaks each part of a segment, from reading the poem. Holds only plans not yet applied |
| `data/cantos.json` | The page text, which the check compares the audio against |
| `scripts/narrations_v4/` | Recordings and built MP3s. Gitignored, so `audio:backup` is their only copy |
| `scripts/narrations_v4/ledger.jsonl` | Every API attempt and its cost |
| `scripts/transcripts/` | Speech-to-text results and the latest `report.json`. Gitignored, and can be rebuilt |
| `public/audio/<cantica>/<cantica>_canto_<n>.mp3` | Live audio |
| `public/audio-timings/<cantica>/<n>.json` | Live word timings, one small file per canto |

## Tools

- **`generate.mjs`** records missing segments and builds the MP3. A segment's fingerprint covers its model, voice, settings and text, so unchanged lines are never paid for twice. A run stops at 1,000 credits unless you pass `--max-credits`. Use `--reassemble` to rebuild an MP3 without recording.
- **`check.mjs`** is the gate. It fails on lost or repeated text, poor highlighting, MP3 and timing drift, stale recordings, the wrong model, clipping, long silences, ticks at joins, large volume jumps, and cuts that land in speech. Limits are at the top of the file. Add `--live` to check what is on the site.
- **`speech-check.mjs`** (`npm run audio:speech -- --all`) compares what the live MP3s say with the script, using local speech-to-text. It needs `uv` and an Apple Silicon Mac, costs no credits, and downloads the 1.6 GB `mlx-community/whisper-large-v3-turbo` model on first use. A full run takes about 35 minutes, and only cantos whose MP3 changed are transcribed again. It reports words that differ, speech that falls out of step with the timings, and sound where no words were heard. Treat each result as a place to listen to, because speech-to-text mishears names and old words. Add `--built` to check a local build before publishing.
- **`split-voices.mjs`** applies speaker corrections, cutting words that keep their voice from the existing recording. Commands: `estimate`, `apply <cantos>`, `recut <cantos>`.
- **`listen.mjs`** builds a page with the new version beside the live one and a button for each changed line.
- **`publish.mjs`** copies named cantos into `public/` and commits them with only their mapping entries. Pending work on other cantos stays uncommitted.
- **`backup.mjs`** copies recordings to `AUDIO_BACKUP_DIR`.

## Changing things

- **A line's wording or speaker:** edit `data/speaker-mapping.json`, keeping the text the same as the page. Then follow the steps above. Only that segment gets recorded.
- **A speaker's voice:** add or edit them in `data/voices.json`. Their lines are the only ones recorded again, so run the dry run first to see the cost.
- **Who speaks part of a segment:** add it to `data/voice-fix-plans.json`, then `npm run audio:split -- apply inferno:10`.

## What to know

- **Model and cost:** `eleven_v4` through `POST /v1/text-to-speech/{voice_id}/with-timestamps`. It really bills about 0.44 credits per character, read from the `character-cost` response header. `/v1/models` lists 1.0.
- **Library voices:** a Voice Library voice works by its `voiceId` without being saved to the account, and uses none of the plan's 30 custom voice slots or its add/edit allowance. Most characters use one, and `name` and `owner` in `data/voices.json` say which. On a voice's first use, a second request at the same moment gets a 409, which isn't billed and is retried.
- **Delivery tags:** narrator and Dante share a voice, and an audio tag at the start of the text separates them. Alignment times include the tag, but it isn't spoken, and `generate.mjs` removes it from the word timings.
- **Cuts:** alignment times drift on long recordings, so they only locate a cut roughly. It is then moved into the real pause that best covers the gap between the two words. The nearest pause can be a dip inside a word, which moves that word to the wrong side of the cut. Without a pause, the words are recorded fresh rather than clipped.
- **Assembly:** every segment gets a short fade at each end, which removes the ticks recordings can end on. Segments are levelled towards -21.5 dB, and the MP3 is encoded once at 128 kbps.
- **Requests with no answer:** a timeout or dropped connection can still be billed in full, even though no audio comes back. Paradiso 12 lost about 4,100 credits this way in one run. Each one counts against the credit cap, and a segment stops the run after 3 of them. They are in the ledger, and the end of a run compares its count with the account's.
- **Repo size:** the MP3s are in git, so republishing a canto adds about 6 MB to the history permanently. Only publish what changed.
- **What the checks can't do:** neither can tell whether the right character is speaking or how a line was performed, so listening is a required step. `check.mjs` doesn't compare speech with text, which is what `speech-check.mjs` is for.
- **Speech-to-text blind spots:** it tidies repeats and stutters away as it writes, so a repeated passage never shows in its words, only in its timing. It also drops words at the edges of its 30-second windows, so `speech-check.mjs` listens to each word difference again from a clip before reporting it.
