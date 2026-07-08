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
  "lifeverse-ux.js"
].forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, sandbox, { filename: file });
});

const game = sandbox.window.LifeVerseGame;
const state = game.createInitialState({ profile: { username: "UX Tester" } });
game.installLifeVerseArchitecture(state);

const beforeHudState = JSON.stringify(state);
const hud = game.lifeVerseUx.getMinimalHud(state);
assert.ok(hud.time, "minimal HUD shows in-game time");
assert.ok(Object.prototype.hasOwnProperty.call(hud, "money"), "minimal HUD shows money");
assert.ok(Object.prototype.hasOwnProperty.call(hud, "health"), "minimal HUD shows health");
assert.ok(Object.prototype.hasOwnProperty.call(hud, "energy"), "minimal HUD shows energy");
assert.ok(hud.objective, "minimal HUD shows current objective");
assert.strictEqual(JSON.stringify(state), beforeHudState, "HUD helper does not mutate state");

const phoneApps = game.lifeVerseUx.getPhoneApps(state);
["Compass AI", "Future Mirror", "Calendar", "Messages", "Contacts", "Maps", "Banking", "Journal", "Tasks", "Settings"].forEach((title) => {
  assert.ok(phoneApps.some((app) => app.title === title), `phone includes ${title}`);
});

const homeActivities = game.getAvailableActivities(state, { locationId: "home" });
const interactions = game.lifeVerseUx.getLocationInteractions(state, "home", homeActivities);
assert.ok(interactions.some((interaction) => interaction.object === "Bed" && interaction.activityId === "rest"), "context exposes bed sleep action");
assert.ok(interactions.some((interaction) => interaction.object === "Computer" && interaction.activityId === "study-block"), "context exposes computer study action");

const activity = game.performActivityCommand(state, "rest", { locationId: "home" });
assert.ok(!activity.error, "context activity routes through command system");
assert.ok(state.commandHistory.some((command) => command.type === "StartActivityCommand"), "context activity records command");
assert.ok(state.eventHistory.some((event) => event.type === "activity"), "context activity emits event");
assert.ok(state.traces.some((trace) => trace.eventType === "activity"), "context activity creates trace");

const phoneAction = game.performSystemActionCommand(state, "finance", "set-week-budget");
assert.ok(!phoneAction.error, "phone gameplay action routes through command system");
assert.ok(state.commandHistory.some((command) => command.type === "SystemActionCommand"), "phone action records system command");

const fastForward = game.fastForwardCommand(state, 30);
assert.ok(!fastForward.error, "Fast Forward command still completes");
assert.ok(state.eventHistory.some((event) => event.type === "fast-forward"), "Fast Forward creates domain event");
assert.ok(state.traces.some((trace) => trace.eventType === "fast-forward"), "Fast Forward creates trace");
assert.ok(fastForward.report.traceSummary.length, "Fast Forward report reads traces");

const report = game.generateLifeReportCommand(state, { type: "reflection" });
const chapters = game.lifeVerseUx.getReportChapters(report);
assert.ok(chapters.some((chapter) => chapter.title === "Cause And Effect"), "Life Report UX includes cause and effect chapter");
assert.ok(chapters.some((chapter) => chapter.title === "Questions"), "Life Report UX includes reflection questions");

const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
assert.ok(appSource.includes("volume04-world-first"), "LifeVerse shell uses Volume 04 world-first class");
assert.ok(appSource.includes("lifeverse-phone-overlay"), "LifeVerse has in-game phone overlay");
assert.ok(appSource.includes("data-lifeverse-phone-action"), "Phone actions are represented in UI");
assert.ok(appSource.includes("data-lifeverse-system-action=\"finance:set-week-budget\""), "Phone gameplay shortcut uses command-routed system action");

console.log("LifeVerse Volume 04 UX tests passed.");
