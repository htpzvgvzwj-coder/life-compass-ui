(function () {
  // Screens, modals, and data caches for the real multi-user Community tab.
  // Everything here talks to Supabase (via community-supabase.js) or the
  // privileged api/community-*.js endpoints. Every other tab in the app is
  // untouched by this file.

  const communityWeeklyThemes = [
    { title: "Small consistent wins", prompt: "What's one small, boring, consistent action that's actually working for you this week?" },
    { title: "Naming the blocker", prompt: "What's the real thing slowing you down right now - not the excuse, the real thing?" },
    { title: "Asking for help", prompt: "What's something you've been trying to do alone that would go faster with help?" },
    { title: "A realistic next step", prompt: "What's the next step toward your goal that's actually realistic this week, not the ideal version?" },
    { title: "Celebrating quietly", prompt: "What's something you did recently that nobody noticed but you're proud of?" },
    { title: "Pressure check", prompt: "Is a current goal actually yours, or something you picked up from comparison or pressure?" },
    { title: "Recovering from a setback", prompt: "What's something that didn't go to plan recently, and what did you do next?" },
    { title: "Support you'd give", prompt: "What advice would you give a friend in your exact situation right now?" }
  ];

  let communitySquadsCache = [];
  let communitySquadMembersCache = [];
  let communityPostsCache = [];
  let communityOpportunitiesCache = [];
  let communityProfilesCache = [];
  let communityAccountabilityOptInsCache = [];
  let communityAccountabilityConnectionsCache = [];
  let communityMentorProfilesCache = [];
  let communityMyMentorApplicationsCache = [];
  let communitySkillTagsCache = [];
  let communityMyProfile = null;
  let skillExchangeBrowseType = "offered";
  let skillExchangeFilterCategory = "";
  let communityDataLoading = false;
  let communityDataLoaded = false;
  let communityDataError = "";

  let communityAuthMode = "sign-in";
  let communityAuthBusy = false;
  let communityAuthError = "";

  let pendingMilestoneShare = null;

  // Report/block (self-critique finding): accountability partners are
  // algorithmically matched with no vetting and are actively encouraged to
  // exchange real external contact info once connected - there was no
  // recourse if a match went badly, and the wall's own copy called it "a
  // moderated support wall" when moderation only ever covered pre-publish
  // content. Both caches are scoped to the signed-in user only (RLS:
  // blocker_id/reporter_id = auth.uid()), same private-data shape as
  // compass_backups.
  let communityBlocksCache = [];
  let communityMyReportsCache = [];
  let communityBlockBusy = false;
  let communityReportTarget = null;
  let communityReportBusy = false;
  let communityReportError = "";

  // Anonymous "been-there" encouragement (new idea): a lower-commitment
  // alternative to accountability_connections. community_been_there_optins
  // is my own opt-in list, fetched normally (RLS: select_own). Received
  // encouragements (communityEncouragementsCache) can NOT be fetched
  // normally - community_encouragements has no select policy at all, by
  // design, so sender_id can never reach the browser even for the
  // recipient. See fetchMyEncouragements() and api/community-encouragement.js.
  let communityBeenThereOptInsCache = [];
  let communityEncouragementsCache = [];
  let communityEncouragementsLoaded = false;
  let communityEncouragementSendCategory = "";
  let communityEncouragementBusy = false;
  let communityEncouragementError = "";
  let communityEncouragementStatus = "";

  function communityProfilesById() {
    const map = new Map();
    communityProfilesCache.forEach((profile) => map.set(profile.id, profile));
    return map;
  }

  function communityProfileFor(userId) {
    return communityProfilesById().get(userId) || null;
  }

  function blockedCommunityUserIds() {
    const myId = communityUserId();
    return new Set(communityBlocksCache.filter((row) => row.blocker_id === myId).map((row) => row.blocked_id));
  }

  function isCommunityUserBlocked(userId) {
    return blockedCommunityUserIds().has(userId);
  }

  // For target_type "user" there is no item id (target_id is always null),
  // so matching on target_id alone would treat "reported user A" as also
  // covering user B, C... - match on target_user_id for that case instead.
  function hasReportedCommunityTarget(targetType, targetId, targetUserId) {
    const myId = communityUserId();
    return communityMyReportsCache.some((row) => {
      if (row.reporter_id !== myId || row.target_type !== targetType) return false;
      return targetType === "user" ? row.target_user_id === targetUserId : row.target_id === targetId;
    });
  }

  function communitySquadMemberCount(squadId) {
    return communitySquadMembersCache.filter((member) => member.squad_id === squadId).length;
  }

  function isCommunitySquadMember(squadId) {
    const myId = communityUserId();
    return communitySquadMembersCache.some((member) => member.squad_id === squadId && member.user_id === myId);
  }

  function formatCommunityTime(iso) {
    if (!iso) return "Just now";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Just now";
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  async function fetchCommunityTable(table, modify) {
    const client = getCommunitySupabaseClient();
    if (!client) return [];
    try {
      let query = client.from(table).select("*");
      if (typeof modify === "function") query = modify(query);
      const { data, error } = await query;
      if (error) {
        console.error(`[Community] fetching ${table} failed`, error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error(`[Community] fetching ${table} failed`, error);
      return [];
    }
  }

  async function refreshCommunityData() {
    if (!hasCommunitySession() || communityDataLoading) return;
    communityDataLoading = true;
    try {
      const [squads, squadMembers, posts, opportunities, profiles, optIns, connections, mentorProfiles, mentorApplications, skillTags, blocks, myReports, beenThereOptIns] = await Promise.all([
        fetchCommunityTable("squads", (q) => q.order("is_seeded", { ascending: false }).order("created_at", { ascending: true })),
        fetchCommunityTable("squad_members"),
        fetchCommunityTable("posts", (q) => q.order("created_at", { ascending: false }).limit(60)),
        fetchCommunityTable("opportunities_shared", (q) => q.order("created_at", { ascending: false }).limit(40)),
        fetchCommunityTable("profiles"),
        fetchCommunityTable("accountability_optins"),
        fetchCommunityTable("accountability_connections"),
        fetchCommunityTable("mentor_profiles"),
        fetchCommunityTable("mentor_applications"),
        fetchCommunityTable("skill_tags", (q) => q.order("created_at", { ascending: false }).limit(120)),
        fetchCommunityTable("community_blocks"),
        fetchCommunityTable("community_reports"),
        fetchCommunityTable("community_been_there_optins")
      ]);
      communitySquadsCache = squads;
      communitySquadMembersCache = squadMembers;
      communityPostsCache = posts;
      communityOpportunitiesCache = opportunities;
      communityProfilesCache = profiles;
      communityAccountabilityOptInsCache = optIns;
      communityAccountabilityConnectionsCache = connections;
      communityMentorProfilesCache = mentorProfiles;
      communityMyMentorApplicationsCache = mentorApplications;
      communitySkillTagsCache = skillTags;
      communityBlocksCache = blocks;
      communityMyReportsCache = myReports;
      communityBeenThereOptInsCache = beenThereOptIns;
      communityMyProfile = profiles.find((profile) => profile.id === communityUserId()) || null;
      communityDataLoaded = true;
      communityDataError = "";
      if (typeof checkCommunityAchievements === "function") checkCommunityAchievements();
      // Fire-and-forget: hits the privileged endpoint, not the normal
      // Supabase client, so it's kept out of the main Promise.all above -
      // the rest of Community shouldn't wait on a second network round
      // trip. Re-opens the modal only if the user is actually looking at
      // it when the fetch resolves.
      fetchMyEncouragements().then(() => {
        if (typeof isModalActive === "function" && isModalActive("communityEncouragement")) openModal("communityEncouragement");
      });
    } catch (error) {
      console.error("[Community] refreshCommunityData failed", error);
      communityDataError = "Couldn't load Community right now. Pull to refresh or try again shortly.";
    } finally {
      communityDataLoading = false;
    }
  }

  // ---------------------------------------------------------------------
  // Auth gate
  // ---------------------------------------------------------------------

  function communityAuthGateScreen() {
    return `
      <header class="screen-head compact-head community-head">
        <div>
          <p class="eyebrow">Growth Community</p>
          <h2 class="screen-title">Find people growing in the same direction.</h2>
          <p class="screen-subtitle">Community is the one part of Compass that uses a real account, because your posts and squads are visible to other real people. Everything else in Compass stays your local demo profile.</p>
        </div>
        <div class="avatar"><img src="assets/icon-support.png" alt=""></div>
      </header>
      <section class="community-auth-gate">
        <div class="mirror-example-row mode-toggle-row">
          <button type="button" class="${communityAuthMode === "sign-in" ? "is-selected" : ""}" data-community-auth-mode="sign-in">Sign in</button>
          <button type="button" class="${communityAuthMode === "sign-up" ? "is-selected" : ""}" data-community-auth-mode="sign-up">Create account</button>
        </div>
        <div class="admin-form">
          ${communityAuthMode === "sign-up" ? `<label>Display name<input id="community-auth-username" type="text" maxlength="24" placeholder="Shown on your posts"></label>` : ""}
          <label>Email<input id="community-auth-email" type="email" autocomplete="email" placeholder="you@example.com"></label>
          <label>Password<input id="community-auth-password" type="password" autocomplete="${communityAuthMode === "sign-up" ? "new-password" : "current-password"}" placeholder="At least 6 characters"></label>
          <p class="form-error" id="community-auth-error" aria-live="polite">${escapeHTML(communityAuthError)}</p>
        </div>
        <button class="primary-action" type="button" data-community-${communityAuthMode === "sign-up" ? "sign-up" : "sign-in"} ${communityAuthBusy ? "disabled" : ""}>
          ${communityAuthBusy ? "Please wait..." : communityAuthMode === "sign-up" ? "Create account" : "Sign in"}
        </button>
      </section>
    `;
  }

  // ---------------------------------------------------------------------
  // Weekly theme (idea 8) - deterministic static rotation, no DB table.
  // ---------------------------------------------------------------------

  function currentCommunityWeekTheme() {
    const week = CommunityMatching.isoWeekNumber(new Date());
    return { week, ...communityWeeklyThemes[week % communityWeeklyThemes.length] };
  }

  function communityThemeCard() {
    const theme = currentCommunityWeekTheme();
    return `
      <section class="community-theme-banner">
        <p class="eyebrow">This week's theme</p>
        <h3>${escapeHTML(theme.title)}</h3>
        <p>${escapeHTML(theme.prompt)}</p>
        <button class="secondary-action compact-action" type="button" data-open="communityPost" data-open-payload="theme:${escapeHTML(theme.prompt)}">Post about this</button>
      </section>
    `;
  }

  // ---------------------------------------------------------------------
  // Squads (idea 3)
  // ---------------------------------------------------------------------

  function suggestedSquadsForUser() {
    const goalText = [userProfile.goals, userProfile.dreamCareer, ...(typeof myRoadmapGoals === "function" ? myRoadmapGoals().map((goal) => goal.title) : [])].filter(Boolean).join(" ");
    const myTags = CommunityMatching.extractTags(goalText);
    if (!myTags.length) return [];
    return communitySquadsCache
      .filter((squad) => !isCommunitySquadMember(squad.id))
      .map((squad) => ({ squad, score: CommunityMatching.scoreTagOverlap(myTags, squad.tags || []) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.squad);
  }

  function communitySquadCard(squad) {
    const memberCount = communitySquadMemberCount(squad.id);
    const joined = isCommunitySquadMember(squad.id);
    return `
      <article class="community-card">
        <div class="community-card-top">
          <span class="category-badge">${memberCount} member${memberCount === 1 ? "" : "s"}</span>
          <img src="assets/icon-support.png" alt="">
        </div>
        <h3>${escapeHTML(squad.title)}</h3>
        <p>${escapeHTML(squad.description)}</p>
        <div class="community-actions">
          <button class="primary-action compact-action" type="button" data-open="communityGroup" data-open-payload="${escapeHTML(squad.id)}">Open group</button>
          ${joined
            ? `<button class="secondary-action compact-action" type="button" data-leave-squad="${escapeHTML(squad.id)}">Leave</button>`
            : `<button class="secondary-action compact-action" type="button" data-join-squad="${escapeHTML(squad.id)}">Join</button>`}
        </div>
      </article>
    `;
  }

  function communityCards() {
    if (!communitySquadsCache.length) {
      return `
        <section class="empty-feature">
          <img src="assets/icon-support.png" alt="">
          <div><strong>No squads yet</strong><p>Be the first to create one below.</p></div>
        </section>
      `;
    }
    return communitySquadsCache.map(communitySquadCard).join("");
  }

  function communitySuggestedSquadsRail() {
    const suggested = suggestedSquadsForUser();
    if (!suggested.length) return "";
    return `
      <div class="content-rail-title"><strong>Suggested for you</strong><span>Based on your goals</span></div>
      <div class="community-grid">${suggested.map(communitySquadCard).join("")}</div>
    `;
  }

  function communityGroupModal(squadId) {
    const squad = communitySquadsCache.find((item) => item.id === squadId) || communitySquadsCache[0];
    if (!squad) {
      return `
        <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="community-group-title">
          <div class="modal-top">
            <span class="risk-pill calm">Growth Community</span>
            <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
          </div>
          <h3 id="community-group-title">No squads yet</h3>
          <p class="muted">Create the first one from the Community tab.</p>
        </div>
      `;
    }
    const members = communitySquadMembersCache
      .filter((member) => member.squad_id === squad.id)
      .map((member) => communityProfileFor(member.user_id))
      .filter(Boolean);
    const joined = isCommunitySquadMember(squad.id);
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="community-group-title">
        <div class="modal-top">
          <span class="risk-pill calm">Growth Community</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="community-group-title">${escapeHTML(squad.title)}</h3>
        <p class="muted">${escapeHTML(squad.description)}</p>
        <div class="advice-stack">
          <div><strong>Safety rule</strong><span>Do not share full name, address, school schedule, passwords, payment details, or private contact information publicly.</span></div>
        </div>
        ${members.length ? `
          <div class="content-rail-title"><strong>Members</strong><span>${members.length}</span></div>
          <div class="community-member-list">
            ${members.map((member) => `
              <span class="badge-chip">${escapeHTML(member.username)} - trust ${Math.round(member.community_trust_snapshot || 0)}</span>
            `).join("")}
          </div>
        ` : ""}
        <div class="profile-actions">
          <button class="primary-action" type="button" data-open="communityPost" data-open-payload="squad:${escapeHTML(squad.id)}">Write a post</button>
          ${joined
            ? `<button class="secondary-action" type="button" data-leave-squad="${escapeHTML(squad.id)}">Leave squad</button>`
            : `<button class="secondary-action" type="button" data-join-squad="${escapeHTML(squad.id)}">Join squad</button>`}
        </div>
      </div>
    `;
  }

  function communityCreateSquadModal() {
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="community-create-squad-title">
        <div class="modal-top">
          <span class="risk-pill calm">New squad</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="community-create-squad-title">Start a growth squad</h3>
        <div class="admin-form">
          <label>Title<input id="community-squad-title" type="text" maxlength="80" placeholder="Example: Weekend Founders"></label>
          <label>Description<textarea id="community-squad-description" maxlength="400" placeholder="What is this squad for?"></textarea></label>
          <label>Tags (comma separated)<input id="community-squad-tags" type="text" placeholder="business, startup, portfolio"></label>
          <p class="form-error" id="community-squad-error" aria-live="polite"></p>
        </div>
        <button class="primary-action" type="button" data-save-squad>Create squad</button>
      </div>
    `;
  }

  // ---------------------------------------------------------------------
  // Wall / posts (ideas 2, 5, 7, 8)
  // ---------------------------------------------------------------------

  function communityWallPostCard(post) {
    const author = communityProfileFor(post.author_id);
    const squad = post.squad_id ? communitySquadsCache.find((item) => item.id === post.squad_id) : null;
    const isMine = post.author_id === communityUserId();
    const reported = hasReportedCommunityTarget("post", post.id);
    return `
      <article class="${post.status === "pending" ? "is-pending" : ""}">
        <strong>${escapeHTML(author ? author.username : "Member")}${author ? ` - trust ${Math.round(author.community_trust_snapshot || 0)}` : ""}</strong>
        <p>${escapeHTML(post.body)}</p>
        <small>
          ${squad ? `${escapeHTML(squad.title)} - ` : ""}${formatCommunityTime(post.created_at)}
          ${post.post_type === "milestone" ? `<span class="risk-pill calm">Milestone</span>` : ""}
          ${post.status === "pending" ? `<span class="risk-pill calm">Checking...</span>` : ""}
        </small>
        ${!isMine ? `<button class="text-action" type="button" data-open-community-report="post:${escapeHTML(post.id)}:${escapeHTML(post.author_id)}" ${reported ? "disabled" : ""}>${reported ? "Reported" : "Report"}</button>` : ""}
      </article>
    `;
  }

  function communityWall() {
    const blocked = blockedCommunityUserIds();
    const visiblePosts = communityPostsCache.filter((post) => !blocked.has(post.author_id));
    return `
      <section class="community-wall-card">
        <div class="section-row">
          <div>
            <p class="eyebrow">Community Wall</p>
            <h3>Share pressure without exposing private details.</h3>
          </div>
          <button class="secondary-action compact-action" type="button" data-open="communityPost">Post</button>
        </div>
        <div class="community-wall-list">
          ${visiblePosts.length ? visiblePosts.map(communityWallPostCard).join("") : `
            <article class="empty-wall">
              <strong>No posts yet</strong>
              <p>Write a calm anonymous note, question, or encouragement. Do not include private details.</p>
            </article>
          `}
        </div>
      </section>
    `;
  }

  function communityPostModal(payload = "") {
    const [kind, value] = String(payload || "").split(/:(.+)/).filter((part) => part !== undefined);
    const squadId = kind === "squad" ? value : "";
    const themePrompt = kind === "theme" ? value : "";
    const milestoneSeed = pendingMilestoneShare ? `Just hit a milestone toward "${pendingMilestoneShare.goalTitle}": ${pendingMilestoneShare.milestoneTitle}. ` : "";
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="community-post-title">
        <div class="modal-top">
          <span class="risk-pill calm">Community post</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="community-post-title">Write a safe post</h3>
        ${pendingMilestoneShare ? `<p class="muted">Sharing a completed milestone with Community.</p>` : `<p class="muted">Keep it kind. Do not include private personal details - posts are checked before they're visible to others.</p>`}
        <div class="admin-form">
          <label>Squad
            <select id="community-post-group">
              <option value="">General support</option>
              ${communitySquadsCache.map((squad) => `
                <option value="${escapeHTML(squad.id)}" ${squadId === squad.id ? "selected" : ""}>${escapeHTML(squad.title)}</option>
              `).join("")}
            </select>
          </label>
          <label>Post<textarea id="community-post-text" placeholder="${themePrompt ? escapeHTML(themePrompt) : "Example: I am trying to study more consistently this week. What helped you start when motivation was low?"}">${escapeHTML(milestoneSeed)}</textarea></label>
          <div id="community-compose-suggestion"></div>
          <p class="form-error" id="community-post-error" aria-live="polite"></p>
        </div>
        <div class="profile-actions">
          <button class="secondary-action compact-action" type="button" data-community-compose-assist>Improve my wording</button>
          <button class="primary-action" type="button" data-save-community-post>Post</button>
        </div>
      </div>
    `;
  }

  async function submitCommunityPost({ body, squadId, postType = "general", relatedGoalTitle, relatedMilestoneTitle, themeWeek }) {
    const response = await fetch(`${COMMUNITY_API_BASE}/api/community-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${communityAccessToken()}` },
      body: JSON.stringify({ body, squadId: squadId || null, postType, relatedGoalTitle, relatedMilestoneTitle, themeWeek })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not publish your post right now.");
    return data;
  }

  // ---------------------------------------------------------------------
  // Squad membership + creation writes
  // ---------------------------------------------------------------------

  async function joinSquad(squadId) {
    const client = getCommunitySupabaseClient();
    if (!client) return false;
    const { error } = await client.from("squad_members").insert({ squad_id: squadId, user_id: communityUserId() });
    if (error) {
      console.error("[Community] joinSquad failed", error);
      return false;
    }
    return true;
  }

  async function leaveSquad(squadId) {
    const client = getCommunitySupabaseClient();
    if (!client) return false;
    const { error } = await client.from("squad_members").delete().eq("squad_id", squadId).eq("user_id", communityUserId());
    if (error) {
      console.error("[Community] leaveSquad failed", error);
      return false;
    }
    return true;
  }

  async function createSquad({ title, description, tags }) {
    const client = getCommunitySupabaseClient();
    if (!client) throw new Error("Community isn't set up yet.");
    const { data, error } = await client.from("squads").insert({
      title, description, tags, created_by: communityUserId()
    }).select();
    if (error) throw new Error(error.message || "Could not create that squad.");
    return data && data[0];
  }

  // ---------------------------------------------------------------------
  // Accountability matching (idea 6) - minimal viable, no chat product.
  // ---------------------------------------------------------------------

  function myAccountabilityOptIn() {
    return communityAccountabilityOptInsCache.find((entry) => entry.user_id === communityUserId()) || null;
  }

  function myAccountabilityConnections() {
    const myId = communityUserId();
    return communityAccountabilityConnectionsCache.filter((entry) => entry.requester_id === myId || entry.recipient_id === myId);
  }

  // Connection ids for an arbitrary user (not just "me") - lets us recompute
  // someone ELSE's candidate pool the same way we compute our own, which is
  // exactly what the mutual-match check below needs.
  function accountabilityConnectedIdsFor(userId) {
    return new Set(
      communityAccountabilityConnectionsCache
        .filter((entry) => entry.requester_id === userId || entry.recipient_id === userId)
        .map((entry) => (entry.requester_id === userId ? entry.recipient_id : entry.requester_id))
    );
  }

  // Same ranking logic `suggestedAccountabilityPartners` uses for "me", but
  // parameterized so it can be re-run from any opted-in user's point of
  // view - used both for my own suggestions and for the reciprocity check.
  function rankedAccountabilityCandidatesFor(userId, forEntry) {
    const connectedIds = accountabilityConnectedIdsFor(userId);
    return communityAccountabilityOptInsCache
      .filter((entry) => entry.user_id !== userId && !connectedIds.has(entry.user_id) && entry.roadmap_stage === forEntry.roadmap_stage)
      .map((entry) => ({ entry, score: CommunityMatching.scoreTagOverlap(forEntry.goal_tags || [], entry.goal_tags || []) }))
      .sort((a, b) => b.score - a.score);
  }

  // Tag-overlap ranking alone is one-sided: it answers "how well do THEIR
  // tags match mine" but says nothing about whether they'd rank me back.
  // True Gale-Shapley stable matching doesn't cleanly apply to this pool -
  // accountability partners are matched within one symmetric peer group,
  // not two distinct sides, which is the harder (and not always solvable)
  // Stable Roommates problem, not Stable Marriage. Instead of forcing that
  // algorithm in, this recomputes each candidate's OWN top-3 the same way
  // and flags whether I'd actually appear on it - a direct, honest fix for
  // "don't suggest someone who wouldn't also suggest me back."
  function suggestedAccountabilityPartners() {
    const mine = myAccountabilityOptIn();
    if (!mine) return [];
    const myId = communityUserId();
    const blocked = blockedCommunityUserIds();
    return rankedAccountabilityCandidatesFor(myId, mine)
      .filter(({ entry }) => !blocked.has(entry.user_id))
      .slice(0, 3)
      .map(({ entry }) => {
        const theirTopPicks = rankedAccountabilityCandidatesFor(entry.user_id, entry).slice(0, 3).map((item) => item.entry.user_id);
        return { ...entry, isMutualPick: theirTopPicks.includes(myId) };
      });
  }

  function accountabilityConnectionCard(connection) {
    const myId = communityUserId();
    const isRequester = connection.requester_id === myId;
    const otherId = isRequester ? connection.recipient_id : connection.requester_id;
    const otherProfile = communityProfileFor(otherId);
    const reveal = connection.contact_reveal || {};
    const myHintKey = isRequester ? "requester" : "recipient";
    const theirHintKey = isRequester ? "recipient" : "requester";
    return `
      <article class="accountability-match-card">
        <strong>${escapeHTML(otherProfile ? otherProfile.username : "Member")}</strong>
        <p>${escapeHTML(connection.intro_message)}</p>
        <small>Status: ${escapeHTML(connection.status)}</small>
        ${connection.status === "requested" && !isRequester ? `
          <div class="profile-actions">
            <button class="primary-action compact-action" type="button" data-accept-accountability-request="${escapeHTML(connection.id)}">Accept</button>
            <button class="secondary-action compact-action" type="button" data-decline-accountability-request="${escapeHTML(connection.id)}">Decline</button>
          </div>
        ` : ""}
        ${connection.status === "accepted" ? `
          ${reveal[theirHintKey] ? `<p><strong>Their contact hint:</strong> ${escapeHTML(reveal[theirHintKey])}</p>` : `<p class="muted">They haven't shared a contact hint yet.</p>`}
          <div class="admin-form">
            <label>Your contact hint (optional)<input type="text" data-contact-hint-input="${escapeHTML(connection.id)}" maxlength="140" value="${escapeHTML(reveal[myHintKey] || "")}" placeholder="e.g. an Instagram handle or Discord tag"></label>
          </div>
          <button class="secondary-action compact-action" type="button" data-save-contact-hint="${escapeHTML(connection.id)}">Save contact hint</button>
        ` : ""}
        ${connection.status !== "declined" ? `
          <div class="profile-actions">
            <button class="text-action" type="button" data-open-community-report="user::${escapeHTML(otherId)}" ${hasReportedCommunityTarget("user", null, otherId) ? "disabled" : ""}>Report</button>
            <button class="text-action danger-text" type="button" data-block-community-user="${escapeHTML(otherId)}">Block</button>
          </div>
        ` : ""}
      </article>
    `;
  }

  function accountabilityMatchCard() {
    const mine = myAccountabilityOptIn();
    const connections = myAccountabilityConnections();
    const roadmapGoals = typeof myRoadmapGoals === "function" ? myRoadmapGoals() : [];
    if (!mine) {
      return `
        <section class="accountability-match-card">
          <p class="eyebrow">Accountability Matching</p>
          <h3>Find someone at a similar stage on a similar goal.</h3>
          <p>Opt in and Compass matches you with another real member working on something similar.</p>
          <div class="admin-form">
            <label>Your current goal
              ${roadmapGoals.length
                ? `<select id="accountability-goal-select">${roadmapGoals.map((goal) => `<option value="${escapeHTML(goal.id)}">${escapeHTML(goal.title)}</option>`).join("")}</select>`
                : `<input id="accountability-goal-text" type="text" maxlength="200" placeholder="Example: Land a junior design role">`}
            </label>
            <p class="form-error" id="accountability-optin-error" aria-live="polite"></p>
          </div>
          <button class="primary-action compact-action" type="button" data-save-accountability-optin>Opt in to matching</button>
        </section>
      `;
    }
    const suggestions = suggestedAccountabilityPartners();
    return `
      <section class="accountability-match-card">
        <p class="eyebrow">Accountability Matching</p>
        <h3>Working on: ${escapeHTML(mine.goal_title)}</h3>
        <p class="muted">Stage: ${escapeHTML(mine.roadmap_stage)}</p>
        ${suggestions.length ? `
          <div class="content-rail-title"><strong>Suggested partners</strong><span>${suggestions.length}</span></div>
          ${suggestions.map((entry) => {
            const profile = communityProfileFor(entry.user_id);
            return `
              <article class="accountability-match-card">
                ${entry.isMutualPick ? `<span class="mutual-pick-badge">Likely a mutual match</span>` : ""}
                <strong>${escapeHTML(profile ? profile.username : "Member")}</strong>
                <p>${escapeHTML(entry.goal_title)}</p>
                <button class="primary-action compact-action" type="button" data-open="communityAccountabilityRequest" data-open-payload="${escapeHTML(entry.user_id)}">Request partner</button>
              </article>
            `;
          }).join("")}
        ` : `<p class="muted">No matches at your stage yet - check back soon.</p>`}
        ${connections.length ? `
          <div class="content-rail-title"><strong>Your requests</strong><span>${connections.length}</span></div>
          ${connections.map(accountabilityConnectionCard).join("")}
        ` : ""}
      </section>
    `;
  }

  function communityAccountabilityRequestModal(targetUserId) {
    const profile = communityProfileFor(targetUserId);
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="community-accountability-title">
        <div class="modal-top">
          <span class="risk-pill calm">Accountability request</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="community-accountability-title">Message ${escapeHTML(profile ? profile.username : "this member")}</h3>
        <p class="muted">A short, respectful intro. No contact details here - you can each share an optional hint after you both accept.</p>
        <div class="admin-form">
          <label>Intro message<textarea id="community-accountability-message" maxlength="500" placeholder="Example: Hi! I'm also working toward a design internship, want to check in weekly?"></textarea></label>
          <p class="form-error" id="community-accountability-error" aria-live="polite"></p>
        </div>
        <button class="primary-action" type="button" data-send-accountability-request="${escapeHTML(targetUserId)}">Send request</button>
      </div>
    `;
  }

  async function saveAccountabilityOptIn({ goalTitle, roadmapStage, goalTags }) {
    const client = getCommunitySupabaseClient();
    if (!client) throw new Error("Community isn't set up yet.");
    const { error } = await client.from("accountability_optins").upsert({
      user_id: communityUserId(), goal_title: goalTitle, roadmap_stage: roadmapStage, goal_tags: goalTags
    });
    if (error) throw new Error(error.message || "Could not save your opt-in.");
  }

  async function requestAccountabilityConnection(recipientId, introMessage) {
    const client = getCommunitySupabaseClient();
    if (!client) throw new Error("Community isn't set up yet.");
    const { error } = await client.from("accountability_connections").insert({
      requester_id: communityUserId(), recipient_id: recipientId, intro_message: introMessage
    });
    if (error) throw new Error(error.message || "Could not send that request.");
  }

  async function respondAccountabilityConnection(connectionId, status) {
    const client = getCommunitySupabaseClient();
    if (!client) return false;
    const { error } = await client.from("accountability_connections").update({ status, responded_at: new Date().toISOString() }).eq("id", connectionId);
    if (error) {
      console.error("[Community] respondAccountabilityConnection failed", error);
      return false;
    }
    return true;
  }

  async function saveAccountabilityContactHint(connectionId, hint) {
    const client = getCommunitySupabaseClient();
    if (!client) return false;
    const connection = communityAccountabilityConnectionsCache.find((entry) => entry.id === connectionId);
    if (!connection) return false;
    const myId = communityUserId();
    const key = connection.requester_id === myId ? "requester" : "recipient";
    const reveal = { ...(connection.contact_reveal || {}), [key]: hint };
    const { error } = await client.from("accountability_connections").update({ contact_reveal: reveal }).eq("id", connectionId);
    if (error) {
      console.error("[Community] saveAccountabilityContactHint failed", error);
      return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------
  // Block / Report (self-critique finding) - see community_blocks and
  // community_reports in docs/community-schema.sql. Both write directly
  // from the client (no privileged endpoint, no AI moderation needed) since
  // neither is ever shown to any other user - a block only changes what the
  // blocker themself sees, and a report is reviewed manually by the owner
  // in the Supabase SQL editor, same deliberate no-admin-UI shape already
  // used for mentor_applications.
  // ---------------------------------------------------------------------

  async function blockCommunityUser(userId) {
    if (!userId || userId === communityUserId()) return false;
    const client = getCommunitySupabaseClient();
    if (!client) return false;
    communityBlockBusy = true;
    try {
      const { error } = await client.from("community_blocks").insert({ blocker_id: communityUserId(), blocked_id: userId });
      if (error) {
        console.error("[Community] blockCommunityUser failed", error);
        return false;
      }
      communityBlocksCache = [...communityBlocksCache, { blocker_id: communityUserId(), blocked_id: userId }];
      return true;
    } finally {
      communityBlockBusy = false;
    }
  }

  async function unblockCommunityUser(userId) {
    const client = getCommunitySupabaseClient();
    if (!client) return false;
    communityBlockBusy = true;
    try {
      const { error } = await client.from("community_blocks").delete().eq("blocker_id", communityUserId()).eq("blocked_id", userId);
      if (error) {
        console.error("[Community] unblockCommunityUser failed", error);
        return false;
      }
      communityBlocksCache = communityBlocksCache.filter((row) => !(row.blocker_id === communityUserId() && row.blocked_id === userId));
      return true;
    } finally {
      communityBlockBusy = false;
    }
  }

  async function submitCommunityReport(reason) {
    if (!communityReportTarget) return false;
    const client = getCommunitySupabaseClient();
    if (!client) return false;
    communityReportBusy = true;
    communityReportError = "";
    try {
      const row = {
        reporter_id: communityUserId(),
        target_type: communityReportTarget.type,
        target_id: communityReportTarget.id || null,
        target_user_id: communityReportTarget.userId || null,
        reason: String(reason || "").trim()
      };
      if (row.reason.length < 4) {
        communityReportError = "Say a little more about what's wrong (at least a few words).";
        return false;
      }
      const { error } = await client.from("community_reports").insert(row);
      if (error) {
        communityReportError = error.message || "Couldn't submit that report right now. Please try again.";
        return false;
      }
      communityMyReportsCache = [...communityMyReportsCache, row];
      return true;
    } finally {
      communityReportBusy = false;
    }
  }

  // ---------------------------------------------------------------------
  // Anonymous "been-there" encouragement (new idea)
  // ---------------------------------------------------------------------

  function isBeenThereOptedIn(category) {
    const myId = communityUserId();
    return communityBeenThereOptInsCache.some((row) => row.user_id === myId && row.category === category);
  }

  async function toggleBeenThereOptIn(category) {
    const client = getCommunitySupabaseClient();
    if (!client) return;
    const myId = communityUserId();
    if (isBeenThereOptedIn(category)) {
      const { error } = await client.from("community_been_there_optins").delete().eq("user_id", myId).eq("category", category);
      if (!error) communityBeenThereOptInsCache = communityBeenThereOptInsCache.filter((row) => !(row.user_id === myId && row.category === category));
    } else {
      const { error } = await client.from("community_been_there_optins").insert({ user_id: myId, category });
      if (!error) communityBeenThereOptInsCache = [...communityBeenThereOptInsCache, { user_id: myId, category }];
    }
  }

  // Read path only ever goes through the privileged endpoint - see the
  // comment on community_encouragements in docs/community-schema.sql. The
  // table has no client-reachable SELECT policy at all, so this is the
  // only way to read a received message, even for its own recipient -
  // sender_id is stripped server-side before the response is sent.
  async function fetchMyEncouragements() {
    try {
      const response = await fetch(`${COMMUNITY_API_BASE}/api/community-encouragement`, {
        headers: { Authorization: `Bearer ${communityAccessToken()}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not load your encouragements.");
      communityEncouragementsCache = data.encouragements || [];
      communityEncouragementsLoaded = true;
    } catch (error) {
      console.error("[Community] fetchMyEncouragements failed", error);
    }
  }

  async function sendCommunityEncouragement(category, message) {
    communityEncouragementBusy = true;
    communityEncouragementError = "";
    communityEncouragementStatus = "";
    try {
      const response = await fetch(`${COMMUNITY_API_BASE}/api/community-encouragement`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${communityAccessToken()}` },
        body: JSON.stringify({ category, message })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        communityEncouragementError = data.error || "Could not send that encouragement right now.";
        return false;
      }
      communityEncouragementStatus = data.status === "published" ? "Sent - it's on its way to someone who's currently stuck on this." : "Delivered for review before it can go out.";
      return true;
    } catch (error) {
      console.error("[Community] sendCommunityEncouragement failed", error);
      communityEncouragementError = "Could not send that encouragement right now.";
      return false;
    } finally {
      communityEncouragementBusy = false;
    }
  }

  // Client-updatable directly (no privileged endpoint needed) - the update
  // policy's own USING clause already scopes this to the caller's own
  // received rows (recipient_id = auth.uid()), and marking your own
  // received message read/unread cannot affect any other user's data.
  async function markEncouragementRead(id) {
    const client = getCommunitySupabaseClient();
    if (!client) return;
    const { error } = await client.from("community_encouragements").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (!error) {
      communityEncouragementsCache = communityEncouragementsCache.map((row) => (row.id === id ? { ...row, read_at: new Date().toISOString() } : row));
    }
  }

  // ---------------------------------------------------------------------
  // Skill Exchange - "I can offer X" / "I need X" listings tagged with one
  // of the 6 BUILD_LIFE_MOMENT_CATEGORIES (app.js). Connecting reuses
  // accountability_connections as-is, same as Community Mentors below - a
  // connection request doesn't care whether the recipient is a peer, a
  // mentor, or a skill-exchange match. No payments/points.
  // ---------------------------------------------------------------------

  function mySkillTags() {
    const myId = communityUserId();
    return communitySkillTagsCache.filter((tag) => tag.user_id === myId && tag.status !== "blocked");
  }

  function browsableSkillTags() {
    const myId = communityUserId();
    const blocked = blockedCommunityUserIds();
    return communitySkillTagsCache
      .filter((tag) => tag.status === "published" && tag.user_id !== myId && !blocked.has(tag.user_id) && tag.type === skillExchangeBrowseType)
      .filter((tag) => !skillExchangeFilterCategory || tag.category === skillExchangeFilterCategory);
  }

  function skillCategoryLabel(categoryId) {
    const category = (typeof BUILD_LIFE_MOMENT_CATEGORIES !== "undefined" ? BUILD_LIFE_MOMENT_CATEGORIES : []).find((entry) => entry.id === categoryId);
    return category ? category.label : categoryId;
  }

  function skillTagChip(tag) {
    return `
      <span class="badge-chip">
        ${escapeHTML(skillCategoryLabel(tag.category))} - ${escapeHTML(tag.note)}
        ${tag.status === "pending" ? `<em> (checking...)</em>` : ""}
        <button type="button" class="ghost-circle" data-delete-skill-tag="${escapeHTML(tag.id)}" aria-label="Remove">x</button>
      </span>
    `;
  }

  function skillTagCard(tag) {
    const profile = communityProfileFor(tag.user_id);
    const badgeCount = (profile && Array.isArray(profile.badges)) ? profile.badges.length : 0;
    return `
      <article class="community-card">
        <div class="community-card-top">
          <span class="category-badge">${escapeHTML(skillCategoryLabel(tag.category))}</span>
          <img src="assets/icon-support.png" alt="">
        </div>
        <h3>${escapeHTML(profile ? profile.username : "Member")}</h3>
        <p>${escapeHTML(tag.note)}</p>
        <small>trust ${Math.round((profile && profile.community_trust_snapshot) || 0)}${badgeCount ? ` - ${badgeCount} badge${badgeCount === 1 ? "" : "s"}` : ""}</small>
        <div class="community-actions">
          <button class="primary-action compact-action" type="button" data-open="communityAccountabilityRequest" data-open-payload="${escapeHTML(tag.user_id)}">Request connection</button>
          <button class="text-action" type="button" data-open-community-report="skill_tag:${escapeHTML(tag.id)}:${escapeHTML(tag.user_id)}" ${hasReportedCommunityTarget("skill_tag", tag.id) ? "disabled" : ""}>Report</button>
        </div>
      </article>
    `;
  }

  function communitySkillExchangeSection() {
    const myOffered = mySkillTags().filter((tag) => tag.type === "offered");
    const myNeeded = mySkillTags().filter((tag) => tag.type === "needed");
    const browsed = browsableSkillTags();
    const categories = typeof BUILD_LIFE_MOMENT_CATEGORIES !== "undefined" ? BUILD_LIFE_MOMENT_CATEGORIES : [];
    return `
      <section class="accountability-match-card">
        <p class="eyebrow">Skill Exchange</p>
        <h3>Trade what you know for what you need.</h3>
        <p class="muted">Offer something you're good at, or ask for help with something you're not. No payments or points - just people helping people. Notes are checked before they're visible to others.</p>

        <div class="content-rail-title"><strong>What I can offer</strong><span>${myOffered.length}</span></div>
        <div class="community-member-list">${myOffered.length ? myOffered.map(skillTagChip).join("") : `<p class="muted">Nothing offered yet.</p>`}</div>
        <button class="secondary-action compact-action" type="button" data-open="communityAddSkillTag" data-open-payload="offered">Offer a skill</button>

        <div class="content-rail-title"><strong>What I need</strong><span>${myNeeded.length}</span></div>
        <div class="community-member-list">${myNeeded.length ? myNeeded.map(skillTagChip).join("") : `<p class="muted">Nothing added yet.</p>`}</div>
        <button class="secondary-action compact-action" type="button" data-open="communityAddSkillTag" data-open-payload="needed">Ask for help</button>

        <div class="content-rail-title"><strong>Browse the exchange</strong><span>${browsed.length}</span></div>
        <div class="mirror-example-row mode-toggle-row">
          <button type="button" class="${skillExchangeBrowseType === "offered" ? "is-selected" : ""}" data-skill-browse-type="offered">People offering help</button>
          <button type="button" class="${skillExchangeBrowseType === "needed" ? "is-selected" : ""}" data-skill-browse-type="needed">People who need help</button>
        </div>
        <div class="mirror-example-row mode-toggle-row">
          <button type="button" class="${skillExchangeFilterCategory === "" ? "is-selected" : ""}" data-skill-browse-category="">All</button>
          ${categories.map((category) => `<button type="button" class="${skillExchangeFilterCategory === category.id ? "is-selected" : ""}" data-skill-browse-category="${escapeHTML(category.id)}">${escapeHTML(category.label)}</button>`).join("")}
        </div>
        <div class="community-grid">
          ${browsed.length ? browsed.map(skillTagCard).join("") : `
            <section class="empty-feature">
              <img src="assets/icon-support.png" alt="">
              <div><strong>No matches yet</strong><p>Check back soon, or try a different filter.</p></div>
            </section>
          `}
        </div>
      </section>
    `;
  }

  function communityAddSkillTagModal(type) {
    const skillType = type === "needed" ? "needed" : "offered";
    const categories = typeof BUILD_LIFE_MOMENT_CATEGORIES !== "undefined" ? BUILD_LIFE_MOMENT_CATEGORIES : [];
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="community-skill-tag-title">
        <div class="modal-top">
          <span class="risk-pill calm">Skill Exchange</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="community-skill-tag-title">${skillType === "offered" ? "Offer a skill" : "Ask for help"}</h3>
        <p class="muted">Keep it short and specific. Do not include private personal details - notes are checked before they're visible to others.</p>
        <input type="hidden" id="community-skill-tag-type" value="${skillType}">
        <div class="admin-form">
          <label>Category
            <select id="community-skill-tag-category">
              ${categories.map((category) => `<option value="${escapeHTML(category.id)}">${escapeHTML(category.label)}</option>`).join("")}
            </select>
          </label>
          <label>One-line note<input id="community-skill-tag-note" type="text" maxlength="140" placeholder="${skillType === "offered" ? "Example: I just finished filing my taxes, can walk you through the IRAS site" : "Example: Could use help practicing interview answers"}"></label>
          <p class="form-error" id="community-skill-tag-error" aria-live="polite"></p>
        </div>
        <button class="primary-action" type="button" data-save-skill-tag>${skillType === "offered" ? "Offer" : "Ask"}</button>
      </div>
    `;
  }

  async function submitSkillTag({ type, category, note }) {
    const response = await fetch(`${COMMUNITY_API_BASE}/api/community-skill-tag`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${communityAccessToken()}` },
      body: JSON.stringify({ type, category, note })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not save that right now.");
    return data;
  }

  async function deleteSkillTag(tagId) {
    const client = getCommunitySupabaseClient();
    if (!client) return false;
    const { error } = await client.from("skill_tags").delete().eq("id", tagId).eq("user_id", communityUserId());
    if (error) {
      console.error("[Community] deleteSkillTag failed", error);
      return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------
  // Community mentors (roadmap item 4: extend accountability matching to
  // vetted adult mentors, not just peers). "Vetted" here means owner-curated:
  // mentor_profiles has no client-reachable insert/update - the only way a
  // row lands there is the app owner manually promoting an approved
  // mentor_applications row after actually reading it, since this app has no
  // admin panel and no way to do genuine identity/background verification.
  // Connecting with a mentor reuses the exact same accountability_connections
  // table/modal/handler as peer matching - a connection request doesn't care
  // whether the recipient is a peer or a mentor.
  // ---------------------------------------------------------------------

  function myMentorApplication() {
    const myId = communityUserId();
    return communityMyMentorApplicationsCache.find((entry) => entry.user_id === myId) || null;
  }

  function suggestedMentors() {
    const mine = myAccountabilityOptIn();
    const myId = communityUserId();
    const blocked = blockedCommunityUserIds();
    const pool = communityMentorProfilesCache.filter((entry) => entry.user_id !== myId && !blocked.has(entry.user_id));
    if (!mine) return pool;
    return [...pool].sort((a, b) => CommunityMatching.scoreTagOverlap(mine.goal_tags || [], b.focus_tags || []) - CommunityMatching.scoreTagOverlap(mine.goal_tags || [], a.focus_tags || []));
  }

  function communityMentorSection() {
    const mentors = suggestedMentors();
    const myApplication = myMentorApplication();
    return `
      <section class="accountability-match-card">
        <p class="eyebrow">Community Mentors</p>
        <h3>Find someone who has already been through it.</h3>
        <p class="muted">Mentors are community members personally reviewed by the Compass team, not licensed professionals. Keep sensitive or urgent situations with a trusted adult or professional.</p>
        ${mentors.length ? `
          <div class="content-rail-title"><strong>Mentors</strong><span>${mentors.length}</span></div>
          ${mentors.map((mentor) => `
            <article class="accountability-match-card">
              <strong>${escapeHTML(communityProfileFor(mentor.user_id) ? communityProfileFor(mentor.user_id).username : "Mentor")}</strong>
              <p>${escapeHTML(mentor.bio)}</p>
              ${mentor.focus_tags && mentor.focus_tags.length ? `<p class="muted">${mentor.focus_tags.map((tag) => escapeHTML(tag)).join(" · ")}</p>` : ""}
              <div class="profile-actions">
                <button class="primary-action compact-action" type="button" data-open="communityAccountabilityRequest" data-open-payload="${escapeHTML(mentor.user_id)}">Request to connect</button>
                <button class="text-action" type="button" data-open-community-report="user::${escapeHTML(mentor.user_id)}" ${hasReportedCommunityTarget("user", null, mentor.user_id) ? "disabled" : ""}>Report</button>
                <button class="text-action danger-text" type="button" data-block-community-user="${escapeHTML(mentor.user_id)}">Block</button>
              </div>
            </article>
          `).join("")}
        ` : `<p class="muted">No mentors yet - check back soon.</p>`}
        ${myApplication ? `
          <p class="muted">${myApplication.status === "pending" ? "Your mentor application is saved and waiting on a manual review - there's no fixed timeline, so this may take a while."
            : myApplication.status === "approved" ? "You're a listed Community mentor."
            : myApplication.status === "declined" ? "Your mentor application wasn't approved this time."
            : "Your mentor application needs changes before it can be reviewed."}</p>
        ` : `<button class="secondary-action compact-action" type="button" data-open="communityMentorApply">Apply to become a mentor</button>`}
      </section>
    `;
  }

  function communityMentorApplyModal() {
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="community-mentor-apply-title">
        <div class="modal-top">
          <span class="risk-pill calm">Mentor application</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="community-mentor-apply-title">Apply to become a Community mentor</h3>
        <p class="muted">Tell us about your own experience and what you'd want to help with. Applications are reviewed manually, in batches, not on a fixed schedule - it can take a while before a mentor profile goes live, and we can't guarantee every application gets a response.</p>
        <div class="admin-form">
          <label>Your bio<textarea id="community-mentor-bio" maxlength="600" placeholder="Example: I spent two years figuring out budgeting and lease-signing the hard way. I'd like to help with money basics and first-apartment questions."></textarea></label>
          <label>Focus areas (comma separated)<input id="community-mentor-tags" type="text" placeholder="budgeting, first job, moving out"></label>
          <p class="form-error" id="community-mentor-apply-error" aria-live="polite"></p>
        </div>
        <button class="primary-action" type="button" data-submit-mentor-application>Submit application</button>
      </div>
    `;
  }

  async function submitMentorApplication({ bio, focusTags }) {
    const response = await fetch(`${COMMUNITY_API_BASE}/api/community-mentor-apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${communityAccessToken()}` },
      body: JSON.stringify({ bio, focusTags })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not submit your mentor application right now.");
    return data;
  }

  // ---------------------------------------------------------------------
  // Report / Block modals (self-critique finding - see docs/community-schema.sql)
  // ---------------------------------------------------------------------

  const COMMUNITY_REPORT_TARGET_LABELS = { post: "post", opportunity: "shared opportunity", skill_tag: "skill listing", user: "member" };

  function communityReportModal() {
    const label = communityReportTarget ? (COMMUNITY_REPORT_TARGET_LABELS[communityReportTarget.type] || "item") : "item";
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="community-report-title">
        <div class="modal-top">
          <span class="risk-pill calm">Report</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="community-report-title">Report this ${escapeHTML(label)}</h3>
        <p class="muted">This is reviewed manually - it's never shown to anyone else. What's wrong with it?</p>
        <div class="admin-form">
          <label>Reason<textarea id="community-report-reason" maxlength="500" placeholder="Example: shared personal contact details in a squad post"></textarea></label>
          <p class="form-error" id="community-report-error" aria-live="polite">${escapeHTML(communityReportError)}</p>
        </div>
        <button class="primary-action" type="button" data-submit-community-report ${communityReportBusy ? "disabled" : ""}>${communityReportBusy ? "Submitting..." : "Submit report"}</button>
      </div>
    `;
  }

  function communityMembersBlockedModal() {
    const myId = communityUserId();
    const blocked = communityBlocksCache.filter((row) => row.blocker_id === myId);
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="community-blocked-title">
        <div class="modal-top">
          <span class="risk-pill calm">Blocked members</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="community-blocked-title">Blocked members</h3>
        <p class="muted">You won't see posts, opportunities, or listings from anyone blocked here, and neither of you can send new connection requests.</p>
        ${blocked.length ? `
          <div class="action-stack">
            ${blocked.map((row) => {
              const profile = communityProfileFor(row.blocked_id);
              return `
                <div class="wide-action">
                  <span><strong>${escapeHTML(profile ? profile.username : "Member")}</strong></span>
                  <button class="secondary-action compact-action" type="button" data-unblock-community-user="${escapeHTML(row.blocked_id)}" ${communityBlockBusy ? "disabled" : ""}>Unblock</button>
                </div>
              `;
            }).join("")}
          </div>
        ` : `<p class="muted">Nobody blocked.</p>`}
      </div>
    `;
  }

  // ---------------------------------------------------------------------
  // Anonymous "been-there" encouragement modal (new idea)
  // ---------------------------------------------------------------------

  const BEEN_THERE_CATEGORIES = (typeof BUILD_LIFE_MOMENT_CATEGORIES !== "undefined" ? BUILD_LIFE_MOMENT_CATEGORIES : []);

  function communityEncouragementModal() {
    const unread = communityEncouragementsCache.filter((row) => !row.read_at);
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="community-encouragement-title">
        <div class="modal-top">
          <span class="risk-pill calm">Been There</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="community-encouragement-title">Anonymous, one-time encouragement</h3>
        <p class="muted">Lighter than an accountability partner - no ongoing relationship, both sides stay anonymous. Send one honest message to a stranger currently stuck where you once were, or receive one from someone who's been there.</p>

        <div class="content-rail-title"><strong>You've genuinely been through</strong><span></span></div>
        <p class="tiny-note">Opt into a category only if you've actually resolved something real there - this isn't a self-claimed skill listing.</p>
        <div class="option-grid">
          ${BEEN_THERE_CATEGORIES.map((category) => `
            <label class="check-option">
              <input type="checkbox" data-toggle-been-there="${escapeHTML(category.id)}" ${isBeenThereOptedIn(category.id) ? "checked" : ""}>
              <span>${escapeHTML(category.label)}</span>
            </label>
          `).join("")}
        </div>

        <div class="content-rail-title"><strong>Send one</strong><span></span></div>
        <div class="admin-form">
          <label>What are you currently stuck on?
            <select id="community-encouragement-category">
              <option value="">Pick a category</option>
              ${BEEN_THERE_CATEGORIES.map((category) => `<option value="${escapeHTML(category.id)}">${escapeHTML(category.label)}</option>`).join("")}
            </select>
          </label>
          <label>Your message<textarea id="community-encouragement-message" maxlength="500" placeholder="Something honest and encouraging - no names, no contact info, this stays anonymous on both sides."></textarea></label>
          <p class="form-error" id="community-encouragement-error" aria-live="polite">${escapeHTML(communityEncouragementError)}</p>
          ${communityEncouragementStatus ? `<p class="tiny-note desk-hero-connection">${escapeHTML(communityEncouragementStatus)}</p>` : ""}
        </div>
        <button class="primary-action compact-action" type="button" data-send-community-encouragement ${communityEncouragementBusy ? "disabled" : ""}>${communityEncouragementBusy ? "Sending..." : "Send anonymously"}</button>

        <div class="content-rail-title"><strong>Received</strong><span>${unread.length ? `${unread.length} new` : ""}</span></div>
        ${communityEncouragementsCache.length ? `
          <div class="action-stack">
            ${communityEncouragementsCache.map((row) => `
              <div class="wide-action ${row.read_at ? "" : "is-active"}">
                <span>
                  <strong>${escapeHTML(skillCategoryLabel(row.category))}</strong>
                  <small>${escapeHTML(row.message)}</small>
                </span>
                ${!row.read_at ? `<button class="text-action" type="button" data-mark-encouragement-read="${escapeHTML(row.id)}">Mark read</button>` : ""}
              </div>
            `).join("")}
          </div>
        ` : `<p class="muted">Nothing received yet.</p>`}
      </div>
    `;
  }

  // ---------------------------------------------------------------------
  // Crowdsourced opportunities (idea 10)
  // ---------------------------------------------------------------------

  function communityOpportunityCard(item) {
    return `
      <article class="opportunity-card">
        <div class="opportunity-card-top">
          <span class="category-badge">${escapeHTML(item.category)}</span>
          <span class="opportunity-type">Community-submitted</span>
          ${item.difficulty ? `<span class="difficulty-pill difficulty-${escapeHTML(item.difficulty.toLowerCase())}">${escapeHTML(item.difficulty)}</span>` : ""}
        </div>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description)}</p>
        ${item.prep_needed ? `<p class="tiny-note feed-prep-note">Prep needed: ${escapeHTML(item.prep_needed)}</p>` : ""}
        <div class="profile-actions">
          <button class="primary-action compact-action" type="button" data-open-link="${escapeHTML(item.link)}">View</button>
          <button class="secondary-action compact-action" type="button" data-prepare-opportunity="${escapeHTML(item.title)}" data-prepare-opportunity-category="${escapeHTML(item.category)}">Prepare with Compass</button>
          ${item.submitted_by && item.submitted_by !== communityUserId() ? `<button class="text-action" type="button" data-open-community-report="opportunity:${escapeHTML(item.id)}:${escapeHTML(item.submitted_by)}" ${hasReportedCommunityTarget("opportunity", item.id) ? "disabled" : ""}>Report</button>` : ""}
        </div>
      </article>
    `;
  }

  function communityOpportunitiesRail() {
    if (hasCommunitySession() && !communityDataLoaded && !communityDataLoading) {
      refreshCommunityData().then(() => {
        if (window.activeTab === "community" && typeof window.renderScreen === "function") window.renderScreen("community");
      });
    }
    if (!hasCommunitySession()) {
      return `
        <section class="community-theme-banner">
          <p class="eyebrow">Community-submitted opportunities</p>
          <p>Sign in to Community to see and share opportunities other real members found.</p>
          <button class="secondary-action compact-action" type="button" data-tab-jump="community">Go to Community</button>
        </section>
      `;
    }
    const blockedOpportunitySubmitters = blockedCommunityUserIds();
    const visibleOpportunities = communityOpportunitiesCache.filter((item) => !blockedOpportunitySubmitters.has(item.submitted_by));
    return `
      <div class="content-rail-title"><strong>Community-submitted</strong><span>${visibleOpportunities.length} items</span></div>
      <div class="opportunity-feed">
        ${visibleOpportunities.length ? visibleOpportunities.map(communityOpportunityCard).join("") : `
          <section class="empty-feature">
            <img src="assets/icon-work.png" alt="">
            <div><strong>No community opportunities yet</strong><p>Share one below.</p></div>
          </section>
        `}
      </div>
      <button class="secondary-action compact-action" type="button" data-open="communityOpportunitySubmit">Share an opportunity</button>
    `;
  }

  function communityOpportunitySubmitModal() {
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="community-opportunity-title">
        <div class="modal-top">
          <span class="risk-pill calm">Share an opportunity</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="community-opportunity-title">Share an opportunity with Community</h3>
        <div class="admin-form">
          <label>Title<input id="community-opportunity-title" type="text" maxlength="140"></label>
          <label>Description<textarea id="community-opportunity-description" maxlength="800"></textarea></label>
          <label>Link<input id="community-opportunity-link" type="url" placeholder="https://..."></label>
          <label>Category
            <select id="community-opportunity-category">
              ${opportunityCategories.filter((category) => category !== "All").map((category) => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join("")}
            </select>
          </label>
          <label>Tags (comma separated)<input id="community-opportunity-tags" type="text" placeholder="internship, remote"></label>
          <label>Difficulty
            <select id="community-opportunity-difficulty">
              <option value="">Not specified</option>
              <option value="Beginner">Beginner</option>
              <option value="Medium">Medium</option>
              <option value="Advanced">Advanced</option>
            </select>
          </label>
          <label>Prep needed (optional)<textarea id="community-opportunity-prep" maxlength="300" placeholder="Example: a short portfolio and one writing sample"></textarea></label>
          <p class="form-error" id="community-opportunity-error" aria-live="polite"></p>
        </div>
        <button class="primary-action" type="button" data-save-community-opportunity>Share</button>
      </div>
    `;
  }

  async function submitCommunityOpportunity({ title, description, link, category, tags, difficulty, prepNeeded }) {
    const response = await fetch(`${COMMUNITY_API_BASE}/api/community-opportunity`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${communityAccessToken()}` },
      body: JSON.stringify({ title, description, link, category, tags, difficulty, prepNeeded })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not share this opportunity right now.");
    return data;
  }

  // ---------------------------------------------------------------------
  // Full authed screen
  // ---------------------------------------------------------------------

  function communityAuthedScreen() {
    if (!communityDataLoaded && !communityDataLoading) {
      refreshCommunityData().then(() => {
        if (window.activeTab === "community" && typeof window.renderScreen === "function") window.renderScreen("community");
      });
    }
    return `
      <header class="screen-head compact-head community-head">
        <div>
          <p class="eyebrow">Growth Community</p>
          <h2 class="screen-title">Find people growing in the same direction.</h2>
          <p class="screen-subtitle">Not dating. Real squads, goal groups, accountability partners, and a support wall - screened before it's posted, and every post, listing, and connection can be reported or blocked after the fact too.</p>
        </div>
        <div class="avatar"><img src="assets/icon-support.png" alt=""></div>
      </header>

      <section class="community-hero-card">
        <div>
          <p class="eyebrow">Connected growth</p>
          <h3>Future choices are easier when support is nearby.</h3>
          <p>Use Community to discuss goals, ask for encouragement, find accountability, and stay realistic.</p>
        </div>
        <div class="community-stat-row">
          <span><strong>${communitySquadsCache.length}</strong>Squads</span>
          <span><strong>${communityPostsCache.filter((post) => post.status === "published").length}</strong>Posts</span>
          <span><strong>${Math.round((communityMyProfile && communityMyProfile.community_trust_snapshot) || 0)}</strong>Your trust</span>
        </div>
        <div class="profile-actions">
          <button class="secondary-action compact-action" type="button" data-open="communityMembersBlocked">Blocked members</button>
          <button class="secondary-action compact-action" type="button" data-community-sign-out>Sign out of Community</button>
        </div>
      </section>

      ${growthPartnerCard()}

      ${communityThemeCard()}

      ${communitySuggestedSquadsRail()}

      <div class="content-rail-title"><strong>Growth squads</strong><span>Goal groups</span></div>
      <button class="secondary-action compact-action" type="button" data-open="communityCreateSquad">Create a squad</button>
      <div class="community-grid">${communityCards()}</div>

      ${accountabilityMatchCard()}

      <section class="accountability-match-card">
        <p class="eyebrow">Been There</p>
        <h3>Anonymous, one-time encouragement - no ongoing relationship.</h3>
        <p class="muted">Lighter than an accountability partner. Send one honest message to a stranger stuck where you once were, or opt in to be that stranger for someone else.</p>
        <button class="primary-action compact-action" type="button" data-open="communityEncouragement">Open Been There${communityEncouragementsCache.filter((row) => !row.read_at).length ? ` (${communityEncouragementsCache.filter((row) => !row.read_at).length} new)` : ""}</button>
      </section>

      ${communitySkillExchangeSection()}

      ${communityMentorSection()}

      ${communityWall()}
    `;
  }

  window.refreshCommunityData = refreshCommunityData;
  window.communityAuthGateScreen = communityAuthGateScreen;
  window.communityAuthedScreen = communityAuthedScreen;
  window.communityCards = communityCards;
  window.communityWall = communityWall;
  window.communityGroupModal = communityGroupModal;
  window.communityPostModal = communityPostModal;
  window.communityCreateSquadModal = communityCreateSquadModal;
  window.communityAccountabilityRequestModal = communityAccountabilityRequestModal;
  window.communityOpportunitiesRail = communityOpportunitiesRail;
  window.communityOpportunitySubmitModal = communityOpportunitySubmitModal;
  window.currentCommunityWeekTheme = currentCommunityWeekTheme;
  window.submitCommunityPost = submitCommunityPost;
  window.submitCommunityOpportunity = submitCommunityOpportunity;
  window.joinSquad = joinSquad;
  window.leaveSquad = leaveSquad;
  window.createSquad = createSquad;
  window.saveAccountabilityOptIn = saveAccountabilityOptIn;
  window.requestAccountabilityConnection = requestAccountabilityConnection;
  window.respondAccountabilityConnection = respondAccountabilityConnection;
  window.saveAccountabilityContactHint = saveAccountabilityContactHint;
  window.myAccountabilityOptIn = myAccountabilityOptIn;
  window.communityMentorSection = communityMentorSection;
  window.communityMentorApplyModal = communityMentorApplyModal;
  window.submitMentorApplication = submitMentorApplication;
  window.communitySkillExchangeSection = communitySkillExchangeSection;
  window.communityAddSkillTagModal = communityAddSkillTagModal;
  window.submitSkillTag = submitSkillTag;
  window.deleteSkillTag = deleteSkillTag;
  window.getSkillExchangeBrowseType = () => skillExchangeBrowseType;
  window.setSkillExchangeBrowseType = (type) => { skillExchangeBrowseType = type === "needed" ? "needed" : "offered"; };
  window.getSkillExchangeFilterCategory = () => skillExchangeFilterCategory;
  window.setSkillExchangeFilterCategory = (category) => { skillExchangeFilterCategory = category || ""; };
  window.communityMyProfileSnapshot = () => communityMyProfile;
  window.communityPostsCacheSnapshot = () => communityPostsCache;
  window.communitySquadMembersCacheSnapshot = () => communitySquadMembersCache;
  window.communityAccountabilityConnectionsSnapshot = () => communityAccountabilityConnectionsCache;
  window.communitySquadsCacheSnapshot = () => communitySquadsCache;
  window.communityOpportunitiesCacheSnapshot = () => communityOpportunitiesCache;
  window.communitySkillTagsCacheSnapshot = () => communitySkillTagsCache;
  window.communityProfilesCacheSnapshot = () => communityProfilesCache;
  window.communityMyMentorApplicationsSnapshot = () => communityMyMentorApplicationsCache;

  window.getCommunityAuthMode = () => communityAuthMode;
  window.setCommunityAuthMode = (mode) => { communityAuthMode = mode; };
  window.getCommunityAuthError = () => communityAuthError;
  window.setCommunityAuthError = (message) => { communityAuthError = message; };
  window.getCommunityAuthBusy = () => communityAuthBusy;
  window.setCommunityAuthBusy = (busy) => { communityAuthBusy = busy; };
  window.getPendingMilestoneShare = () => pendingMilestoneShare;
  window.setPendingMilestoneShare = (value) => { pendingMilestoneShare = value; };
})();
