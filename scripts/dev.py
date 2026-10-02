#!/usr/bin/env python3
"""Static dev server with no-store caching. There is no Node on this Mac.
Usage: python3 scripts/dev.py [port]"""
import http.server, socketserver, sys

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
    def log_message(self, *a):
        pass

port = int(sys.argv[1]) if len(sys.argv) > 1 else 4180
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", port), Handler) as srv:
    print(f"http://localhost:{port}")
    srv.serve_forever()
