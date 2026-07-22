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
const stylesSource = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const simulatorSection = appSource.slice(appSource.indexOf("simulator: () =>"), appSource.indexOf("opportunities: () =>"));

assert.ok(sim && sim.presentationTest, "Life Sim exposes read-only presentation helpers for tests");
assert.ok(simSource.includes("createPresentationState"), "renderer has a presentation state layer");
assert.ok(simSource.includes("updateWorldPresentation"), "renderer updates world presentation each frame");
assert.ok(simSource.includes("createAudioPolish"), "renderer includes lightweight audio feedback");
assert.ok(simSource.includes("createAmbience"), "renderer creates moving ambience");
assert.ok(simSource.includes("camera.position.copy(state.cameraPosition)"), "camera uses damped presentation state");
assert.ok(simSource.includes("OVER_SHOULDER_CAMERA"), "Life Sim uses an explicit over-shoulder camera rig");
assert.ok(simSource.includes("getOverShoulderCameraVectors"), "Life Sim computes PUBG-style shoulder camera vectors");
assert.ok(simSource.includes("LIFE_SIM_PERFORMANCE"), "Life Sim has a centralized performance profile");
assert.ok(simSource.includes("maxPixelRatio: 1.35"), "Life Sim caps default pixel ratio for mobile performance");
assert.ok(simSource.includes("deferWorldLoad"), "Life Sim defers heavy background world props after first entry");
assert.ok(simSource.includes("runLimitedBatch"), "Life Sim throttles optional model loading instead of starting every fetch at once");
assert.ok(simSource.includes("loadEntry"), "Life Sim loads decorative prop models lazily");
assert.ok(appSource.includes("getLifeVerseState: () => lifeVerseState()"), "renderer receives read-only LifeVerse state");
assert.ok(appSource.includes("lifeVersePresentationPause(\"fast-forward\""), "Fast Forward uses a presentation transition before simulation");

assert.ok(!simulatorSection.includes("sim-fast-forward-button"), "default screen still has no permanent Fast Forward button");
assert.ok(!simulatorSection.includes("lifeSimLastResult()"), "default screen still has no permanent consequence panel");
assert.ok(!simulatorSection.includes("lifeVerseReportPanel"), "default screen still does not render Life Report directly");
assert.ok(stylesSource.includes("lifeverse-transition-flash"), "time/report transition layer is styled");
assert.ok(stylesSource.includes("lifeversePhoneOpen"), "phone overlay has open animation");
assert.ok(stylesSource.includes("lifeverseTimelineSweep"), "Fast Forward timeline has presentation motion");
assert.ok(stylesSource.includes("lifeverseMemoryReport") || stylesSource.includes("lifeverse-memory-report"), "Life Report presentation is styled");

const state = game.createInitialState({ profile: { username: "Presentation Tester" } });
game.installLifeVerseArchitecture(state);
const beforePresentation = JSON.stringify(state);

const morning = sim.presentationTest.getTimeOfDayPresentation(state);
assert.strictEqual(morning.phase, "morning", "default in-game time presents as morning");

state.time.totalMinutes = 1300;
const night = sim.presentationTest.getTimeOfDayPresentation(state);
assert.strictEqual(night.phase, "night", "late time presents as night");

const cameraRig = sim.presentationTest.getCameraRigPresentation();
assert.strictEqual(cameraRig.mode, "over-shoulder", "Life Sim exposes the over-shoulder camera mode");
assert.ok(cameraRig.fov >= 66, "over-shoulder camera uses a wider game-style FOV");
assert.ok(cameraRig.distance <= 5.5, "over-shoulder camera stays close to the player");
assert.ok(cameraRig.shoulderOffset > 0.8, "over-shoulder camera offsets player toward the left third");
assert.ok(cameraRig.lookAhead >= 6, "over-shoulder camera looks down the street instead of centering the player");

state.world.weather = "Rain";
const rain = sim.presentationTest.getWeatherPresentation(state);
assert.strictEqual(rain.type, "rain", "rain weather creates rain presentation");
assert.ok(rain.rain > 0, "rain presentation has visible rainfall intensity");

state.world.weather = "Fog";
const fog = sim.presentationTest.getWeatherPresentation(state);
assert.strictEqual(fog.type, "fog", "fog weather creates fog presentation");
assert.ok(fog.fogBoost > 0, "fog presentation increases depth/fog");

state.time.totalMinutes = 450;
state.world.weather = "Clear morning";
assert.strictEqual(JSON.stringify(state), beforePresentation, "presentation helpers do not mutate LifeVerse state when restored");

const fastForward = game.fastForwardCommand(state, 30);
assert.ok(!fastForward.error, "Fast Forward still runs through command pipeline");
assert.ok(state.eventHistory.some((event) => event.type === "fast-forward"), "Fast Forward still emits event");
assert.ok(state.traces.some((trace) => trace.eventType === "fast-forward"), "Fast Forward still creates trace");

const report = game.generateLifeReportCommand(state, { type: "reflection" });
const chapters = game.lifeVerseUx.getReportChapters(report);
assert.ok(chapters.some((chapter) => chapter.title === "Cause And Effect"), "Life Report still reads cause/effect from traces");
assert.ok(chapters.some((chapter) => chapter.title === "Questions"), "Life Report still includes reflection questions");

["phone", "journal", "map", "pause"].forEach((panel) => {
  assert.ok(appSource.includes(`data-lifeverse-tab=\"${panel}\"`) || appSource.includes(`[\"${panel}\",`), `${panel} remains reachable`);
});

console.log("LifeVerse Volume 4.6 presentation tests passed.");
