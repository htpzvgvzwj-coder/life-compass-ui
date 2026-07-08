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

[
  "relationships",
  "health",
  "mentalWellbeing",
  "economy",
  "npcSimulation"
].forEach((systemId) => {
  assert.ok(game.getSystem(systemId), `${systemId} system is registered`);
});

const state = game.createInitialState({ profile: { username: "Aina" } });
const startMinutes = state.time.totalMinutes;

const friendsStart = state.relationships.friends;
const relationships = game.performSystemAction(state, "relationships", "meet-friends");
assert.ok(!relationships.error, "relationship action completes");
assert.ok(state.relationships.friends > friendsStart, "friendship value changes");

const sleepStart = state.health.sleepQuality;
const health = game.performSystemAction(state, "health", "sleep-recovery");
assert.ok(!health.error, "health action completes");
assert.ok(state.health.sleepQuality > sleepStart, "sleep quality changes");

const confidenceStart = state.mentalWellbeing.confidence;
const mental = game.performSystemAction(state, "mentalWellbeing", "confidence-action");
assert.ok(!mental.error, "mental wellbeing action completes");
assert.ok(state.mentalWellbeing.confidence > confidenceStart, "confidence changes");

const dailyCostStart = state.finance.dailyLivingCost;
const economy = game.performSystemAction(state, "economy", "adjust-budget-for-inflation");
assert.ok(!economy.error, "economy action completes");
assert.ok(state.finance.dailyLivingCost < dailyCostStart, "budget action changes living cost");

const communityStart = state.npcSimulation.communityTrust;
const auntieStart = state.npcs.find((npc) => npc.id === "npc-auntie-lim").relationship;
const npc = game.performSystemAction(state, "npcSimulation", "greet-neighbour");
assert.ok(!npc.error, "NPC action completes");
assert.ok(state.npcSimulation.communityTrust > communityStart, "community trust changes");
assert.ok(state.npcs.find((item) => item.id === "npc-auntie-lim").relationship > auntieStart, "NPC relationship changes");

assert.ok(state.time.totalMinutes > startMinutes, "new system decisions consume time");
assert.ok(state.events.some((event) => event.type === "relationships"), "relationship event recorded");
assert.ok(state.events.some((event) => event.type === "health"), "health event recorded");
assert.ok(state.events.some((event) => event.type === "mentalWellbeing"), "mental wellbeing event recorded");
assert.ok(state.events.some((event) => event.type === "economy"), "economy event recorded");
assert.ok(state.events.some((event) => event.type === "npcSimulation"), "NPC event recorded");

const view = game.getViewModel(state);
["relationships", "health", "mentalWellbeing", "economy", "npcSimulation"].forEach((systemId) => {
  assert.ok(view.systems.some((system) => system.id === systemId), `view model exposes ${systemId}`);
});

const dayBefore = state.time.day;
const npcLocationsBefore = state.npcs.map((item) => item.location).join(",");
const fastForward = game.fastForward(state, 14);
assert.ok(!fastForward.error, "fast forward completes with Phase 3 systems");
assert.ok(state.time.day > dayBefore, "fast forward advances time");
assert.ok(fastForward.event.systems.includes("Relationships"), "fast forward tracks relationships");
assert.ok(fastForward.event.systems.includes("Health"), "fast forward tracks health");
assert.ok(fastForward.event.systems.includes("Mental wellbeing"), "fast forward tracks mental wellbeing");
assert.ok(fastForward.event.systems.includes("Economy"), "fast forward tracks economy");
assert.ok(fastForward.event.systems.includes("NPC Simulation"), "fast forward tracks NPC simulation");
assert.notStrictEqual(state.npcs.map((item) => item.location).join(","), npcLocationsBefore, "NPC locations progress");
assert.ok(fastForward.report.consequences.some((item) => item.includes("Relationship support")), "Life Report includes relationships");
assert.ok(fastForward.report.consequences.some((item) => item.includes("Health is")), "Life Report includes health");
assert.ok(fastForward.report.consequences.some((item) => item.includes("Mental wellbeing")), "Life Report includes mental wellbeing");
assert.ok(fastForward.report.consequences.some((item) => item.includes("Economy:")), "Life Report includes economy");
assert.ok(fastForward.report.consequences.some((item) => item.includes("NPC world")), "Life Report includes NPC simulation");

console.log("LifeVerse Phase 3 tests passed.");
