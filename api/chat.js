// api/chat.js  —  Gemini 1.5 Flash streaming endpoint
// Receives conversation history + detected language
// Streams SSE back to the frontend (same format as before)

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const SYSTEM_PROMPT = `You are a friendly, conversational AI assistant.
Rules:
- ALWAYS respond in the SAME language the user used (Arabic → Arabic, English → English)
- Keep responses short and natural: 1–3 sentences max
- Be warm, direct, and helpful
- Never mention that you are an AI unless asked
- For Arabic responses, use Modern Standard Arabic (فصحى) unless the user uses a specific dialect`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, lang } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid messages array' });
  }

  // Validate and sanitize messages
  const safeMessages = messages
    .filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim())
    .slice(-12);

  if (safeMessages.length === 0) {
    return res.status(400).json({ error: 'No valid messages' });
  }

  // Gemini requires role = 'user' | 'model' (not 'assistant')
  // History = all messages except the last user message
  // Last user message is sent separately via sendMessageStream
  const lastMsg = safeMessages[safeMessages.length - 1];
  if (lastMsg.role !== 'user') {
    return res.status(400).json({ error: 'Last message must be from user' });
  }

  // Build Gemini chat history (all except last message)
  // Gemini requires strict alternation: user → model → user → model
  // We enforce this by filtering out consecutive same-role messages
  const rawHistory = safeMessages.slice(0, -1);
  const geminiHistory = [];
  let lastRole = null;

  for (const msg of rawHistory) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    if (role === lastRole) continue; // skip duplicates to maintain alternation
    geminiHistory.push({ role, parts: [{ text: msg.content }] });
    lastRole = role;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        maxOutputTokens: 250,
        temperature: 0.75,
        topP: 0.9
      }
    });

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessageStream(lastMsg.content);

    // Stream chunks as SSE — same format the frontend already parses
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        const data = JSON.stringify({
          choices: [{ delta: { content: text } }]
        });
        res.write(`data: ${data}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    console.error('[chat] Gemini error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI service error', detail: err.message });
    } else {
      res.write(`data: [ERROR] ${err.message}\n\n`);
      res.end();
    }
  }
}
