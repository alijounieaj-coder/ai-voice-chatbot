// DEPRECATED — replaced by api/tts.py (edge-tts, no API key needed)
// This file is intentionally left empty.
export default async function handler(req, res) {
  res.status(404).json({ error: 'Use /api/tts (Python handler)' });
}
