const provider = (process.env.COMPASS_AI_PROVIDER || "groq").trim().toLowerCase();
const groqApiKey = readSecret("GROQ_API_KEY");
const groqModel = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const geminiApiKey = readSecret("GEMINI_API_KEY");
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const openaiApiKey = readSecret("OPENAI_API_KEY");
const openaiModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";

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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

function extractResponseText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (typeof part.text === "string" && part.text.trim()) return part.text.trim();
      if (typeof part.output_text === "string" && part.output_text.trim()) return part.output_text.trim();
    }
  }
  return "";
}

function extractGeminiText(data) {
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const parts = candidates[0] && candidates[0].content && Array.isArray(candidates[0].content.parts)
    ? candidates[0].content.parts
    : [];
  return parts.map((part) => part.text || "").join("").trim();
}

function extractChatCompletionText(data) {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const message = choices[0] && choices[0].message ? choices[0].message : null;
  return message && typeof message.content === "string" ? message.content.trim() : "";
}

function buildChatMessages(systemPrompt, messages, context) {
  return [
    {
      role: "system",
      content: `${systemPrompt}\n\nMemory rules: Do not invent the user's mood, goals, name, personality, school status, or past messages. Only use facts found in the current chat messages, savedUserProfile, or uploadedDocumentChunks. If savedUserProfile has empty fields, ignore them. If you use uploadedDocumentChunks to answer, say "Based on your uploaded document..." before the document-based part. If the document chunks do not contain the answer, say you cannot find that in the uploaded document and ask for the missing detail.\n\nSafety: If the user describes immediate danger, self-harm, abuse, or emergency risk, respond calmly, encourage contacting trusted people and local emergency support, and do not pretend to be emergency services or a therapist.\n\nContext JSON: ${context}`,
    },
    ...messages.slice(-18).map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: String(message.content || "").slice(0, 2500),
    })),
  ];
}

function normalizedGeminiModelPath(model) {
  const modelPath = model.startsWith("models/") ? model : `models/${model}`;
  return modelPath.split("/").map(encodeURIComponent).join("/");
}

function buildGeminiContents(messages) {
  const cleaned = messages.slice(-18).map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: String(message.content || "").slice(0, 2500) }],
  }));
  return cleaned.length ? cleaned : [{ role: "user", parts: [{ text: "Hello" }] }];
}

async function callGemini({ systemPrompt, messages, context }) {
  if (!geminiApiKey) {
    console.error("[Compass AI] GEMINI_API_KEY is missing in Vercel environment variables.");
    return { status: 503, payload: { error: "GEMINI_API_KEY is not configured." } };
  }

  const modelPath = normalizedGeminiModelPath(geminiModel);
  const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${encodeURIComponent(geminiApiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{
          text: `${systemPrompt}\n\nMemory rules: Do not invent the user's mood, goals, name, personality, school status, or past messages. Only use facts found in the current chat messages, savedUserProfile, or uploadedDocumentChunks. If savedUserProfile has empty fields, ignore them. If you use uploadedDocumentChunks to answer, say "Based on your uploaded document..." before the document-based part. If the document chunks do not contain the answer, say you cannot find that in the uploaded document and ask for the missing detail.\n\nSafety: If the user describes immediate danger, self-harm, abuse, or emergency risk, respond calmly, encourage contacting trusted people and local emergency support, and do not pretend to be emergency services or a therapist.\n\nContext JSON: ${context}`,
        }],
      },
      contents: buildGeminiContents(messages),
      generationConfig: {
        temperature: 0.75,
        topP: 0.9,
        maxOutputTokens: 650,
      },
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    console.error("[Compass AI] Gemini API error", apiResponse.status, errorText);
    return { status: 502, payload: { error: "Gemini provider failed.", detail: errorText.slice(0, 700) } };
  }

  const data = await apiResponse.json();
  const reply = extractGeminiText(data);
  if (!reply) {
    console.error("[Compass AI] Gemini returned an empty response", JSON.stringify(data).slice(0, 1200));
    return { status: 502, payload: { error: "Gemini provider returned an empty response." } };
  }
  return { status: 200, payload: { reply, provider: "gemini", model: geminiModel } };
}

async function callGroq({ systemPrompt, messages, context }) {
  if (!groqApiKey) {
    console.error("[Compass AI] GROQ_API_KEY is missing in Vercel environment variables.");
    return { status: 503, payload: { error: "GROQ_API_KEY is not configured." } };
  }

  const apiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: groqModel,
      messages: buildChatMessages(systemPrompt, messages, context),
      temperature: 0.75,
      top_p: 0.9,
      max_completion_tokens: 650,
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    console.error("[Compass AI] Groq API error", apiResponse.status, errorText);
    return { status: 502, payload: { error: "Groq provider failed.", detail: errorText.slice(0, 700) } };
  }

  const data = await apiResponse.json();
  const reply = extractChatCompletionText(data);
  if (!reply) {
    console.error("[Compass AI] Groq returned an empty response", JSON.stringify(data).slice(0, 1200));
    return { status: 502, payload: { error: "Groq provider returned an empty response." } };
  }
  return { status: 200, payload: { reply, provider: "groq", model: groqModel } };
}

async function callOpenAI({ systemPrompt, messages, context }) {
  if (!openaiApiKey) {
    console.error("[Compass AI] OPENAI_API_KEY is missing in Vercel environment variables.");
    return { status: 503, payload: { error: "OPENAI_API_KEY is not configured." } };
  }

  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openaiModel,
      input: buildChatMessages(systemPrompt, messages, context),
      max_output_tokens: 650,
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    console.error("[Compass AI] OpenAI API error", apiResponse.status, errorText);
    return { status: 502, payload: { error: "OpenAI provider failed.", detail: errorText.slice(0, 700) } };
  }

  const data = await apiResponse.json();
  const reply = extractResponseText(data);
  if (!reply) {
    console.error("[Compass AI] OpenAI returned an empty response", JSON.stringify(data).slice(0, 1200));
    return { status: 502, payload: { error: "OpenAI provider returned an empty response." } };
  }
  return { status: 200, payload: { reply, provider: "openai", model: openaiModel } };
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

  try {
    const body = await readJsonBody(req);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const systemPrompt = String(body.systemPrompt || "").slice(0, 1600);
    const context = body.context ? JSON.stringify(body.context).slice(0, 8000) : "{}";

    let result;
    if (provider === "openai") {
      result = await callOpenAI({ systemPrompt, messages, context });
    } else if (provider === "gemini") {
      result = await callGemini({ systemPrompt, messages, context });
    } else {
      result = await callGroq({ systemPrompt, messages, context });
    }
    sendJson(res, result.status, result.payload);
  } catch (error) {
    console.error("[Compass AI] Vercel route failed", error);
    sendJson(res, 500, { error: "Compass chat failed." });
  }
};
