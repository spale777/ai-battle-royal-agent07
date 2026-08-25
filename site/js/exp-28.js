// ============================================================
  //  EXPERIMENT 28 — Logistic Map Bifurcation Diagram
  // ============================================================
  const lmCanvasA = document.getElementById('canvas28a');
  const lmCtxA = lmCanvasA.getContext('2d');
  const lmCanvasB = document.getElementById('canvas28b');
  const lmCtxB = lmCanvasB.getContext('2d');
  let lmWA = lmCanvasA.width, lmHA = lmCanvasA.height;
  let lmWB = lmCanvasB.width, lmHB = lmCanvasB.height;

  let lmRMin = 2.5, lmRMax = 4.0;
  let lmXMin = 0, lmXMax = 1;
  let lmIterations = 500, lmWarmup = 200;
  let lmHue = 210, lmColorMode = 'density';
  let lmCwr = 2.8, lmCwSteps = 60;
  let lmPresetName = 'Full View';
  let lmNeedsRender = true;

  // Density accumulation buffer for the bifurcation diagram
  let lmDensity = null;
  let lmMaxDensity = 1;

  function lmComputeBifurcation() {
    const cols = lmWA;
    const rows = lmHA;
    lmDensity = new Float32Array(cols * rows);
    lmMaxDensity = 1;

    const dr = (lmRMax - lmRMin) / cols;
    const yRange = lmXMax - lmXMin;

    for (let col = 0; col < cols; col++) {
      const r = lmRMin + col * dr;
      let x = 0.5;
      // Warmup — discard transient
      for (let i = 0; i < lmWarmup; i++) {
        x = r * x * (1 - x);
        if (x < 0) x = 0;
        if (x > 1) x = 1;
      }
      // Collect attractor points
      for (let i = 0; i < lmIterations; i++) {
        x = r * x * (1 - x);
        if (x < 0 || x > 1) break;
        const row = Math.floor((x - lmXMin) / yRange * rows);
        if (row >= 0 && row < rows) {
          lmDensity[row * cols + col]++;
        }
      }
    }
    // Find max density for normalization
    for (let i = 0; i < lmDensity.length; i++) {
      if (lmDensity[i] > lmMaxDensity) lmMaxDensity = lmDensity[i];
    }
  }

  function lmHslToRgb(h, s, l) {
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
    return [r * 255, g * 255, b * 255];
  }

  function lmRenderBifurcation() {
    if (!lmDensity) lmComputeBifurcation();

    const imgData = lmCtxA.createImageData(lmWA, lmHA);
    const data = imgData.data;
    const cols = lmWA;
    const rows = lmHA;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const d = lmDensity[idx];
        const t = d / lmMaxDensity; // 0 to 1 density
        let r, g, b;

        if (d === 0) {
          r = 10; g = 10; b = 15;
        } else {
          const intensity = Math.pow(t, 0.5); // gamma for visibility
          if (lmColorMode === 'mono') {
            r = g = b = intensity * 255;
          } else if (lmColorMode === 'rainbow') {
            const hue = lmHue + (col / cols) * 360;
            [r, g, b] = lmHslToRgb(hue % 360, 80 + intensity * 20, 20 + intensity * 60);
          } else if (lmColorMode === 'fire') {
            r = Math.min(255, intensity * 2 * 255);
            g = Math.max(0, (intensity - 0.3) * 1.5 * 255);
            b = Math.max(0, (intensity - 0.7) * 2 * 255);
          } else if (lmColorMode === 'ocean') {
            r = Math.max(0, (intensity - 0.6) * 255);
            g = Math.max(0, (intensity - 0.3) * 0.8 * 255);
            b = Math.min(255, (intensity * 0.8 + 0.2) * 255);
          } else {
            // density — hue shifts with density
            const hue = (lmHue + intensity * 60) % 360;
            [r, g, b] = lmHslToRgb(hue, 70 + intensity * 30, 15 + intensity * 70);
          }
        }

        const di = (row * cols + col) * 4;
        data[di] = r;
        data[di + 1] = g;
        data[di + 2] = b;
        data[di + 3] = 255;
      }
    }
    lmCtxA.putImageData(imgData, 0, 0);

    // Draw crosshair at current cobweb r
    if (lmCwr >= lmRMin && lmCwr <= lmRMax) {
      const cx = (lmCwr - lmRMin) / (lmRMax - lmRMin) * lmWA;
      lmCtxA.strokeStyle = 'rgba(255, 92, 31, 0.7)';
      lmCtxA.lineWidth = 1;
      lmCtxA.setLineDash([4, 4]);
      lmCtxA.beginPath();
      lmCtxA.moveTo(cx, 0);
      lmCtxA.lineTo(cx, lmHA);
      lmCtxA.stroke();
      lmCtxA.setLineDash([]);
    }

    document.getElementById('lm-r-val').textContent = lmCwr.toFixed(3);
  }

  function lmRenderCobweb() {
    const ctx = lmCtxB;
    const W = lmWB, H = lmHB;
    const pad = 20;

    // Map x from [0,1] to [pad, W-pad]
    const mx2px = x => pad + x * (W - 2 * pad);
    const my2py = y => H - pad - y * (H - 2 * pad);

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const p = pad + (i / 4) * (W - 2 * pad);
      const q = pad + (i / 4) * (H - 2 * pad);
      ctx.beginPath(); ctx.moveTo(p, pad); ctx.lineTo(p, H - pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, q); ctx.lineTo(W - pad, q); ctx.stroke();
    }

    // Diagonal y = x
    ctx.strokeStyle = 'rgba(150, 150, 170, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mx2px(0), my2py(0));
    ctx.lineTo(mx2px(1), my2py(1));
    ctx.stroke();

    // Parabola y = r*x*(1-x)
    ctx.strokeStyle = '#3b9eff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let first = true;
    for (let px = 0; px <= 1; px += 0.005) {
      const py = lmCwr * px * (1 - px);
      const sx = mx2px(px), sy = my2py(py);
      if (first) { ctx.moveTo(sx, sy); first = false; }
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Cobweb path
    ctx.strokeStyle = '#ff5c1f';
    ctx.lineWidth = 1;
    let x = 0.5;
    // Warmup
    for (let i = 0; i < 50; i++) x = lmCwr * x * (1 - x);
    if (x < 0) x = 0; if (x > 1) x = 1;

    let px = mx2px(x), py = my2py(x);
    ctx.beginPath();
    ctx.moveTo(px, py);
    for (let i = 0; i < lmCwSteps; i++) {
      const fx = lmCwr * x * (1 - x);
      if (fx < 0 || fx > 1) break;
      // Up to parabola
      const fy = my2py(fx);
      ctx.lineTo(px, fy);
      // Across to diagonal
      const nx = mx2px(fx);
      ctx.lineTo(nx, fy);
      x = fx;
      px = nx;
      py = my2py(x);
    }
    ctx.stroke();

    // Fixed point marker
    if (lmCwr > 0 && lmCwr <= 4) {
      const fixed = (lmCwr - 1) / lmCwr;
      if (fixed >= 0 && fixed <= 1) {
        ctx.fillStyle = '#ff5c1f';
        ctx.beginPath();
        ctx.arc(mx2px(fixed), my2py(fixed), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    document.getElementById('lm-cobweb-status').textContent =
      'Cobweb \u00b7 r = ' + lmCwr.toFixed(3);
  }

  function lmRenderAll() {
    lmComputeBifurcation();
    lmRenderBifurcation();
    lmRenderCobweb();
  }

  // --- Presets ---
  function lmLoadPreset(name) {
    const presets = {
      full:    { rMin: 2.5,    rMax: 4.0,    label: 'Full View' },
      cascade: { rMin: 2.9,    rMax: 3.2,    label: 'Period Doubling' },
      chaos:   { rMin: 3.5,    rMax: 3.58,   label: 'Onset of Chaos' },
      '3window': { rMin: 3.82,  rMax: 3.86,  label: 'Period-3 Window' },
      '4window': { rMin: 3.35,  rMax: 3.45,  label: 'Period-4 Window' },
      edge:    { rMin: 3.56,   rMax: 3.58,   label: 'Edge of Chaos' },
      deep3:   { rMin: 3.844,  rMax: 3.857,  label: 'Deep Period-3' }
    };
    const p = presets[name];
    if (!p) return;
    lmRMin = p.rMin; lmRMax = p.rMax;
    lmPresetName = p.label;
    document.getElementById('lm-status').textContent = 'Bifurcation \u00b7 ' + p.label;
    document.getElementById('slider-lm-rmin').value = p.rMin;
    document.getElementById('slider-lm-rmax').value = p.rMax;
    document.getElementById('lm-rmin-val').textContent = p.rMin.toFixed(3);
    document.getElementById('lm-rmax-val').textContent = p.rMax.toFixed(3);
    lmRenderAll();
  }

  // --- Bifurcation canvas interaction: click to zoom ---
  lmCanvasA.addEventListener('click', function(e) {
    const rect = lmCanvasA.getBoundingClientRect();
    const sx = (e.clientX - rect.left) / rect.width;
    const r = lmRMin + sx * (lmRMax - lmRMin);
    const range = (lmRMax - lmRMin) * 0.5;
    lmRMin = r - range / 2;
    lmRMax = r + range / 2;
    if (lmRMin < 2) { lmRMax += (2 - lmRMin); lmRMin = 2; }
    if (lmRMax > 4) { lmRMin -= (lmRMax - 4); lmRMax = 4; }
    document.getElementById('slider-lm-rmin').value = lmRMin;
    document.getElementById('slider-lm-rmax').value = lmRMax;
    document.getElementById('lm-rmin-val').textContent = lmRMin.toFixed(3);
    document.getElementById('lm-rmax-val').textContent = lmRMax.toFixed(3);
    lmPresetName = 'Custom Zoom';
    document.getElementById('lm-status').textContent = 'Bifurcation \u00b7 Custom Zoom';
    lmRenderAll();
  });

  lmCanvasA.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    const range = lmRMax - lmRMin;
    const center = (lmRMin + lmRMax) / 2;
    const newRange = Math.min(1.5, range * 2);
    lmRMin = Math.max(2, center - newRange / 2);
    lmRMax = Math.min(4, center + newRange / 2);
    if (lmRMax - lmRMin < 1.5) {
      lmRMin = Math.max(2, center - 0.75);
      lmRMax = Math.min(4, center + 0.75);
    }
    document.getElementById('slider-lm-rmin').value = lmRMin;
    document.getElementById('slider-lm-rmax').value = lmRMax;
    document.getElementById('lm-rmin-val').textContent = lmRMin.toFixed(3);
    document.getElementById('lm-rmax-val').textContent = lmRMax.toFixed(3);
    lmPresetName = 'Custom Zoom';
    document.getElementById('lm-status').textContent = 'Bifurcation \u00b7 Custom Zoom';
    lmRenderAll();
  });

  // Mouse hover on bifurcation: update cobweb r
  lmCanvasA.addEventListener('mousemove', function(e) {
    const rect = lmCanvasA.getBoundingClientRect();
    const sx = (e.clientX - rect.left) / rect.width;
    const r = lmRMin + sx * (lmRMax - lmRMin);
    lmCwr = r;
    document.getElementById('slider-lm-cwr').value = r;
    document.getElementById('lm-cwr-val').textContent = r.toFixed(3);
    lmRenderCobweb();
    lmRenderBifurcation();
  });

  // --- Controls ---
  document.getElementById('slider-lm-rmin').addEventListener('input', function() {
    lmRMin = parseFloat(this.value);
    if (lmRMin >= lmRMax) lmRMin = lmRMax - 0.001;
    document.getElementById('lm-rmin-val').textContent = lmRMin.toFixed(3);
    lmPresetName = 'Custom';
    lmRenderAll();
  });
  document.getElementById('slider-lm-rmax').addEventListener('input', function() {
    lmRMax = parseFloat(this.value);
    if (lmRMax <= lmRMin) lmRMax = lmRMin + 0.001;
    document.getElementById('lm-rmax-val').textContent = lmRMax.toFixed(3);
    lmPresetName = 'Custom';
    lmRenderAll();
  });
  document.getElementById('slider-lm-iter').addEventListener('input', function() {
    lmIterations = parseInt(this.value);
    document.getElementById('lm-iter-val').textContent = this.value;
    lmRenderAll();
  });
  document.getElementById('slider-lm-warmup').addEventListener('input', function() {
    lmWarmup = parseInt(this.value);
    document.getElementById('lm-warmup-val').textContent = this.value;
    lmRenderAll();
  });
  document.getElementById('slider-lm-hue').addEventListener('input', function() {
    lmHue = parseInt(this.value);
    document.getElementById('lm-hue-val').textContent = this.value;
    lmRenderBifurcation();
  });
  document.getElementById('lm-colormode').addEventListener('change', function() {
    lmColorMode = this.value;
    lmRenderBifurcation();
  });
  document.getElementById('slider-lm-cwr').addEventListener('input', function() {
    lmCwr = parseFloat(this.value);
    document.getElementById('lm-cwr-val').textContent = lmCwr.toFixed(3);
    lmRenderCobweb();
    lmRenderBifurcation();
  });
  document.getElementById('slider-lm-cws').addEventListener('input', function() {
    lmCwSteps = parseInt(this.value);
    document.getElementById('lm-cws-val').textContent = this.value;
    lmRenderCobweb();
  });

  // Presets
  document.querySelectorAll('#lm-presets .preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#lm-presets .preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      lmLoadPreset(this.dataset.preset);
    });
  });

  document.getElementById('lm-reset').addEventListener('click', function() {
    lmLoadPreset('full');
    lmCwr = 2.8;
    document.getElementById('slider-lm-cwr').value = 2.8;
    document.getElementById('lm-cwr-val').textContent = '2.800';
    lmRenderAll();
  });
  document.getElementById('lm-pause').addEventListener('click', function() {
    expPaused[27] = !expPaused[27];
    this.textContent = expPaused[27] ? 'Resume' : 'Pause';
  });
  document.getElementById('lm-randomize').addEventListener('click', function() {
    lmHue = Math.floor(Math.random() * 360);
    const modes = ['density', 'rainbow', 'mono', 'fire', 'ocean'];
    lmColorMode = modes[Math.floor(Math.random() * modes.length)];
    document.getElementById('slider-lm-hue').value = lmHue;
    document.getElementById('lm-hue-val').textContent = lmHue;
    document.getElementById('lm-colormode').value = lmColorMode;
    lmCwr = 2 + Math.random() * 2;
    document.getElementById('slider-lm-cwr').value = lmCwr;
    document.getElementById('lm-cwr-val').textContent = lmCwr.toFixed(3);
    lmRenderAll();
  });
  document.getElementById('lm-save').addEventListener('click', function() {
    const link = document.createElement('a');
    link.download = 'logistic-map-' + lmPresetName.toLowerCase().replace(/\s+/g, '-') + '.png';
    link.href = lmCanvasA.toDataURL();
    link.click();
  });

  // Initialize
  lmRenderAll();
