const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const communitySource = fs.readFileSync(path.join(root, "community.js"), "utf8");

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `Could not find marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.ok(end > start, `Could not find end marker after ${startMarker}: ${endMarker}`);
  return source.slice(start, end);
}

// --- Research-grounded finding 1: Singapore's Youth STEPS study (National
// Youth Council) found home ownership still ranks as a real adulthood
// marker for SG youth specifically, but the app only had static
// read-once content for it (Real Cost of Living, Basic Tax Obligations),
// never anything actively tracked with a real date the way a bill is. ---
assert.ok(appSource.includes("const SG_MILESTONE_TEMPLATES = ["), "Singapore milestone quick-add templates exist");
assert.ok(!/\$?\d[\d,]*(\.\d+)?\s*(k|K)?\b.*(CPF|BTO|grant|income ceiling)/i.test(appSource.slice(appSource.indexOf("const SG_MILESTONE_TEMPLATES"), appSource.indexOf("const SG_MILESTONE_TEMPLATES") + 1200)), "milestone templates must stay event-based, not hardcode CPF/BTO dollar figures or thresholds that could go stale and mislead a real financial decision");
assert.ok(appSource.includes('category: category === "milestone" ? "milestone" : "recurring"'), "real life events can be tagged as a milestone, distinct from a recurring bill");
const modalSection = section(appSource, "function realLifeEventsModal", "function skillGuideProgress");
assert.ok(modalSection.includes("data-sg-milestone-template"), "the Real Due Dates modal offers Singapore milestone quick-add");
assert.ok(modalSection.includes("Life milestones") && modalSection.includes("Bills & deadlines"), "milestones are displayed separately from recurring bills, not mixed together");
const timelineSection = section(appSource, "function growthTimelineEvents", "function yourStoryCard");
assert.ok(timelineSection.includes("Reached a milestone:"), "a completed milestone gets distinct phrasing in Your Story, not generic bill-paid language");

// --- Research-grounded finding 2: Singapore's National Youth Mental
// Health Study (IMH) found roughly 1 in 3 youth aged 15-35 report severe
// distress, worst at 20-24 (this app's core demographic) - but Personal
// Weather Forecast, the app's only mood-trend surface, was purely
// passive, and the crisis-prep guide carried equal weight to routine
// Skill Guides like choosing a SIM plan despite the scale mismatch. ---
assert.ok(appSource.includes("function recentMoodTrend"), "mood trend detector exists");
const trendFn = section(appSource, "function recentMoodTrend", "function pendingMoodTrendNudge");
assert.ok(trendFn.includes("entries.length < 3") && trendFn.includes("< 40"), "requires a real sustained pattern (3+ consecutive low check-ins), not a single rough day");
assert.ok(appSource.includes("function pendingMoodTrendNudge"), "mood trend nudge exists");
assert.ok(appSource.includes("function acknowledgeMoodTrendNudge"), "the nudge can be acknowledged so it doesn't repeat for the same window");
const inboxSection = section(appSource, "function pendingInboxItems", "function inboxItemActions");
assert.ok(inboxSection.includes("pendingMoodTrendNudge()"), "the mood trend nudge is aggregated into the Inbox");
const inboxActionsSection = section(appSource, "function inboxItemActions", "function inboxModal");
assert.ok(inboxActionsSection.includes("data-dismiss-mood-trend-nudge") && inboxActionsSection.includes('data-open-payload="build-support-before-crisis"') && inboxActionsSection.includes('data-open="communityEncouragement"'), "the mood trend nudge links to real support resources (Support Circle, the crisis-prep guide, Been There), not just a bare acknowledgement");

// The crisis-prep guide now has its own direct Growth Hub entry point,
// proportionate to the real scale of the problem, instead of being one of
// 12 equal-weight Skill Guides (same visual weight as choosing a SIM plan).
assert.ok(appSource.includes('buildSupportGuide: () => skillGuideDetailModal("build-support-before-crisis")'), "build-support-before-crisis has a dedicated modal wrapper for a direct entry point");
// Second Brain Phase 2a moved these from Growth Hub chips inside a
// "Practical & Safety" section to the chat-dispatch/Ctrl+K catalog
// (commandLauncherCommands, `open:` instead of `modal:`) - same
// guarantee (a direct, real entry point, not buried in a generic list).
const practicalSection = section(appSource, 'id: "build-support-guide"', 'id: "ghost-roommate"');
assert.ok(practicalSection.includes('open: "buildSupportGuide"'), "Build support before crisis is a direct command-catalog entry, not buried inside the generic Skill Guides list");
// Been There opens its own modal directly. It used to be a bare
// tab: "community" jump, which dumped the user on the Community screen
// with no Been There in sight - a chip whose label promised a specific
// feature but only delivered a tab switch.
assert.ok(practicalSection.includes('open: "communityEncouragement"') && practicalSection.includes("Been There"), "the Been There entry opens Been There itself, not just the Community tab");
assert.ok(communitySource.includes("if (!hasCommunitySession()) {"), "Been There states the sign-in requirement instead of rendering a silently broken empty form when reached without a session");

// --- Behavioral: actually execute recentMoodTrend()/pendingMoodTrendNudge()
// against mock trackerState, not just confirm the source mentions them. ---
let trackerState;
function currentUserId() { return "me@example.com"; }
// eslint-disable-next-line no-eval
eval(section(appSource, "function recentMoodTrend", "function pendingMoodTrendNudge") + section(appSource, "function pendingMoodTrendNudge", "function acknowledgeMoodTrendNudge") + section(appSource, "function acknowledgeMoodTrendNudge", "function personalWeatherFronts"));

function saveTrackerState() {}
function isoDaysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }

// Fewer than 3 entries - never fires, even if all low.
trackerState = { mood: { entries: [{ user_id: "me@example.com", score: 10, created_at: isoDaysAgo(1) }, { user_id: "me@example.com", score: 15, created_at: isoDaysAgo(2) }] }, lastMoodTrendNudgeAt: null };
assert.strictEqual(recentMoodTrend(), null, "fewer than 3 real entries must never trigger the nudge");

// One good day mixed into recent low ones - a single normal day should not count as a distress pattern.
trackerState = { mood: { entries: [
  { user_id: "me@example.com", score: 10, created_at: isoDaysAgo(1) },
  { user_id: "me@example.com", score: 70, created_at: isoDaysAgo(2) },
  { user_id: "me@example.com", score: 15, created_at: isoDaysAgo(3) }
] }, lastMoodTrendNudgeAt: null };
assert.strictEqual(pendingMoodTrendNudge(), null, "one genuinely fine day among recent check-ins must not trigger the nudge - a single rough patch is normal");

// 3+ genuinely low, consecutive check-ins - a real sustained pattern.
trackerState = { mood: { entries: [
  { user_id: "me@example.com", score: 12, created_at: isoDaysAgo(1) },
  { user_id: "me@example.com", score: 18, created_at: isoDaysAgo(2) },
  { user_id: "me@example.com", score: 9, created_at: isoDaysAgo(3) }
] }, lastMoodTrendNudgeAt: null };
const firstNudge = pendingMoodTrendNudge();
assert.ok(firstNudge, "3 real consecutive low check-ins is a genuine sustained pattern and must trigger the nudge");

// Already acknowledged for this exact window - must not repeat.
acknowledgeMoodTrendNudge(firstNudge.mostRecentAt);
assert.strictEqual(pendingMoodTrendNudge(), null, "an acknowledged window must not re-trigger the same nudge");

// --- Self-critique finding: the Inbox grew to 6 item kinds pushed and
// rendered in a fixed code order with no priority, so the mood-trend
// signal - the thing the research pass concluded matters most - rendered
// dead last, under routine bills and up to 8 optional reflections. ---
assert.ok(appSource.includes("const INBOX_PRIORITY = {"), "the Inbox has an explicit priority table rather than relying on push order");
const priorityMatch = appSource.match(/const INBOX_PRIORITY = (\{[\s\S]*?\n\});/);
assert.ok(priorityMatch, "could extract the INBOX_PRIORITY table from app.js");
// eslint-disable-next-line no-eval
const INBOX_PRIORITY = eval(`(${priorityMatch[1]})`);
assert.ok(INBOX_PRIORITY.moodTrend < INBOX_PRIORITY.realLifeEvent, "a sustained distress signal outranks a routine bill");
assert.ok(INBOX_PRIORITY.realLifeEvent < INBOX_PRIORITY.roommate, "a real external deadline outranks a simulated roleplay character waiting");
assert.ok(INBOX_PRIORITY.roommate < INBOX_PRIORITY.resurface, "optional revisits sort last");
Object.keys(INBOX_PRIORITY).forEach((kind) => {
  assert.strictEqual(typeof INBOX_PRIORITY[kind], "number", `${kind} has a real numeric priority`);
});

// Sorting must be stable within a tier so same-kind items keep the order
// their source function returned them in (e.g. due dates by date).
const mockItems = [
  { kind: "resurface", label: "r1" },
  { kind: "moodTrend", label: "mood" },
  { kind: "realLifeEvent", label: "bill-1" },
  { kind: "resurface", label: "r2" },
  { kind: "realLifeEvent", label: "bill-2" },
  { kind: "roommate", label: "roomie" }
];
const sorted = mockItems
  .map((item, index) => ({ item, index }))
  .sort((a, b) => (INBOX_PRIORITY[a.item.kind] ?? 9) - (INBOX_PRIORITY[b.item.kind] ?? 9) || a.index - b.index)
  .map(({ item }) => item);
assert.strictEqual(sorted[0].label, "mood", "the mood-trend signal sorts to the very top, not last");
assert.deepStrictEqual(sorted.map((i) => i.label), ["mood", "bill-1", "bill-2", "roomie", "r1", "r2"], "full ordering is correct and stable within each tier");

console.log("Research-grounded features regression tests passed.");
