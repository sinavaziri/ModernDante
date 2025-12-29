#!/usr/bin/env python3
"""
Extract multiple illustrations from dual-image page spreads.
Detects and crops both left and right illustrations separately.
"""

import cv2
import numpy as np
import os


def crop_dual_illustrations(input_path, output_left, output_right, min_area_ratio=0.05, padding=10):
    """
    Crop two illustrations from a page spread.

    Args:
        input_path: Path to input image with two illustrations
        output_left: Path to save left illustration
        output_right: Path to save right illustration
        min_area_ratio: Minimum contour area as ratio of total image area
        padding: Padding around detected illustrations

    Returns:
        Number of illustrations successfully cropped (0, 1, or 2)
    """
    # Load image
    img = cv2.imread(input_path)
    if img is None:
        print(f"❌ Error: Could not load {input_path}")
        return 0

    # Convert to grayscale and threshold
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 30, 255, cv2.THRESH_BINARY)

    # Find all contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        print(f"⚠️  No contours found in {input_path}")
        return 0

    # Filter contours by minimum area
    img_area = img.shape[0] * img.shape[1]
    min_area = img_area * min_area_ratio

    valid_contours = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area >= min_area:
            x, y, w, h = cv2.boundingRect(contour)
            valid_contours.append({
                'contour': contour,
                'bbox': (x, y, w, h),
                'area': area,
                'center_x': x + w/2
            })

    if len(valid_contours) == 0:
        print(f"⚠️  No valid contours in {input_path}")
        return 0

    # Sort contours left to right by center x-coordinate
    valid_contours.sort(key=lambda c: c['center_x'])

    # Take up to 2 largest contours (should be the two illustrations)
    if len(valid_contours) > 2:
        valid_contours = sorted(valid_contours, key=lambda c: c['area'], reverse=True)[:2]
        # Re-sort by x position after filtering
        valid_contours.sort(key=lambda c: c['center_x'])

    cropped_count = 0

    # Crop left illustration
    if len(valid_contours) >= 1:
        x, y, w, h = valid_contours[0]['bbox']
        x = max(0, x - padding)
        y = max(0, y - padding)
        w = min(img.shape[1] - x, w + 2 * padding)
        h = min(img.shape[0] - y, h + 2 * padding)

        cropped_left = img[y:y+h, x:x+w]
        os.makedirs(os.path.dirname(output_left), exist_ok=True)
        cv2.imwrite(output_left, cropped_left)
        print(f"  ✓ Left:  {w}x{h}")
        cropped_count += 1

    # Crop right illustration
    if len(valid_contours) >= 2:
        x, y, w, h = valid_contours[1]['bbox']
        x = max(0, x - padding)
        y = max(0, y - padding)
        w = min(img.shape[1] - x, w + 2 * padding)
        h = min(img.shape[0] - y, h + 2 * padding)

        cropped_right = img[y:y+h, x:x+w]
        os.makedirs(os.path.dirname(output_right), exist_ok=True)
        cv2.imwrite(output_right, cropped_right)
        print(f"  ✓ Right: {w}x{h}")
        cropped_count += 1

    return cropped_count


if __name__ == "__main__":
    import sys

    # All dual-illustration Paradiso pages
    dual_files = [
        'paradiso-page-149.png',
        'paradiso-page-150.png',
        'paradiso-page-151.png',
        'paradiso-page-154.png',
        'paradiso-page-154b.png',
        'paradiso-page-156.png',
        'paradiso-page-158.png',
        'paradiso-page-161.png',
        'paradiso-page-161b.png',
        'paradiso-page-163.png',
        'paradiso-page-166.png',
        'paradiso-page-169-final.png'
    ]

    base_dir = '/Users/Sina/ModernDante/public'

    print("="*60)
    print("  Dual Illustration Extractor - All Paradiso Pages")
    print("="*60)

    success_count = 0
    for filename in dual_files:
        base_name = filename.replace('.png', '')
        input_file = f'{base_dir}/images_original/paradiso/{filename}'
        output_left = f'{base_dir}/images/paradiso/{base_name}.png'
        output_right = f'{base_dir}/images/paradiso/{base_name}-right.png'

        print(f"\n{filename}:")
        count = crop_dual_illustrations(input_file, output_left, output_right)

        if count == 2:
            print(f"  ✅ Successfully extracted both illustrations")
            success_count += 1
        elif count == 1:
            print(f"  ⚠️  Only extracted one illustration")
        else:
            print(f"  ❌ Failed to extract illustrations")

    print("\n" + "="*60)
    print(f"✅ Processed {success_count}/{len(dual_files)} dual-page spreads")
    print("="*60)
