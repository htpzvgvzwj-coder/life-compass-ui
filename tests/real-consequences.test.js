const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");

function section(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  assert.ok(start >= 0, `Could not find marker: ${startMarker}`);
  const end = appSource.indexOf(endMarker, start);
  assert.ok(end > start, `Could not find end marker after ${startMarker}: ${endMarker}`);
  return appSource.slice(start, end);
}

// --- Structural checks: the pieces this session's "real consequences" /
// "self-generated structure" / "support network" work added actually exist
// and are actually wired into the places that make them visible, not just
// defined and unused. ---

// Plan A: Ghost Roommate + Jury Duty get permanent consequence records
// instead of discarding every episode's outcome.
assert.ok(appSource.includes("function archiveGhostRoommateStint"), "Ghost Roommate stint archiving exists");
assert.ok(appSource.includes("function roommateStintStats"), "Ghost Roommate stint stats exist");
const moveOutSection = section("function moveOutGhostRoommate", "function ghostRoommateModal");
assert.ok(moveOutSection.includes("archiveGhostRoommateStint(trackerState.ghostRoommate)"), "moveOutGhostRoommate archives the stint before resetting");
const moveInSection = section("async function moveInGhostRoommate", "async function resolveGhostRoommateWeek");
assert.ok(moveInSection.includes("archiveGhostRoommateStint(trackerState.ghostRoommate)"), "moveInGhostRoommate archives whatever stint is already there before overwriting");
const ghostRoommateModalSection = section("function ghostRoommateModal", "function saveResumeDraft");
assert.ok(ghostRoommateModalSection.includes("roommateStintStats()"), "Ghost Roommate's persona-picker screen surfaces the honest track record");

assert.ok(appSource.includes("trackerState.juryVerdictHistory = ["), "deliverJuryVerdict archives a permanent verdict record");
const juryTrialModalSection = section("function juryTrialModal", "function juryAppealModal");
assert.ok(juryTrialModalSection.includes("trackerState.juryVerdictHistory.length"), "Jury Duty's decision-input screen surfaces past verdict history");

const timelineSection = section("function growthTimelineEvents", "function yourStoryCard");
assert.ok(timelineSection.includes("roommateStintHistory"), "Your Story includes Ghost Roommate stint outcomes");
assert.ok(timelineSection.includes("juryVerdictHistory"), "Your Story includes Jury Duty verdicts");
assert.ok(timelineSection.includes("habitChainReflections"), "Your Story includes habit-chain break reflections");

// Plan B: a broken chain prompts a reflection instead of silently resetting.
assert.ok(appSource.includes("function pendingChainBreakReflection"), "Chain-break detection exists");
assert.ok(appSource.includes("function saveChainBreakReflection"), "Chain-break reflection can be saved");
assert.ok(appSource.includes("function skipChainBreakReflection"), "Chain-break reflection can be skipped");
const chainGraphSection = section("function habitChainGraph", "function realGrowthFacts");
assert.ok(chainGraphSection.includes("pendingChainBreakReflection()"), "habitChainGraph renders the pending reflection prompt");
assert.ok(appSource.includes("data-save-chain-reflection"), "Chain reflection save button is wired");
assert.ok(appSource.includes("data-skip-chain-reflection"), "Chain reflection skip button is wired");

// Plan C: the Support Circle stops being an inert address book.
assert.ok(appSource.includes("function pendingSupportNetworkNudge"), "Support network nudge logic exists");
const inboxSection = section("function pendingInboxItems", "function inboxModal");
assert.ok(inboxSection.includes("pendingSupportNetworkNudge()"), "Inbox aggregates the support network nudge");
assert.ok(appSource.includes('data-open="supportCircle">Open Support Circle'), "Inbox links straight to the Support Circle");
const skillGuideDetailSection = section("function skillGuideDetailModal", "function pendingSupportNetworkNudge");
assert.ok(skillGuideDetailSection.includes('guide.id !== "build-support-before-crisis"'), "Skill Guide detail connects the support step to the real Support Circle");
assert.ok(appSource.includes("contact.lastMessagedAt = new Date().toISOString();"), "Messaging a contact records a real timestamp the nudge can read");

// --- Behavioral checks: actually execute pendingChainBreakReflection()
// against controlled mood-entry data (not just confirm it exists), since
// the date-math (skip today, stop at the first still-active day, respect
// lastAcknowledgedBreakDate) is exactly the kind of logic that silently
// breaks under a refactor without a real test. ---
let trackerState;
let userProfile;
// eslint-disable-next-line no-eval
eval(section("function dateKey", "function todayMission"));
// eslint-disable-next-line no-eval
eval(section("function currentUserId", "function scopedKey"));
// eslint-disable-next-line no-eval
eval(section("function habitChainDays", "function habitChainStats"));
// eslint-disable-next-line no-eval
eval(section("function pendingChainBreakReflection", "function saveChainBreakReflection"));

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function freshState() {
  userProfile = { email: "test@example.com" };
  trackerState = { mood: { entries: [] }, journalEntries: [], lastAcknowledgedBreakDate: null };
}

// Case 1: active for 5 days, then nothing for the last 2 days - a real,
// recent break should be detected on the most recent inactive day.
freshState();
for (let i = 3; i <= 7; i++) trackerState.mood.entries.push({ user_id: "test@example.com", created_at: isoDaysAgo(i) });
let result = pendingChainBreakReflection();
assert.ok(result, "A recent break (active days followed by inactive days) should be detected");

// Case 2: yesterday was active - no recent break to flag, even if there was
// an old break further back that the user clearly already recovered from.
freshState();
trackerState.mood.entries.push({ user_id: "test@example.com", created_at: isoDaysAgo(1) });
trackerState.mood.entries.push({ user_id: "test@example.com", created_at: isoDaysAgo(10) });
assert.strictEqual(pendingChainBreakReflection(), null, "No break should be flagged when yesterday was active, even with an old gap further back");

// Case 3: a genuinely continuous chain (every day active) has no break.
freshState();
for (let i = 1; i <= 10; i++) trackerState.mood.entries.push({ user_id: "test@example.com", created_at: isoDaysAgo(i) });
assert.strictEqual(pendingChainBreakReflection(), null, "An unbroken chain has nothing to reflect on");

// Case 4: a real break exists, but it was already acknowledged - must not
// re-ask about the same break twice.
freshState();
for (let i = 3; i <= 7; i++) trackerState.mood.entries.push({ user_id: "test@example.com", created_at: isoDaysAgo(i) });
const firstDetection = pendingChainBreakReflection();
assert.ok(firstDetection, "Sanity check: this scenario does produce a break before acknowledging it");
trackerState.lastAcknowledgedBreakDate = firstDetection.brokeOnDate;
assert.strictEqual(pendingChainBreakReflection(), null, "An already-acknowledged break must not be asked about again");

console.log("Real-consequences regression tests passed.");
