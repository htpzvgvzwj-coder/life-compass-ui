const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
loadEnvFile(path.join(root, '.env'));

const port = Number(process.env.PORT || 5179);
const provider = (process.env.COMPASS_AI_PROVIDER || 'groq').trim().toLowerCase();
const groqApiKey = readSecret('GROQ_API_KEY');
const groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const geminiApiKey = readSecret('GEMINI_API_KEY');
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const openaiApiKey = readSecret('OPENAI_API_KEY');
const openaiModel = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const anthropicApiKey = readSecret('ANTHROPIC_API_KEY');
const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
const supabaseUrl = readSecret('SUPABASE_URL');
const supabaseAnonKey = readSecret('SUPABASE_ANON_KEY');
const supabaseServiceRoleKey = readSecret('SUPABASE_SERVICE_ROLE_KEY');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function readSecret(key) {
  const value = String(process.env[key] || '').trim();
  const lower = value.toLowerCase();
  if (!value || lower.includes('your_') || lower.includes('_here') || lower.includes('sk-your')) return '';
  return value;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(payload));
}

function sendCorsPreflight(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  });
  res.end();
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100000) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function extractResponseText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (typeof part.text === 'string' && part.text.trim()) return part.text.trim();
      if (typeof part.output_text === 'string' && part.output_text.trim()) return part.output_text.trim();
    }
  }
  return '';
}

function extractGeminiText(data) {
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const parts = candidates[0] && candidates[0].content && Array.isArray(candidates[0].content.parts)
    ? candidates[0].content.parts
    : [];
  return parts.map((part) => part.text || '').join('').trim();
}

function extractChatCompletionText(data) {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const message = choices[0] && choices[0].message ? choices[0].message : null;
  return message && typeof message.content === 'string' ? message.content.trim() : '';
}

// Real function-calling parsers - mirrors api/compass-chat.js (the
// Vercel production route) so local dev has the same tool-calling
// behavior, not a stale copy. See that file for the full rationale.
// Every provider can call one of three functions per turn (never more
// than one): open_tool (opens a real app feature), remember_this (writes
// a new lifeMemory entry), or update_memory (attaches an outcome to an
// EXISTING lifeMemory entry instead of creating an unrelated new one).
const REMEMBER_THIS_KINDS = ['missed_opportunity', 'decision', 'note'];
const TOOL_NAMES = ['open_tool', 'remember_this', 'update_memory'];

function parseOpenToolArgs(rawArgs) {
  if (!rawArgs || typeof rawArgs !== 'object') return null;
  if (typeof rawArgs.tool_id === 'string' && typeof rawArgs.message_to_user === 'string') {
    return { tool: 'open_tool', tool_id: rawArgs.tool_id, message_to_user: rawArgs.message_to_user };
  }
  return null;
}

function parseRememberThisArgs(rawArgs) {
  if (!rawArgs || typeof rawArgs !== 'object') return null;
  const { situation_tag, decision, reason, kind, related_goal, message_to_user } = rawArgs;
  if (typeof situation_tag !== 'string' || !situation_tag.trim()) return null;
  if (typeof decision !== 'string' || !decision.trim()) return null;
  if (typeof message_to_user !== 'string' || !message_to_user.trim()) return null;
  return {
    tool: 'remember_this',
    situation_tag: situation_tag.trim().slice(0, 120),
    decision: decision.trim().slice(0, 300),
    reason: typeof reason === 'string' ? reason.trim().slice(0, 300) : '',
    kind: REMEMBER_THIS_KINDS.includes(kind) ? kind : 'decision',
    related_goal: typeof related_goal === 'string' ? related_goal.trim().slice(0, 200) : '',
    message_to_user: message_to_user.trim(),
  };
}

function parseUpdateMemoryArgs(rawArgs) {
  if (!rawArgs || typeof rawArgs !== 'object') return null;
  const { situation_tag, outcome, message_to_user } = rawArgs;
  if (typeof situation_tag !== 'string' || !situation_tag.trim()) return null;
  if (typeof outcome !== 'string' || !outcome.trim()) return null;
  if (typeof message_to_user !== 'string' || !message_to_user.trim()) return null;
  return {
    tool: 'update_memory',
    situation_tag: situation_tag.trim().slice(0, 120),
    outcome: outcome.trim().slice(0, 300),
    message_to_user: message_to_user.trim(),
  };
}

function parseNamedToolArgs(name, rawArgs) {
  if (name === 'open_tool') return parseOpenToolArgs(rawArgs);
  if (name === 'remember_this') return parseRememberThisArgs(rawArgs);
  if (name === 'update_memory') return parseUpdateMemoryArgs(rawArgs);
  return null;
}

function extractChatCompletionToolCall(data) {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const message = choices[0] && choices[0].message ? choices[0].message : null;
  const toolCalls = message && Array.isArray(message.tool_calls) ? message.tool_calls : [];
  const call = toolCalls.find((item) => item.type === 'function' && item.function && TOOL_NAMES.includes(item.function.name));
  if (!call) return null;
  try {
    return parseNamedToolArgs(call.function.name, JSON.parse(call.function.arguments || '{}'));
  } catch (error) {
    return null;
  }
}

function extractResponseToolCall(data) {
  const output = Array.isArray(data.output) ? data.output : [];
  const call = output.find((item) => item.type === 'function_call' && TOOL_NAMES.includes(item.name));
  if (!call) return null;
  try {
    return parseNamedToolArgs(call.name, JSON.parse(call.arguments || '{}'));
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
  const block = content.find((item) => item.type === 'tool_use' && TOOL_NAMES.includes(item.name));
  return block ? parseNamedToolArgs(block.name, block.input || {}) : null;
}

function extractAnthropicText(data) {
  const content = Array.isArray(data.content) ? data.content : [];
  return content.filter((item) => item.type === 'text' && typeof item.text === 'string').map((item) => item.text).join('\n').trim();
}

function buildOpenToolSchema(tools) {
  if (!Array.isArray(tools) || !tools.length) return null;
  const ids = tools.map((item) => String(item.id)).filter(Boolean);
  if (!ids.length) return null;
  const descriptionLines = tools.map((item) => `- ${item.id}: ${item.description}`).join('\n');
  return {
    name: 'open_tool',
    description: `Open a real feature in the Compass app when it would genuinely help the user right now - not on every message, only when a specific real tool clearly applies. Available tools:\n${descriptionLines}`,
    properties: {
      tool_id: { type: 'string', enum: ids },
      message_to_user: { type: 'string', description: 'A short, natural, in-character message to show the user explaining what you\'re doing - write it the way you\'d actually say it, not a system notification.' },
    },
    required: ['tool_id', 'message_to_user'],
  };
}

function buildRememberThisSchema() {
  return {
    name: 'remember_this',
    description: 'Save something real the user just told you as a lifeMemory entry, the same kind of record the app\'s manual \'remember this\' form creates - so you can bring it back later without the user having to fill out a form. Only call this when something concrete and worth recalling later was actually said (a real decision, something they\'re avoiding, a plan) - not on ordinary small talk.',
    properties: {
      situation_tag: { type: 'string', description: 'A short label for what this is about, e.g. \'internship application\' or \'talking to roommate about rent\'.' },
      decision: { type: 'string', description: 'What they decided or did (or decided not to do), in their own terms.' },
      reason: { type: 'string', description: 'Why, if they said why.' },
      kind: { type: 'string', enum: REMEMBER_THIS_KINDS, description: 'missed_opportunity if they skipped/avoided/held back on something; decision if they made an active choice; note for anything else worth remembering.' },
      related_goal: { type: 'string', description: 'If this clearly relates to one of the user\'s real saved Life Roadmap goals (see the saved facts in context), the goal\'s title exactly as given there. Omit entirely if no specific goal clearly applies - do not guess.' },
      message_to_user: { type: 'string', description: 'A short, natural line telling the user you\'re noting this down - write it the way you\'d actually say it, not a system notification.' },
    },
    required: ['situation_tag', 'decision', 'kind', 'message_to_user'],
  };
}

function buildUpdateMemorySchema() {
  return {
    name: 'update_memory',
    description: 'Attach a real outcome to something already remembered about the user (a lifeMemory entry from an earlier remember_this call or the manual form) - use this when the user tells you what actually happened afterward, instead of creating a disconnected new memory. Only call this when there\'s a genuinely matching earlier entry; if unsure, use remember_this instead.',
    properties: {
      situation_tag: { type: 'string', description: 'The situation_tag (or a close match) of the earlier entry this outcome belongs to.' },
      outcome: { type: 'string', description: 'What actually happened, in the user\'s own terms.' },
      message_to_user: { type: 'string', description: 'A short, natural line telling the user you\'re updating that memory - write it the way you\'d actually say it, not a system notification.' },
    },
    required: ['situation_tag', 'outcome', 'message_to_user'],
  };
}

function buildToolSchemas(tools) {
  return { openTool: buildOpenToolSchema(tools), rememberThis: buildRememberThisSchema(), updateMemory: buildUpdateMemorySchema() };
}

function schemaList(schemas) {
  return [schemas.openTool, schemas.rememberThis, schemas.updateMemory].filter(Boolean);
}

function groqToolsParam(schemas) {
  const list = schemaList(schemas);
  if (!list.length) return undefined;
  return list.map((schema) => ({
    type: 'function',
    function: {
      name: schema.name,
      description: schema.description,
      parameters: { type: 'object', properties: schema.properties, required: schema.required },
    },
  }));
}

function openaiToolsParam(schemas) {
  const list = schemaList(schemas);
  if (!list.length) return undefined;
  return list.map((schema) => ({
    type: 'function',
    name: schema.name,
    description: schema.description,
    parameters: { type: 'object', properties: schema.properties, required: schema.required },
  }));
}

function geminiProperty(prop) {
  if (prop.type === 'string' && prop.enum) return { type: 'STRING', enum: prop.enum, description: prop.description };
  return { type: 'STRING', description: prop.description };
}

function geminiToolsParam(schemas) {
  const list = schemaList(schemas);
  if (!list.length) return undefined;
  return [{
    functionDeclarations: list.map((schema) => ({
      name: schema.name,
      description: schema.description,
      parameters: {
        type: 'OBJECT',
        properties: Object.fromEntries(Object.entries(schema.properties).map(([key, prop]) => [key, geminiProperty(prop)])),
        required: schema.required,
      },
    })),
  }];
}

function anthropicToolsParam(schemas) {
  const list = schemaList(schemas);
  if (!list.length) return undefined;
  return list.map((schema) => ({
    name: schema.name,
    description: schema.description,
    input_schema: { type: 'object', properties: schema.properties, required: schema.required },
  }));
}

function buildChatMessages(systemPrompt, messages, context) {
  return [
    {
      role: 'system',
      content: `${systemPrompt}\n\nMemory rules: Do not invent the user's mood, goals, name, personality, school status, or past messages. Only use facts found in the current chat messages, savedUserProfile, or uploadedDocumentChunks. If savedUserProfile has empty fields, ignore them. If you use uploadedDocumentChunks to answer, say "Based on your uploaded document..." before the document-based part. If the document chunks do not contain the answer, say you cannot find that in the uploaded document and ask for the missing detail.\n\nSafety: If the user describes immediate danger, self-harm, abuse, or emergency risk, respond calmly, encourage contacting trusted people and local emergency support, and do not pretend to be emergency services or a therapist.\n\nContext JSON: ${context}`,
    },
    ...messages.slice(-18).map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: String(message.content || '').slice(0, 2500),
    })),
  ];
}

function buildAnthropicMessages(messages) {
  const cleaned = messages.slice(-18).map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: String(message.content || '').slice(0, 2500),
  }));
  // Anthropic requires the first message to be role 'user' - drop any
  // leading assistant turns left over from slicing a long history.
  while (cleaned.length && cleaned[0].role !== 'user') cleaned.shift();
  return cleaned.length ? cleaned : [{ role: 'user', content: 'Hello' }];
}

function normalizedGeminiModelPath(model) {
  const modelPath = model.startsWith('models/') ? model : `models/${model}`;
  return modelPath.split('/').map(encodeURIComponent).join('/');
}

function buildGeminiContents(messages) {
  const cleaned = messages.slice(-18).map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(message.content || '').slice(0, 2500) }],
  }));
  return cleaned.length ? cleaned : [{ role: 'user', parts: [{ text: 'Hello' }] }];
}

async function callGemini({ systemPrompt, messages, context, tools }) {
  if (!geminiApiKey) {
    console.error('[Compass AI] GEMINI_API_KEY is missing. Add it to .env or your shell environment.');
    return { status: 503, payload: { error: 'GEMINI_API_KEY is not configured.' } };
  }

  const schemas = buildToolSchemas(tools);
  const modelPath = normalizedGeminiModelPath(geminiModel);
  const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${encodeURIComponent(geminiApiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
        // 1100 was too tight for Future Mirror's structured-JSON prompts
        // (Decision Simulator/Life Compass ask for 6 scored dimensions, up
        // to 3 paths, a 4-point timeline, a letter, 6 score categories, and
        // reflection questions) - responses were getting cut off mid-JSON,
        // which failed to parse and showed the raw truncated text to users.
        maxOutputTokens: 2400,
      },
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    console.error('[Compass AI] Gemini API error', apiResponse.status, errorText);
    return { status: 502, payload: { error: 'Gemini provider failed.', detail: errorText.slice(0, 700) } };
  }

  const data = await apiResponse.json();
  const toolCall = extractGeminiToolCall(data);
  const reply = extractGeminiText(data);
  if (!reply && !toolCall) {
    console.error('[Compass AI] Gemini returned an empty response', JSON.stringify(data).slice(0, 1200));
    return { status: 502, payload: { error: 'Gemini provider returned an empty response.' } };
  }
  return { status: 200, payload: { reply, toolCall, provider: 'gemini', model: geminiModel } };
}

async function callGroq({ systemPrompt, messages, context, tools }) {
  if (!groqApiKey) {
    console.error('[Compass AI] GROQ_API_KEY is missing. Add it to .env or your shell environment.');
    return { status: 503, payload: { error: 'GROQ_API_KEY is not configured.' } };
  }

  const schemas = buildToolSchemas(tools);
  const apiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: groqModel,
      messages: buildChatMessages(systemPrompt, messages, context),
      tools: groqToolsParam(schemas),
      temperature: 0.75,
      top_p: 0.9,
      // See the matching comment in callGemini() - 1100 was too tight for
      // Future Mirror's structured-JSON prompts and was truncating replies.
      max_completion_tokens: 2400,
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    console.error('[Compass AI] Groq API error', apiResponse.status, errorText);
    return { status: 502, payload: { error: 'Groq provider failed.', detail: errorText.slice(0, 700) } };
  }

  const data = await apiResponse.json();
  const toolCall = extractChatCompletionToolCall(data);
  const reply = extractChatCompletionText(data);
  if (!reply && !toolCall) {
    console.error('[Compass AI] Groq returned an empty response', JSON.stringify(data).slice(0, 1200));
    return { status: 502, payload: { error: 'Groq provider returned an empty response.' } };
  }
  return { status: 200, payload: { reply, toolCall, provider: 'groq', model: groqModel } };
}

async function callOpenAI({ systemPrompt, messages, context, tools }) {
  if (!openaiApiKey) {
    console.error('[Compass AI] OPENAI_API_KEY is missing. Add it to .env or your shell environment.');
    return { status: 503, payload: { error: 'OPENAI_API_KEY is not configured.' } };
  }

  const schemas = buildToolSchemas(tools);
  const input = buildChatMessages(systemPrompt, messages, context);

  const apiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openaiModel,
      input,
      tools: openaiToolsParam(schemas),
      // See the matching comment in callGemini() - 1100 was too tight for
      // Future Mirror's structured-JSON prompts and was truncating replies.
      max_output_tokens: 2400,
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    console.error('[Compass AI] OpenAI API error', apiResponse.status, errorText);
    return { status: 502, payload: { error: 'OpenAI provider failed.', detail: errorText.slice(0, 700) } };
  }

  const data = await apiResponse.json();
  const toolCall = extractResponseToolCall(data);
  const reply = extractResponseText(data);
  if (!reply && !toolCall) {
    console.error('[Compass AI] OpenAI returned an empty response', JSON.stringify(data).slice(0, 1200));
    return { status: 502, payload: { error: 'OpenAI provider returned an empty response.' } };
  }
  return { status: 200, payload: { reply, toolCall, provider: 'openai', model: openaiModel } };
}

// Tried first when configured (see providerOrder) - real Anthropic Claude
// intelligence, not just a "be like Claude" instruction to a smaller
// model. Falls back to Groq/Gemini/OpenAI automatically if
// ANTHROPIC_API_KEY isn't set or the call fails.
async function callAnthropic({ systemPrompt, messages, context, tools }) {
  if (!anthropicApiKey) {
    console.error('[Compass AI] ANTHROPIC_API_KEY is missing. Add it to .env or your shell environment.');
    return { status: 503, payload: { error: 'ANTHROPIC_API_KEY is not configured.' } };
  }

  const schemas = buildToolSchemas(tools);
  const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: anthropicModel,
      // Claude Opus 5 has adaptive thinking on by default and max_tokens
      // caps thinking + response text together - see the matching comment
      // in api/compass-chat.js for why this is higher than the other
      // providers' 1100/2400 caps, and why thinking is left on rather than
      // disabled.
      max_tokens: 4096,
      system: `${systemPrompt}\n\nMemory rules: Do not invent the user's mood, goals, name, personality, school status, or past messages. Only use facts found in the current chat messages, savedUserProfile, or uploadedDocumentChunks. If savedUserProfile has empty fields, ignore them. If you use uploadedDocumentChunks to answer, say "Based on your uploaded document..." before the document-based part. If the document chunks do not contain the answer, say you cannot find that in the uploaded document and ask for the missing detail.\n\nSafety: If the user describes immediate danger, self-harm, abuse, or emergency risk, respond calmly, encourage contacting trusted people and local emergency support, and do not pretend to be emergency services or a therapist.\n\nContext JSON: ${context}`,
      messages: buildAnthropicMessages(messages),
      tools: anthropicToolsParam(schemas),
      output_config: { effort: 'medium' },
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    console.error('[Compass AI] Anthropic API error', apiResponse.status, errorText);
    return { status: 502, payload: { error: 'Anthropic provider failed.', detail: errorText.slice(0, 700) } };
  }

  const data = await apiResponse.json();
  const toolCall = extractAnthropicToolCall(data);
  const reply = extractAnthropicText(data);
  if (!reply && !toolCall) {
    console.error('[Compass AI] Anthropic returned an empty response', JSON.stringify(data).slice(0, 1200));
    return { status: 502, payload: { error: 'Anthropic provider returned an empty response.' } };
  }
  return { status: 200, payload: { reply, toolCall, provider: 'anthropic', model: anthropicModel } };
}

function providerOrder() {
  // Anthropic is tried first whenever ANTHROPIC_API_KEY is configured -
  // see the matching comment in api/compass-chat.js.
  return ['anthropic', provider, 'groq', 'gemini', 'openai']
    .filter(Boolean)
    .filter((name, index, list) => list.indexOf(name) === index);
}

function providerHasKey(name) {
  if (name === 'anthropic') return Boolean(anthropicApiKey);
  if (name === 'openai') return Boolean(openaiApiKey);
  if (name === 'gemini') return Boolean(geminiApiKey);
  return Boolean(groqApiKey);
}

async function callProvider(name, args) {
  if (name === 'anthropic') return callAnthropic(args);
  if (name === 'openai') return callOpenAI(args);
  if (name === 'gemini') return callGemini(args);
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
      error: missingKeys ? 'No configured AI provider key is available.' : 'All configured AI providers failed.',
    },
  };
}

async function handleCompassChat(req, res) {
  try {
    const body = await readJsonBody(req);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    // Was 1600 - see the matching comment in api/compass-chat.js.
    const systemPrompt = String(body.systemPrompt || '').slice(0, 8000);
    const context = body.context ? JSON.stringify(body.context).slice(0, 8000) : '{}';
    const tools = Array.isArray(body.tools)
      ? body.tools.slice(0, 80).map((item) => ({ id: String(item.id || '').slice(0, 60), description: String(item.description || '').slice(0, 300) })).filter((item) => item.id)
      : [];

    const result = await callConfiguredProvider({ systemPrompt, messages, context, tools });
    sendJson(res, result.status, result.payload);
  } catch (error) {
    console.error('[Compass AI] Server route failed', error);
    sendJson(res, 500, { error: 'Compass chat failed.' });
  }
}

// --- Community (Supabase) routes -------------------------------------------
// Local mirrors of api/community-config.js / api/community-post.js /
// api/community-opportunity.js, following the file's existing style of
// duplicating the Vercel function logic inline rather than importing it.

const COMMUNITY_POST_MODERATION_PROMPT = "You are a safety classifier for a youth self-growth community wall inside an app called Compass. Given a single user post, decide if it is safe to publish. Block posts that: describe active self-harm, suicidal intent, or in-progress abuse without seeking help; contain hate speech, harassment, or sexual content involving minors; share identifying details like a full name plus address, a school name plus schedule, a phone number, or passwords; contain scam links or spam. Do NOT block posts that simply mention struggling, stress, sadness, or asking for support in a general way - that is the point of this space. Respond with strict JSON only, no markdown, no extra text: {\"safe\": true or false, \"reason\": \"short user-facing reason, empty string if safe\"}.";

const COMMUNITY_OPPORTUNITY_MODERATION_PROMPT = "You are a safety classifier for a youth self-growth app's crowdsourced opportunity board (internships, scholarships, volunteering, small jobs). Given a single submission's title and description, decide if it is safe to publish. Block submissions that: are scams, MLM/pyramid schemes, or ask for money/fees upfront; contain hate speech or sexual content; share personal identifying details like a home address or phone number that don't belong on a public listing; point to clearly malicious or unrelated links. Do NOT block ordinary legitimate opportunity listings, even informal ones (e.g. a local shop hiring, a small tutoring gig). Respond with strict JSON only, no markdown, no extra text: {\"safe\": true or false, \"reason\": \"short user-facing reason, empty string if safe\"}.";

const COMMUNITY_MENTOR_MODERATION_PROMPT = "You are a safety classifier for mentor applications on a youth self-growth app called Compass. Given a single applicant bio, decide if it is safe to queue for human review. Block bios that: describe active self-harm, suicidal intent, or in-progress abuse; contain hate speech, harassment, or sexual content involving minors; share identifying details like a full name plus address, a school name plus schedule, a phone number, or passwords; contain scam links, spam, or solicitation for money/payment; make explicit claims to be a licensed professional (doctor, therapist, lawyer) that cannot be verified here. Do NOT block bios that simply describe someone's own past struggles or experience they want to mentor others through - that is the point of this feature. Respond with strict JSON only, no markdown, no extra text: {\"safe\": true or false, \"reason\": \"short user-facing reason, empty string if safe\"}.";

const COMMUNITY_SKILL_TAG_MODERATION_PROMPT = "You are a safety classifier for a youth self-growth app's Skill Exchange board, where members offer or ask for help in one of six categories (Independence, Money, Communication, Career, Wellness, Relationships). Given a single one-line note describing what someone can offer or needs help with, decide if it is safe to publish. Block notes that: are scams, ask for money/fees/payment, advertise unrelated products or services, contain hate speech or sexual content, or share personal identifying details like a home address, phone number, or full school schedule that don't belong on a public listing. Do NOT block ordinary legitimate offers or requests, even informal ones (e.g. \"I can help with budgeting\", \"I need someone to practice interview answers with me\"). Respond with strict JSON only, no markdown, no extra text: {\"safe\": true or false, \"reason\": \"short user-facing reason, empty string if safe\"}.";

const SKILL_TAG_CATEGORIES = ["independence", "money", "communication", "career", "wellness", "relationships"];

function parseModerationReply(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return { safe: parsed.safe !== false, reason: String(parsed.reason || '').slice(0, 300) };
  } catch {
    return null;
  }
}

// Fails OPEN on any technical failure (missing keys, network error, unparsable
// reply) - Community posting must not hard-depend on an AI provider being
// configured. An explicit "unsafe" classification is what fails closed.
async function moderateText(systemPrompt, text) {
  try {
    if (provider === 'openai' && openaiApiKey) {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: openaiModel,
          input: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text.slice(0, 2500) }],
          max_output_tokens: 200,
        }),
      });
      if (!response.ok) return { safe: true, reason: '' };
      const data = await response.json();
      return parseModerationReply(extractResponseText(data)) || { safe: true, reason: '' };
    }
    if (provider === 'gemini' && geminiApiKey) {
      const modelPath = normalizedGeminiModelPath(geminiModel);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${encodeURIComponent(geminiApiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: text.slice(0, 2500) }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 200 },
        }),
      });
      if (!response.ok) return { safe: true, reason: '' };
      const data = await response.json();
      return parseModerationReply(extractGeminiText(data)) || { safe: true, reason: '' };
    }
    if (groqApiKey) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: groqModel,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text.slice(0, 2500) }],
          temperature: 0,
          max_completion_tokens: 200,
        }),
      });
      if (!response.ok) return { safe: true, reason: '' };
      const data = await response.json();
      return parseModerationReply(extractChatCompletionText(data)) || { safe: true, reason: '' };
    }
    return { safe: true, reason: '' };
  } catch (error) {
    console.error('[Community] moderation call failed, failing open', error);
    return { safe: true, reason: '' };
  }
}

async function verifySupabaseUser(accessToken) {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${accessToken}`, apikey: supabaseAnonKey },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data && data.id ? data : null;
}

async function insertSupabaseRow(table, row) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase insert into ${table} failed (${response.status}): ${text.slice(0, 500)}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

function bearerTokenFrom(req) {
  const header = String(req.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

async function handleCommunityConfig(req, res) {
  if (!supabaseUrl || !supabaseAnonKey) {
    sendJson(res, 503, { error: 'Community is not configured yet. Set SUPABASE_URL and SUPABASE_ANON_KEY.' });
    return;
  }
  sendJson(res, 200, { supabaseUrl, supabaseAnonKey });
}

async function handleCommunityPost(req, res) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    sendJson(res, 503, { error: 'Community is not configured yet.' });
    return;
  }
  const accessToken = bearerTokenFrom(req);
  if (!accessToken) {
    sendJson(res, 401, { error: 'Sign in to Community to post.' });
    return;
  }
  try {
    const user = await verifySupabaseUser(accessToken);
    if (!user) {
      sendJson(res, 401, { error: 'Your Community session has expired. Please sign in again.' });
      return;
    }
    const body = await readJsonBody(req);
    const text = String(body.body || '').trim();
    if (text.length < 8 || text.length > 1500) {
      sendJson(res, 400, { error: 'Posts must be between 8 and 1500 characters.' });
      return;
    }
    const postType = body.postType === 'milestone' ? 'milestone' : 'general';
    const moderation = await moderateText(COMMUNITY_POST_MODERATION_PROMPT, text);
    const status = moderation.safe ? 'published' : 'blocked';
    const row = await insertSupabaseRow('posts', {
      author_id: user.id,
      squad_id: body.squadId || null,
      body: text,
      post_type: postType,
      theme_week: Number.isInteger(body.themeWeek) ? body.themeWeek : null,
      related_goal_title: postType === 'milestone' ? String(body.relatedGoalTitle || '').slice(0, 200) : null,
      related_milestone_title: postType === 'milestone' ? String(body.relatedMilestoneTitle || '').slice(0, 200) : null,
      status,
      moderation_reason: moderation.safe ? null : (moderation.reason || 'This post needs a safer rewording before it can be shared.'),
    });
    sendJson(res, 200, { post: row, status, reason: moderation.safe ? '' : row.moderation_reason });
  } catch (error) {
    console.error('[Community] community-post failed', error);
    sendJson(res, 500, { error: 'Could not publish your post right now.' });
  }
}

async function handleCommunityOpportunity(req, res) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    sendJson(res, 503, { error: 'Community is not configured yet.' });
    return;
  }
  const accessToken = bearerTokenFrom(req);
  if (!accessToken) {
    sendJson(res, 401, { error: 'Sign in to Community to share an opportunity.' });
    return;
  }
  try {
    const user = await verifySupabaseUser(accessToken);
    if (!user) {
      sendJson(res, 401, { error: 'Your Community session has expired. Please sign in again.' });
      return;
    }
    const body = await readJsonBody(req);
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const link = String(body.link || '').trim();
    const category = String(body.category || '').trim();
    if (!title || title.length > 140) {
      sendJson(res, 400, { error: 'Title must be 1-140 characters.' });
      return;
    }
    if (!description || description.length > 800) {
      sendJson(res, 400, { error: 'Description must be 1-800 characters.' });
      return;
    }
    if (!/^https?:\/\//i.test(link)) {
      sendJson(res, 400, { error: 'Link must be a valid http(s) URL.' });
      return;
    }
    if (!category) {
      sendJson(res, 400, { error: 'Category is required.' });
      return;
    }
    const difficultyRaw = String(body.difficulty || '').trim();
    const difficulty = ['Beginner', 'Medium', 'Advanced'].includes(difficultyRaw) ? difficultyRaw : null;
    const prepNeeded = String(body.prepNeeded || '').trim().slice(0, 300) || null;
    const moderation = await moderateText(COMMUNITY_OPPORTUNITY_MODERATION_PROMPT, `${title}\n\n${description}\n\n${link}${prepNeeded ? `\n\nPrep needed: ${prepNeeded}` : ''}`);
    const status = moderation.safe ? 'published' : 'blocked';
    const tags = Array.isArray(body.tags) ? body.tags.map((tag) => String(tag).slice(0, 30)).slice(0, 8) : [];
    const row = await insertSupabaseRow('opportunities_shared', {
      submitted_by: user.id,
      title,
      description,
      link,
      tags,
      category,
      difficulty,
      prep_needed: prepNeeded,
      status,
      moderation_reason: moderation.safe ? null : (moderation.reason || 'This submission needs a safer rewording before it can be shared.'),
    });
    sendJson(res, 200, { opportunity: row, status, reason: moderation.safe ? '' : row.moderation_reason });
  } catch (error) {
    console.error('[Community] community-opportunity failed', error);
    sendJson(res, 500, { error: 'Could not share this opportunity right now.' });
  }
}

async function handleCommunityMentorApply(req, res) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    sendJson(res, 503, { error: 'Community is not configured yet.' });
    return;
  }
  const accessToken = bearerTokenFrom(req);
  if (!accessToken) {
    sendJson(res, 401, { error: 'Sign in to Community to apply.' });
    return;
  }
  try {
    const user = await verifySupabaseUser(accessToken);
    if (!user) {
      sendJson(res, 401, { error: 'Your Community session has expired. Please sign in again.' });
      return;
    }
    const body = await readJsonBody(req);
    const bio = String(body.bio || '').trim();
    if (bio.length < 40 || bio.length > 600) {
      sendJson(res, 400, { error: 'Your mentor bio should be between 40 and 600 characters.' });
      return;
    }
    const focusTags = Array.isArray(body.focusTags)
      ? body.focusTags.map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean).slice(0, 6)
      : [];
    const moderation = await moderateText(COMMUNITY_MENTOR_MODERATION_PROMPT, bio);
    const status = moderation.safe ? 'pending' : 'blocked';
    const row = await insertSupabaseRow('mentor_applications', {
      user_id: user.id,
      bio,
      focus_tags: focusTags,
      status,
      moderation_reason: moderation.safe ? null : (moderation.reason || 'This bio needs a safer rewording before it can be reviewed.'),
    });
    sendJson(res, 200, { application: row, status, reason: moderation.safe ? '' : row.moderation_reason });
  } catch (error) {
    console.error('[Community] community-mentor-apply failed', error);
    sendJson(res, 500, { error: 'Could not submit your mentor application right now.' });
  }
}

async function handleCommunitySkillTag(req, res) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    sendJson(res, 503, { error: 'Community is not configured yet.' });
    return;
  }
  const accessToken = bearerTokenFrom(req);
  if (!accessToken) {
    sendJson(res, 401, { error: 'Sign in to Community to use Skill Exchange.' });
    return;
  }
  try {
    const user = await verifySupabaseUser(accessToken);
    if (!user) {
      sendJson(res, 401, { error: 'Your Community session has expired. Please sign in again.' });
      return;
    }
    const body = await readJsonBody(req);
    const type = body.type === 'needed' ? 'needed' : body.type === 'offered' ? 'offered' : '';
    const category = SKILL_TAG_CATEGORIES.includes(String(body.category || '')) ? String(body.category) : '';
    const note = String(body.note || '').trim();
    if (!type) {
      sendJson(res, 400, { error: "Type must be 'offered' or 'needed'." });
      return;
    }
    if (!category) {
      sendJson(res, 400, { error: 'Pick a valid category.' });
      return;
    }
    if (note.length < 4 || note.length > 140) {
      sendJson(res, 400, { error: 'Note must be between 4 and 140 characters.' });
      return;
    }
    const moderation = await moderateText(COMMUNITY_SKILL_TAG_MODERATION_PROMPT, note);
    const status = moderation.safe ? 'published' : 'blocked';
    const row = await insertSupabaseRow('skill_tags', {
      user_id: user.id,
      type,
      category,
      note,
      status,
      moderation_reason: moderation.safe ? null : (moderation.reason || 'This note needs a safer rewording before it can be shared.'),
    });
    sendJson(res, 200, { skillTag: row, status, reason: moderation.safe ? '' : row.moderation_reason });
  } catch (error) {
    console.error('[Community] community-skill-tag failed', error);
    sendJson(res, 500, { error: 'Could not save that right now.' });
  }
}

// --- Guardian share (Supabase, service-role only, no RLS policies) --------
// Local mirror of api/guardian-share.js - see that file's header comment for
// why this table has no anon/authenticated RLS access at all.

function randomToken(bytes) {
  return require('crypto').randomBytes(bytes).toString('base64url');
}

async function supabaseRestRequest(path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request to ${path} failed (${response.status}): ${text.slice(0, 500)}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function sanitizeGuardianGoals(goals) {
  if (!Array.isArray(goals)) return [];
  return goals.slice(0, 30).map((goal) => ({
    title: String(goal.title || '').slice(0, 160),
    milestones: Array.isArray(goal.milestones) ? goal.milestones.slice(0, 24).map((milestone) => ({
      title: String(milestone.title || '').slice(0, 200),
      status: ['done', 'in-progress'].includes(milestone.status) ? milestone.status : 'pending',
    })) : [],
  }));
}

async function handleGuardianShareGet(req, res) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    sendJson(res, 503, { error: 'Guardian sharing is not configured yet.' });
    return;
  }
  const requestUrl = new URL(req.url, 'http://localhost');
  const token = String(requestUrl.searchParams.get('token') || '').trim();
  if (!token) {
    sendJson(res, 400, { error: 'Missing token.' });
    return;
  }
  try {
    const rows = await supabaseRestRequest(`guardian_shares?token=eq.${encodeURIComponent(token)}&select=goals,include_personal_blueprint,include_chat_history,include_cost_of_living,personal_blueprint,chat_history,cost_of_living,updated_at`);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) {
      sendJson(res, 404, { error: 'This share link is no longer active.' });
      return;
    }
    sendJson(res, 200, {
      goals: row.goals || [],
      personalBlueprint: row.include_personal_blueprint ? row.personal_blueprint : null,
      chatHistory: row.include_chat_history ? row.chat_history : null,
      costOfLiving: row.include_cost_of_living ? row.cost_of_living : null,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    console.error('[GuardianShare] read failed', error);
    sendJson(res, 500, { error: 'Could not load this share right now.' });
  }
}

async function handleGuardianSharePost(req, res) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    sendJson(res, 503, { error: 'Guardian sharing is not configured yet.' });
    return;
  }
  try {
    const body = await readJsonBody(req);
    const action = body.action === 'revoke' ? 'revoke' : 'publish';

    if (action === 'revoke') {
      const token = String(body.token || '').trim();
      const manageSecret = String(body.manageSecret || '').trim();
      if (!token || !manageSecret) {
        sendJson(res, 400, { error: 'Missing token or manage secret.' });
        return;
      }
      const rows = await supabaseRestRequest(`guardian_shares?token=eq.${encodeURIComponent(token)}&select=manage_secret`);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row || row.manage_secret !== manageSecret) {
        sendJson(res, 403, { error: "That link can't be managed from here." });
        return;
      }
      await supabaseRestRequest(`guardian_shares?token=eq.${encodeURIComponent(token)}`, { method: 'DELETE' });
      sendJson(res, 200, { revoked: true });
      return;
    }

    const localUserId = String(body.localUserId || '').trim().slice(0, 200);
    if (!localUserId) {
      sendJson(res, 400, { error: 'Missing local user id.' });
      return;
    }
    const goals = sanitizeGuardianGoals(body.goals);
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
      updated_at: new Date().toISOString(),
    };

    const existingToken = String(body.token || '').trim();
    const existingManageSecret = String(body.manageSecret || '').trim();

    if (existingToken && existingManageSecret) {
      const rows = await supabaseRestRequest(`guardian_shares?token=eq.${encodeURIComponent(existingToken)}&select=manage_secret`);
      const existing = Array.isArray(rows) ? rows[0] : null;
      if (!existing || existing.manage_secret !== existingManageSecret) {
        sendJson(res, 403, { error: "That link can't be managed from here." });
        return;
      }
      await supabaseRestRequest(`guardian_shares?token=eq.${encodeURIComponent(existingToken)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(row),
      });
      sendJson(res, 200, { token: existingToken });
      return;
    }

    const token = randomToken(24);
    const manageSecret = randomToken(24);
    await supabaseRestRequest('guardian_shares', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ...row, token, manage_secret: manageSecret, created_at: new Date().toISOString() }),
    });
    sendJson(res, 200, { token, manageSecret });
  } catch (error) {
    console.error('[GuardianShare] publish/revoke failed', error);
    sendJson(res, 500, { error: 'Could not save that share right now.' });
  }
}

const COMMUNITY_ROUTES = new Set(['/api/community-config', '/api/community-post', '/api/community-opportunity', '/api/community-mentor-apply', '/api/community-skill-tag']);

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/compass-chat' && req.method === 'OPTIONS') {
      sendCorsPreflight(res);
      return;
    }
    if (url.pathname === '/api/compass-chat' && req.method === 'POST') {
      await handleCompassChat(req, res);
      return;
    }
    if (COMMUNITY_ROUTES.has(url.pathname) && req.method === 'OPTIONS') {
      sendCorsPreflight(res);
      return;
    }
    if (url.pathname === '/api/community-config' && req.method === 'GET') {
      await handleCommunityConfig(req, res);
      return;
    }
    if (url.pathname === '/api/community-post' && req.method === 'POST') {
      await handleCommunityPost(req, res);
      return;
    }
    if (url.pathname === '/api/community-opportunity' && req.method === 'POST') {
      await handleCommunityOpportunity(req, res);
      return;
    }
    if (url.pathname === '/api/community-mentor-apply' && req.method === 'POST') {
      await handleCommunityMentorApply(req, res);
      return;
    }
    if (url.pathname === '/api/community-skill-tag' && req.method === 'POST') {
      await handleCommunitySkillTag(req, res);
      return;
    }
    if (url.pathname === '/api/guardian-share' && req.method === 'OPTIONS') {
      sendCorsPreflight(res);
      return;
    }
    if (url.pathname === '/api/guardian-share' && req.method === 'GET') {
      await handleGuardianShareGet(req, res);
      return;
    }
    if (url.pathname === '/api/guardian-share' && req.method === 'POST') {
      await handleGuardianSharePost(req, res);
      return;
    }

    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';

    const file = path.normalize(path.join(root, pathname));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(file, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      res.writeHead(200, {
        'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
      });
      res.end(data);
    });
  })
  .listen(port, '0.0.0.0', () => {
    console.log(`Compass local server running at http://localhost:${port}/`);
    console.log(`Compass AI provider: ${provider}`);
    const activeModel = provider === 'openai' ? openaiModel : provider === 'gemini' ? geminiModel : groqModel;
    console.log(`Compass AI model: ${activeModel}`);
    if (provider === 'groq' && !groqApiKey) console.log('GROQ_API_KEY is not set yet. Compass AI chat will return a setup error until you add it.');
    if (provider === 'gemini' && !geminiApiKey) console.log('GEMINI_API_KEY is not set yet. Compass AI chat will return a setup error until you add it.');
    if (provider === 'openai' && !openaiApiKey) console.log('OPENAI_API_KEY is not set yet. Compass AI chat will return a setup error until you add it.');
    console.log(anthropicApiKey ? 'ANTHROPIC_API_KEY is set - Compass AI chat will try Claude first.' : `ANTHROPIC_API_KEY is not set - Compass AI chat will use ${provider} until you add it.`);
  });
