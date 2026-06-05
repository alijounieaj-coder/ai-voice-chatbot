// api/tts.js  —  Fish Audio TTS proxy
// Proxies text → Fish Audio API → streams audio/mpeg back to client
// Fish Audio free tier: voice cloning included, ~7 min/month
// Docs: https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, lang } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Missing text' });
  }

  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'FISH_AUDIO_API_KEY not set in environment' });
  }

  // Use separate voice ID for Arabic if provided, otherwise use default
  const voiceId = (lang === 'ar' && process.env.FISH_AUDIO_VOICE_ID_AR)
    ? process.env.FISH_AUDIO_VOICE_ID_AR
    : process.env.FISH_AUDIO_VOICE_ID;

  if (!voiceId) {
    return res.status(500).json({ error: 'FISH_AUDIO_VOICE_ID not set in environment' });
  }

  try {
    const fishRes = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text:         text.trim().slice(0, 1000), // safety cap
        reference_id: voiceId,                    // your cloned voice ID
        format:       'mp3',
        mp3_bitrate:  128,
        latency:      'normal',                   // 'normal' or 'balanced'
        prosody: {
          speed:   1.0,   // 0.5–2.0
          volume:  0      // dB adjustment, 0 = unchanged
        }
      })
    });

    if (!fishRes.ok) {
      const errText = await fishRes.text();
      console.error('[tts] Fish Audio error:', fishRes.status, errText);
      return res.status(502).json({
        error:  'TTS provider error',
        status: fishRes.status,
        detail: errText.slice(0, 200)
      });
    }

    // Stream audio back to client
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const reader = fishRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();

  } catch (err) {
    console.error('[tts] Fetch error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'TTS service error', detail: err.message });
    } else {
      res.end();
    }
  }
}
