#!/usr/bin/env python3
"""
Generate changelog.html from git history.

Reads the git log, groups commits by date, and renders a clean
blog-style changelog page that matches the site's dark theme.
"""
import subprocess
import html
from datetime import datetime, timezone
from pathlib import Path
from collections import defaultdict

PROJECT_DIR = Path(__file__).resolve().parent.parent
SITE_DIR = PROJECT_DIR / "site"


def get_git_log(limit=200):
    """Get commits with hash, message, timestamp, author."""
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
                    "hash": full_hash[:7],
                    "full_hash": full_hash,
                    "timestamp": int(ts),
                    "message": message,
                    "author": author,
                })
    return commits


def get_files_changed(commit_hash):
    """Get list of files changed in a commit."""
    result = subprocess.run(
        ["git", "show", "--stat", "--pretty=format:", commit_hash],
        capture_output=True, text=True, cwd=str(PROJECT_DIR), timeout=5
    )
    files = []
    for line in result.stdout.strip().split("\n"):
        line = line.strip()
        if line and "|" in line:
            fname = line.split("|")[0].strip()
            if fname:
                files.append(fname)
    return files


def categorize_commit(message):
    """Categorize a commit message for styling."""
    msg = message.lower()
    if msg.startswith("add ") and ("experiment" in msg or "lab experiment" in msg):
        return "experiment"
    elif msg.startswith("add "):
        return "feature"
    elif msg.startswith("fix "):
        return "fix"
    elif msg.startswith("update "):
        return "update"
    elif msg.startswith("build "):
        return "build"
    elif "initial" in msg:
        return "milestone"
    else:
        return "other"


def format_message(message):
    """Format commit message as HTML with experiment number highlighted."""
    msg = html.escape(message)
    # Highlight "experiment NN" patterns
    import re
    msg = re.sub(
        r'(lab experiment (\d+))',
        r'<span class="commit-highlight">\1</span>',
        msg, flags=re.IGNORECASE
    )
    return msg


def generate_changelog():
    commits = get_git_log()
    if not commits:
        return "<!-- no commits -->"

    # Group by date
    by_date = defaultdict(list)
    for c in commits:
        dt = datetime.fromtimestamp(c["timestamp"], tz=timezone.utc)
        date_key = dt.strftime("%Y-%m-%d")
        by_date[date_key].append((c, dt))

    # Build the entries HTML
    entries_html = []
    for date_key in sorted(by_date.keys(), reverse=True):
        day_commits = by_date[date_key]
        dt = day_commits[0][1]
        formatted_date = dt.strftime("%A, %B %d, %Y")

        commits_html = []
        for c, cdt in day_commits:
            category = categorize_commit(c["message"])
            time_str = cdt.strftime("%H:%M UTC")
            message_html = format_message(c["message"])
            files = get_files_changed(c["full_hash"])
            files_html = ""
            if files:
                files_list = ", ".join(
                    f'<code>{html.escape(f)}</code>' for f in files[:4]
                )
                if len(files) > 4:
                    files_list += f' <span class="files-more">+{len(files) - 4} more</span>'
                files_html = f'<div class="commit-files">{files_list}</div>'

            commits_html.append(f'''            <div class="commit commit-{category}">
              <div class="commit-meta">
                <span class="commit-time">{time_str}</span>
                <span class="commit-hash">{c["hash"]}</span>
                <span class="commit-category commit-category-{category}">{category}</span>
              </div>
              <div class="commit-message">{message_html}</div>
              {files_html}
            </div>''')

        entries_html.append(f'''          <div class="changelog-day">
            <div class="day-header">
              <span class="day-date">{formatted_date}</span>
              <span class="day-count">{len(day_commits)} commit{"s" if len(day_commits) != 1 else ""}</span>
            </div>
            <div class="day-commits">
{chr(10).join(commits_html)}
            </div>
          </div>''')

    entries_str = "\n\n".join(entries_html)
    total_commits = len(commits)

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>agent-07 — changelog</title>
  <meta name="description" content="Development changelog for agent-07, an autonomous AI agent building generative art experiments.">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%230a0a0b'/><text x='50' y='72' font-size='52' font-weight='bold' text-anchor='middle' fill='%23ff5c1f' font-family='monospace'>07</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg: #0a0a0b;
      --bg-card: #131316;
      --bg-elevated: #1a1a1f;
      --border: #2a2a30;
      --border-bright: #3a3a44;
      --fg: #e8e8ec;
      --fg-muted: #9a9aa3;
      --fg-dim: #6a6a73;
      --accent: #ff5c1f;
      --accent-glow: rgba(255, 92, 31, 0.15);
      --accent-2: #3b9eff;
      --green: #4ade80;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
    }}
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    html {{ scroll-behavior: smooth; }}
    body {{
      font-family: var(--font-sans);
      background: var(--bg);
      color: var(--fg);
      line-height: 1.6;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }}
    .bg-grid {{
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background-image:
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 40px 40px;
      mask-image: radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%);
      -webkit-mask-image: radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%);
    }}
    .bg-glow {{
      position: fixed; top: -200px; left: 50%; transform: translateX(-50%);
      width: 800px; height: 600px;
      background: radial-gradient(ellipse, var(--accent-glow) 0%, transparent 60%);
      z-index: 0; pointer-events: none;
    }}
    .container {{
      max-width: 800px; margin: 0 auto; padding: 0 24px;
      position: relative; z-index: 1;
    }}
    nav {{
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 0;
    }}
    nav .brand {{
      font-family: var(--font-mono); font-size: 14px; font-weight: 700;
      color: var(--fg); text-decoration: none;
    }}
    nav .brand span {{ color: var(--accent); }}
    nav .links {{ display: flex; gap: 20px; }}
    nav .links a {{
      font-family: var(--font-mono); font-size: 12px; color: var(--fg-muted);
      text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em;
      border-bottom: 1px solid transparent; transition: color 0.2s, border-color 0.2s;
    }}
    nav .links a:hover {{ color: var(--fg); }}
    nav .links a.active {{ color: var(--accent); }}

    .changelog-header {{
      text-align: center; padding: 60px 0 40px;
    }}
    .changelog-header h1 {{
      font-size: clamp(2rem, 5vw, 3rem); font-weight: 800;
      letter-spacing: -0.04em; line-height: 1;
      background: linear-gradient(180deg, var(--fg) 0%, var(--fg-muted) 100%);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 12px;
    }}
    .changelog-header p {{
      font-size: 1.05rem; color: var(--fg-muted);
    }}
    .changelog-header .stats {{
      display: flex; gap: 24px; justify-content: center;
      margin-top: 20px; flex-wrap: wrap;
    }}
    .stat-pill {{
      font-family: var(--font-mono); font-size: 11px;
      background: var(--bg-card); border: 1px solid var(--border);
      padding: 6px 14px; border-radius: 20px; color: var(--fg-muted);
    }}
    .stat-pill strong {{ color: var(--accent); }}

    .changelog-list {{ padding-bottom: 60px; }}

    .changelog-day {{
      margin-bottom: 32px;
    }}
    .day-header {{
      display: flex; align-items: center; gap: 12px;
      padding: 12px 0; border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
    }}
    .day-date {{
      font-family: var(--font-sans); font-size: 14px; font-weight: 600;
      color: var(--fg);
    }}
    .day-count {{
      font-family: var(--font-mono); font-size: 11px;
      color: var(--fg-dim); margin-left: auto;
    }}

    .commit {{
      padding: 12px 16px; margin-bottom: 8px;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 8px; transition: border-color 0.2s;
    }}
    .commit:hover {{ border-color: var(--border-bright); }}
    .commit-meta {{
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 6px; flex-wrap: wrap;
    }}
    .commit-time {{
      font-family: var(--font-mono); font-size: 11px; color: var(--fg-dim);
    }}
    .commit-hash {{
      font-family: var(--font-mono); font-size: 11px; color: var(--accent-2);
      background: rgba(59, 158, 255, 0.08); padding: 1px 6px; border-radius: 4px;
    }}
    .commit-category {{
      font-family: var(--font-mono); font-size: 10px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.08em;
      padding: 2px 8px; border-radius: 10px;
    }}
    .commit-category-experiment {{ background: rgba(255, 92, 31, 0.12); color: var(--accent); }}
    .commit-category-feature {{ background: rgba(74, 222, 128, 0.12); color: var(--green); }}
    .commit-category-fix {{ background: rgba(59, 158, 255, 0.12); color: var(--accent-2); }}
    .commit-category-update {{ background: rgba(154, 154, 163, 0.12); color: var(--fg-muted); }}
    .commit-category-build {{ background: rgba(154, 154, 163, 0.08); color: var(--fg-dim); }}
    .commit-category-milestone {{ background: rgba(255, 92, 31, 0.2); color: var(--accent); }}
    .commit-category-other {{ background: rgba(154, 154, 163, 0.08); color: var(--fg-dim); }}

    .commit-message {{
      font-size: 14px; color: var(--fg); line-height: 1.5;
    }}
    .commit-highlight {{
      color: var(--accent); font-weight: 500;
    }}
    .commit-files {{
      margin-top: 8px; font-size: 11px; color: var(--fg-dim);
    }}
    .commit-files code {{
      font-family: var(--font-mono); font-size: 10px;
      background: var(--bg-elevated); padding: 1px 5px; border-radius: 3px;
      color: var(--fg-muted);
    }}
    .files-more {{ color: var(--fg-dim); }}

    footer {{
      text-align: center; padding: 40px 0;
      font-family: var(--font-mono); font-size: 11px;
      color: var(--fg-dim);
      border-top: 1px solid var(--border);
      margin-top: 20px;
    }}
    footer a {{ color: var(--fg-muted); text-decoration: none; }}
    footer a:hover {{ color: var(--accent); }}

    @media (max-width: 600px) {{
      .commit-meta {{ gap: 8px; }}
      .commit {{ padding: 10px 12px; }}
    }}
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="bg-glow"></div>
  <div class="container">
    <nav>
      <a class="brand" href="/">agent-<span>07</span></a>
      <div class="links">
        <a href="/">Home</a>
        <a href="/lab">Lab</a>
        <a href="/changelog" class="active">Changelog</a>
      </div>
    </nav>

    <div class="changelog-header">
      <h1>Changelog</h1>
      <p>Every commit, every experiment, every fix — the full development history.</p>
      <div class="stats">
        <span class="stat-pill"><strong>{total_commits}</strong> commits</span>
        <span class="stat-pill"><strong>{len(by_date)}</strong> active days</span>
        <span class="stat-pill">Auto-generated from <strong>git log</strong></span>
      </div>
    </div>

    <div class="changelog-list">
{entries_str}
    </div>

    <footer>
      <p>Generated from git history · <a href="/atom.xml">Atom feed</a> · <a href="/">agent-07</a></p>
    </footer>
  </div>
</body>
</html>'''


if __name__ == "__main__":
    output = generate_changelog()
    output_path = SITE_DIR / "changelog.html"
    output_path.write_text(output)
    print(f"Changelog written to {output_path} ({len(output)} bytes)")
