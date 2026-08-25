#!/usr/bin/env python3
"""
Generate experiments.json from lab.html.

Parses the lab page to extract experiment metadata: number, tab name,
full title, short description, and category. Output is a lightweight
JSON file that the home page and other consumers can fetch instead of
downloading the full 685KB lab.html.

Run via cron or manually after adding/removing experiments:
    python3 server/generate_experiments_json.py
"""
import json
import re
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
SITE_DIR = PROJECT_DIR / "site"
LAB_FILE = SITE_DIR / "lab.html"
OUTPUT_FILE = SITE_DIR / "experiments.json"

# Category mapping: experiment number (1-indexed) -> category
# Chosen to be intuitive for visitors; each experiment has exactly one.
CATEGORIES = {
    1: "Reaction-Diffusion",
    2: "Particle Systems",
    3: "Fractals",
    4: "Cellular Automata",
    5: "Fractals",
    6: "Particle Systems",
    7: "Chaos Theory",
    8: "Algorithms",
    9: "Physics",
    10: "Physics",
    11: "Generative Art",
    12: "Chaos Theory",
    13: "Mathematics",
    14: "Physics",
    15: "Particle Systems",
    16: "Mathematics",
    17: "Fractals",
    18: "Chaos Theory",
    19: "Mathematics",
    20: "Fractals",
    21: "Cellular Automata",
    22: "Particle Systems",
    23: "Reaction-Diffusion",
    24: "Mathematics",
    25: "Mathematics",
    26: "Fractals",
    27: "3D Graphics",
    28: "Chaos Theory",
    29: "Algorithms",
    30: "Cellular Automata",
    31: "Mathematics",
    32: "Algorithms",
    33: "Physics",
}


def unescape(s: str) -> str:
    """Unescape common HTML entities."""
    return (
        s.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&mdash;", "—")
        .replace("&ndash;", "–")
    )


def extract_experiments(html: str) -> list[dict]:
    """Parse lab.html and extract experiment metadata."""
    experiments = []

    # Find each section
    section_starts = [
        (m.start(), m.group(1))
        for m in re.finditer(
            r'<section class="exp-panel[^"]*" id="exp-(\d+)">', html
        )
    ]
    section_starts.append((len(html), None))

    for i in range(len(section_starts) - 1):
        start = section_starts[i][0]
        end = section_starts[i + 1][0]
        section_html = html[start:end]

        idx = int(section_starts[i][1])

        # Extract h2 title
        h2_match = re.search(r"<h2>(.+?)</h2>", section_html)
        title = unescape(h2_match.group(1)) if h2_match else "Unknown"

        # Extract first <p> after h2 as the description
        p_match = re.search(r"</h2>\s*<p>(.+?)</p>", section_html, re.DOTALL)
        if p_match:
            desc = p_match.group(1).strip()
            # Remove inner HTML tags
            desc = re.sub(r"<[^>]+>", "", desc)
            desc = re.sub(r"\s+", " ", desc)
            desc = unescape(desc)
            # Truncate to ~140 chars at a word boundary
            if len(desc) > 140:
                truncated = desc[:137]
                # Cut at last space to avoid mid-word truncation
                last_space = truncated.rfind(" ")
                if last_space > 80:
                    desc = truncated[:last_space] + "…"
                else:
                    desc = truncated + "…"
        else:
            desc = ""

        # Extract tab name from the exp-tab buttons
        tab_num = idx + 1  # 0-indexed section -> 1-indexed experiment
        # Find the button with this data-exp value
        tab_pattern = rf'data-exp="{idx}">\s*(\d+)\s*·\s*(.+?)</button>'
        tab_match = re.search(tab_pattern, html)
        tab_name = tab_match.group(2).strip() if tab_match else title

        category = CATEGORIES.get(tab_num, "Other")

        experiments.append(
            {
                "num": tab_num,
                "hash": f"{tab_num:02d}",
                "tab": tab_name,
                "title": title,
                "description": desc,
                "category": category,
            }
        )

    return experiments


def generate():
    """Read lab.html, extract metadata, write experiments.json."""
    if not LAB_FILE.exists():
        print(f"Error: {LAB_FILE} not found")
        return False

    html = LAB_FILE.read_text(encoding="utf-8")
    experiments = extract_experiments(html)

    # Build category summary
    category_counts = {}
    for exp in experiments:
        cat = exp["category"]
        category_counts[cat] = category_counts.get(cat, 0) + 1

    # Sort categories by count (descending), then alphabetically
    categories_sorted = sorted(
        category_counts.items(), key=lambda x: (-x[1], x[0])
    )
    categories = [
        {"name": name, "count": count} for name, count in categories_sorted
    ]

    output = {
        "total": len(experiments),
        "categories": categories,
        "experiments": experiments,
    }

    OUTPUT_FILE.write_text(
        json.dumps(output, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        f"Generated {OUTPUT_FILE} — {len(experiments)} experiments, "
        f"{len(categories)} categories"
    )
    return True


if __name__ == "__main__":
    generate()
