#!/usr/bin/env python3
"""
Batch crop book illustration images by detecting page boundaries.
Uses OpenCV to detect the bright page against a dark background.
"""

import cv2
import os
import numpy as np
from pathlib import Path


def auto_crop_page(input_path, output_path, padding=10):
    """
    Auto-crop a book page from a screenshot with dark background.

    Args:
        input_path: Path to input image
        output_path: Path to save cropped image
        padding: Optional padding around detected page (default: 10px)
    """
    # 1. Load the image
    img = cv2.imread(input_path)
    if img is None:
        print(f"❌ Error: Could not load image at {input_path}")
        return False

    # 2. Convert to Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 3. Apply Threshold (Binarization)
    # Any pixel value above 30 becomes white (255), everything else black (0).
    # We use 30 because the background is extremely dark.
    _, thresh = cv2.threshold(gray, 30, 255, cv2.THRESH_BINARY)

    # 4. Find Contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        print(f"⚠️  No contours found in {input_path}")
        return False

    # 5. Find the Largest Contour (The Page)
    # We assume the page is the largest bright object in the image.
    largest_contour = max(contours, key=cv2.contourArea)

    # 6. Get Bounding Box
    x, y, w, h = cv2.boundingRect(largest_contour)

    # Add padding to avoid cutting exactly on the pixel line
    x = max(0, x - padding)
    y = max(0, y - padding)
    w = min(img.shape[1] - x, w + 2 * padding)
    h = min(img.shape[0] - y, h + 2 * padding)

    # 7. Crop the Image
    cropped_img = img[y:y+h, x:x+w]

    # 8. Save the Result
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv2.imwrite(output_path, cropped_img)

    # Calculate crop statistics
    original_area = img.shape[0] * img.shape[1]
    cropped_area = cropped_img.shape[0] * cropped_img.shape[1]
    reduction = (1 - cropped_area / original_area) * 100

    print(f"✓ {os.path.basename(input_path)}: {img.shape[1]}x{img.shape[0]} → {w}x{h} ({reduction:.1f}% reduction)")
    return True


def process_directory(source_dir, dest_dir, padding=10):
    """
    Process all images in source directory and its subdirectories.

    Args:
        source_dir: Root directory containing images
        dest_dir: Root directory for cropped images
        padding: Padding around detected page
    """
    source_path = Path(source_dir)
    dest_path = Path(dest_dir)

    # Supported image extensions
    image_extensions = ('.png', '.jpg', '.jpeg', '.PNG', '.JPG', '.JPEG')

    # Find all images
    image_files = []
    for ext in image_extensions:
        image_files.extend(source_path.rglob(f'*{ext}'))

    total_images = len(image_files)
    print(f"\n🖼️  Found {total_images} images to process\n")

    if total_images == 0:
        print("No images found!")
        return

    success_count = 0
    failed_count = 0

    for i, img_file in enumerate(image_files, 1):
        # Maintain directory structure
        relative_path = img_file.relative_to(source_path)
        output_file = dest_path / relative_path

        print(f"[{i}/{total_images}] ", end="")

        if auto_crop_page(str(img_file), str(output_file), padding):
            success_count += 1
        else:
            failed_count += 1

    print(f"\n{'='*60}")
    print(f"✅ Successfully processed: {success_count}/{total_images}")
    if failed_count > 0:
        print(f"❌ Failed: {failed_count}/{total_images}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    # Configuration
    source_dir = '/Users/Sina/ModernDante/public/images'
    dest_dir = '/Users/Sina/ModernDante/public/images_cropped'
    padding = 10  # Pixels of padding around detected page

    print("="*60)
    print("  Book Page Auto-Cropper")
    print("="*60)
    print(f"Source: {source_dir}")
    print(f"Destination: {dest_dir}")
    print(f"Padding: {padding}px")

    # Process all images
    process_directory(source_dir, dest_dir, padding)

    print("✨ Done!")
