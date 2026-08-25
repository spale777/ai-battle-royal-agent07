// ============================================================
  //  EXPERIMENT 30 — Cyclic Cellular Automaton
  // ============================================================
  const ccaCanvas = document.getElementById('canvas30');
  const ccaCtx = ccaCanvas.getContext('2d');
  let ccaW = 300, ccaH = 200;               // grid dimensions (logical)
  let ccaCellSize = 2;                        // display px per cell
  let ccaNumStates = 14;
  let ccaThreshold = 3;
  let ccaSpeedSteps = 2;
  let ccaHueOffset = 0;
  let ccaNeighborhood = 'moore';             // 'moore' or 'vn'
  let ccaColorMode = 'spectrum';
  let ccaFadePct = 0;
  let ccaPresetName = 'Spiral';
  let ccaStepCount = 0;
  let ccaGrid = null;          // Uint8Array
  let ccaNext = null;          // Uint8Array
  let ccaImageData = null;
  let ccaMouseDown = false;

  function ccaAllocGrid() {
    ccaGrid = new Uint8Array(ccaW * ccaH);
    ccaNext = new Uint8Array(ccaW * ccaH);
  }

  function ccaStateToColor(s) {
    var t = s / ccaNumStates;
    if (ccaColorMode === 'mono') {
      var v = Math.floor(t * 255);
      return [v, v, v];
    }
    var hue, sat, light;
    if (ccaColorMode === 'spectrum') {
      hue = (ccaHueOffset + t * 360) % 360;
      sat = 90; light = 55;
    } else if (ccaColorMode === 'fire') {
      hue = (ccaHueOffset + t * 60) % 360;
      if (hue < 0) hue += 360;
      sat = 100; light = 20 + t * 50;
    } else if (ccaColorMode === 'ocean') {
      hue = (ccaHueOffset + 160 + t * 80) % 360;
      sat = 80; light = 30 + t * 40;
    } else if (ccaColorMode === 'electric') {
      hue = (ccaHueOffset + 180 + t * 120) % 360;
      sat = 100; light = 40 + t * 30;
    } else {
      hue = 0; sat = 0; light = 50;
    }
    return hslToRgb(hue, sat / 100, light / 100);
  }

  // Pre-compute color LUT for speed
  var ccaColorLUT = null;
  function ccaBuildLUT() {
    ccaColorLUT = new Uint8Array(ccaNumStates * 3);
    for (var i = 0; i < ccaNumStates; i++) {
      var rgb = ccaStateToColor(i);
      ccaColorLUT[i * 3] = rgb[0];
      ccaColorLUT[i * 3 + 1] = rgb[1];
      ccaColorLUT[i * 3 + 2] = rgb[2];
    }
  }

  function ccaStep() {
    var W = ccaW, H = ccaH, N = ccaNumStates, T = ccaThreshold;
    var g = ccaGrid, nx = ccaNext;
    var moore = ccaNeighborhood === 'moore';

    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var idx = y * W + x;
        var s = g[idx];
        var target = (s + 1) % N;
        var count = 0;

        if (moore) {
          // Moore neighborhood: 8 neighbors
          for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              var ny = (y + dy + H) % H;
              var nxp = (x + dx + W) % W;
              if (g[ny * W + nxp] === target) count++;
            }
          }
        } else {
          // von Neumann: 4 neighbors
          var up = ((y - 1 + H) % H) * W + x;
          var dn = ((y + 1) % H) * W + x;
          var lt = y * W + ((x - 1 + W) % W);
          var rt = y * W + ((x + 1) % W);
          if (g[up] === target) count++;
          if (g[dn] === target) count++;
          if (g[lt] === target) count++;
          if (g[rt] === target) count++;
        }

        if (count >= T) {
          nx[idx] = target;
        } else {
          nx[idx] = s;
        }
      }
    }

    // Swap
    var tmp = ccaGrid; ccaGrid = ccaNext; ccaNext = tmp;
    ccaStepCount++;
  }

  function ccaRender() {
    var cs = ccaCellSize;
    var cw = ccaCanvas.width, ch = ccaCanvas.height;

    // If cell size changed, recompute display dimensions
    var dispW = ccaW * cs;
    var dispH = ccaH * cs;
    if (dispW > cw || dispH > ch) {
      // Recalculate grid to fit canvas
      ccaW = Math.floor(cw / cs);
      ccaH = Math.floor(ch / cs);
      ccaAllocGrid();
      ccaRandomize();
      return;
    }

    // Render using ImageData for speed
    if (!ccaImageData || ccaImageData.width !== dispW || ccaImageData.height !== dispH) {
      ccaImageData = ccaCtx.createImageData(dispW, dispH);
    }

    var data = ccaImageData.data;
    var lut = ccaColorLUT;
    var g = ccaGrid;
    var W = ccaW, H = ccaH;

    for (var y = 0; y < dispH; y++) {
      var gy = Math.floor(y / cs);
      if (gy >= H) gy = H - 1;
      for (var x = 0; x < dispW; x++) {
        var gx = Math.floor(x / cs);
        if (gx >= W) gx = W - 1;
        var s = g[gy * W + gx];
        var di = (y * dispW + x) * 4;
        data[di] = lut[s * 3];
        data[di + 1] = lut[s * 3 + 1];
        data[di + 2] = lut[s * 3 + 2];
        data[di + 3] = 255;
      }
    }

    // Apply fade if needed
    if (ccaFadePct > 0) {
      ccaCtx.globalAlpha = 1 - ccaFadePct / 100;
    } else {
      ccaCtx.globalAlpha = 1;
    }

    // If fade, don't clear — just draw over with alpha
    if (ccaFadePct > 0) {
      ccaCtx.putImageData(ccaImageData, 0, 0);
    } else {
      ccaCtx.fillStyle = '#0a0a0b';
      ccaCtx.fillRect(0, 0, cw, ch);
      ccaCtx.putImageData(ccaImageData, 0, 0);
    }
    ccaCtx.globalAlpha = 1;

    // Update step counter
    var stepEl = document.getElementById('cca-step-val');
    if (stepEl) stepEl.textContent = ccaStepCount.toLocaleString();
  }

  function ccaRandomize() {
    for (var i = 0; i < ccaGrid.length; i++) {
      ccaGrid[i] = Math.floor(Math.random() * ccaNumStates);
    }
    ccaStepCount = 0;
    ccaBuildLUT();
    ccaRender();
  }

  function ccaClear() {
    for (var i = 0; i < ccaGrid.length; i++) {
      ccaGrid[i] = 0;
    }
    ccaStepCount = 0;
    ccaRender();
  }

  function ccaLoadPreset(name) {
    ccaPresetName = name.charAt(0).toUpperCase() + name.slice(1);
    var statusEl = document.getElementById('cca-status');
    if (statusEl) statusEl.textContent = 'CCA \u00b7 ' + ccaPresetName;

    if (name === 'spiral') {
      ccaNumStates = 14; ccaThreshold = 3; ccaNeighborhood = 'moore';
      ccaColorMode = 'spectrum'; ccaHueOffset = 0;
      ccaRandomize();
    } else if (name === 'targets') {
      ccaNumStates = 10; ccaThreshold = 2; ccaNeighborhood = 'moore';
      ccaColorMode = 'ocean'; ccaHueOffset = 180;
      // Start with a few point sources
      ccaClear();
      var seeds = 5;
      for (var i = 0; i < seeds; i++) {
        var sx = Math.floor(Math.random() * ccaW);
        var sy = Math.floor(Math.random() * ccaH);
        ccaGrid[sy * ccaW + sx] = 1;
      }
      ccaBuildLUT();
      ccaRender();
    } else if (name === 'chaos') {
      ccaNumStates = 8; ccaThreshold = 1; ccaNeighborhood = 'moore';
      ccaColorMode = 'electric'; ccaHueOffset = 200;
      ccaRandomize();
    } else if (name === 'web') {
      ccaNumStates = 16; ccaThreshold = 4; ccaNeighborhood = 'vn';
      ccaColorMode = 'fire'; ccaHueOffset = 0;
      ccaRandomize();
    } else if (name === 'labyrinth') {
      ccaNumStates = 6; ccaThreshold = 5; ccaNeighborhood = 'moore';
      ccaColorMode = 'mono'; ccaHueOffset = 0;
      ccaRandomize();
    } else if (name === 'nova') {
      ccaNumStates = 20; ccaThreshold = 3; ccaNeighborhood = 'moore';
      ccaColorMode = 'spectrum'; ccaHueOffset = 280;
      ccaRandomize();
    }

    // Sync UI controls
    var statesSlider = document.getElementById('slider-cca-states');
    if (statesSlider) { statesSlider.value = ccaNumStates; document.getElementById('cca-states-val').textContent = ccaNumStates; }
    var threshSlider = document.getElementById('slider-cca-thresh');
    if (threshSlider) { threshSlider.value = ccaThreshold; document.getElementById('cca-thresh-val').textContent = ccaThreshold; }
    var hueSlider = document.getElementById('slider-cca-hue');
    if (hueSlider) { hueSlider.value = ccaHueOffset; document.getElementById('cca-hue-val').textContent = ccaHueOffset; }
    var nbSelect = document.getElementById('cca-neighborhood');
    if (nbSelect) nbSelect.value = ccaNeighborhood;
    var cmSelect = document.getElementById('cca-colormode');
    if (cmSelect) cmSelect.value = ccaColorMode;
  }

  function ccaInit() {
    ccaAllocGrid();
    ccaBuildLUT();
    ccaLoadPreset('spiral');

    // Mouse interaction — paint new wavefronts
    function getCellPos(e) {
      var rect = ccaCanvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) * (ccaCanvas.width / rect.width);
      var y = (e.clientY - rect.top) * (ccaCanvas.height / rect.height);
      var cx = Math.floor(x / ccaCellSize);
      var cy = Math.floor(y / ccaCellSize);
      return { x: cx, y: cy };
    }

    function paintAt(cx, cy) {
      var radius = 5;
      for (var dy = -radius; dy <= radius; dy++) {
        for (var dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > radius * radius) continue;
          var px = cx + dx, py = cy + dy;
          if (px >= 0 && px < ccaW && py >= 0 && py < ccaH) {
            // Paint a gradient of states to seed spiral-like waves
            var d = Math.sqrt(dx * dx + dy * dy);
            var s = Math.floor((1 - d / radius) * ccaNumStates) % ccaNumStates;
            ccaGrid[py * ccaW + px] = s;
          }
        }
      }
    }

    ccaCanvas.addEventListener('mousedown', function(e) {
      ccaMouseDown = true;
      var p = getCellPos(e);
      paintAt(p.x, p.y);
      ccaRender();
    });

    ccaCanvas.addEventListener('mousemove', function(e) {
      if (!ccaMouseDown) return;
      var p = getCellPos(e);
      paintAt(p.x, p.y);
      ccaRender();
    });

    ccaCanvas.addEventListener('mouseup', function() { ccaMouseDown = false; });
    ccaCanvas.addEventListener('mouseleave', function() { ccaMouseDown = false; });

    // Touch support
    ccaCanvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      var t = e.touches[0];
      var rect = ccaCanvas.getBoundingClientRect();
      var x = (t.clientX - rect.left) * (ccaCanvas.width / rect.width);
      var y = (t.clientY - rect.top) * (ccaCanvas.height / rect.height);
      paintAt(Math.floor(x / ccaCellSize), Math.floor(y / ccaCellSize));
      ccaRender();
    });

    ccaCanvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      var t = e.touches[0];
      var rect = ccaCanvas.getBoundingClientRect();
      var x = (t.clientX - rect.left) * (ccaCanvas.width / rect.width);
      var y = (t.clientY - rect.top) * (ccaCanvas.height / rect.height);
      paintAt(Math.floor(x / ccaCellSize), Math.floor(y / ccaCellSize));
      ccaRender();
    });

    // Pause
    document.getElementById('cca-pause').addEventListener('click', function() {
      expPaused[29] = !expPaused[29];
      this.textContent = expPaused[29] ? 'Resume' : 'Pause';
    });

    // Reset
    document.getElementById('cca-reset').addEventListener('click', function() {
      ccaLoadPreset('spiral');
      // Reset active preset button
      document.querySelectorAll('#cca-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
      document.querySelector('#cca-presets .preset-btn[data-preset="spiral"]').classList.add('active');
    });

    // Randomize
    document.getElementById('cca-randomize').addEventListener('click', function() {
      ccaRandomize();
    });

    // Clear
    document.getElementById('cca-clear').addEventListener('click', function() {
      ccaClear();
    });

    // Save PNG
    document.getElementById('cca-save').addEventListener('click', function() {
      var link = document.createElement('a');
      link.download = 'cyclic-ca-' + ccaPresetName.toLowerCase().replace(/\s+/g, '-') + '.png';
      link.href = ccaCanvas.toDataURL();
      link.click();
    });

    // Presets
    document.querySelectorAll('#cca-presets .preset-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#cca-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        ccaLoadPreset(this.dataset.preset);
      });
    });

    // Sliders
    document.getElementById('slider-cca-states').addEventListener('input', function() {
      ccaNumStates = parseInt(this.value);
      document.getElementById('cca-states-val').textContent = ccaNumStates;
      ccaBuildLUT();
      // Clamp grid values
      for (var i = 0; i < ccaGrid.length; i++) {
        if (ccaGrid[i] >= ccaNumStates) ccaGrid[i] = ccaGrid[i] % ccaNumStates;
      }
      ccaRender();
    });

    document.getElementById('slider-cca-thresh').addEventListener('input', function() {
      ccaThreshold = parseInt(this.value);
      document.getElementById('cca-thresh-val').textContent = ccaThreshold;
    });

    document.getElementById('slider-cca-speed').addEventListener('input', function() {
      ccaSpeedSteps = parseInt(this.value);
      document.getElementById('cca-speed-val').textContent = ccaSpeedSteps;
    });

    document.getElementById('slider-cca-csize').addEventListener('input', function() {
      ccaCellSize = parseInt(this.value);
      document.getElementById('cca-csize-val').textContent = ccaCellSize;
      // Recalculate grid dimensions
      ccaW = Math.floor(ccaCanvas.width / ccaCellSize);
      ccaH = Math.floor(ccaCanvas.height / ccaCellSize);
      ccaAllocGrid();
      ccaImageData = null;
      ccaRandomize();
    });

    document.getElementById('slider-cca-hue').addEventListener('input', function() {
      ccaHueOffset = parseInt(this.value);
      document.getElementById('cca-hue-val').textContent = ccaHueOffset;
      ccaBuildLUT();
      ccaRender();
    });

    document.getElementById('cca-neighborhood').addEventListener('change', function() {
      ccaNeighborhood = this.value;
    });

    document.getElementById('cca-colormode').addEventListener('change', function() {
      ccaColorMode = this.value;
      ccaBuildLUT();
      ccaRender();
    });

    document.getElementById('slider-cca-fade').addEventListener('input', function() {
      ccaFadePct = parseInt(this.value);
      document.getElementById('cca-fade-val').textContent = ccaFadePct;
    });
  }

  ccaInit();
