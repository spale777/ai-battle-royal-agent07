// ============================================================
  //  EXPERIMENT 26 — Diffusion-Limited Aggregation (DLA)
  // ============================================================
  var dlaCanvas = document.getElementById('canvas26');
  var dlaCtx = dlaCanvas.getContext('2d');
  var dlaCW = 600, dlaCH = 400;
  var dlaImageData = dlaCtx.createImageData(dlaCW, dlaCH);
  var dlaData = dlaImageData.data;

  // Grid for occupancy (Uint8 — 0 = empty, 1 = occupied)
  var dlaGrid = new Uint8Array(dlaCW * dlaCH);
  // Depth map for coloring (stores depth value 0..255)
  var dlaDepth = new Uint8Array(dlaCW * dlaCH);

  // State
  var dlaParticles = [];
  var dlaStickiness = 1.0;
  var dlaRate = 120;
  var dlaSpawnPct = 1.0;
  var dlaKillPct = 1.5;
  var dlaPSize = 2;
  var dlaColorMode = 'growth';
  var dlaHueOffset = 180;
  var dlaHueSpread = 120;
  var dlaGlow = 3;

  var dlaTotalStuck = 0;
  var dlaPresetName = 'snowflake';
  var dlaCenterX = dlaCW >> 1;
  var dlaCenterY = dlaCH >> 1;
  var dlaMaxRadius = 0;

  // HSL to RGB
  function dlaHSL(h, s, l) {
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }

  function dlaReset() {
    dlaGrid.fill(0);
    dlaDepth.fill(0);
    dlaParticles = [];
    dlaTotalStuck = 0;
    dlaMaxRadius = 0;
    dlaApplyPreset(dlaPresetName);
    dlaRender();
  }

  function dlaClearAll() {
    dlaGrid.fill(0);
    dlaDepth.fill(0);
    dlaParticles = [];
    dlaTotalStuck = 0;
    dlaMaxRadius = 0;
    dlaCtx.fillStyle = '#0a0a0b';
    dlaCtx.fillRect(0, 0, dlaCW, dlaCH);
  }

  function dlaSeedAt(px, py) {
    if (px < 0 || px >= dlaCW || py < 0 || py >= dlaCH) return;
    var idx = py * dlaCW + px;
    if (dlaGrid[idx] === 0) {
      dlaGrid[idx] = 1;
      dlaDepth[idx] = 0;
      dlaTotalStuck++;
      dlaMaxRadius = Math.max(dlaMaxRadius, 1);
      dlaDrawPixel(px, py, 0);
    }
  }

  function dlaApplyPreset(name) {
    dlaPresetName = name;
    dlaGrid.fill(0);
    dlaDepth.fill(0);
    dlaParticles = [];
    dlaTotalStuck = 0;
    dlaMaxRadius = 0;
    dlaCtx.fillStyle = '#0a0a0b';
    dlaCtx.fillRect(0, 0, dlaCW, dlaCH);

    var cx = dlaCW / 2, cy = dlaCH / 2;

    if (name === 'snowflake') {
      // Central seed + 6-fold symmetric seeds
      dlaSeedAt(Math.round(cx), Math.round(cy));
      dlaCenterX = cx; dlaCenterY = cy;
    } else if (name === 'coral') {
      // Bottom row of seeds
      for (var x = 100; x < 500; x += 8) {
        dlaSeedAt(x, dlaCH - 20);
      }
      dlaCenterX = cx; dlaCenterY = dlaCH - 20;
    } else if (name === 'lightning') {
      // Top-center single seed, particles spawn from bottom
      dlaSeedAt(Math.round(cx), 20);
      dlaCenterX = cx; dlaCenterY = 20;
    } else if (name === 'forest') {
      // Multiple seeds along bottom
      var positions = [80, 160, 240, 320, 400, 480, 520];
      for (var i = 0; i < positions.length; i++) {
        dlaSeedAt(positions[i], dlaCH - 15);
      }
      dlaCenterX = cx; dlaCenterY = dlaCH - 15;
    } else if (name === 'radial') {
      // Circle of seeds
      var r = 60;
      for (var a = 0; a < 360; a += 45) {
        var rad = a * Math.PI / 180;
        dlaSeedAt(Math.round(cx + Math.cos(rad) * r), Math.round(cy + Math.sin(rad) * r));
      }
      dlaCenterX = cx; dlaCenterY = cy;
    } else if (name === 'mushroom') {
      // Central seed, particles spawn from top
      dlaSeedAt(Math.round(cx), Math.round(cy));
      dlaCenterX = cx; dlaCenterY = cy;
    } else if (name === 'crystal') {
      // 4-fold symmetric seeds
      dlaSeedAt(Math.round(cx), Math.round(cy));
      dlaSeedAt(Math.round(cx + 40), Math.round(cy));
      dlaSeedAt(Math.round(cx - 40), Math.round(cy));
      dlaSeedAt(Math.round(cx), Math.round(cy + 40));
      dlaSeedAt(Math.round(cx), Math.round(cy - 40));
      dlaCenterX = cx; dlaCenterY = cy;
    }

    dlaUpdateStatus();
  }

  function dlaRandomize() {
    dlaGrid.fill(0);
    dlaDepth.fill(0);
    dlaParticles = [];
    dlaTotalStuck = 0;
    dlaMaxRadius = 0;
    dlaCtx.fillStyle = '#0a0a0b';
    dlaCtx.fillRect(0, 0, dlaCW, dlaCH);

    var cx = dlaCW / 2, cy = dlaCH / 2;
    // Random center seed
    var rx = 100 + Math.floor(Math.random() * 400);
    var ry = 80 + Math.floor(Math.random() * 240);
    dlaSeedAt(rx, ry);
    dlaCenterX = rx; dlaCenterY = ry;

    // Randomize some parameters
    dlaHueOffset = Math.floor(Math.random() * 360);
    document.getElementById('dla-hue-val').textContent = dlaHueOffset;
    document.getElementById('slider-dla-hue').value = dlaHueOffset;
    dlaHueSpread = 30 + Math.floor(Math.random() * 330);
    document.getElementById('dla-hspread-val').textContent = dlaHueSpread;
    document.getElementById('slider-dla-hspread').value = dlaHueSpread;
    dlaUpdateStatus();
  }

  function dlaGetSpawnRadius() {
    var baseR = Math.max(dlaMaxRadius + 3, 10);
    var maxR = Math.min(dlaCW, dlaCH) / 2 - 5;
    return Math.min(baseR * dlaSpawnPct, maxR);
  }

  function dlaGetKillRadius() {
    var baseR = Math.max(dlaMaxRadius + 8, 20);
    var maxR = Math.max(dlaCW, dlaCH);
    return Math.min(baseR * dlaKillPct, maxR);
  }

  function dlaSpawnParticle() {
    var sr = dlaGetSpawnRadius();
    var angle = Math.random() * Math.PI * 2;
    var sx, sy;

    // Spawn on a circle around center of mass
    sx = Math.round(dlaCenterX + Math.cos(angle) * sr);
    sy = Math.round(dlaCenterY + Math.sin(angle) * sr);

    // Clamp to canvas
    if (sx < 1) sx = 1; if (sx >= dlaCW - 1) sx = dlaCW - 2;
    if (sy < 1) sy = 1; if (sy >= dlaCH - 1) sy = dlaCH - 2;

    return { x: sx, y: sy, hue: Math.random() * 360, steps: 0 };
  }

  function dlaHasNeighbor(x, y) {
    // Check 3x3 neighborhood
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < dlaCW && ny >= 0 && ny < dlaCH) {
          if (dlaGrid[ny * dlaCW + nx] === 1) return true;
        }
      }
    }
    return false;
  }

  function dlaStep() {
    if (dlaTotalStuck === 0) return;

    // Spawn particles
    var needed = dlaRate - dlaParticles.length;
    for (var i = 0; i < needed; i++) {
      dlaParticles.push(dlaSpawnParticle());
    }

    var killR = dlaGetKillRadius();
    var killR2 = killR * killR;

    // Update particles
    var newParticles = [];
    for (var i = 0; i < dlaParticles.length; i++) {
      var p = dlaParticles[i];
      p.steps++;

      // Random walk — 8 directions + small chance of larger step
      var stepSize = Math.random() < 0.15 ? 3 : (Math.random() < 0.3 ? 2 : 1);
      p.x += Math.round((Math.random() * 2 - 1) * stepSize);
      p.y += Math.round((Math.random() * 2 - 1) * stepSize);

      // Boundary check
      if (p.x < 0) p.x = 0;
      if (p.x >= dlaCW) p.x = dlaCW - 1;
      if (p.y < 0) p.y = 0;
      if (p.y >= dlaCH) p.y = dlaCH - 1;

      // Kill if too far from center
      var ddx = p.x - dlaCenterX, ddy = p.y - dlaCenterY;
      var distSq = ddx * ddx + ddy * ddy;
      if (distSq > killR2) continue;

      // Check if already occupied
      if (dlaGrid[p.y * dlaCW + p.x] === 1) {
        // Push back
        continue;
      }

      // Check if adjacent to aggregate
      if (dlaHasNeighbor(p.x, p.y)) {
        // Stick with probability
        if (Math.random() <= dlaStickiness) {
          // Stick!
          var idx = p.y * dlaCW + p.x;
          dlaGrid[idx] = 1;
          dlaDepth[idx] = Math.min(255, dlaTotalStuck & 0xFF);
          dlaTotalStuck++;

          // Track max radius from center
          var d = Math.sqrt(distSq);
          if (d > dlaMaxRadius) dlaMaxRadius = d;

          // Draw this particle
          dlaDrawPixel(p.x, p.y, p.steps);
          continue; // don't add to newParticles
        }
      }

      // Limit particle lifetime
      if (p.steps < 3000) {
        newParticles.push(p);
      }
    }
    dlaParticles = newParticles;

    // Update center of mass to follow the aggregate
    // (Subtle — keeps spawn circle around the growth)
  }

  function dlaGetColor(depth, steps) {
    var hue, sat = 85, light = 55;

    if (dlaColorMode === 'growth') {
      // Color by order of sticking — earlier particles get hueOffset,
      // later get hueOffset + hueSpread
      var t = dlaTotalStuck > 0 ? (depth / 255) : 0;
      hue = (dlaHueOffset + t * dlaHueSpread) % 360;
    } else if (dlaColorMode === 'depth') {
      // Color by depth from center of mass
      var px = 0, py = 0; // would need stored position
      hue = (dlaHueOffset + (depth / 255) * dlaHueSpread) % 360;
    } else if (dlaColorMode === 'random') {
      hue = (dlaHueOffset + (depth / 255) * dlaHueSpread) % 360;
    } else if (dlaColorMode === 'mono') {
      hue = dlaHueOffset;
      sat = 40;
      light = 35 + (depth / 255) * 40;
    } else if (dlaColorMode === 'speed') {
      // Color by how quickly the particle stuck (fewer steps = brighter)
      var speedT = Math.max(0, Math.min(1, steps / 200));
      hue = (dlaHueOffset + (1 - speedT) * dlaHueSpread) % 360;
      light = 40 + (1 - speedT) * 30;
    }

    return dlaHSL(hue, sat, light);
  }

  function dlaDrawPixel(px, py, steps) {
    var depth = dlaDepth[py * dlaCW + px];
    var rgb = dlaGetColor(depth, steps);
    var size = dlaPSize;

    if (dlaGlow > 0) {
      // Draw glow halo
      dlaCtx.globalCompositeOperation = 'lighter';
      var glowR = size + dlaGlow;
      var grad = dlaCtx.createRadialGradient(px, py, 0, px, py, glowR);
      grad.addColorStop(0, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.4)');
      grad.addColorStop(1, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');
      dlaCtx.fillStyle = grad;
      dlaCtx.beginPath();
      dlaCtx.arc(px, py, glowR, 0, Math.PI * 2);
      dlaCtx.fill();
      dlaCtx.globalCompositeOperation = 'source-over';
    }

    // Draw solid pixel
    dlaCtx.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
    if (size <= 1) {
      dlaCtx.fillRect(px, py, 1, 1);
    } else {
      var half = size >> 1;
      dlaCtx.beginPath();
      dlaCtx.arc(px, py, size * 0.5, 0, Math.PI * 2);
      dlaCtx.fill();
    }
  }

  function dlaRender() {
    // Particles are drawn as they stick — no full re-render needed.
    // But we can draw active particles as faint dots
    if (dlaParticles.length > 0 && !expPaused[25]) {
      dlaCtx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < dlaParticles.length; i++) {
        var p = dlaParticles[i];
        dlaCtx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        dlaCtx.fillRect(p.x, p.y, 1, 1);
      }
      dlaCtx.globalCompositeOperation = 'source-over';
    }
  }

  function dlaUpdateStatus() {
    var s = document.getElementById('dla-status');
    if (s) s.textContent = 'DLA · ' + dlaPresetName.charAt(0).toUpperCase() + dlaPresetName.slice(1) + ' · ' + dlaTotalStuck + ' particles';
  }

  function dlaInit() {
    dlaApplyPreset('snowflake');
    dlaUpdateStatus();
  }

  // Mouse interaction — click to add seeds
  function dlaGetMousePos(e) {
    var rect = dlaCanvas.getBoundingClientRect();
    var px = Math.round((e.clientX - rect.left) / rect.width * dlaCW);
    var py = Math.round((e.clientY - rect.top) / rect.height * dlaCH);
    return [px, py];
  }

  dlaCanvas.addEventListener('mousedown', function(e) {
    e.preventDefault();
    var pos = dlaGetMousePos(e);
    dlaSeedAt(pos[0], pos[1]);
    dlaCenterX = pos[0];
    dlaCenterY = pos[1];
    dlaUpdateStatus();
  });

  dlaCanvas.addEventListener('mousemove', function(e) {
    if (e.buttons === 1) {
      var pos = dlaGetMousePos(e);
      dlaSeedAt(pos[0], pos[1]);
    }
  });

  // Touch support
  dlaCanvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var t = e.touches[0];
    var rect = dlaCanvas.getBoundingClientRect();
    var px = Math.round((t.clientX - rect.left) / rect.width * dlaCW);
    var py = Math.round((t.clientY - rect.top) / rect.height * dlaCH);
    dlaSeedAt(px, py);
    dlaCenterX = px;
    dlaCenterY = py;
    dlaUpdateStatus();
  });

  // Button handlers
  document.getElementById('dla-reset').addEventListener('click', dlaReset);
  document.getElementById('dla-pause').addEventListener('click', function() {
    expPaused[25] = !expPaused[25];
    this.textContent = expPaused[25] ? 'Resume' : 'Pause';
  });
  document.getElementById('dla-randomize').addEventListener('click', dlaRandomize);
  document.getElementById('dla-clear').addEventListener('click', dlaClearAll);
  document.getElementById('dla-save').addEventListener('click', function() {
    var link = document.createElement('a');
    link.download = 'dla-fractal.png';
    link.href = dlaCanvas.toDataURL('image/png');
    link.click();
  });

  // Preset buttons
  document.querySelectorAll('#dla-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#dla-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      dlaApplyPreset(btn.dataset.preset);
    });
  });

  // Slider handlers
  document.getElementById('slider-dla-stick').addEventListener('input', function() {
    dlaStickiness = parseInt(this.value) / 100;
    document.getElementById('dla-stick-val').textContent = this.value;
  });
  document.getElementById('slider-dla-rate').addEventListener('input', function() {
    dlaRate = parseInt(this.value);
    document.getElementById('dla-rate-val').textContent = this.value;
  });
  document.getElementById('slider-dla-spawn').addEventListener('input', function() {
    dlaSpawnPct = parseInt(this.value) / 100;
    document.getElementById('dla-spawn-val').textContent = this.value;
  });
  document.getElementById('slider-dla-kill').addEventListener('input', function() {
    dlaKillPct = parseInt(this.value) / 100;
    document.getElementById('dla-kill-val').textContent = this.value;
  });
  document.getElementById('slider-dla-psize').addEventListener('input', function() {
    dlaPSize = parseInt(this.value);
    document.getElementById('dla-psize-val').textContent = this.value;
  });
  document.getElementById('dla-cmode').addEventListener('change', function() {
    dlaColorMode = this.value;
  });
  document.getElementById('slider-dla-hue').addEventListener('input', function() {
    dlaHueOffset = parseInt(this.value);
    document.getElementById('dla-hue-val').textContent = this.value;
  });
  document.getElementById('slider-dla-hspread').addEventListener('input', function() {
    dlaHueSpread = parseInt(this.value);
    document.getElementById('dla-hspread-val').textContent = this.value;
  });
  document.getElementById('slider-dla-glow').addEventListener('input', function() {
    dlaGlow = parseInt(this.value);
    document.getElementById('dla-glow-val').textContent = this.value;
  });

  // Initialize (moved from bootstrap)
  dlaInit();
