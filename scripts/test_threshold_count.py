#!/usr/bin/env python3
"""
Test threshold using pixel count instead of average.
"""

from pathlib import Path
from PIL import Image
import numpy as np

PROJECT_ROOT = Path(__file__).parent.parent
IMAGE_DIR = PROJECT_ROOT / "public" / "images" / "inferno"

original_path = IMAGE_DIR / "canto-01_lines-1-30_dante-lost-in-the-dark-wood.png"

print("Testing threshold with pixel counting method...")
print()
print(f"Target (correct crop): 856 x 1090")
print(f"Original size: 2812 x 1908")
print()

# Load image
img = Image.open(original_path)
img_array = np.array(img.convert('L'))

# Test: count how many pixels in each row/col are above brightness threshold
pixel_threshold = 50  # Pixel must be brighter than this
min_pixel_count = 100   # Row/column must have at least this many bright pixels

# Count bright pixels in each row
row_counts = (img_array > pixel_threshold).sum(axis=1)

# Count bright pixels in each column
col_counts = (img_array > pixel_threshold).sum(axis=0)

print(f"Using pixel_threshold={pixel_threshold}, min_count={min_pixel_count}")
print()

# Find content boundaries
first_row = 0
for i, count in enumerate(row_counts):
    if count > min_pixel_count:
        first_row = i
        break

last_row = len(row_counts) - 1
for i in range(len(row_counts) - 1, -1, -1):
    if row_counts[i] > min_pixel_count:
        last_row = i
        break

first_col = 0
for i, count in enumerate(col_counts):
    if count > min_pixel_count:
        first_col = i
        break

last_col = len(col_counts) - 1
for i in range(len(col_counts) - 1, -1, -1):
    if col_counts[i] > min_pixel_count:
        last_col = i
        break

width = last_col - first_col
height = last_row - first_row

print(f"Result: {width} x {height}")
print(f"  Rows: {first_row} to {last_row}")
print(f"  Cols: {first_col} to {last_col}")
print()

width_diff = abs(width - 856)
height_diff = abs(height - 1090)
print(f"Difference from target: w={width_diff}, h={height_diff}")
print()

# Now test different parameter combinations
print("Testing different parameter combinations:")
print()
print(f"{'PixelThresh':>12} {'MinCount':>10} {'Width':>7} {'Height':>7} {'WDiff':>7} {'HDiff':>7}")
print("-" * 70)

best_total_diff = float('inf')
best_params = None

for pix_thresh in [30, 40, 50, 60, 70, 80]:
    for min_count in [50, 100, 200, 300, 500]:
        row_counts = (img_array > pix_thresh).sum(axis=1)
        col_counts = (img_array > pix_thresh).sum(axis=0)

        first_row = next((i for i, c in enumerate(row_counts) if c > min_count), 0)
        last_row = next((i for i in range(len(row_counts)-1, -1, -1) if row_counts[i] > min_count), len(row_counts)-1)
        first_col = next((i for i, c in enumerate(col_counts) if c > min_count), 0)
        last_col = next((i for i in range(len(col_counts)-1, -1, -1) if col_counts[i] > min_count), len(col_counts)-1)

        w = last_col - first_col
        h = last_row - first_row
        w_diff = abs(w - 856)
        h_diff = abs(h - 1090)
        total_diff = w_diff + h_diff

        if total_diff < best_total_diff:
            best_total_diff = total_diff
            best_params = (pix_thresh, min_count, w, h)

        print(f"{pix_thresh:12d} {min_count:10d} {w:7d} {h:7d} {w_diff:7d} {h_diff:7d}")

print()
print(f"Best parameters: pixel_threshold={best_params[0]}, min_count={best_params[1]}")
print(f"Result: {best_params[2]} x {best_params[3]} (total diff: {best_total_diff})")
