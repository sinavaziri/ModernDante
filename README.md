# The Divine Comedy - Modern Translation

Dante's Divine Comedy in plain modern English, with Gustave Doré's engravings in color and narration in a different voice for each character.

## Features

- **Complete work**: All 100 cantos (Inferno, Purgatorio, Paradiso), rewritten from Longfellow's translation
- **Illustrations**: Doré's 135 engravings, colorized, in each canto and in a gallery
- **Narration**: Every canto read aloud, highlighted word by word; click any word to play from it
- **Notes**: An on/off switch for notes on people, places and ideas (Inferno I and IV so far)
- **Dark mode**: Follows the device, with a switch in the header
- **Static site**: Next.js static export, no server

## Setup

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static site in out/
npm run lint
```

Node 22.6 or later, for the tools. The site itself needs no API keys. The tools read theirs from `.env.local` (copy `.env.example`).

## Commands

| Command | What it does |
|---|---|
| `npm run audio:*` | The narration pipeline: generate, check, listen, publish, back up. See `tools/audio/README.md` |
| `npm run notes:check` | Checks every note against the text, the glossary and its pictures |
| `npm run images:plates` | Makes the WebP copies of the plates that the site serves, from the masters in `plates/` |
| `npm run images:carousel` | Makes the home page's carousel and cantica images |
| `npm run images:notes` | Makes the pictures on note cards |
| `npm run images:icons` | Makes the favicon, touch icon and header logo |
| `node scripts/colorize-images.js` | Colorizes engravings with OpenAI's image model (costs money; needs `OPENAI_API_KEY`) |

## Project Structure

```
ModernDante/
├── data/
│   ├── cantos.json              # Longfellow's text and the modern translation for each canto
│   ├── speaker-mapping.json     # Narration script: segments and who speaks them
│   ├── voices.json              # ElevenLabs voices for each speaker
│   ├── voice-fix-plans.json     # Speaker corrections waiting to be applied
│   ├── annotations/             # Each annotated canto's notes
│   ├── glossary.json            # People, places and ideas the notes link to
│   └── art.json, art/           # Public-domain art for note cards, with credits and crop settings
├── plates/                      # Master PNGs of Doré's plates: bw/ (the engravings) and color/. Not published
├── scripts/colorize-images.js   # Colorizes plates/bw into plates/color
├── tools/
│   ├── audio/                   # Narration pipeline (see its README)
│   ├── images/                  # The images:* commands
│   └── notes/                   # notes:check
├── public/
│   ├── audio/, audio-timings/   # Published narration MP3s and their word timings
│   ├── images-plates/           # WebP copies of the plates, full size and 640px
│   ├── images-carousel/         # 4:5 crops for the home page
│   ├── images-notes/            # 12:5 crops for note cards
│   └── fonts/                   # Sabon
└── src/
    ├── app/                     # Home page, gallery, canto pages, layout, globals.css
    ├── components/              # Canto display, audio player, note cards, navigation
    ├── data/                    # Plate captions and positions, image sizes, carousel list, note crops
    └── lib/                     # Text, plates, notes, narration sync, theme, saved listening place
```

`Dante-Alighieri-The-Divine-Comedy.pdf` is the source of Longfellow's text. The scripts that parsed it and generated the translations were one-time work and have been removed; they are in the git history. `data/cantos.json` is now edited directly.

## Deployment

Vercel deploys `main` on every push: commit, then `git push origin main`.

## Credits

- **Original work**: Dante Alighieri (1265–1321)
- **Translation**: Henry Wadsworth Longfellow, rewritten in modern English with Claude (Anthropic)
- **Illustrations**: Gustave Doré, 1857–1868, colorized for this site
- **Narration**: ElevenLabs voices
