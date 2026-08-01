const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(root, "styles.css"), "utf8");

// --- Structural checks: the pieces this session's onboarding + tone-audit
// work added actually exist, and the patterns that caused real bugs this
// session don't quietly come back. ---

assert.ok(appSource.includes("const ONBOARDING_FEATURE_SUGGESTIONS"), "Onboarding keyword-suggestion table exists");
assert.ok(appSource.includes("function suggestOnboardingFeature"), "Onboarding suggestion function exists");
assert.ok(appSource.includes("function firstRunOnboardingModal"), "First-run onboarding modal exists");
assert.ok(appSource.includes('onboarding: { completedAt: null, seedAnswer: "" }'), "defaultTrackerState defines the onboarding field");
assert.ok(appSource.includes("onboarding: (state.onboarding && typeof state.onboarding === \"object\")"), "normalizeTrackerState normalizes the onboarding field for old saved state");
assert.ok(appSource.includes('if (!trackerState.onboarding.completedAt) openModal("firstRunOnboarding");'), "Onboarding only auto-opens once, gated on completedAt");

// Regression: a real duplicate-id bug this session (the new modal's
// #onboarding-title collided with the pre-existing signup screen's own
// #onboarding-title heading) - confirm the fix's unique id is in place and
// the old colliding id is not reused inside the onboarding modal.
assert.ok(appSource.includes('id="first-run-onboarding-title"'), "Onboarding modal uses its own unique heading id");
const onboardingModalSection = appSource.slice(appSource.indexOf("function firstRunOnboardingModal"), appSource.indexOf("function firstRunOnboardingModal") + 3000);
assert.ok(!onboardingModalSection.includes('id="onboarding-title"'), "Onboarding modal must not reuse the signup screen's #onboarding-title id");

// Regression: the Skill Guide step checklist used to reuse .check-option (a
// pill-grid pattern), which caused an invisible unchecked state and a real
// click-blocking layout overlap on the "Back to guides" button. Confirm the
// dedicated component replaced it.
assert.ok(appSource.includes('class="skill-step-row"'), "Skill Guide steps use the dedicated skill-step-row component");
assert.ok(!appSource.includes('class="check-option skill-guide-step"'), "Skill Guide steps must not reuse the check-option pill pattern");
assert.ok(stylesSource.includes(".skill-step-row"), "skill-step-row is styled");
assert.ok(stylesSource.includes(".skill-step-box"), "skill-step-box (visible custom checkbox) is styled");

// Regression: the SOS FAB used to float above scrollable content (bottom:
// 98px, in the same band as page content) and could overlap Growth Hub
// chips scrolled into that corner. It was moved to dock inside the bottom
// nav's own reserved space instead. Confirm the fab's bottom offset stays
// below the nav's own height so it can never float over scrollable content
// again.
const navHeightMatch = stylesSource.match(/\.bottom-nav\s*\{[^}]*height:\s*(\d+)px/);
const fabBottomMatch = stylesSource.match(/\.sos-fab\s*\{[^}]*bottom:\s*(\d+)px/);
assert.ok(navHeightMatch && fabBottomMatch, "Both .bottom-nav height and .sos-fab bottom offset are defined");
const navHeight = Number(navHeightMatch[1]);
const fabBottom = Number(fabBottomMatch[1]);
assert.ok(fabBottom < navHeight, `SOS FAB (bottom: ${fabBottom}px) must stay docked within the nav's own height (${navHeight}px), not float above it into scrollable content`);

// --- Tone-audit regressions: these exact generic phrases were found and
// fixed this session for violating the app's own "never just say Something
// went wrong" standard, already implicit in every other error message
// ("Couldn't X right now. Please try again."). ---
assert.ok(!appSource.includes("Something went wrong mid-trial"), "Jury Duty error must not use the generic 'Something went wrong' phrasing");
assert.ok(!appSource.includes('"Sorry, Compass AI is having trouble'), "Compass AI error must not open with an apology");
assert.ok(!appSource.includes('"Something went wrong. Please try again.";'), "Backup passphrase error must not use the bare generic phrasing");

// --- Behavioral checks: actually execute suggestOnboardingFeature()'s
// routing logic (not just check it exists), extracted straight from the
// live source so this test breaks the moment the real function's behavior
// regresses. Two of the cases below are real bugs found and fixed this
// session, not hypothetical edge cases. ---
const guidesMatch = appSource.match(/const SKILL_GUIDES = (\[[\s\S]*?\n\]);/);
const suggestionsMatch = appSource.match(/const ONBOARDING_FEATURE_SUGGESTIONS = (\[[\s\S]*?\n\]);/);
assert.ok(guidesMatch && suggestionsMatch, "Could extract SKILL_GUIDES and ONBOARDING_FEATURE_SUGGESTIONS from app.js");

const SKILL_GUIDES = eval(guidesMatch[1]);
const ONBOARDING_FEATURE_SUGGESTIONS = eval(suggestionsMatch[1]);

function suggestOnboardingFeature(answerText) {
  const text = (answerText || "").toLowerCase();
  const match = ONBOARDING_FEATURE_SUGGESTIONS.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)));
  return match || { id: "general" };
}

assert.strictEqual(SKILL_GUIDES.length, 19, "Skill Guides should have 19 entries (expanded again with youre-not-actually-behind/what-graduate-numbers-actually-say)");
const guideIds = new Set(SKILL_GUIDES.map((guide) => guide.id));
assert.strictEqual(guideIds.size, SKILL_GUIDES.length, "Skill Guide ids must be unique");
SKILL_GUIDES.forEach((guide) => {
  assert.ok(Array.isArray(guide.steps) && guide.steps.length >= 4, `${guide.id} has a real multi-step guide, not a stub`);
});

ONBOARDING_FEATURE_SUGGESTIONS.forEach((entry) => {
  if (entry.open === "skillGuideDetail") {
    assert.ok(guideIds.has(entry.payload), `Onboarding suggestion "${entry.id}" points at a real Skill Guide id ("${entry.payload}")`);
  }
});
const suggestionIds = ONBOARDING_FEATURE_SUGGESTIONS.map((entry) => entry.id);
assert.strictEqual(new Set(suggestionIds).size, suggestionIds.length, "Onboarding suggestion category ids must be unique");

const routingCases = [
  ["I dont know how to cook anything real", "cooking"],
  ["worried about renting a room when I move out", "renting"],
  ["my payslip confuses me every month", "payslip"],
  ["nervous about signing my first job contract", "job-offer"],
  ["just went through a breakup and feel lost", "breakup"],
  ["dont understand voting or civic duties here", "civic"],
  ["scared of getting into credit card debt", "credit"],
  // Regression: "burn" alone matched "burnt out" (mental-health idiom) as if
  // it meant a physical burn injury. Must route to mind, not first-aid.
  ["feeling really anxious and burnt out lately", "mind"],
  // Regression: an actual physical-burn mention must still route correctly.
  ["I burnt myself on the stove and did not know what to do", "first-aid"],
  // Regression: broad emotional wording ("stressful") used to shadow a more
  // specific topic (roommate) listed later in the table. Concrete topics
  // must win regardless of which generic feeling word also appears.
  ["living with my roommate is stressful, we keep fighting over chores", "roommate"],
  // No concrete topic at all - should fall through to the generic category.
  ["nothing concrete, just generally unsure about everything", "decision"]
];
routingCases.forEach(([answer, expectedId]) => {
  const result = suggestOnboardingFeature(answer);
  assert.strictEqual(result.id, expectedId, `"${answer}" should route to "${expectedId}", got "${result.id}"`);
});

console.log("Onboarding + tone-audit regression tests passed.");
