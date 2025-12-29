#!/usr/bin/env python3
"""
Smart cropping for Doré illustrations using projection profiles.
Robust to noise and artifacts in borders.
Targets the "next 5" images (indices 8-12).
"""

from pathlib import Path
from PIL import Image, ImageOps, ImageFilter
import numpy as np
import sys

def get_bbox_from_mask(mask, threshold_percent=0.01):
    """
    Find bounding box of a binary mask using projection profiles.
    Ignores outliers by requiring a minimum number of content pixels per row/col.
    
    Args:
        mask: Binary PIL image (mode 'L' or '1').
        threshold_percent: Minimum fraction of dimension that must be content 
                           to consider the row/col valid.
    """
    arr = np.array(mask) > 0
    h, w = arr.shape
    
    # Row projection (sum along columns)
    row_proj = arr.sum(axis=1)
    # Col projection (sum along rows)
    col_proj = arr.sum(axis=0)
    
    # Thresholds (e.g. require at least 1% of width to be content to keep a row)
    row_thresh = w * threshold_percent
    col_thresh = h * threshold_percent
    
    # Find indices
    row_indices = np.where(row_proj > row_thresh)[0]
    col_indices = np.where(col_proj > col_thresh)[0]
    
    if len(row_indices) == 0 or len(col_indices) == 0:
        return None
        
    top, bottom = row_indices[0], row_indices[-1]
    left, right = col_indices[0], col_indices[-1]
    
    return (left, top, right + 1, bottom + 1)

def smart_crop(img_path, output_path, padding=20):
    try:
        img = Image.open(img_path)
        gray = img.convert('L')
        
        # --- Stage 1: Detect Paper (Remove Black Background) ---
        # Threshold > 40
        paper_mask = gray.point(lambda x: 255 if x > 40 else 0)
        
        # Use projection to ignore noise in black background
        # Require at least 5% of width/height to be "paper" to start the page
        # This handles small artifacts or thin lines in the dark area
        paper_bbox = get_bbox_from_mask(paper_mask, threshold_percent=0.05)
        
        if not paper_bbox:
            print(f"⚠️  No paper detected in {img_path.name}")
            return False
            
        # Crop to paper
        paper_crop = img.crop(paper_bbox)
        paper_gray = paper_crop.convert('L')
        
        # --- Stage 2: Detect Ink (Remove White Borders) ---
        # Invert so Ink is bright
        inv_paper = ImageOps.invert(paper_gray)
        
        # Threshold for Ink (dark in original < 175)
        # Using a safer threshold to avoid page shadows
        # Ink is usually very dark (<100). Shadows are often 100-200.
        # Let's try threshold 80 (inverted) -> < 175 original.
        # Maybe stricter: < 120 original? -> > 135 inverted.
        ink_mask = inv_paper.point(lambda x: 255 if x > 100 else 0)
        
        # Use projection for Ink
        # Ink drawings might have thin lines, so threshold should be low (e.g. 0.5%)
        # But high enough to ignore paper grain/stains.
        ink_bbox = get_bbox_from_mask(ink_mask, threshold_percent=0.01)
        
        if not ink_bbox:
            print(f"⚠️  No ink detected inside paper of {img_path.name}, using paper crop")
            final_crop = paper_crop
        else:
            # Add padding
            l, t, r, b = ink_bbox
            l = max(0, l - padding)
            t = max(0, t - padding)
            r = min(paper_crop.width, r + padding)
            b = min(paper_crop.height, b + padding)
            final_crop = paper_crop.crop((l, t, r, b))

        # Save
        final_crop.save(output_path, quality=95)
        
        # Stats
        orig_area = img.width * img.height
        new_area = final_crop.width * final_crop.height
        reduction = 100 * (1 - new_area / orig_area)
        
        print(f"✓ Cropped {img_path.name}")
        print(f"  Stage 1 (Paper): {paper_bbox}")
        if ink_bbox:
            print(f"  Stage 2 (Ink):   {ink_bbox} (relative)")
        print(f"  Size: {img.size} -> {final_crop.size} (-{reduction:.1f}%)")
        return True

    except Exception as e:
        print(f"❌ Error processing {img_path.name}: {e}")
        # import traceback
        # traceback.print_exc()
        return False

def main():
    PROJECT_ROOT = Path(__file__).parent.parent
    IMAGE_DIR = PROJECT_ROOT / "public" / "images" / "inferno"
    
    # Get all images sorted
    all_images = sorted([f for f in IMAGE_DIR.glob("canto-*.png")])
    
    # Identify the next 5 images (indices 8 to 12 inclusive)
    target_images = all_images[8:13]
    
    print(f"Targeting {len(target_images)} images:")
    for img in target_images:
        print(f" - {img.name}")
    print("-" * 50)
    
    success_count = 0
    for img_path in target_images:
        if smart_crop(img_path, img_path):
            success_count += 1
            
    print("-" * 50)
    print(f"Completed {success_count}/{len(target_images)}")

if __name__ == "__main__":
    main()
