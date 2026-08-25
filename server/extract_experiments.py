#!/usr/bin/env python3
"""
Extract per-experiment JS from lab.html into separate files under site/js/.

Structure of lab.html JS:
  <script>
  shared code (tab switching, hslToRgb, etc.)
  EXPERIMENT 01 code
  EXPERIMENT 02 code
  ...
  EXPERIMENT 32 code
  mainLoop function definition
  EXPERIMENT 33 code
  EXPERIMENT 34 code
  init calls + mainLoop() invocation
  </script>

Produces:
  site/js/shared.js    — shared code before first experiment
  site/js/mainloop.js  — mainLoop function definition
  site/js/exp-NN.js    — per-experiment code (NN = 01..34)
  site/js/bootstrap.js — init calls + mainLoop() invocation
  site/js/manifest.json — experiment metadata
"""

import re
import json
from pathlib import Path

SITE_DIR = Path(__file__).parent.parent / "site"
JS_DIR = SITE_DIR / "js"
LAB_HTML = SITE_DIR / "lab.html"
# The original monolithic lab.html with all JS inline is stored in server/
LAB_ORIGINAL = Path(__file__).parent / "lab-original.html"

EXP_MARKER_RE = re.compile(
    r'^\s*//\s*(?:EXPERIMENT|Experiment)\s+(\d+)\s*[—–-]\s*(.+)$',
    re.MULTILINE
)

def find_line_start(content, pos):
    """Find the start of the line containing pos."""
    return content.rfind('\n', 0, pos) + 1

def find_comment_block_start(content, pos):
    """Find the // ==== line that starts a comment block before pos."""
    line_start = find_line_start(content, pos)
    search_pos = line_start - 1
    while search_pos > 0:
        nl = content.rfind('\n', 0, search_pos)
        line = content[nl+1:search_pos].strip() if nl != -1 else content[:search_pos].strip()
        if line.startswith('// ===='):
            return nl + 1
        if line and not line.startswith('//') and not line.startswith('/*'):
            break
        search_pos = nl if nl != -1 else 0
    return line_start

def main():
    content = (LAB_ORIGINAL if LAB_ORIGINAL.exists() else LAB_HTML).read_text()

    # Find all experiment markers
    matches = list(EXP_MARKER_RE.finditer(content))
    if not matches:
        raise ValueError("No experiment markers found")

    # Find <script> and </script>
    script_start = content.find('<script>')
    if script_start == -1:
        raise ValueError("Could not find <script> tag")
    script_start = content.find('\n', script_start) + 1

    script_end = content.find('</script>')
    if script_end == -1:
        raise ValueError("Could not find </script> tag")

    # Find the mainLoop function definition
    mainloop_comment = content.find('//  Main animation loop')
    if mainloop_comment == -1:
        raise ValueError("Could not find mainLoop marker")
    mainloop_start = find_comment_block_start(content, mainloop_comment)

    # Find mainLoop() call at the end (the standalone invocation)
    # Search from the end of the script
    mainloop_call_re = re.compile(r'^\s*mainLoop\(\);\s*$', re.MULTILINE)
    ml_call_matches = list(mainloop_call_re.finditer(content, mainloop_start, script_end))
    if not ml_call_matches:
        raise ValueError("Could not find mainLoop() call")
    mainloop_call = ml_call_matches[-1]  # last match
    mainloop_call_line_start = find_line_start(content, mainloop_call.start())

    # The bootstrap code is everything between the last experiment block
    # and mainLoop() call. This includes init calls like voInit(), dlaInit(), etc.
    # But actually, some init calls are at the end of experiment blocks themselves.
    # The bootstrap is specifically the code after the last experiment marker
    # that isn't part of an experiment — it's the init sequence.

    # Shared code: from script_start to first experiment block
    shared_code = content[script_start:find_comment_block_start(content, matches[0].start())].strip()

    # MainLoop function definition: from mainloop_start to the next experiment
    # block after it (experiment 33) or to the init calls
    # Find the first experiment marker after mainLoop_start
    exp_after_mainloop = None
    for m in matches:
        if m.start() > mainloop_start:
            exp_after_mainloop = m
            break

    if exp_after_mainloop:
        mainloop_end = find_comment_block_start(content, exp_after_mainloop.start())
    else:
        # No experiments after mainLoop — mainLoop goes to the init calls
        mainloop_end = mainloop_call_line_start

    mainloop_code = content[mainloop_start:mainloop_end].strip()

    # Bootstrap: init calls + mainLoop() invocation
    # This is delimited by the "// Initialize all experiments" comment
    # (or if not found, by searching backwards from mainLoop() call)
    init_marker = content.find('// Initialize all experiments', mainloop_start, script_end)
    if init_marker != -1:
        init_region_start = find_line_start(content, init_marker)
    else:
        # Fallback: search backwards from mainLoop() call
        init_region_start = mainloop_call_line_start
        search_back = mainloop_call_line_start - 1
        while search_back > mainloop_start:
            nl = content.rfind('\n', 0, search_back)
            line = content[nl+1:search_back].strip() if nl != -1 else content[:search_back].strip()
            if not line:
                search_back = nl if nl != -1 else 0
                continue
            if line.startswith('//'):
                if EXP_MARKER_RE.match(line) or line.startswith('// ===='):
                    break
                search_back = nl if nl != -1 else 0
                continue
            init_region_start = nl + 1 if nl != -1 else 0
            search_back = nl if nl != -1 else 0

    # Bootstrap includes init calls + mainLoop() call
    bootstrap_code = content[init_region_start:mainloop_call.end()].strip()

    # Extract each experiment block
    experiments = []
    for i, m in enumerate(matches):
        exp_num = int(m.group(1))
        exp_title = m.group(2).strip()

        block_start = find_comment_block_start(content, m.start())

        # Block end: next experiment block, or mainLoop block, or bootstrap
        if i + 1 < len(matches):
            next_m = matches[i + 1]
            # But if the mainLoop block is between this and the next experiment,
            # the experiment code ends at the mainLoop block
            if block_start < mainloop_start < find_comment_block_start(content, next_m.start()):
                block_end = mainloop_start
            else:
                block_end = find_comment_block_start(content, next_m.start())
        else:
            # Last experiment — ends at bootstrap (init calls)
            block_end = init_region_start

        code = content[block_start:block_end].strip()

        # If this block contains the mainLoop, remove it
        if mainloop_start >= block_start and mainloop_start < block_end:
            code = content[block_start:mainloop_start].strip()

        experiments.append({
            'num': exp_num,
            'title': exp_title,
            'code': code,
        })

    # Output
    print(f"Found {len(experiments)} experiments")
    print(f"Shared code: {len(shared_code)} chars")
    print(f"MainLoop code: {len(mainloop_code)} chars")
    print(f"Bootstrap code: {len(bootstrap_code)} chars")

    for exp in experiments:
        print(f"  Exp {exp['num']:02d}: {exp['title']} ({len(exp['code'])} chars)")

    # Create js directory
    JS_DIR.mkdir(exist_ok=True)

    # Write files
    (JS_DIR / "shared.js").write_text(shared_code + "\n")
    (JS_DIR / "mainloop.js").write_text(mainloop_code + "\n")
    (JS_DIR / "bootstrap.js").write_text(bootstrap_code + "\n")

    manifest = []
    for exp in experiments:
        filename = f"exp-{exp['num']:02d}.js"
        (JS_DIR / filename).write_text(exp['code'] + "\n")
        manifest.append({
            'num': exp['num'],
            'title': exp['title'],
            'file': filename,
            'size': len(exp['code']),
        })

    (JS_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"\nWrote {len(manifest)} experiment files + shared.js + mainloop.js + bootstrap.js")

if __name__ == "__main__":
    main()
