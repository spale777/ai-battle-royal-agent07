// ============================================================
  //  EXPERIMENT 23 — Belousov-Zhabotinsky (Barkley Model)
  // ============================================================
  var bzCanvas = document.getElementById('canvas23');
  var bzCtx = bzCanvas.getContext('2d');
  var bzCellSize = 2;
  var bzGW = 300, bzGH = 200;       // grid dimensions
  var bzW = bzCanvas.width, bzH = bzCanvas.height;

  // Barkley model parameters
  var bzA = 0.75;    // excitation threshold
  var bzB = 0.01;    // bias
  var bzEps = 0.02;  // time-scale separation
  var bzDiff = 1.0;  // diffusion coefficient
  var bzSpeedSteps = 1;
  var bzHueOffset = 0;
  var bzColorMode = 'fire';
  var bzStepCount = 0;

  // State arrays
  var bzU, bzV, bzU2, bzV2;

  function bzAlloc() {
    bzGW = Math.floor(bzW / bzCellSize);
    bzGH = Math.floor(bzH / bzCellSize);
    var n = bzGW * bzGH;
    bzU = new Float32Array(n);
    bzV = new Float32Array(n);
    bzU2 = new Float32Array(n);
    bzV2 = new Float32Array(n);
    document.getElementById('bz-grid-stat').textContent = bzGW + '×' + bzGH;
  }

  function bzInit() {
    bzAlloc();
    bzU.fill(0);
    bzV.fill(0);
    bzStepCount = 0;

    // Create initial spiral wave: excite a small strip at an angle
    // This seeds a broken wavefront that curls into a spiral
    var cx = (bzGW / 2) | 0;
    var cy = (bzGH / 2) | 0;
    var len = Math.min(bzGW, bzGH) * 0.3;

    // Excite a vertical strip from center upward
    for (var y = cy; y < cy + len; y++) {
      for (var x = cx; x < cx + 8; x++) {
        if (x >= 0 && x < bzGW && y >= 0 && y < bzGH) {
          bzU[y * bzGW + x] = 1.0;
        }
      }
    }
    // Inhibit the bottom-right quadrant to break the wavefront
    for (var y = cy; y < bzGH; y++) {
      for (var x = cx; x < bzGW; x++) {
        bzV[y * bzGW + x] = 0.5;
      }
    }
    bzRender();
  }

  function bzRandomize() {
    var n = bzU.length;
    for (var i = 0; i < n; i++) {
      bzU[i] = Math.random() * 0.3;
      bzV[i] = Math.random() * 0.3;
    }
    bzStepCount = 0;
    bzRender();
  }

  function bzClear() {
    bzU.fill(0);
    bzV.fill(0);
    bzStepCount = 0;
    bzRender();
  }

  function bzReset() {
    bzInit();
  }

  // 5-point Laplacian stencil
  function bzLapU(idx, x, y) {
    var left = x > 0 ? bzU[idx - 1] : bzU[idx];
    var right = x < bzGW - 1 ? bzU[idx + 1] : bzU[idx];
    var up = y > 0 ? bzU[idx - bzGW] : bzU[idx];
    var down = y < bzGH - 1 ? bzU[idx + bzGW] : bzU[idx];
    return left + right + up + down - 4 * bzU[idx];
  }

  function bzLapV(idx, x, y) {
    var left = x > 0 ? bzV[idx - 1] : bzV[idx];
    var right = x < bzGW - 1 ? bzV[idx + 1] : bzV[idx];
    var up = y > 0 ? bzV[idx - bzGW] : bzV[idx];
    var down = y < bzGH - 1 ? bzV[idx + bzGW] : bzV[idx];
    return left + right + up + down - 4 * bzV[idx];
  }

  function bzStep() {
    var n = bzU.length;
    var dt = 1.0;
    var invEps = 1.0 / bzEps;

    for (var y = 0; y < bzGH; y++) {
      for (var x = 0; x < bzGW; x++) {
        var i = y * bzGW + x;
        var u = bzU[i];
        var v = bzV[i];
        var lapU = bzLapU(i, x, y);
        var lapV = bzLapV(i, x, y);

        // Barkley model:
        // du/dt = (1/eps) * u * (1 - u) * (u - (v + b) / a) + D_u * lap(u)
        // dv/dt = u - v + D_v * lap(v)
        var fu = invEps * u * (1 - u) * (u - (v + bzB) / bzA) + bzDiff * lapU;
        var fv = u - v + bzDiff * lapV;

        bzU2[i] = u + dt * fu;
        bzV2[i] = v + dt * fv;

        // Clamp to valid range
        if (bzU2[i] < 0) bzU2[i] = 0;
        else if (bzU2[i] > 1) bzU2[i] = 1;
        if (bzV2[i] < 0) bzV2[i] = 0;
        else if (bzV2[i] > 1) bzV2[i] = 1;
      }
    }

    // Swap buffers
    var tmpU = bzU; bzU = bzU2; bzU2 = tmpU;
    var tmpV = bzV; bzV = bzV2; bzV2 = tmpV;
    bzStepCount++;
  }

  // Color palette functions
  function bzColor(u, v) {
    // Use u (activator) as primary color value, v as secondary
    var val = u;
    var hue, sat, light;

    switch (bzColorMode) {
      case 'fire':
        // Fire: black → red → orange → yellow → white
        hue = (60 * val + bzHueOffset) % 360;
        sat = 100;
        light = val < 0.01 ? 0 : 8 + val * 55;
        break;
      case 'ocean':
        // Ocean: dark blue → cyan → white
        hue = (180 + 40 * val + bzHueOffset) % 360;
        sat = 80;
        light = val < 0.01 ? 2 : 5 + val * 60;
        break;
      case 'electric':
        // Electric: black → blue → magenta → white
        hue = (270 + 80 * val + bzHueOffset) % 360;
        sat = 100;
        light = val < 0.01 ? 0 : 5 + val * 65;
        break;
      case 'rainbow':
        // Rainbow: full hue cycle based on u
        hue = (u * 360 + bzHueOffset) % 360;
        sat = 90;
        light = u < 0.01 ? 3 : 10 + u * 55;
        break;
      case 'mono':
        // Monochrome: black → white
        hue = 0;
        sat = 0;
        light = u * 100;
        break;
      default:
        hue = (60 * val + bzHueOffset) % 360;
        sat = 100;
        light = 8 + val * 55;
    }
    return 'hsl(' + hue + ',' + sat + '%,' + light + '%)';
  }

  var bzImageData = null;

  function bzRender() {
    if (!bzImageData || bzImageData.width !== bzW || bzImageData.height !== bzH) {
      bzImageData = bzCtx.createImageData(bzW, bzH);
    }
    var px = bzImageData.data;
    var n = bzW * bzH;

    for (var py = 0; py < bzH; py++) {
      var gy = Math.min((py / bzCellSize) | 0, bzGH - 1);
      for (var pxl = 0; pxl < bzW; pxl++) {
        var gx = Math.min((pxl / bzCellSize) | 0, bzGW - 1);
        var idx = gy * bzGW + gx;
        var u = bzU[idx];
        var v = bzV[idx];
        var pi = (py * bzW + pxl) * 4;

        // Convert HSL to RGB
        var hue, sat, light;
        var val = u;
        switch (bzColorMode) {
          case 'fire':
            hue = (60 * val + bzHueOffset) % 360;
            if (hue < 0) hue += 360;
            sat = 100;
            light = val < 0.01 ? 0 : 8 + val * 55;
            break;
          case 'ocean':
            hue = (180 + 40 * val + bzHueOffset) % 360;
            if (hue < 0) hue += 360;
            sat = 80;
            light = val < 0.01 ? 2 : 5 + val * 60;
            break;
          case 'electric':
            hue = (270 + 80 * val + bzHueOffset) % 360;
            if (hue < 0) hue += 360;
            sat = 100;
            light = val < 0.01 ? 0 : 5 + val * 65;
            break;
          case 'rainbow':
            hue = (u * 360 + bzHueOffset) % 360;
            if (hue < 0) hue += 360;
            sat = 90;
            light = u < 0.01 ? 3 : 10 + u * 55;
            break;
          case 'mono':
            hue = 0;
            sat = 0;
            light = u * 100;
            break;
          default:
            hue = (60 * val + bzHueOffset) % 360;
            if (hue < 0) hue += 360;
            sat = 100;
            light = 8 + val * 55;
        }

        // HSL to RGB conversion
        var h = hue / 60;
        var s = sat / 100;
        var l = light / 100;
        var r, g, b;
        if (s === 0) {
          r = g = b = l;
        } else {
          var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          var p = 2 * l - q;
          var t = h;
          var tr = t < 1 ? t : t < 2 ? t - 1 : t < 3 ? t - 2 : t < 4 ? t - 3 : t < 5 ? t - 4 : t - 5;
          var tg = t < 1 ? t + 1 : t < 2 ? t : t < 3 ? t - 1 : t < 4 ? t - 2 : t < 5 ? t - 3 : t - 4;
          if (tg >= 1) tg -= 1;
          var tb = t < 1 ? t + 2 : t < 2 ? t + 1 : t < 3 ? t : t < 4 ? t - 1 : t < 5 ? t - 2 : t - 3;
          if (tb >= 1) tb -= 1;
          r = tr < 1/6 ? p + (q - p) * 6 * tr : tr < 1/2 ? q : tr < 2/3 ? p + (q - p) * (2/3 - tr) * 6 : p;
          g = tg < 1/6 ? p + (q - p) * 6 * tg : tg < 1/2 ? q : tg < 2/3 ? p + (q - p) * (2/3 - tg) * 6 : p;
          b = tb < 1/6 ? p + (q - p) * 6 * tb : tb < 1/2 ? q : tb < 2/3 ? p + (q - p) * (2/3 - tb) * 6 : p;
        }

        px[pi] = r * 255;
        px[pi + 1] = g * 255;
        px[pi + 2] = b * 255;
        px[pi + 3] = 255;
      }
    }

    bzCtx.putImageData(bzImageData, 0, 0);
    document.getElementById('bz-step-stat').textContent = bzStepCount.toLocaleString();
  }

  // Presets
  var bzPresets = {
    spiral: { a: 0.75, b: 0.01, eps: 0.02, diff: 1.0, speed: 1, cell: 2, hue: 0, mode: 'fire',
              init: 'spiral' },
    target: { a: 0.75, b: 0.06, eps: 0.03, diff: 1.0, speed: 1, cell: 2, hue: 0, mode: 'fire',
              init: 'target' },
    chaos: { a: 0.55, b: -0.1, eps: 0.05, diff: 0.8, speed: 2, cell: 2, hue: 0, mode: 'rainbow',
             init: 'random' },
    multi: { a: 0.8, b: 0.02, eps: 0.015, diff: 1.0, speed: 1, cell: 2, hue: 20, mode: 'electric',
             init: 'multi' },
    breaking: { a: 0.65, b: -0.05, eps: 0.04, diff: 1.2, speed: 1, cell: 2, hue: 300, mode: 'ocean',
                init: 'breaking' },
    calm: { a: 0.9, b: 0.02, eps: 0.01, diff: 0.5, speed: 1, cell: 2, hue: 180, mode: 'ocean',
            init: 'calm' }
  };

  function bzApplyPreset(name) {
    var p = bzPresets[name];
    if (!p) return;
    bzA = p.a;
    bzB = p.b;
    bzEps = p.eps;
    bzDiff = p.diff;
    bzSpeedSteps = p.speed;
    bzCellSize = p.cell;
    bzHueOffset = p.hue;
    bzColorMode = p.mode;

    // Update UI
    document.getElementById('slider-bz-a').value = p.a;
    document.getElementById('bz-a-val').textContent = p.a.toFixed(2);
    document.getElementById('slider-bz-b').value = p.b;
    document.getElementById('bz-b-val').textContent = p.b.toFixed(2);
    document.getElementById('slider-bz-eps').value = p.eps;
    document.getElementById('bz-eps-val').textContent = p.eps.toFixed(3);
    document.getElementById('slider-bz-diff').value = p.diff;
    document.getElementById('bz-diff-val').textContent = p.diff.toFixed(2);
    document.getElementById('slider-bz-speed').value = p.speed;
    document.getElementById('bz-speed-val').textContent = p.speed;
    document.getElementById('slider-bz-cell').value = p.cell;
    document.getElementById('bz-cell-val').textContent = p.cell;
    document.getElementById('slider-bz-hue').value = p.hue;
    document.getElementById('bz-hue-val').textContent = p.hue;
    document.getElementById('bz-colormode').value = p.mode;

    // Re-init grid if cell size changed
    bzAlloc();

    // Apply the right initialization
    bzU.fill(0);
    bzV.fill(0);
    bzStepCount = 0;

    if (p.init === 'spiral') {
      var cx = (bzGW / 2) | 0;
      var cy = (bzGH / 2) | 0;
      var len = Math.min(bzGW, bzGH) * 0.3;
      for (var y = cy; y < cy + len; y++) {
        for (var x = cx; x < cx + 8; x++) {
          if (x >= 0 && x < bzGW && y >= 0 && y < bzGH) {
            bzU[y * bzGW + x] = 1.0;
          }
        }
      }
      for (var y2 = cy; y2 < bzGH; y2++) {
        for (var x2 = cx; x2 < bzGW; x2++) {
          bzV[y2 * bzGW + x2] = 0.5;
        }
      }
    } else if (p.init === 'target') {
      // Concentric rings of excitation
      cx = (bzGW / 2) | 0;
      cy = (bzGH / 2) | 0;
      var maxR = Math.min(bzGW, bzGH) * 0.4;
      for (var y3 = 0; y3 < bzGH; y3++) {
        for (var x3 = 0; x3 < bzGW; x3++) {
          var dx = x3 - cx, dy = y3 - cy;
          var r = Math.sqrt(dx * dx + dy * dy);
          if (r < maxR) {
            var wave = Math.sin(r * 0.3);
            if (wave > 0.5) {
              bzU[y3 * bzGW + x3] = 1.0;
              bzV[y3 * bzGW + x3] = 0.0;
            }
          }
        }
      }
    } else if (p.init === 'random') {
      var n2 = bzU.length;
      for (var i = 0; i < n2; i++) {
        bzU[i] = Math.random() * 0.5;
        bzV[i] = Math.random() * 0.5;
      }
    } else if (p.init === 'multi') {
      // Multiple spiral seeds at different locations
      var seeds = [
        [bzGW * 0.25, bzGH * 0.3, 0],
        [bzGW * 0.75, bzGH * 0.3, 1],
        [bzGW * 0.5, bzGH * 0.7, 0],
        [bzGW * 0.2, bzGH * 0.7, 1]
      ];
      for (var s = 0; s < seeds.length; s++) {
        var scx = seeds[s][0] | 0;
        var scy = seeds[s][1] | 0;
        var slen = Math.min(bzGW, bzGH) * 0.15;
        var dir = seeds[s][2];
        for (var yy = 0; yy < slen; yy++) {
          for (var xx = 0; xx < 6; xx++) {
            var px2, py2;
            if (dir === 0) { px2 = scx + xx; py2 = scy + yy; }
            else { px2 = scx + yy; py2 = scy + xx; }
            if (px2 >= 0 && px2 < bzGW && py2 >= 0 && py2 < bzGH) {
              bzU[py2 * bzGW + px2] = 1.0;
            }
          }
        }
        // Inhibit one side to create spiral break
        for (var yy2 = 0; yy2 < slen; yy2++) {
          for (var xx2 = 0; xx2 < bzGW * 0.15; xx2++) {
            var ix, iy;
            if (dir === 0) { ix = scx + 6 + xx2; iy = scy + yy2; }
            else { ix = scx + yy2; iy = scy + 6 + xx2; }
            if (ix >= 0 && ix < bzGW && iy >= 0 && iy < bzGH) {
              bzV[iy * bzGW + ix] = 0.5;
            }
          }
        }
      }
    } else if (p.init === 'breaking') {
      // A wave that will break into turbulence
      cx = (bzGW / 2) | 0;
      cy = (bzGH / 2) | 0;
      for (var y4 = 0; y4 < bzGH; y4++) {
        for (var x4 = 0; x4 < bzGW * 0.5; x4++) {
          if (Math.random() > 0.3) {
            bzU[y4 * bzGW + x4] = 1.0;
          }
        }
      }
      // Random noise in v
      var n3 = bzV.length;
      for (var i2 = 0; i2 < n3; i2++) {
        bzV[i2] = Math.random() * 0.6;
      }
    } else if (p.init === 'calm') {
      // Single small excitation
      cx = (bzGW / 2) | 0;
      cy = (bzGH / 2) | 0;
      var r2 = 5;
      for (var y5 = -r2; y5 <= r2; y5++) {
        for (var x5 = -r2; x5 <= r2; x5++) {
          if (x5 * x5 + y5 * y5 <= r2 * r2) {
            var nx = cx + x5, ny = cy + y5;
            if (nx >= 0 && nx < bzGW && ny >= 0 && ny < bzGH) {
              bzU[ny * bzGW + nx] = 1.0;
            }
          }
        }
      }
    }

    bzRender();
  }

  // Mouse interaction — click to ignite wavefronts, drag to paint
  var bzMouseDown = false;
  var bzLastMouseX = -1, bzLastMouseY = -1;

  function bzPaint(e, isClick) {
    var rect = bzCanvas.getBoundingClientRect();
    var mx = (e.clientX - rect.left) * (bzW / rect.width);
    var my = (e.clientY - rect.top) * (bzH / rect.height);
    var gx = (mx / bzCellSize) | 0;
    var gy = (my / bzCellSize) | 0;
    var r = isClick ? 8 : 4;

    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          var nx = gx + dx, ny = gy + dy;
          if (nx >= 0 && nx < bzGW && ny >= 0 && ny < bzGH) {
            bzU[ny * bzGW + nx] = 1.0;
            bzV[ny * bzGW + nx] = 0.0;
          }
        }
      }
    }

    // Draw a line from last position for smooth painting
    if (!isClick && bzLastMouseX >= 0) {
      var steps = Math.max(Math.abs(gx - bzLastMouseX), Math.abs(gy - bzLastMouseY));
      for (var s = 0; s <= steps; s++) {
        var t = steps > 0 ? s / steps : 0;
        var lx = (bzLastMouseX + (gx - bzLastMouseX) * t) | 0;
        var ly = (bzLastMouseY + (gy - bzLastMouseY) * t) | 0;
        if (lx >= 0 && lx < bzGW && ly >= 0 && ly < bzGH) {
          bzU[ly * bzGW + lx] = 1.0;
          bzV[ly * bzGW + lx] = 0.0;
        }
      }
    }
    bzLastMouseX = gx;
    bzLastMouseY = gy;
  }

  bzCanvas.addEventListener('mousedown', function(e) {
    bzMouseDown = true;
    bzLastMouseX = -1;
    bzPaint(e, true);
  });
  bzCanvas.addEventListener('mousemove', function(e) {
    if (bzMouseDown) bzPaint(e, false);
  });
  bzCanvas.addEventListener('mouseup', function() { bzMouseDown = false; });
  bzCanvas.addEventListener('mouseleave', function() { bzMouseDown = false; });

  // Touch support
  bzCanvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var t = e.touches[0];
    bzMouseDown = true;
    bzLastMouseX = -1;
    bzPaint({ clientX: t.clientX, clientY: t.clientY }, true);
  });
  bzCanvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (bzMouseDown) {
      var t = e.touches[0];
      bzPaint({ clientX: t.clientX, clientY: t.clientY }, false);
    }
  });
  bzCanvas.addEventListener('touchend', function() { bzMouseDown = false; });

  // Button handlers
  document.getElementById('bz-reset').addEventListener('click', bzReset);
  document.getElementById('bz-pause').addEventListener('click', function() {
    expPaused[22] = !expPaused[22];
    this.textContent = expPaused[22] ? 'Resume' : 'Pause';
  });
  document.getElementById('bz-randomize').addEventListener('click', bzRandomize);
  document.getElementById('bz-clear').addEventListener('click', bzClear);

  // Slider handlers
  document.getElementById('slider-bz-a').addEventListener('input', function(e) {
    bzA = parseFloat(e.target.value);
    document.getElementById('bz-a-val').textContent = bzA.toFixed(2);
  });
  document.getElementById('slider-bz-b').addEventListener('input', function(e) {
    bzB = parseFloat(e.target.value);
    document.getElementById('bz-b-val').textContent = bzB.toFixed(2);
  });
  document.getElementById('slider-bz-eps').addEventListener('input', function(e) {
    bzEps = parseFloat(e.target.value);
    document.getElementById('bz-eps-val').textContent = bzEps.toFixed(3);
  });
  document.getElementById('slider-bz-diff').addEventListener('input', function(e) {
    bzDiff = parseFloat(e.target.value);
    document.getElementById('bz-diff-val').textContent = bzDiff.toFixed(2);
  });
  document.getElementById('slider-bz-speed').addEventListener('input', function(e) {
    bzSpeedSteps = parseInt(e.target.value);
    document.getElementById('bz-speed-val').textContent = bzSpeedSteps;
  });
  document.getElementById('slider-bz-cell').addEventListener('input', function(e) {
    bzCellSize = parseInt(e.target.value);
    document.getElementById('bz-cell-val').textContent = bzCellSize;
    bzAlloc();
    bzU.fill(0);
    bzV.fill(0);
    bzRender();
  });
  document.getElementById('slider-bz-hue').addEventListener('input', function(e) {
    bzHueOffset = parseInt(e.target.value);
    document.getElementById('bz-hue-val').textContent = bzHueOffset;
  });
  document.getElementById('bz-colormode').addEventListener('change', function(e) {
    bzColorMode = e.target.value;
  });

  // Preset buttons
  document.querySelectorAll('#bz-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#bz-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      bzApplyPreset(btn.dataset.preset);
    });
  });

  // Initialize
  bzInit();
