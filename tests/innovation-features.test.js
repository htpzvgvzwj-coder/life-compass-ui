const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const communitySource = fs.readFileSync(path.join(root, "community.js"), "utf8");
const schemaSource = fs.readFileSync(path.join(root, "docs", "community-schema.sql"), "utf8");

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `Could not find marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.ok(end > start, `Could not find end marker after ${startMarker}: ${endMarker}`);
  return source.slice(start, end);
}

// --- Feature 1: counterfactual replay ---
assert.ok(appSource.includes("async function generateJuryCounterfactual"), "counterfactual generator exists");
const counterfactualFn = section(appSource, "async function generateJuryCounterfactual", "function juryTrialModal");
assert.ok(counterfactualFn.includes("if (!session || !session.verdict || session.counterfactual) return;"), "counterfactual only generates once, and only after a verdict exists");
assert.ok(counterfactualFn.includes("conditional framing only"), "counterfactual prompt stays conditional, matching the Future Self module's own non-negotiable phrasing rule");
const juryModalSection = section(appSource, "function juryTrialModal", "function juryAppealModal");
assert.ok(juryModalSection.includes("data-jury-counterfactual"), "counterfactual button is wired into the verdict screen");
assert.ok(juryModalSection.includes("session.counterfactual"), "the generated counterfactual is actually rendered once it exists");

// --- Feature 2: debt of inaction ---
assert.ok(appSource.includes("function avoidancePatterns()"), "avoidance pattern detector exists");
assert.ok(appSource.includes("function avoidancePatternsModal"), "avoidance patterns modal exists");
// Second Brain Phase 2a moved the entry point from a Growth Hub chip
// (`modal: "avoidancePatterns"`) to the chat-dispatch/Ctrl+K catalog
// (`open: "avoidancePatterns"` in commandLauncherCommands).
assert.ok(appSource.includes('open: "avoidancePatterns"'), "Debt of Inaction has a real entry point in the command/chat-dispatch catalog");
const avoidanceFn = section(appSource, "function avoidancePatterns()", "function avoidancePatternsModal");
assert.ok(avoidanceFn.includes("ignoredCount") && avoidanceFn.includes("dismissedAt"), "detects reflections snoozed into silence, not just any dismissal");
assert.ok(avoidanceFn.includes("14 * 86400000"), "overdue Real Due Dates use a real 2-week threshold, not just technically-due");
assert.ok(avoidanceFn.includes("!session.verdict") && avoidanceFn.includes("juryTrials.sessions"), "detects Jury Duty trials abandoned before a verdict");

// --- Feature 3: future self testimony ---
assert.ok(appSource.includes("async function callFutureSelfToTestify"), "future self testimony generator exists");
const futureSelfFn = section(appSource, "async function callFutureSelfToTestify", "async function generateJuryCounterfactual");
assert.ok(futureSelfFn.includes("session.futureSelfTestified"), "future self testimony is a one-time action per trial");
assert.ok(futureSelfFn.includes("latestBlueprint()"), "future self testimony is grounded in the real saved Personal Blueprint, not invented");
assert.ok(futureSelfFn.includes("never deterministic") || futureSelfFn.includes("conditional"), "future self testimony stays conditional, matching the Future Self module's own phrasing rule");
assert.ok(juryModalSection.includes("data-call-future-self-witness"), "the witness button is wired into the trial screen");
assert.ok(appSource.includes('if (speaker === "futureself") return "Your Future Self (witness)";'), "future self testimony renders with a distinct speaker label in the transcript");

// --- Feature 4: anonymous "been-there" encouragement ---
assert.ok(schemaSource.includes("create table if not exists community_been_there_optins"), "opt-in table defined");
assert.ok(schemaSource.includes("create table if not exists community_encouragements"), "encouragement table defined");
// The whole point of this feature is real anonymity - verify it's enforced
// at the database layer (no select policy at all), not just hidden in the
// UI, since a determined user could otherwise read sender_id straight out
// of a direct Supabase REST call regardless of what the UI displays.
const encouragementsTableSection = section(schemaSource, "create table if not exists community_encouragements", "create index if not exists community_encouragements_recipient_status_idx");
assert.ok(!/create policy "community_encouragements_select/.test(encouragementsTableSection), "community_encouragements must have NO select policy - anonymity is enforced server-side, not just UI-hidden");
assert.ok(encouragementsTableSection.includes("community_encouragements_update_own_received"), "recipients can still mark their own received messages read via a narrow, safe update policy");

const apiSource = fs.readFileSync(path.join(root, "api", "community-encouragement.js"), "utf8");
assert.ok(apiSource.includes("select=id,category,message,read_at,created_at"), "the GET response explicitly excludes sender_id from the fields it selects");
assert.ok(!apiSource.includes("sender_id") || apiSource.match(/sender_id/g).length <= 2, "sender_id appears only where it's written on insert, never in what's read back to a recipient");
assert.ok(apiSource.includes("candidates[Math.floor(Math.random() * candidates.length)]"), "the recipient is chosen at random server-side - the sender can never browse or target a specific person");
assert.ok(apiSource.includes("user_id=neq.") && apiSource.includes("${user.id}"), "a sender can never be matched to themselves");

assert.ok(communitySource.includes("async function toggleBeenThereOptIn"), "opt-in toggle exists");
assert.ok(communitySource.includes("async function sendCommunityEncouragement"), "send function exists");
assert.ok(communitySource.includes("async function fetchMyEncouragements"), "fetch function exists");
assert.ok(communitySource.includes("/api/community-encouragement"), "the frontend calls the privileged endpoint, not a direct table query, for anything touching community_encouragements");
assert.ok(communitySource.includes('data-open="communityEncouragement"'), "Been There has a real entry point on the Community screen");
assert.ok(appSource.includes('event.target.closest("[data-toggle-been-there]")') && appSource.includes('event.target.closest("[data-send-community-encouragement]")') && appSource.includes('event.target.closest("[data-mark-encouragement-read]")'), "all three Been There actions are wired into the shared click handler");

console.log("Innovation features regression tests passed.");
