const provider = (process.env.COMPASS_AI_PROVIDER || "groq").trim().toLowerCase();
const groqApiKey = readSecret("GROQ_API_KEY");
const groqModel = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const geminiApiKey = readSecret("GEMINI_API_KEY");
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const openaiApiKey = readSecret("OPENAI_API_KEY");
const openaiModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const anthropicApiKey = readSecret("ANTHROPIC_API_KEY");
const anthropicModel = process.env.ANTHROPIC_MODEL || "claude-opus-5";

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

// Real function-calling parsers (one per provider) - not a shared helper,
// because each provider's tool-call response shape genuinely differs.
// Every provider can call one of three functions per turn (never more than
// one - keeps parsing unambiguous): open_tool (opens a real app feature),
// remember_this (writes a new lifeMemory entry from the natural flow of
// conversation), or update_memory (attaches an outcome to an EXISTING
// lifeMemory entry instead of creating an unrelated new one - Mem0/
// OpenWebUI's "update, don't just append" pattern). All three parsers
// return a discriminated {tool: "...", ...} shape, or null.
// `message_to_user` is a required argument on the model's own tool call,
// not text we synthesize - see buildToolSchemas below for why.
const REMEMBER_THIS_KINDS = ["missed_opportunity", "decision", "note"];
const LOG_MOOD_LABELS = ["Calm", "Okay", "Tired", "Stressed"];
const TOOL_NAMES = ["open_tool", "remember_this", "update_memory", "log_savings", "log_rejection", "log_mood", "log_journal", "log_contact_reached", "log_milestone_progress"];

function parseOpenToolArgs(rawArgs) {
  if (!rawArgs || typeof rawArgs !== "object") return null;
  if (typeof rawArgs.tool_id === "string" && typeof rawArgs.message_to_user === "string") {
    return { tool: "open_tool", tool_id: rawArgs.tool_id, message_to_user: rawArgs.message_to_user };
  }
  return null;
}

function parseRememberThisArgs(rawArgs) {
  if (!rawArgs || typeof rawArgs !== "object") return null;
  const { situation_tag, decision, reason, kind, related_goal, confidence, message_to_user } = rawArgs;
  if (typeof situation_tag !== "string" || !situation_tag.trim()) return null;
  if (typeof decision !== "string" || !decision.trim()) return null;
  if (typeof message_to_user !== "string" || !message_to_user.trim()) return null;
  const confidenceNum = Number(confidence);
  return {
    tool: "remember_this",
    situation_tag: situation_tag.trim().slice(0, 120),
    decision: decision.trim().slice(0, 300),
    reason: typeof reason === "string" ? reason.trim().slice(0, 300) : "",
    kind: REMEMBER_THIS_KINDS.includes(kind) ? kind : "decision",
    related_goal: typeof related_goal === "string" ? related_goal.trim().slice(0, 200) : "",
    confidence: Number.isFinite(confidenceNum) ? Math.max(0, Math.min(100, Math.round(confidenceNum))) : null,
    message_to_user: message_to_user.trim()
  };
}

function parseUpdateMemoryArgs(rawArgs) {
  if (!rawArgs || typeof rawArgs !== "object") return null;
  const { situation_tag, outcome, message_to_user } = rawArgs;
  if (typeof situation_tag !== "string" || !situation_tag.trim()) return null;
  if (typeof outcome !== "string" || !outcome.trim()) return null;
  if (typeof message_to_user !== "string" || !message_to_user.trim()) return null;
  return {
    tool: "update_memory",
    situation_tag: situation_tag.trim().slice(0, 120),
    outcome: outcome.trim().slice(0, 300),
    message_to_user: message_to_user.trim()
  };
}

function parseLogSavingsArgs(rawArgs) {
  if (!rawArgs || typeof rawArgs !== "object") return null;
  const { amount, note, message_to_user } = rawArgs;
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) return null;
  if (typeof message_to_user !== "string" || !message_to_user.trim()) return null;
  return {
    tool: "log_savings",
    amount: Math.min(amountNum, 100000),
    note: typeof note === "string" ? note.trim().slice(0, 200) : "",
    message_to_user: message_to_user.trim()
  };
}

function parseLogRejectionArgs(rawArgs) {
  if (!rawArgs || typeof rawArgs !== "object") return null;
  const { title, reason, message_to_user } = rawArgs;
  if (typeof title !== "string" || !title.trim()) return null;
  if (typeof message_to_user !== "string" || !message_to_user.trim()) return null;
  return {
    tool: "log_rejection",
    title: title.trim().slice(0, 160),
    reason: typeof reason === "string" ? reason.trim().slice(0, 400) : "",
    message_to_user: message_to_user.trim()
  };
}

function parseLogMoodArgs(rawArgs) {
  if (!rawArgs || typeof rawArgs !== "object") return null;
  const { label, score, note, message_to_user } = rawArgs;
  if (typeof message_to_user !== "string" || !message_to_user.trim()) return null;
  const scoreNum = Number(score);
  return {
    tool: "log_mood",
    label: LOG_MOOD_LABELS.includes(label) ? label : "Okay",
    score: Number.isFinite(scoreNum) ? Math.max(0, Math.min(100, Math.round(scoreNum))) : 50,
    note: typeof note === "string" ? note.trim().slice(0, 300) : "",
    message_to_user: message_to_user.trim()
  };
}

function parseLogJournalArgs(rawArgs) {
  if (!rawArgs || typeof rawArgs !== "object") return null;
  const { text, message_to_user } = rawArgs;
  if (typeof text !== "string" || !text.trim()) return null;
  if (typeof message_to_user !== "string" || !message_to_user.trim()) return null;
  return {
    tool: "log_journal",
    text: text.trim().slice(0, 1200),
    message_to_user: message_to_user.trim()
  };
}

function parseLogContactReachedArgs(rawArgs) {
  if (!rawArgs || typeof rawArgs !== "object") return null;
  const { contact_name, message_to_user } = rawArgs;
  if (typeof contact_name !== "string" || !contact_name.trim()) return null;
  if (typeof message_to_user !== "string" || !message_to_user.trim()) return null;
  return {
    tool: "log_contact_reached",
    contact_name: contact_name.trim().slice(0, 120),
    message_to_user: message_to_user.trim()
  };
}

function parseLogMilestoneProgressArgs(rawArgs) {
  if (!rawArgs || typeof rawArgs !== "object") return null;
  const { milestone_title, message_to_user } = rawArgs;
  if (typeof milestone_title !== "string" || !milestone_title.trim()) return null;
  if (typeof message_to_user !== "string" || !message_to_user.trim()) return null;
  return {
    tool: "log_milestone_progress",
    milestone_title: milestone_title.trim().slice(0, 200),
    message_to_user: message_to_user.trim()
  };
}

function parseNamedToolArgs(name, rawArgs) {
  if (name === "open_tool") return parseOpenToolArgs(rawArgs);
  if (name === "remember_this") return parseRememberThisArgs(rawArgs);
  if (name === "update_memory") return parseUpdateMemoryArgs(rawArgs);
  if (name === "log_savings") return parseLogSavingsArgs(rawArgs);
  if (name === "log_rejection") return parseLogRejectionArgs(rawArgs);
  if (name === "log_mood") return parseLogMoodArgs(rawArgs);
  if (name === "log_journal") return parseLogJournalArgs(rawArgs);
  if (name === "log_contact_reached") return parseLogContactReachedArgs(rawArgs);
  if (name === "log_milestone_progress") return parseLogMilestoneProgressArgs(rawArgs);
  return null;
}

function extractChatCompletionToolCall(data) {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const message = choices[0] && choices[0].message ? choices[0].message : null;
  const toolCalls = message && Array.isArray(message.tool_calls) ? message.tool_calls : [];
  const call = toolCalls.find((item) => item.type === "function" && item.function && TOOL_NAMES.includes(item.function.name));
  if (!call) return null;
  try {
    return parseNamedToolArgs(call.function.name, JSON.parse(call.function.arguments || "{}"));
  } catch (error) {
    return null;
  }
}

function extractResponseToolCall(data) {
  const output = Array.isArray(data.output) ? data.output : [];
  const call = output.find((item) => item.type === "function_call" && TOOL_NAMES.includes(item.name));
  if (!call) return null;
  try {
    return parseNamedToolArgs(call.name, JSON.parse(call.arguments || "{}"));
  } catch (error) {
    return null;
  }
}

function extractGeminiToolCall(data) {
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const parts = candidates[0] && candidates[0].content && Array.isArray(candidates[0].content.parts)
    ? candidates[0].content.parts
    : [];
  const part = parts.find((item) => item.functionCall && TOOL_NAMES.includes(item.functionCall.name));
  return part ? parseNamedToolArgs(part.functionCall.name, part.functionCall.args || {}) : null;
}

function extractAnthropicToolCall(data) {
  const content = Array.isArray(data.content) ? data.content : [];
  const block = content.find((item) => item.type === "tool_use" && TOOL_NAMES.includes(item.name));
  return block ? parseNamedToolArgs(block.name, block.input || {}) : null;
}

function extractAnthropicText(data) {
  const content = Array.isArray(data.content) ? data.content : [];
  return content.filter((item) => item.type === "text" && typeof item.text === "string").map((item) => item.text).join("\n").trim();
}

// Single source of truth for both real functions' shape - each provider's
// own tools-array wrapper differs (see the *ToolsParam functions below),
// but all four are built from these two schemas so they can't silently
// drift out of sync with each other. open_tool depends on the client's
// live feature catalog (tools argument); remember_this is static.
function buildOpenToolSchema(tools) {
  if (!Array.isArray(tools) || !tools.length) return null;
  const ids = tools.map((item) => String(item.id)).filter(Boolean);
  if (!ids.length) return null;
  const descriptionLines = tools.map((item) => `- ${item.id}: ${item.description}`).join("\n");
  return {
    name: "open_tool",
    description: `Open a real feature in the Compass app when it would genuinely help the user right now - not on every message, only when a specific real tool clearly applies. Available tools:\n${descriptionLines}`,
    properties: {
      tool_id: { type: "string", enum: ids },
      message_to_user: { type: "string", description: "A short, natural, in-character message to show the user explaining what you're doing - write it the way you'd actually say it, not a system notification." }
    },
    required: ["tool_id", "message_to_user"]
  };
}

function buildRememberThisSchema() {
  return {
    name: "remember_this",
    description: "Save something real the user just told you as a lifeMemory entry, the same kind of record the app's manual 'remember this' form creates - so you can bring it back later without the user having to fill out a form. Only call this when something concrete and worth recalling later was actually said (a real decision, something they're avoiding, a plan) - not on ordinary small talk.",
    properties: {
      situation_tag: { type: "string", description: "A short label for what this is about, e.g. 'internship application' or 'talking to roommate about rent'." },
      decision: { type: "string", description: "What they decided or did (or decided not to do), in their own terms." },
      reason: { type: "string", description: "Why, if they said why." },
      kind: { type: "string", enum: REMEMBER_THIS_KINDS, description: "missed_opportunity if they skipped/avoided/held back on something; decision if they made an active choice; note for anything else worth remembering." },
      related_goal: { type: "string", description: "If this clearly relates to one of the user's real saved Life Roadmap goals (see the saved facts in context), the goal's title exactly as given there. Omit entirely if no specific goal clearly applies - do not guess." },
      confidence: { type: "number", description: "Only if the user themselves stated how confident they are or what they expect (e.g. 'I'm like 70% sure this works out') - their own stated number 0-100. Omit entirely otherwise; never estimate a confidence they did not state." },
      message_to_user: { type: "string", description: "A short, natural line telling the user you're noting this down - write it the way you'd actually say it, not a system notification." }
    },
    required: ["situation_tag", "decision", "kind", "message_to_user"]
  };
}

function buildUpdateMemorySchema() {
  return {
    name: "update_memory",
    description: "Attach a real outcome to something already remembered about the user (a lifeMemory entry from an earlier remember_this call or the manual form) - use this when the user tells you what actually happened afterward, instead of creating a disconnected new memory. Only call this when there's a genuinely matching earlier entry; if unsure, use remember_this instead.",
    properties: {
      situation_tag: { type: "string", description: "The situation_tag (or a close match) of the earlier entry this outcome belongs to." },
      outcome: { type: "string", description: "What actually happened, in the user's own terms." },
      message_to_user: { type: "string", description: "A short, natural line telling the user you're updating that memory - write it the way you'd actually say it, not a system notification." }
    },
    required: ["situation_tag", "outcome", "message_to_user"]
  };
}

function buildLogSavingsSchema() {
  return {
    name: "log_savings",
    description: "Log a real amount the user just said they saved, adding it to their existing Money Plan savings goal. Only call this if budgetSnapshot in context shows they already have an active savings goal - if they don't have one yet, don't invent one; suggest opening Money Plan with open_tool instead.",
    properties: {
      amount: { type: "number", description: "The real amount they just said they saved, as a plain number." },
      note: { type: "string", description: "What it was for, if they said so." },
      message_to_user: { type: "string", description: "A short, natural line telling the user you've logged it - write it the way you'd actually say it, not a system notification." }
    },
    required: ["amount", "message_to_user"]
  };
}

function buildLogRejectionSchema() {
  return {
    name: "log_rejection",
    description: "Save something real the user just said they declined or chose not to pursue - an opportunity, a request, an expectation - to their Rejection List (the same list the manual 'What You've Let Go Of' form writes to). Only call this when they describe an actual, specific thing they turned down, not general venting or a hypothetical.",
    properties: {
      title: { type: "string", description: "What they declined, in their own terms." },
      reason: { type: "string", description: "Why, if they said why." },
      message_to_user: { type: "string", description: "A short, natural line telling the user you've noted it down - write it the way you'd actually say it, not a system notification." }
    },
    required: ["title", "message_to_user"]
  };
}

function buildLogMoodSchema() {
  return {
    name: "log_mood",
    description: "Log how the user says they're feeling right now as a real mood check-in, the same record the manual mood tracker creates - so today's check-in is done without them having to open the mood tracker separately. Only call this when they clearly describe their current overall mood, not a fleeting reaction to one line in the conversation.",
    properties: {
      label: { type: "string", enum: LOG_MOOD_LABELS, description: "The closest match to how they describe feeling overall right now." },
      score: { type: "number", description: "Their mood on a 0-100 scale if you can reasonably infer one from what they said (e.g. clearly very low or clearly good) - otherwise a neutral middle value." },
      note: { type: "string", description: "A short note in their own words about why, if they said why." },
      message_to_user: { type: "string", description: "A short, natural line telling the user you've logged their mood - write it the way you'd actually say it, not a system notification." }
    },
    required: ["label", "message_to_user"]
  };
}

function buildLogJournalSchema() {
  return {
    name: "log_journal",
    description: "Save a real reflection or thought the user just shared as a journal entry, the same record the manual journal form creates. Only call this for something genuinely reflective and worth keeping, and only when they aren't already describing a specific decision or something they turned down (use remember_this or log_rejection instead for those).",
    properties: {
      text: { type: "string", description: "The reflection, in their own words - rephrase for clarity if needed but keep their meaning and tone." },
      message_to_user: { type: "string", description: "A short, natural line telling the user you've saved it - write it the way you'd actually say it, not a system notification." }
    },
    required: ["text", "message_to_user"]
  };
}

// Both match against a real EXISTING record by name/title (a contact
// already in Networking, a milestone already in a real Roadmap goal) -
// deliberately not create-if-missing, unlike log_rejection/log_journal
// which are real event STREAMS where a new entry is always correct.
// Networking contacts and Roadmap milestones are closer to a fixed
// roster/plan the user already set up deliberately; inventing a new one
// from an offhand chat mention would pollute real data with an AI guess
// instead of updating something the user actually created on purpose.
function buildLogContactReachedSchema() {
  return {
    name: "log_contact_reached",
    description: "Mark that the user actually reached out to or checked in with someone already saved as a real contact - either in Networking (mentors, referrals, alumni) or Support Circle (trusted people to lean on) - updates that contact's real 'last contacted' date, the same field the manual forms set. Only call this when they clearly describe contacting a specific real person, and only if that person plausibly matches someone already in their saved contacts (see the saved facts in context) - never invent a new contact.",
    properties: {
      contact_name: { type: "string", description: "The contact's name, as close as possible to how it's saved in their real Networking or Support Circle list." },
      message_to_user: { type: "string", description: "A short, natural line telling the user you've logged the check-in - write it the way you'd actually say it, not a system notification." }
    },
    required: ["contact_name", "message_to_user"]
  };
}

function buildLogMilestoneProgressSchema() {
  return {
    name: "log_milestone_progress",
    description: "Mark a real milestone from one of the user's real Life Roadmap goals as done - the same action the manual 'Mark done' button performs. Only call this when they clearly describe completing something that matches a real saved milestone (see the saved facts in context) closely enough that there's no real ambiguity - never guess at or invent a milestone that isn't actually saved.",
    properties: {
      milestone_title: { type: "string", description: "The milestone's title, as close as possible to how it's saved in their real Roadmap." },
      message_to_user: { type: "string", description: "A short, natural line telling the user you've marked it done - write it the way you'd actually say it, not a system notification." }
    },
    required: ["milestone_title", "message_to_user"]
  };
}

function buildToolSchemas(tools) {
  return {
    openTool: buildOpenToolSchema(tools),
    rememberThis: buildRememberThisSchema(),
    updateMemory: buildUpdateMemorySchema(),
    logSavings: buildLogSavingsSchema(),
    logRejection: buildLogRejectionSchema(),
    logMood: buildLogMoodSchema(),
    logJournal: buildLogJournalSchema(),
    logContactReached: buildLogContactReachedSchema(),
    logMilestoneProgress: buildLogMilestoneProgressSchema()
  };
}

function schemaList(schemas) {
  return [schemas.openTool, schemas.rememberThis, schemas.updateMemory, schemas.logSavings, schemas.logRejection, schemas.logMood, schemas.logJournal, schemas.logContactReached, schemas.logMilestoneProgress].filter(Boolean);
}

function groqToolsParam(schemas) {
  const list = schemaList(schemas);
  if (!list.length) return undefined;
  return list.map((schema) => ({
    type: "function",
    function: {
      name: schema.name,
      description: schema.description,
      parameters: { type: "object", properties: schema.properties, required: schema.required }
    }
  }));
}

function openaiToolsParam(schemas) {
  const list = schemaList(schemas);
  if (!list.length) return undefined;
  return list.map((schema) => ({
    type: "function",
    name: schema.name,
    description: schema.description,
    parameters: { type: "object", properties: schema.properties, required: schema.required }
  }));
}

function geminiProperty(prop) {
  if (prop.type === "string" && prop.enum) return { type: "STRING", enum: prop.enum, description: prop.description };
  if (prop.type === "number") return { type: "NUMBER", description: prop.description };
  return { type: "STRING", description: prop.description };
}

function geminiToolsParam(schemas) {
  const list = schemaList(schemas);
  if (!list.length) return undefined;
  return [{
    functionDeclarations: list.map((schema) => ({
      name: schema.name,
      description: schema.description,
      parameters: {
        type: "OBJECT",
        properties: Object.fromEntries(Object.entries(schema.properties).map(([key, prop]) => [key, geminiProperty(prop)])),
        required: schema.required
      }
    }))
  }];
}

function anthropicToolsParam(schemas) {
  const list = schemaList(schemas);
  if (!list.length) return undefined;
  return list.map((schema) => ({
    name: schema.name,
    description: schema.description,
    input_schema: { type: "object", properties: schema.properties, required: schema.required }
  }));
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

function buildAnthropicMessages(messages) {
  const cleaned = messages.slice(-18).map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: String(message.content || "").slice(0, 2500),
  }));
  // Anthropic requires the first message to be role "user" - drop any
  // leading assistant turns left over from slicing a long history.
  while (cleaned.length && cleaned[0].role !== "user") cleaned.shift();
  return cleaned.length ? cleaned : [{ role: "user", content: "Hello" }];
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

  const schemas = buildToolSchemas(tools);
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
      tools: geminiToolsParam(schemas),
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

  const schemas = buildToolSchemas(tools);
  const apiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: groqModel,
      messages: buildChatMessages(systemPrompt, messages, context),
      tools: groqToolsParam(schemas),
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

  const schemas = buildToolSchemas(tools);
  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openaiModel,
      input: buildChatMessages(systemPrompt, messages, context),
      tools: openaiToolsParam(schemas),
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

// Tried first when configured (see providerOrder) - real Anthropic Claude
// intelligence, not just a "be like Claude" instruction to a smaller
// model. Falls back to Groq/Gemini/OpenAI automatically if
// ANTHROPIC_API_KEY isn't set or the call fails, so nothing breaks for a
// deployment that hasn't added the key yet.
async function callAnthropic({ systemPrompt, messages, context, tools }) {
  if (!anthropicApiKey) {
    console.error("[Compass AI] ANTHROPIC_API_KEY is missing in Vercel environment variables.");
    return { status: 503, payload: { error: "ANTHROPIC_API_KEY is not configured." } };
  }

  const schemas = buildToolSchemas(tools);
  const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: anthropicModel,
      // Higher than the other providers' 1100-token cap on purpose:
      // Claude Opus 5 has adaptive thinking on by default and max_tokens
      // is a hard cap on thinking + response text together - a tight cap
      // here risks truncating mid-answer. Leaving thinking on (rather
      // than disabling it) avoids Opus 5's known failure mode of leaking
      // a tool call into plain text when thinking is off, which this
      // app's function-calling relies on not happening.
      max_tokens: 4096,
      system: `${systemPrompt}\n\nMemory rules: Do not invent the user's mood, goals, name, personality, school status, or past messages. Only use facts found in the current chat messages, savedUserProfile, or uploadedDocumentChunks. If savedUserProfile has empty fields, ignore them. If you use uploadedDocumentChunks to answer, say "Based on your uploaded document..." before the document-based part. If the document chunks do not contain the answer, say you cannot find that in the uploaded document and ask for the missing detail.\n\nSafety: If the user describes immediate danger, self-harm, abuse, or emergency risk, respond calmly, encourage contacting trusted people and local emergency support, and do not pretend to be emergency services or a therapist.\n\nContext JSON: ${context}`,
      messages: buildAnthropicMessages(messages),
      tools: anthropicToolsParam(schemas),
      output_config: { effort: "medium" },
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    console.error("[Compass AI] Anthropic API error", apiResponse.status, errorText);
    return { status: 502, payload: { error: "Anthropic provider failed.", detail: errorText.slice(0, 700) } };
  }

  const data = await apiResponse.json();
  const toolCall = extractAnthropicToolCall(data);
  const reply = extractAnthropicText(data);
  if (!reply && !toolCall) {
    console.error("[Compass AI] Anthropic returned an empty response", JSON.stringify(data).slice(0, 1200));
    return { status: 502, payload: { error: "Anthropic provider returned an empty response." } };
  }
  return { status: 200, payload: { reply, toolCall, provider: "anthropic", model: anthropicModel } };
}

function providerOrder() {
  // Anthropic is tried first whenever ANTHROPIC_API_KEY is configured
  // (providerHasKey/callConfiguredProvider skip it silently otherwise) -
  // real Claude intelligence is the quality bar, everything else is a
  // resilience fallback if it's unset or fails.
  return ["anthropic", provider, "groq", "gemini", "openai"]
    .filter(Boolean)
    .filter((name, index, list) => list.indexOf(name) === index);
}

function providerHasKey(name) {
  if (name === "anthropic") return Boolean(anthropicApiKey);
  if (name === "openai") return Boolean(openaiApiKey);
  if (name === "gemini") return Boolean(geminiApiKey);
  return Boolean(groqApiKey);
}

async function callProvider(name, args) {
  if (name === "anthropic") return callAnthropic(args);
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
    // Was 1600 - COMPASS_SYSTEM_PROMPT (app.js) is already ~3400 chars and
    // grows with every few-shot example added to it; 1600 silently cut off
    // roughly the back half of the prompt (tone rules, lifeMemory recall,
    // open_tool/remember_this guidance) before it ever reached the model.
    // Raised again as COMPASS_SYSTEM_PROMPT and the context payload both
    // keep growing (Trust Moments/relevantHistory/personalityRead) - see
    // the 1600->8000 fix earlier for why this limit matters at all.
    const systemPrompt = String(body.systemPrompt || "").slice(0, 14000);
    const context = body.context ? JSON.stringify(body.context).slice(0, 14000) : "{}";
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
