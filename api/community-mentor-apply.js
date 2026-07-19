// Privileged Community mentor-application endpoint. This is the ONLY way a
// row can land in the `mentor_applications` table - the Postgres RLS policy
// for that table grants no client-reachable INSERT at all (see
// docs/community-schema.sql), so a user calling
// supabase.from('mentor_applications').insert(...) directly is rejected at
// the database level. This function verifies the caller's Supabase session,
// runs an AI safety check (a public mentor bio is higher-stakes than a
// private accountability intro message, so it gets the same moderation
// posts/opportunities get), and inserts using the service-role key.
//
// This endpoint only ever creates a *pending application*. Nothing here ever
// writes to `mentor_profiles` - promoting an approved application into the
// live mentor roster is a manual step the app owner does directly in the
// Supabase SQL editor after actually reading the application, since this app
// has no admin panel and no way to do genuine identity/background vetting.

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

const MODERATION_SYSTEM_PROMPT = "You are a safety classifier for mentor applications on a youth self-growth app called Compass. Given a single applicant bio, decide if it is safe to queue for human review. Block bios that: describe active self-harm, suicidal intent, or in-progress abuse; contain hate speech, harassment, or sexual content involving minors; share identifying details like a full name plus address, a school name plus schedule, a phone number, or passwords; contain scam links, spam, or solicitation for money/payment; make explicit claims to be a licensed professional (doctor, therapist, lawyer) that cannot be verified here. Do NOT block bios that simply describe someone's own past struggles or experience they want to mentor others through - that is the point of this feature. Respond with strict JSON only, no markdown, no extra text: {\"safe\": true or false, \"reason\": \"short user-facing reason, empty string if safe\"}.";

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100000) {
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

// Moderation failures (missing keys, network errors, unparsable replies) fail
// OPEN - mentor applications must not hard-depend on an AI provider being
// configured. An explicit "unsafe" classification is what fails closed, and
// every application (safe or not) still requires the owner's manual review
// before it can ever become a live mentor_profiles row.
async function moderateText(text) {
  try {
    if (provider === "openai" && openaiApiKey) {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: openaiModel,
          input: [{ role: "system", content: MODERATION_SYSTEM_PROMPT }, { role: "user", content: text.slice(0, 2500) }],
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
          contents: [{ role: "user", parts: [{ text: text.slice(0, 2500) }] }],
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
          messages: [{ role: "system", content: MODERATION_SYSTEM_PROMPT }, { role: "user", content: text.slice(0, 2500) }],
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
    console.error("[Community] mentor application moderation call failed, failing open", error);
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

async function insertRow(supabaseUrl, serviceRoleKey, table, row) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(row)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase insert into ${table} failed (${response.status}): ${text.slice(0, 500)}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
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
    sendJson(res, 401, { error: "Sign in to Community to apply." });
    return;
  }

  try {
    const user = await verifySupabaseUser(supabaseUrl, supabaseAnonKey, accessToken);
    if (!user) {
      sendJson(res, 401, { error: "Your Community session has expired. Please sign in again." });
      return;
    }

    const body = await readJsonBody(req);
    const bio = String(body.bio || "").trim();
    if (bio.length < 40 || bio.length > 600) {
      sendJson(res, 400, { error: "Your mentor bio should be between 40 and 600 characters." });
      return;
    }
    const focusTags = Array.isArray(body.focusTags)
      ? body.focusTags.map((tag) => String(tag || "").trim().toLowerCase()).filter(Boolean).slice(0, 6)
      : [];

    const moderation = await moderateText(bio);
    const status = moderation.safe ? "pending" : "blocked";

    const row = await insertRow(supabaseUrl, serviceRoleKey, "mentor_applications", {
      user_id: user.id,
      bio,
      focus_tags: focusTags,
      status,
      moderation_reason: moderation.safe ? null : (moderation.reason || "This bio needs a safer rewording before it can be reviewed.")
    });

    sendJson(res, 200, { application: row, status, reason: moderation.safe ? "" : row.moderation_reason });
  } catch (error) {
    console.error("[Community] community-mentor-apply failed", error);
    sendJson(res, 500, { error: "Could not submit your mentor application right now." });
  }
};
