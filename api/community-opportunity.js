// Privileged Community opportunity-sharing endpoint. Mirrors api/community-post.js:
// the `opportunities_shared` table's RLS policy grants no client-reachable
// INSERT, so this function (verify session -> AI safety check -> service-role
// insert) is the only path a submission can take to become visible to others.

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

const MODERATION_SYSTEM_PROMPT = "You are a safety classifier for a youth self-growth app's crowdsourced opportunity board (internships, scholarships, volunteering, small jobs). Given a single submission's title and description, decide if it is safe to publish. Block submissions that: are scams, MLM/pyramid schemes, or ask for money/fees upfront; contain hate speech or sexual content; share personal identifying details like a home address or phone number that don't belong on a public listing; point to clearly malicious or unrelated links. Do NOT block ordinary legitimate opportunity listings, even informal ones (e.g. a local shop hiring, a small tutoring gig). Respond with strict JSON only, no markdown, no extra text: {\"safe\": true or false, \"reason\": \"short user-facing reason, empty string if safe\"}.";

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

// Fails OPEN on any technical failure (missing keys, network error, unparsable
// reply) - the opportunity board must not hard-depend on an AI provider being
// configured. An explicit "unsafe" classification is what fails closed.
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
    console.error("[Community] opportunity moderation call failed, failing open", error);
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
    sendJson(res, 401, { error: "Sign in to Community to share an opportunity." });
    return;
  }

  try {
    const user = await verifySupabaseUser(supabaseUrl, supabaseAnonKey, accessToken);
    if (!user) {
      sendJson(res, 401, { error: "Your Community session has expired. Please sign in again." });
      return;
    }

    const body = await readJsonBody(req);
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const link = String(body.link || "").trim();
    const category = String(body.category || "").trim();
    if (!title || title.length > 140) {
      sendJson(res, 400, { error: "Title must be 1-140 characters." });
      return;
    }
    if (!description || description.length > 800) {
      sendJson(res, 400, { error: "Description must be 1-800 characters." });
      return;
    }
    if (!/^https?:\/\//i.test(link)) {
      sendJson(res, 400, { error: "Link must be a valid http(s) URL." });
      return;
    }
    if (!category) {
      sendJson(res, 400, { error: "Category is required." });
      return;
    }

    const moderation = await moderateText(`${title}\n\n${description}\n\n${link}`);
    const status = moderation.safe ? "published" : "blocked";
    const tags = Array.isArray(body.tags) ? body.tags.map((tag) => String(tag).slice(0, 30)).slice(0, 8) : [];

    const row = await insertRow(supabaseUrl, serviceRoleKey, "opportunities_shared", {
      submitted_by: user.id,
      title,
      description,
      link,
      tags,
      category,
      status,
      moderation_reason: moderation.safe ? null : (moderation.reason || "This submission needs a safer rewording before it can be shared.")
    });

    sendJson(res, 200, { opportunity: row, status, reason: moderation.safe ? "" : row.moderation_reason });
  } catch (error) {
    console.error("[Community] community-opportunity failed", error);
    sendJson(res, 500, { error: "Could not share this opportunity right now." });
  }
};
