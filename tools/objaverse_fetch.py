#!/usr/bin/env python3
"""Objaverse asset fetch + license filter for LifeVerse's realistic-style pipeline.

Queries the human-labeled LVIS category subset of Objaverse 1.0 (objaverse's
`load_lvis_annotations()`), filters candidates to licenses that actually
permit reuse, downloads the matching GLBs into this repo's `assets/`
folders, and appends a manifest entry per asset - with license/author/source
- to `assets/life-sim/asset-manifest.json` for the in-app Asset Credits
screen to read.

License filter: allows cc0, by, by-sa, by-nc, by-nc-sa. Excludes by-nd and
by-nc-nd (No-Derivatives) since scale-normalizing a model to fit our scene
counts as a derivative. Also does a best-effort exclusion of anything tagged
"noai" - but this is NOT exhaustive: this script reads the Objaverse 1.0
annotation snapshot, which predates Sketchfab's "NoAI" opt-out tag, so a
creator who opted out after that snapshot was taken will not be caught here.

Usage:
  python tools/objaverse_fetch.py --category bench --dest props --limit 3
  python tools/objaverse_fetch.py --category streetlight --dest props --limit 3
  python tools/objaverse_fetch.py --list-categories street
"""

import argparse
import json
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = REPO_ROOT / "assets" / "life-sim" / "asset-manifest.json"

ALLOWED_LICENSES = {"cc0", "by", "by-sa", "by-nc", "by-nc-sa"}
NOAI_TAG_MARKERS = ("noai", "no-ai", "no ai")

# Rough real-world height (meters) per category, for Phase 2's scale
# normalization step to consume. null/None means "needs a human call."
DEFAULT_TARGET_HEIGHT_METERS = {
    "bench": 0.9,
    "streetlight": 4.0,
    "lamppost": 4.0,
    "traffic_light": 3.2,
    "trash_can": 0.9,
    "fire_hydrant": 0.7,
    "mailbox": 1.2,
    "bus_stop": 2.6,
}


def load_objaverse():
    try:
        import objaverse
    except ImportError:
        sys.exit("The 'objaverse' pip package is required: pip install objaverse")
    return objaverse


def is_allowed(annotation, max_faces):
    license_code = (annotation.get("license") or "").lower()
    if license_code not in ALLOWED_LICENSES:
        return False, f"license '{license_code}' not in allow-list"
    tag_names = " ".join(t.get("name", "") for t in annotation.get("tags", []) or []).lower()
    if any(marker in tag_names for marker in NOAI_TAG_MARKERS):
        return False, "tagged noai (best-effort match)"
    if annotation.get("isAgeRestricted"):
        return False, "age-restricted"
    # LVIS labels are crowd-verified but not perfect (a "manhole"-tagged
    # object turned out to be a stack of pizza trays once) - a face-count cap
    # doesn't fix mislabeling, but it does reject the multi-hundred-thousand-
    # face raw photogrammetry scans that would blow the 45MB mobile budget,
    # which happened to be a real problem in the same category.
    faces = annotation.get("faceCount") or 0
    if max_faces and faces > max_faces:
        return False, f"{faces} faces exceeds --max-faces {max_faces}"
    return True, ""


def author_name(annotation):
    user = annotation.get("user")
    if isinstance(user, dict):
        return user.get("username") or user.get("displayName") or "unknown"
    return str(user) if user else "unknown"


def load_manifest():
    if MANIFEST_PATH.exists():
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return {"enabled": False, "objaverseAssets": []}


def save_manifest(manifest):
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def eligible_candidates(objaverse, category, max_faces):
    lvis = objaverse.load_lvis_annotations()
    if category not in lvis:
        sys.exit(f"Category '{category}' not found in LVIS annotations. Use --list-categories to search.")
    candidate_uids = lvis[category]
    annotations = objaverse.load_annotations(candidate_uids)
    accepted = []
    for uid in candidate_uids:
        annotation = annotations.get(uid)
        if not annotation:
            continue
        ok, _reason = is_allowed(annotation, max_faces)
        if ok:
            accepted.append((uid, annotation))
    # Lighter meshes first - biases automatic picks toward game-appropriate
    # props instead of raw multi-hundred-thousand-face scans.
    accepted.sort(key=lambda pair: pair[1].get("faceCount") or 0)
    return accepted


def preview(category, max_faces, show):
    objaverse = load_objaverse()
    accepted = eligible_candidates(objaverse, category, max_faces)
    print(f"{len(accepted)} license-eligible candidate(s) for '{category}' (lightest first):")
    for uid, annotation in accepted[:show]:
        print(f"  {uid} | {annotation.get('name')!r} | {annotation.get('faceCount')} faces | {annotation.get('license')} | by {author_name(annotation)}")


def fetch(category, dest_folder, limit, target_height, max_faces, only_uid, max_mb):
    objaverse = load_objaverse()
    print(f"Loading LVIS annotations (cached after first run)...")

    if only_uid:
        annotation = objaverse.load_annotations([only_uid]).get(only_uid)
        if not annotation:
            sys.exit(f"No annotation found for uid {only_uid}")
        ok, reason = is_allowed(annotation, max_faces)
        if not ok:
            sys.exit(f"uid {only_uid} rejected: {reason}")
        accepted = [(only_uid, annotation)]
    else:
        accepted = eligible_candidates(objaverse, category, max_faces)[:limit]
        if not accepted:
            sys.exit(f"No license-eligible objects found for '{category}' under --max-faces {max_faces}.")

    print(f"Downloading {len(accepted)} eligible object(s)...")
    uids = [uid for uid, _ in accepted]
    downloaded = objaverse.load_objects(uids=uids, download_processes=1)

    dest_dir = REPO_ROOT / "assets" / dest_folder / "objaverse"
    dest_dir.mkdir(parents=True, exist_ok=True)

    manifest = load_manifest()
    manifest.setdefault("objaverseAssets", [])
    existing_ids = {entry["id"] for entry in manifest["objaverseAssets"]}

    height = target_height if target_height is not None else DEFAULT_TARGET_HEIGHT_METERS.get(category)
    added = []
    skipped_size = []
    for uid, annotation in accepted:
        source_path = Path(downloaded[uid])
        size_mb = source_path.stat().st_size / 1e6
        # faceCount in the annotation is sometimes missing/zero (seen on a
        # real fetch: a 245MB file whose metadata claimed 0 faces, which
        # skated straight past the --max-faces filter and even sorted as the
        # "lightest" candidate). Metadata can't be trusted alone - checking
        # the actual downloaded bytes is the only reliable guard.
        if max_mb and size_mb > max_mb:
            skipped_size.append((uid, annotation.get("name"), size_mb))
            continue
        dest_path = dest_dir / f"{uid}.glb"
        dest_path.write_bytes(source_path.read_bytes())
        rel_url = str(dest_path.relative_to(REPO_ROOT)).replace(os.sep, "/")
        entry_id = f"{category}:{uid[:8]}"
        if entry_id in existing_ids:
            continue
        entry = {
            "id": entry_id,
            "uid": uid,
            "url": rel_url,
            "label": annotation.get("name") or category,
            "category": category,
            "license": annotation.get("license"),
            "author": author_name(annotation),
            "sourceUrl": annotation.get("viewerUrl") or f"https://sketchfab.com/3d-models/{uid}",
            "targetHeightMeters": height
        }
        manifest["objaverseAssets"].append(entry)
        added.append(entry)

    save_manifest(manifest)
    print(f"Added {len(added)} manifest entries to {MANIFEST_PATH.relative_to(REPO_ROOT)}:")
    for entry in added:
        credit_note = "no attribution required (CC0)" if entry["license"] == "cc0" else f"credit required: {entry['author']} ({entry['license']})"
        print(f"  - {entry['id']}: {entry['label']} -> {entry['url']} [{credit_note}]")
    if skipped_size:
        print(f"Skipped {len(skipped_size)} object(s) whose actual downloaded size exceeded --max-mb {max_mb} (metadata faceCount can't be trusted alone):")
        for uid, name, size_mb in skipped_size:
            print(f"  - {uid} ({name!r}): {size_mb:.1f}MB")


def list_categories(query):
    objaverse = load_objaverse()
    lvis = objaverse.load_lvis_annotations()
    matches = sorted(cat for cat in lvis if query.lower() in cat.lower())
    print(f"{len(matches)} matching categories:")
    for cat in matches:
        print(f"  {cat} ({len(lvis[cat])} candidates)")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--category", help="LVIS category name, e.g. 'bench', 'streetlight'")
    parser.add_argument("--dest", help="Destination subfolder under assets/, e.g. 'props', 'characters', 'environment'")
    parser.add_argument("--limit", type=int, default=3, help="Max objects to fetch (default 3)")
    parser.add_argument("--target-height", type=float, default=None, help="Override target real-world height in meters")
    parser.add_argument("--max-faces", type=int, default=20000, help="Reject candidates above this face count (default 20000; 0 disables the cap)")
    parser.add_argument("--max-mb", type=float, default=10.0, help="Reject downloads above this actual file size in MB (default 10; checked post-download since annotation faceCount can be missing/wrong)")
    parser.add_argument("--uid", help="Fetch this exact Objaverse uid instead of scanning a category (use after --preview)")
    parser.add_argument("--preview", action="store_true", help="List eligible candidates for --category without downloading anything")
    parser.add_argument("--show", type=int, default=15, help="How many candidates --preview prints (default 15)")
    parser.add_argument("--list-categories", metavar="QUERY", help="Search LVIS category names instead of fetching")
    args = parser.parse_args()

    if args.list_categories:
        list_categories(args.list_categories)
        return

    if args.preview:
        if not args.category:
            parser.error("--preview requires --category")
        preview(args.category, args.max_faces, args.show)
        return

    if not args.dest or not args.category:
        parser.error("--dest and --category are required unless using --list-categories/--preview (--category is still used to label a --uid fetch)")

    fetch(args.category, args.dest, args.limit, args.target_height, args.max_faces, args.uid, args.max_mb)


if __name__ == "__main__":
    main()
