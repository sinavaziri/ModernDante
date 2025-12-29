#!/usr/bin/env python3
"""
Download public-domain Gustave Doré Inferno illustrations from Wikimedia Commons.

- Uses MediaWiki API (no scraping HTML).
- Downloads each file as an individual image.
- Saves originals into: assets/dore/inferno/raw/
- Also tries to sort into cantos if filename/title contains "Canto <N>".

Run:
  python download_dore_inferno.py

Optional env vars:
  OUT_DIR=assets/dore
  MAX_FILES=0  (0 means no limit)
"""

import os
import re
import sys
import time
import json
import pathlib
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
CATEGORY = "Category:Gustave Doré - Inferno"

OUT_DIR = pathlib.Path(os.environ.get("OUT_DIR", "assets/dore")).resolve()
RAW_DIR = OUT_DIR / "inferno" / "raw"
CANTO_DIR = OUT_DIR / "inferno" / "cantos"
MAX_FILES = int(os.environ.get("MAX_FILES", "0") or "0")  # 0 = no limit

RAW_DIR.mkdir(parents=True, exist_ok=True)
CANTO_DIR.mkdir(parents=True, exist_ok=True)

def http_get_json(url: str, retries=3) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "dore-downloader/1.0 (local script)"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            if attempt == retries - 1:
                raise
            print(f"  Retry {attempt + 1}/{retries} after error: {e}")
            time.sleep(2 ** attempt)  # exponential backoff

def build_url(params: dict) -> str:
    return API + "?" + urllib.parse.urlencode(params)

def iter_category_files(category: str):
    """
    Yield page titles of files in the category, handling pagination.
    """
    cont = None
    fetched = 0
    while True:
        params = {
            "action": "query",
            "format": "json",
            "list": "categorymembers",
            "cmtitle": category,
            "cmnamespace": 6,          # File namespace
            "cmlimit": 200
        }
        if cont:
            params["cmcontinue"] = cont

        data = http_get_json(build_url(params))
        members = data.get("query", {}).get("categorymembers", [])
        for m in members:
            title = m.get("title")
            if title:
                yield title
                fetched += 1
                if MAX_FILES and fetched >= MAX_FILES:
                    return

        cont = data.get("continue", {}).get("cmcontinue")
        if not cont:
            return

def get_file_info(file_title: str):
    """
    Return (url, ext, canonical_filename) for original file.
    """
    params = {
        "action": "query",
        "format": "json",
        "titles": file_title,
        "prop": "imageinfo",
        "iiprop": "url|size|mime",
        "iiurlwidth": 0,  # original
    }
    data = http_get_json(build_url(params))
    pages = data.get("query", {}).get("pages", {})
    for _, page in pages.items():
        infos = page.get("imageinfo", [])
        if not infos:
            return None
        info = infos[0]
        url = info.get("url")
        if not url:
            return None
        # canonical filename from title: "File:Something.jpg"
        canonical = file_title.split("File:", 1)[-1]
        ext = os.path.splitext(canonical)[1].lower()
        return url, ext, canonical
    return None

def safe_filename(name: str) -> str:
    # keep letters, numbers, spaces, dashes, underscores, periods
    name = name.replace("/", "-")
    name = re.sub(r"[^\w\s\.-]", "", name, flags=re.UNICODE).strip()
    name = re.sub(r"\s+", " ", name)
    return name

ROMAN_MAP = {
    "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10,
    "XI": 11, "XII": 12, "XIII": 13, "XIV": 14, "XV": 15, "XVI": 16, "XVII": 17, "XVIII": 18, "XIX": 19, "XX": 20,
    "XXI": 21, "XXII": 22, "XXIII": 23, "XXIV": 24, "XXV": 25, "XXVI": 26, "XXVII": 27, "XXVIII": 28, "XXIX": 29, "XXX": 30,
    "XXXI": 31, "XXXII": 32, "XXXIII": 33, "XXXIV": 34
}

def extract_canto_number(text: str):
    """
    Try to find "Canto 3" or "Canto III" in filename/title.
    Returns int or None.
    """
    t = text.replace("_", " ").replace("-", " ")
    # Canto 3
    m = re.search(r"\bCanto\s+(\d{1,2})\b", t, flags=re.IGNORECASE)
    if m:
        n = int(m.group(1))
        if 1 <= n <= 34:
            return n
    # Canto III
    m = re.search(r"\bCanto\s+([IVXLCDM]{1,6})\b", t, flags=re.IGNORECASE)
    if m:
        roman = m.group(1).upper()
        n = ROMAN_MAP.get(roman)
        if n:
            return n
    return None

def download_file(url: str, dest: pathlib.Path):
    tmp = dest.with_suffix(dest.suffix + ".part")
    req = urllib.request.Request(url, headers={"User-Agent": "dore-downloader/1.0 (local script)"})
    with urllib.request.urlopen(req) as resp, open(tmp, "wb") as f:
        f.write(resp.read())
    tmp.replace(dest)

def main():
    print(f"Category: {CATEGORY}")
    print(f"Output (raw): {RAW_DIR}")
    print(f"Output (cantos): {CANTO_DIR}")
    print("Fetching file list...")

    titles = list(iter_category_files(CATEGORY))
    if not titles:
        print("No files found. Category title might have changed.")
        sys.exit(1)

    print(f"Found {len(titles)} files.")
    downloaded = 0
    skipped = 0

    for i, file_title in enumerate(titles, 1):
        info = get_file_info(file_title)
        if not info:
            print(f"[{i}/{len(titles)}] SKIP (no info): {file_title}")
            skipped += 1
            continue

        url, ext, canonical = info
        # prefer canonical filename for uniqueness
        base = safe_filename(os.path.splitext(canonical)[0])
        if not ext:
            ext = ".jpg"

        raw_path = RAW_DIR / f"{base}{ext}"
        if raw_path.exists():
            print(f"[{i}/{len(titles)}] EXISTS: {raw_path.name}")
            skipped += 1
            continue

        print(f"[{i}/{len(titles)}] DOWNLOADING: {raw_path.name}")
        try:
            download_file(url, raw_path)
            downloaded += 1
        except Exception as e:
            print(f"  ERROR downloading {file_title}: {e}")
            continue

        # Attempt canto sorting
        canto = extract_canto_number(canonical) or extract_canto_number(file_title)
        if canto:
            canto_folder = CANTO_DIR / f"canto-{canto:02d}"
            canto_folder.mkdir(parents=True, exist_ok=True)
            canto_path = canto_folder / raw_path.name
            # Copy rather than move so raw stays complete
            try:
                # lightweight copy
                canto_path.write_bytes(raw_path.read_bytes())
            except Exception:
                pass

        # be polite to API/CDN - longer delay to avoid rate limiting
        time.sleep(1.0)

    print("\nDone.")
    print(f"Downloaded: {downloaded}")
    print(f"Skipped: {skipped}")
    print(f"Raw files at: {RAW_DIR}")
    print(f"Auto-sorted (partial) at: {CANTO_DIR}")

if __name__ == "__main__":
    main()
