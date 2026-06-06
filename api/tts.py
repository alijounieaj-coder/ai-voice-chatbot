# api/tts.py — Hugging Face TTS (100% free, no credit card)
# Arabic : facebook/mms-tts-ara  (Meta Massively Multilingual Speech)
# English: facebook/mms-tts-eng

from http.server import BaseHTTPRequestHandler
import json, os, urllib.request, urllib.error

MODEL_AR = 'facebook/mms-tts-ara'
MODEL_EN = 'facebook/mms-tts-eng'
HF_BASE  = 'https://api-inference.huggingface.co/models/'

class handler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass

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
                self._json(400, {'error': 'Missing text'})
                return

            api_key = os.environ.get('HUGGINGFACE_API_KEY', '')
            model   = MODEL_AR if lang == 'ar' else MODEL_EN

            req = urllib.request.Request(
                HF_BASE + model,
                data    = json.dumps({'inputs': text}).encode(),
                method  = 'POST',
                headers = {
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type' : 'application/json'
                }
            )

            with urllib.request.urlopen(req, timeout=30) as resp:
                audio        = resp.read()
                content_type = resp.headers.get('Content-Type', 'audio/flac')

            self.send_response(200)
            self._cors()
            self.send_header('Content-Type', content_type)
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(audio)

        except urllib.error.HTTPError as e:
            self._json(502, {'error': f'HF error {e.code}: {e.read().decode()[:200]}'})
        except Exception as e:
            self._json(500, {'error': str(e)})

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json(self, code, obj):
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(obj).encode())
