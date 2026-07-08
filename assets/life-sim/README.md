# Life Sim Production Asset Pipeline

Life Sim is built into the existing Vercel web app, so production assets must be web-ready `.glb` / `.gltf` files.

## Required Folders

- `models/` for city, HDB, MRT, food court, mall, park, CBD, and anime character models.
- `animations/` for Mixamo-style animation clips exported as GLB.
- `textures/` for compressed textures referenced by GLB files.

## Recommended Asset Types

- Modern Asian or Singapore-like city environment pack with roads, sidewalks, shopfronts, street lights, traffic props, and greenery.
- Anime or semi-realistic school/youth character model with a humanoid rig.
- URP/mobile-friendly toon or cel shader look.
- Mixamo or equivalent clips: idle, walk, run, jump, sit, eat, exercise.

## Candidate Packages To Verify Before Purchase

These match the requested direction, but availability/licensing/pricing must be checked in the Unity Asset Store before buying:

- Modern City Pack by Polygonmaker, or a similar modern city pack.
- City Environment Megapack by 3DVision, or a similar city environment pack.
- Modular City by Limlow, or a similar modular urban kit.
- Asian Street Environment by Next Level 3D, or a similar Asian street kit.
- Anime Hero Character Pack by Vanguard Design, or a similar commercial anime character pack.
- Modern Anime Character Pack by Reallusion, or a similar anime character pack.
- Stylized Anime Characters by Synty Studios, or a similar stylized character pack.
- Toon Shader URP / MToon / Easy Toon Shader / Universal Toon Shader, depending on the Unity render pipeline.

## Export Rules

1. Import licensed assets into Unity or Blender.
2. Apply mobile-friendly toon/cel-shaded materials.
3. Bake or optimize textures; prefer 1K/2K textures and compressed formats.
4. Export final models as GLB.
5. Place files using the paths in `asset-manifest.json`.
6. Set `"enabled": true` in `asset-manifest.json`.
7. Redeploy the existing `life-compass-ui` project.

## Performance Targets

- First-load model and texture budget: 45MB or less.
- Character mesh: under 35k triangles if possible.
- Environment: split into reusable chunks if the file becomes too large.
- Use baked lighting when possible; keep real-time shadows limited.

## Important

Do not commit paid Unity Asset Store files unless your license allows distribution inside this project. Use only assets you own or assets with clear commercial/web distribution rights.
