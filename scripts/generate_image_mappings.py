#!/usr/bin/env python3
"""
Generate updated image-mappings.ts based on renamed files.
For cantos with multiple images, selects the most representative one.
"""

import json
from pathlib import Path
from collections import defaultdict

# Setup paths
PROJECT_ROOT = Path(__file__).parent.parent
ANALYSIS_FILE = PROJECT_ROOT / "data" / "image-analysis.json"
OUTPUT_FILE = PROJECT_ROOT / "src" / "lib" / "image-mappings.ts"

def parse_line_range(lines_str):
    """Parse line range string to get the first line number."""
    if not lines_str or lines_str == "general":
        return 999999  # Put general images last

    # Handle ranges like "1-30" or single numbers
    parts = lines_str.split('-')
    try:
        return int(parts[0])
    except ValueError:
        return 999999

def main():
    print("=" * 70)
    print("Image Mappings Generator")
    print("=" * 70)
    print()

    # Load analysis results
    with open(ANALYSIS_FILE, 'r') as f:
        analyses = json.load(f)

    print(f"Loaded {len(analyses)} image analyses\n")

    # Group images by canto
    canto_images = defaultdict(list)
    for analysis in analyses:
        canto_num = analysis['canto']
        canto_images[canto_num].append(analysis)

    # For each canto, select the best image
    # Priority: earliest line numbers (most representative of canto)
    selected_mappings = {}

    for canto_num in sorted(canto_images.keys()):
        images = canto_images[canto_num]

        if len(images) == 1:
            selected = images[0]
        else:
            # Sort by line number (earliest first)
            images.sort(key=lambda x: parse_line_range(x['lines']))
            selected = images[0]

        selected_mappings[canto_num] = selected['suggested_filename']

        if len(images) > 1:
            print(f"Canto {canto_num}: {len(images)} images found")
            print(f"  → Selected: {selected['suggested_filename']}")
            for img in images[1:]:
                print(f"  → Alternate: {img['suggested_filename']}")
            print()

    # Generate TypeScript file
    ts_content = """// Mapping of cantos to Doré illustration filenames
// Auto-generated from image analysis results

export const infernoImageMap: Record<number, string> = {
"""

    for canto_num in sorted(selected_mappings.keys()):
        filename = selected_mappings[canto_num]
        ts_content += f"  {canto_num}: '{filename}',\n"

    ts_content += """};\n
export function getImageForCanto(cantica: string, cantoNumber: number): string | null {
  if (cantica === 'inferno') {
    return infernoImageMap[cantoNumber] || null;
  }
  // Add purgatorio and paradiso mappings as needed
  return null;
}
"""

    # Write the file
    with open(OUTPUT_FILE, 'w') as f:
        f.write(ts_content)

    print("=" * 70)
    print(f"✅ Generated image mappings: {OUTPUT_FILE}")
    print(f"✅ Mapped {len(selected_mappings)} cantos to images")
    print("=" * 70)

if __name__ == "__main__":
    main()
