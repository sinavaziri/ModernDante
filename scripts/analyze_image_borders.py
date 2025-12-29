#!/usr/bin/env python3
"""
Analyze the border regions of the image to understand the cropping pattern.
"""

import sys
from pathlib import Path
from PIL import Image
import numpy as np

def analyze(img_path):
    print(f"Analyzing: {img_path.name}")
    
    # Load image
    img = Image.open(img_path)
    img_array = np.array(img.convert('L'))
    
    print(f"Image size: {img_array.shape[1]} x {img_array.shape[0]}")
    
    # Calculate row averages (top to bottom)
    row_means = img_array.mean(axis=1)
    col_means = img_array.mean(axis=0)
    
    print("\nRow brightness analysis (top to bottom):")
    print(f"  First 50 rows avg: {row_means[:50].mean():.1f}")
    print(f"  Last 50 rows avg: {row_means[-50:].mean():.1f}")
    print(f"  Middle rows avg: {row_means[len(row_means)//2-50:len(row_means)//2+50].mean():.1f}")
    
    print("\nColumn brightness analysis (left to right):")
    print(f"  First 50 cols avg: {col_means[:50].mean():.1f}")
    print(f"  Last 50 cols avg: {col_means[-50:].mean():.1f}")
    print(f"  Middle cols avg: {col_means[len(col_means)//2-50:len(col_means)//2+50].mean():.1f}")

    # Percentiles to understand range
    print("\n brightness Percentiles:")
    print(f"  0th (min): {np.percentile(img_array, 0)}")
    print(f"  5th: {np.percentile(img_array, 5)}")
    print(f"  50th: {np.percentile(img_array, 50)}")
    print(f"  95th: {np.percentile(img_array, 95)}")
    print(f"  100th (max): {np.percentile(img_array, 100)}")

def main():
    PROJECT_ROOT = Path(__file__).parent.parent
    IMAGE_DIR = PROJECT_ROOT / "public" / "images" / "inferno"
    
    target_img = IMAGE_DIR / "canto-03_lines-109-111_charon-ferrying-souls-across-a.png"
    analyze(target_img)

if __name__ == "__main__":
    main()
