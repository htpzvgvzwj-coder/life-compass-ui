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

const source = fs.readFileSync(path.join(root, "community-matching.js"), "utf8");
vm.runInContext(source, sandbox, { filename: "community-matching.js" });

const matching = sandbox.window.CommunityMatching;
assert.ok(matching, "CommunityMatching namespace exists");

// isoWeekNumber
assert.strictEqual(matching.isoWeekNumber(new Date(2026, 0, 1)), 1, "Jan 1 2026 is ISO week 1");
assert.strictEqual(matching.isoWeekNumber(new Date(2026, 6, 19)), 29, "Jul 19 2026 is ISO week 29");
assert.strictEqual(
  matching.isoWeekNumber(new Date(2026, 6, 19)),
  matching.isoWeekNumber(new Date(2026, 6, 19)),
  "isoWeekNumber is deterministic for a given date"
);

// extractTags
const tags = matching.extractTags("I want to become a confident public speaker and small business founder");
assert.ok(tags.includes("confident"), "extractTags keeps meaningful words");
assert.ok(tags.includes("business"), "extractTags keeps meaningful words");
assert.ok(!tags.includes("and"), "extractTags drops stop words");
assert.ok(!tags.includes("i"), "extractTags drops short/pronoun stop words");
assert.ok(new Set(tags).size === tags.length, "extractTags dedupes");
assert.strictEqual(matching.extractTags("").length, 0, "extractTags handles empty input");

// scoreTagOverlap
assert.strictEqual(matching.scoreTagOverlap(["study", "focus"], ["study", "career"]), 1, "scoreTagOverlap counts shared tags");
assert.strictEqual(matching.scoreTagOverlap([], ["study"]), 0, "scoreTagOverlap handles empty list");
assert.strictEqual(matching.scoreTagOverlap(["Study"], ["study"]), 1, "scoreTagOverlap is case-insensitive");

// computeRoadmapStage
assert.strictEqual(matching.computeRoadmapStage({ milestones: [] }), "starting", "no milestones is starting");
assert.strictEqual(
  matching.computeRoadmapStage({ milestones: [{ status: "pending" }, { status: "pending" }] }),
  "starting",
  "zero done milestones is starting"
);
assert.strictEqual(
  matching.computeRoadmapStage({ milestones: [{ status: "done" }, { status: "pending" }, { status: "pending" }] }),
  "in-progress",
  "under 70% done is in-progress"
);
assert.strictEqual(
  matching.computeRoadmapStage({
    milestones: [{ status: "done" }, { status: "done" }, { status: "done" }, { status: "pending" }]
  }),
  "closing",
  "70% or more done is closing"
);

console.log("community-matching.test.js passed");
