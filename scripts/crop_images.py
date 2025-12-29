#!/usr/bin/env python3
"""
Crop Doré illustrations to remove black backgrounds.
Detects the actual drawing area and crops to it.
"""

import sys
from pathlib import Path
from PIL import Image, ImageChops

def get_content_bbox(image):
    """
    Get bounding box of actual drawing content in the image.
    Returns (left, upper, right, lower) tuple.
    """
    # Convert to grayscale for easier analysis
    grayscale = image.convert('L')

    # Use a higher threshold to detect actual content vs dark background
    # Threshold of 40 means we only consider pixels brighter than this as content
    # This removes the dark gray/black borders around the actual drawing
    bbox = grayscale.point(lambda x: 255 if x > 40 else 0).getbbox()

    return bbox

def crop_image(input_path, output_path, padding=10):
    """
    Crop image to content area with optional padding.
    """
    print(f"Processing: {input_path.name}")

    # Open image
    img = Image.open(input_path)
    original_size = img.size
    print(f"  Original size: {original_size[0]}x{original_size[1]}")

    # Get content bounding box
    bbox = get_content_bbox(img)

    if bbox is None:
        print(f"  ⚠️  No content detected (all black?)")
        return False

    # Add padding
    left, upper, right, lower = bbox
    left = max(0, left - padding)
    upper = max(0, upper - padding)
    right = min(img.width, right + padding)
    lower = min(img.height, lower + padding)

    # Crop
    cropped = img.crop((left, upper, right, lower))
    cropped_size = cropped.size
    print(f"  Cropped size: {cropped_size[0]}x{cropped_size[1]}")
    print(f"  Removed: {original_size[0] - cropped_size[0]}px width, {original_size[1] - cropped_size[1]}px height")

    # Save
    cropped.save(output_path, 'PNG', optimize=True)
    print(f"  ✓ Saved: {output_path.name}\n")

    return True

def main():
    # Get mode from command line (test or all)
    mode = sys.argv[1] if len(sys.argv) > 1 else 'test'

    # Setup paths
    PROJECT_ROOT = Path(__file__).parent.parent
    IMAGE_DIR = PROJECT_ROOT / "public" / "images" / "inferno"
    OUTPUT_DIR = IMAGE_DIR / "cropped"
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Get all images sorted by name
    images = sorted(IMAGE_DIR.glob("canto-*.png"))

    if mode == 'test':
        # Only process first 5 for testing
        images = images[:5]
        print("=" * 70)
        print("Testing crop on first 5 images")
        print("=" * 70)
        print()
    else:
        print("=" * 70)
        print(f"Cropping all {len(images)} images")
        print("=" * 70)
        print()

    success_count = 0

    for img_path in images:
        output_path = OUTPUT_DIR / img_path.name
        if crop_image(img_path, output_path, padding=10):
            success_count += 1

    print("=" * 70)
    print(f"✅ Successfully cropped {success_count}/{len(images)} images")
    print(f"📁 Output directory: {OUTPUT_DIR}")
    print("=" * 70)

    if mode == 'test':
        print("\nReview the cropped images in the 'cropped' folder.")
        print("If satisfied, run: python3 scripts/crop_images.py all")
        print("This will crop all images and replace the originals.")

if __name__ == "__main__":
    main()
