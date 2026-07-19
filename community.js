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
  let communityMyProfile = null;
  let communityDataLoading = false;
  let communityDataLoaded = false;
  let communityDataError = "";

  let communityAuthMode = "sign-in";
  let communityAuthBusy = false;
  let communityAuthError = "";

  let pendingMilestoneShare = null;

  function communityProfilesById() {
    const map = new Map();
    communityProfilesCache.forEach((profile) => map.set(profile.id, profile));
    return map;
  }

  function communityProfileFor(userId) {
    return communityProfilesById().get(userId) || null;
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
      const [squads, squadMembers, posts, opportunities, profiles, optIns, connections, mentorProfiles, mentorApplications] = await Promise.all([
        fetchCommunityTable("squads", (q) => q.order("is_seeded", { ascending: false }).order("created_at", { ascending: true })),
        fetchCommunityTable("squad_members"),
        fetchCommunityTable("posts", (q) => q.order("created_at", { ascending: false }).limit(60)),
        fetchCommunityTable("opportunities_shared", (q) => q.order("created_at", { ascending: false }).limit(40)),
        fetchCommunityTable("profiles"),
        fetchCommunityTable("accountability_optins"),
        fetchCommunityTable("accountability_connections"),
        fetchCommunityTable("mentor_profiles"),
        fetchCommunityTable("mentor_applications")
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
      communityMyProfile = profiles.find((profile) => profile.id === communityUserId()) || null;
      communityDataLoaded = true;
      communityDataError = "";
      if (typeof checkCommunityAchievements === "function") checkCommunityAchievements();
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
    return `
      <article class="${post.status === "pending" ? "is-pending" : ""}">
        <strong>${escapeHTML(author ? author.username : "Member")}${author ? ` - trust ${Math.round(author.community_trust_snapshot || 0)}` : ""}</strong>
        <p>${escapeHTML(post.body)}</p>
        <small>
          ${squad ? `${escapeHTML(squad.title)} - ` : ""}${formatCommunityTime(post.created_at)}
          ${post.post_type === "milestone" ? `<span class="risk-pill calm">Milestone</span>` : ""}
          ${post.status === "pending" ? `<span class="risk-pill calm">Checking...</span>` : ""}
        </small>
      </article>
    `;
  }

  function communityWall() {
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
          ${communityPostsCache.length ? communityPostsCache.map(communityWallPostCard).join("") : `
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

  function suggestedAccountabilityPartners() {
    const mine = myAccountabilityOptIn();
    if (!mine) return [];
    const myId = communityUserId();
    const connectedIds = new Set(myAccountabilityConnections().map((entry) => (entry.requester_id === myId ? entry.recipient_id : entry.requester_id)));
    return communityAccountabilityOptInsCache
      .filter((entry) => entry.user_id !== myId && !connectedIds.has(entry.user_id) && entry.roadmap_stage === mine.roadmap_stage)
      .map((entry) => ({ entry, score: CommunityMatching.scoreTagOverlap(mine.goal_tags || [], entry.goal_tags || []) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.entry);
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
    const pool = communityMentorProfilesCache.filter((entry) => entry.user_id !== myId);
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
              <button class="primary-action compact-action" type="button" data-open="communityAccountabilityRequest" data-open-payload="${escapeHTML(mentor.user_id)}">Request to connect</button>
            </article>
          `).join("")}
        ` : `<p class="muted">No mentors yet - check back soon.</p>`}
        ${myApplication ? `
          <p class="muted">${myApplication.status === "pending" ? "Your mentor application is pending review."
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
        <p class="muted">Tell us about your own experience and what you'd want to help with. Applications are reviewed by the Compass team before a mentor profile goes live - this isn't instant.</p>
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
  // Crowdsourced opportunities (idea 10)
  // ---------------------------------------------------------------------

  function communityOpportunityCard(item) {
    return `
      <article class="opportunity-card">
        <div class="opportunity-card-top">
          <span class="category-badge">${escapeHTML(item.category)}</span>
          <span class="opportunity-type">Community-submitted</span>
        </div>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description)}</p>
        <div class="profile-actions">
          <button class="primary-action compact-action" type="button" data-open-link="${escapeHTML(item.link)}">View</button>
        </div>
      </article>
    `;
  }

  function communityOpportunitiesRail() {
    if (hasCommunitySession() && !communityDataLoaded && !communityDataLoading) {
      refreshCommunityData().then(() => {
        if (window.activeTab === "opportunities" && typeof window.renderScreen === "function") window.renderScreen("opportunities");
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
    return `
      <div class="content-rail-title"><strong>Community-submitted</strong><span>${communityOpportunitiesCache.length} items</span></div>
      <div class="opportunity-feed">
        ${communityOpportunitiesCache.length ? communityOpportunitiesCache.map(communityOpportunityCard).join("") : `
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
          <p class="form-error" id="community-opportunity-error" aria-live="polite"></p>
        </div>
        <button class="primary-action" type="button" data-save-community-opportunity>Share</button>
      </div>
    `;
  }

  async function submitCommunityOpportunity({ title, description, link, category, tags }) {
    const response = await fetch(`${COMMUNITY_API_BASE}/api/community-opportunity`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${communityAccessToken()}` },
      body: JSON.stringify({ title, description, link, category, tags })
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
          <p class="screen-subtitle">Not dating. Real squads, goal groups, accountability partners, and a moderated support wall.</p>
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
        <button class="secondary-action compact-action" type="button" data-community-sign-out>Sign out of Community</button>
      </section>

      ${growthPartnerCard()}

      ${communityThemeCard()}

      ${communitySuggestedSquadsRail()}

      <div class="content-rail-title"><strong>Growth squads</strong><span>Goal groups</span></div>
      <button class="secondary-action compact-action" type="button" data-open="communityCreateSquad">Create a squad</button>
      <div class="community-grid">${communityCards()}</div>

      ${accountabilityMatchCard()}

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
  window.communityMyProfileSnapshot = () => communityMyProfile;
  window.communityPostsCacheSnapshot = () => communityPostsCache;
  window.communitySquadMembersCacheSnapshot = () => communitySquadMembersCache;
  window.communityAccountabilityConnectionsSnapshot = () => communityAccountabilityConnectionsCache;

  window.getCommunityAuthMode = () => communityAuthMode;
  window.setCommunityAuthMode = (mode) => { communityAuthMode = mode; };
  window.getCommunityAuthError = () => communityAuthError;
  window.setCommunityAuthError = (message) => { communityAuthError = message; };
  window.getCommunityAuthBusy = () => communityAuthBusy;
  window.setCommunityAuthBusy = (busy) => { communityAuthBusy = busy; };
  window.getPendingMilestoneShare = () => pendingMilestoneShare;
  window.setPendingMilestoneShare = (value) => { pendingMilestoneShare = value; };
})();
