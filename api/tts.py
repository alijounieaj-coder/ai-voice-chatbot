# api/tts.py — Microsoft Edge TTS (edge-tts)
# Completely free, no API key, no account needed
# Arabic: ar-SA-HamedNeural (male) / ar-SA-ZariyahNeural (female)
# English: en-US-ChristopherNeural (male) / en-US-JennyNeural (female)

from http.server import BaseHTTPRequestHandler
import json
import asyncio
import edge_tts

VOICE_EN = 'en-US-ChristopherNeural'
VOICE_AR = 'ar-SA-HamedNeural'

async def synthesize(text, voice):
    communicate = edge_tts.Communicate(text, voice)
    audio = b''
    async for chunk in communicate.stream():
        if chunk['type'] == 'audio':
            audio += chunk['data']
    return audio

class handler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass  # suppress access logs

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body   = json.loads(self.rfile.read(length))
            text   = body.get('text', '').strip()[:2500]
            lang   = body.get('lang', 'en')

            if not text:
                self.send_response(400)
                self._cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error":"Missing text"}')
                return

            voice = VOICE_AR if lang == 'ar' else VOICE_EN
            audio = asyncio.run(synthesize(text, voice))

            self.send_response(200)
            self._cors()
            self.send_header('Content-Type', 'audio/mpeg')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(audio)

        except Exception as e:
            self.send_response(500)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
