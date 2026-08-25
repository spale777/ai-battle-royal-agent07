// ============================================================
  //  EXPERIMENT 04 — Cellular Automata (Life and variants)
  // ============================================================
  const W4 = 600, H4 = 400;
  const canvas4 = document.getElementById('canvas4');
  const ctx4 = canvas4.getContext('2d');

  let caCellSize = 4;
  let caGridW = Math.floor(W4 / caCellSize);
  let caGridH = Math.floor(H4 / caCellSize);
  let caGrid = new Uint8Array(caGridW * caGridH);
  let caNext = new Uint8Array(caGridW * caGridH);
  let caAge = new Uint16Array(caGridW * caGridH);  // age tracking for trail coloring
  let caGen = 0;
  let caPop = 0;
  let caSpeed = 1;
  let caFade = 0;  // 0 = no fade, 1-100 = fade amount
  let caHue = 140;
  let caBirth = new Set([3]);
  let caSurvive = new Set([2, 3]);

  function caRebuildGrid() {
    const oldW = caGridW, oldH = caGridH;
    const oldGrid = caGrid;
    const oldAge = caAge;
    caGridW = Math.floor(W4 / caCellSize);
    caGridH = Math.floor(H4 / caCellSize);
    const newGrid = new Uint8Array(caGridW * caGridH);
    const newAge = new Uint16Array(caGridW * caGridH);
    // Copy overlapping region
    const minW = Math.min(oldW, caGridW);
    const minH = Math.min(oldH, caGridH);
    for (let y = 0; y < minH; y++) {
      for (let x = 0; x < minW; x++) {
        newGrid[y * caGridW + x] = oldGrid[y * oldW + x];
        newAge[y * caGridW + x] = oldAge[y * oldW + x];
      }
    }
    caGrid = newGrid;
    caNext = new Uint8Array(caGridW * caGridH);
    caAge = newAge;
  }

  function caParseRule(str) {
    const set = new Set();
    for (const ch of str) {
      const n = parseInt(ch);
      if (n >= 0 && n <= 8) set.add(n);
    }
    return set;
  }

  function caApplyRule() {
    const bStr = document.getElementById('ca-b-input').value;
    const sStr = document.getElementById('ca-s-input').value;
    caBirth = caParseRule(bStr);
    caSurvive = caParseRule(sStr);
    document.getElementById('ca-b-val').textContent = bStr;
    document.getElementById('ca-s-val').textContent = sStr;
  }

  function caRandomize() {
    for (let i = 0; i < caGrid.length; i++) {
      caGrid[i] = Math.random() < 0.3 ? 1 : 0;
      caAge[i] = caGrid[i] ? 1 : 0;
    }
    caGen = 0;
    caCountPop();
  }

  function caClear() {
    caGrid.fill(0);
    caAge.fill(0);
    caGen = 0;
    caPop = 0;
    ctx4.fillStyle = '#000';
    ctx4.fillRect(0, 0, W4, H4);
    document.getElementById('ca-gen').textContent = '0';
    document.getElementById('ca-pop').textContent = '0';
  }

  function caCountPop() {
    let count = 0;
    for (let i = 0; i < caGrid.length; i++) {
      if (caGrid[i]) count++;
    }
    caPop = count;
  }

  function caInit() {
    caRebuildGrid();
    // Place a glider and some random noise
    caGrid.fill(0);
    caAge.fill(0);
    // Classic R-pentomino — a long-lived pattern
    const cx = Math.floor(caGridW / 2);
    const cy = Math.floor(caGridH / 2);
    const rpento = [[0,1],[1,0],[1,1],[1,2],[2,1]];
    for (const [dx, dy] of rpento) {
      caGrid[(cy + dy) * caGridW + (cx + dx)] = 1;
      caAge[(cy + dy) * caGridW + (cx + dx)] = 1;
    }
    // Add some random cells
    for (let i = 0; i < caGrid.length; i++) {
      if (Math.random() < 0.15) {
        caGrid[i] = 1;
        caAge[i] = 1;
      }
    }
    caGen = 0;
    caCountPop();
  }

  function caStep() {
    const gw = caGridW, gh = caGridH;
    let pop = 0;
    for (let y = 0; y < gh; y++) {
      const yu = (y - 1 + gh) % gh;
      const yd = (y + 1) % gh;
      for (let x = 0; x < gw; x++) {
        const xl = (x - 1 + gw) % gw;
        const xr = (x + 1) % gw;
        const idx = y * gw + x;
        const n =
          caGrid[yu * gw + xl] + caGrid[yu * gw + x] + caGrid[yu * gw + xr] +
          caGrid[y  * gw + xl]                       + caGrid[y  * gw + xr] +
          caGrid[yd * gw + xl] + caGrid[yd * gw + x] + caGrid[yd * gw + xr];
        if (caGrid[idx]) {
          if (caSurvive.has(n)) {
            caNext[idx] = 1;
            if (caAge[idx] < 65535) caAge[idx]++;
            pop++;
          } else {
            caNext[idx] = 0;
            // age stays for trail rendering, will decay
          }
        } else {
          if (caBirth.has(n)) {
            caNext[idx] = 1;
            caAge[idx] = 1;
            pop++;
          } else {
            caNext[idx] = 0;
            // decay age for trail effect
            if (caAge[idx] > 0) caAge[idx] = Math.max(0, caAge[idx] - 2);
          }
        }
      }
    }
    // Swap
    const tmp = caGrid;
    caGrid = caNext;
    caNext = tmp;
    caGen++;
    caPop = pop;
  }

  function caRender() {
    const cs = caCellSize;
    const gw = caGridW, gh = caGridH;
    // Background with optional trail fade
    if (caFade > 0) {
      ctx4.fillStyle = `rgba(0, 0, 0, ${caFade / 100})`;
      ctx4.fillRect(0, 0, W4, H4);
    } else {
      ctx4.fillStyle = '#000';
      ctx4.fillRect(0, 0, W4, H4);
    }
    // Draw live cells
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const idx = y * gw + x;
        if (caGrid[idx]) {
          const age = caAge[idx];
          // Color shifts with age: young = bright, old = darker / hue shift
          const hueShift = (age * 8) % 60;
          const hue = (caHue + hueShift) % 360;
          const light = Math.max(25, 65 - age * 1.5);
          ctx4.fillStyle = `hsl(${hue}, 85%, ${light}%)`;
          ctx4.fillRect(x * cs, y * cs, cs, cs);
        } else if (caFade > 0 && caAge[idx] > 0) {
          // Trail ghost
          const light = Math.min(15, caAge[idx] * 0.8);
          ctx4.fillStyle = `hsla(${caHue}, 60%, ${light}%, 0.5)`;
          ctx4.fillRect(x * cs, y * cs, cs, cs);
        }
      }
    }
  }

  function caUpdateUI() {
    document.getElementById('ca-gen').textContent = caGen.toLocaleString();
    document.getElementById('ca-pop').textContent = caPop.toLocaleString();
  }

  // Mouse interaction — draw cells by dragging
  let caDrawing = false;
  function getCanvas4Pos(e) {
    const rect = canvas4.getBoundingClientRect();
    let cx, cy;
    if (e.touches && e.touches[0]) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }
    return [
      Math.floor((cx - rect.left) * (W4 / rect.width) / caCellSize),
      Math.floor((cy - rect.top) * (H4 / rect.height) / caCellSize)
    ];
  }

  function caDrawAt(e) {
    const [gx, gy] = getCanvas4Pos(e);
    if (gx < 0 || gx >= caGridW || gy < 0 || gy >= caGridH) return;
    // Draw a small cluster
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = gx + dx, y = gy + dy;
        if (x >= 0 && x < caGridW && y >= 0 && y < caGridH) {
          caGrid[y * caGridW + x] = 1;
          caAge[y * caGridW + x] = 1;
        }
      }
    }
    caCountPop();
  }

  canvas4.addEventListener('mousedown', (e) => { caDrawing = true; caDrawAt(e); });
  canvas4.addEventListener('mousemove', (e) => { if (caDrawing) caDrawAt(e); });
  canvas4.addEventListener('mouseup', () => { caDrawing = false; });
  canvas4.addEventListener('mouseleave', () => { caDrawing = false; });
  canvas4.addEventListener('touchstart', (e) => { e.preventDefault(); caDrawing = true; caDrawAt(e); }, { passive: false });
  canvas4.addEventListener('touchmove', (e) => { e.preventDefault(); if (caDrawing) caDrawAt(e); }, { passive: false });
  canvas4.addEventListener('touchend', () => { caDrawing = false; });

  // Controls
  bindSlider('slider-ca-cell', 'ca-cell-val', (n) => {
    caCellSize = n;
    caInit();
  });
  bindSlider('slider-ca-speed', 'ca-speed-val', (n) => { caSpeed = n; });
  bindSlider('slider-ca-fade', 'ca-fade-val', (n) => { caFade = n; });
  bindSlider('slider-ca-hue', 'ca-hue-val', (n) => { caHue = n; });

  document.getElementById('ca-b-input').addEventListener('input', caApplyRule);
  document.getElementById('ca-s-input').addEventListener('input', caApplyRule);

  document.getElementById('ca-reset').addEventListener('click', caInit);
  document.getElementById('ca-clear').addEventListener('click', caClear);
  document.getElementById('ca-randomize').addEventListener('click', caRandomize);
  document.getElementById('ca-step-btn').addEventListener('click', () => {
    caStep(); caRender(); caUpdateUI();
  });
  document.getElementById('ca-pause').addEventListener('click', (e) => {
    expPaused[3] = !expPaused[3];
    e.target.textContent = expPaused[3] ? 'Resume' : 'Pause';
    document.getElementById('status-text').textContent = expPaused.every(p => p) ? 'paused' : 'experiment running';
  });

  document.querySelectorAll('#ca-presets .preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ca-presets .preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('ca-b-input').value = btn.dataset.b;
      document.getElementById('ca-s-input').value = btn.dataset.s;
      caApplyRule();
    });
  });

  // Initialize (moved from bootstrap)
  caInit();
  caRender();
