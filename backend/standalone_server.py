#!/usr/bin/env python3
"""Standalone Python HTTP Server for WinGo Signal Analyzer (Zero External Dependencies)."""
import http.server
import socketserver
import json
import urllib.parse
from app.services.wingo_client import wingo_client, MODE_TYPE_MAP
from app.services.sync_service import sync_service
from app.database.session import init_db, get_telemetry_stats
from app.security.auth import verify_password, create_access_token
from app.config.settings import settings

PORT = 8000

class WinGoHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip('/')

        if path == "/api/status" or path == "/api/wingo/status":
            stats = get_telemetry_stats()
            return self._send_json({
                "api_connected": wingo_client.is_connected,
                "upstream_gateway": wingo_client.base_url,
                "last_sync_time": wingo_client.last_sync_time,
                "clock_drift_ms": wingo_client.clock_drift_ms,
                "supported_modes": list(MODE_TYPE_MAP.keys()),
                "mode_counts": stats["mode_counts"],
                "telemetry_summary": stats["stats"]
            })

        # Match /api/wingo/<mode>/current
        parts = path.split('/')
        if len(parts) >= 4 and parts[1] == "api" and parts[2] == "wingo":
            mode = parts[3]
            endpoint = parts[4] if len(parts) > 4 else ""
            if mode in MODE_TYPE_MAP:
                data = sync_service.get_cached(mode)
                if endpoint == "current":
                    return self._send_json(data["issue"])
                elif endpoint == "history":
                    return self._send_json({
                        "game_mode": mode,
                        "total_items": len(data["history"]),
                        "records": data["history"]
                    })
                elif endpoint == "analysis":
                    return self._send_json(data["analysis"])

        self._send_json({"error": "Endpoint not found", "path": self.path}, 404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip('/')
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        if path == "/api/admin/login":
            username = payload.get("username", "")
            password = payload.get("password", "")
            if username == settings.ADMIN_USERNAME and verify_password(password, settings.ADMIN_PASSWORD_HASH):
                token = create_access_token({"sub": username, "role": "admin"})
                return self._send_json({
                    "access_token": token,
                    "token_type": "Bearer",
                    "username": username,
                    "expires_in": 86400
                })
            return self._send_json({"detail": "Invalid username or password"}, 401)

        self._send_json({"error": "Not found"}, 404)

if __name__ == "__main__":
    init_db()
    with socketserver.TCPServer(("", PORT), WinGoHandler) as httpd:
        print(f"Standalone WinGo Python Server running on port {PORT}")
        httpd.serve_forever()
