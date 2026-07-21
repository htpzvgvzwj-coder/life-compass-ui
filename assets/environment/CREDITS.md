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

## city-kit-quaternius/

- `Building_Small_1.glb`, `Building_Medium_2_001.glb`, `Building_Large_2.glb` — from Quaternius's "Downtown City MegaKit" (free/CC0 standard version), https://quaternius.itch.io/downtown-city-megakit
- Real modeled+textured buildings (brick/window/trim detail) used to replace the primitive-box HDB/mall placeholders in Woodlands, per the art-direction reassessment in this session - this is the pilot district for that swap.
- Load-reliability pass (2026-07-21): these 3 files originally shipped as separate `.gltf`+`.bin`+20 shared `T_*.png` texture files (~50MB total, ~80% of it uncompressed/lightly-compressed normal-map PNGs) - the dominant cost in this app's whole asset payload. Repacked each into a single self-contained `.glb` via `gltfpack` (quantized geometry + all textures re-encoded to WebP, both natively supported by the GLTFLoader already in use, no loader changes needed) - **50MB -> 14MB**, ~72% smaller, no visible quality loss. `Sidewalk_Straight_3m.gltf`/`Street_2Lane.gltf` (from the same kit) were confirmed unused by any code in this repo and removed rather than repacked.

License: CC0 1.0 Universal (public domain). Free for personal, educational, and commercial use. Attribution to Quaternius (quaternius.com) is appreciated but not required.
