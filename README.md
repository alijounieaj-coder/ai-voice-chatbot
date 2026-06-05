# AI Voice Chatbot

Mobile-first voice assistant with Arabic/English support and canvas avatar.
**Stack:** Gemini 1.5 Flash (AI, free) · ElevenLabs (TTS, voice clone) · Web Speech API (STT, free) · Vercel (hosting, free)

---

## Architecture

```
Browser (Mobile Web)
  │
  ├─ Web Speech API     ──── Real-time STT (free, built-in Chrome/Safari)
  ├─ Web Audio API      ──── VAD + avatar mouth animation
  ├─ Canvas API         ──── Avatar: photo + ring + mouth animation
  │
  ▼
Vercel Serverless
  ├─ /api/chat   ─────────── Gemini 1.5 Flash (SSE streaming, free)
  └─ /api/tts    ─────────── ElevenLabs proxy (audio stream)
```

### Feature Summary

| Feature | How |
|---|---|
| STT | Web Speech API — free, browser-native, real-time |
| Language detect | Arabic Unicode range check in browser |
| AI | Gemini 1.5 Flash — free tier: 1,500 req/day |
| TTS | Fish Audio — voice cloning free, Arabic + English |
| VAD / Interrupt | Web Audio API energy threshold — stops AI mid-sentence |
| Avatar | Canvas: circular photo + CSS rings + mouth region amplitude animation |
| Memory | Last 12 messages sent per request (client-side) |

---

## Setup

### Step 1 — Get API Keys (all free)

**Google Gemini (AI)**
1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API Key**
3. Copy it

**Fish Audio (Voice — free, includes voice cloning)**
1. Create account at https://fish.audio (free)
2. Go to https://fish.audio/app/api-keys → create key → copy it
3. Clone your voice:
   - Go to https://fish.audio → **My Voices → Create Voice**
   - Upload 10 seconds to 3 minutes of clean audio (your voice, quiet room)
   - Save → click your voice → copy the **Voice ID** from the URL
   - URL looks like: `fish.audio/m/abc123xyz...` — that string is your Voice ID

### Step 2 — Install & Run Locally

```bash
# In the project folder:
npm install

# Copy env template and fill in your keys
cp .env.example .env.local
# Edit .env.local — add your GOOGLE_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID

# Run dev server
npx vercel dev
# → Open http://localhost:3000
```

### Step 3 — Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel

# Add environment variables
vercel env add GOOGLE_API_KEY
vercel env add FISH_AUDIO_API_KEY
vercel env add FISH_AUDIO_VOICE_ID
# Optional: vercel env add FISH_AUDIO_VOICE_ID_AR

# Deploy to production
vercel --prod
```

Your live URL appears in the output (e.g. `https://your-project.vercel.app`).
Open on your phone — no login required.

---

## How to Use

1. Open the URL on your phone (Chrome on Android / Safari on iPhone)
2. **Tap the avatar photo area** → pick your photo from gallery
3. **Tap 🎤** → allow microphone
4. Speak in Arabic or English — auto-detected
5. AI responds in your cloned voice
6. **Interrupt** the AI at any time by speaking — stops immediately

**Keyboard shortcut (desktop):** Space to toggle mic

---

## Avatar States

| State | Ring color | Canvas |
|---|---|---|
| Idle | Grey border | Static photo |
| Listening | Green expanding pulse | Static photo |
| Thinking | Blue rotating arc | Static photo |
| Speaking | Amber fast pulse | Mouth region scales with voice amplitude |

---

## Tuning

**Interrupt sensitivity** — `public/index.html` ~line 175:
```js
const VAD_THRESHOLD = 22;   // lower = more sensitive (default 22)
const VAD_COOLDOWN  = 700;  // ms grace period after AI starts speaking
```

**Mouth animation intensity** — `public/index.html` ~line 100:
```js
const MOUTH_START   = 0.60;  // where mouth region starts (0 = top, 1 = bottom)
const MAX_MOUTH_OPEN = 0.10;  // max expansion — increase for more dramatic effect
```

**AI tone & length** — `api/chat.js`:
- Edit `SYSTEM_PROMPT` for personality
- Change `maxOutputTokens` for longer/shorter responses

**Voice quality** — `api/tts.js`:
```js
stability:        0.50,  // 0.3–0.7 feels natural
similarity_boost: 0.80,  // closeness to your cloned voice
```

---

## Free Tier Limits

| Service | Free Tier | Notes |
|---|---|---|
| Google Gemini 1.5 Flash | 1,500 req/day, 15 RPM | Resets daily |
| Fish Audio | ~7 min/month TTS, voice cloning free | Resets monthly |
| Vercel | Unlimited functions, 100GB bandwidth | No credit card needed |

---

## Troubleshooting

| Issue | Fix |
|---|---|
| STT not working | Use Chrome (Android) or Safari (iOS) |
| No mic on iPhone | Must use Safari — iOS blocks mic in Chrome |
| No audio plays | Check FISH_AUDIO_API_KEY + FISH_AUDIO_VOICE_ID in Vercel |
| AI not responding | Check GOOGLE_API_KEY is valid and has quota |
| Interrupt not working | Lower VAD_THRESHOLD (try 15) |
| Arabic not recognized | Speak clearly; STT set to `ar-SA` |
| Photo doesn't load | Use JPG or PNG under 10MB |
| Mouth barely moves | Increase MAX_MOUTH_OPEN to 0.18–0.25 |

---

## File Structure

```
├── public/
│   └── index.html      # Full frontend: UI + avatar + STT + audio
├── api/
│   ├── chat.js         # Gemini 1.5 Flash streaming endpoint
│   └── tts.js          # ElevenLabs TTS proxy
├── package.json
├── vercel.json
├── .env.example
└── README.md
```
