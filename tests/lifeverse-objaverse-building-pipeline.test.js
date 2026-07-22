const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets", "life-sim", "asset-manifest.json"), "utf8"));
const simSource = fs.readFileSync(path.join(root, "life-sim.js"), "utf8");
const assetManagerSource = fs.readFileSync(path.join(root, "lifeverse-asset-manager.js"), "utf8");
const pipelineSource = fs.readFileSync(path.join(root, "tools", "lifeverse_optimize_objaverse.py"), "utf8");
const pipelineDoc = fs.readFileSync(path.join(root, "docs", "lifeverse-objaverse-building-pipeline.md"), "utf8");
const readme = fs.readFileSync(path.join(root, "assets", "life-sim", "README.md"), "utf8");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.ok(fs.existsSync(path.join(root, "assets", "environment", "objaverse")), "raw Objaverse building folder exists");
assert.ok(fs.existsSync(path.join(root, "assets", "environment", "objaverse-optimized")), "optimized Objaverse building folder exists");

assert.strictEqual(manifest.objaverseBuildingPipeline.status, "enabled-no-raw-building-loads", "manifest enables the safe building pipeline");
[
  "download-model",
  "blender-decimate",
  "texture-compress-ktx2-basis-or-resize",
  "draco-compress",
  "generate-lod",
  "export-glb",
  "register-manifest"
].forEach((stage) => {
  assert.ok(manifest.objaverseBuildingPipeline.requiredStages.includes(stage), `manifest records required stage: ${stage}`);
});

const buildingPass = (manifest.objaverseBuildingReplacementPasses || []).find((pass) => pass.id === "singapore-realistic-buildings-v1");
assert.ok(buildingPass, "manifest has the realistic building replacement pass");
assert.strictEqual(buildingPass.status, "enabled", "building replacement pass is enabled but gated by per-asset optimized:true checks");
assert.ok(Array.isArray(manifest.objaverseBuildingAssets), "manifest exposes objaverseBuildingAssets for optimized building entries");

[
  "loadOptimizedObjaverseBuildingSwaps",
  "isOptimizedObjaverseBuildingEntry",
  "entry.optimized !== true",
  "assets/environment/objaverse-optimized/",
  "entry.url.startsWith(\"http://\")",
  "lods.length < 3",
  "swaps.push(...optimizedObjaverseBuildingSwaps)",
  "Skipping raw Objaverse building swap"
].forEach((marker) => {
  assert.ok(simSource.includes(marker), `Life Sim runtime includes safe building loader marker: ${marker}`);
});

[
  "ensureDracoLoader",
  "DRACOLoader",
  "setDRACOLoader",
  "setDecoderPath",
  "https://www.gstatic.com/draco/v1/decoders/"
].forEach((marker) => {
  assert.ok(assetManagerSource.includes(marker), `Asset Manager supports Draco marker: ${marker}`);
});

[
  "Blender",
  "LifeVerse_Decimate",
  "@gltf-transform/cli",
  "--compress",
  "draco",
  "objaverseBuildingAssets",
  "--execute",
  "--register-existing",
  "--confirm-optimized"
].forEach((marker) => {
  assert.ok(pipelineSource.includes(marker), `optimization script includes marker: ${marker}`);
});

[
  "Download model",
  "Blender",
  "Decimate mesh",
  "Draco compress",
  "LOD0 / LOD1 / LOD2",
  "Raw Objaverse scans are not allowed"
].forEach((marker) => {
  assert.ok(pipelineDoc.includes(marker), `pipeline doc includes marker: ${marker}`);
});

assert.ok(readme.includes("Building replacement pipeline"), "Life Sim README documents the building replacement pipeline");
assert.ok(readme.includes("tools/lifeverse_optimize_objaverse.py"), "Life Sim README points to the optimization script");
assert.ok(indexSource.includes("lifeverse-asset-manager.js?v=lifeverse-objaverse-pipeline-20260722-1"), "index cache-busts the Draco-capable asset manager");
assert.ok(indexSource.includes("life-sim.js?v=lifesim-fog-farplane-character-fix-20260722-1"), "index cache-busts the optimized building loader");

console.log("LifeVerse Objaverse building pipeline tests passed.");
