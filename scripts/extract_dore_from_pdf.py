#!/usr/bin/env python3
"""
Extract Gustave Doré illustrations from the Dover PDF.
Saves them to public/images/inferno/ with proper naming.
"""

import os
import sys
from pathlib import Path

# Check for required library
try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF not installed.")
    print("Install with: pip install PyMuPDF")
    sys.exit(1)

# Paths
PDF_PATH = Path.home() / "Downloads" / "Gustave_Dores_Illustrations_for_Dantes_D.pdf"
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "images" / "inferno"

def extract_images_from_pdf(pdf_path, output_dir):
    """Extract all images from PDF and save them."""

    if not pdf_path.exists():
        print(f"ERROR: PDF not found at {pdf_path}")
        print("Please check the file location.")
        return

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Opening PDF: {pdf_path}")
    doc = fitz.open(pdf_path)

    print(f"Total pages: {len(doc)}")

    image_count = 0

    for page_num in range(len(doc)):
        page = doc[page_num]
        image_list = page.get_images()

        if not image_list:
            continue

        print(f"Page {page_num + 1}: Found {len(image_list)} image(s)")

        for img_index, img in enumerate(image_list):
            xref = img[0]

            # Extract image
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            image_ext = base_image["ext"]

            # Save image
            image_count += 1

            # Use page number as a guide for naming
            # Most Dover books have one illustration per page
            output_path = output_dir / f"page-{page_num + 1:03d}.{image_ext}"

            with open(output_path, "wb") as f:
                f.write(image_bytes)

            print(f"  Saved: {output_path.name} ({len(image_bytes)} bytes)")

    doc.close()

    print(f"\n✅ Extraction complete!")
    print(f"Total images extracted: {image_count}")
    print(f"Saved to: {output_dir}")
    print(f"\nNext steps:")
    print(f"1. Review the extracted images")
    print(f"2. Rename them to match cantos (canto-01.jpg, canto-02.jpg, etc.)")
    print(f"3. Delete any non-illustration pages (covers, text, etc.)")

def main():
    print("=" * 60)
    print("Doré Illustration Extractor")
    print("=" * 60)
    print()

    extract_images_from_pdf(PDF_PATH, OUTPUT_DIR)

if __name__ == "__main__":
    main()
