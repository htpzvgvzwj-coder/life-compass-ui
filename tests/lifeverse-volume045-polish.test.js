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
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const simulatorSection = appSource.slice(appSource.indexOf("simulator: () =>"), appSource.indexOf("opportunities: () =>"));

assert.ok(simulatorSection.includes("${lifeVerseGameShell()}"), "LifeVerse game shell is rendered inside Life Sim");
assert.ok(!simulatorSection.includes("sim-fast-forward-button"), "default LifeVerse screen has no permanent Fast Forward button");
assert.ok(!simulatorSection.includes("lifeSimLastResult()"), "default LifeVerse screen has no permanent Latest Consequence panel");
assert.ok(!simulatorSection.includes("lifeVerseReportPanel"), "default LifeVerse screen does not render Life Report directly");
assert.ok(appSource.includes("renderScreen(screens[startupTab] ? startupTab : \"home\")"), "startup renders through the real screen map");
assert.ok(appSource.includes("lifeVerseConsequenceToast()"), "consequences render through temporary toast UI");
assert.ok(stylesSource.includes("lifeverseToastOut"), "consequence toast fades out after the short display window");
assert.ok(appSource.includes("reportPromptReady"), "Fast Forward can ask the player to view the report without opening it permanently");
assert.ok(appSource.includes("data-lifeverse-tab=\"fastForward\""), "Fast Forward is still reachable from in-game tools");
assert.ok(!appSource.includes("trackerState.lifeVerse.activeView = \"report\";\n    syncLifeSimFromLifeVerse();\n    markLifeVerseConsequence(`${days} Days Later`"), "Fast Forward no longer forces Life Report open immediately");

const state = game.createInitialState({ profile: { username: "Polish Tester" } });
game.installLifeVerseArchitecture(state);

const beforeHud = JSON.stringify(state);
const hud = game.lifeVerseUx.getMinimalHud(state);
assert.ok(hud.time && Object.prototype.hasOwnProperty.call(hud, "money"), "minimal HUD still exposes time and money");
assert.strictEqual(JSON.stringify(state), beforeHud, "HUD helper remains read-only");

assert.strictEqual(game.lifeVerseUx.getLocationInteractions(state, null, []).length, 0, "no context actions appear when no location is active");
assert.strictEqual(game.lifeVerseUx.getCriticalNeeds(state).length, 0, "default needs warning is hidden when not critical");

state.needs.energy = 24;
state.health.physical = 34;
state.needs.stress = 76;
const warnings = game.lifeVerseUx.getCriticalNeeds(state).map((warning) => warning.key);
assert.strictEqual(warnings.sort().join(","), "energy,health,stress", "critical warning only appears for energy, health, and stress thresholds");

const homeActivities = game.getAvailableActivities(state, { locationId: "home" });
const homeInteractions = game.lifeVerseUx.getLocationInteractions(state, "home", homeActivities);
assert.ok(homeInteractions.some((interaction) => interaction.fastForwardDays === 1), "Bed/Sleep interaction exposes one-day Fast Forward");

const fastForward = game.fastForwardCommand(state, 7);
assert.ok(!fastForward.error, "Fast Forward still completes through command pipeline");
assert.ok(state.commandHistory.some((command) => command.type === "FastForwardCommand"), "Fast Forward records a command");
assert.ok(state.eventHistory.some((event) => event.type === "fast-forward"), "Fast Forward emits an event");
assert.ok(state.traces.some((trace) => trace.eventType === "fast-forward"), "Fast Forward creates a trace");

const report = game.generateLifeReportCommand(state, { type: "reflection" });
const chapters = game.lifeVerseUx.getReportChapters(report).map((chapter) => chapter.title);
assert.ok(chapters.includes("Cause And Effect"), "Life Report still reads traces into cause-and-effect");
assert.ok(chapters.includes("Questions"), "Life Report still preserves reflection");

["phone", "journal", "map", "pause"].forEach((panel) => {
  assert.ok(appSource.includes(`data-lifeverse-tab=\"${panel}\"`) || appSource.includes(`[\"${panel}\",`), `${panel} remains reachable from dock`);
});

console.log("LifeVerse Volume 04.5 polish tests passed.");
