// api/tts.js — Gemini 2.0 Flash TTS
// Uses your existing GOOGLE_API_KEY — free, high quality, Arabic + English
// Voice: Puck (natural male voice)

const MODEL = 'gemini-2.0-flash-exp';
const BASE  = 'https://generativelanguage.googleapis.com/v1beta/models';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, lang } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Missing text' });

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_API_KEY not set' });

  try {
    const geminiRes = await fetch(`${BASE}/${MODEL}:generateContent?key=${apiKey}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role:  'user',
          parts: [{ text: text.trim().slice(0, 2000) }]
        }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' } // natural male voice
            }
          }
        }
      })
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error('[TTS Gemini]', geminiRes.status, err);
      return res.status(502).json({ error: `Gemini ${geminiRes.status}`, detail: err.slice(0, 300) });
    }

    const data = await geminiRes.json();
    const part = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!part?.data) {
      return res.status(502).json({ error: 'No audio returned', raw: JSON.stringify(data).slice(0, 300) });
    }

    const audio    = Buffer.from(part.data, 'base64');
    const mimeType = part.mimeType || 'audio/wav';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(audio);

  } catch (err) {
    console.error('[TTS Gemini] fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
