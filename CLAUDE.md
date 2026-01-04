# ModernDante

A web application presenting Dante's Divine Comedy with side-by-side original (Longfellow) and AI-generated modern English translations, 135 Gustave Doré illustrations, and character-voiced audio narration with word-level synchronization.

## Tech Stack

- **Framework**: Next.js 16 with App Router, static export (`output: "export"`)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4, custom CSS variables for theming
- **APIs**: Anthropic Claude (translations), ElevenLabs (audio generation)
- **Fonts**: Sabon (poetry), Source Sans 3 (UI), Libre Franklin (navigation)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ModernDante                                     │
│         Dante's Divine Comedy with Modern Translation & Audio                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Inferno    │    │  Purgatorio  │    │   Paradiso   │                   │
│  │  34 Cantos   │    │  33 Cantos   │    │  33 Cantos   │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                           │                                                  │
│                    100 Total Cantos                                          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Each Canto Contains:                                                │    │
│  │  • Original text (Longfellow translation)                           │    │
│  │  • Modern English translation (Claude-generated)                    │    │
│  │  • Doré illustrations                                               │    │
│  │  • Character-voiced audio with word-level sync                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
ModernDante/
│
├── src/                          # Source Code
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # Root layout (fonts, metadata)
│   │   ├── page.tsx              # Homepage with carousel
│   │   ├── globals.css           # Global styles
│   │   ├── [cantica]/[canto]/    # Dynamic canto pages
│   │   │   └── page.tsx          # Individual canto view
│   │   └── gallery/              # Doré illustration gallery
│   │       └── page.tsx
│   │
│   ├── components/               # React Components
│   │   ├── CantoDisplayWithAudio.tsx   # Main canto viewer
│   │   ├── AudioPlayerWordLevel.tsx    # Audio player + sync
│   │   ├── TextWithWordHighlighting.tsx # Highlighted text
│   │   ├── Navigation.tsx              # Header nav
│   │   ├── CantoSelector.tsx           # Canto dropdown
│   │   └── HeroImageCarousel.tsx       # Homepage carousel
│   │
│   ├── lib/                      # Utilities
│   │   ├── cantos.ts             # Data access layer
│   │   ├── constants.ts          # App constants
│   │   └── image-mappings.ts     # Image utilities
│   │
│   ├── types/                    # TypeScript Definitions
│   │   └── audio.ts              # Audio-related types
│   │
│   └── data/                     # Static Data (src)
│       └── image-mappings.json   # Image-to-canto mapping
│
├── data/                         # Content Data
│   ├── cantos.json               # All 100 cantos (original + modern)
│   ├── character-voice-profiles.json  # 80+ character voices
│   ├── speaker-mapping.json      # Character-to-segment mapping
│   └── claude-translations.json  # Translation backup
│
├── public/                       # Static Assets
│   ├── audio/                    # Generated MP3 files
│   │   ├── inferno/
│   │   ├── purgatorio/
│   │   └── paradiso/
│   ├── audio-word-timings.json   # Word-level timestamps
│   ├── images/                   # Processed Doré illustrations
│   │   ├── inferno/    (75 images)
│   │   ├── purgatorio/ (42 images)
│   │   └── paradiso/   (18 images)
│   └── fonts/                    # Custom fonts
│
├── scripts/                      # Build & Generation Scripts
│   ├── parse-pdf.js              # PDF → raw text
│   ├── split-cantos.js           # Text → cantos.json
│   ├── generate-rewrites.js      # Original → modern translation
│   ├── create-voices.js          # ElevenLabs voice creation
│   ├── generate-narration-with-timestamps.js  # Audio generation
│   ├── analyze-speakers.js       # Speaker analysis
│   ├── crop_and_upscale.py       # Image processing
│   └── ...                       # Other utilities
│
└── out/                          # Static Build Output
```

## Commands

```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Static site build (outputs to out/)
npm run prepare-data # Full pipeline: parse PDF → split cantos → generate translations
npm run parse        # PDF to raw text
npm run split        # Raw text to cantos.json
npm run generate     # Generate modern translations via Claude
```

## Build Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL SERVICES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌─────────────────┐              ┌─────────────────┐                     │
│    │  Anthropic API  │              │  ElevenLabs API │                     │
│    │    (Claude)     │              │    (Voices)     │                     │
│    └────────┬────────┘              └────────┬────────┘                     │
│             │                                │                               │
│             ▼                                ▼                               │
│    ┌─────────────────┐              ┌─────────────────┐                     │
│    │   Translation   │              │ Audio Generation│                     │
│    │   Generation    │              │ + Word Timings  │                     │
│    └────────┬────────┘              └────────┬────────┘                     │
│             │                                │                               │
└─────────────┼────────────────────────────────┼───────────────────────────────┘
              │                                │
              ▼                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BUILD PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PDF Source ──► parse-pdf.js ──► split-cantos.js ──► generate-rewrites.js   │
│                                                              │               │
│                                                              ▼               │
│                                                      data/cantos.json        │
│                                                                              │
│  character-voice-profiles.json ──► create-voices.js ──► ElevenLabs Voices   │
│                                                                              │
│  speaker-mapping.json ──► generate-narration-with-timestamps.js             │
│                                          │                                   │
│                                          ▼                                   │
│                              public/audio/*.mp3                              │
│                              public/audio-word-timings.json                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PAGE STRUCTURE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         layout.tsx                                   │    │
│  │  • Fonts (Sabon, Source Sans 3, Libre Franklin)                     │    │
│  │  • Metadata                                                          │    │
│  │  • Global styles                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Navigation.tsx                               │    │
│  │  • Header bar                                                        │    │
│  │  • Home link                                                         │    │
│  │  • CantoSelector dropdown                                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│           ┌────────────────────────┼────────────────────────┐               │
│           ▼                        ▼                        ▼               │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │    page.tsx     │    │ [cantica]/[canto]│    │   gallery/     │         │
│  │   (Homepage)    │    │    page.tsx      │    │   page.tsx     │         │
│  └────────┬────────┘    └────────┬─────────┘    └────────────────┘         │
│           │                      │                                          │
│           ▼                      ▼                                          │
│  ┌─────────────────┐    ┌─────────────────────────────────────────┐        │
│  │HeroImageCarousel│    │        CantoDisplayWithAudio.tsx        │        │
│  └─────────────────┘    │  ┌─────────────────────────────────┐    │        │
│                         │  │   Side-by-side text display     │    │        │
│                         │  │   Original  │  Modern            │    │        │
│                         │  └─────────────────────────────────┘    │        │
│                         │  ┌─────────────────────────────────┐    │        │
│                         │  │  TextWithWordHighlighting.tsx   │    │        │
│                         │  │  (Audio-synced text display)    │    │        │
│                         │  └─────────────────────────────────┘    │        │
│                         │  ┌─────────────────────────────────┐    │        │
│                         │  │    Image Lightbox Modal         │    │        │
│                         │  └─────────────────────────────────┘    │        │
│                         └─────────────────────────────────────────┘        │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    AudioPlayerWordLevel.tsx                          │   │
│  │  • Sticky bottom bar                                                 │   │
│  │  • Play/pause, skip ±15s                                            │   │
│  │  • Progress bar                                                      │   │
│  │  • Word-level highlighting sync                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Model

Each canto in `data/cantos.json`:
```typescript
{
  number: number,
  title: string,      // "Canto I" (Roman numerals)
  subtitle: string,   // Descriptive title
  original: string,   // Longfellow translation
  modern: string,     // Claude-generated modern version
  lineCount: number
}
```

## Audio System

### Character Voices (80+ in character-voice-profiles.json)

**Main Characters:**
- `narrator` - Dante as poet (narration)
- `dante` - Dante the Pilgrim (dialogue)
- `virgil` - The Ancient Guide
- `beatrice` - Divine Love
- `lucia` - Saint Lucia
- `character` - Generic fallback voice

**Supporting Characters:**
- Inferno: Charon, Minos, Francesca, Farinata, Ugolino, Ulysses...
- Purgatorio: Cato, Casella, Manfred, Statius, Matelda...
- Paradiso: Piccarda, Justinian, Cacciaguida, St. Peter, St. Bernard...

Each voice profile has: `voiceId`, `stability`, `similarity`, `style`, `speed`

### Speaker Mapping (speaker-mapping.json)

Maps characters to text segments for each canto:
```json
{
  "inferno": {
    "1": [
      { "speaker": "narrator", "text": "Midway upon..." },
      { "speaker": "dante", "text": "\"I cannot well...\"" },
      { "speaker": "virgil", "text": "\"I was a poet...\"" }
    ]
  }
}
```

### Word-Level Timing (audio-word-timings.json)

Enables synchronized text highlighting during playback:
```json
{
  "inferno/canto_1": {
    "words": [
      { "word": "Midway", "start": 0.0, "end": 0.45 },
      { "word": "upon", "start": 0.45, "end": 0.72 }
    ]
  }
}
```

## Audio Generation

```bash
# Generate audio for a specific canto
node scripts/generate-narration-with-timestamps.js --cantica inferno --canto 1

# Preview character voices
node scripts/generate-character-previews.js

# View character segments
node scripts/show-character-segments.js --cantica inferno --canto 5
```

## Translation Generation

```bash
# Test with Canto I only
node scripts/generate-rewrites.js test

# Generate for all of Inferno
node scripts/generate-rewrites.js inferno

# Generate for all 100 cantos
node scripts/generate-rewrites.js all
```

## Image Processing

```bash
# Crop and upscale Doré illustrations
python scripts/crop_and_upscale.py

# Generate image-to-canto mappings
python scripts/generate_image_mappings.py
```

## URL Structure

```
/                    → Homepage with carousel
/inferno/1           → Inferno Canto I
/inferno/34          → Inferno Canto XXXIV
/purgatorio/1        → Purgatorio Canto I
/purgatorio/33       → Purgatorio Canto XXXIII
/paradiso/1          → Paradiso Canto I
/paradiso/33         → Paradiso Canto XXXIII
/gallery             → All 135 Doré illustrations
```

## Environment Variables

Required in `.env.local`:
```
ANTHROPIC_API_KEY=your-key-here
ELEVENLABS_API_KEY=your-key-here
```

## Code Conventions

- **Client components**: Use `'use client'` directive for interactivity
- **Imports**: Use `@/` alias for `src/` paths
- **Styling**: Tailwind utilities; global CSS for animations/typography
- **Components**: PascalCase, colocate types with components
- **Data access**: Use functions from `lib/cantos.ts`, never import JSON directly in components

## Key Files

| File | Purpose |
|------|---------|
| `data/cantos.json` | All 100 cantos with original + modern text |
| `data/character-voice-profiles.json` | 80+ character voice configurations |
| `data/speaker-mapping.json` | Character-to-segment mapping for audio |
| `src/lib/cantos.ts` | Data access functions (never import JSON directly) |
| `src/lib/constants.ts` | Layout, audio, animation constants |
| `src/data/image-mappings.json` | Doré illustration metadata |
| `public/audio-word-timings.json` | Word-level timestamps for highlighting |

## Design Guidelines

- **Color palette**: Deep maroon primary (#6b3a3a), warm beige background
- **Typography**: Poetry at 19px Sabon with 1.85 line-height
- **Spacing**: Generous padding for readability
- **Images**: All 135 Doré illustrations mapped to specific cantos
