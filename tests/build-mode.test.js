const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(root, "styles.css"), "utf8");

const buildSection = appSource.slice(appSource.indexOf("// ---- Build Mode"), appSource.indexOf("async function sendChatMessage"));

assert.ok(appSource.includes("const BUILD_COACH_TYPES"), "Build Mode defines a coach catalog");
[
  "Interview Coach",
  "Study Coach",
  "Money Coach",
  "Communication Coach",
  "Confidence Coach",
  "Career Coach",
  "Wellness Coach",
  "Relationship Coach",
  "Independence Coach",
  "Opportunity Coach",
  "Entrepreneurship Coach",
  "Clarity Coach",
  "Custom Growth Coach"
].forEach((coach) => {
  assert.ok(appSource.includes(coach), `Build Mode supports ${coach}`);
});

assert.ok(buildSection.includes("buildCoachCatalogText"), "Build Mode sends the coach catalog to AI");
assert.ok(buildSection.includes("trainingPath"), "Build Mode stores an AI-generated training path");
assert.ok(buildSection.includes("normalizeTrainingPath"), "Build Mode normalizes AI training modules before saving");
assert.ok(buildSection.includes("buildSafeId"), "Build Mode sanitizes training ids");
assert.ok(buildSection.includes("while (usedIds.has(id))"), "Build Mode prevents duplicate training ids");
assert.ok(buildSection.includes("normalizeBuildTrainingSession"), "Build Mode safely normalizes old saved training sessions");
assert.ok(buildSection.includes("buildTrainingModal"), "Build Mode includes an interactive training room");
assert.ok(buildSection.includes("sendBuildTrainingReply"), "Build Mode lets the AI coach continue the training conversation");
assert.ok(buildSection.includes("session.messages.push({ sender: \"user\"") && buildSection.includes("saveTrackerState();"), "Build Mode saves user replies before requesting AI");
assert.ok(buildSection.includes("let buildTrainingDraft") || appSource.includes("let buildTrainingDraft"), "Build Mode preserves draft replies across modal refreshes");
assert.ok(appSource.includes("data-build-training-draft"), "Build Mode textarea stores the live draft input");
assert.ok(appSource.includes("matches(\"[data-build-training-draft]\")"), "Build Mode listens for draft input changes");
assert.ok(buildSection.includes("sendBuildTrainingReply(forcedText = \"\")"), "Build Mode can send typed or quick-prompt text");
assert.ok(appSource.includes("data-build-coach-prompt"), "Build Mode includes flexible quick prompts");
assert.ok(buildSection.includes("parsed && parsed.reply ? parsed.reply : reply"), "Build Mode can display natural AI replies when JSON parsing fails");
assert.ok(buildSection.includes("Do not force the original prompt"), "Build Mode coach adapts instead of forcing the original exercise");
assert.ok(buildSection.includes("Do NOT limit yourself to interview, study, or money"), "Build Mode explicitly avoids three-category limitation");
assert.ok(appSource.includes('data-future-mirror-mode="build"'), "Build Mode appears inside the Future Mirror mode switcher");
assert.ok(appSource.includes('futureMirrorMode === "build" ? buildModeEntrySection()'), "Future Mirror renders the Build Mode coach entry section");

[
  "Proof Log",
  "Evidence of Growth",
  "Save Evidence",
  "Feedback Scorecard",
  "Turn the better choice into proof"
].forEach((forbidden) => {
  assert.ok(!buildSection.includes(forbidden), `Build Mode no longer renders ${forbidden}`);
});

assert.ok(stylesSource.includes(".build-coach-card"), "Build Mode has coach-card styling");
assert.ok(stylesSource.includes(".build-training-chat"), "Build Mode has training-room chat styling");
assert.ok(stylesSource.includes(".build-free-coach-note"), "Build Mode explains that training can change direction");
assert.ok(stylesSource.includes(".build-coach-prompt-row"), "Build Mode quick prompts are styled");
assert.ok(stylesSource.includes(".build-training-message.is-user p"), "Build Mode keeps user message text readable");

console.log("Build Mode AI coach router tests passed.");
