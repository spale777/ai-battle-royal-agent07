// ============================================================
  //  EXPERIMENT 33 — Chladni Plate Patterns
  //  First experiment with Web Audio API — sound + vision
  // ============================================================
  const chlCanvas = document.getElementById('canvas33');
  const chlCtx = chlCanvas.getContext('2d');
  const chlW = chlCanvas.width;
  const chlH = chlCanvas.height;

  // Mode parameters
  let chlM = 1, chlN = 2;
  let chlM2 = 0, chlN2 = 0;
  let chlMix = 0;          // 0 = pure mode 1, 1 = pure mode 2
  let chlParticleCount = 8000;
  let chlSpeed = 2;
  let chlNoise = 3;
  let chlPSize = 1.5;
  let chlHueOffset = 200;
  let chlColorMode = 'node';
  let chlSpeedSteps = 2;

  // Audio
  let chlAudioCtx = null;
  let chlOsc = null;
  let chlGain = null;
  let chlPlaying = false;
  const chlBaseFreq = 60;   // base frequency for m=1, n=0

  // Particles
  let chlPX = null, chlPY = null;
  let chlPR = 0, chlPG = 0, chlPB = 0;  // per-particle color (not used — we draw by position)
  let chlImageData = null;

  // Grid for mode shape lookup (precomputed for speed)
  const chlGridN = 150;       // 150×100 lookup grid
  const chlGridH = Math.round(chlGridN * chlH / chlW);
  let chlGrid = null;         // Float32Array of |W| values
  let chlMaxW = 1;            // normalization factor

  function chlComputeGrid() {
    if (!chlGrid || chlGrid.length !== chlGridN * chlGridH) {
      chlGrid = new Float32Array(chlGridN * chlGridH);
    }
    chlMaxW = 0;
    const mixA = 1 - chlMix / 100;
    const mixB = chlMix / 100;
    for (let gy = 0; gy < chlGridH; gy++) {
      const ny = gy / (chlGridH - 1);  // 0..1
      for (let gx = 0; gx < chlGridN; gx++) {
        const nx = gx / (chlGridN - 1);  // 0..1
        const w1 = Math.cos(chlM * Math.PI * nx) * Math.cos(chlN * Math.PI * ny);
        var w2 = 0;
        if (mixB > 0.001) {
          w2 = Math.cos(chlM2 * Math.PI * nx) * Math.cos(chlN2 * Math.PI * ny);
        }
        const w = mixA * w1 + mixB * w2;
        const idx = gy * chlGridN + gx;
        chlGrid[idx] = w;
        const aw = Math.abs(w);
        if (aw > chlMaxW) chlMaxW = aw;
      }
    }
    if (chlMaxW < 0.01) chlMaxW = 1;
  }

  function chlWAt(x, y) {
    // x, y in [0, chlW], [0, chlH] → map to grid
    const gx = Math.min(chlGridN - 1, Math.max(0, Math.round(x / chlW * (chlGridN - 1))));
    const gy = Math.min(chlGridH - 1, Math.max(0, Math.round(y / chlH * (chlGridH - 1))));
    return chlGrid[gy * chlGridN + gx] / chlMaxW;
  }

  function chlInit() {
    chlComputeGrid();
    chlResizeParticles();
    // Random initial positions
    for (let i = 0; i < chlParticleCount; i++) {
      chlPX[i] = Math.random() * chlW;
      chlPY[i] = Math.random() * chlH;
    }
    chlRender();
  }

  function chlResizeParticles() {
    chlPX = new Float32Array(chlParticleCount);
    chlPY = new Float32Array(chlParticleCount);
  }

  function chlStep() {
    const dt = 1.0;
    const noiseAmt = chlNoise * 0.3;
    for (let i = 0; i < chlParticleCount; i++) {
      const px = chlPX[i];
      const py = chlPY[i];
      // Sample W at current position
      const w = chlWAt(px, py);
      // Gradient via finite difference
      const eps = 2;
      const wdx = chlWAt(Math.min(px + eps, chlW), py) - chlWAt(Math.max(px - eps, 0), py);
      const wdy = chlWAt(px, Math.min(py + eps, chlH)) - chlWAt(px, Math.max(py - eps, 0));
      // Move toward nodes (|W| ≈ 0): push in direction of decreasing |W|
      // d|W|/dx = sign(w) * dw/dx
      const sgnw = w >= 0 ? 1 : -1;
      let dx = -sgnw * wdx * chlSpeed * 3;
      let dy = -sgnw * wdy * chlSpeed * 3;

      // Add noise
      if (noiseAmt > 0) {
        dx += (Math.random() - 0.5) * noiseAmt;
        dy += (Math.random() - 0.5) * noiseAmt;
      }

      // Damping near nodes (settle)
      const aw = Math.abs(w);
      if (aw < 0.05) {
        dx *= 0.3;
        dy *= 0.3;
      }

      let nx = px + dx;
      let ny = py + dy;

      // Boundary: reflect or wrap
      if (nx < 0) nx = -nx;
      else if (nx > chlW) nx = 2 * chlW - nx;
      if (ny < 0) ny = -ny;
      else if (ny > chlH) ny = 2 * chlH - ny;

      // Safety clamp
      if (nx < 0) nx = 0; else if (nx > chlW - 1) nx = chlW - 1;
      if (ny < 0) ny = 0; else if (ny > chlH - 1) ny = chlH - 1;

      chlPX[i] = nx;
      chlPY[i] = ny;
    }
  }

  function chlRender() {
    // Dark background with slight trail
    chlCtx.fillStyle = 'rgba(10, 10, 14, 0.35)';
    chlCtx.fillRect(0, 0, chlW, chlH);

    // Draw nodal lines as faint background guide
    chlCtx.strokeStyle = 'rgba(255, 92, 31, 0.04)';
    chlCtx.lineWidth = 1;
    // Draw contour at W=0 using grid marching
    chlDrawNodalLines();

    // Draw particles
    const psize = chlPSize;
    if (chlColorMode === 'mono') {
      chlCtx.fillStyle = 'rgba(232, 232, 236, 0.6)';
      for (let i = 0; i < chlParticleCount; i++) {
        chlCtx.fillRect(chlPX[i], chlPY[i], psize, psize);
      }
    } else {
      // Color particles based on their position's |W| value
      for (let i = 0; i < chlParticleCount; i++) {
        const px = chlPX[i];
        const py = chlPY[i];
        const w = chlWAt(px, py);
        const aw = Math.abs(w);
        let h, s, l;
        if (chlColorMode === 'node') {
          // warm near nodes (aw→0), cool at antinodes (aw→1)
          h = chlHueOffset + (1 - aw) * 60;
          s = 70;
          l = 30 + (1 - aw) * 50;
        } else if (chlColorMode === 'amplitude') {
          // bright at antinodes
          h = chlHueOffset;
          s = 80;
          l = 20 + aw * 60;
        } else { // velocity
          // color by gradient magnitude (proxy for velocity)
          const eps = 2;
          const wdx = chlWAt(Math.min(px + eps, chlW), py) - chlWAt(Math.max(px - eps, 0), py);
          const wdy = chlWAt(px, Math.min(py + eps, chlH)) - chlWAt(px, Math.max(py - eps, 0));
          const vel = Math.sqrt(wdx * wdx + wdy * wdy);
          h = chlHueOffset + vel * 180;
          s = 70;
          l = 30 + Math.min(1, vel * 3) * 40;
        }
        chlCtx.fillStyle = 'hsla(' + ((h % 360 + 360) % 360) + ',' + s + '%,' + l + '%,0.7)';
        chlCtx.fillRect(px, py, psize, psize);
      }
    }
  }

  function chlDrawNodalLines() {
    // March across the grid, drawing line segments where W crosses zero
    for (let gy = 0; gy < chlGridH - 1; gy++) {
      for (let gx = 0; gx < chlGridN - 1; gx++) {
        const w00 = chlGrid[gy * chlGridN + gx] / chlMaxW;
        const w10 = chlGrid[gy * chlGridN + gx + 1] / chlMaxW;
        const w01 = chlGrid[(gy + 1) * chlGridN + gx] / chlMaxW;
        // Horizontal edge crossing
        if (w00 * w10 < 0) {
          const t = w00 / (w00 - w10);
          const x0 = (gx + t) / (chlGridN - 1) * chlW;
          const y0 = gy / (chlGridH - 1) * chlH;
          chlCtx.beginPath();
          chlCtx.moveTo(x0, y0);
          // Connect to next row crossing if exists
          const w10n = chlGrid[(gy + 1) * chlGridN + gx + 1] / chlMaxW;
          if (w01 * w10n < 0) {
            const t2 = w01 / (w01 - w10n);
            const x1 = (gx + 1 + t2) / (chlGridN - 1) * chlW;
            const y1 = (gy + 1) / (chlGridH - 1) * chlH;
            chlCtx.lineTo(x1, y1);
          }
          chlCtx.stroke();
        }
        // Vertical edge crossing
        if (w00 * w01 < 0) {
          const t = w00 / (w00 - w01);
          const x0 = gx / (chlGridN - 1) * chlW;
          const y0 = (gy + t) / (chlGridH - 1) * chlH;
          chlCtx.beginPath();
          chlCtx.moveTo(x0, y0);
          const w11 = chlGrid[(gy + 1) * chlGridN + gx + 1] / chlMaxW;
          if (w10 * w11 < 0) {
            const t2 = w10 / (w10 - w11);
            const x1 = (gx + 1) / (chlGridN - 1) * chlW;
            const y1 = (gy + 1 + t2) / (chlGridH - 1) * chlH;
            chlCtx.lineTo(x1, y1);
          }
          chlCtx.stroke();
        }
      }
    }
  }

  function chlUpdateStatus() {
    const m1 = chlMix < 50 ? chlM : chlM2;
    const n1 = chlMix < 50 ? chlN : chlN2;
    const freq = Math.round(chlBaseFreq * Math.sqrt(m1 * m1 + n1 * n1));
    const modeStr = chlMix > 0 && chlMix < 100
      ? 'Mode (' + chlM + ',' + chlN + ')+(' + chlM2 + ',' + chlN2 + ')'
      : 'Mode (' + m1 + ',' + n1 + ')';
    document.getElementById('chl-status').textContent = 'Chladni · ' + modeStr;
    document.getElementById('chl-info').textContent = freq + ' Hz';
    if (chlPlaying && chlOsc) {
      chlOsc.frequency.setValueAtTime(freq, chlAudioCtx.currentTime);
    }
  }

  function chlLoadPreset(mode) {
    // mode is a 2-digit string like "12", "22", "33"
    const m = parseInt(mode[0]);
    const n = parseInt(mode[1]);
    chlM = m; chlN = n;
    chlM2 = 0; chlN2 = 0; chlMix = 0;
    document.getElementById('slider-chl-m').value = m;
    document.getElementById('slider-chl-n').value = n;
    document.getElementById('slider-chl-m2').value = 0;
    document.getElementById('slider-chl-n2').value = 0;
    document.getElementById('slider-chl-mix').value = 0;
    document.getElementById('chl-m-val').textContent = m;
    document.getElementById('chl-n-val').textContent = n;
    document.getElementById('chl-m2-val').textContent = 0;
    document.getElementById('chl-n2-val').textContent = 0;
    document.getElementById('chl-mix-val').textContent = '0%';
    chlComputeGrid();
    chlUpdateStatus();
    // Re-scatter particles
    for (let i = 0; i < chlParticleCount; i++) {
      chlPX[i] = Math.random() * chlW;
      chlPY[i] = Math.random() * chlH;
    }
  }

  // --- Audio ---
  function chlStartAudio() {
    if (!chlAudioCtx) {
      chlAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      chlOsc = chlAudioCtx.createOscillator();
      chlGain = chlAudioCtx.createGain();
      chlOsc.type = 'sine';
      chlGain.gain.value = 0;
      chlOsc.connect(chlGain);
      chlGain.connect(chlAudioCtx.destination);
      chlOsc.start();
    }
    if (chlAudioCtx.state === 'suspended') chlAudioCtx.resume();
    const m1 = chlMix < 50 ? chlM : chlM2;
    const n1 = chlMix < 50 ? chlN : chlN2;
    const freq = chlBaseFreq * Math.sqrt(m1 * m1 + n1 * n1);
    chlOsc.frequency.setValueAtTime(freq, chlAudioCtx.currentTime);
    // Fade in
    chlGain.gain.cancelScheduledValues(chlAudioCtx.currentTime);
    chlGain.gain.setValueAtTime(chlGain.gain.value, chlAudioCtx.currentTime);
    chlGain.gain.linearRampToValueAtTime(0.08, chlAudioCtx.currentTime + 0.3);
    chlPlaying = true;
    document.getElementById('chl-play').textContent = 'Stop Sound';
  }

  function chlStopAudio() {
    if (chlGain && chlAudioCtx) {
      chlGain.gain.cancelScheduledValues(chlAudioCtx.currentTime);
      chlGain.gain.setValueAtTime(chlGain.gain.value, chlAudioCtx.currentTime);
      chlGain.gain.linearRampToValueAtTime(0, chlAudioCtx.currentTime + 0.2);
    }
    chlPlaying = false;
    document.getElementById('chl-play').textContent = 'Play Sound';
  }

  // --- Button wiring ---
  document.getElementById('chl-play').addEventListener('click', function() {
    if (chlPlaying) chlStopAudio(); else chlStartAudio();
  });
  document.getElementById('chl-pause').addEventListener('click', function() {
    expPaused[32] = !expPaused[32];
    this.textContent = expPaused[32] ? 'Resume' : 'Pause';
  });
  document.getElementById('chl-randomize').addEventListener('click', function() {
    chlM = Math.floor(Math.random() * 5) + 1;
    chlN = Math.floor(Math.random() * 5) + 1;
    chlM2 = Math.floor(Math.random() * 4);
    chlN2 = Math.floor(Math.random() * 4);
    chlMix = Math.random() < 0.4 ? Math.floor(Math.random() * 80) + 20 : 0;
    chlComputeGrid();
    chlUpdateStatus();
    // Update sliders
    document.getElementById('slider-chl-m').value = chlM;
    document.getElementById('slider-chl-n').value = chlN;
    document.getElementById('slider-chl-m2').value = chlM2;
    document.getElementById('slider-chl-n2').value = chlN2;
    document.getElementById('slider-chl-mix').value = chlMix;
    document.getElementById('chl-m-val').textContent = chlM;
    document.getElementById('chl-n-val').textContent = chlN;
    document.getElementById('chl-m2-val').textContent = chlM2;
    document.getElementById('chl-n2-val').textContent = chlN2;
    document.getElementById('chl-mix-val').textContent = chlMix + '%';
    // Re-scatter
    for (let i = 0; i < chlParticleCount; i++) {
      chlPX[i] = Math.random() * chlW;
      chlPY[i] = Math.random() * chlH;
    }
  });
  document.getElementById('chl-reset').addEventListener('click', function() {
    chlM = 1; chlN = 2; chlM2 = 0; chlN2 = 0; chlMix = 0;
    chlComputeGrid();
    chlUpdateStatus();
    document.getElementById('slider-chl-m').value = 1;
    document.getElementById('slider-chl-n').value = 2;
    document.getElementById('slider-chl-m2').value = 0;
    document.getElementById('slider-chl-n2').value = 0;
    document.getElementById('slider-chl-mix').value = 0;
    document.getElementById('chl-m-val').textContent = 1;
    document.getElementById('chl-n-val').textContent = 2;
    document.getElementById('chl-m2-val').textContent = 0;
    document.getElementById('chl-n2-val').textContent = 0;
    document.getElementById('chl-mix-val').textContent = '0%';
    for (let i = 0; i < chlParticleCount; i++) {
      chlPX[i] = Math.random() * chlW;
      chlPY[i] = Math.random() * chlH;
    }
  });
  document.getElementById('chl-save').addEventListener('click', function() {
    var link = document.createElement('a');
    link.download = 'chladni-' + chlM + '-' + chlN + '.png';
    link.href = chlCanvas.toDataURL();
    link.click();
  });

  // --- Preset buttons ---
  document.querySelectorAll('#chl-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#chl-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      chlLoadPreset(this.dataset.mode);
    });
  });

  // --- Slider wiring ---
  function chlSlider(id, valId, callback) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function() {
      var v = parseFloat(this.value);
      document.getElementById(valId).textContent = (id === 'slider-chl-mix') ? v + '%' : v;
      callback(v);
    });
  }
  chlSlider('slider-chl-m', 'chl-m-val', function(v) { chlM = v; chlComputeGrid(); chlUpdateStatus(); });
  chlSlider('slider-chl-n', 'chl-n-val', function(v) { chlN = v; chlComputeGrid(); chlUpdateStatus(); });
  chlSlider('slider-chl-m2', 'chl-m2-val', function(v) { chlM2 = v; chlComputeGrid(); chlUpdateStatus(); });
  chlSlider('slider-chl-n2', 'chl-n2-val', function(v) { chlN2 = v; chlComputeGrid(); chlUpdateStatus(); });
  chlSlider('slider-chl-mix', 'chl-mix-val', function(v) { chlMix = v; chlComputeGrid(); chlUpdateStatus(); });
  chlSlider('slider-chl-count', 'chl-count-val', function(v) {
    chlParticleCount = v;
    chlResizeParticles();
    for (var i = 0; i < chlParticleCount; i++) {
      chlPX[i] = Math.random() * chlW;
      chlPY[i] = Math.random() * chlH;
    }
  });
  chlSlider('slider-chl-speed', 'chl-speed-val', function(v) { chlSpeed = v; chlSpeedSteps = Math.max(1, Math.round(v)); });
  chlSlider('slider-chl-noise', 'chl-noise-val', function(v) { chlNoise = v; });
  chlSlider('slider-chl-psize', 'chl-psize-val', function(v) { chlPSize = v; });
  chlSlider('slider-chl-hue', 'chl-hue-val', function(v) { chlHueOffset = v; });
  var chlColorSel = document.getElementById('chl-color');
  if (chlColorSel) chlColorSel.addEventListener('change', function() { chlColorMode = this.value; });

  // Initialize
  chlInit();
