# LifeVerse Volume 5.0 Asset Pipeline

LifeVerse is transitioning from a programmer prototype into a production-quality stylized game. Volume 5.0 does not change gameplay. It creates the asset foundation that future visual upgrades must use.

## Folder Structure

```text
assets/
  audio/              UI, ambience, footsteps, weather, transition audio
  characters/         Player and NPC character GLB/GLTF files
    animations/       Mixamo or equivalent animation clips
  environment/        Buildings, roads, parks, transit, interiors, district chunks
  icons/              Future organized icon set
  materials/          Material descriptor JSON and future material textures
  models/             Shared generic model library
  props/              Benches, tables, lamps, furniture, signs, equipment
  textures/           Shared albedo, normal, roughness, metallic, flow maps
```

Existing legacy image/icon files may remain at `assets/` until UI paths are migrated. New game assets should use the folders above.

## Asset Rules

- Production environments must be GLB/GLTF assets loaded through `lifeverse-asset-manager.js`.
- Game logic must never depend on mesh names, primitive shapes, or scene hierarchy from a model.
- Placeholder/procedural geometry is allowed only for temporary fallback, debug markers, invisible helpers, and collision planning.
- Final buildings, trees, furniture, stalls, airport props, gym equipment, and location interiors should be real reusable assets.
- Paid or licensed assets must only be committed if the license allows distribution in this web project.

## Naming Convention

Use lowercase kebab-case:

```text
assets/environment/hdb-block.glb
assets/environment/food-court.glb
assets/props/street-lamp.glb
assets/characters/anime-youth-character.glb
assets/characters/animations/walk.glb
assets/textures/concrete-albedo.webp
assets/textures/concrete-normal.webp
```

Recommended prefab IDs:

```text
environment:main
location:home
location:food
location:park
character:player
prop:bench
prop:street-lamp
```

## Asset Manager Workflow

1. Add optimized `.glb` or `.gltf` files into the correct asset folder.
2. Register them in `assets/life-sim/asset-manifest.json`.
3. Set `"enabled": true` only after required files are present.
4. Load models through `LifeVerseAssets.createAssetManager()`.
5. Register reusable objects as prefabs.
6. Instantiate prefabs by ID, not by hardcoded mesh construction.
7. Keep gameplay systems connected to location IDs, not model hierarchies.

## Material System

Reusable material definitions live in:

- `lifeverse-material-library.js`
- `assets/materials/lifeverse-materials.json`

Core material IDs:

- `road`
- `grass`
- `concrete`
- `wood`
- `metal`
- `glass`
- `water`
- `stone`
- `plastic`
- `fabric`

Each material is texture-upgrade ready. Future texture maps should use slots such as `albedo`, `normal`, `roughness`, `metallic`, and `flow`.

## Render Pipeline Foundation

`lifeverse-render-pipeline.js` prepares the renderer for production assets:

- PBR-ready materials
- shadow maps
- ambient and directional lighting
- fog and atmosphere
- tone mapping
- gamma-correct output color
- HDR/post-processing-ready metadata

Volume 5.0 prepares the architecture only. It does not enable expensive post-processing effects yet.

## Debug Tools

Set either:

```text
?assetDebug=1
```

or:

```js
localStorage.setItem("lifeverseAssetDebug", "1")
```

The hidden debug panel can display:

- FPS estimate
- draw calls
- texture memory count
- loaded assets
- missing assets
- loaded materials

## Performance Targets

- Reuse cached assets and shared materials.
- Keep first-load model and texture size under 45MB for mobile.
- Split large environments into chunks.
- Prefer GLB with compressed textures when possible.
- Keep real-time shadows limited.
- Prepare assets for LOD even if LOD switching is not implemented yet.
- Avoid duplicated mesh files for repeated props.

## Future Replacement Rule

The current procedural world is now a fallback layer. Future production work should replace each placeholder by registering real assets in the manifest and instantiating prefabs through the Asset Manager. Gameplay systems should continue to use stable IDs such as `home`, `food`, `gym`, `park`, and `train`.
