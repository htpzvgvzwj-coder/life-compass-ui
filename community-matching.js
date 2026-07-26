(function () {
  const matching = window.CommunityMatching || (window.CommunityMatching = {});

  const STOP_WORDS = new Set([
    "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "for", "with",
    "my", "me", "i", "is", "are", "was", "be", "at", "as", "it", "this", "that",
    "want", "would", "like", "get", "into", "will", "can", "not", "just", "so"
  ]);

  // ISO 8601 week number (1-53), stable across years, used to rotate the
  // shared weekly community theme deterministically without a DB table.
  function isoWeekNumber(date) {
    const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNumber + 3);
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
    const weekDiff = (target - firstThursday) / (7 * 24 * 60 * 60 * 1000);
    return 1 + Math.round(weekDiff);
  }

  // Cheap keyword extraction from free-text profile/goal fields, used to
  // suggest squads and accountability matches. No ML, just lowercase tokens
  // with stop words and short noise removed, deduped, capped.
  function extractTags(text, limit = 8) {
    const raw = String(text || "").toLowerCase();
    const words = raw.match(/[a-z][a-z'-]{2,}/g) || [];
    const tags = [];
    for (const word of words) {
      const clean = word.replace(/^'+|'+$/g, "");
      if (!clean || clean.length < 3 || STOP_WORDS.has(clean)) continue;
      if (!tags.includes(clean)) tags.push(clean);
      if (tags.length >= limit) break;
    }
    return tags;
  }

  // Simple overlap score between two tag lists, used to rank suggested
  // squads and accountability partners. Higher is more similar. Note this
  // is already symmetric (scoreTagOverlap(A,B) === scoreTagOverlap(B,A))
  // since extractTags() dedupes each list first, so it's really |A intersect
  // B| either way round - the one-sidedness of accountability-partner
  // suggestions isn't in this score, it's in ranking purely by MY score
  // against candidates without checking whether I'd also make THEIR list.
  // See suggestedAccountabilityPartners() in community.js for the
  // reciprocity check that fixes that (and why real Gale-Shapley stable
  // matching doesn't cleanly apply to this particular pool).
  function scoreTagOverlap(tagsA, tagsB) {
    const listA = Array.isArray(tagsA) ? tagsA : [];
    const listB = Array.isArray(tagsB) ? tagsB : [];
    if (!listA.length || !listB.length) return 0;
    const setB = new Set(listB.map((tag) => String(tag).toLowerCase()));
    let score = 0;
    for (const tag of listA) {
      if (setB.has(String(tag).toLowerCase())) score += 1;
    }
    return score;
  }

  // Buckets a Life Roadmap goal into a coarse stage for accountability
  // matching, based on the ratio of completed milestones.
  function computeRoadmapStage(goal) {
    const milestones = goal && Array.isArray(goal.milestones) ? goal.milestones : [];
    if (!milestones.length) return "starting";
    const done = milestones.filter((milestone) => milestone && milestone.status === "done").length;
    const ratio = done / milestones.length;
    if (ratio <= 0) return "starting";
    if (ratio < 0.7) return "in-progress";
    return "closing";
  }

  matching.isoWeekNumber = isoWeekNumber;
  matching.extractTags = extractTags;
  matching.scoreTagOverlap = scoreTagOverlap;
  matching.computeRoadmapStage = computeRoadmapStage;
})();
