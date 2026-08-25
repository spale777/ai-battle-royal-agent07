// ============================================================
  //  EXPERIMENT 09 — Wave Simulation
  // ============================================================
  const waveCanvas = document.getElementById('canvas9');
  const waveCtx = waveCanvas.getContext('2d');
  const WV_W = 600, WV_H = 400;
  const WV_COLS = 150, WV_ROWS = 100;
  const WV_CELL_W = WV_W / WV_COLS;  // 4
  const WV_CELL_H = WV_H / WV_ROWS;  // 4

  // Two buffers for the leapfrog integrator
  let waveNow = new Float32Array(WV_COLS * WV_ROWS);
  let wavePrev = new Float32Array(WV_COLS * WV_ROWS);
  let waveNext = new Float32Array(WV_COLS * WV_ROWS);

  let waveSpeed = 0.4;     // Courant number (c * dt / dx)
  let waveDamp = 0.998;    // damping factor per frame
  let waveStrength = 50;   // ripple injection amplitude
  let waveRadius = 8;      // ripple injection radius (in cells)
  let waveHue = 0;         // color shift
  let wavePalette = 'ocean';
  let waveRippleCount = 0;
  let waveImageData = null;

  // Color palettes — each returns [r,g,b] for a normalized height [-1,1]
  const wavePalettes = {
    ocean: (h) => {
      const t = (h + 1) * 0.5;  // 0..1
      const r = Math.floor(20 + t * 40);
      const g = Math.floor(40 + t * 100);
      const b = Math.floor(80 + t * 175);
      return [r, g, b];
    },
    plasma: (h) => {
      const t = (h + 1) * 0.5;
      const r = Math.floor(180 + t * 75);
      const g = Math.floor(50 + t * 100);
      const b = Math.floor(120 + t * 135);
      return [r, g, b];
    },
    thermal: (h) => {
      const t = (h + 1) * 0.5;
      let r, g, b;
      if (t < 0.25) {
        const s = t / 0.25;
        r = Math.floor(s * 80); g = 0; b = Math.floor(20 + s * 40);
      } else if (t < 0.5) {
        const s = (t - 0.25) / 0.25;
        r = Math.floor(80 + s * 175); g = Math.floor(s * 80); b = Math.floor(60 - s * 60);
      } else if (t < 0.75) {
        const s = (t - 0.5) / 0.25;
        r = 255; g = Math.floor(80 + s * 120); b = 0;
      } else {
        const s = (t - 0.75) / 0.25;
        r = 255; g = Math.floor(200 + s * 55); b = Math.floor(s * 200);
      }
      return [r, g, b];
    },
    aurora: (h) => {
      const t = (h + 1) * 0.5;
      const r = Math.floor(10 + t * 30);
      const g = Math.floor(50 + t * 200);
      const b = Math.floor(80 + t * 100);
      return [r, g, b];
    },
    spectrum: (h, hue) => {
      const t = (h + 1) * 0.5;
      const angle = (hue + t * 180) % 360;
      return hslToRgb(angle, 0.7, 0.3 + t * 0.3);
    },
    mono: (h) => {
      const t = (h + 1) * 0.5;
      const v = Math.floor(t * 255);
      return [v, v, v];
    },
  };

  function waveInit() {
    waveNow.fill(0);
    wavePrev.fill(0);
    waveNext.fill(0);
    waveRippleCount = 0;
    waveImageData = waveCtx.createImageData(WV_W, WV_H);
    // Fill with background color
    for (let i = 0; i < waveImageData.data.length; i += 4) {
      waveImageData.data[i] = 10;
      waveImageData.data[i + 1] = 10;
      waveImageData.data[i + 2] = 11;
      waveImageData.data[i + 3] = 255;
    }
    waveCtx.putImageData(waveImageData, 0, 0);
    waveUpdateStats();
  }

  function waveInject(cx, cy, amp, radius) {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= WV_COLS || y < 0 || y >= WV_ROWS) continue;
        const falloff = Math.exp(-d2 / (r2 * 0.5));
        waveNow[y * WV_COLS + x] += amp * falloff;
      }
    }
    waveRippleCount++;
    waveUpdateStats();
  }

  function waveStep() {
    const c2 = waveSpeed * waveSpeed;
    const cols = WV_COLS;
    const rows = WV_ROWS;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        // Neighbors with reflective boundary (clamp to edge)
        const xl = x > 0 ? waveNow[idx - 1] : waveNow[idx];
        const xr = x < cols - 1 ? waveNow[idx + 1] : waveNow[idx];
        const yt = y > 0 ? waveNow[idx - cols] : waveNow[idx];
        const yb = y < rows - 1 ? waveNow[idx + cols] : waveNow[idx];

        const laplacian = xl + xr + yt + yb - 4 * waveNow[idx];
        const newVal = (2 * waveNow[idx] - wavePrev[idx] + c2 * laplacian) * waveDamp;
        waveNext[idx] = newVal;
      }
    }

    // Swap buffers: prev = now, now = next
    const tmp = wavePrev;
    wavePrev = waveNow;
    waveNow = waveNext;
    waveNext = tmp;
  }

  function waveRender() {
    if (!waveImageData) waveImageData = waveCtx.createImageData(WV_W, WV_H);
    const data = waveImageData.data;
    const palette = wavePalettes[wavePalette] || wavePalettes.ocean;
    const cw = WV_CELL_W;
    const ch = WV_CELL_H;

    // For each pixel, find the nearest cell and sample its height
    for (let py = 0; py < WV_H; py++) {
      const cellY = Math.min(WV_ROWS - 1, Math.floor(py / ch));
      const rowOff = cellY * WV_COLS;
      const pixRowOff = py * WV_W;
      for (let px = 0; px < WV_W; px++) {
        const cellX = Math.min(WV_COLS - 1, Math.floor(px / cw));
        const h = waveNow[rowOff + cellX];
        // Clamp height for color mapping
        const ch_clamp = Math.max(-1, Math.min(1, h * 0.02));
        const [r, g, b] = palette(ch_clamp, waveHue);
        const di = (pixRowOff + px) * 4;
        data[di] = r;
        data[di + 1] = g;
        data[di + 2] = b;
        data[di + 3] = 255;
      }
    }
    waveCtx.putImageData(waveImageData, 0, 0);
  }

  function waveUpdateStats() {
    // Compute total energy (sum of squared amplitudes)
    let energy = 0;
    for (let i = 0; i < waveNow.length; i++) {
      energy += waveNow[i] * waveNow[i];
    }
    document.getElementById('wave-energy-val').textContent = Math.floor(energy).toLocaleString();
    document.getElementById('wave-ripples-val').textContent = waveRippleCount;
    document.getElementById('wave-palette-stat').textContent = wavePalette;
    let statusText = 'ready';
    if (expPaused[8]) {
      statusText = 'paused';
    } else if (energy > 1) {
      statusText = 'active';
    }
    document.getElementById('wave-status-text').textContent = statusText;
  }

  // Mouse interaction
  let waveMouseDown = false;
  let waveLastX = -1, waveLastY = -1;

  function waveCanvasToGrid(e) {
    const rect = waveCanvas.getBoundingClientRect();
    const scaleX = WV_W / rect.width;
    const scaleY = WV_H / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    const gx = Math.floor(px / WV_CELL_W);
    const gy = Math.floor(py / WV_CELL_H);
    return { gx: Math.max(0, Math.min(WV_COLS - 1, gx)), gy: Math.max(0, Math.min(WV_ROWS - 1, gy)) };
  }

  waveCanvas.addEventListener('mousedown', (e) => {
    waveMouseDown = true;
    const { gx, gy } = waveCanvasToGrid(e);
    waveInject(gx, gy, waveStrength, waveRadius);
    waveLastX = gx;
    waveLastY = gy;
  });

  waveCanvas.addEventListener('mousemove', (e) => {
    if (!waveMouseDown) return;
    const { gx, gy } = waveCanvasToGrid(e);
    if (gx === waveLastX && gy === waveLastY) return;
    waveInject(gx, gy, waveStrength * 0.5, waveRadius);
    waveLastX = gx;
    waveLastY = gy;
  });

  waveCanvas.addEventListener('mouseup', () => { waveMouseDown = false; });
  waveCanvas.addEventListener('mouseleave', () => { waveMouseDown = false; });

  // Touch support
  waveCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const { gx, gy } = waveCanvasToGrid(touch);
    waveInject(gx, gy, waveStrength, waveRadius);
  });

  waveCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const { gx, gy } = waveCanvasToGrid(touch);
    if (gx === waveLastX && gy === waveLastY) return;
    waveInject(gx, gy, waveStrength * 0.5, waveRadius);
    waveLastX = gx;
    waveLastY = gy;
  });

  // Control buttons
  document.getElementById('wave-ripple').addEventListener('click', () => {
    // Inject at a random position
    const gx = Math.floor(Math.random() * (WV_COLS - 20)) + 10;
    const gy = Math.floor(Math.random() * (WV_ROWS - 20)) + 10;
    waveInject(gx, gy, waveStrength, waveRadius);
  });

  document.getElementById('wave-pause').addEventListener('click', (e) => {
    expPaused[8] = !expPaused[8];
    e.target.textContent = expPaused[8] ? 'Resume' : 'Pause';
    document.getElementById('status-text').textContent = expPaused[8] ? 'paused' : 'experiment running';
    waveUpdateStats();
  });

  document.getElementById('wave-clear').addEventListener('click', () => {
    waveNow.fill(0);
    wavePrev.fill(0);
    waveNext.fill(0);
    waveRippleCount = 0;
    waveRender();
    waveUpdateStats();
  });

  document.getElementById('wave-reset').addEventListener('click', () => {
    waveInit();
  });

  // Presets
  document.querySelectorAll('#wave-presets .preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#wave-presets .preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      waveSpeed = parseFloat(btn.dataset.speed);
      waveDamp = parseFloat(btn.dataset.damp);
      wavePalette = btn.dataset.palette;
      waveRadius = parseInt(btn.dataset.radius);
      // Update sliders to match
      document.getElementById('slider-wave-speed').value = waveSpeed;
      document.getElementById('wave-speed-val').textContent = waveSpeed.toFixed(2);
      document.getElementById('slider-wave-damp').value = waveDamp;
      document.getElementById('wave-damp-val').textContent = waveDamp.toFixed(4);
      document.getElementById('slider-wave-radius').value = waveRadius;
      document.getElementById('wave-radius-val').textContent = waveRadius;
      waveUpdateStats();
    });
  });

  // Sliders
  document.getElementById('slider-wave-speed').addEventListener('input', (e) => {
    waveSpeed = parseFloat(e.target.value);
    document.getElementById('wave-speed-val').textContent = waveSpeed.toFixed(2);
  });

  document.getElementById('slider-wave-damp').addEventListener('input', (e) => {
    waveDamp = parseFloat(e.target.value);
    document.getElementById('wave-damp-val').textContent = waveDamp.toFixed(4);
  });

  document.getElementById('slider-wave-strength').addEventListener('input', (e) => {
    waveStrength = parseInt(e.target.value);
    document.getElementById('wave-strength-val').textContent = waveStrength;
  });

  document.getElementById('slider-wave-radius').addEventListener('input', (e) => {
    waveRadius = parseInt(e.target.value);
    document.getElementById('wave-radius-val').textContent = waveRadius;
  });

  document.getElementById('slider-wave-hue').addEventListener('input', (e) => {
    waveHue = parseInt(e.target.value);
    document.getElementById('wave-hue-val').textContent = waveHue;
  });

  // Initialize
  waveInit();
