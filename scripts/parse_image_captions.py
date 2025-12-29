#!/usr/bin/env python3
"""
Parse imagecaptions.md and create a JSON mapping of images to cantos.
"""

import re
import json

def parse_captions(file_path):
    """Parse the imagecaptions.md file and extract image metadata."""

    with open(file_path, 'r') as f:
        content = f.read()

    # Pattern to match each caption entry
    # Example: 1. **THE FOREST** — _Midway upon... (Inf. I, 1–3)._
    pattern = r'(\d+)\.\s+\*\*(.+?)\*\*\s+—\s+_(.+?)\((\w+)\.\s+([IVXLCDM]+),\s+(.+?)\)\._'

    images = []
    matches = re.finditer(pattern, content)

    for match in matches:
        image_num = int(match.group(1))
        title = match.group(2)
        quote = match.group(3).strip()
        cantica_abbr = match.group(4)  # Inf, Purg, or Par
        canto_roman = match.group(5)  # Roman numeral
        lines = match.group(6)

        # Convert cantica abbreviation to full name
        cantica_map = {
            'Inf': 'inferno',
            'Purg': 'purgatorio',
            'Par': 'paradiso'
        }
        cantica = cantica_map.get(cantica_abbr, cantica_abbr.lower())

        # Convert Roman numeral to Arabic number
        canto_num = roman_to_int(canto_roman)

        images.append({
            'imageNumber': image_num,
            'title': title,
            'quote': quote,
            'cantica': cantica,
            'canto': canto_num,
            'lines': lines,
            'filename': f'{image_num}.png'
        })

    return images


def roman_to_int(roman):
    """Convert Roman numeral to integer."""
    roman_values = {
        'I': 1, 'V': 5, 'X': 10, 'L': 50,
        'C': 100, 'D': 500, 'M': 1000
    }

    total = 0
    prev_value = 0

    for char in reversed(roman):
        value = roman_values[char]
        if value < prev_value:
            total -= value
        else:
            total += value
        prev_value = value

    return total


def create_canto_mapping(images):
    """Create a mapping of cantos to their images."""
    canto_map = {}

    for img in images:
        cantica = img['cantica']
        canto = img['canto']
        key = f"{cantica}-{canto}"

        if key not in canto_map:
            canto_map[key] = []

        canto_map[key].append({
            'imageNumber': img['imageNumber'],
            'filename': img['filename'],
            'title': img['title'],
            'quote': img['quote'],
            'lines': img['lines']
        })

    # Sort images within each canto by image number
    for key in canto_map:
        canto_map[key].sort(key=lambda x: x['imageNumber'])

    return canto_map


if __name__ == '__main__':
    import sys

    input_file = '/Users/Sina/ModernDante/public/imagecaptions.md'
    output_file = '/Users/Sina/ModernDante/data/image-mappings.json'

    print("Parsing imagecaptions.md...")
    images = parse_captions(input_file)

    print(f"✓ Found {len(images)} images")

    print("\nCreating canto mapping...")
    canto_map = create_canto_mapping(images)

    print(f"✓ Mapped images to {len(canto_map)} cantos")

    # Save to JSON
    output_data = {
        'images': images,
        'cantoMapping': canto_map
    }

    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"\n✅ Saved mapping to {output_file}")

    # Print summary
    print("\n" + "="*60)
    print("SUMMARY BY CANTICA")
    print("="*60)

    for cantica in ['inferno', 'purgatorio', 'paradiso']:
        cantica_images = [img for img in images if img['cantica'] == cantica]
        cantos = set(img['canto'] for img in cantica_images)
        print(f"{cantica.title()}: {len(cantica_images)} images across {len(cantos)} cantos")

        # Show canto distribution
        canto_counts = {}
        for img in cantica_images:
            canto = img['canto']
            canto_counts[canto] = canto_counts.get(canto, 0) + 1

        print(f"  Cantos with images: {sorted(cantos)}")
        print(f"  Max images in one canto: {max(canto_counts.values())}")
        print()
