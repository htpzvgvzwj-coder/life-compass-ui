const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const plan = JSON.parse(fs.readFileSync(path.join(root, "assets", "life-sim", "map-plan.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets", "life-sim", "asset-manifest.json"), "utf8"));
const simSource = fs.readFileSync(path.join(root, "life-sim.js"), "utf8");
const docSource = fs.readFileSync(path.join(root, "docs", "lifeverse-life-sim-map-plan.md"), "utf8");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");

const zoneStart = simSource.indexOf("const locationZones = [");
const zoneEnd = simSource.indexOf("];", zoneStart);
assert.ok(zoneStart >= 0 && zoneEnd > zoneStart, "Life Sim location zone section exists");
const zoneSection = simSource.slice(zoneStart, zoneEnd);
const liveZoneIds = [...zoneSection.matchAll(/id:\s*"([^"]+)"/g)].map((match) => match[1]).sort();
const plannedZoneIds = plan.districts.flatMap((district) => district.zones).sort();

assert.strictEqual(plan.camera.profile, "pubg-style-over-shoulder", "map plan uses PUBG-style over-shoulder camera");
assert.strictEqual(plan.camera.playerScreenAnchor, "left-third", "map plan keeps player on the left third");
assert.ok(plan.camera.fov >= 66, "map plan uses a wide third-person FOV");
assert.ok(plan.camera.shoulderOffsetMeters >= 1, "map plan requires visible shoulder offset");
assert.ok(plan.camera.lookAheadMeters >= 6, "map plan looks down the street");
assert.ok(simSource.includes("OVER_SHOULDER_CAMERA"), "Life Sim has the matching over-shoulder camera implementation");

assert.deepStrictEqual(plannedZoneIds, liveZoneIds, "map plan districts cover every live Life Sim location exactly once");
assert.strictEqual(new Set(plannedZoneIds).size, plannedZoneIds.length, "map plan has no duplicate district zone assignments");
assert.ok(plan.districts.length >= 5, "map plan groups locations into readable districts");

plan.districts.forEach((district) => {
  assert.ok(district.purpose && district.purpose.length > 20, `${district.id} has a clear purpose`);
  assert.ok(Array.isArray(district.systems) && district.systems.length >= 3, `${district.id} connects to multiple LifeVerse systems`);
  assert.ok(Array.isArray(district.visualLandmarks) && district.visualLandmarks.length >= 3, `${district.id} has recognizable landmarks`);
  assert.ok(Array.isArray(district.assetSlots) && district.assetSlots.length >= 1, `${district.id} has asset slots for future Objaverse swaps`);
  district.assetSlots.forEach((slot) => {
    assert.ok(slot.tier, `${district.id}/${slot.slot} has an asset tier`);
    assert.ok(slot.fallback, `${district.id}/${slot.slot} has a fallback`);
  });
});

assert.ok(Array.isArray(plan.routes) && plan.routes.length >= 6, "map plan includes playable life routes");
plan.routes.forEach((route) => {
  assert.ok(route.path.length >= 3, `${route.id} is a real route, not a single location`);
  assert.ok(route.choicePressure, `${route.id} includes a decision pressure`);
  assert.ok(route.lifeReportTrace, `${route.id} can be reflected in Life Report`);
  route.path.forEach((zoneId) => assert.ok(liveZoneIds.includes(zoneId), `${route.id} uses live zone ${zoneId}`));
  (route.alternatePath || []).forEach((zoneId) => assert.ok(liveZoneIds.includes(zoneId), `${route.id} alternate path uses live zone ${zoneId}`));
});

assert.ok(plan.performanceBudget.maxPixelRatio <= 1.35, "map plan caps mobile pixel ratio");
assert.ok(plan.performanceBudget.shadowMapSize <= 1024, "map plan keeps shadow maps mobile-safe");
assert.ok(plan.performanceBudget.nearAssetConcurrency <= 3, "map plan limits near model concurrency");
assert.ok(plan.performanceBudget.farAssetConcurrency <= 2, "map plan limits far model concurrency");
assert.ok(plan.performanceBudget.firstEntryCriticalAssetBudgetMb <= 18, "map plan limits first-entry asset budget");
assert.ok(plan.performanceBudget.totalBackgroundAssetBudgetMb <= 45, "map plan limits total background asset budget");
assert.ok(plan.performanceBudget.streamingRules.some((rule) => rule.includes("never preload")), "map plan forbids full Objaverse preloading");

assert.ok(Array.isArray(plan.urbanPlanningPrinciples) && plan.urbanPlanningPrinciples.length >= 5, "map plan documents Singapore urban planning principles");
[
  "polycentric-town",
  "hdb-neighbourhood-centre",
  "active-ground-floor",
  "walk-cycle-ride",
  "city-in-nature"
].forEach((principleId) => {
  assert.ok(plan.urbanPlanningPrinciples.some((principle) => principle.id === principleId), `map plan includes ${principleId}`);
});
assert.ok(Array.isArray(plan.infillLayers) && plan.infillLayers.length >= 6, "map plan defines city infill layers");
[
  "fine-grain-urban-fabric",
  "transit-oriented-town-centre",
  "heartland-precinct-density",
  "mixed-use-street-walls",
  "park-connector-active-mobility",
  "downtown-commercial-density"
].forEach((layerId) => {
  const layer = plan.infillLayers.find((entry) => entry.id === layerId);
  assert.ok(layer, `map plan includes ${layerId}`);
  assert.ok(Array.isArray(layer.futureAssetSlots) && layer.futureAssetSlots.length >= 3, `${layerId} has future asset slots`);
});
assert.strictEqual(plan.objaverseReplacementStatus.currentPass, "singapore-urban-props-v1", "map plan records the active Objaverse replacement pass");
assert.ok(plan.objaverseReplacementStatus.replacedOrEnhanced.includes("street lights"), "map plan records street-light Objaverse replacement");
assert.ok(plan.objaverseReplacementStatus.notYetReplaced.includes("HDB facade modules"), "map plan is honest about large assets not yet replaced");

assert.strictEqual(manifest.enabled, true, "Objaverse manifest is enabled");
const replacementPass = (manifest.objaverseReplacementPasses || []).find((pass) => pass.id === "singapore-urban-props-v1");
assert.ok(replacementPass, "manifest includes singapore-urban-props-v1");
[
  "lamppost",
  "bench",
  "trash_can",
  "bicycle",
  "shopping_cart",
  "wheelchair",
  "suitcase",
  "lantern"
].forEach((category) => {
  assert.ok(replacementPass.categories.includes(category), `replacement pass uses ${category}`);
  assert.ok((manifest.objaverseAssets || []).some((entry) => entry.category === category), `manifest has a real Objaverse asset for ${category}`);
});

assert.ok(simSource.includes("LIFE_SIM_PERFORMANCE"), "Life Sim has a centralized performance profile");
assert.ok(simSource.includes("maxPixelRatio: 1"), "Life Sim implementation matches the stability pixel-ratio budget");
assert.ok(simSource.includes("shadowSize: 512"), "Life Sim implementation matches the stability shadow budget");
assert.ok(simSource.includes("shadowsEnabled: false"), "Life Sim disables default shadow maps for stability");
assert.ok(simSource.includes("safeSpawnPointForZone"), "Life Sim uses safe outdoor spawn points instead of building centers");
assert.ok(simSource.includes("safeSpawnYawForZone"), "Life Sim uses authored spawn camera directions instead of facing walls");
assert.ok(simSource.includes("food: [8, 0, -82]"), "Food Court opens from a clear plaza spawn instead of a wall-facing spawn");
assert.ok(simSource.includes("food: Math.PI / 2"), "Food Court opens looking along the street instead of straight at a wall");
assert.ok(simSource.includes("}, 6500);"), "Life Sim removes the optional model loading hint quickly");
assert.ok(simSource.includes("resolveCameraOcclusion"), "Life Sim prevents the camera from clipping into building colliders");
assert.ok(simSource.includes("animateAsTree"), "Life Sim only applies wind animation to tree assets");
assert.ok(simSource.includes("canvas.width = 1024"), "Life Sim sky uses a high-resolution painted sky texture");
assert.ok(simSource.includes("addStreetCompositionLayer"), "Life Sim adds a first-entry street composition layer");
assert.ok(simSource.includes("addFoodCourtStreetComposition"), "Life Sim repairs the Food Court spawn with a framed Singapore street scene");
assert.ok(simSource.includes("Hawker Street Road Surface"), "Life Sim gives the Food Court entry a real road edge instead of blank concrete");
assert.ok(simSource.includes("Hawker Street ${label} Awning"), "Food Court shopfronts include visible awnings on the player-facing side");
assert.ok(simSource.includes("loadEntry"), "Life Sim implementation supports lazy Objaverse prop loading");
assert.ok(simSource.includes("runLimitedBatch"), "Life Sim implementation throttles optional model loading");
[
  "addSingaporeObjaverseReplacementProps",
  "urbanReplacementPropsDelayMs",
  "Objaverse Singapore Replacement",
  "food-court-real-props",
  "lifeVerseObjaverseReplacement",
  "hidePlaceholders",
  "singapore-urban-props-v1",
  "addSingaporeUrbanPlanningInfill",
  "Fine-grain Singapore town planning pass",
  "Integrated MRT Bus Interchange Deck",
  "Home-MRT Sheltered Link",
  "Neighbourhood Centre Shops",
  "Main Street Mixed-Use Block",
  "Park Connector Cycling Path",
  "CBD Infill Tower",
  "Secondary Street Heartland",
  "Singapore Street Corner Pocket"
].forEach((marker) => {
  assert.ok(simSource.includes(marker), `Life Sim renderer includes Singapore city infill marker: ${marker}`);
});
assert.ok(indexSource.includes("life-sim.js?v=lifesim-city-polish-20260722-1"), "index cache key points at the city polish build");

[
  "Purpose",
  "Supported Product Pillars",
  "Supported Learning Outcomes",
  "Singapore Urban Planning Pass",
  "Objaverse Replacement Pass 1",
  "Long-Term Consequences",
  "Reflection Opportunities",
  "Technical Considerations",
  "Red Lines"
].forEach((heading) => {
  assert.ok(docSource.includes(`## ${heading}`), `map plan document includes ${heading}`);
});

console.log("LifeVerse Life Sim map plan tests passed.");
