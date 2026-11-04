---
name: review-canto-audio
description: Review generated canto audio before or after publishing. Runs the tools/audio check for text, timing and sound problems, reads the speaker assignments against the poem, and publishes only with approval. Use after generating audio, or to audit what is live.
allowed-tools: Read, Bash, Glob, Grep
user-invocable: true
---

# Review Canto Audio

Takes a canto or list of cantos, for example "inferno 1", or "all". In commands, write them as `inferno:1,purgatorio:33`, or use `--all`. `tools/audio/README.md` has the details.

## 1. Run the check

```bash
npm run audio:check -- --only <cantos>          # what is built locally
npm run audio:check -- --only <cantos> --live   # what is on the site
```

A failure blocks publishing. Warnings are for judgment: a faint tick may be inaudible, but a volume jump near the limit deserves a listen. Limits are at the top of `tools/audio/check.mjs`. Don't loosen one to get a canto through.

## 2. Read the speakers

The check can't tell who should be speaking. Read the canto's segments in `data/speaker-mapping.json` against the poem, and look for:

- Narration read by a character, such as Virgil saying "I had already fixed my eyes on his"
- Speech read by the narrator, or by the wrong character
- A voice that changes in the middle of a speech
- The wrong gender. Speakers with no voice of their own share one for each gender, set in `data/voices.json`

Corrections go in `data/voice-fix-plans.json`. Quotation marks in segments are unreliable, so go by the poem.

## 3. Listen

```bash
npm run audio:listen -- <canto> <canto>
```

You can't hear audio, so tell the user plainly what still needs their ears. Don't call audio good on measurements alone.

## 4. Publish, only when the user approves

```bash
npm run audio:publish -- --only <cantos> --dry-run   # what would be committed
npm run audio:publish -- --only <cantos> --push      # commit and deploy these cantos only
npm run audio:publish -- --only <cantos> --verify    # after Vercel finishes, confirm the live files
```

Then play a canto on the live page and confirm the highlight follows the words.

## Report

For each canto, give pass or fail with the reasons, what you read, what still needs listening, and whether it is live.
