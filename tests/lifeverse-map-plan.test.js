const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const plan = JSON.parse(fs.readFileSync(path.join(root, "assets", "life-sim", "map-plan.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets", "life-sim", "asset-manifest.json"), "utf8"));
const simSource = fs.readFileSync(path.join(root, "life-sim.js"), "utf8");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
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
assert.ok(Array.isArray(plan.planningReferences) && plan.planningReferences.length >= 4, "map plan records official Singapore planning references");
[
  "ura-master-plan",
  "hdb-town-design-guides",
  "ura-downtown-core",
  "city-in-nature-pcn"
].forEach((referenceId) => {
  assert.ok(plan.planningReferences.some((reference) => reference.id === referenceId), `map plan includes ${referenceId}`);
});
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
  "official-planning-rebase",
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
assert.ok(simSource.includes("LIFE_SIM_SCALE_BUDGETS"), "Life Sim has an explicit real-world scale budget");
assert.ok(simSource.includes("hawkerPavilionHeightMeters: 6.2"), "Food Court pavilion uses a controlled human-scale height");
assert.ok(simSource.includes("hawkerShopHeightMeters: 5.6"), "Food Court street shops use a controlled human-scale height");
assert.ok(simSource.includes("addSingaporeOfficialPlanningRebase"), "Life Sim renders an official-planning city skeleton before more asset swaps");
assert.ok(simSource.includes("URA Master Plan Rebase"), "Life Sim records the URA-inspired planning rebase in code comments");
assert.ok(simSource.includes("Official Planning Town Centre Envelope"), "Life Sim creates a visible town centre planning envelope");
assert.ok(simSource.includes("HDB Neighbourhood Centre Catchment"), "Life Sim creates an HDB neighbourhood catchment instead of isolated housing");
assert.ok(simSource.includes("Work Money Mixed Use Spine"), "Life Sim creates a mixed-use work/money spine");
assert.ok(simSource.includes("PCN Green-Blue Corridor"), "Life Sim creates a park-connector green-blue corridor");
assert.ok(!simSource.includes("Food Court first-screen real-model pass"), "Life Sim does not keep the risky Food Court first-screen GLB experiment");
assert.ok(!simSource.includes('hideNamePrefixes: ["Hawker Street Shop VALUE"]'), "Food Court spawn does not hide stable fallback shops with unaudited GLBs");
assert.ok(!simSource.includes('hideNames: ["Food Court Roof", "Food Court Roof Ridge"]'), "Food Court roof is not replaced by an unaudited first-screen GLB");
assert.ok(simSource.includes("Hawker Apron Tile Seam X"), "Food Court plaza has tile seams instead of a blank plane");
assert.ok(simSource.includes("player.group.position.set(8, 0, -82)"), "Life Sim default entry opens from a clear street corridor");
assert.ok(simSource.includes("state.yaw = Math.PI / 2"), "Life Sim default entry camera faces along the street instead of into a wall");
assert.ok(appSource.includes("const initialLocationId = pendingTeleportLocationId || null"), "Compass app does not force normal Life Sim entry back to Home");
assert.ok(!appSource.includes('trackerState.lifeSim.currentLocation || "home"'), "Compass app avoids stale location restores that can spawn the camera beside a wall");
assert.ok(simSource.includes("Town Centre Active Frontage"), "Life Sim still includes town-centre active frontage after scale corrections");
assert.ok(simSource.includes("Pedestrian Apron"), "Life Sim planning frontage is scaled as a walkable street edge, not a tall wall");
assert.ok(simSource.includes("addSingaporeIdentityPass"), "Life Sim adds a visible Singapore identity pass in the first camera cone");
[
  "Singapore HDB Blk 219 Facade",
  "Singapore HDB Void Deck",
  "Singapore HDB Block Number Street Sign",
  "Singapore MRT Roundel Red",
  "Singapore MRT Street Pylon Red",
  "Singapore MRT Road Facing Station Sign",
  "LTA Bus Stop Green Roof",
  "LTA Bus Stop PIDS Panel",
  "LTA Bus Stop Road Facing Sign",
  "Singapore Sheltered Walkway Roof",
  "Singapore Hawker ${label} Textured Stall",
  "Singapore Hawker Centre Road Facing Sign",
  "Singapore Bus Lane Marking",
  "Singapore Bus Lane Road Text BUS",
  "Singapore Yellow Box",
  "Singapore Zebra Crossing Stripe",
  "Singapore Rain Tree Broad Crown",
  "Singapore Street Lamp Pole",
  "Singapore Green Trash Bin",
  "Singapore Marina Bay Skyline Backdrop",
  "Singapore Town Centre Overhead Wayfinding Sign"
].forEach((marker) => {
  assert.ok(simSource.includes(marker), `Life Sim includes Singapore visual marker: ${marker}`);
});
assert.ok(simSource.includes("[0.045, 3, 10], mat.metal"), "Street light poles are thin and light enough not to block the camera");
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
  "Official Planning Town Centre Envelope",
  "HDB Neighbourhood Centre Catchment",
  "ABC Waters Canal Edge",
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
assert.ok(indexSource.includes("life-sim.js?v=causeway-mall-lod-pipeline-20260722-1"), "index cache key points at the latest Life Sim build");

[
  "Purpose",
  "Supported Product Pillars",
  "Supported Learning Outcomes",
  "Singapore Urban Planning Pass",
  "Official Planning Rebase",
  "Objaverse Replacement Pass 1",
  "Long-Term Consequences",
  "Reflection Opportunities",
  "Technical Considerations",
  "Red Lines"
].forEach((heading) => {
  assert.ok(docSource.includes(`## ${heading}`), `map plan document includes ${heading}`);
});

console.log("LifeVerse Life Sim map plan tests passed.");
