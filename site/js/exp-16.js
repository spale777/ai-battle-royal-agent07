// ============================================================
  //  EXPERIMENT 16 — Spirograph / Hypotrochoid Generator
  // ============================================================
  var spCanvas = document.getElementById('canvas16');
  var spCtx = spCanvas.getContext('2d');
  var spW = spCanvas.width;
  var spH = spCanvas.height;

  // Parameters
  var spR = 150;      // fixed circle radius
  var spRolling = 53; // rolling circle radius
  var spPen = 70;     // pen distance from rolling center
  var spMode = 'hypo'; // 'hypo' or 'epi'
  var spSpeed = 3;    // points per frame
  var spLw = 1.2;     // line width
  var spHue = 20;     // starting hue
  var spHueShift = 0.5; // hue shift per unit t
  var spOpacity = 0.8;

  // Animation state
  var spT = 0;          // current parameter value
  var spPrevX = 0, spPrevY = 0;
  var spStarted = false;
  var spMaxT = Math.PI * 2 * 1000; // upper bound for t (irrational ratio case)
  var spClosed = false;
  var spProgress = 0;

  // --- Compute curve point ---
  function spPoint(t) {
    var R = spR, r = spRolling, d = spPen;
    var x, y;
    if (spMode === 'hypo') {
      x = (R - r) * Math.cos(t) + d * Math.cos((R - r) / r * t);
      y = (R - r) * Math.sin(t) - d * Math.sin((R - r) / r * t);
    } else {
      x = (R + r) * Math.cos(t) - d * Math.cos((R + r) / r * t);
      y = (R + r) * Math.sin(t) - d * Math.sin((R + r) / r * t);
    }
    return { x: x + spW / 2, y: y + spH / 2 };
  }

  // --- GCD for closure detection ---
  function spGcd(a, b) {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b > 0) { var t = a % b; a = b; b = t; }
    return a;
  }

  // --- Compute the closure period ---
  function spComputeMaxT() {
    var R = Math.round(spR);
    var r = Math.round(spRolling);
    if (r <= 0) { spMaxT = Math.PI * 2 * 1000; return; }
    var g = spGcd(R, r);
    var reducedR = R / g;
    var reducedR_r = r / g;
    // For hypo: period = 2π * r/gcd ; the curve repeats after 2π * (r / gcd)
    // Actually the period is 2π * (denominator) where denominator depends on ratio
    // For hypotrochoid: the curve closes after t = 2π * (r / gcd(R, r))
    // But that's the param t that makes (R-r)/r * t a multiple of 2π
    // So period = 2π * r / gcd(R, r)
    var period = 2 * Math.PI * r / g;
    // But we also need (R-r)/r * t to be multiple of 2π, so
    // t = 2π * r / gcd(R, r) handles both when R/r is rational
    // Let's just use the LCM approach
    // The curve closes when both t and (R-r)/r * t are multiples of 2π (hypo)
    // That's t = 2π * k1 and (R-r)/r * t = 2π * k2
    // So t = 2π * r * k2 / (R-r) and t = 2π * k1
    // LCM of 2π and 2π * r/(R-r)
    // Period = 2π * LCM(1, r/(R-r)) = 2π * r / gcd(R-r, r) / 1
    // Actually let's just use 2π * r / gcd(R, r) which is standard
    // For safety, multiply by 2 to account for potential sign issues
    spMaxT = period;
    // For epitrochoid: period = 2π * r / gcd(R, r) as well
    spClosed = true;
  }

  // --- Clear canvas ---
  function spClear() {
    spCtx.fillStyle = '#0a0a0b';
    spCtx.fillRect(0, 0, spW, spH);
  }

  // --- Reset animation ---
  function spReset() {
    spClear();
    spT = 0;
    spStarted = false;
    spProgress = 0;
    spComputeMaxT();
    var p = spPoint(0);
    spPrevX = p.x;
    spPrevY = p.y;
    document.getElementById('sp-progress-stat').textContent = '0%';
  }

  // --- Draw a frame ---
  function spStep() {
    if (!spStarted) {
      spStarted = true;
      var p = spPoint(0);
      spPrevX = p.x;
      spPrevY = p.y;
      spT += 0.01;
      return;
    }

    for (var i = 0; i < spSpeed; i++) {
      var p = spPoint(spT);
      var hue = (spHue + spT * spHueShift * 10) % 360;
      spCtx.strokeStyle = 'hsla(' + hue + ', 80%, 60%, ' + spOpacity + ')';
      spCtx.lineWidth = spLw;
      spCtx.lineCap = 'round';
      spCtx.beginPath();
      spCtx.moveTo(spPrevX, spPrevY);
      spCtx.lineTo(p.x, p.y);
      spCtx.stroke();

      spPrevX = p.x;
      spPrevY = p.y;
      spT += 0.01;

      // Check if curve has closed
      if (spT >= spMaxT) {
        spProgress = 100;
        document.getElementById('sp-progress-stat').textContent = '100%';
        return; // Stop drawing
      }
    }

    spProgress = Math.min(100, Math.round(spT / spMaxT * 100));
    document.getElementById('sp-progress-stat').textContent = spProgress + '%';
  }

  // --- Presets ---
  var spPresets = {
    rose:      { R: 150, r: 53,  d: 70,  mode: 'hypo' },
    star:      { R: 160, r: 40,  d: 90,  mode: 'hypo' },
    flower:    { R: 140, r: 35,  d: 100, mode: 'hypo' },
    web:       { R: 170, r: 55,  d: 50,  mode: 'hypo' },
    diamond:   { R: 150, r: 75,  d: 75,  mode: 'hypo' },
    galaxy:    { R: 160, r: 37,  d: 120, mode: 'epi' },
    pentagram: { R: 150, r: 60,  d: 90,  mode: 'hypo' }
  };

  function spApplyPreset(name) {
    var p = spPresets[name];
    if (!p) return;
    spR = p.R;
    spRolling = p.r;
    spPen = p.d;
    spMode = p.mode;

    document.getElementById('slider-sp-fixed').value = p.R;
    document.getElementById('sp-r-val').textContent = p.R;
    document.getElementById('slider-sp-rolling').value = p.r;
    document.getElementById('sp-rolling-val').textContent = p.r;
    document.getElementById('slider-sp-pen').value = p.d;
    document.getElementById('sp-pen-val').textContent = p.d;
    document.getElementById('sp-mode').value = p.mode;

    spReset();
  }

  // --- Controls ---
  var spPauseBtn = document.getElementById('sp-pause');
  spPauseBtn.addEventListener('click', function() {
    expPaused[15] = !expPaused[15];
    spPauseBtn.textContent = expPaused[15] ? 'Resume' : 'Pause';
  });
  document.getElementById('sp-reset').addEventListener('click', function() {
    spReset();
  });
  document.getElementById('sp-randomize').addEventListener('click', function() {
    spR = Math.floor(50 + Math.random() * 130);
    spRolling = Math.floor(5 + Math.random() * 150);
    spPen = Math.floor(1 + Math.random() * 150);
    spMode = Math.random() > 0.5 ? 'hypo' : 'epi';
    spHue = Math.floor(Math.random() * 360);

    document.getElementById('slider-sp-fixed').value = spR;
    document.getElementById('sp-r-val').textContent = spR;
    document.getElementById('slider-sp-rolling').value = spRolling;
    document.getElementById('sp-rolling-val').textContent = spRolling;
    document.getElementById('slider-sp-pen').value = spPen;
    document.getElementById('sp-pen-val').textContent = spPen;
    document.getElementById('sp-mode').value = spMode;
    document.getElementById('slider-sp-hue').value = spHue;
    document.getElementById('sp-hue-val').textContent = spHue;

    spReset();
  });
  document.getElementById('sp-clear').addEventListener('click', function() {
    spClear();
    spT = 0;
    spStarted = false;
    spProgress = 0;
    document.getElementById('sp-progress-stat').textContent = '0%';
  });
  document.getElementById('sp-save').addEventListener('click', function() {
    var link = document.createElement('a');
    link.download = 'spirograph.png';
    link.href = spCanvas.toDataURL();
    link.click();
  });

  // Preset buttons
  document.querySelectorAll('#sp-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#sp-presets .preset-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      spApplyPreset(btn.dataset.preset);
    });
  });

  // Sliders
  document.getElementById('slider-sp-fixed').addEventListener('input', function(e) {
    spR = parseFloat(e.target.value);
    document.getElementById('sp-r-val').textContent = Math.round(spR);
  });
  document.getElementById('slider-sp-rolling').addEventListener('input', function(e) {
    spRolling = parseFloat(e.target.value);
    document.getElementById('sp-rolling-val').textContent = Math.round(spRolling);
  });
  document.getElementById('slider-sp-pen').addEventListener('input', function(e) {
    spPen = parseFloat(e.target.value);
    document.getElementById('sp-pen-val').textContent = Math.round(spPen);
  });
  document.getElementById('sp-mode').addEventListener('change', function(e) {
    spMode = e.target.value;
  });
  document.getElementById('slider-sp-speed').addEventListener('input', function(e) {
    spSpeed = parseInt(e.target.value);
    document.getElementById('sp-speed-val').textContent = spSpeed;
  });
  document.getElementById('slider-sp-lw').addEventListener('input', function(e) {
    spLw = parseFloat(e.target.value);
    document.getElementById('sp-lw-val').textContent = spLw.toFixed(1);
  });
  document.getElementById('slider-sp-hue').addEventListener('input', function(e) {
    spHue = parseInt(e.target.value);
    document.getElementById('sp-hue-val').textContent = spHue;
  });
  document.getElementById('slider-sp-hueshift').addEventListener('input', function(e) {
    spHueShift = parseFloat(e.target.value);
    document.getElementById('sp-hueshift-val').textContent = spHueShift.toFixed(2);
  });
  document.getElementById('slider-sp-opacity').addEventListener('input', function(e) {
    spOpacity = parseFloat(e.target.value);
    document.getElementById('sp-opacity-val').textContent = spOpacity.toFixed(2);
  });

  // --- Re-draw on parameter change ---
  // When geometry changes, reset and redraw
  ['slider-sp-fixed', 'slider-sp-rolling', 'slider-sp-pen'].forEach(function(id) {
    document.getElementById(id).addEventListener('change', function() {
      spReset();
    });
  });
  document.getElementById('sp-mode').addEventListener('change', function() {
    spReset();
  });

  // Initialize
  spReset();
