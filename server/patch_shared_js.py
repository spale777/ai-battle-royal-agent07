#!/usr/bin/env python3
"""
Post-process shared.js to add lazy-loading support to switchToExp.

Renames the original switchToExp to _doSwitchToExp and creates a new
switchToExp that lazy-loads the experiment JS file before switching.
"""

from pathlib import Path

SHARED_JS = Path(__file__).parent.parent / "site" / "js" / "shared.js"

def main():
    content = SHARED_JS.read_text()

    # Check if already processed
    if "_doSwitchToExp" in content:
        print("shared.js already processed, skipping")
        return

    # Replace the function definition
    old = "  function switchToExp(idx) {"
    new = """  // Lazy loading: experiment JS files loaded on demand
  const loadedExperiments = new Set([1]);  // exp-01 is pre-loaded
  function loadExperiment(num) {
    if (loadedExperiments.has(num)) return Promise.resolve();
    const filename = '/js/exp-' + String(num).padStart(2, '0') + '.js?v=2';
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = filename;
      script.onload = () => { loadedExperiments.add(num); resolve(); };
      script.onerror = () => reject(new Error('Failed to load ' + filename));
      document.head.appendChild(script);
    });
  }

  function _doSwitchToExp(idx) {"""

    content = content.replace(old, new, 1)

    # Add the async wrapper after the _doSwitchToExp function ends
    # The function ends with the closing brace at "  }"
    # We need to add the wrapper after it
    # Find the end of _doSwitchToExp (it's the first "  }" after the function start)
    # The function body ends at the line "  }" after scrollIntoView
    
    # Find the closing brace of _doSwitchToExp
    func_start = content.find("function _doSwitchToExp(idx) {")
    if func_start == -1:
        raise ValueError("Could not find _doSwitchToExp after rename")
    
    # Find the closing "  }" — it's the line with just "  }" after the function body
    # The function body ends with "  if (tab) tab.scrollIntoView(...);"
    # followed by "  }"
    scroll_line = content.find("if (tab) tab.scrollIntoView", func_start)
    closing_brace = content.find("\n  }", scroll_line)
    
    # Insert the async wrapper after the closing brace
    wrapper = """

  // Public switchToExp: lazy-loads experiment before switching
  function switchToExp(idx) {
    const expNum = idx + 1;
    if (loadedExperiments.has(expNum)) {
      _doSwitchToExp(idx);
    } else {
      loadExperiment(expNum).then(() => _doSwitchToExp(idx)).catch(err => {
        console.error('Failed to load experiment ' + expNum, err);
        _doSwitchToExp(idx);
      });
    }
  }
"""
    
    content = content[:closing_brace + 4] + wrapper + content[closing_brace + 4:]

    SHARED_JS.write_text(content)
    print(f"Modified shared.js: added lazy loading ({len(content)} chars)")

if __name__ == "__main__":
    main()
