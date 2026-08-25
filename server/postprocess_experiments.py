#!/usr/bin/env python3
"""
Post-process extracted experiment JS files: append init calls that were
previously in the bootstrap section.

The bootstrap code called init functions for experiments 1-12, 25, 26.
These calls need to be in the experiment files themselves so that
lazy-loaded experiments initialize themselves when loaded.
"""

from pathlib import Path

JS_DIR = Path(__file__).parent.parent / "site" / "js"

# Init calls from the bootstrap that need to be appended to experiment files.
# Format: experiment number -> list of init statements
INIT_CALLS = {
    1: ["rsInit();", "rsRender();"],
    2: ["ffInit();"],
    3: ["lsReset();"],
    4: ["caInit();", "caRender();"],
    6: ["boidsInit();"],
    7: ["saInit();"],
    12: ["laInit();"],
    25: ["voInit();"],
    26: ["dlaInit();"],
}

# Experiments that already have their init calls in the extracted code:
# 5: mbStartRender() ✓
# 8: svBuildArray(); svRender(); ✓
# 9: waveInit(); ✓
# 10: nbInit(); ✓
# 11: ptRegenerate(ptSeed); ✓
# 13: fdSetPath(fdPresetPaths.heart); ✓
# 14: sfReset(); sfApplyPreset('ink'); sfSeedPreset(); ✓
# 15: plReset(); plApplyPreset('default'); ✓
# 16: spReset(); ✓
# 17: nfComputeRoots(); nfFullRender(); ✓
# 18: dpApplyPreset('single'); ✓
# 19: fsApplyPreset('square'); ✓
# 20: ifsApplyPreset('fern'); ✓
# 21: wcaReset(); ✓
# 22: pmInit(); pmRender(); ✓
# 23: bzInit(); ✓
# 24: ljInit(); ✓
# 27: wfLoadPreset('tetra'); ✓
# 28: lmRenderAll(); ✓
# 29: tspInit(); ✓
# 30: ccaInit(); ✓
# 31: msInit(); ✓
# 32: mazeInit(); ✓
# 33: chlInit(); ✓
# 34: penGenerate(); penRenderFull(); ✓

for exp_num, calls in INIT_CALLS.items():
    filename = f"exp-{exp_num:02d}.js"
    filepath = JS_DIR / filename
    if not filepath.exists():
        print(f"  WARNING: {filename} not found, skipping")
        continue
    
    content = filepath.read_text()
    init_code = "\n  // Initialize (moved from bootstrap)\n  " + "\n  ".join(calls) + "\n"
    
    # Check if the init calls are already appended at the TOP LEVEL (idempotency)
    # We look for our marker comment to avoid double-appending
    if "// Initialize (moved from bootstrap)" in content:
            print(f"  {filename}: init calls already present, skipping")
            continue
    
    filepath.write_text(content.rstrip() + "\n" + init_code)
    print(f"  {filename}: appended {len(calls)} init call(s)")

# Also rewrite bootstrap.js to only contain mainLoop() call
bootstrap_path = JS_DIR / "bootstrap.js"
bootstrap_path.write_text("// Start the animation loop\n  mainLoop();\n")
print(f"\n  bootstrap.js: rewritten to only call mainLoop()")
