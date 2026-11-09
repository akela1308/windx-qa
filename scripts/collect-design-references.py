#!/usr/bin/env python3
"""Collect public CSSDA 2026 award metadata and reference thumbnails, never site code.

Run from the repository root. Network access is required only for this offline
research command; product generation reads the checked-in curated JSON instead.
"""

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import hashlib
import html
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/research/design-references-2026"
CACHE = ROOT / "data/research/design-references-2026"
BASE = "https://www.cssdesignawards.com"
CUTOFF = "2026-11-06"


def fetch(url, dest):
    # Only public award metadata and award-hosted preview images are downloaded.
    if urlparse(url).hostname != "www.cssdesignawards.com":
        raise ValueError("Unexpected download host")
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        temp = dest.with_suffix(dest.suffix + ".part")
        subprocess.run(["curl", "--fail", "--silent", "--show-error", "--location",
                        "--retry", "2", "--max-time", "35", "--max-filesize", "8000000",
                        url, "--output", str(temp)], check=True)
        temp.replace(dest)
    return dest


def clean(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def match(pattern, source):
    found = re.search(pattern, source, re.S)
    if not found:
        raise ValueError("Award markup changed: " + pattern)
    return found.group(1)


def archive(page):
    url = f"{BASE}/wotd-award-winners?page={page}"
    content = fetch(url, CACHE / f"archive-{page}.html").read_text()
    records = []
    for card in re.findall(r'<article class="single-project">(.*?)</article>', content, re.S):
        image = match(r'<img src="([^"]+)"', card)
        # The image's year is only a discovery filter; each selected award date is
        # subsequently verified against its individual award page.
        if "/2026/" not in image:
            continue
        records.append({
            "name": clean(match(r'class="single-project__title">(.*?)</h3>', card)),
            "awardUrl": urljoin(BASE, match(r'href="([^"]+)" class="sp__full-size-link"', card)),
            "siteUrl": html.unescape(match(r'href="([^"]+)"[^>]+class="sp__project-link"', card)).strip(),
            "thumbnailUrl": urljoin(BASE, image),
            "score": float(match(r'JPANEL ([0-9.]+)', card)),
            "archiveUrl": url,
        })
    return records


def detail(record):
    slug = record["awardUrl"].rstrip("/").split("/")[-2]
    page = fetch(record["awardUrl"], CACHE / f"detail-{slug}.html").read_text()
    date = clean(match(r'class="single-website__date">(.*?)</h1>', page))
    day = match(r"^(Website Of The Day \d{4} [A-Za-z]{3} \d{1,2})", date)
    award_date = datetime.strptime(day, "Website Of The Day %Y %b %d").strftime("%Y-%m-%d")
    if not "2026-01-01" <= award_date <= CUTOFF:
        return None
    record.update({
        "id": "cssda-" + slug,
        "awardDate": award_date,
        "award": "CSS Design Awards — Website of the Day",
        "category": clean(match(r'CATEGORY: </strong>(.*?)</p>', page)),
        "tags": [clean(x) for x in re.findall(r'<a[^>]+>(.*?)</a>', match(r'TAGS: </strong>(.*?)</p>', page), re.S)],
        "sourceDescription": clean(match(r'ABOUT: </strong>(.*?)</p>', page)),
        "previewPath": f"previews/{slug}.jpg",
        "verifiedOn": CUTOFF,
    })
    return record


def collect():
    with ThreadPoolExecutor(max_workers=3) as pool:
        discovered = [r for group in pool.map(archive, range(1, 19)) for r in group]
    # Remove repeat URLs before selecting; cache remains local, outside the corpus.
    discovered = list({r["awardUrl"]: r for r in discovered}.values())
    discovered.sort(key=lambda r: (-r["score"], r["awardUrl"]))
    # More than 100 candidates allow verified-date and category balancing.
    with ThreadPoolExecutor(max_workers=3) as pool:
        candidates = [r for r in pool.map(detail, discovered[:170]) if r]
    # Round-robin category selection: a high score within each category matters,
    # while studio portfolios cannot consume the whole visual research corpus.
    categories = {}
    for record in candidates:
        categories.setdefault(record["category"], []).append(record)
    selected = []
    domains = set()
    while len(selected) < 100:
        grew = False
        for category in sorted(categories):
            bucket = categories[category]
            while bucket:
                row = bucket.pop(0)
                host = urlparse(row["siteUrl"]).hostname
                if host and host.removeprefix("www.") not in domains:
                    domains.add(host.removeprefix("www."))
                    selected.append(row)
                    grew = True
                    break
            if len(selected) == 100:
                break
        if not grew:
            raise ValueError("Not enough distinct, verified 2026 winners")
    selected.sort(key=lambda r: (-r["score"], r["name"]))

    def preview(record):
        file = fetch(record["thumbnailUrl"], OUT / record["previewPath"])
        record["previewSha256"] = hashlib.sha256(file.read_bytes()).hexdigest()

    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(preview, selected))
    manifest = {
        "version": 1, "asOf": CUTOFF, "count": len(selected),
        "source": BASE + "/wotd-award-winners",
        "selection": "100 distinct domains from the 170 highest-scoring discovered 2026 WOTD candidates, balanced by source category. Award dates verified individually. This is a research selection, not an official global or full-year top 100.",
        "discoveredCount": len(discovered), "verifiedCandidateCount": len(candidates),
        "imageEvidence": "Award-hosted submitted preview, not a current live-site or mobile capture. Motion, interactions and accessibility have not been verified.",
        "usage": "Internal visual reference. Source images, brands, copy and code are not product assets or a licensed model-training dataset.",
        "references": selected,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "catalog.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"discovered": len(discovered), "verifiedCandidates": len(candidates),
                      "selected": len(selected), "categories": len({r['category'] for r in selected})}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    collect()
