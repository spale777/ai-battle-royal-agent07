// ============================================================
  //  EXPERIMENT 14 — Stable Fluids (Jos Stam's stable fluid solver)
  // ============================================================
  var sfCanvas = document.getElementById('canvas14');
  var sfCtx = sfCanvas.getContext('2d');
  var sfW = 600, sfH = 400;
  var sfN = 100;            // Grid resolution X (cells)
  var sfM = 67;             // Grid resolution Y (cells, aspect-matched)
  var sfSize = (sfN + 2) * (sfM + 2);  // +2 for boundaries on each axis
  var sfDt = 0.1;           // Timestep
  var sfVisc = 0;           // Viscosity
  var sfDiff = 0;           // Diffusion rate for dye
  var sfFade = 0.96;        // Dye fade per frame
  var sfForceStrength = 5.0;
  var sfDyeRadius = 3;
  var sfColorMode = 'rainbow';

  // Velocity fields (u, v) current and previous
  var sfU = new Float32Array(sfSize);
  var sfV = new Float32Array(sfSize);
  var sfU0 = new Float32Array(sfSize);
  var sfV0 = new Float32Array(sfSize);

  // Dye/density fields: store r, g, b channels
  var sfR = new Float32Array(sfSize);
  var sfG = new Float32Array(sfSize);
  var sfB = new Float32Array(sfSize);
  var sfR0 = new Float32Array(sfSize);
  var sfG0 = new Float32Array(sfSize);
  var sfB0 = new Float32Array(sfSize);

  // ImageData for rendering
  var sfImageData = sfCtx.createImageData(sfN, sfM);
  var sfPixels = sfImageData.data;

  // Interaction state
  var sfMouseDown = false;
  var sfLastX = 0, sfLastY = 0;
  var sfHueCounter = 0;
  var sfLastInteract = 0;  // Timestamp of last user interaction
  var sfAutoSeedTimer = 0; // Counter for auto-seeding

  function sfIX(i, j) { return i + (sfN + 2) * j; }

  function sfReset() {
    sfU.fill(0); sfV.fill(0); sfU0.fill(0); sfV0.fill(0);
    sfR.fill(0); sfG.fill(0); sfB.fill(0);
    sfR0.fill(0); sfG0.fill(0); sfB0.fill(0);
  }

  // --- Set boundaries ---
  // For velocity: reflect on top/bottom, left/right (walls)
  // For density: clamp to zero (absorbing walls) or copy (periodic)
  function sfSetBounce(what, x) {
    var i, j;
    var n = sfN, m = sfM;
    for (i = 1; i <= n; i++) {
      x[sfIX(i, 0)]   = what === 1 ? -x[sfIX(i, 1)]   : x[sfIX(i, 1)];
      x[sfIX(i, m+1)] = what === 1 ? -x[sfIX(i, m)]   : x[sfIX(i, m)];
    }
    for (j = 1; j <= m; j++) {
      x[sfIX(0, j)]   = what === 2 ? -x[sfIX(1, j)]   : x[sfIX(1, j)];
      x[sfIX(n+1, j)] = what === 2 ? -x[sfIX(n, j)]   : x[sfIX(n, j)];
    }
    // Corners
    x[sfIX(0, 0)]       = 0.5 * (x[sfIX(1, 0)]       + x[sfIX(0, 1)]);
    x[sfIX(0, m+1)]     = 0.5 * (x[sfIX(1, m+1)]     + x[sfIX(0, m)]);
    x[sfIX(n+1, 0)]     = 0.5 * (x[sfIX(n, 0)]       + x[sfIX(n+1, 1)]);
    x[sfIX(n+1, m+1)]   = 0.5 * (x[sfIX(n, m+1)]     + x[sfIX(n+1, m)]);
  }

  // --- Gauss-Seidel linear solver ---
  function sfLinSolve(what, x, x0, a, c, iter) {
    var cRecip = 1.0 / c;
    var n = sfN, m = sfM;
    for (var k = 0; k < iter; k++) {
      for (var j = 1; j <= m; j++) {
        for (var i = 1; i <= n; i++) {
          x[sfIX(i, j)] =
            (x0[sfIX(i, j)] +
             a * (x[sfIX(i+1, j)] + x[sfIX(i-1, j)] +
                  x[sfIX(i, j+1)] + x[sfIX(i, j-1)])) * cRecip;
        }
      }
      sfSetBounce(what, x);
    }
  }

  // --- Diffuse ---
  function sfDiffuse(what, x, x0, diff, dt, iter) {
    var a = dt * diff * sfN * sfM;  // scaled
    sfLinSolve(what, x, x0, a, 1 + 4 * a, iter);
  }

  // --- Project (enforce incompressibility) ---
  function sfProject(velU, velV, p, div, iter) {
    var n = sfN, m = sfM;
    for (var j = 1; j <= m; j++) {
      for (var i = 1; i <= n; i++) {
        div[sfIX(i, j)] = -0.5 * (
          velU[sfIX(i+1, j)] - velU[sfIX(i-1, j)] +
          velV[sfIX(i, j+1)] - velV[sfIX(i, j-1)]
        ) / n;
        p[sfIX(i, j)] = 0;
      }
    }
    sfSetBounce(0, div);
    sfSetBounce(0, p);
    sfLinSolve(0, p, div, 1, 4, iter);

    // Subtract gradient
    for (var j2 = 1; j2 <= m; j2++) {
      for (var i2 = 1; i2 <= n; i2++) {
        velU[sfIX(i2, j2)] -= 0.5 * n * (p[sfIX(i2+1, j2)] - p[sfIX(i2-1, j2)]);
        velV[sfIX(i2, j2)] -= 0.5 * n * (p[sfIX(i2, j2+1)] - p[sfIX(i2, j2-1)]);
      }
    }
    sfSetBounce(1, velU);
    sfSetBounce(2, velV);
  }

  // --- Advect (semi-Lagrangian) ---
  function sfAdvect(what, d, d0, velU, velV, dt) {
    var n = sfN, m = sfM;
    var dt0x = dt * n;
    var dt0y = dt * m;

    for (var j = 1; j <= m; j++) {
      for (var i = 1; i <= n; i++) {
        var x = i - dt0x * velU[sfIX(i, j)];
        var y = j - dt0y * velV[sfIX(i, j)];

        // Clamp
        if (x < 0.5) x = 0.5;
        if (x > n + 0.5) x = n + 0.5;
        var i0 = Math.floor(x);
        var i1 = i0 + 1;

        if (y < 0.5) y = 0.5;
        if (y > m + 0.5) y = m + 0.5;
        var j0 = Math.floor(y);
        var j1 = j0 + 1;

        var s1 = x - i0;
        var s0 = 1 - s1;
        var t1 = y - j0;
        var t0 = 1 - t1;

        d[sfIX(i, j)] =
          s0 * (t0 * d0[sfIX(i0, j0)] + t1 * d0[sfIX(i0, j1)]) +
          s1 * (t0 * d0[sfIX(i1, j0)] + t1 * d0[sfIX(i1, j1)]);
      }
    }
    sfSetBounce(what, d);
  }

  // --- One full step of the fluid solver ---
  function sfStep() {
    var iter = 4;  // Gauss-Seidel iterations

    // Velocity step
    sfDiffuse(1, sfU0, sfU, sfVisc, sfDt, iter);
    sfDiffuse(2, sfV0, sfV, sfVisc, sfDt, iter);
    sfProject(sfU0, sfV0, sfU, sfV, iter);

    sfAdvect(1, sfU, sfU0, sfU0, sfV0, sfDt);
    sfAdvect(2, sfV, sfV0, sfU0, sfV0, sfDt);
    sfProject(sfU, sfV, sfU0, sfV0, iter);

    // Dye step (diffuse + advect each color channel)
    if (sfDiff > 0) {
      sfDiffuse(0, sfR0, sfR, sfDiff, sfDt, iter);
      sfDiffuse(0, sfG0, sfG, sfDiff, sfDt, iter);
      sfDiffuse(0, sfB0, sfB, sfDiff, sfDt, iter);
    } else {
      sfR0.set(sfR);
      sfG0.set(sfG);
      sfB0.set(sfB);
    }

    sfAdvect(0, sfR, sfR0, sfU, sfV, sfDt);
    sfAdvect(0, sfG, sfG0, sfU, sfV, sfDt);
    sfAdvect(0, sfB, sfB0, sfU, sfV, sfDt);

    // Fade dye (exponential decay)
    if (sfFade < 1) {
      var f = sfFade;
      for (var i = 0; i < sfSize; i++) {
        sfR[i] *= f;
        sfG[i] *= f;
        sfB[i] *= f;
      }
    }

    // Auto-seed if user hasn't interacted recently (keeps canvas alive)
    sfAutoSeedTimer++;
    if (sfAutoSeedTimer > 180 && performance.now() - sfLastInteract > 5000) {
      // Inject a gentle swirl every ~3 seconds of inactivity
      sfAutoSeedTimer = 0;
      var cx = sfW * (0.2 + Math.random() * 0.6);
      var cy = sfH * (0.2 + Math.random() * 0.6);
      var angle = Math.random() * Math.PI * 2;
      sfInjectAt(cx, cy, Math.cos(angle) * 8, Math.sin(angle) * 8);
    }
  }

  // --- Render dye field to canvas ---
  function sfRender() {
    var n = sfN, m = sfM;
    var idx = 0;
    var pi = 0;

    for (var j = 1; j <= m; j++) {
      for (var i = 1; i <= n; i++) {
        var cellIdx = sfIX(i, j);
        var r = sfR[cellIdx];
        var g = sfG[cellIdx];
        var b = sfB[cellIdx];
        var v = Math.sqrt(sfU[cellIdx] * sfU[cellIdx] + sfV[cellIdx] * sfV[cellIdx]);

        if (sfColorMode === 'velocity') {
          var vn = Math.min(v * 50, 1);
          var hue = vn * 240; // blue to red
          var rgb = sfHslToRgb(hue / 360, 1, 0.5);
          r += rgb[0] * vn;
          g += rgb[1] * vn;
          b += rgb[2] * vn;
        } else if (sfColorMode === 'fire') {
          var val = (r + g + b) / 3;
          r = val * 255;
          g = val * 128;
          b = val * 20;
        } else if (sfColorMode === 'mono') {
          var gray = (r + g + b) / 3;
          r = gray;
          g = gray;
          b = gray;
        }

        sfPixels[pi]     = Math.min(255, r * 255);
        sfPixels[pi + 1] = Math.min(255, g * 255);
        sfPixels[pi + 2] = Math.min(255, b * 255);
        sfPixels[pi + 3] = 255;
        pi += 4;
      }
    }

    sfCtx.putImageData(sfImageData, 0, 0);
    // Scale up to full canvas size
    sfCtx.drawImage(sfCanvas, 0, 0, sfN, sfM, 0, 0, sfW, sfH);
  }

  // HSL to RGB helper
  function sfHslToRgb(h, s, l) {
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      var hue2rgb = function(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [r, g, b];
  }

  // --- Inject dye + force at canvas coordinates ---
  function sfInjectAt(cx, cy, dx, dy) {
    var gi = Math.round((cx / sfW) * sfN) + 1;
    var gj = Math.round((cy / sfH) * sfM) + 1;
    if (gi < 1) gi = 1; if (gi > sfN) gi = sfN;
    if (gj < 1) gj = 1; if (gj > sfM) gj = sfM;

    // Force from mouse movement
    var fx = dx * sfForceStrength;
    var fy = dy * sfForceStrength;

    // Color
    sfHueCounter = (sfHueCounter + 2) % 360;
    var hue = sfHueCounter / 360;
    var rgb = sfHslToRgb(hue, 1, 0.5);
    var cr = rgb[0], cg = rgb[1], cb = rgb[2];

    var r = sfDyeRadius;
    for (var dj = -r; dj <= r; dj++) {
      for (var di = -r; di <= r; di++) {
        var fi = gi + di;
        var fj = gj + dj;
        if (fi < 1 || fi > sfN || fj < 1 || fj > sfM) continue;
        var dist = Math.sqrt(di * di + dj * dj);
        if (dist > r) continue;
        var falloff = 1 - dist / r;
        var idx = sfIX(fi, fj);
        sfU[idx] += fx * falloff;
        sfV[idx] += fy * falloff;
        sfR[idx] += cr * falloff * 3;
        sfG[idx] += cg * falloff * 3;
        sfB[idx] += cb * falloff * 3;
      }
    }
  }

  // --- Mouse interaction ---
  sfCanvas.addEventListener('mousedown', function(e) {
    sfMouseDown = true;
    sfLastInteract = performance.now();
    var rect = sfCanvas.getBoundingClientRect();
    sfLastX = (e.clientX - rect.left) * (sfW / rect.width);
    sfLastY = (e.clientY - rect.top) * (sfH / rect.height);
  });
  window.addEventListener('mouseup', function() { sfMouseDown = false; });
  sfCanvas.addEventListener('mousemove', function(e) {
    if (!sfMouseDown) return;
    sfLastInteract = performance.now();
    var rect = sfCanvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (sfW / rect.width);
    var y = (e.clientY - rect.top) * (sfH / rect.height);
    var dx = x - sfLastX;
    var dy = y - sfLastY;
    sfInjectAt(x, y, dx, dy);
    sfLastX = x;
    sfLastY = y;
  });

  // Touch support
  sfCanvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
      sfMouseDown = true;
      sfLastInteract = performance.now();
      var rect = sfCanvas.getBoundingClientRect();
      sfLastX = (e.touches[0].clientX - rect.left) * (sfW / rect.width);
      sfLastY = (e.touches[0].clientY - rect.top) * (sfH / rect.height);
    }
  }, {passive: false});
  sfCanvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (!sfMouseDown || e.touches.length === 0) return;
    sfLastInteract = performance.now();
    var rect = sfCanvas.getBoundingClientRect();
    var x = (e.touches[0].clientX - rect.left) * (sfW / rect.width);
    var y = (e.touches[0].clientY - rect.top) * (sfH / rect.height);
    var dx = x - sfLastX;
    var dy = y - sfLastY;
    sfInjectAt(x, y, dx, dy);
    sfLastX = x;
    sfLastY = y;
  }, {passive: false});
  sfCanvas.addEventListener('touchend', function() { sfMouseDown = false; });

  // --- Controls ---
  var sfPauseBtn = document.getElementById('sf-pause');
  var sfStatusEl = document.getElementById('sf-status-text');
  sfPauseBtn.addEventListener('click', function() {
    expPaused[13] = !expPaused[13];
    sfPauseBtn.textContent = expPaused[13] ? 'Resume' : 'Pause';
    if (sfStatusEl) sfStatusEl.textContent = expPaused[13] ? 'paused' : 'running';
  });
  document.getElementById('sf-reset').addEventListener('click', function() {
    sfReset();
    sfSeedPreset();
  });
  document.getElementById('sf-clear').addEventListener('click', function() {
    sfReset();
  });

  // Sliders
  document.getElementById('slider-sf-visc').addEventListener('input', function(e) {
    sfVisc = parseFloat(e.target.value);
    document.getElementById('sf-visc-val').textContent = sfVisc.toFixed(5);
  });
  document.getElementById('slider-sf-diff').addEventListener('input', function(e) {
    sfDiff = parseFloat(e.target.value);
    document.getElementById('sf-diff-val').textContent = sfDiff.toFixed(5);
  });
  document.getElementById('slider-sf-fade').addEventListener('input', function(e) {
    sfFade = parseFloat(e.target.value);
    document.getElementById('sf-fade-val').textContent = sfFade.toFixed(3);
  });
  document.getElementById('slider-sf-force').addEventListener('input', function(e) {
    sfForceStrength = parseFloat(e.target.value);
    document.getElementById('sf-force-val').textContent = sfForceStrength.toFixed(1);
  });
  document.getElementById('slider-sf-radius').addEventListener('input', function(e) {
    sfDyeRadius = parseInt(e.target.value);
    document.getElementById('sf-radius-val').textContent = sfDyeRadius;
  });
  document.getElementById('sf-color-mode').addEventListener('change', function(e) {
    sfColorMode = e.target.value;
  });

  // Presets
  var sfPresets = {
    ink:       { visc: 0,       diff: 0,       fade: 0.96, force: 5,  radius: 3, color: 'rainbow' },
    turbulent: { visc: 0.00001, diff: 0,       fade: 0.99, force: 12, radius: 4, color: 'velocity' },
    vortex:    { visc: 0.00005, diff: 0,       fade: 0.985, force: 8,  radius: 5, color: 'rainbow' },
    calm:      { visc: 0.0001,  diff: 0.00005, fade: 0.95, force: 3,  radius: 2, color: 'fire' },
    neon:      { visc: 0,       diff: 0,       fade: 0.92, force: 7,  radius: 3, color: 'rainbow' }
  };

  function sfApplyPreset(name) {
    var p = sfPresets[name];
    if (!p) return;
    sfVisc = p.visc;
    sfDiff = p.diff;
    sfFade = p.fade;
    sfForceStrength = p.force;
    sfDyeRadius = p.radius;
    sfColorMode = p.color;
    document.getElementById('slider-sf-visc').value = p.visc;
    document.getElementById('slider-sf-diff').value = p.diff;
    document.getElementById('slider-sf-fade').value = p.fade;
    document.getElementById('slider-sf-force').value = p.force;
    document.getElementById('slider-sf-radius').value = p.radius;
    document.getElementById('sf-color-mode').value = p.color;
    document.getElementById('sf-visc-val').textContent = p.visc.toFixed(5);
    document.getElementById('sf-diff-val').textContent = p.diff.toFixed(5);
    document.getElementById('sf-fade-val').textContent = p.fade.toFixed(3);
    document.getElementById('sf-force-val').textContent = p.force.toFixed(1);
    document.getElementById('sf-radius-val').textContent = p.radius;
  }

  document.querySelectorAll('#sf-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      sfApplyPreset(btn.dataset.preset);
      document.querySelectorAll('#sf-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

  // Seed initial dye for visual interest
  function sfSeedPreset() {
    // Inject random swirls — more and bigger for initial visual impact
    for (var s = 0; s < 20; s++) {
      var cx = sfW * (0.15 + Math.random() * 0.7);
      var cy = sfH * (0.15 + Math.random() * 0.7);
      var angle = Math.random() * Math.PI * 2;
      var dx = Math.cos(angle) * 12;
      var dy = Math.sin(angle) * 12;
      sfInjectAt(cx, cy, dx, dy);
    }
  }

  // Initialize
  sfReset();
  sfApplyPreset('ink');
  sfSeedPreset();
