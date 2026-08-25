#!/usr/bin/env python3
"""
Build the new modular lab.html shell from the original lab.html.

Extracts the HTML (head, CSS, body) from the original lab.html and replaces
the inline <script> block with a modular loading system:
  - shared.js and mainloop.js loaded immediately
  - exp-01.js loaded immediately (default experiment)
  - bootstrap.js loaded immediately (starts mainLoop)
  - Other experiments lazy-loaded on tab switch

The original lab.html is backed up as lab-original.html.
"""

import json
from pathlib import Path

SITE_DIR = Path(__file__).parent.parent / "site"
LAB_HTML = SITE_DIR / "lab.html"

def main():
    # Always rebuild from the original (stored in server/)
    original_path = Path(__file__).parent / "lab-original.html"
    if original_path.exists():
        content = original_path.read_text()
        print(f"Building from {original_path.name}")
    else:
        content = LAB_HTML.read_text()
        # Backup original
        original_path.write_text(content)
        print(f"Backed up original to {original_path}")

    # Find the <script> tag — everything before it is the HTML shell
    script_tag = content.find('  <script>')
    if script_tag == -1:
        script_tag = content.find('<script>')
        if script_tag == -1:
            raise ValueError("Could not find <script> tag")

    html_shell = content[:script_tag]

    # Find the end of the script block (including </script> and closing tags)
    script_end = content.find('</script>')
    if script_end == -1:
        raise ValueError("Could not find </script> tag")
    closing_tags = content[script_end + len('</script>'):]

    # Build the new loading system
    # shared.js includes the lazy loader, so we just need to load
    # shared, mainloop, exp-01, and bootstrap in order.
    # Cache-busting query parameter ensures visitors get the latest JS.
    cache_bust = "?v=2"
    lazy_loader = f"""  <script src="/js/shared.js{cache_bust}"></script>
  <script src="/js/mainloop.js{cache_bust}"></script>
  <script src="/js/exp-01.js{cache_bust}"></script>
  <script src="/js/bootstrap.js{cache_bust}"></script>
"""

    # Combine
    new_html = html_shell + lazy_loader + closing_tags

    # Write new lab.html
    LAB_HTML.write_text(new_html)
    print(f"Wrote new modular lab.html ({len(new_html)} chars, down from {len(content)} chars)")
    print(f"Size reduction: {100 - len(new_html) * 100 / len(content):.1f}%")

if __name__ == "__main__":
    main()
