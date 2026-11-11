---
paths:
  - "tools/audio/**"
  - "data/speaker-mapping.json"
  - "data/voices.json"
  - "data/voice-fix-plans.json"
  - "public/audio/**"
  - "public/audio-timings/**"
---

# Audio Generation

Read `tools/audio/README.md` first. It is the process, and `/generate-canto-audio` and `/review-canto-audio` follow it.

- Always run `npm run audio:generate -- --only <cantos> --dry-run` and state the cost before spending credits
- Voices live only in `data/voices.json`. Don't read voice IDs or settings from anywhere else
- Never copy audio into `public/` or stage `data/speaker-mapping.json` by hand. The file can hold unpublished work on other cantos, so use `npm run audio:publish`
- `npm run audio:check` must pass, and someone must listen, before a canto is published. Publish only with the user's approval
- Run `npm run audio:backup` after recording, because `scripts/narrations_v4/` is gitignored and holds the only copy of the recordings
