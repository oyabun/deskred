#!/usr/bin/env python3
"""
Nexus Report Browser - Standalone Web Interface
Simple HTTP server serving static HTML for browsing cached reports
"""
import http.server
import socketserver
import os

PORT = 8080

class NexusHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == "__main__":
    os.chdir('/app')
    with socketserver.TCPServer(("", PORT), NexusHandler) as httpd:
        print(f"Nexus Report Browser running on port {PORT}")
        print(f"Open http://localhost:{PORT} in your browser")
        httpd.serve_forever()
