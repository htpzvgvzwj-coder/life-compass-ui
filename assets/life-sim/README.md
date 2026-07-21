# Life Sim Asset Pipeline

Life Sim assets are `.glb` files loaded at runtime by `lifeverse-asset-manager.js`, driven by `asset-manifest.json` in this folder.

## Realistic-style pivot (2026-07-21)

The art direction moved from an anime/cel-shaded look to a realistic one. The cel-shading outline post-process pass has been removed entirely (it used to be an opt-in `?cel=1` toggle; that's gone now too). Materials already target PBR (`MeshStandardMaterial`) via `lifeverse-material-library.js` - no rendering rewrite was needed for this, just asset-quality work.

**Objaverse, not the Unity Asset Store.** This folder's older guidance (still visible in git history) assumed buying commercial Unity Asset Store packs and exporting them to GLB. That's no longer the plan - assets now come from [Objaverse](https://objaverse.allenai.org/) (real-world 3D scans, sourced from Sketchfab uploads under Creative Commons licenses), fetched via `tools/objaverse_fetch.py`.

## Fetching new assets

```
python tools/objaverse_fetch.py --list-categories bench      # search LVIS category names
python tools/objaverse_fetch.py --category bench --dest props --limit 3
```

This queries Objaverse's human-labeled LVIS category index, filters candidates to licenses that actually permit reuse, downloads the matching GLBs into `assets/<dest>/objaverse/`, and appends an entry to `asset-manifest.json`'s `objaverseAssets` array with `{ id, uid, url, label, category, license, author, sourceUrl, targetHeightMeters }`.

**License filter**: allows `cc0`, `by`, `by-sa`, `by-nc`, `by-nc-sa`. Excludes `by-nd` / `by-nc-nd` (No-Derivatives - scale-normalizing a model counts as a derivative) and does a best-effort exclusion of anything tagged "noai" in its Sketchfab tags.

**Important caveat**: the NoAI check is not exhaustive. This script reads the Objaverse 1.0 annotation snapshot, which predates Sketchfab's "NoAI" opt-out tag - a creator who added that tag to their model *after* this snapshot was taken will not be caught by this filter. When in doubt about a specific asset, check its live Sketchfab page (the `sourceUrl` field) before shipping it.

**Attribution**: CC0 assets need no credit. Everything else needs one - the in-app "Asset Credits" tag (bottom-left corner during Life Sim) reads `objaverseAssets` from this manifest and lists every non-CC0 asset's author + license + source link automatically. Don't hand-maintain a separate credits list; it'll drift from what's actually shipped.

## Required Folders

- `../environment/` - city/HDB/MRT/food court/mall/park/CBD/district chunks. Currently a mix of the older CC0 Kenney "City Kit Commercial" + Quaternius "Downtown City MegaKit" low-poly building swaps (see `loadDistrictAssetSamples()` in `life-sim.js`) - these are the blocky "kit" look being phased out in favor of Objaverse pieces, landmark buildings first.
- `../characters/` - humanoid character models. Currently empty; the live game uses a primitive capsule/sphere rig (`createPlayer()` in life-sim.js) because the real-GLB character path (`installCharacterAsset()`) is disabled pending a sourced, rigged model.
- `../characters/animations/` - Mixamo-style animation clips exported as GLB (idle/walk at minimum).
- `../props/` - benches, lamps, tables, signs, street furniture. This is where `tools/objaverse_fetch.py --dest props` lands new assets.
- `../textures/` - compressed textures referenced by GLB files.
- `../materials/` - reusable material descriptors (see `lifeverse-material-library.js`).

## Scale convention

Objaverse scans arrive at wildly inconsistent native scales (unlike a single hand-modeled kit). Every new asset needs a `targetHeightMeters` in its manifest entry so it can be normalized to a real-world height - hand-eyeballing a scale multiplier per model (the pattern used for the older kit swaps) doesn't hold up at Objaverse's variety. Rough reference table: character ~1.7m, HDB block by floor count, shophouse ~12m, streetlamp ~4m, car ~4.3m, bench ~0.9m.

## Performance Targets

- First-load model + texture budget: 45MB or less.
- Character mesh: under 35k triangles if possible.
- Environment: split into reusable chunks if a file gets too large.

## Important

Only use CC0 assets freely. CC-BY / CC-BY-SA / CC-BY-NC assets need their credit to actually reach the in-app Asset Credits screen - don't ship one without the other.
