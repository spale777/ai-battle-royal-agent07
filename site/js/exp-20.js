// ============================================================
  //  EXPERIMENT 20 — Barnsley Fern & IFS Fractals
  //  Chaos game: iterated function systems with affine transforms
  // ============================================================
  var ifsCanvas = document.getElementById('canvas20');
  var ifsCtx = ifsCanvas.getContext('2d');
  var ifsW = ifsCanvas.width;
  var ifsH = ifsCanvas.height;

  // Rendering parameters
  var ifsSpeed = 2000;     // points per frame
  var ifsPSize = 1.0;     // point size
  var ifsOpacity = 0.6;    // point opacity
  var ifsHueOffset = 120; // base hue
  var ifsRotation = 0;    // rotation in degrees
  var ifsScale = 1.0;     // user scale factor
  var ifsColorMode = 'transform'; // 'transform', 'position', 'single'
  var ifsFade = 0;        // fade per frame (0 = none)

  // Animation state
  var ifsX = 0, ifsY = 0;  // current point
  var ifsCount = 0;        // total points plotted
  var ifsCurrentPreset = 'fern';
  var ifsTransforms = [];  // array of {a,b,c,d,e,f,p}
  var ifsHues = [];        // hue per transform

  // --- IFS preset definitions ---
  // Each transform: x' = a*x + b*y + e, y' = c*x + d*y + f
  // p = probability weight
  var ifsPresets = {
    // Barnsley Fern
    fern: {
      transforms: [
        { a: 0.00, b: 0.00, c: 0.00, d: 0.16, e: 0.00, f: 0.00, p: 0.01 },
        { a: 0.85, b: 0.04, c: -0.04, d: 0.85, e: 0.00, f: 1.60, p: 0.85 },
        { a: 0.20, b: -0.26, c: 0.23, d: 0.22, e: 0.00, f: 1.60, p: 0.07 },
        { a: -0.15, b: 0.28, c: 0.26, d: 0.24, e: 0.00, f: 0.44, p: 0.07 }
      ],
      // Bounding box of the attractor (approximate)
      bbox: { x: -2.2, y: 0, w: 4.4, h: 10 },
      hues: [35, 120, 90, 60]
    },
    // Sierpinski Triangle (3 transforms)
    sierpinski: {
      transforms: [
        { a: 0.5, b: 0, c: 0, d: 0.5, e: 0, f: 0, p: 0.3333 },
        { a: 0.5, b: 0, c: 0, d: 0.5, e: 1, f: 0, p: 0.3333 },
        { a: 0.5, b: 0, c: 0, d: 0.5, e: 0.5, f: 0.5, p: 0.3334 }
      ],
      bbox: { x: 0, y: 0, w: 1.5, h: 1 },
      hues: [0, 120, 240]
    },
    // Dragon Curve IFS
    dragon: {
      transforms: [
        { a: 0.824074, b: 0.281482, c: -0.212346, d: 0.864198, e: -1.8, f: -0.3, p: 0.5 },
        { a: 0.088273, b: 0.520988, c: -0.463889, d: -0.377778, e: 0.6, f: 0.5, p: 0.5 }
      ],
      bbox: { x: -2.5, y: -1.5, w: 4, h: 3.5 },
      hues: [200, 30]
    },
    // Maple Leaf (approximate IFS)
    maple: {
      transforms: [
        { a: 0.14, b: 0.01, c: 0.00, d: 0.51, e: -0.08, f: -1.00, p: 0.10 },
        { a: 0.43, b: 0.52, c: -0.46, d: 0.35, e: 0.00, f: -0.35, p: 0.18 },
        { a: 0.45, b: -0.49, c: 0.47, d: 0.47, e: 0.00, f: -0.35, p: 0.18 },
        { a: 0.49, b: 0.00, c: 0.00, d: 0.51, e: 0.00, f: 0.70, p: 0.24 },
        { a: 0.30, b: 0.00, c: 0.00, d: 0.32, e: 0.00, f: 0.30, p: 0.30 }
      ],
      bbox: { x: -0.8, y: -1.3, w: 1.6, h: 2.3 },
      hues: [20, 30, 350, 15, 5]
    },
    // Fractal Tree IFS
    tree: {
      transforms: [
        { a: 0.05, b: 0.00, c: 0.00, d: 0.50, e: 0.00, f: 0.00, p: 0.10 },
        { a: 0.05, b: -0.06, c: 0.00, d: -0.50, e: 0.00, f: 0.60, p: 0.10 },
        { a: 0.46, b: -0.15, c: 0.39, d: 0.38, e: 0.00, f: 0.60, p: 0.23 },
        { a: 0.47, b: -0.15, c: 0.17, d: 0.42, e: 0.00, f: 1.00, p: 0.23 },
        { a: 0.43, b: 0.28, c: 0.25, d: 0.45, e: 0.00, f: 1.00, p: 0.24 }
      ],
      bbox: { x: -0.5, y: 0, w: 1, h: 1.6 },
      hues: [30, 30, 100, 120, 80]
    },
    // Spiral
    spiral: {
      transforms: [
        { a: 0.787, b: -0.421, c: 0.421, d: 0.787, e: 0.0, f: 0.0, p: 0.5 },
        { a: -0.121, b: 0.257, c: -0.257, d: -0.121, e: 0.0, f: 0.0, p: 0.5 }
      ],
      bbox: { x: -0.5, y: -0.5, w: 1, h: 1 },
      hues: [280, 200]
    },
    // Coral-like branching
    coral: {
      transforms: [
        { a: 0.30, b: 0.00, c: 0.00, d: 0.30, e: 0.0, f: 0.0, p: 0.15 },
        { a: 0.30, b: 0.30, c: -0.30, d: 0.30, e: 0.3, f: 0.0, p: 0.30 },
        { a: 0.30, b: -0.30, c: 0.30, d: 0.30, e: 0.3, f: 0.0, p: 0.30 },
        { a: 0.30, b: 0.00, c: 0.00, d: 0.30, e: 0.0, f: 0.3, p: 0.25 }
      ],
      bbox: { x: -0.6, y: 0, w: 1.2, h: 1.2 },
      hues: [10, 0, 340, 30]
    }
  };

  // --- Apply a preset ---
  function ifsApplyPreset(name) {
    var p = ifsPresets[name];
    if (!p) return;
    ifsCurrentPreset = name;
    ifsTransforms = p.transforms;
    ifsHues = p.hues;
    ifsReset();
  }

  // --- Map IFS coordinate to canvas pixel ---
  var ifsBbox = { x: 0, y: 0, w: 1, h: 1 };
  function ifsUpdateBbox() {
    var p = ifsPresets[ifsCurrentPreset];
    if (!p) return;
    var bb = p.bbox;
    // Apply user scale
    var sw = bb.w * ifsScale;
    var sh = bb.h * ifsScale;
    var sx = bb.x - (sw - bb.w) / 2;
    var sy = bb.y - (sh - bb.h) / 2;
    // Fit into canvas with padding
    var pad = 30;
    var availW = ifsW - 2 * pad;
    var availH = ifsH - 2 * pad;
    var scaleX = availW / sw;
    var scaleY = availH / sh;
    var s = Math.min(scaleX, scaleY);
    // Center
    var offsetX = (ifsW - sw * s) / 2 - sx * s;
    var offsetY = ifsH - pad - sy * s; // flip Y, anchor bottom
    ifsBbox = { sx: s, ox: offsetX, oy: offsetY };
  }

  function ifsMapX(x, y) {
    return x * ifsBbox.sx + ifsBbox.ox;
  }
  function ifsMapY(x, y) {
    return -y * ifsBbox.sx + ifsBbox.oy; // flip Y for screen coords
  }

  // --- Clear canvas ---
  function ifsClear() {
    ifsCtx.fillStyle = '#0a0a0b';
    ifsCtx.fillRect(0, 0, ifsW, ifsH);
  }

  // --- Reset ---
  function ifsReset() {
    ifsClear();
    ifsX = 0;
    ifsY = 0;
    ifsCount = 0;
    ifsUpdateBbox();
    document.getElementById('ifs-count-stat').textContent = '0';
  }

  // --- Pick a random transform (weighted) ---
  function ifsPickTransform() {
    var r = Math.random();
    var cum = 0;
    for (var i = 0; i < ifsTransforms.length; i++) {
      cum += ifsTransforms[i].p;
      if (r <= cum) return i;
    }
    return ifsTransforms.length - 1;
  }

  // --- Step: plot N points ---
  function ifsStep() {
    // Optional fade
    if (ifsFade > 0) {
      ifsCtx.fillStyle = 'rgba(10, 10, 11, ' + (ifsFade / 100) + ')';
      ifsCtx.fillRect(0, 0, ifsW, ifsH);
    }

    var cosR = 1, sinR = 0;
    if (ifsRotation !== 0) {
      var rad = ifsRotation * Math.PI / 180;
      cosR = Math.cos(rad);
      sinR = Math.sin(rad);
    }

    for (var i = 0; i < ifsSpeed; i++) {
      var ti = ifsPickTransform();
      var t = ifsTransforms[ti];

      // Apply affine transform
      var nx = t.a * ifsX + t.b * ifsY + t.e;
      var ny = t.c * ifsX + t.d * ifsY + t.f;
      ifsX = nx;
      ifsY = ny;

      // Apply user rotation (around attractor center)
      if (ifsRotation !== 0) {
        var rx = cosR * ifsX - sinR * ifsY;
        var ry = sinR * ifsX + cosR * ifsY;
        ifsX = rx;
        ifsY = ry;
      }

      // Map to canvas
      var px = ifsMapX(ifsX, ifsY);
      var py = ifsMapY(ifsX, ifsY);

      // Color
      var hue;
      if (ifsColorMode === 'transform') {
        hue = ifsHues[ti] !== undefined ? ifsHues[ti] : 0;
        hue = (hue + ifsHueOffset) % 360;
      } else if (ifsColorMode === 'position') {
        hue = (ifsHueOffset + (px / ifsW) * 360) % 360;
      } else {
        hue = ifsHueOffset;
      }

      // Plot
      ifsCtx.fillStyle = 'hsla(' + hue + ', 75%, 60%, ' + ifsOpacity + ')';
      if (ifsPSize <= 1) {
        ifsCtx.fillRect(px - 0.5, py - 0.5, Math.max(1, ifsPSize), Math.max(1, ifsPSize));
      } else {
        ifsCtx.beginPath();
        ifsCtx.arc(px, py, ifsPSize / 2, 0, Math.PI * 2);
        ifsCtx.fill();
      }
      ifsCount++;
    }

    document.getElementById('ifs-count-stat').textContent = ifsCount.toLocaleString();
  }

  // --- Randomize ---
  function ifsRandomize() {
    // Pick a random preset
    var keys = Object.keys(ifsPresets);
    var name = keys[Math.floor(Math.random() * keys.length)];
    ifsHueOffset = Math.floor(Math.random() * 360);
    ifsRotation = Math.floor((Math.random() - 0.5) * 90);
    ifsScale = 0.8 + Math.random() * 0.4;
    ifsColorMode = ['transform', 'position', 'single'][Math.floor(Math.random() * 3)];

    // Update UI
    document.getElementById('slider-ifs-hue').value = ifsHueOffset;
    document.getElementById('ifs-hue-val').textContent = ifsHueOffset;
    document.getElementById('slider-ifs-rot').value = ifsRotation;
    document.getElementById('ifs-rot-val').textContent = ifsRotation;
    document.getElementById('slider-ifs-scale').value = ifsScale.toFixed(2);
    document.getElementById('ifs-scale-val').textContent = ifsScale.toFixed(2);
    document.getElementById('ifs-colormode').value = ifsColorMode;

    // Update preset button active state
    document.querySelectorAll('#ifs-presets .preset-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.preset === name);
    });

    ifsApplyPreset(name);
  }

  // --- Controls ---
  var ifsPauseBtn = document.getElementById('ifs-pause');
  ifsPauseBtn.addEventListener('click', function() {
    expPaused[19] = !expPaused[19];
    ifsPauseBtn.textContent = expPaused[19] ? 'Resume' : 'Pause';
  });
  document.getElementById('ifs-reset').addEventListener('click', function() {
    ifsReset();
  });
  document.getElementById('ifs-randomize').addEventListener('click', function() {
    ifsRandomize();
  });
  document.getElementById('ifs-clear').addEventListener('click', function() {
    ifsClear();
    ifsCount = 0;
    document.getElementById('ifs-count-stat').textContent = '0';
  });
  document.getElementById('ifs-save').addEventListener('click', function() {
    var link = document.createElement('a');
    link.download = 'ifs-fractal.png';
    link.href = ifsCanvas.toDataURL();
    link.click();
  });

  // Preset buttons
  document.querySelectorAll('#ifs-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#ifs-presets .preset-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      ifsApplyPreset(btn.dataset.preset);
    });
  });

  // Sliders
  document.getElementById('slider-ifs-speed').addEventListener('input', function(e) {
    ifsSpeed = parseInt(e.target.value);
    document.getElementById('ifs-speed-val').textContent = ifsSpeed;
  });
  document.getElementById('slider-ifs-psize').addEventListener('input', function(e) {
    ifsPSize = parseFloat(e.target.value);
    document.getElementById('ifs-psize-val').textContent = ifsPSize.toFixed(1);
  });
  document.getElementById('slider-ifs-opacity').addEventListener('input', function(e) {
    ifsOpacity = parseFloat(e.target.value);
    document.getElementById('ifs-opacity-val').textContent = ifsOpacity.toFixed(2);
  });
  document.getElementById('slider-ifs-hue').addEventListener('input', function(e) {
    ifsHueOffset = parseInt(e.target.value);
    document.getElementById('ifs-hue-val').textContent = ifsHueOffset;
  });
  document.getElementById('slider-ifs-rot').addEventListener('change', function(e) {
    ifsRotation = parseInt(e.target.value);
    document.getElementById('ifs-rot-val').textContent = ifsRotation;
    ifsReset();
  });
  document.getElementById('slider-ifs-scale').addEventListener('change', function(e) {
    ifsScale = parseFloat(e.target.value);
    document.getElementById('ifs-scale-val').textContent = ifsScale.toFixed(2);
    ifsReset();
  });
  document.getElementById('ifs-colormode').addEventListener('change', function(e) {
    ifsColorMode = e.target.value;
  });
  document.getElementById('slider-ifs-fade').addEventListener('input', function(e) {
    ifsFade = parseFloat(e.target.value);
    document.getElementById('ifs-fade-val').textContent = ifsFade + '%';
  });

  // Initialize
  ifsApplyPreset('fern');
