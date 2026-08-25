// ============================================================
  //  EXPERIMENT 13 — Fourier Drawing
  // ============================================================
  var fdCanvas = document.getElementById('canvas13');
  var fdCtx = fdCanvas.getContext('2d');
  var fdW = 600, fdH = 400;

  // State
  var fdPath = [];           // Array of {x, y} — the drawn path
  var fdCoeffs = [];         // DFT coefficients: {re, im, freq, amp, phase}
  var fdTrail = [];          // Reconstructed path trail
  var fdTime = 0;            // Current time parameter (0..1 for one cycle)
  var fdHarmMax = 64;        // Max number of harmonics to use
  var fdSpeed = 1.0;
  var fdTrailLen = 500;
  var fdEpiOpacity = 0.3;
  var fdHueShift = 0;
  var fdLineWidth = 2.0;
  var fdDrawing = false;     // User is drawing
  var fdDrawPath = [];       // Current user-drawn path

  // --- Preset shape generators (return array of {x, y} centered at origin) ---
  function fdPresetHeart() {
    var pts = [];
    for (var i = 0; i < 200; i++) {
      var t = (i / 200) * Math.PI * 2;
      var x = 16 * Math.pow(Math.sin(t), 3);
      var y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
      pts.push({x: x * 8, y: -y * 8});
    }
    return pts;
  }

  function fdPresetStar() {
    var pts = [];
    var n = 5, innerR = 60, outerR = 140;
    for (var i = 0; i < 200; i++) {
      var t = (i / 200) * Math.PI * 2;
      var seg = (t * n) / (Math.PI * 2);
      var segFrac = seg - Math.floor(seg);
      var angle = t - Math.PI / 2;
      // Interpolate between inner and outer radius
      var r = segFrac < 0.5 ? outerR - (outerR - innerR) * (segFrac * 2) : innerR + (outerR - innerR) * ((segFrac - 0.5) * 2);
      pts.push({x: Math.cos(angle) * r, y: Math.sin(angle) * r});
    }
    return pts;
  }

  function fdPresetFlower() {
    var pts = [];
    var petals = 6;
    for (var i = 0; i < 200; i++) {
      var t = (i / 200) * Math.PI * 2;
      var r = 120 + 40 * Math.sin(petals * t);
      pts.push({x: Math.cos(t) * r, y: Math.sin(t) * r});
    }
    return pts;
  }

  function fdPresetButterfly() {
    var pts = [];
    for (var i = 0; i < 200; i++) {
      var t = (i / 200) * Math.PI * 2;
      // Butterfly curve (Temple H. Fay, 1989)
      var r = Math.exp(Math.cos(t)) - 2 * Math.cos(4*t) - Math.pow(Math.sin(t/12), 5);
      pts.push({x: Math.sin(t) * r * 40, y: -Math.cos(t) * r * 40});
    }
    return pts;
  }

  function fdPresetInfinity() {
    var pts = [];
    for (var i = 0; i < 200; i++) {
      var t = (i / 200) * Math.PI * 2;
      var s = Math.sin(t), c = Math.cos(t);
      var denom = 1 + s * s;
      pts.push({x: 140 * c / denom, y: 140 * s * c / denom});
    }
    return pts;
  }

  function fdPresetPi() {
    // Draw a Pi-like shape using line segments
    var pts = [];
    // Top bar
    for (var i = 0; i <= 30; i++) pts.push({x: -80 + i * 5.3, y: -50});
    // Right top vertical
    for (var i = 1; i <= 20; i++) pts.push({x: 80, y: -50 + i * 3});
    // Right curve down
    for (var i = 0; i <= 15; i++) {
      var t = i / 15;
      pts.push({x: 80 - 20 * t, y: 10 + 30 * t});
    }
    // Bottom right back
    for (var i = 1; i <= 30; i++) pts.push({x: 60 - i * 3.3, y: 40});
    // Bottom wavy legs
    for (var i = 0; i <= 50; i++) {
      var t = i / 50;
      pts.push({x: -40 - t * 80, y: 40 + 20 * Math.sin(t * Math.PI * 2)});
    }
    return pts;
  }

  // --- DFT: compute coefficients from path ---
  function fdComputeDFT(path) {
    var N = path.length;
    var coeffs = [];
    for (var k = 0; k < N; k++) {
      var re = 0, im = 0;
      for (var n = 0; n < N; n++) {
        var phi = (2 * Math.PI * k * n) / N;
        var x = path[n].x, y = path[n].y;
        re += x * Math.cos(phi) + y * Math.sin(phi);
        im += -x * Math.sin(phi) + y * Math.cos(phi);
      }
      re /= N;
      im /= N;
      var freq = k;
      var amp = Math.sqrt(re * re + im * im);
      var phase = Math.atan2(im, re);
      coeffs.push({re: re, im: im, freq: k, amp: amp, phase: phase});
    }
    // Sort by amplitude (descending)
    coeffs.sort(function(a, b) { return b.amp - a.amp; });
    return coeffs;
  }

  // --- Set a path and compute its DFT ---
  function fdSetPath(path) {
    fdPath = path;
    fdCoeffs = fdComputeDFT(path);
    fdTrail = [];
    fdTime = 0;
    document.getElementById('fd-points-stat').textContent = path.length;
    fdUpdateHarmStat();
  }

  function fdUpdateHarmStat() {
    var used = Math.min(fdHarmMax, fdCoeffs.length);
    document.getElementById('fd-used-stat').textContent = used;
    document.getElementById('fd-harm-stat').textContent = used;
  }

  // --- Epicycle drawing at time t ---
  function fdDrawEpicycles(t) {
    var cx = fdW / 2;
    var cy = fdH / 2;
    var x = cx, y = cy;

    var n = Math.min(fdHarmMax, fdCoeffs.length);
    for (var i = 0; i < n; i++) {
      var c = fdCoeffs[i];
      var prevX = x, prevY = y;

      // Compute the frequency value
      // DFT frequency: we use k but need to handle the wrap-around
      // For a real signal, freq should be centered; use the actual k value
      var freq = c.freq;
      // Map frequency to [-N/2, N/2) for proper rotation direction
      var N = fdPath.length;
      if (freq > N / 2) freq = freq - N;

      var angle = freq * t * 2 * Math.PI / N + c.phase;
      var radius = c.amp;

      x += radius * Math.cos(angle);
      y += radius * Math.sin(angle);

      // Draw the epicycle circle and vector
      if (fdEpiOpacity > 0 && i < n) {
        fdCtx.strokeStyle = 'hsla(' + ((i * 10 + fdHueShift) % 360) + ', 50%, 50%, ' + fdEpiOpacity + ')';
        fdCtx.lineWidth = 0.5;
        fdCtx.beginPath();
        fdCtx.arc(prevX, prevY, radius, 0, Math.PI * 2);
        fdCtx.stroke();

        fdCtx.strokeStyle = 'hsla(' + ((i * 10 + fdHueShift) % 360) + ', 60%, 60%, ' + (fdEpiOpacity * 1.5) + ')';
        fdCtx.lineWidth = 0.8;
        fdCtx.beginPath();
        fdCtx.moveTo(prevX, prevY);
        fdCtx.lineTo(x, y);
        fdCtx.stroke();
      }
    }

    return {x: x, y: y};
  }

  function fdStep() {
    if (fdCoeffs.length === 0) return;
    var N = fdPath.length;
    fdTime += fdSpeed;
    if (fdTime >= N) {
      fdTime = fdTime % N;  // Wrap around for continuous tracing
    }

    var pt = fdDrawEpicycles(fdTime);
    fdTrail.push(pt);
    if (fdTrail.length > fdTrailLen && fdTrailLen > 0) {
      fdTrail.shift();
    } else if (fdTrailLen === 0) {
      fdTrail = [];
    }
  }

  function fdRender() {
    // Clear with fade
    fdCtx.fillStyle = 'rgba(10, 10, 18, 0.15)';
    fdCtx.fillRect(0, 0, fdW, fdH);

    // Draw epicycles
    if (fdCoeffs.length > 0) {
      fdStep();
    }

    // Draw trail
    if (fdTrail.length > 1) {
      fdCtx.lineWidth = fdLineWidth;
      fdCtx.lineCap = 'round';
      fdCtx.lineJoin = 'round';
      for (var i = 1; i < fdTrail.length; i++) {
        var alpha = i / fdTrail.length;
        var hue = (fdHueShift + i * 0.5) % 360;
        fdCtx.strokeStyle = 'hsla(' + hue + ', 80%, ' + (50 + alpha * 20) + '%, ' + alpha + ')';
        fdCtx.beginPath();
        fdCtx.moveTo(fdTrail[i-1].x, fdTrail[i-1].y);
        fdCtx.lineTo(fdTrail[i].x, fdTrail[i].y);
        fdCtx.stroke();
      }
    }

    // Draw the current point as a glowing dot
    if (fdTrail.length > 0) {
      var p = fdTrail[fdTrail.length - 1];
      var glowR = 4;
      var grad = fdCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR * 3);
      grad.addColorStop(0, 'hsla(' + fdHueShift + ', 90%, 70%, 1)');
      grad.addColorStop(0.5, 'hsla(' + fdHueShift + ', 90%, 60%, 0.5)');
      grad.addColorStop(1, 'hsla(' + fdHueShift + ', 90%, 50%, 0)');
      fdCtx.fillStyle = grad;
      fdCtx.beginPath();
      fdCtx.arc(p.x, p.y, glowR * 3, 0, Math.PI * 2);
      fdCtx.fill();
    }

    // Draw user's current drawing in progress
    if (fdDrawing && fdDrawPath.length > 1) {
      fdCtx.strokeStyle = 'rgba(255, 92, 31, 0.6)';
      fdCtx.lineWidth = 2;
      fdCtx.beginPath();
      fdCtx.moveTo(fdDrawPath[0].x, fdDrawPath[0].y);
      for (var i = 1; i < fdDrawPath.length; i++) {
        fdCtx.lineTo(fdDrawPath[i].x, fdDrawPath[i].y);
      }
      fdCtx.stroke();
    }
  }

  // --- Mouse / touch drawing ---
  function fdGetCanvasPos(e) {
    var rect = fdCanvas.getBoundingClientRect();
    var scaleX = fdW / rect.width;
    var scaleY = fdH / rect.height;
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  fdCanvas.addEventListener('mousedown', function(e) {
    fdDrawing = true;
    fdDrawPath = [fdGetCanvasPos(e)];
  });
  fdCanvas.addEventListener('mousemove', function(e) {
    if (fdDrawing) {
      fdDrawPath.push(fdGetCanvasPos(e));
    }
  });
  window.addEventListener('mouseup', function() {
    if (fdDrawing) {
      fdDrawing = false;
      if (fdDrawPath.length > 10) {
        // Center the path around canvas center
        var cx = fdW / 2, cy = fdH / 2;
        var centered = fdDrawPath.map(function(p) {
          return {x: p.x - cx, y: p.y - cy};
        });
        fdSetPath(centered);
        document.getElementById('fd-preset-stat').textContent = 'custom';
        document.querySelectorAll('#fd-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
      }
      fdDrawPath = [];
    }
  });

  // Touch support
  fdCanvas.addEventListener('touchstart', function(e) {
    fdDrawing = true;
    fdDrawPath = [fdGetCanvasPos(e)];
    e.preventDefault();
  }, {passive: false});
  fdCanvas.addEventListener('touchmove', function(e) {
    if (fdDrawing) {
      fdDrawPath.push(fdGetCanvasPos(e));
    }
    e.preventDefault();
  }, {passive: false});
  fdCanvas.addEventListener('touchend', function() {
    if (fdDrawing) {
      fdDrawing = false;
      if (fdDrawPath.length > 10) {
        var cx = fdW / 2, cy = fdH / 2;
        var centered = fdDrawPath.map(function(p) {
          return {x: p.x - cx, y: p.y - cy};
        });
        fdSetPath(centered);
        document.getElementById('fd-preset-stat').textContent = 'custom';
        document.querySelectorAll('#fd-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
      }
      fdDrawPath = [];
    }
  });

  // --- Controls ---
  var fdPauseBtn = document.getElementById('fd-pause');
  var fdStatusText = document.getElementById('fd-status-text');

  fdPauseBtn.addEventListener('click', function() {
    expPaused[12] = !expPaused[12];
    fdPauseBtn.textContent = expPaused[12] ? 'Resume' : 'Pause';
    if (fdStatusText) fdStatusText.textContent = expPaused[12] ? 'paused' : 'running';
  });

  document.getElementById('fd-clear-draw').addEventListener('click', function() {
    fdPath = [];
    fdCoeffs = [];
    fdTrail = [];
    fdDrawPath = [];
    fdCtx.clearRect(0, 0, fdW, fdH);
    document.getElementById('fd-points-stat').textContent = '—';
    document.getElementById('fd-preset-stat').textContent = '—';
  });

  document.getElementById('fd-reset').addEventListener('click', function() {
    fdTrail = [];
    fdTime = 0;
    fdCtx.clearRect(0, 0, fdW, fdH);
    // Reload current preset
    var active = document.querySelector('#fd-presets .preset-btn.active');
    if (active) {
      var name = active.dataset.preset;
      var path = fdPresetPaths[name];
      if (path) fdSetPath(path);
    }
  });

  // --- Sliders ---
  document.getElementById('slider-fd-harm').addEventListener('input', function(e) {
    fdHarmMax = parseInt(e.target.value);
    document.getElementById('fd-harm-val').textContent = fdHarmMax;
    fdUpdateHarmStat();
  });
  document.getElementById('slider-fd-speed').addEventListener('input', function(e) {
    fdSpeed = parseFloat(e.target.value);
    document.getElementById('fd-speed-val').textContent = fdSpeed.toFixed(1);
  });
  document.getElementById('slider-fd-trail').addEventListener('input', function(e) {
    fdTrailLen = parseInt(e.target.value);
    document.getElementById('fd-trail-val').textContent = fdTrailLen;
    // Trim existing trail
    while (fdTrail.length > fdTrailLen && fdTrailLen > 0) fdTrail.shift();
  });
  document.getElementById('slider-fd-epi').addEventListener('input', function(e) {
    fdEpiOpacity = parseFloat(e.target.value);
    document.getElementById('fd-epi-val').textContent = fdEpiOpacity.toFixed(2);
  });
  document.getElementById('slider-fd-hue').addEventListener('input', function(e) {
    fdHueShift = parseInt(e.target.value);
    document.getElementById('fd-hue-val').textContent = fdHueShift;
  });
  document.getElementById('slider-fd-lw').addEventListener('input', function(e) {
    fdLineWidth = parseFloat(e.target.value);
    document.getElementById('fd-lw-val').textContent = fdLineWidth.toFixed(1);
  });

  // --- Presets ---
  var fdPresetPaths = {
    heart: fdPresetHeart(),
    star: fdPresetStar(),
    flower: fdPresetFlower(),
    butterfly: fdPresetButterfly(),
    infinity: fdPresetInfinity(),
    pi: fdPresetPi()
  };

  document.querySelectorAll('#fd-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var name = btn.dataset.preset;
      var path = fdPresetPaths[name];
      if (!path) return;
      fdSetPath(path);
      document.getElementById('fd-preset-stat').textContent = name;
      document.querySelectorAll('#fd-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

  // Initialize with heart preset
  fdSetPath(fdPresetPaths.heart);
