import sys
from PIL import Image
import numpy as np

img_path = "public/images/inferno/canto-03_lines-109-111_charon-ferrying-souls-across-a.png"
img = Image.open(img_path).convert('L')

# Find "Light" regions (Paper)
# Threshold 50: Dark background (0) will be 0. Paper (200+) will be 255. Ink (0-100) will be 255 or 0 depending on darkness.
# But Ink is surrounded by Paper. So the BBox of "Light" will be the Paper (including Ink inside it).
paper_mask = img.point(lambda x: 255 if x > 50 else 0)
paper_bbox = paper_mask.getbbox()

print(f"Image Size: {img.size}")
print(f"Paper BBox: {paper_bbox}")

if paper_bbox:
    # Now look inside the paper
    paper = img.crop(paper_bbox)
    print(f"Paper Size: {paper.size}")
    
    # Inside the paper, we want to crop to the Ink.
    # Paper is White (~200-255). Ink is Dark (~0-100).
    # We want to remove White borders.
    # Invert paper: White -> Dark (0-55). Ink -> Light (155-255).
    # Threshold: Keep Light (Ink).
    from PIL import ImageOps
    inverted = ImageOps.invert(paper)
    
    # If paper is not perfect white, inverted paper is not 0.
    # Say paper is 240. Inverted is 15.
    # We want threshold such that 15 -> 0.
    # Say threshold 30.
    ink_mask = inverted.point(lambda x: 255 if x > 30 else 0)
    ink_bbox = ink_mask.getbbox()
    
    print(f"Ink BBox (relative to paper): {ink_bbox}")
    
    if ink_bbox:
        # Calculate total crop
        final_box = (
            paper_bbox[0] + ink_bbox[0],
            paper_bbox[1] + ink_bbox[1],
            paper_bbox[0] + ink_bbox[2],
            paper_bbox[1] + ink_bbox[3]
        )
        print(f"Final Crop: {final_box}")
        width = final_box[2] - final_box[0]
        height = final_box[3] - final_box[1]
        print(f"Final Size: {width}x{height}")


