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
  "lifeverse-core.js"
].forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, sandbox, { filename: file });
});

const game = sandbox.window.LifeVerseGame;
assert.ok(game, "LifeVerseGame namespace exists");
assert.ok(game.getSystem("worldSimulation"), "World Simulation system is registered");
assert.ok(game.getSystem("progression"), "Progression system is registered");

const state = game.createInitialState({ profile: { username: "Aina" } });
const systems = game.getViewModel(state).systems.map((system) => system.id);
assert.ok(systems.includes("worldSimulation"), "view model exposes world simulation");
assert.ok(systems.includes("progression"), "view model exposes progression");

const startXp = state.progression.lifeXp;
const world = game.performSystemAction(state, "worldSimulation", "monitor-world-conditions");
assert.ok(!world.error, "world simulation action completes");
assert.ok(state.worldSimulation.randomEvents.length >= 1, "world event is recorded");
assert.ok(state.events.some((event) => event.type === "worldSimulation"), "world simulation event recorded");

const inflationPlan = game.performSystemAction(state, "worldSimulation", "plan-for-inflation");
assert.ok(!inflationPlan.error, "inflation planning action completes");
assert.ok(state.finance.confidence > 36, "inflation planning affects finance");

const progression = game.performSystemAction(state, "progression", "set-life-milestone");
assert.ok(!progression.error, "progression action completes");
assert.ok(state.progression.lifeXp > startXp, "progression XP increases");
assert.ok(state.progression.milestones.length >= 1, "milestone is created");
assert.ok(state.progression.achievements.some((achievement) => achievement.id === "first-milestone"), "achievement is unlocked");

const xpBeforeActivity = state.progression.lifeXp;
const activity = game.performActivity(state, "journal-reflection", { locationId: "home" });
assert.ok(!activity.error, "ordinary activity still completes");
assert.ok(state.progression.lifeXp > xpBeforeActivity, "activities also affect progression");

[7, 30, 180, 365, 1825].forEach((days) => {
  const testState = game.createInitialState({ profile: { username: "Aina" } });
  const beforeDay = testState.time.day;
  const result = game.fastForward(testState, days);
  assert.ok(!result.error, `${days}-day Fast Forward completes`);
  assert.ok(testState.time.day > beforeDay, `${days}-day Fast Forward advances time`);
  assert.ok(result.event.systems.includes("World Simulation"), `${days}-day Fast Forward tracks world simulation`);
  assert.ok(result.event.systems.includes("NPC Simulation"), `${days}-day Fast Forward tracks NPC simulation`);
  assert.ok(testState.worldSimulation.randomEvents.length >= 1, `${days}-day Fast Forward records world events`);
  assert.ok(testState.progression.lifeXp > 0, `${days}-day Fast Forward increases XP`);
  assert.ok(result.report.causeAndEffect.length, `${days}-day report has cause and effect`);
  assert.ok(result.report.worldExplanations.length, `${days}-day report has world explanations`);
  assert.ok(result.report.systemExplanations.length, `${days}-day report has system explanations`);
  assert.ok(result.report.progressionExplanations.length, `${days}-day report has progression explanations`);
});

const longState = game.createInitialState({ profile: { username: "Aina" } });
const fiveYear = game.fastForward(longState, 1825);
assert.ok(fiveYear.report.overview.includes("five-year"), "five-year report labels the horizon");
assert.ok(fiveYear.report.consequences.some((item) => item.includes("World simulation")), "report includes world simulation consequence");
assert.ok(fiveYear.report.consequences.some((item) => item.includes("Progression")), "report includes progression consequence");
assert.ok(fiveYear.report.progressionExplanations.some((item) => item.includes("Life XP")), "progression explanation includes XP");

console.log("LifeVerse Phase 4 tests passed.");
