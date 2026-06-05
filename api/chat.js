// api/chat.js  —  Groq (Llama 3.3 70B) streaming endpoint
// Free tier: 14,400 requests/day, excellent Arabic + English support
// Uses OpenAI-compatible API — no extra SDK needed

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not set in environment' });
  }

  // Validate and sanitize messages
  const safeMessages = messages
    .filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim())
    .slice(-12);

  if (safeMessages.length === 0) {
    return res.status(400).json({ error: 'No valid messages' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        stream:      true,
        max_tokens:  250,
        temperature: 0.75,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...safeMessages
        ]
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[chat] Groq error:', groqRes.status, errText);
      if (!res.headersSent) {
        return res.status(502).json({ error: 'AI service error', detail: errText.slice(0, 200) });
      }
      return res.end();
    }

    // Pipe Groq SSE stream directly to client — same format as OpenAI
    const reader = groqRes.body.getReader();
    const dec    = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(dec.decode(value, { stream: true }));
    }

    res.end();

  } catch (err) {
    console.error('[chat] Groq fetch error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI service error', detail: err.message });
    } else {
      res.write(`data: [ERROR] ${err.message}\n\n`);
      res.end();
    }
  }
}
