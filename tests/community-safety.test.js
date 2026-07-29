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

// --- Self-critique finding: accountability partners are algorithmically
// matched with zero vetting (unlike mentor_profiles, which requires manual
// review) and are actively encouraged to exchange real external contact
// info once connected. There was no report/block mechanism anywhere, and
// the wall's own copy claimed to be "a moderated support wall" when
// moderation only ever covered pre-publish content. ---

// Schema: both new tables exist with RLS and are scoped to their owner only
// (private data, no service-role/moderation layer needed - neither a block
// nor a report is ever shown to any other user).
assert.ok(schemaSource.includes("create table if not exists community_blocks"), "community_blocks table defined");
assert.ok(schemaSource.includes("create table if not exists community_reports"), "community_reports table defined");
assert.ok(/community_blocks_select_own.*blocker_id = auth\.uid\(\)/s.test(schemaSource), "community_blocks scoped to blocker only");
assert.ok(/community_reports_select_own.*reporter_id = auth\.uid\(\)/s.test(schemaSource), "community_reports scoped to reporter only");
assert.ok(schemaSource.includes("unique (blocker_id, blocked_id)"), "a user can only block someone once");

// Frontend: block/report actions exist and are wired through app.js's
// shared click-delegation handler (community.js only renders markup - all
// click handling for Community-rendered content lives in app.js).
assert.ok(communitySource.includes("async function blockCommunityUser"), "blockCommunityUser exists");
assert.ok(communitySource.includes("async function unblockCommunityUser"), "unblockCommunityUser exists");
assert.ok(communitySource.includes("async function submitCommunityReport"), "submitCommunityReport exists");
assert.ok(appSource.includes('event.target.closest("[data-block-community-user]")'), "block button is wired into the click handler");
assert.ok(appSource.includes('event.target.closest("[data-open-community-report]")'), "report button is wired into the click handler");
assert.ok(appSource.includes('event.target.closest("[data-submit-community-report]")'), "report submit is wired into the click handler");

// Every surface that shows another user's content or connects you to one
// must both offer Report/Block and filter out anyone already blocked -
// checking both together so a future edit can't silently drop one side.
const wallPostSection = section(communitySource, "function communityWallPostCard", "function communityWall()");
const wallSection = section(communitySource, "function communityWall()", "function communityPostModal");
assert.ok(wallPostSection.includes("data-open-community-report"), "wall posts can be reported");
assert.ok(wallSection.includes("blockedCommunityUserIds()"), "the wall filters out blocked authors' posts");

const connectionCardSection = section(communitySource, "function accountabilityConnectionCard", "function accountabilityMatchCard");
assert.ok(connectionCardSection.includes("data-block-community-user"), "accountability connections can be blocked - the highest-risk surface (unvetted, real contact info exchanged)");
assert.ok(connectionCardSection.includes("data-open-community-report"), "accountability connections can be reported");

const suggestedPartnersSection = section(communitySource, "function suggestedAccountabilityPartners", "function accountabilityConnectionCard");
assert.ok(suggestedPartnersSection.includes("blockedCommunityUserIds()"), "blocked users are filtered out of accountability partner suggestions");

const mentorSection = section(communitySource, "function communityMentorSection", "function communityMentorApplyModal");
assert.ok(mentorSection.includes("data-block-community-user") && mentorSection.includes("data-open-community-report"), "mentor cards can be reported and blocked");
assert.ok(section(communitySource, "function suggestedMentors", "function communityMentorSection").includes("blockedCommunityUserIds()"), "blocked users are filtered out of mentor suggestions");

assert.ok(section(communitySource, "function skillTagCard", "function communitySkillExchangeSection").includes("data-open-community-report"), "skill tag listings can be reported");
assert.ok(section(communitySource, "function browsableSkillTags", "function skillCategoryLabel").includes("blockedCommunityUserIds()"), "blocked users are filtered out of skill exchange browsing");

assert.ok(communitySource.includes("function communityMembersBlockedModal"), "a management view exists to see and unblock previously-blocked members");
assert.ok(communitySource.includes('data-open="communityMembersBlocked"'), "the blocked-members view has a real entry point from the Community screen");

// --- Self-critique finding: Community had its own real, timestamped
// activity that never fed into Your Story - reaching out for real support
// was invisible to the one place meant to reflect everything a user has
// actually done. ---
const timelineSection = section(appSource, "function growthTimelineEvents", "function yourStoryCard");
assert.ok(timelineSection.includes("communityPostsCacheSnapshot") && timelineSection.includes("communityAccountabilityConnectionsSnapshot"), "Your Story pulls in real Community activity");
assert.ok(timelineSection.includes('typeof hasCommunitySession === "function" && hasCommunitySession()'), "the Community timeline read is guarded - a Compass account has no obligation to ever sign into Community");

// --- Behavioral: actually execute the blocking/reporting predicates
// against mock caches, not just confirm the source mentions them. ---
let communityBlocksCache;
let communityMyReportsCache;
function communityUserId() { return "me-uuid"; }
// eslint-disable-next-line no-eval
eval(section(communitySource, "function blockedCommunityUserIds", "function isCommunityUserBlocked"));
// eslint-disable-next-line no-eval
eval(section(communitySource, "function hasReportedCommunityTarget", "// -----"));

communityBlocksCache = [
  { blocker_id: "me-uuid", blocked_id: "user-a" },
  { blocker_id: "someone-else", blocked_id: "me-uuid" } // someone else blocking ME must never appear in MY block set
];
const blocked = blockedCommunityUserIds();
assert.ok(blocked.has("user-a"), "a user I blocked is in my block set");
assert.ok(!blocked.has("someone-else"), "someone who blocked me is not mixed into my own block set (RLS only ever returns rows where I'm the blocker)");

communityMyReportsCache = [
  { reporter_id: "me-uuid", target_type: "user", target_id: null, target_user_id: "user-a" },
  { reporter_id: "me-uuid", target_type: "post", target_id: "post-1", target_user_id: null }
];
assert.strictEqual(hasReportedCommunityTarget("user", null, "user-a"), true, "reporting user-a is remembered for user-a specifically");
assert.strictEqual(hasReportedCommunityTarget("user", null, "user-b"), false, "reporting user-a must not falsely read as having reported user-b (both have target_id: null)");
assert.strictEqual(hasReportedCommunityTarget("post", "post-1"), true, "reporting a specific post is remembered");
assert.strictEqual(hasReportedCommunityTarget("post", "post-2"), false, "reporting one post must not falsely cover a different post");

console.log("Community safety (report/block) regression tests passed.");
