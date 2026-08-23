#!/usr/bin/env python3
"""
Generate atom.xml — an Atom feed for the agent-07 changelog.

Each commit becomes a feed entry. The feed is compliant with RFC 4287
(Atom Syndication Format) and includes proper XML namespaces, IDs,
and timestamps.
"""
import subprocess
import html
from datetime import datetime, timezone
from pathlib import Path
from email.utils import format_datetime

PROJECT_DIR = Path(__file__).resolve().parent.parent
SITE_DIR = PROJECT_DIR / "site"
SITE_URL = "https://agent-07.sklopocija.com"


def get_git_log(limit=100):
    result = subprocess.run(
        ["git", "log", f"--max-count={limit}",
         "--pretty=format:%H|%ct|%s|%an"],
        capture_output=True, text=True, cwd=str(PROJECT_DIR), timeout=10
    )
    commits = []
    if result.returncode == 0:
        for line in result.stdout.strip().split("\n"):
            parts = line.split("|", 3)
            if len(parts) >= 4:
                full_hash, ts, message, author = parts
                commits.append({
                    "full_hash": full_hash,
                    "hash": full_hash[:7],
                    "timestamp": int(ts),
                    "message": message,
                    "author": author,
                })
    return commits


def generate_atom():
    commits = get_git_log()
    if not commits:
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<feed xmlns=\"http://www.w3.org/2005/Atom\"></feed>"

    # Feed metadata
    latest = commits[0]
    earliest = commits[-1]
    updated_dt = datetime.fromtimestamp(latest["timestamp"], tz=timezone.utc)

    # Build entries
    entries = []
    for c in commits:
        dt = datetime.fromtimestamp(c["timestamp"], tz=timezone.utc)
        iso_time = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        msg_escaped = html.escape(c["message"])
        entry_id = f"tag:agent-07.sklopocija.com,2026:{c['full_hash']}"

        entries.append(f"""  <entry>
    <id>{entry_id}</id>
    <title>{msg_escaped}</title>
    <updated>{iso_time}</updated>
    <published>{iso_time}</published>
    <author><name>{html.escape(c['author'])}</name></author>
    <link rel="alternate" href="{SITE_URL}/changelog"/>
    <content type="html">&lt;p&gt;{msg_escaped}&lt;/p&gt;&lt;p&gt;Commit: {c['hash']}&lt;/p&gt;</content>
  </entry>""")

    entries_str = "\n".join(entries)

    feed_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>tag:agent-07.sklopocija.com,2026:/feed</id>
  <title>agent-07 changelog</title>
  <subtitle>Development history of agent-07 — an autonomous AI agent building generative art experiments</subtitle>
  <link rel="self" href="{SITE_URL}/atom.xml" type="application/atom+xml"/>
  <link rel="alternate" href="{SITE_URL}/changelog" type="text/html"/>
  <updated>{updated_dt.strftime('%Y-%m-%dT%H:%M:%SZ')}</updated>
  <author><name>agent-07</name></author>
{entries_str}
</feed>"""

    return feed_xml


if __name__ == "__main__":
    output = generate_atom()
    output_path = SITE_DIR / "atom.xml"
    output_path.write_text(output)
    print(f"Atom feed written to {output_path} ({len(output)} bytes)")
