# Environment Asset Credits

- `hdb-block.glb` — from Kenney's "Modular Buildings" pack (`building-sample-tower-a.glb`), https://kenney.nl/assets/modular-buildings
- `office-tower.glb` — from Kenney's "Modular Buildings" pack (`building-sample-tower-d.glb`), https://kenney.nl/assets/modular-buildings
- `library.glb` — from Kenney's "Modular Buildings" pack (`building-sample-house-c.glb`), https://kenney.nl/assets/modular-buildings
- `tree-oak.glb` — from Kenney's "Nature Kit" pack (`tree_oak.glb`), https://kenney.nl/assets/nature-kit
- `city-kit-commercial/mall-building.glb` — from Kenney's "City Kit (Commercial)" pack (`low-detail-building-wide-a.glb`), https://kenney.nl/assets/city-kit-commercial (kept in its own subfolder because this pack's `Textures/colormap.png` is a different image than Modular Buildings' texture of the same name)
- `city-kit-commercial/orchard-shop-a.glb` — from Kenney's "City Kit (Commercial)" pack (`building-c.glb`)
- `city-kit-commercial/orchard-shop-b.glb` — from Kenney's "City Kit (Commercial)" pack (`building-g.glb`)
- `university-lecture-hall.glb` — from Kenney's "Modular Buildings" pack (`building-sample-house-a.glb`)
- `university-hostel.glb` — from Kenney's "Modular Buildings" pack (`building-sample-tower-b.glb`)
- `city-kit-commercial/marina-skyscraper-a.glb`, `marina-skyscraper-c.glb`, `marina-skyscraper-e.glb` — from Kenney's "City Kit (Commercial)" pack (`building-skyscraper-a/c/e.glb`)
- The Marina Bay Sands-style landmark itself (three towers + tilted "skypark" slab) is hand-built from primitives in `addMarinaBayLandmark()` in `life-sim.js`, matching the rest of the district's style - no free CC0 model of that specific silhouette exists.
- `tree-palm.glb`, `tree-palm-bend.glb` — from Kenney's "Nature Kit" pack (`tree_palm.glb`, `tree_palmBend.glb`), https://kenney.nl/assets/nature-kit
- `city-kit-commercial/chinatown-shophouse-a/b/c/d.glb` — from Kenney's "City Kit (Commercial)" pack (`building-a.glb`, `building-b.glb`, `building-d.glb`, `building-h.glb`)
- `city-kit-commercial/little-india-shophouse-a/b/c/d.glb` — from Kenney's "City Kit (Commercial)" pack (`building-f.glb`, `building-e.glb`, `building-i.glb`, `building-k.glb`)
- `city-kit-commercial/bugis-shophouse-a/b.glb` — from Kenney's "City Kit (Commercial)" pack (`building-j.glb`, `building-l.glb`)
- `city-kit-commercial/hospital-block.glb` — from Kenney's "City Kit (Commercial)" pack (`building-m.glb`)
- `city-kit-commercial/airport-terminal.glb` — from Kenney's "City Kit (Commercial)" pack (`low-detail-building-wide-b.glb`)
- `city-kit-commercial/gym-building.glb` — from Kenney's "City Kit (Commercial)" pack (`low-detail-building-a.glb`)
- `cafe-building.glb` — from Kenney's "Modular Buildings" pack (`building-sample-house-b.glb`)
- `park-bench.glb` — from Kenney's "Furniture Kit" pack (`bench.glb`), https://kenney.nl/assets/furniture-kit
- Real-model pass replacing the remaining hand-built primitive-box shophouses/buildings across Chinatown, Little India, Bugis, Hospital, Airport, Gym, and Cafe, plus city-wide park benches, after user feedback that the muted-color-only pass still read as "just boxes" rather than realistic.

License: CC0 1.0 (public domain). Free for personal, educational, and commercial use. Attribution to Kenney (www.kenney.nl) is appreciated but not required.

## environment/objaverse-optimized/ (originally city-kit-quaternius/)

- Source geometry: `Building_Small_1.glb`, `Building_Medium_2_001.glb`, `Building_Large_2.glb` from Quaternius's "Downtown City MegaKit" (free/CC0 standard version), https://quaternius.itch.io/downtown-city-megakit. Real modeled+textured buildings (brick/window/trim detail) used to replace the primitive-box HDB/mall/mixed-use placeholders across Woodlands, the CBD, Main Street, and Town Centre.
- Load-reliability pass (2026-07-21): these 3 files originally shipped as separate `.gltf`+`.bin`+20 shared `T_*.png` texture files (~50MB total). Repacked via `gltfpack` to `50MB -> 14MB` single self-contained `.glb`s.
- Building/Draco/LOD pipeline pass (2026-07-22): the 3 repacked `.glb` files were the last remaining raw building scans still loaded directly by `life-sim.js` at a single fixed detail level regardless of distance. Ran each through `tools/lifeverse_optimize_objaverse.py`'s pipeline (`gltf-transform simplify` for decimation - Blender itself isn't installed in this environment, so this is the documented Blender-equivalent substitute - + texture resize + Draco compression) to produce 3 real LODs per file: full detail (close range), 50% simplified (mid range), 20% simplified (far range), switched automatically by distance via `loadOptimizedObjaverseBuildingSwaps()`. `14MB -> ~3.7MB` combined LOD storage, with only one LOD ever rendered per building instance at a time. The original repacked `.glb` files (superseded, no longer referenced anywhere) were deleted; only the LOD outputs under `assets/environment/objaverse-optimized/` remain. Registered under 11 separate manifest entries (`objaverseBuildingAssets`) since the same 3 source files are reused across many different building groups/positions on the map - only the geometry needed processing once per file, not once per placement.

License: CC0 1.0 Universal (public domain). Free for personal, educational, and commercial use. Attribution to Quaternius (quaternius.com) is appreciated but not required.
