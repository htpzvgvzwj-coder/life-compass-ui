# LifeVerse Objaverse Building Pipeline

## Purpose

Use realistic Objaverse building assets in Life Sim without breaking mobile
performance. Raw Objaverse scans are not allowed in the runtime scene.

## Pipeline

```text
Download model
  -> Blender
  -> Decimate mesh
  -> Compress or resize textures
  -> Draco compress
  -> Generate LOD0 / LOD1 / LOD2
  -> Export GLB
  -> Register in asset-manifest.json
  -> Three.js loads optimized building replacement
```

## Folders

- `assets/environment/objaverse/`
  Raw downloaded Objaverse building GLBs. Do not load these in `life-sim.js`.

- `assets/environment/objaverse-optimized/`
  Public-build-ready GLBs exported by `tools/lifeverse_optimize_objaverse.py`.

- `assets/life-sim/asset-manifest.json`
  Registers optimized building assets under `objaverseBuildingAssets`.

## Commands

Search Objaverse categories:

```powershell
python tools/objaverse_fetch.py --list-categories building
python tools/objaverse_fetch.py --list-categories apartment
python tools/objaverse_fetch.py --list-categories shop
```

Preview candidates without downloading:

```powershell
python tools/objaverse_fetch.py --category building --preview --show 20 --max-faces 80000
```

Download a candidate:

```powershell
python tools/objaverse_fetch.py --category building --dest environment --uid YOUR_OBJAVERSE_UID --target-height 28 --max-mb 40
```

Optimize and register:

```powershell
python tools/lifeverse_optimize_objaverse.py `
  --input assets/environment/objaverse/YOUR_OBJAVERSE_UID.glb `
  --asset-id hdb-realistic-block-a `
  --label "Realistic HDB Block A" `
  --category hdb `
  --target-height 32 `
  --position "-30,0,42.2" `
  --hide-prefix "HDB Home Block" `
  --source-url "https://sketchfab.com/3d-models/YOUR_OBJAVERSE_UID" `
  --license by `
  --author "Creator name" `
  --texture-size 1024 `
  --lod-ratios "1,0.55,0.25" `
  --lod-distances "0,42,84" `
  --execute
```

## Runtime Rules

`life-sim.js` loads optimized building entries through
`loadOptimizedObjaverseBuildingSwaps()`.

The runtime skips a building asset when:

- `optimized` is not `true`
- URL is remote
- URL is outside `assets/environment/objaverse-optimized/`
- target height is missing
- replacement target names are missing
- fewer than 3 LOD entries exist

## Why This Exists

Objaverse models can be beautiful but unpredictable. Raw scans often have:

- very high face counts
- oversized textures
- inconsistent scale
- strange origins
- no mobile LODs
- geometry that blocks the camera

The pipeline protects Life Sim from black screens, bad scale, heavy load time,
and camera-blocking buildings.

## First Building Replacement Targets

Recommended order:

1. HDB / residential blocks away from default spawn
2. MRT entrance
3. Food court shell
4. Mall facade
5. Office / CBD background towers

Avoid replacing first-screen buildings until the optimized version passes
local visual QA, collision QA, and public URL QA.
