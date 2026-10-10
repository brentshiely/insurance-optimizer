#!/usr/bin/env python3
"""Developer helper for RE-RECORDING the browser goldens. Not needed to replay them.

Serves the repo root like `python3 -m http.server` (127.0.0.1 only, Cache-Control: no-store) and
additionally accepts `POST /__golden/<scenarioId>`, which writes the request body to
tests/browser/golden/<scenarioId>.mjs. golden.html?record=1&post=1 uses it so nobody has to copy
hundreds of KB of golden text by hand.

    python3 tests/browser/record-server.py [port]      # default port 8200

Safety: loopback only; the POST must come from this same origin; the id must match [a-z0-9-]+;
the body is capped at 4 MB; nothing outside tests/browser/golden/ can be written.
"""
import http.server
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GOLDEN_DIR = os.path.join(ROOT, "tests", "browser", "golden")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8200
MAX_BODY = 4 * 1024 * 1024


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):  # keep the terminal quiet
        pass

    def _reply(self, code, msg):
        body = msg.encode()
        self.send_response(code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        m = re.fullmatch(r"/__golden/([a-z0-9-]+)", self.path)
        if not m:
            return self._reply(404, "not found")
        allowed = {f"http://127.0.0.1:{PORT}", f"http://localhost:{PORT}"}
        if self.headers.get("Origin") not in allowed:
            return self._reply(403, "cross-origin write refused")
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self._reply(413, "bad body size")
        text = self.rfile.read(length).decode("utf-8")
        if not text.startswith("// Golden master") or "export default [" not in text:
            return self._reply(400, "body is not a golden file")
        os.makedirs(GOLDEN_DIR, exist_ok=True)
        with open(os.path.join(GOLDEN_DIR, m.group(1) + ".mjs"), "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        self._reply(200, "ok")


if __name__ == "__main__":
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"serving {ROOT} on http://127.0.0.1:{PORT}/ (golden recording enabled)", flush=True)
    srv.serve_forever()
