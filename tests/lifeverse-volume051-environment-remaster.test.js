const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = {
  window: {},
  console
};
vm.createContext(sandbox);

[
  "event-bus.js",
  "trace-engine.js",
  "command-bus.js",
  "state-store.js",
  "persistence-service.js",
  "save-service.js",
  "entity-models.js",
  "component-registry.js",
  "service-registry.js",
  "simulation-engine.js",
  "lifeverse-state.js",
  "lifeverse-time.js",
  "lifeverse-needs.js",
  "lifeverse-player.js",
  "lifeverse-activities.js",
  "lifeverse-career.js",
  "lifeverse-education.js",
  "lifeverse-finance.js",
  "lifeverse-housing.js",
  "lifeverse-transportation.js",
  "lifeverse-relationships.js",
  "lifeverse-health.js",
  "lifeverse-mental-wellbeing.js",
  "lifeverse-economy.js",
  "lifeverse-npc-simulation.js",
  "lifeverse-world-simulation.js",
  "lifeverse-progression.js",
  "lifeverse-system-registry.js",
  "lifeverse-life-report.js",
  "lifeverse-fast-forward.js",
  "lifeverse-core.js",
  "lifeverse-ux.js",
  "life-sim.js"
].forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, sandbox, { filename: file });
});

const game = sandbox.window.LifeVerseGame;
const sim = sandbox.window.CompassLifeSim;
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const simSource = fs.readFileSync(path.join(root, "life-sim.js"), "utf8");
const simulatorSection = appSource.slice(appSource.indexOf("simulator: () =>"), appSource.indexOf("opportunities: () =>"));

const requiredLocations = [
  "home",
  "food",
  "gym",
  "library",
  "work",
  "hospital",
  "mall",
  "cafe",
  "park",
  "beach",
  "airport",
  "train",
  "university"
];
const locationIds = sim.locations.map((location) => location.id);
requiredLocations.forEach((id) => {
  assert.ok(locationIds.includes(id), `Life Sim world includes ${id}`);
});
assert.ok(sim.locations.length >= requiredLocations.length, "Life Sim exposes all Volume 5.1 remaster locations");

[
  "Home Bed",
  "Home Study Desk",
  "Food Stall Menu Board",
  "Gym Treadmill Belt",
  "Library Bookshelf Frame",
  "Office Computer Screen",
  "Hospital Reception Desk",
  "Cafe Counter",
  "Park Pond",
  "Beach Boardwalk",
  "Airport Runway",
  "Train Ticket Gates",
  "University Lecture Seats",
  "Flower Bed Soil",
  "Street Trash Bin",
  "Road Center Line"
].forEach((marker) => {
  assert.ok(simSource.includes(marker), `renderer includes recognizable prop: ${marker}`);
});

[
  "Library",
  "Hospital",
  "Cafe",
  "Sentosa",
  "Airport",
  "Train Station",
  "University Town"
].forEach((name) => {
  assert.ok(appSource.includes(`name: "${name}"`), `${name} is represented in LifeVerse map/context descriptions`);
});

assert.ok(!simulatorSection.includes("sim-fast-forward-button"), "environment remaster does not bring back permanent Fast Forward button");
assert.ok(!simulatorSection.includes("lifeSimLastResult()"), "environment remaster does not bring back permanent consequence panel");
assert.ok(!simulatorSection.includes("lifeVerseReportPanel"), "environment remaster keeps Life Report hidden by default");

const state = game.createInitialState({ profile: { username: "Environment Tester" } });
game.installLifeVerseArchitecture(state);
// Library started as a visual-only location at the time of the Volume 5.1
// remaster (hence the original "0 activities" assertion here), but was later
// given a real activity (study-group-with-peers) as part of deliberately
// expanding gameplay into previously-decorative locations - this assertion
// now documents that intentional expansion instead of the old scaffold gap.
assert.ok(game.getAvailableActivities(state, { locationId: "library" }).length > 0, "library now has a real gameplay activity (study-group-with-peers)");
assert.ok(game.getAvailableActivities(state, { locationId: "home" }).length > 0, "existing gameplay locations remain playable");

console.log("LifeVerse Volume 5.1 environment remaster tests passed.");
