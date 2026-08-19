#!/usr/bin/env python3
"""
agent-07 web server.

Serves the static site from ./site/ on port 80, plus a /api/status endpoint
that reports live telemetry: recent git commits, session count, visitor stats,
and server uptime.
"""
import http.server
import json
import os
import subprocess
import time
import socketserver
from datetime import datetime, timezone
from pathlib import Path

SITE_DIR = Path(__file__).resolve().parent.parent / "site"
PROJECT_DIR = Path(__file__).resolve().parent.parent
AGENT_HOME = Path("/home/agent")
HERMES_DIR = AGENT_HOME / ".hermes"
PORT = 80
SERVER_START = datetime.now(timezone.utc)

# Cache for git and stats data (refresh every 60 seconds)
_cache = {"data": None, "ts": 0}
CACHE_TTL = 60


def get_git_commits(limit=8):
    """Get recent git commits from the project repo."""
    commits = []
    try:
        log = subprocess.run(
            ["git", "log", f"--max-count={limit}", "--pretty=format:%H|%s|%ct|%an"],
            capture_output=True, text=True, cwd=str(PROJECT_DIR), timeout=5
        )
        if log.returncode == 0:
            for line in log.stdout.strip().split("\n"):
                parts = line.split("|", 3)
                if len(parts) >= 4:
                    hash_val, message, ts, author = parts
                    # Get files changed
                    files = subprocess.run(
                        ["git", "show", "--stat", "--pretty=format:", hash_val],
                        capture_output=True, text=True, cwd=str(PROJECT_DIR), timeout=5
                    )
                    file_names = []
                    for fline in files.stdout.strip().split("\n"):
                        fline = fline.strip()
                        if fline and "|" in fline:
                            fname = fline.split("|")[0].strip()
                            if fname:
                                file_names.append(fname)
                    commits.append({
                        "hash": hash_val[:7],
                        "message": message,
                        "timestamp": int(ts),
                        "author": author,
                        "files": " · ".join(file_names[:6])
                    })
    except Exception:
        pass
    return commits


def get_commit_count():
    try:
        r = subprocess.run(["git", "rev-list", "--count", "HEAD"],
                          capture_output=True, text=True, cwd=str(PROJECT_DIR), timeout=5)
        if r.returncode == 0:
            return int(r.stdout.strip())
    except Exception:
        pass
    return 0


def get_session_count():
    """Count session files in /home/agent/.hermes/sessions/"""
    try:
        sessions_dir = HERMES_DIR / "sessions"
        if sessions_dir.exists():
            return len(list(sessions_dir.glob("*.json")))
    except Exception:
        pass
    return 0


def get_last_session_time():
    """Get the most recent session modification time."""
    try:
        sessions_dir = HERMES_DIR / "sessions"
        if sessions_dir.exists():
            files = list(sessions_dir.glob("*.json"))
            if files:
                latest = max(files, key=lambda f: f.stat().st_mtime)
                return datetime.fromtimestamp(latest.stat().st_mtime, tz=timezone.utc).isoformat()
    except Exception:
        pass
    return None


def get_status_data():
    """Collect all status data, with caching."""
    now = time.time()
    if _cache["data"] and (now - _cache["ts"]) < CACHE_TTL:
        return _cache["data"]

    data = {
        "agent": "agent-07",
        "last_session": get_last_session_time(),
        "commits": get_git_commits(),
        "commit_count": get_commit_count(),
        "session_count": get_session_count(),
        "visitors_24h": 0,
        "server_start": SERVER_START.isoformat(),
        "server_uptime_seconds": (now - SERVER_START.timestamp()),
    }

    # Try to get visitor stats from the stats endpoint
    try:
        env_path = HERMES_DIR / ".env"
        hook_secret = None
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                if line.startswith("HOOK_SECRET="):
                    hook_secret = line.split("=", 1)[1].strip()
                    break

        if hook_secret:
            sig = subprocess.run(
                f"printf '' | openssl dgst -sha256 -hmac '{hook_secret}' | awk '{{print $2}}'",
                capture_output=True, text=True, shell=True, timeout=5
            ).stdout.strip()

            stats_res = subprocess.run(
                f"curl -s http://10.0.0.18/api/v1/stats -H 'X-Agent: agent-07' -H 'X-Hermes-Signature-256: sha256={sig}'",
                capture_output=True, text=True, shell=True, timeout=10
            )
            if stats_res.returncode == 0 and stats_res.stdout:
                stats = json.loads(stats_res.stdout)
                if "data" in stats and stats["data"]:
                    data["visitors_24h"] = stats["data"].get("visitors", 0)
    except Exception:
        pass

    _cache["data"] = data
    _cache["ts"] = now
    return data


class AgentHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE_DIR), **kwargs)

    def end_headers(self):
        """Add security headers to all responses."""
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        super().end_headers()

    def do_GET(self):
        if self.path == "/api/status":
            self.handle_api_status()
        elif self.path == "/api/health":
            self.handle_health()
        elif self.path == "/lab":
            # Clean URL: /lab -> /lab.html
            self.path = "/lab.html"
            super().do_GET()
        else:
            super().do_GET()

    def send_error(self, code, message=None, explain=None):
        """Serve custom 404 page instead of default error page."""
        if code == 404:
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            try:
                with open(SITE_DIR / "404.html", "rb") as f:
                    self.wfile.write(f.read())
            except Exception:
                self.wfile.write(b"<h1>404 Not Found</h1>")
        else:
            super().send_error(code, message, explain)

    def handle_api_status(self):
        data = get_status_data()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode())

    def handle_health(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"status": "ok"}).encode())

    def log_message(self, format, *args):
        # Minimal logging
        pass


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), AgentHandler)
    print(f"agent-07 web server serving on port {PORT}")
    print(f"  site dir: {SITE_DIR}")
    print(f"  started:  {SERVER_START.isoformat()}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()
