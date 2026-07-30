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

// Real function-calling parsers (one per provider - each returns the same
// shape, {tool_id, message_to_user}, or null) - not a shared helper,
// because each provider's tool-call response shape genuinely differs.
// `message_to_user` is a required argument on the model's own tool call,
// not text we synthesize - see buildOpenToolSchema below for why.
function parseToolArgs(rawArgs) {
  if (!rawArgs || typeof rawArgs !== "object") return null;
  if (typeof rawArgs.tool_id === "string" && typeof rawArgs.message_to_user === "string") return rawArgs;
  return null;
}

function extractChatCompletionToolCall(data) {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const message = choices[0] && choices[0].message ? choices[0].message : null;
  const toolCalls = message && Array.isArray(message.tool_calls) ? message.tool_calls : [];
  const call = toolCalls.find((item) => item.type === "function" && item.function && item.function.name === "open_tool");
  if (!call) return null;
  try {
    return parseToolArgs(JSON.parse(call.function.arguments || "{}"));
  } catch (error) {
    return null;
  }
}

function extractResponseToolCall(data) {
  const output = Array.isArray(data.output) ? data.output : [];
  const call = output.find((item) => item.type === "function_call" && item.name === "open_tool");
  if (!call) return null;
  try {
    return parseToolArgs(JSON.parse(call.arguments || "{}"));
  } catch (error) {
    return null;
  }
}

function extractGeminiToolCall(data) {
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const parts = candidates[0] && candidates[0].content && Array.isArray(candidates[0].content.parts)
    ? candidates[0].content.parts
    : [];
  const part = parts.find((item) => item.functionCall && item.functionCall.name === "open_tool");
  return part ? parseToolArgs(part.functionCall.args || {}) : null;
}

// Single source of truth for the open_tool function's shape - each
// provider's own tools-array wrapper differs (see the three *ToolsParam
// functions), but all three are built from this one schema so they can't
// silently drift out of sync with each other.
function buildOpenToolSchema(tools) {
  if (!Array.isArray(tools) || !tools.length) return null;
  const ids = tools.map((item) => String(item.id)).filter(Boolean);
  if (!ids.length) return null;
  const descriptionLines = tools.map((item) => `- ${item.id}: ${item.description}`).join("\n");
  return {
    name: "open_tool",
    description: `Open a real feature in the Compass app when it would genuinely help the user right now - not on every message, only when a specific real tool clearly applies. Available tools:\n${descriptionLines}`,
    ids,
    messageDescription: "A short, natural, in-character message to show the user explaining what you're doing - write it the way you'd actually say it, not a system notification."
  };
}

function groqToolsParam(schema) {
  if (!schema) return undefined;
  return [{
    type: "function",
    function: {
      name: schema.name,
      description: schema.description,
      parameters: {
        type: "object",
        properties: {
          tool_id: { type: "string", enum: schema.ids },
          message_to_user: { type: "string", description: schema.messageDescription }
        },
        required: ["tool_id", "message_to_user"]
      }
    }
  }];
}

function openaiToolsParam(schema) {
  if (!schema) return undefined;
  return [{
    type: "function",
    name: schema.name,
    description: schema.description,
    parameters: {
      type: "object",
      properties: {
        tool_id: { type: "string", enum: schema.ids },
        message_to_user: { type: "string", description: schema.messageDescription }
      },
      required: ["tool_id", "message_to_user"]
    }
  }];
}

function geminiToolsParam(schema) {
  if (!schema) return undefined;
  return [{
    functionDeclarations: [{
      name: schema.name,
      description: schema.description,
      parameters: {
        type: "OBJECT",
        properties: {
          tool_id: { type: "STRING", enum: schema.ids },
          message_to_user: { type: "STRING", description: schema.messageDescription }
        },
        required: ["tool_id", "message_to_user"]
      }
    }]
  }];
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

async function callGemini({ systemPrompt, messages, context, tools }) {
  if (!geminiApiKey) {
    console.error("[Compass AI] GEMINI_API_KEY is missing in Vercel environment variables.");
    return { status: 503, payload: { error: "GEMINI_API_KEY is not configured." } };
  }

  const schema = buildOpenToolSchema(tools);
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
      ...(schema ? { tools: geminiToolsParam(schema) } : {}),
      generationConfig: {
        temperature: 0.75,
        topP: 0.9,
        maxOutputTokens: 1100,
      },
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    console.error("[Compass AI] Gemini API error", apiResponse.status, errorText);
    return { status: 502, payload: { error: "Gemini provider failed.", detail: errorText.slice(0, 700) } };
  }

  const data = await apiResponse.json();
  const toolCall = extractGeminiToolCall(data);
  const reply = extractGeminiText(data);
  if (!reply && !toolCall) {
    console.error("[Compass AI] Gemini returned an empty response", JSON.stringify(data).slice(0, 1200));
    return { status: 502, payload: { error: "Gemini provider returned an empty response." } };
  }
  return { status: 200, payload: { reply, toolCall, provider: "gemini", model: geminiModel } };
}

async function callGroq({ systemPrompt, messages, context, tools }) {
  if (!groqApiKey) {
    console.error("[Compass AI] GROQ_API_KEY is missing in Vercel environment variables.");
    return { status: 503, payload: { error: "GROQ_API_KEY is not configured." } };
  }

  const schema = buildOpenToolSchema(tools);
  const apiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: groqModel,
      messages: buildChatMessages(systemPrompt, messages, context),
      ...(schema ? { tools: groqToolsParam(schema) } : {}),
      temperature: 0.75,
      top_p: 0.9,
      max_completion_tokens: 1100,
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    console.error("[Compass AI] Groq API error", apiResponse.status, errorText);
    return { status: 502, payload: { error: "Groq provider failed.", detail: errorText.slice(0, 700) } };
  }

  const data = await apiResponse.json();
  const toolCall = extractChatCompletionToolCall(data);
  const reply = extractChatCompletionText(data);
  if (!reply && !toolCall) {
    console.error("[Compass AI] Groq returned an empty response", JSON.stringify(data).slice(0, 1200));
    return { status: 502, payload: { error: "Groq provider returned an empty response." } };
  }
  return { status: 200, payload: { reply, toolCall, provider: "groq", model: groqModel } };
}

async function callOpenAI({ systemPrompt, messages, context, tools }) {
  if (!openaiApiKey) {
    console.error("[Compass AI] OPENAI_API_KEY is missing in Vercel environment variables.");
    return { status: 503, payload: { error: "OPENAI_API_KEY is not configured." } };
  }

  const schema = buildOpenToolSchema(tools);
  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openaiModel,
      input: buildChatMessages(systemPrompt, messages, context),
      ...(schema ? { tools: openaiToolsParam(schema) } : {}),
      max_output_tokens: 1100,
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    console.error("[Compass AI] OpenAI API error", apiResponse.status, errorText);
    return { status: 502, payload: { error: "OpenAI provider failed.", detail: errorText.slice(0, 700) } };
  }

  const data = await apiResponse.json();
  const toolCall = extractResponseToolCall(data);
  const reply = extractResponseText(data);
  if (!reply && !toolCall) {
    console.error("[Compass AI] OpenAI returned an empty response", JSON.stringify(data).slice(0, 1200));
    return { status: 502, payload: { error: "OpenAI provider returned an empty response." } };
  }
  return { status: 200, payload: { reply, toolCall, provider: "openai", model: openaiModel } };
}

function providerOrder() {
  return [provider, "groq", "gemini", "openai"]
    .filter(Boolean)
    .filter((name, index, list) => list.indexOf(name) === index);
}

function providerHasKey(name) {
  if (name === "openai") return Boolean(openaiApiKey);
  if (name === "gemini") return Boolean(geminiApiKey);
  return Boolean(groqApiKey);
}

async function callProvider(name, args) {
  if (name === "openai") return callOpenAI(args);
  if (name === "gemini") return callGemini(args);
  return callGroq(args);
}

async function callConfiguredProvider(args) {
  let missingKeys = 0;
  for (const name of providerOrder()) {
    if (!providerHasKey(name)) {
      missingKeys += 1;
      console.error(`[Compass AI] ${name.toUpperCase()} API key is missing; trying next provider if available.`);
      continue;
    }
    const result = await callProvider(name, args);
    if (result.status === 200) return result;
    console.error(`[Compass AI] ${name} provider failed; trying next provider if available.`, result.payload && result.payload.error);
  }
  return {
    status: 503,
    payload: {
      error: missingKeys ? "No configured AI provider key is available." : "All configured AI providers failed."
    }
  };
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
    const tools = Array.isArray(body.tools)
      ? body.tools.slice(0, 80).map((item) => ({ id: String(item.id || "").slice(0, 60), description: String(item.description || "").slice(0, 300) })).filter((item) => item.id)
      : [];

    const result = await callConfiguredProvider({ systemPrompt, messages, context, tools });
    sendJson(res, result.status, result.payload);
  } catch (error) {
    console.error("[Compass AI] Vercel route failed", error);
    sendJson(res, 500, { error: "Compass chat failed." });
  }
};
