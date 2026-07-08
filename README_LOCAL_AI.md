# Compass AI Local Setup

Compass AI now uses a real backend API route. Groq is the default provider for this school project because it has a free development option.

Do not open only `index.html` with `file://` if you want the most reliable AI chat. Start the local server and open `http://localhost:5179/`.

## 1. Get a Groq API key

Create a Groq API key:

```text
https://console.groq.com/keys
```

## 2. Add your API key

Open PowerShell:

```powershell
cd C:\Users\HP\Documents\Codex\2026-06-21\thi\outputs\life-compass-ui
copy .env.example .env
```

Open `.env` and set:

```text
COMPASS_AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
PORT=5179
```

Replace `your_groq_api_key_here` with your real Groq API key.

## 3. Start the local backend

Run:

```powershell
cd C:\Users\HP\Documents\Codex\2026-06-21\thi\outputs\life-compass-ui
.\start-compass-ai.ps1
```

Or, if Node.js is installed:

```powershell
cd C:\Users\HP\Documents\Codex\2026-06-21\thi\outputs\life-compass-ui
npm start
```

## 4. Open the app

Open:

```text
http://localhost:5179/
```

## 5. Share a temporary public mobile link

For school demos, you can create a temporary public URL without router setup or port forwarding:

```powershell
cd C:\Users\HP\Documents\Codex\2026-06-21\thi\outputs\life-compass-ui
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\share-compass-public.ps1
```

Copy the `https://...trycloudflare.com` link that appears in PowerShell and send it to mobile users.

Keep that PowerShell window open while others use the app. Press `Ctrl+C` to stop sharing.

This public tunnel is best for testing and presentation demos. Anyone with the link can open the app while the tunnel is running.

## 6. Deploy permanently to Vercel

To create a public Vercel URL that stays online:

```powershell
cd C:\Users\HP\Documents\Codex\2026-06-21\thi\outputs\life-compass-ui
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\deploy-to-vercel.ps1
```

The script will:

- Ask you to log in to Vercel if needed.
- Deploy the app as `compass-future-reflection`.
- Send your Groq settings to Vercel as runtime environment variables.
- Print the final `https://...vercel.app` public URL.

Your `.env` file is ignored and is not uploaded.

Compass AI sends the user message and conversation history to:

```text
POST /api/compass-chat
```

The backend calls Groq Chat Completions and returns the AI response to the chat UI.

## Chat memory rules

Compass AI only uses:

- Recent messages in the current chat session.
- Saved Compass AI profile fields that the user filled in.
- Relevant chunks from uploaded PDFs.

It should not invent hidden memory, mood, goals, name, personality, or previous messages.

Use **Clear chat** in Compass AI to remove the current chat history and uploaded document memory.

## Profile, voice, and PDF features

In Compass AI:

- Use **Edit AI profile** to save optional profile fields such as goals, interests, stress triggers, and preferred support style.
- Use **Mic** for browser speech recognition. If the browser supports it, speech is placed into the chat input before sending.
- Use **PDF** to upload notes, worksheets, or project documents.

PDF text is split into chunks. When you ask a question, the app sends only the most relevant chunks to Groq instead of sending the whole PDF every time. If Compass AI uses the uploaded document, it should say:

```text
Based on your uploaded document...
```

PDF extraction uses browser PDF.js when available. If the PDF is scanned as images, text extraction may not work; use a text-based PDF or paste the important notes into chat.

## Optional: Use Gemini instead

Change `.env`:

```text
COMPASS_AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

Then restart the server.

## Optional: Use OpenAI instead

Change `.env`:

```text
COMPASS_AI_PROVIDER=openai
OPENAI_API_KEY=sk-your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
```

Then restart the server.

## Debugging

If Compass AI fails:

- Check the browser console for `[Compass AI] Request failed`.
- Check the PowerShell window running the server for `[Compass AI] Groq API error`.
- Make sure `.env` exists.
- Make sure `GROQ_API_KEY` is not still `your_groq_api_key_here`.
- Make sure you opened `http://localhost:5179/`, not only the `file://` version.
