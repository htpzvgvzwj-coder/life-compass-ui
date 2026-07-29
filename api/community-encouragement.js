// Privileged Community "been-there" encouragement endpoint. Handles both
// directions so real anonymity is enforced server-side, not just hidden in
// the UI:
//   POST -> send a one-time anonymous encouragement. The sender never picks
//     a specific recipient - one is chosen at random, server-side, from
//     community_been_there_optins for the given category (excluding the
//     sender), so a sender can never browse or target a specific person.
//     Message text goes through the same AI safety check as posts/skill_tags
//     before a service-role insert (community_encouragements has no
//     client-reachable INSERT policy at all).
//   GET  -> fetch encouragements the caller has received. sender_id is
//     stripped from the response here, before it ever reaches the
//     recipient's browser - community_encouragements has no SELECT policy
//     at all (see docs/community-schema.sql), so this is the only way to
//     read a received message, even for its own recipient.

function readSecret(key) {
  const value = String(process.env[key] || "").trim();
  const lower = value.toLowerCase();
  if (!value || lower.includes("your_") || lower.includes("_here") || lower.includes("sk-your")) return "";
  return value;
}

const provider = (process.env.COMPASS_AI_PROVIDER || "groq").trim().toLowerCase();
const groqApiKey = readSecret("GROQ_API_KEY");
const groqModel = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const geminiApiKey = readSecret("GEMINI_API_KEY");
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const openaiApiKey = readSecret("OPENAI_API_KEY");
const openaiModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const CATEGORIES = ["independence", "money", "communication", "career", "wellness", "relationships"];

const MODERATION_SYSTEM_PROMPT = "You are a safety classifier for a youth self-growth app called Compass. Given a single anonymous encouragement message one member is sending to a stranger who opted in as currently struggling with the same topic, decide if it is safe to deliver. Block messages that: describe active self-harm or suicidal intent; contain hate speech, harassment, or sexual content; try to reveal or request identifying details like a full name plus address, a phone number, a social handle, or passwords - this message must stay anonymous on both sides; contain scam links or spam; try to arrange meeting in person or moving the conversation elsewhere. Do NOT block messages that are simply warm, honest, encouraging, or mention the sender's own past struggle in general terms - that is the point of this feature. Respond with strict JSON only, no markdown, no extra text: {\"safe\": true or false, \"reason\": \"short user-facing reason, empty string if safe\"}.";

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

function extractChatCompletionText(data) {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const message = choices[0] && choices[0].message ? choices[0].message : null;
  return message && typeof message.content === "string" ? message.content.trim() : "";
}

function extractGeminiText(data) {
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const parts = candidates[0] && candidates[0].content && Array.isArray(candidates[0].content.parts)
    ? candidates[0].content.parts
    : [];
  return parts.map((part) => part.text || "").join("").trim();
}

function extractResponseText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (typeof part.text === "string" && part.text.trim()) return part.text.trim();
    }
  }
  return "";
}

function parseModerationReply(text) {
  const match = String(text || "").match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return { safe: parsed.safe !== false, reason: String(parsed.reason || "").slice(0, 300) };
  } catch {
    return null;
  }
}

// Fails open on infra problems (missing key, network error) - Community
// must not hard-depend on an AI provider being configured. An explicit
// "unsafe" classification is what fails closed.
async function moderateText(text) {
  try {
    if (provider === "openai" && openaiApiKey) {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: openaiModel,
          input: [{ role: "system", content: MODERATION_SYSTEM_PROMPT }, { role: "user", content: text.slice(0, 2000) }],
          max_output_tokens: 200
        })
      });
      if (!response.ok) return { safe: true, reason: "" };
      const data = await response.json();
      return parseModerationReply(extractResponseText(data)) || { safe: true, reason: "" };
    }
    if (provider === "gemini" && geminiApiKey) {
      const modelPath = (geminiModel.startsWith("models/") ? geminiModel : `models/${geminiModel}`).split("/").map(encodeURIComponent).join("/");
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${encodeURIComponent(geminiApiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: MODERATION_SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: text.slice(0, 2000) }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 200 }
        })
      });
      if (!response.ok) return { safe: true, reason: "" };
      const data = await response.json();
      return parseModerationReply(extractGeminiText(data)) || { safe: true, reason: "" };
    }
    if (groqApiKey) {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: groqModel,
          messages: [{ role: "system", content: MODERATION_SYSTEM_PROMPT }, { role: "user", content: text.slice(0, 2000) }],
          temperature: 0,
          max_completion_tokens: 200
        })
      });
      if (!response.ok) return { safe: true, reason: "" };
      const data = await response.json();
      return parseModerationReply(extractChatCompletionText(data)) || { safe: true, reason: "" };
    }
    return { safe: true, reason: "" };
  } catch (error) {
    console.error("[Community] encouragement moderation call failed, failing open", error);
    return { safe: true, reason: "" };
  }
}

async function verifySupabaseUser(supabaseUrl, anonKey, accessToken) {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey }
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data && data.id ? data : null;
}

async function serviceRoleRequest(supabaseUrl, serviceRoleKey, path, init) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init && init.headers ? init.headers : {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request to ${path} failed (${response.status}): ${text.slice(0, 500)}`);
  }
  return response.status === 204 ? null : response.json();
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
  const supabaseAnonKey = readSecret("SUPABASE_ANON_KEY");
  const serviceRoleKey = readSecret("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    sendJson(res, 503, { error: "Community is not configured yet." });
    return;
  }

  const authHeader = String(req.headers.authorization || "");
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!accessToken) {
    sendJson(res, 401, { error: "Sign in to Community first." });
    return;
  }

  let user;
  try {
    user = await verifySupabaseUser(supabaseUrl, supabaseAnonKey, accessToken);
  } catch (error) {
    console.error("[Community] community-encouragement session verify failed", error);
    sendJson(res, 500, { error: "Could not verify your session right now." });
    return;
  }
  if (!user) {
    sendJson(res, 401, { error: "Your Community session has expired. Please sign in again." });
    return;
  }

  if (req.method === "GET") {
    try {
      const rows = await serviceRoleRequest(
        supabaseUrl, serviceRoleKey,
        `community_encouragements?recipient_id=eq.${user.id}&status=eq.published&select=id,category,message,read_at,created_at&order=created_at.desc&limit=30`,
        { method: "GET" }
      );
      sendJson(res, 200, { encouragements: rows || [] });
    } catch (error) {
      console.error("[Community] community-encouragement fetch failed", error);
      sendJson(res, 500, { error: "Could not load your encouragements right now." });
    }
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const category = CATEGORIES.includes(body.category) ? body.category : "";
    const message = String(body.message || "").trim();
    if (!category) {
      sendJson(res, 400, { error: "Pick a real category." });
      return;
    }
    if (message.length < 4 || message.length > 500) {
      sendJson(res, 400, { error: "Messages must be between 4 and 500 characters." });
      return;
    }

    const candidates = await serviceRoleRequest(
      supabaseUrl, serviceRoleKey,
      `community_been_there_optins?category=eq.${category}&user_id=neq.${user.id}&select=user_id`,
      { method: "GET" }
    );
    if (!candidates || !candidates.length) {
      sendJson(res, 404, { error: "Nobody has opted in for this category yet - try again later." });
      return;
    }
    const recipient = candidates[Math.floor(Math.random() * candidates.length)];

    const moderation = await moderateText(message);
    const status = moderation.safe ? "published" : "blocked";

    await serviceRoleRequest(supabaseUrl, serviceRoleKey, "community_encouragements", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        sender_id: user.id,
        recipient_id: recipient.user_id,
        category,
        message,
        status,
        moderation_reason: moderation.safe ? null : (moderation.reason || "This message needs a safer rewording before it can be delivered.")
      })
    });

    sendJson(res, 200, { status, reason: moderation.safe ? "" : "This message needs a safer rewording before it can be delivered." });
  } catch (error) {
    console.error("[Community] community-encouragement send failed", error);
    sendJson(res, 500, { error: "Could not send that encouragement right now." });
  }
};
