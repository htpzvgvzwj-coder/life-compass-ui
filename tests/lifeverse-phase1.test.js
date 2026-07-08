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
  "lifeverse-life-report.js",
  "lifeverse-fast-forward.js",
  "lifeverse-core.js"
].forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, sandbox, { filename: file });
});

const game = sandbox.window.LifeVerseGame;
assert.ok(game, "LifeVerseGame namespace exists");

const state = game.createInitialState({ profile: { username: "Aina" } });
assert.strictEqual(state.player.name, "Aina");
assert.strictEqual(game.getTimeSnapshot(state).time, "07:30");

const beforeMoney = state.finance.money;
const beforeMinutes = state.time.totalMinutes;
const work = game.performActivity(state, "work-shift", { locationId: "work" });
assert.ok(!work.error, "work shift completes");
assert.ok(state.time.totalMinutes > beforeMinutes, "activity consumes time");
assert.ok(state.finance.money > beforeMoney, "work changes money");
assert.ok(state.events.length >= 1, "activity records consequences");
assert.ok(state.schedule.length >= 1, "activity records schedule");

const report = game.generateLifeReport(state, { type: "reflection" });
assert.ok(report.overview, "life report has overview");
assert.ok(report.consequences.length, "life report explains consequences");

const beforeDay = state.time.day;
const ff = game.fastForward(state, 7);
assert.ok(!ff.error, "fast forward completes");
assert.ok(state.time.day > beforeDay, "fast forward advances days");
assert.ok(state.reports.length >= 2, "fast forward creates report");

const view = game.getViewModel(state);
assert.ok(view.needsSummary, "view model includes needs summary");
assert.ok(view.latestReport, "view model includes latest report");

console.log("LifeVerse Phase 1 tests passed.");
