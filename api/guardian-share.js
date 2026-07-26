// Guardian read-only share endpoint. guardian_shares has NO Supabase RLS
// policies at all (see docs/community-schema.sql) - every read and write
// goes through this function using the service-role key, because there is
// no Supabase Auth session to scope RLS against (Life Roadmap doesn't
// require a Community account). Authorization here is by possession of a
// secret string instead of an auth.uid():
//   - token: the "view" credential, embedded in the link the guardian opens.
//   - manageSecret: the "revoke/update" credential, kept only in the sharing
//     user's own browser (trackerState.guardianShare), never returned by GET.

function readSecret(key) {
  const value = String(process.env[key] || "").trim();
  const lower = value.toLowerCase();
  if (!value || lower.includes("your_") || lower.includes("_here") || lower.includes("sk-your")) return "";
  return value;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 200000) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function randomToken(bytes) {
  const crypto = require("crypto");
  return crypto.randomBytes(bytes).toString("base64url");
}

async function supabaseRequest(supabaseUrl, serviceRoleKey, path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request to ${path} failed (${response.status}): ${text.slice(0, 500)}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function sanitizeGoals(goals) {
  if (!Array.isArray(goals)) return [];
  return goals.slice(0, 30).map((goal) => ({
    title: String(goal.title || "").slice(0, 160),
    milestones: Array.isArray(goal.milestones) ? goal.milestones.slice(0, 24).map((milestone) => ({
      title: String(milestone.title || "").slice(0, 200),
      status: ["done", "in-progress"].includes(milestone.status) ? milestone.status : "pending"
    })) : []
  }));
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.end();
    return;
  }

  const supabaseUrl = readSecret("SUPABASE_URL");
  const serviceRoleKey = readSecret("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    sendJson(res, 503, { error: "Guardian sharing is not configured yet." });
    return;
  }

  if (req.method === "GET") {
    const requestUrl = new URL(req.url, "http://localhost");
    const token = String(requestUrl.searchParams.get("token") || "").trim();
    if (!token) {
      sendJson(res, 400, { error: "Missing token." });
      return;
    }
    try {
      const rows = await supabaseRequest(supabaseUrl, serviceRoleKey, `guardian_shares?token=eq.${encodeURIComponent(token)}&select=goals,include_personal_blueprint,include_chat_history,include_cost_of_living,personal_blueprint,chat_history,cost_of_living,updated_at`);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) {
        sendJson(res, 404, { error: "This share link is no longer active." });
        return;
      }
      sendJson(res, 200, {
        goals: row.goals || [],
        personalBlueprint: row.include_personal_blueprint ? row.personal_blueprint : null,
        chatHistory: row.include_chat_history ? row.chat_history : null,
        costOfLiving: row.include_cost_of_living ? row.cost_of_living : null,
        updatedAt: row.updated_at
      });
    } catch (error) {
      console.error("[GuardianShare] read failed", error);
      sendJson(res, 500, { error: "Could not load this share right now." });
    }
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const action = body.action === "revoke" ? "revoke" : "publish";

    if (action === "revoke") {
      const token = String(body.token || "").trim();
      const manageSecret = String(body.manageSecret || "").trim();
      if (!token || !manageSecret) {
        sendJson(res, 400, { error: "Missing token or manage secret." });
        return;
      }
      const rows = await supabaseRequest(supabaseUrl, serviceRoleKey, `guardian_shares?token=eq.${encodeURIComponent(token)}&select=manage_secret`);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row || row.manage_secret !== manageSecret) {
        sendJson(res, 403, { error: "That link can't be managed from here." });
        return;
      }
      await supabaseRequest(supabaseUrl, serviceRoleKey, `guardian_shares?token=eq.${encodeURIComponent(token)}`, { method: "DELETE" });
      sendJson(res, 200, { revoked: true });
      return;
    }

    // action === "publish": create a fresh token+secret, or update an
    // existing row if the caller proves ownership with the matching secret.
    const localUserId = String(body.localUserId || "").trim().slice(0, 200);
    if (!localUserId) {
      sendJson(res, 400, { error: "Missing local user id." });
      return;
    }
    const goals = sanitizeGoals(body.goals);
    const includePersonalBlueprint = body.includePersonalBlueprint === true;
    const includeChatHistory = body.includeChatHistory === true;
    const includeCostOfLiving = body.includeCostOfLiving === true;

    const row = {
      local_user_id: localUserId,
      goals,
      include_personal_blueprint: includePersonalBlueprint,
      include_chat_history: includeChatHistory,
      include_cost_of_living: includeCostOfLiving,
      personal_blueprint: includePersonalBlueprint ? (body.personalBlueprint || null) : null,
      chat_history: includeChatHistory ? (Array.isArray(body.chatHistory) ? body.chatHistory.slice(-40) : null) : null,
      cost_of_living: includeCostOfLiving ? (body.costOfLiving || null) : null,
      updated_at: new Date().toISOString()
    };

    const existingToken = String(body.token || "").trim();
    const existingManageSecret = String(body.manageSecret || "").trim();

    if (existingToken && existingManageSecret) {
      const rows = await supabaseRequest(supabaseUrl, serviceRoleKey, `guardian_shares?token=eq.${encodeURIComponent(existingToken)}&select=manage_secret`);
      const existing = Array.isArray(rows) ? rows[0] : null;
      if (!existing || existing.manage_secret !== existingManageSecret) {
        sendJson(res, 403, { error: "That link can't be managed from here." });
        return;
      }
      await supabaseRequest(supabaseUrl, serviceRoleKey, `guardian_shares?token=eq.${encodeURIComponent(existingToken)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(row)
      });
      sendJson(res, 200, { token: existingToken });
      return;
    }

    const token = randomToken(24);
    const manageSecret = randomToken(24);
    await supabaseRequest(supabaseUrl, serviceRoleKey, "guardian_shares", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ ...row, token, manage_secret: manageSecret, created_at: new Date().toISOString() })
    });
    sendJson(res, 200, { token, manageSecret });
  } catch (error) {
    console.error("[GuardianShare] publish/revoke failed", error);
    sendJson(res, 500, { error: "Could not save that share right now." });
  }
};
