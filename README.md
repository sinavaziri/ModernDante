# The Divine Comedy - Modern Translation

A web application that presents Dante's Divine Comedy with modern approachable English

## Features

- **Complete work**: All 100 cantos (Inferno, Purgatorio, Paradiso)
- **Modern rewrites**: Clear, accessible English
- **Easy navigation**: Browse by cantica and canto with prev/next buttons
- **Static site**: Fast, deployable anywhere (Vercel, GitHub Pages, etc.)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Process the PDF

The PDF is already in the project. Run these scripts to extract and structure the text:

```bash
# Extract text from PDF
npm run parse

# Split into cantos
npm run split
```

This creates `data/cantos.json` with all 100 cantos.

### 3. Generate Modern Translations

You'll need a Claude API key from https://console.anthropic.com/

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API key:

```
ANTHROPIC_API_KEY=your_api_key_here
```

Then run the generation script:

```bash
# Test mode: Generate only Inferno Canto I
node scripts/generate-rewrites.js

# Generate all of Inferno (34 cantos)
MODE=inferno node scripts/generate-rewrites.js

# Generate everything (100 cantos - will take time and API credits)
MODE=all node scripts/generate-rewrites.js
```

**Note**: The generation script:
- Saves progress after each canto
- Can be resumed if interrupted
- Includes 2-second delays between API calls
- Costs approximately $0.02-0.04 per canto with Claude Sonnet

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### 5. Build for Production

```bash
npm run build
```

This creates a static site in the `out/` directory that can be deployed anywhere.

## Project Structure

```
ModernDante/
├── data/
│   ├── cantos.json          # Structured canto data with translations
│   └── raw-text.txt         # Intermediate PDF extraction
├── scripts/
│   ├── parse-pdf.js         # Extract text from PDF
│   ├── split-cantos.js      # Split text into cantos
│   └── generate-rewrites.js # Generate modern versions with Claude
├── src/
│   ├── app/
│   │   ├── [cantica]/[canto]/page.tsx  # Dynamic canto pages
│   │   ├── page.tsx                     # Homepage
│   │   └── layout.tsx                   # Root layout
│   ├── components/
│   │   ├── CantoDisplay.tsx   # Side-by-side display
│   │   ├── Navigation.tsx     # Header navigation
│   │   └── CantoSelector.tsx  # Dropdown selectors
│   └── lib/
│       └── cantos.ts          # Data utilities
└── Dante-Alighieri-The-Divine-Comedy.pdf
```

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### GitHub Pages

```bash
npm run build
# Deploy the out/ directory to gh-pages branch
```

### Other Static Hosts

Deploy the `out/` directory to any static hosting service (Netlify, Cloudflare Pages, etc.)

## Development Workflow

1. **Add new features**: Modify components in `src/`
2. **Regenerate translations**: Re-run `generate-rewrites.js` with updated prompts
3. **Update styling**: Edit Tailwind classes or `src/app/globals.css`
4. **Test locally**: `npm run dev`
5. **Build**: `npm run build`

## Extending the Project

### Add More Canticas

The architecture is already set up for all three canticas. Just ensure:
- PDF parsing correctly identifies all parts
- `data/cantos.json` is populated
- Run the generation script for new canticas

### Customize the Prompt

Edit `scripts/generate-rewrites.js` and modify the Claude prompt to:
- Change rhyme scheme
- Adjust reading level
- Add annotations
- Change tone or style

### Add Features

Some ideas:
- Search functionality
- Bookmarks/favorites
- Dark mode toggle
- Audio narration
- Annotations and commentary
- Comparison with other translations

## License

This project uses public domain texts (Longfellow translation, Dante's original).
Generated translations are created using Claude AI.

## Credits

- **Original Work**: Dante Alighieri (1265-1321)
- **Translation**: Henry Wadsworth Longfellow
- **Modern Rewrites**: Generated using Claude (Anthropic)
- **PDF Source**: Public domain via Wikisource
