#!/usr/bin/env python3
"""
Crop Doré illustrations from Kindle screenshots to just the image area.
Detects the white-bordered illustration precisely and crops to the border.
"""

from PIL import Image
import os

# Source and destination directories
SOURCE_DIR = "/var/folders/_x/l35s878x2sjcgh9nr8fdh6p40000gq/T/cursor/screenshots"
DEST_DIR = "/Users/Sina/ModernDante/assets/dore-screenshots"

# Image metadata: (source_file, output_name, title, canto, lines)
IMAGES = [
    ("full_01.png", "canto-01_lines1-3a.jpg", "The Forest", 1, "1-3"),
    ("full_02.png", "canto-01_lines1-3b.jpg", "The Forest", 1, "1-3"),
    ("full_03.png", "canto-01_lines31-33.jpg", "The Panther", 1, "31-33"),
    ("full_04.png", "canto-01_lines46-47.jpg", "The Lion", 1, "46-47"),
    ("full_05.png", "canto-01_lines88-89.jpg", "The She-Wolf", 1, "88-89"),
]


def find_image_bounds(img):
    """
    Find the bounds of the illustration by detecting the white border frame.
    The Doré illustrations have a distinct thin white/gray border.
    We look for a rectangular area with consistent white edges.
    """
    pixels = img.load()
    width, height = img.size
    
    def get_brightness(x, y):
        """Get brightness of pixel at (x, y)."""
        try:
            p = pixels[x, y]
            if isinstance(p, tuple):
                r, g, b = p[:3]
            else:
                r = g = b = p
            return (r + g + b) / 3
        except:
            return 0
    
    # The illustration is roughly centered in the page
    # Look for the white border by scanning from center outward
    center_x = width // 2
    center_y = height // 2
    
    # Find the illustration area by looking for white border lines
    # The border is a thin white line, typically 2-3 pixels wide
    
    # Scan for left edge - look for vertical white line
    left = center_x
    for x in range(center_x, 0, -1):
        # Check if this column has a consistent bright line in the middle section
        bright_count = 0
        for y in range(center_y - 200, center_y + 200):
            if get_brightness(x, y) > 240:
                bright_count += 1
        # If we find a bright vertical line after leaving bright area
        if bright_count > 300:
            left = x
        elif bright_count < 10 and left < center_x:
            # We've found the edge
            break
    
    # Scan for right edge
    right = center_x
    for x in range(center_x, width):
        bright_count = 0
        for y in range(center_y - 200, center_y + 200):
            if get_brightness(x, y) > 240:
                bright_count += 1
        if bright_count > 300:
            right = x
        elif bright_count < 10 and right > center_x:
            break
    
    # Scan for top edge
    top = center_y
    for y in range(center_y, 0, -1):
        bright_count = 0
        for x in range(center_x - 200, center_x + 200):
            if get_brightness(x, y) > 240:
                bright_count += 1
        if bright_count > 300:
            top = y
        elif bright_count < 10 and top < center_y:
            break
    
    # Scan for bottom edge
    bottom = center_y
    for y in range(center_y, height):
        bright_count = 0
        for x in range(center_x - 200, center_x + 200):
            if get_brightness(x, y) > 240:
                bright_count += 1
        if bright_count > 300:
            bottom = y
        elif bright_count < 10 and bottom > center_y:
            break
    
    # Refine bounds by finding exact edge of illustration border
    # Scan inward from found approximate bounds to find the actual border
    
    # Fine-tune left edge
    for x in range(left - 50, left + 100):
        if x < 0 or x >= width:
            continue
        col_brightness = sum(get_brightness(x, y) for y in range(top, bottom, 10)) / ((bottom - top) // 10)
        if col_brightness > 180:  # Found bright column (the border)
            left = x
            break
    
    # Fine-tune right edge
    for x in range(right + 50, right - 100, -1):
        if x < 0 or x >= width:
            continue
        col_brightness = sum(get_brightness(x, y) for y in range(top, bottom, 10)) / ((bottom - top) // 10)
        if col_brightness > 180:
            right = x + 1
            break
    
    # Fine-tune top edge
    for y in range(top - 50, top + 100):
        if y < 0 or y >= height:
            continue
        row_brightness = sum(get_brightness(x, y) for x in range(left, right, 10)) / ((right - left) // 10)
        if row_brightness > 180:
            top = y
            break
    
    # Fine-tune bottom edge
    for y in range(bottom + 50, bottom - 100, -1):
        if y < 0 or y >= height:
            continue
        row_brightness = sum(get_brightness(x, y) for x in range(left, right, 10)) / ((right - left) // 10)
        if row_brightness > 180:
            bottom = y + 1
            break
    
    return (left, top, right, bottom)


def find_white_rectangle(img):
    """
    Alternative approach: Find the largest white-bordered rectangle in the image.
    The Doré illustrations have a thin white/light gray frame around them.
    """
    pixels = img.load()
    width, height = img.size
    
    def is_light(x, y, threshold=200):
        """Check if pixel is light colored."""
        try:
            p = pixels[x, y]
            if isinstance(p, tuple):
                r, g, b = p[:3]
            else:
                r = g = b = p
            return r > threshold and g > threshold and b > threshold
        except:
            return False
    
    # The illustration is centered and takes up most of the page
    # Scan from edges inward to find where the white border starts
    
    # Find left edge of white border
    left = width // 4
    for x in range(width // 4, width // 2):
        # Check multiple y positions for consistent white edge
        white_count = sum(1 for y in range(height // 4, 3 * height // 4, 20) if is_light(x, y))
        if white_count > 10:  # Found consistent white line
            left = x
            break
    
    # Find right edge of white border
    right = 3 * width // 4
    for x in range(3 * width // 4, width // 2, -1):
        white_count = sum(1 for y in range(height // 4, 3 * height // 4, 20) if is_light(x, y))
        if white_count > 10:
            right = x + 1
            break
    
    # Find top edge of white border
    top = height // 4
    for y in range(height // 4, height // 2):
        white_count = sum(1 for x in range(left, right, 20) if is_light(x, y))
        if white_count > 10:
            top = y
            break
    
    # Find bottom edge of white border
    bottom = 3 * height // 4
    for y in range(3 * height // 4, height // 2, -1):
        white_count = sum(1 for x in range(left, right, 20) if is_light(x, y))
        if white_count > 10:
            bottom = y + 1
            break
    
    # Add a small margin to include the border itself
    return (left - 2, top - 2, right + 2, bottom + 2)


def crop_and_save(source_file, output_name):
    """Crop the illustration from the screenshot and save it."""
    source_path = os.path.join(SOURCE_DIR, source_file)
    dest_path = os.path.join(DEST_DIR, output_name)
    
    print(f"Processing {source_file}...")
    
    # Open the image
    img = Image.open(source_path)
    
    # Find the illustration bounds using the white rectangle method
    bounds = find_white_rectangle(img)
    print(f"  Found bounds: {bounds}")
    
    # Crop to the illustration
    cropped = img.crop(bounds)
    
    # Convert to RGB if necessary (for JPEG)
    if cropped.mode in ('RGBA', 'P'):
        cropped = cropped.convert('RGB')
    
    # Save as JPEG
    cropped.save(dest_path, 'JPEG', quality=95)
    print(f"  Saved to {output_name} ({cropped.size[0]}x{cropped.size[1]})")
    
    return dest_path


def main():
    """Process all images."""
    os.makedirs(DEST_DIR, exist_ok=True)
    
    for source_file, output_name, title, canto, lines in IMAGES:
        try:
            crop_and_save(source_file, output_name)
        except Exception as e:
            print(f"  Error processing {source_file}: {e}")
            import traceback
            traceback.print_exc()
    
    print("\nDone! All images cropped and saved.")


if __name__ == "__main__":
    main()
