// api/tts.js — Hugging Face TTS (free, no credit card)
// Arabic : facebook/mms-tts-ara
// English: facebook/mms-tts-eng

const MODEL_AR = 'facebook/mms-tts-ara';
const MODEL_EN = 'facebook/mms-tts-eng';
const HF_BASE  = 'https://api-inference.huggingface.co/models/';

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

  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'HUGGINGFACE_API_KEY not set' });

  const model = lang === 'ar' ? MODEL_AR : MODEL_EN;

  try {
    const hfRes = await fetch(HF_BASE + model, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ inputs: text.trim().slice(0, 2500) })
    });

    if (!hfRes.ok) {
      const err = await hfRes.text();
      return res.status(502).json({ error: `HF error ${hfRes.status}`, detail: err.slice(0, 200) });
    }

    const audio       = await hfRes.arrayBuffer();
    const contentType = hfRes.headers.get('content-type') || 'audio/flac';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(Buffer.from(audio));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
