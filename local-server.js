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

async function callGemini({ systemPrompt, messages, context }) {
  if (!geminiApiKey) {
    console.error('[Compass AI] GEMINI_API_KEY is missing. Add it to .env or your shell environment.');
    return { status: 503, payload: { error: 'GEMINI_API_KEY is not configured.' } };
  }

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
  const reply = extractGeminiText(data);
  if (!reply) {
    console.error('[Compass AI] Gemini returned an empty response', JSON.stringify(data).slice(0, 1200));
    return { status: 502, payload: { error: 'Gemini provider returned an empty response.' } };
  }
  return { status: 200, payload: { reply, provider: 'gemini', model: geminiModel } };
}

async function callGroq({ systemPrompt, messages, context }) {
  if (!groqApiKey) {
    console.error('[Compass AI] GROQ_API_KEY is missing. Add it to .env or your shell environment.');
    return { status: 503, payload: { error: 'GROQ_API_KEY is not configured.' } };
  }

  const apiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: groqModel,
      messages: buildChatMessages(systemPrompt, messages, context),
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
  const reply = extractChatCompletionText(data);
  if (!reply) {
    console.error('[Compass AI] Groq returned an empty response', JSON.stringify(data).slice(0, 1200));
    return { status: 502, payload: { error: 'Groq provider returned an empty response.' } };
  }
  return { status: 200, payload: { reply, provider: 'groq', model: groqModel } };
}

async function callOpenAI({ systemPrompt, messages, context }) {
  if (!openaiApiKey) {
    console.error('[Compass AI] OPENAI_API_KEY is missing. Add it to .env or your shell environment.');
    return { status: 503, payload: { error: 'OPENAI_API_KEY is not configured.' } };
  }

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
  const reply = extractResponseText(data);
  if (!reply) {
    console.error('[Compass AI] OpenAI returned an empty response', JSON.stringify(data).slice(0, 1200));
    return { status: 502, payload: { error: 'OpenAI provider returned an empty response.' } };
  }
  return { status: 200, payload: { reply, provider: 'openai', model: openaiModel } };
}

function providerOrder() {
  return [provider, 'groq', 'gemini', 'openai']
    .filter(Boolean)
    .filter((name, index, list) => list.indexOf(name) === index);
}

function providerHasKey(name) {
  if (name === 'openai') return Boolean(openaiApiKey);
  if (name === 'gemini') return Boolean(geminiApiKey);
  return Boolean(groqApiKey);
}

async function callProvider(name, args) {
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
    const systemPrompt = String(body.systemPrompt || '').slice(0, 1600);
    const context = body.context ? JSON.stringify(body.context).slice(0, 8000) : '{}';

    const result = await callConfiguredProvider({ systemPrompt, messages, context });
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
    const moderation = await moderateText(COMMUNITY_OPPORTUNITY_MODERATION_PROMPT, `${title}\n\n${description}\n\n${link}`);
    const status = moderation.safe ? 'published' : 'blocked';
    const tags = Array.isArray(body.tags) ? body.tags.map((tag) => String(tag).slice(0, 30)).slice(0, 8) : [];
    const row = await insertSupabaseRow('opportunities_shared', {
      submitted_by: user.id,
      title,
      description,
      link,
      tags,
      category,
      status,
      moderation_reason: moderation.safe ? null : (moderation.reason || 'This submission needs a safer rewording before it can be shared.'),
    });
    sendJson(res, 200, { opportunity: row, status, reason: moderation.safe ? '' : row.moderation_reason });
  } catch (error) {
    console.error('[Community] community-opportunity failed', error);
    sendJson(res, 500, { error: 'Could not share this opportunity right now.' });
  }
}

const COMMUNITY_ROUTES = new Set(['/api/community-config', '/api/community-post', '/api/community-opportunity']);

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
  });
