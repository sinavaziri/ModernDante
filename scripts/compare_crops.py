#!/usr/bin/env python3
"""
Compare the correctly cropped image with the auto-cropped version
to understand the proper cropping parameters.
"""

from pathlib import Path
from PIL import Image
import numpy as np

PROJECT_ROOT = Path(__file__).parent.parent
IMAGE_DIR = PROJECT_ROOT / "public" / "images" / "inferno"
CROPPED_DIR = IMAGE_DIR / "cropped"

# Original
original_path = IMAGE_DIR / "canto-01_lines-1-30_dante-lost-in-the-dark-wood.png"
# My crop
my_crop_path = CROPPED_DIR / "canto-01_lines-1-30_dante-lost-in-the-dark-wood.png"
# Correct crop
correct_crop_path = CROPPED_DIR / "canto-01_lines-1-30_dante-lost-in-the-dark-wood-correctly cropped.png"

print("=" * 70)
print("Image Crop Comparison")
print("=" * 70)
print()

# Load images
original = Image.open(original_path)
my_crop = Image.open(my_crop_path)
correct_crop = Image.open(correct_crop_path)

print(f"Original size:        {original.size[0]:4d} x {original.size[1]:4d}")
print(f"My crop size:         {my_crop.size[0]:4d} x {my_crop.size[1]:4d}")
print(f"Correct crop size:    {correct_crop.size[0]:4d} x {correct_crop.size[1]:4d}")
print()

# Calculate what was removed
print("What was removed:")
print(f"My crop:      width: {original.size[0] - my_crop.size[0]:4d}px, height: {original.size[1] - my_crop.size[1]:4d}px")
print(f"Correct crop: width: {original.size[0] - correct_crop.size[0]:4d}px, height: {original.size[1] - correct_crop.size[1]:4d}px")
print()

# Analyze the correct crop to determine the threshold
print("Analyzing correct crop to determine detection threshold...")
print()

# Convert images to grayscale numpy arrays
original_gray = np.array(original.convert('L'))
correct_gray = np.array(correct_crop.convert('L'))

# Find the bounding box by comparing dimensions
# Calculate how much was cropped from each side
width_removed = original.size[0] - correct_crop.size[0]
height_removed = original.size[1] - correct_crop.size[1]

print(f"Total removed: {width_removed}px width, {height_removed}px height")
print()

# Analyze edge pixel values to understand the threshold
print("Analyzing edge pixel values from original:")

# Sample the edges
top_edge = original_gray[0:50, :].flatten()
bottom_edge = original_gray[-50:, :].flatten()
left_edge = original_gray[:, 0:50].flatten()
right_edge = original_gray[:, -50:].flatten()

print(f"Top edge:    min={top_edge.min():3d}, max={top_edge.max():3d}, mean={top_edge.mean():.1f}")
print(f"Bottom edge: min={bottom_edge.min():3d}, max={bottom_edge.max():3d}, mean={bottom_edge.mean():.1f}")
print(f"Left edge:   min={left_edge.min():3d}, max={left_edge.max():3d}, mean={left_edge.mean():.1f}")
print(f"Right edge:  min={right_edge.min():3d}, max={right_edge.max():3d}, mean={right_edge.mean():.1f}")
print()

# Sample the content area (center)
center_h = original_gray.shape[0] // 2
center_w = original_gray.shape[1] // 2
center_region = original_gray[center_h-100:center_h+100, center_w-100:center_w+100].flatten()

print(f"Center content: min={center_region.min():3d}, max={center_region.max():3d}, mean={center_region.mean():.1f}")
print()

print("=" * 70)
print("Recommendation:")
print("Based on the correctly cropped version, the script needs to be more")
print("aggressive in removing the background. The edges appear to be very dark")
print("(close to black) while the actual content has higher brightness values.")
print("=" * 70)
