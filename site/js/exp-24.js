// ============================================================
  //  EXPERIMENT 24 — Lissajous Curves & Harmonograph
  // ============================================================
  var ljCanvas = document.getElementById('canvas24');
  var ljCtx = ljCanvas.getContext('2d');
  var ljW = ljCanvas.width;
  var ljH = ljCanvas.height;

  // Parameters
  var ljA = 3;       // freq X (primary)
  var ljB = 2;       // freq Y (primary)
  var ljA2 = 0;     // freq X (secondary)
  var ljB2 = 0;     // freq Y (secondary)
  var ljDelta = 90; // phase X in degrees
  var ljPhi = 0;    // phase Y in degrees
  var ljDamp = 0;   // damping coefficient
  var ljDecay = 0.5; // decay rate for second oscillator
  var ljSpeed = 1;  // speed multiplier
  var ljLw = 1.5;   // line width
  var ljHueOffset = 280; // hue offset in degrees
  var ljHueCyc = 50;     // hue cycle range
  var ljFade = 0;        // fade per frame (0 = no fade)

  // State
  var ljT = 0;          // current parameter t
  var ljPrevX = 0, ljPrevY = 0;
  var ljPointCount = 0;
  var ljMaxT = Math.PI * 2 * 100; // max t before reset (for harmonograph)

  function ljComputePoint(t) {
    var cx = ljW / 2;
    var cy = ljH / 2;
    var scale = Math.min(ljW, ljH) * 0.4;

    var dRad = ljDelta * Math.PI / 180;
    var pRad = ljPhi * Math.PI / 180;

    // Primary oscillator with damping
    var decay1 = Math.exp(-ljDamp * t);
    var x1 = scale * decay1 * Math.sin(ljA * t + dRad);
    var y1 = scale * decay1 * Math.sin(ljB * t + pRad);

    // Secondary oscillator (harmonograph mode) with its own decay
    var x2 = 0, y2 = 0;
    if (ljA2 > 0 || ljB2 > 0) {
      var decay2 = Math.exp(-ljDecay * t);
      // Add a phase offset for the second pair to create asymmetry
      var d2 = dRad * 1.7;
      var p2 = pRad * 0.6;
      x2 = scale * 0.6 * decay2 * Math.sin(ljA2 * t + d2);
      y2 = scale * 0.6 * decay2 * Math.sin(ljB2 * t + p2);
    }

    return { x: cx + x1 + x2, y: cy + y1 + y2 };
  }

  function ljClear() {
    ljCtx.fillStyle = '#0a0a0b';
    ljCtx.fillRect(0, 0, ljW, ljH);
  }

  function ljReset() {
    ljT = 0;
    ljPointCount = 0;
    ljPrevX = ljW / 2;
    ljPrevY = ljH / 2;
    ljClear();
  }

  function ljStep() {
    // If damping > 0, eventually the curve dies; reset when too small
    if (ljDamp > 0 && ljT > 20 && ljT > ljMaxT) {
      ljReset();
      return;
    }

    // Apply fade if set
    if (ljFade > 0) {
      ljCtx.fillStyle = 'rgba(10, 10, 11, ' + (ljFade / 100) + ')';
      ljCtx.fillRect(0, 0, ljW, ljH);
    }

    var stepsPerFrame = ljSpeed * 100;
    var dt = (Math.PI * 2) / 1000; // small step size

    ljCtx.lineWidth = ljLw;
    ljCtx.lineCap = 'round';
    ljCtx.lineJoin = 'round';

    for (var i = 0; i < stepsPerFrame; i++) {
      var p = ljComputePoint(ljT);

      // Color cycles along the curve
      var hue = (ljHueOffset + ljPointCount * 0.02) % 360;
      if (hue < 0) hue += 360;
      ljCtx.strokeStyle = 'hsla(' + hue + ', 85%, 60%, 0.75)';
      ljCtx.lineWidth = ljLw;

      ljCtx.beginPath();
      ljCtx.moveTo(ljPrevX, ljPrevY);
      ljCtx.lineTo(p.x, p.y);
      ljCtx.stroke();

      ljPrevX = p.x;
      ljPrevY = p.y;
      ljT += dt;
      ljPointCount++;
    }

    // For Lissajous (no damping), cycle t so it wraps
    if (ljDamp === 0 && ljA2 === 0 && ljB2 === 0) {
      // Find LCM period for clean Lissajous
      var period = (2 * Math.PI) * (ljA === 0 || ljB === 0 ? 1 :
        (ljA * ljB) / gcd(ljA, ljB));
      if (ljT > period) {
        // Snap back for seamless loop — reset trail
        ljT = 0;
        ljPrevX = ljW / 2;
        ljPrevY = ljH / 2;
        ljPointCount = 0;
      }
    }
  }

  // GCD helper
  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b > 0) {
      var t = b;
      b = a % b;
      a = t;
    }
    return a || 1;
  }

  function ljUpdateStatus() {
    var isHarmonograph = ljDamp > 0 || ljA2 > 0 || ljB2 > 0;
    var el = document.getElementById('lj-status');
    if (el) {
      el.textContent = isHarmonograph ? 'Harmonograph' :
        (ljA === ljB ? 'Circle' : 'Lissajous ' + ljA + ':' + ljB);
    }
  }

  function ljRandomize() {
    var isHarm = Math.random() > 0.4;
    if (isHarm) {
      ljA = 2 + Math.floor(Math.random() * 8);
      ljB = 2 + Math.floor(Math.random() * 8);
      ljA2 = 1 + Math.floor(Math.random() * 8);
      ljB2 = 1 + Math.floor(Math.random() * 8);
      ljDamp = 0.005 + Math.random() * 0.02;
      ljDecay = 0.2 + Math.random() * 1.0;
    } else {
      ljA = 2 + Math.floor(Math.random() * 10);
      ljB = 2 + Math.floor(Math.random() * 10);
      ljA2 = 0;
      ljB2 = 0;
      ljDamp = 0;
    }
    ljDelta = Math.floor(Math.random() * 360);
    ljPhi = Math.floor(Math.random() * 360);
    ljHueOffset = Math.floor(Math.random() * 360);

    // Update UI
    ljSyncUI();
    ljReset();
    ljUpdateStatus();
  }

  function ljSyncUI() {
    document.getElementById('slider-lj-a').value = ljA;
    document.getElementById('lj-a-val').textContent = ljA;
    document.getElementById('slider-lj-b').value = ljB;
    document.getElementById('lj-b-val').textContent = ljB;
    document.getElementById('slider-lj-a2').value = ljA2;
    document.getElementById('lj-a2-val').textContent = ljA2;
    document.getElementById('slider-lj-b2').value = ljB2;
    document.getElementById('lj-b2-val').textContent = ljB2;
    document.getElementById('slider-lj-delta').value = ljDelta;
    document.getElementById('lj-delta-val').textContent = ljDelta;
    document.getElementById('slider-lj-phi').value = ljPhi;
    document.getElementById('lj-phi-val').textContent = ljPhi;
    document.getElementById('slider-lj-damp').value = ljDamp;
    document.getElementById('lj-damp-val').textContent = ljDamp.toFixed(3);
    document.getElementById('slider-lj-decay').value = ljDecay;
    document.getElementById('lj-decay-val').textContent = ljDecay.toFixed(1);
    document.getElementById('slider-lj-hue').value = ljHueOffset;
    document.getElementById('lj-hue-val').textContent = ljHueOffset;
    document.getElementById('slider-lj-huecyc').value = ljHueCyc;
    document.getElementById('lj-huecyc-val').textContent = ljHueCyc;
  }

  // Presets
  var ljPresets = {
    lissajous3: { a: 3, b: 2, a2: 0, b2: 0, delta: 90, phi: 0, damp: 0, decay: 0.5, hue: 280, huecyc: 50 },
    lissajous5: { a: 5, b: 4, a2: 0, b2: 0, delta: 90, phi: 0, damp: 0, decay: 0.5, hue: 180, huecyc: 30 },
    circle: { a: 1, b: 1, a2: 0, b2: 0, delta: 90, phi: 0, damp: 0, decay: 0.5, hue: 0, huecyc: 360 },
    harmonograph1: { a: 3, b: 2, a2: 4, b2: 5, delta: 15, phi: 30, damp: 0.008, decay: 0.5, hue: 200, huecyc: 60 },
    harmonograph2: { a: 2, b: 3, a2: 6, b2: 1, delta: 45, phi: 90, damp: 0.006, decay: 0.8, hue: 320, huecyc: 40 },
    harmonograph3: { a: 4, b: 5, a2: 2, b2: 3, delta: 0, phi: 60, damp: 0.01, decay: 0.3, hue: 120, huecyc: 80 },
    butterfly: { a: 3, b: 2, a2: 5, b2: 4, delta: 30, phi: 180, damp: 0.003, decay: 1.0, hue: 40, huecyc: 100 }
  };

  function ljApplyPreset(name) {
    var p = ljPresets[name];
    if (!p) return;
    ljA = p.a; ljB = p.b; ljA2 = p.a2; ljB2 = p.b2;
    ljDelta = p.delta; ljPhi = p.phi;
    ljDamp = p.damp; ljDecay = p.decay;
    ljHueOffset = p.hue; ljHueCyc = p.huecyc;
    ljSyncUI();
    ljReset();
    ljUpdateStatus();
  }

  // Init
  function ljInit() {
    ljReset();
    ljUpdateStatus();
  }

  // Button handlers
  document.getElementById('lj-reset').addEventListener('click', function() {
    ljReset();
  });
  document.getElementById('lj-pause').addEventListener('click', function() {
    expPaused[23] = !expPaused[23];
    this.textContent = expPaused[23] ? 'Resume' : 'Pause';
  });
  document.getElementById('lj-randomize').addEventListener('click', ljRandomize);
  document.getElementById('lj-clear').addEventListener('click', function() {
    ljClear();
    ljT = 0;
    ljPointCount = 0;
    ljPrevX = ljW / 2;
    ljPrevY = ljH / 2;
  });

  // Slider handlers
  document.getElementById('slider-lj-a').addEventListener('input', function(e) {
    ljA = parseInt(e.target.value);
    document.getElementById('lj-a-val').textContent = ljA;
    ljUpdateStatus();
  });
  document.getElementById('slider-lj-b').addEventListener('input', function(e) {
    ljB = parseInt(e.target.value);
    document.getElementById('lj-b-val').textContent = ljB;
    ljUpdateStatus();
  });
  document.getElementById('slider-lj-a2').addEventListener('input', function(e) {
    ljA2 = parseInt(e.target.value);
    document.getElementById('lj-a2-val').textContent = ljA2;
    ljUpdateStatus();
  });
  document.getElementById('slider-lj-b2').addEventListener('input', function(e) {
    ljB2 = parseInt(e.target.value);
    document.getElementById('lj-b2-val').textContent = ljB2;
    ljUpdateStatus();
  });
  document.getElementById('slider-lj-delta').addEventListener('input', function(e) {
    ljDelta = parseInt(e.target.value);
    document.getElementById('lj-delta-val').textContent = ljDelta;
  });
  document.getElementById('slider-lj-phi').addEventListener('input', function(e) {
    ljPhi = parseInt(e.target.value);
    document.getElementById('lj-phi-val').textContent = ljPhi;
  });
  document.getElementById('slider-lj-damp').addEventListener('input', function(e) {
    ljDamp = parseFloat(e.target.value);
    document.getElementById('lj-damp-val').textContent = ljDamp.toFixed(3);
    ljUpdateStatus();
  });
  document.getElementById('slider-lj-decay').addEventListener('input', function(e) {
    ljDecay = parseFloat(e.target.value);
    document.getElementById('lj-decay-val').textContent = ljDecay.toFixed(1);
  });
  document.getElementById('slider-lj-speed').addEventListener('input', function(e) {
    ljSpeed = parseInt(e.target.value);
    document.getElementById('lj-speed-val').textContent = ljSpeed;
  });
  document.getElementById('slider-lj-lw').addEventListener('input', function(e) {
    ljLw = parseFloat(e.target.value);
    document.getElementById('lj-lw-val').textContent = ljLw.toFixed(1);
  });
  document.getElementById('slider-lj-hue').addEventListener('input', function(e) {
    ljHueOffset = parseInt(e.target.value);
    document.getElementById('lj-hue-val').textContent = ljHueOffset;
  });
  document.getElementById('slider-lj-huecyc').addEventListener('input', function(e) {
    ljHueCyc = parseInt(e.target.value);
    document.getElementById('lj-huecyc-val').textContent = ljHueCyc;
  });
  document.getElementById('slider-lj-fade').addEventListener('input', function(e) {
    ljFade = parseFloat(e.target.value);
    document.getElementById('lj-fade-val').textContent = ljFade;
  });

  // Click to randomize
  ljCanvas.addEventListener('click', function() {
    ljRandomize();
  });

  // Preset buttons
  document.querySelectorAll('#lj-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#lj-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      ljApplyPreset(btn.dataset.preset);
    });
  });

  // Initialize
  ljInit();
