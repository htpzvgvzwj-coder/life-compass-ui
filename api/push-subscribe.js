// Real Web Push subscription storage. push_subscriptions has NO Supabase
// RLS policies at all (see docs/community-schema.sql) - every read/write
// goes through this function using the service-role key, same reasoning as
// api/guardian-share.js: local accounts have no Supabase Auth session to
// scope RLS against, so user_id here is whatever the client sends
// (currentUserId(), a self-chosen Gmail-format string, or a real Community
// auth.uid() when signed in) - trusted the same way every other
// local-account feature in this app already trusts it, not a new risk.

function readSecret(key) {
  const value = String(process.env[key] || "").trim();
  const lower = value.toLowerCase();
  if (!value || lower.includes("your_") || lower.includes("_here")) return "";
  return value;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20000) {
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

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const supabaseUrl = readSecret("SUPABASE_URL");
  const serviceRoleKey = readSecret("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    sendJson(res, 503, { error: "Push storage is not configured yet." });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const userId = String(body.userId || "").trim().slice(0, 200);
    if (!userId) {
      sendJson(res, 400, { error: "Missing user id." });
      return;
    }

    if (body.action === "unsubscribe") {
      const endpoint = String(body.endpoint || "").trim();
      if (!endpoint) {
        sendJson(res, 400, { error: "Missing endpoint." });
        return;
      }
      await supabaseRequest(supabaseUrl, serviceRoleKey, `push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, { method: "DELETE" });
      sendJson(res, 200, { unsubscribed: true });
      return;
    }

    const subscription = body.subscription;
    const endpoint = subscription && String(subscription.endpoint || "").trim();
    const p256dh = subscription && subscription.keys && String(subscription.keys.p256dh || "").trim();
    const authKey = subscription && subscription.keys && String(subscription.keys.auth || "").trim();
    if (!endpoint || !p256dh || !authKey) {
      sendJson(res, 400, { error: "Missing or invalid push subscription." });
      return;
    }

    // Upsert on endpoint (unique) - the same device re-subscribing (e.g.
    // after clearing the old permission) replaces its own row instead of
    // erroring on the unique constraint or piling up duplicates.
    await supabaseRequest(supabaseUrl, serviceRoleKey, "push_subscriptions?on_conflict=endpoint", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: userId, endpoint, p256dh, auth_key: authKey })
    });
    sendJson(res, 200, { subscribed: true });
  } catch (error) {
    console.error("[Push] subscribe failed", error);
    sendJson(res, 500, { error: "Could not save that subscription right now." });
  }
};
