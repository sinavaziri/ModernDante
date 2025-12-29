#!/usr/bin/env python3
"""
Test different thresholds to find the best match for the correct crop.
"""

from pathlib import Path
from PIL import Image
import numpy as np

PROJECT_ROOT = Path(__file__).parent.parent
IMAGE_DIR = PROJECT_ROOT / "public" / "images" / "inferno"

original_path = IMAGE_DIR / "canto-01_lines-1-30_dante-lost-in-the-dark-wood.png"

print("Testing different thresholds...")
print()
print(f"Target (correct crop): 856 x 1090")
print()

# Load image
img = Image.open(original_path)
img_array = np.array(img.convert('L'))

# Calculate row and column averages
row_means = img_array.mean(axis=1)
col_means = img_array.mean(axis=0)

# Test different thresholds
for threshold in [20, 30, 40, 50, 60, 70]:
    # Find first/last content rows
    first_row = 0
    for i, mean in enumerate(row_means):
        if mean > threshold:
            first_row = i
            break

    last_row = len(row_means) - 1
    for i in range(len(row_means) - 1, -1, -1):
        if row_means[i] > threshold:
            last_row = i
            break

    # Find first/last content columns
    first_col = 0
    for i, mean in enumerate(col_means):
        if mean > threshold:
            first_col = i
            break

    last_col = len(col_means) - 1
    for i in range(len(col_means) - 1, -1, -1):
        if col_means[i] > threshold:
            last_col = i
            break

    width = last_col - first_col
    height = last_row - first_row

    width_diff = abs(width - 856)
    height_diff = abs(height - 1090)
    total_diff = width_diff + height_diff

    print(f"Threshold {threshold:2d}: {width:4d} x {height:4d}  (diff: w={width_diff:4d}, h={height_diff:4d}, total={total_diff:4d})")

print()
print("Finding best threshold...")
