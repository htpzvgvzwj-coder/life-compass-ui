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
assert.ok(game.getSimulationEngine, "Simulation Engine is registered");
assert.ok(game.getCommandBus, "Command Bus is registered");
assert.ok(game.getEventBus, "Event Bus is registered");
assert.ok(game.getTraceEngine, "Trace Engine is registered");
assert.ok(game.createStateStore, "State Store is registered");
assert.ok(game.getSaveService, "Save Service is registered");
assert.ok(game.entityModels, "Entity models are registered");
assert.ok(game.getComponentRegistry, "Component Registry is registered");
assert.ok(game.getServiceRegistry, "Service Registry is registered");

const state = game.createInitialState({ profile: { username: "Architect" } });
const engine = game.installLifeVerseArchitecture(state);
assert.ok(engine.diagnostics(state).registeredCommands.includes("StartActivityCommand"), "activity command handler is installed");

const commandResult = game.performActivityCommand(state, "work-shift", { locationId: "work" });
assert.ok(!commandResult.error, "activity command completes");
assert.ok(state.commandHistory.some((command) => command.type === "StartActivityCommand"), "command history records user intent");
assert.ok(state.eventHistory.some((event) => event.type === "activity"), "event history records completed activity fact");
assert.ok(state.traces.some((trace) => trace.eventType === "activity"), "trace engine records activity consequence");

const store = game.createStateStore(state);
const snapshot = store.snapshot("architecture-test");
assert.ok(snapshot.state, "snapshot stores complete state");
store.update((draft) => {
  draft.finance.money += 25;
}, { domain: "finance" });
assert.strictEqual(store.getState().finance.money, state.finance.money + 25, "state store applies deterministic update");
store.restore(snapshot);
assert.strictEqual(store.getState().finance.money, state.finance.money, "state store restores snapshot");

const save = game.saveLifeVerseState(state, { slot: "architecture-test" });
assert.ok(save.ok, "save service writes state");
const loaded = game.loadLifeVerseState({ slot: "architecture-test" });
assert.ok(loaded.ok, "save service loads state");
assert.strictEqual(loaded.state.player.name, "Architect", "loaded state preserves player");
assert.ok(Array.isArray(loaded.state.traces), "loaded state preserves traces");

const componentRegistry = game.getComponentRegistry();
assert.ok(componentRegistry.get("finance"), "finance component is registered");
assert.ok(componentRegistry.snapshotComponent(state, "finance").money >= 0, "component snapshot reads state only");

const entitySnapshot = game.entityModels.buildEntitySnapshot(state);
assert.strictEqual(entitySnapshot.player.id, "player-main", "player entity has stable identity");
assert.ok(entitySnapshot.npcs.length >= 1, "NPC entities are modelled");

const fastForward = game.fastForwardCommand(state, 30);
assert.ok(!fastForward.error, "Fast Forward command completes");
assert.ok(state.commandHistory.some((command) => command.type === "FastForwardCommand"), "Fast Forward is a command");
assert.ok(state.eventHistory.some((event) => event.type === "fast-forward"), "Fast Forward creates normal domain event");
assert.ok(state.traces.some((trace) => trace.eventType === "fast-forward"), "Fast Forward creates trace");
assert.ok(fastForward.report.traceSummary.length, "Life Report reads traces");
assert.ok(fastForward.snapshot && fastForward.snapshot.state, "Fast Forward keeps a snapshot");

const report = game.generateLifeReportCommand(state, { type: "reflection" });
assert.ok(report.traceSummary.length, "manual report includes trace summary");
assert.ok(report.aiInsights, "Life Report AI placeholder returns explainable insights");

const services = game.getServiceRegistry();
assert.ok(services.get("compassAiBoundary"), "Compass AI separation boundary exists");
assert.ok(services.get("lifeReportAi"), "Life Report AI service placeholder exists");

console.log("LifeVerse Volume 03 architecture tests passed.");
