#!/usr/bin/env python3
"""
Test PIL's getbbox() with different thresholds.
"""

from pathlib import Path
from PIL import Image

PROJECT_ROOT = Path(__file__).parent.parent
IMAGE_DIR = PROJECT_ROOT / "public" / "images" / "inferno"

original_path = IMAGE_DIR / "canto-01_lines-1-30_dante-lost-in-the-dark-wood.png"

print("Testing PIL getbbox() with different thresholds...")
print()
print(f"Target (correct crop): 856 x 1090")
print(f"Original size: 2812 x 1908")
print()

# Load image
img = Image.open(original_path)

print(f"{'Threshold':>10} {'Width':>7} {'Height':>7} {'WDiff':>7} {'HDiff':>7} {'TotalDiff':>10}")
print("-" * 60)

best_total_diff = float('inf')
best_threshold = None
best_size = None

for threshold in range(10, 151, 5):
    # Convert to grayscale
    grayscale = img.convert('L')

    # Apply threshold
    binary = grayscale.point(lambda x: 255 if x > threshold else 0)

    # Get bounding box
    bbox = binary.getbbox()

    if bbox:
        left, upper, right, lower = bbox
        width = right - left
        height = lower - upper

        w_diff = abs(width - 856)
        h_diff = abs(height - 1090)
        total_diff = w_diff + h_diff

        if total_diff < best_total_diff:
            best_total_diff = total_diff
            best_threshold = threshold
            best_size = (width, height)

        print(f"{threshold:10d} {width:7d} {height:7d} {w_diff:7d} {h_diff:7d} {total_diff:10d}")
    else:
        print(f"{threshold:10d}   (no content detected)")

print()
if best_threshold:
    print(f"Best match: threshold={best_threshold}")
    print(f"Result: {best_size[0]} x {best_size[1]} (total diff: {best_total_diff})")
