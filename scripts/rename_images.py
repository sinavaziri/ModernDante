#!/usr/bin/env python3
"""
Rename Doré illustration files based on the analysis results.
Creates a backup mapping before renaming.
"""

import json
import shutil
from pathlib import Path

# Setup paths
PROJECT_ROOT = Path(__file__).parent.parent
ANALYSIS_FILE = PROJECT_ROOT / "data" / "image-analysis.json"
IMAGE_DIR = PROJECT_ROOT / "public" / "images" / "inferno"
BACKUP_MAPPING_FILE = PROJECT_ROOT / "data" / "original-image-filenames.json"

def main():
    print("=" * 70)
    print("Doré Illustration File Renamer")
    print("=" * 70)
    print()

    # Load analysis results
    with open(ANALYSIS_FILE, 'r') as f:
        analyses = json.load(f)

    print(f"Loaded {len(analyses)} image analyses\n")

    # Create backup mapping
    backup_mapping = {}
    for analysis in analyses:
        backup_mapping[analysis['suggested_filename']] = analysis['original_filename']

    backup_mapping_file = BACKUP_MAPPING_FILE
    backup_mapping_file.parent.mkdir(parents=True, exist_ok=True)
    with open(backup_mapping_file, 'w') as f:
        json.dump(backup_mapping, f, indent=2)

    print(f"✅ Created backup mapping: {backup_mapping_file}\n")

    # Rename files
    renamed_count = 0
    skipped_count = 0

    for analysis in analyses:
        old_filename = analysis['original_filename']
        new_filename = analysis['suggested_filename']

        old_path = IMAGE_DIR / old_filename
        new_path = IMAGE_DIR / new_filename

        if not old_path.exists():
            print(f"⚠️  SKIP: {old_filename} (file not found)")
            skipped_count += 1
            continue

        if new_path.exists():
            print(f"⚠️  SKIP: {old_filename} → {new_filename} (target exists)")
            skipped_count += 1
            continue

        # Rename the file
        old_path.rename(new_path)
        print(f"✓ {old_filename}")
        print(f"  → {new_filename}")
        renamed_count += 1

    print()
    print("=" * 70)
    print(f"✅ Renamed {renamed_count} files")
    if skipped_count > 0:
        print(f"⚠️  Skipped {skipped_count} files")
    print("=" * 70)
    print()
    print("Next step: Update src/lib/image-mappings.ts to use new filenames")

if __name__ == "__main__":
    main()
