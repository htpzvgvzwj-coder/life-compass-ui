(function () {
  // Session/init layer for the Community tab's real backend. This is the
  // ONLY part of the app that talks to Supabase - every other tab keeps
  // using the existing local demo profile (currentUserId()) untouched.
  const COMMUNITY_API_BASE = window.location.protocol === "file:" ? "http://localhost:5179" : "";

  let communityConfig = null;
  let communityConfigError = "";
  let communityConfigPromise = null;
  let communitySupabaseClient = null;
  let communitySession = null;

  function fetchCommunityConfig() {
    if (communityConfigPromise) return communityConfigPromise;
    communityConfigPromise = fetch(`${COMMUNITY_API_BASE}/api/community-config`)
      .then((response) => {
        if (!response.ok) throw new Error(`Community config request failed (${response.status}).`);
        return response.json();
      })
      .then((config) => {
        communityConfig = config;
        return config;
      })
      .catch((error) => {
        communityConfigError = "Community isn't set up yet. Try again later.";
        console.error("[Community] config fetch failed", error);
        return null;
      });
    return communityConfigPromise;
  }

  async function initCommunitySupabase() {
    if (communitySupabaseClient) return communitySupabaseClient;
    const config = await fetchCommunityConfig();
    if (!config || !config.supabaseUrl || !config.supabaseAnonKey) return null;
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      communityConfigError = "Community sign-in library failed to load.";
      return null;
    }
    communitySupabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { data } = await communitySupabaseClient.auth.getSession();
    communitySession = data ? data.session : null;
    communitySupabaseClient.auth.onAuthStateChange((_event, session) => {
      communitySession = session;
      if (window.activeTab === "community" && typeof window.renderScreen === "function") {
        window.renderScreen("community");
      }
    });
    return communitySupabaseClient;
  }

  function getCommunitySupabaseClient() {
    return communitySupabaseClient;
  }

  function hasCommunitySession() {
    return Boolean(communitySession && communitySession.user);
  }

  function communityUserId() {
    return communitySession && communitySession.user ? communitySession.user.id : null;
  }

  function communityAccessToken() {
    return communitySession ? communitySession.access_token : null;
  }

  function communityConfigErrorMessage() {
    return communityConfigError;
  }

  // Only creates a profiles row the first time - safe to call on every
  // sign-in, and deliberately skipped at sign-up when email confirmation is
  // required (no session yet, an unauthenticated insert would just be
  // rejected by RLS) so it runs on the user's first real sign-in instead.
  async function ensureCommunityProfile(client, user, fallbackUsername) {
    const { data: existing } = await client.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (existing) return;
    const localUserId = typeof window.currentUserId === "function" ? window.currentUserId() : null;
    await client.from("profiles").insert({
      id: user.id,
      username: String(fallbackUsername || "Member").slice(0, 24),
      local_user_id: localUserId
    });
  }

  async function communitySignUp(email, password, username) {
    const client = await initCommunitySupabase();
    if (!client) throw new Error(communityConfigErrorMessage() || "Community sign-in is unavailable right now.");
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    communitySession = data.session || communitySession;
    if (data.session && data.user) {
      const fallbackName = String(email).split("@")[0] || "Member";
      await ensureCommunityProfile(client, data.user, username || fallbackName);
    }
    return data;
  }

  async function communitySignIn(email, password) {
    const client = await initCommunitySupabase();
    if (!client) throw new Error(communityConfigErrorMessage() || "Community sign-in is unavailable right now.");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    communitySession = data.session || communitySession;
    if (data.session && data.user) {
      const fallbackName = String(email).split("@")[0] || "Member";
      await ensureCommunityProfile(client, data.user, fallbackName);
    }
    return data;
  }

  async function communitySignOut() {
    const client = getCommunitySupabaseClient();
    if (!client) return;
    await client.auth.signOut();
    communitySession = null;
  }

  window.COMMUNITY_API_BASE = COMMUNITY_API_BASE;
  window.initCommunitySupabase = initCommunitySupabase;
  window.getCommunitySupabaseClient = getCommunitySupabaseClient;
  window.hasCommunitySession = hasCommunitySession;
  window.communityUserId = communityUserId;
  window.communityAccessToken = communityAccessToken;
  window.communityConfigErrorMessage = communityConfigErrorMessage;
  window.communitySignUp = communitySignUp;
  window.communitySignIn = communitySignIn;
  window.communitySignOut = communitySignOut;

  initCommunitySupabase();
})();
