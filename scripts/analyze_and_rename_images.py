#!/usr/bin/env python3
"""
Analyze Doré illustrations using Claude's vision API to identify cantos and scenes.
Then rename files appropriately.
"""

import os
import json
import base64
from pathlib import Path
from anthropic import Anthropic
from dotenv import load_dotenv

# Load environment variables from .env.local
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(env_path)

# Setup
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
IMAGE_DIR = Path(__file__).parent.parent / "public" / "images" / "inferno"
OUTPUT_FILE = Path(__file__).parent.parent / "data" / "image-analysis.json"

def analyze_image(image_path: Path) -> dict:
    """Use Claude to analyze a Doré illustration and identify the canto/scene."""

    # Read and encode image
    with open(image_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")

    # Determine media type
    ext = image_path.suffix.lower()
    media_type = "image/png" if ext == ".png" else "image/jpeg"

    prompt = """You are analyzing a Gustave Doré illustration from Dante's Inferno.

Please identify:
1. Which canto this illustration depicts (1-34)
2. Which specific lines or scene from that canto
3. A brief description of what's shown
4. Key characters/elements visible

Based on the imagery, iconography, and typical Doré illustration patterns for Dante's Inferno, provide your analysis in this exact JSON format:

{
  "canto": <number>,
  "lines": "<line range, e.g. '1-3' or 'general'>",
  "title": "<brief scene title>",
  "description": "<what you see in the image>",
  "confidence": "<high/medium/low>"
}

Common Inferno scenes to help identify:
- Canto 1: Dark forest, three beasts (leopard, lion, she-wolf), meeting Virgil
- Canto 3: Gate of Hell, neutrals, Charon
- Canto 5: Lustful in whirlwind, Paolo and Francesca
- Canto 6: Gluttons, Cerberus, rain
- Canto 8: Crossing Styx, angry souls
- Canto 13: Wood of suicides
- Canto 21-22: Malebranche demons
- Canto 28: Sowers of discord, mutilated
- Canto 34: Satan frozen in ice, three faces

Respond ONLY with the JSON object, no other text."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_data,
                    },
                },
                {
                    "type": "text",
                    "text": prompt
                }
            ],
        }],
    )

    # Parse response
    response_text = message.content[0].text
    # Extract JSON (Claude might wrap it in markdown)
    if "```json" in response_text:
        response_text = response_text.split("```json")[1].split("```")[0].strip()
    elif "```" in response_text:
        response_text = response_text.split("```")[1].split("```")[0].strip()

    return json.loads(response_text)

def main():
    print("=" * 70)
    print("Doré Illustration Analyzer")
    print("=" * 70)
    print()

    # Get all PNG images
    images = sorted(IMAGE_DIR.glob("inferno-page-*.png"))
    print(f"Found {len(images)} images to analyze\n")

    results = []

    for i, image_path in enumerate(images, 1):
        print(f"[{i}/{len(images)}] Analyzing: {image_path.name}")

        try:
            analysis = analyze_image(image_path)
            analysis["original_filename"] = image_path.name

            # Generate new filename
            canto = analysis["canto"]
            lines = analysis["lines"]
            title_slug = analysis["title"].lower().replace(" ", "-").replace("'", "")[:30]

            if lines and lines != "general":
                new_name = f"canto-{canto:02d}_lines-{lines}_{title_slug}.png"
            else:
                new_name = f"canto-{canto:02d}_{title_slug}.png"

            analysis["suggested_filename"] = new_name

            print(f"  → Canto {canto}, {analysis['title']} ({analysis['confidence']} confidence)")
            print(f"  → Suggested: {new_name}")

            results.append(analysis)

        except Exception as e:
            print(f"  ✗ ERROR: {e}")
            continue

        print()

    # Save results
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n✅ Analysis complete!")
    print(f"Results saved to: {OUTPUT_FILE}")
    print(f"\nTo rename files, review the analysis and run the rename script.")

if __name__ == "__main__":
    main()
