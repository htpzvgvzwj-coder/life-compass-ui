// Sends a real Web Push notification to every subscription stored for a
// user_id. This is the delivery half only - deciding WHEN and WHAT to send
// stays 100% client-side (queueProactiveMessage()/fireProactiveNotification()
// in app.js already decide that from the user's own real local data), this
// endpoint just relays that already-decided message through a real push
// service so it can reach a closed browser, the same way
// api/community-encouragement.js relays an already-composed message rather
// than deciding anything itself.
//
// Known, disclosed limit (see push_subscriptions comment in
// docs/community-schema.sql): user_id has no real auth behind it for local
// accounts, so this endpoint trusts whatever user_id the client sends -
// same trust model as the rest of this app's local-account features, not a
// new risk. Kept a hard cap on title/body length and a max-subscriptions
// scan as a basic sanity limit, not a real rate limiter.

const webpush = require("web-push");

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
  const vapidPublicKey = readSecret("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = readSecret("VAPID_PRIVATE_KEY");
  const vapidSubject = readSecret("VAPID_SUBJECT");
  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    sendJson(res, 503, { error: "Real push notifications are not configured yet." });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const userId = String(body.userId || "").trim().slice(0, 200);
    const title = String(body.title || "Compass").trim().slice(0, 120);
    const message = String(body.body || "").trim().slice(0, 500);
    if (!userId || !message) {
      sendJson(res, 400, { error: "Missing user id or message." });
      return;
    }

    const subscriptions = await supabaseRequest(
      supabaseUrl, serviceRoleKey,
      `push_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=id,endpoint,p256dh,auth_key&limit=10`,
      { method: "GET" }
    );
    if (!subscriptions || !subscriptions.length) {
      sendJson(res, 200, { sent: 0, reason: "No push subscriptions for this user." });
      return;
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    const payload = JSON.stringify({ title, body: message });
    let sent = 0;
    const staleIds = [];
    await Promise.all(subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth_key } },
          payload
        );
        sent += 1;
      } catch (error) {
        // 404/410 means the browser's push service no longer recognizes
        // this subscription (uninstalled, permission revoked, expired) -
        // clean it up so future sends don't keep retrying a dead endpoint.
        if (error && (error.statusCode === 404 || error.statusCode === 410)) {
          staleIds.push(row.id);
        } else {
          console.error("[Push] sendNotification failed", error && error.message);
        }
      }
    }));

    if (staleIds.length) {
      await supabaseRequest(supabaseUrl, serviceRoleKey, `push_subscriptions?id=in.(${staleIds.map((id) => encodeURIComponent(id)).join(",")})`, { method: "DELETE" }).catch((error) => {
        console.error("[Push] cleanup of stale subscriptions failed", error);
      });
    }

    sendJson(res, 200, { sent, removed: staleIds.length });
  } catch (error) {
    console.error("[Push] send failed", error);
    sendJson(res, 500, { error: "Could not send that push right now." });
  }
};
