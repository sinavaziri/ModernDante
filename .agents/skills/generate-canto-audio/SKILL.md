---
name: generate-canto-audio
description: Generate or regenerate character-voiced narration for a Divine Comedy canto with word-level timestamps, using the tools/audio pipeline. Use for new audio, changed lines, changed speakers or changed voices. Spends ElevenLabs credits, so it always starts with a dry run.
allowed-tools: Read, Bash, Glob, Grep, Write, Edit
user-invocable: true
---

# Generate Canto Audio

Takes a canto or list of cantos, for example "inferno 1" or "purgatorio 33". In commands, write them as `inferno:1,purgatorio:33`. `tools/audio/README.md` has the details.

## Steps

1. **Make the change, if there is one.** Script text and speakers are in `data/speaker-mapping.json`, and voices are in `data/voices.json`. Keep script text the same as the page in `data/cantos.json`. For speaker corrections with a plan, run `npm run audio:split -- apply <cantos>`.

2. **Dry run. Always.**
   ```bash
   npm run audio:generate -- --only <cantos> --dry-run
   ```
   Tell the user what it will record and what it will cost. If it would record far more than the change explains, stop and find out why.

3. **Record and build.**
   ```bash
   npm run audio:generate -- --only <cantos>
   ```
   Runs stop at 1,000 credits unless you pass `--max-credits <n>`. Only raise it with the user's approval. Use `--reassemble` to rebuild the MP3 without recording.

4. **Check.** Fix failures rather than working around them.
   ```bash
   npm run audio:check -- --only <cantos>
   ```

5. **Back up the new recordings.**
   ```bash
   npm run audio:backup
   ```

6. **Hand it over to listen to.** Nothing is live yet. You can't judge voices or performance, so say so.
   ```bash
   npm run audio:listen -- <canto> <canto>
   ```

7. **Publish only when the user approves.** Use `/review-canto-audio` for the steps.

## Report

State what was recorded, the credits spent and left, the check result, and that nothing is live until it's published.
