const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(root, "styles.css"), "utf8");

function section(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  assert.ok(start >= 0, `Could not find marker: ${startMarker}`);
  const end = appSource.indexOf(endMarker, start);
  assert.ok(end > start, `Could not find end marker after ${startMarker}: ${endMarker}`);
  return appSource.slice(start, end);
}

// --- Bug fix: the mood check-in modal computes and AI-refines a real
// personalized suggestion (trackerState.moodSuggestion) after every save,
// but the moodGuidance modal that displays it had no entry point anywhere -
// the computation, including a real API call, was entirely wasted. ---
const moodModalSection = section('mood: () => {', "receipt: () => `");
assert.ok(moodModalSection.includes('data-open="moodGuidance"'), "Mood modal links to the moodGuidance suggestion it just computed");

// --- Bug fix: growthCommunity ("Discuss your mirror safely") was a fully
// built, working modal with zero entry points anywhere in the UI.
// Second Brain Phase 2a moved the entry point from a Growth Hub chip
// (`modal: "growthCommunity"`) to the chat-dispatch/Ctrl+K catalog
// (`open: "growthCommunity"` in commandLauncherCommands) - same
// guarantee (a real, reachable entry point exists), different mechanism. ---
assert.ok(appSource.includes('open: "growthCommunity"'), "growthCommunity has a real entry point in the command/chat-dispatch catalog");

// --- Bug fix: a relationship breakdown wasn't archived into
// roommateStintHistory until the next move-in/move-out click, so the
// "X of your last Y roommates moved out" mirror undercounted by exactly one
// right after a fresh breakdown - the moment it matters most. ---
assert.ok(appSource.includes("const live = trackerState.ghostRoommate;") && appSource.includes("const pending = (live && live.personaId && !live.active && live.moveOutReason)"), "roommateStintStats accounts for a not-yet-archived breakdown");

// --- Bug fix: .modal-card had no max-height/overflow of its own - only
// specific variants (.assessment-modal, .wellbeing-modal, .story-reader-modal)
// did. Any modal whose content exceeded the viewport (confirmed live: the
// mood modal, at 1047px content in an 838px box) silently overflowed with
// no way to scroll to the rest, hiding buttons/content off-screen. Fixed at
// the base class so every modal variant is covered by default, including
// future ones that forget to add their own rule. ---
const modalCardRule = stylesSource.slice(stylesSource.indexOf(".modal-card {"), stylesSource.indexOf(".modal-card {") + 300);
assert.ok(/max-height:\s*min\(88vh/.test(modalCardRule), ".modal-card has a baseline max-height");
assert.ok(/overflow:\s*auto/.test(modalCardRule), ".modal-card has baseline overflow:auto so content always stays reachable");

// --- Dead code cleanup: 6 confirmed-unreferenced functions removed
// (verified via a full-project text search before removal, not just
// app.js, since community.js calls into app.js's global scope directly -
// growthPartnerCard looked identical but is real and was kept). ---
["hasCompassProfile", "greetingWord", "featureCard", "todayChoiceCard", "growthProgressHomeSummary", "growthHubPreviewCard"].forEach((name) => {
  assert.ok(!appSource.includes(`function ${name}(`), `${name} was genuinely dead (zero references outside its own definition) and has been removed`);
});
// growthPartnerCard looked identical to the dead ones by the same
// single-file heuristic, but community.js calls it directly through the
// shared global scope - must never be removed by a future cleanup pass
// that only checks app.js.
assert.ok(appSource.includes("function growthPartnerCard("), "growthPartnerCard must be kept - community.js calls it");
const communitySource = fs.readFileSync(path.join(root, "community.js"), "utf8");
assert.ok(communitySource.includes("growthPartnerCard()"), "community.js still calls growthPartnerCard - confirms it is not actually dead");

// --- Behavioral: actually execute roommateStintStats() against a mock
// trackerState, not just confirm the source text mentions the fix. ---
let trackerState;
function ghostRoommatePersona(state) {
  return { name: "Mock" };
}
// eslint-disable-next-line no-eval
eval(section("function roommateStintStats", "async function moveInGhostRoommate"));

// No history, no live stint at all - nothing to report.
trackerState = { roommateStintHistory: [], ghostRoommate: { active: false, personaId: null, moveOutReason: "" } };
assert.deepStrictEqual(roommateStintStats(), { total: 0, conflictCount: 0 }, "Empty state reports zero stints");

// One archived stint, no live pending breakdown.
trackerState = { roommateStintHistory: [{ endedReason: "voluntary" }], ghostRoommate: { active: false, personaId: null, moveOutReason: "" } };
assert.deepStrictEqual(roommateStintStats(), { total: 1, conflictCount: 0 }, "Archived-only history counts correctly");

// One archived stint PLUS a fresh breakdown that hasn't been archived yet
// (active:false, personaId still set, moveOutReason set) - this is the
// exact bug scenario: must count as 2 total / 1 conflict, not 1/0.
trackerState = {
  roommateStintHistory: [{ endedReason: "voluntary" }],
  ghostRoommate: { active: false, personaId: "jae", moveOutReason: "The relationship broke down and Jae decided to move out." }
};
assert.deepStrictEqual(roommateStintStats(), { total: 2, conflictCount: 1 }, "A fresh, not-yet-archived breakdown must be counted immediately, not undercounted by one");

// An active (ongoing, healthy) stint must never be counted as a breakdown.
trackerState = {
  roommateStintHistory: [{ endedReason: "voluntary" }],
  ghostRoommate: { active: true, personaId: "mei", moveOutReason: "" }
};
assert.deepStrictEqual(roommateStintStats(), { total: 1, conflictCount: 0 }, "An active, ongoing stint is not a breakdown and must not be counted");

console.log("Bug audit regression tests passed.");
