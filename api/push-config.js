// Exposes the VAPID public key so the client can call
// PushManager.subscribe({ applicationServerKey: ... }) - the public key is
// safe to expose (that's the point of the public/private split), the
// private key is only ever read server-side (see api/push-send.js).

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
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const vapidPublicKey = readSecret("VAPID_PUBLIC_KEY");
  if (!vapidPublicKey) {
    sendJson(res, 503, { error: "Real push notifications are not configured yet. Set VAPID_PUBLIC_KEY." });
    return;
  }

  sendJson(res, 200, { vapidPublicKey });
};
