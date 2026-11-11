# ModernDante

Dante's Divine Comedy: modern English translations (from Longfellow), 135 Gustave Doré illustrations, and character-voiced audio narration with word-level sync.

## Tech Stack

Next.js 16 (App Router, static export) · TypeScript (strict) · Tailwind CSS 4 · ElevenLabs (audio) · Anthropic Claude (translations)

## Key Commands

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Static build → out/
npm run lint         # ESLint
npm run notes:check  # Check the notes against the text
npm run images:plates # Remake the WebP plates the site serves, after changing a master in plates/
```

## Data Model

Three canticas — Inferno (34 cantos), Purgatorio (33), Paradiso (33) = 100 total. Source data in `data/cantos.json`, edited directly (the one-time parsing and translation scripts are in git history). Speaker mappings in `data/speaker-mapping.json`. Voices in `data/voices.json`. Audio process in `tools/audio/README.md`. Plate masters are PNGs in `plates/` (not published); the site serves the WebP copies in `public/images-plates/`.

## Deployment

Vercel, auto-deploys from `main` on push. To deploy: commit and `git push origin main`.

## Environment Variables

The site needs none. The tools read `.env.local` (see `.env.example`):
- `ELEVENLABS_API_KEY` — audio generation
- `AUDIO_BACKUP_DIR` — where `npm run audio:backup` copies the recordings
- `OPENAI_API_KEY` — `scripts/colorize-images.js`
- `FAL_KEY` — animation experiments

## Compaction

When compacting context, always preserve: the list of modified files, any pending tasks, test/build commands that were run, and the current phase of work.
