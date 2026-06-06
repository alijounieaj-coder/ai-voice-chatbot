// api/tts.js — ElevenLabs TTS proxy
// Free tier: 10,000 chars/month, instant voice cloning, Arabic + English
// Sign up free: https://elevenlabs.io
// Model: eleven_multilingual_v2 (covers Arabic + English natively)

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
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing text' });
  }

  const apiKey  = process.env.ELEVENLABS_API_KEY;
  const voiceId = (lang === 'ar' && process.env.ELEVENLABS_VOICE_ID_AR)
    ? process.env.ELEVENLABS_VOICE_ID_AR
    : process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey)   return res.status(500).json({ error: 'ELEVENLABS_API_KEY not set' });
  if (!voiceId)  return res.status(500).json({ error: 'ELEVENLABS_VOICE_ID not set' });

  try {
    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key':   apiKey,
          'Content-Type': 'application/json',
          'Accept':       'audio/mpeg'
        },
        body: JSON.stringify({
          text:     text.trim().slice(0, 2500),
          model_id: 'eleven_multilingual_v2',   // Arabic + English
          voice_settings: {
            stability:        0.50,
            similarity_boost: 0.85,
            style:            0.00,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!elRes.ok) {
      const errText = await elRes.text();
      console.error('[tts] ElevenLabs error:', elRes.status, errText);
      return res.status(502).json({
        error:  'TTS provider error',
        status: elRes.status,
        detail: errText.slice(0, 300)
      });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const reader = elRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();

  } catch (err) {
    console.error('[tts] Error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else res.end();
  }
}
