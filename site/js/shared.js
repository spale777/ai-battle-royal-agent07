// ============================================================
  //  Experiment management — tab switching, shared RAF, shared FPS
  // ============================================================
  let activeExp = 0;
  let expPaused = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
  let rafId = null;

  // Tab switching with URL hash routing
  // Lazy loading: experiment JS files loaded on demand
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

  function _doSwitchToExp(idx) {
    document.querySelectorAll('.exp-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.exp-panel').forEach(p => p.classList.remove('active'));
    const tab = document.querySelector('.exp-tab[data-exp="' + idx + '"]');
    if (tab) tab.classList.add('active');
    document.getElementById('exp-' + idx).classList.add('active');
    activeExp = idx;
    if (location.hash !== '#' + String(idx + 1).padStart(2, '0')) {
      history.replaceState(null, '', '#' + String(idx + 1).padStart(2, '0'));
    }
    // Update nav info
    const navCur = document.getElementById('exp-nav-cur');
    if (navCur) navCur.textContent = String(idx + 1).padStart(2, '0');
    // Scroll the active tab into view in the tab list
    if (tab) tab.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

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


  document.querySelectorAll('.exp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const idx = parseInt(tab.dataset.exp);
      switchToExp(idx);
    });
  });

  // Hash routing on load
  (function initHash() {
    const hash = location.hash.replace('#', '');
    if (hash) {
      const num = parseInt(hash);
      if (num >= 1 && num <= 34) switchToExp(num - 1);
    }
  })();

  // Respond to hash changes (back/forward)
  window.addEventListener('hashchange', () => {
    const hash = location.hash.replace('#', '');
    if (hash) {
      const num = parseInt(hash);
      if (num >= 1 && num <= 34 && num - 1 !== activeExp) switchToExp(num - 1);
    }
  });

  // Keyboard shortcuts: 1-9 and 0 (for experiment 10), q (for experiment 11)
  // w (for 12), e (13), r (14), t (15), y (16), u (17), i (18), o (19), p (20),
  // a (21), s (22), d (23), f (24), g (25), h (26), j (27), k (28), l (29),
  // z (30), x (31), m (32), b (33), n (34)
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
      e.preventDefault();
      switchToExp(num - 1);
    } else if (e.key === '0') {
      e.preventDefault();
      switchToExp(9);
    } else if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      switchToExp(10);
    } else if (e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      switchToExp(11);
    } else if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      switchToExp(12);
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      switchToExp(13);
    } else if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      switchToExp(14);
    } else if (e.key === 'y' || e.key === 'Y') {
      e.preventDefault();
      switchToExp(15);
    } else if (e.key === 'u' || e.key === 'U') {
      e.preventDefault();
      switchToExp(16);
    } else if (e.key === 'i' || e.key === 'I') {
      e.preventDefault();
      switchToExp(17);
    } else if (e.key === 'o' || e.key === 'O') {
      e.preventDefault();
      switchToExp(18);
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      switchToExp(19);
    } else if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      switchToExp(20);
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      switchToExp(21);
    } else if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      switchToExp(22);
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      switchToExp(23);
    } else if (e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      switchToExp(24);
    } else if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      switchToExp(25);
    } else if (e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      switchToExp(26);
    } else if (e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      switchToExp(27);
    } else if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      switchToExp(28);
    } else if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      switchToExp(29);
    } else if (e.key === 'x' || e.key === 'X') {
      e.preventDefault();
      switchToExp(30);
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      switchToExp(31);
    } else if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      switchToExp(32);
    } else if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      switchToExp(33);
    } else if (e.key === '?') {
      e.preventDefault();
      toggleKbdHelp();
    } else if (e.key === 'Escape') {
      const overlay = document.getElementById('kbd-help-overlay');
      if (overlay) overlay.classList.remove('active');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      for (let i = activeExp - 1; i >= 0; i--) {
        const t = document.querySelector('.exp-tab[data-exp="' + i + '"]');
        if (t && !t.classList.contains('hidden')) { switchToExp(i); break; }
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      for (let i = activeExp + 1; i < 34; i++) {
        const t = document.querySelector('.exp-tab[data-exp="' + i + '"]');
        if (t && !t.classList.contains('hidden')) { switchToExp(i); break; }
      }
    }
  });

  // ============================================================
  //  Experiment search/filter, category filter, prev/next nav, keyboard help
  // ============================================================

  // Experiment-to-category mapping (experiment index -> category)
  const expCategories = [
    'Reaction-Diffusion', 'Particle Systems', 'Fractals', 'Cellular Automata',
    'Fractals', 'Particle Systems', 'Chaos Theory', 'Algorithms',
    'Physics', 'Physics', 'Generative Art', 'Chaos Theory',
    'Mathematics', 'Physics', 'Particle Systems', 'Mathematics',
    'Fractals', 'Chaos Theory', 'Mathematics', 'Fractals',
    'Cellular Automata', 'Particle Systems', 'Reaction-Diffusion', 'Mathematics',
    'Mathematics', 'Fractals', '3D Graphics', 'Chaos Theory',
    'Algorithms', 'Cellular Automata', 'Mathematics', 'Algorithms',
    'Physics', 'Mathematics'
  ];
  let activeCatFilter = 'all';

  // Apply both text search and category filter
  function applyFilters() {
    const q = expSearch ? expSearch.value.toLowerCase().trim() : '';
    document.querySelectorAll('.exp-tab').forEach(function(tab) {
      const idx = parseInt(tab.dataset.exp);
      const text = tab.textContent.toLowerCase();
      // Also search the section title and description for richer results
      const panel = document.getElementById('exp-' + tab.dataset.exp);
      let extraText = '';
      if (panel) {
        const h2 = panel.querySelector('h2');
        const ps = panel.querySelectorAll('p');
        if (h2) extraText += ' ' + h2.textContent.toLowerCase();
        ps.forEach(function(p) { extraText += ' ' + p.textContent.toLowerCase(); });
      }
      const textMatch = !q || text.includes(q) || extraText.includes(q);
      const catMatch = activeCatFilter === 'all' || expCategories[idx] === activeCatFilter;
      tab.classList.toggle('hidden', !(textMatch && catMatch));
    });
  }

  // Search/filter — filters tab list as you type
  const expSearch = document.getElementById('exp-search');
  if (expSearch) {
    expSearch.addEventListener('input', applyFilters);
    // Enter key in search: jump to first visible tab
    expSearch.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const firstVisible = document.querySelector('.exp-tab:not(.hidden)');
        if (firstVisible) {
          switchToExp(parseInt(firstVisible.dataset.exp));
          this.blur();
        }
      } else if (e.key === 'Escape') {
        this.value = '';
        applyFilters();
        this.blur();
      }
    });
  }

  // Category filter chips
  document.querySelectorAll('.exp-cat-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      document.querySelectorAll('.exp-cat-chip').forEach(function(c) {
        c.classList.remove('active');
      });
      this.classList.add('active');
      activeCatFilter = this.dataset.cat;
      applyFilters();
      // If current experiment is hidden by filter, jump to first visible
      const curTab = document.querySelector('.exp-tab[data-exp="' + activeExp + '"]');
      if (curTab && curTab.classList.contains('hidden')) {
        const firstVisible = document.querySelector('.exp-tab:not(.hidden)');
        if (firstVisible) switchToExp(parseInt(firstVisible.dataset.exp));
      }
    });
  });

  // Prev/Next navigation (skips tabs hidden by category filter)
  const prevBtn = document.getElementById('exp-prev');
  const nextBtn = document.getElementById('exp-next');
  function findVisibleNeighbor(dir) {
    let i = activeExp + dir;
    while (i >= 0 && i < 33) {
      const tab = document.querySelector('.exp-tab[data-exp="' + i + '"]');
      if (tab && !tab.classList.contains('hidden')) return i;
      i += dir;
    }
    return -1;
  }
  if (prevBtn) prevBtn.addEventListener('click', function() {
    const target = findVisibleNeighbor(-1);
    if (target >= 0) switchToExp(target);
  });
  if (nextBtn) nextBtn.addEventListener('click', function() {
    const target = findVisibleNeighbor(1);
    if (target >= 0) switchToExp(target);
  });

  // Keyboard shortcut help overlay
  function toggleKbdHelp() {
    const overlay = document.getElementById('kbd-help-overlay');
    if (!overlay) return;
    overlay.classList.toggle('active');
    if (overlay.classList.contains('active')) {
      // Build the shortcut list if not already built
      const grid = document.getElementById('kbd-grid');
      if (grid && grid.children.length === 0) {
        const shortcuts = [
          { key: '1', label: 'Exp 01' }, { key: '2', label: 'Exp 02' },
          { key: '3', label: 'Exp 03' }, { key: '4', label: 'Exp 04' },
          { key: '5', label: 'Exp 05' }, { key: '6', label: 'Exp 06' },
          { key: '7', label: 'Exp 07' }, { key: '8', label: 'Exp 08' },
          { key: '9', label: 'Exp 09' }, { key: '0', label: 'Exp 10' },
          { key: 'q', label: 'Exp 11' }, { key: 'w', label: 'Exp 12' },
          { key: 'e', label: 'Exp 13' }, { key: 'r', label: 'Exp 14' },
          { key: 't', label: 'Exp 15' }, { key: 'y', label: 'Exp 16' },
          { key: 'u', label: 'Exp 17' }, { key: 'i', label: 'Exp 18' },
          { key: 'o', label: 'Exp 19' }, { key: 'p', label: 'Exp 20' },
          { key: 'a', label: 'Exp 21' }, { key: 's', label: 'Exp 22' },
          { key: 'd', label: 'Exp 23' }, { key: 'f', label: 'Exp 24' },
          { key: 'g', label: 'Exp 25' }, { key: 'h', label: 'Exp 26' },
          { key: 'j', label: 'Exp 27' }, { key: 'k', label: 'Exp 28' },
          { key: 'l', label: 'Exp 29' }, { key: 'z', label: 'Exp 30' },
          { key: 'x', label: 'Exp 31' }, { key: 'm', label: 'Exp 32' },
          { key: 'b', label: 'Exp 33' }, { key: 'n', label: 'Exp 34' },
          { key: '←', label: 'Prev exp' }, { key: '→', label: 'Next exp' },
          { key: '?', label: 'This help' }, { key: 'Esc', label: 'Close' }
        ];
        shortcuts.forEach(function(s) {
          var item = document.createElement('div');
          item.className = 'kbd-item';
          var key = document.createElement('span');
          key.className = 'kbd-key';
          key.textContent = s.key;
          var label = document.createElement('span');
          label.className = 'kbd-label';
          label.textContent = s.label;
          item.appendChild(key);
          item.appendChild(label);
          grid.appendChild(item);
        });
      }
    }
  }
  // ============================================================
  //  Shared utilities
  // ============================================================
  function hslToRgb(h, s, l) {
    h = h / 360;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  // Click overlay backdrop to close
  const overlayEl = document.getElementById('kbd-help-overlay');
  if (overlayEl) overlayEl.addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('active');
  });
