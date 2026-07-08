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
["career", "education", "finance", "housing", "transportation"].forEach((systemId) => {
  assert.ok(game.getSystem(systemId), `Phase 2 registers ${systemId}`);
});

const state = game.createInitialState({ profile: { username: "Aina" } });
const startMinutes = state.time.totalMinutes;

const careerStart = state.career.readiness;
const career = game.performSystemAction(state, "career", "prepare-portfolio");
assert.ok(!career.error, "career action completes");
assert.ok(state.career.readiness > careerStart, "career readiness changes");

const creditsStart = state.education.credits;
const education = game.performSystemAction(state, "education", "deep-study-session");
assert.ok(!education.error, "education action completes");
assert.ok(state.education.credits > creditsStart, "education credits change");

const savingsStart = state.finance.savings;
const finance = game.performSystemAction(state, "finance", "save-emergency-money");
assert.ok(!finance.error, "finance action completes");
assert.ok(state.finance.savings > savingsStart, "savings change");

const comfortStart = state.housing.comfort;
const housing = game.performSystemAction(state, "housing", "clean-maintain-home");
assert.ok(!housing.error, "housing action completes");
assert.ok(state.housing.comfort > comfortStart, "housing comfort changes");

const commuteStressStart = state.transportation.commuteStress;
const transport = game.performSystemAction(state, "transportation", "plan-commute");
assert.ok(!transport.error, "transportation action completes");
assert.ok(state.transportation.commuteStress < commuteStressStart, "commute stress changes");

assert.ok(state.time.totalMinutes > startMinutes, "system decisions consume time");
assert.ok(state.schedule.length >= 5, "system decisions record schedule entries");
assert.ok(state.events.some((event) => event.type === "career"), "career event recorded");
assert.ok(state.events.some((event) => event.type === "education"), "education event recorded");
assert.ok(state.events.some((event) => event.type === "finance"), "finance event recorded");
assert.ok(state.events.some((event) => event.type === "housing"), "housing event recorded");
assert.ok(state.events.some((event) => event.type === "transportation"), "transportation event recorded");

const view = game.getViewModel(state);
["career", "education", "finance", "housing", "transportation"].forEach((systemId) => {
  assert.ok(view.systems.some((system) => system.id === systemId), `view model exposes ${systemId}`);
});
assert.ok(view.systems.every((system) => system.actions.length), "each system exposes playable decisions");

const dayBefore = state.time.day;
const moneyBefore = state.finance.money;
const fastForward = game.fastForward(state, 30);
assert.ok(!fastForward.error, "fast forward completes with Phase 2 systems");
assert.ok(state.time.day > dayBefore, "fast forward advances time");
assert.ok(state.finance.money < moneyBefore, "fast forward applies life costs");
assert.ok(state.reports.length >= 1, "fast forward creates a Life Report");
assert.ok(fastForward.event.systems.includes("Education"), "fast forward tracks education");
assert.ok(fastForward.event.systems.includes("Housing"), "fast forward tracks housing");
assert.ok(fastForward.event.systems.includes("Transportation"), "fast forward tracks transportation");
assert.ok(fastForward.report.consequences.some((item) => item.includes("Career readiness")), "Life Report includes career");
assert.ok(fastForward.report.consequences.some((item) => item.includes("Education progress")), "Life Report includes education");

console.log("LifeVerse Phase 2 tests passed.");
