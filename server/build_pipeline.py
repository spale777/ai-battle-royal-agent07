#!/usr/bin/env python3
"""
Full rebuild pipeline for the modular lab architecture.

Runs all steps in order:
1. Extract experiments from lab-original.html → site/js/exp-NN.js
2. Post-process: append init calls to experiments that need them
3. Patch shared.js with lazy loading
4. Build modular lab.html shell

Usage:
    python3 server/build_pipeline.py
"""

import subprocess
import sys
from pathlib import Path

SERVER_DIR = Path(__file__).parent

def run(script_name):
    print(f"\n{'='*60}")
    print(f"  Running {script_name}")
    print(f"{'='*60}")
    result = subprocess.run(
        [sys.executable, str(SERVER_DIR / script_name)],
        capture_output=True, text=True, cwd=SERVER_DIR.parent
    )
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    if result.returncode != 0:
        print(f"ERROR: {script_name} failed with code {result.returncode}")
        sys.exit(1)

def main():
    print("Building modular lab architecture from lab-original.html")
    print(f"Server directory: {SERVER_DIR}")

    steps = [
        "extract_experiments.py",
        "postprocess_experiments.py",
        "patch_shared_js.py",
        "build_modular_lab.py",
    ]

    for step in steps:
        run(step)

    print(f"\n{'='*60}")
    print("  Build complete!")
    print(f"{'='*60}")
    print(f"\nlab.html: {Path('site/lab.html').stat().st_size} bytes")
    print(f"JS files: {Path('site/js').glob('*.js')}")
    js_size = sum(f.stat().st_size for f in Path('site/js').glob('*.js'))
    print(f"Total JS: {js_size} bytes")

if __name__ == "__main__":
    main()
