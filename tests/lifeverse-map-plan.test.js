const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const plan = JSON.parse(fs.readFileSync(path.join(root, "assets", "life-sim", "map-plan.json"), "utf8"));
const simSource = fs.readFileSync(path.join(root, "life-sim.js"), "utf8");
const docSource = fs.readFileSync(path.join(root, "docs", "lifeverse-life-sim-map-plan.md"), "utf8");

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

assert.ok(simSource.includes("LIFE_SIM_PERFORMANCE"), "Life Sim has a centralized performance profile");
assert.ok(simSource.includes("maxPixelRatio: 1.35"), "Life Sim implementation matches map pixel-ratio budget");
assert.ok(simSource.includes("shadowSize: 1024"), "Life Sim implementation matches map shadow budget");
assert.ok(simSource.includes("loadEntry"), "Life Sim implementation supports lazy Objaverse prop loading");
assert.ok(simSource.includes("runLimitedBatch"), "Life Sim implementation throttles optional model loading");

[
  "Purpose",
  "Supported Product Pillars",
  "Supported Learning Outcomes",
  "Long-Term Consequences",
  "Reflection Opportunities",
  "Technical Considerations",
  "Red Lines"
].forEach((heading) => {
  assert.ok(docSource.includes(`## ${heading}`), `map plan document includes ${heading}`);
});

console.log("LifeVerse Life Sim map plan tests passed.");
