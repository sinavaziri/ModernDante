# Gustave Doré Illustrations

This directory contains Gustave Doré's iconic illustrations for The Divine Comedy.

## Directory Structure

```
public/images/
├── inferno/
│   ├── canto-01.jpg
│   ├── canto-02.jpg
│   ├── canto-03.jpg
│   └── ... (up to canto-34.jpg)
├── purgatorio/
│   ├── canto-01.jpg
│   └── ... (up to canto-33.jpg)
└── paradiso/
    ├── canto-01.jpg
    └── ... (up to canto-33.jpg)
```

## Adding Images

### 1. Naming Convention

Images MUST follow this exact naming pattern:
- `canto-01.jpg` (not `canto-1.jpg`)
- `canto-02.jpg` (not `canto-2.jpg`)
- Always use two digits with leading zero
- Use `.jpg` extension (lowercase)

### 2. Where to Find Doré Illustrations

**Free, Public Domain Sources:**

- **Wikimedia Commons**: https://commons.wikimedia.org/wiki/Category:Gustave_Doré_-_Inferno
  - High-resolution scans
  - Public domain
  - Search for "Gustave Doré Inferno Canto [number]"

- **Project Gutenberg**: https://www.gutenberg.org/
  - Search for "Divine Comedy Doré"

- **Internet Archive**: https://archive.org/
  - Search for "Dante Divine Comedy Gustave Doré"

### 3. Recommended Images (Inferno)

Here are some iconic cantos to prioritize:

- **Canto I**: The Dark Forest (Dante lost among the trees)
- **Canto III**: Gate of Hell ("Abandon all hope...")
- **Canto V**: Paolo and Francesca (lovers in the whirlwind)
- **Canto VIII**: Crossing the Styx
- **Canto XIII**: The Wood of Suicides
- **Canto XXI**: The Malebranche (demons with hooks)
- **Canto XXVIII**: The Sowers of Discord
- **Canto XXXIV**: Satan frozen in ice

### 4. Quick Download Example

Using Wikimedia Commons:

1. Go to: https://commons.wikimedia.org/wiki/Category:Gustave_Doré_-_Inferno
2. Find an illustration (e.g., "Plate 8 - Canto III")
3. Click on the image
4. Click "Original file" on the right side
5. Right-click → "Save image as..."
6. Rename to `canto-03.jpg`
7. Place in `public/images/inferno/`

### 5. Image Specifications

- **Format**: JPG or JPEG
- **Size**: No specific requirement (will auto-scale), but ~1000-2000px width is ideal
- **Aspect ratio**: Vertical/portrait preferred (Doré's engravings are typically taller than wide)

## How It Works

The app automatically looks for images matching the pattern:
```
/images/{cantica}/canto-{number}.jpg
```

If an image exists, it's displayed above the text. If not, no image is shown (graceful fallback).

## Copyright

All Gustave Doré illustrations are in the public domain (published 1861-1868, artist died 1883).
You are free to:
- Download from any source
- Use without attribution
- Modify as needed

## Bulk Download Script

If you want to download many images at once, you can use the Python script:

```bash
python3 scripts/download_dore_inferno.py
```

Note: This script may encounter rate limits. Manual curation is often faster for 10-20 images.
