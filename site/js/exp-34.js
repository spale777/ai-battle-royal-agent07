// ============================================================
  //  EXPERIMENT 34 — Penrose Tiling Generator
  //  P3 triangle substitution (deflation) rules
  // ============================================================
  const penCanvas = document.getElementById('canvas34');
  const penCtx = penCanvas.getContext('2d');
  const penW = penCanvas.width;
  const penH = penCanvas.height;
  const PEN_PHI = (1 + Math.sqrt(5)) / 2;

  // Parameters
  let penLevel = 5;
  let penRotation = 0;          // degrees
  let penScale = 1.0;
  let penDrawSpeed = 3;         // triangles per frame
  let penHueOffset = 40;
  let penHueSpread = 120;
  let penLineWidth = 1.0;
  let penGlow = 4;
  let penColorMode = 'type';
  let penPreset = 'sun';
  let penSeed = 42;

  // State
  let penTriangles = [];        // current set of triangles to draw
  let penDrawIndex = 0;         // how many we've drawn so far (for animation)
  let penMaxLevel = 8;
  let penDragging = false;
  let penDragX = 0, penDragY = 0;
  let penOffsetX = 0, penOffsetY = 0;
  let penCurrentOffsetX = 0, penCurrentOffsetY = 0;

  // Seeded PRNG (mulberry32)
  function penMulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  let penRng = penMulberry32(penSeed);

  // Complex number helpers (points are [x, y] arrays)
  function penComplexAdd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function penComplexSub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function penComplexMul(a, b) { return [a[0]*b[0] - a[1]*b[1], a[0]*b[1] + a[1]*b[0]]; }
  function penComplexScale(a, s) { return [a[0]*s, a[1]*s]; }
  function penComplexLen(a) { return Math.sqrt(a[0]*a[0] + a[1]*a[1]); }

  // Subdivide one triangle
  // Triangle: [color, A, B, C] where color 0=red (acute), 1=blue (obtuse)
  // A, B, C are [x, y] points
  function penSubdivideOne(color, A, B, C) {
    if (color === 0) {
      // Red (acute): A is apex, |AB|/|AC| = 1/phi
      // P = A + (B - A) / phi
      var P = penComplexAdd(A, penComplexScale(penComplexSub(B, A), 1 / PEN_PHI));
      return [
        [0, C, P, B],   // red
        [1, P, C, A]    // blue
      ];
    } else {
      // Blue (obtuse): B is apex of obtuse angle
      // Q = B + (A - B) / phi
      // R = B + (C - B) / phi
      var Q = penComplexAdd(B, penComplexScale(penComplexSub(A, B), 1 / PEN_PHI));
      var R = penComplexAdd(B, penComplexScale(penComplexSub(C, B), 1 / PEN_PHI));
      return [
        [1, R, C, A],   // blue
        [1, Q, R, B],   // blue
        [0, R, Q, A]    // red
      ];
    }
  }

  function penSubdivideAll(tris) {
    var result = [];
    for (var i = 0; i < tris.length; i++) {
      var sub = penSubdivideOne(tris[i][0], tris[i][1], tris[i][2], tris[i][3]);
      for (var j = 0; j < sub.length; j++) result.push(sub[j]);
    }
    return result;
  }

  // Compute the orientation angle of a triangle (for coloring)
  function penTriAngle(A, B, C) {
    // Angle of the longest edge (or first edge A->B)
    var dx = B[0] - A[0], dy = B[1] - A[1];
    var angle = Math.atan2(dy, dx);
    // Normalize to 0..2π
    if (angle < 0) angle += 2 * Math.PI;
    return angle;
  }

  // Initial configurations (P3 inflation rules from golden triangles)
  // Each returns array of triangles [color, A, B, C]
  function penInitSun() {
    var tris = [];
    for (var i = 0; i < 10; i++) {
      var a1 = 2 * Math.PI * i / 10;
      var a2 = 2 * Math.PI * (i + 1) / 10;
      var B = [Math.cos(a1), Math.sin(a1)];
      var C = [Math.cos(a2), Math.sin(a2)];
      if (i % 2 === 0) {
        tris.push([0, [0, 0], B, C]);    // red, outward
      } else {
        tris.push([0, [0, 0], C, B]);    // red, reversed
      }
    }
    return tris;
  }

  function penInitStar() {
    var tris = [];
    for (var i = 0; i < 10; i++) {
      var a1 = 2 * Math.PI * i / 10;
      var a2 = 2 * Math.PI * (i + 1) / 10;
      var B = [Math.cos(a1), Math.sin(a1)];
      var C = [Math.cos(a2), Math.sin(a2)];
      if (i % 2 === 0) {
        tris.push([1, [0, 0], B, C]);    // blue
      } else {
        tris.push([1, [0, 0], C, B]);    // blue, reversed
      }
    }
    return tris;
  }

  function penInitWheel() {
    // Alternating red/blue around the center
    var tris = [];
    for (var i = 0; i < 10; i++) {
      var a1 = 2 * Math.PI * i / 10;
      var a2 = 2 * Math.PI * (i + 1) / 10;
      var B = [Math.cos(a1), Math.sin(a1)];
      var C = [Math.cos(a2), Math.sin(a2)];
      var color = i % 2;
      tris.push([color, [0, 0], B, C]);
    }
    return tris;
  }

  function penInitDeft() {
    // 5 red triangles in a half-sun
    var tris = [];
    for (var i = 0; i < 5; i++) {
      var a1 = 2 * Math.PI * i / 5;
      var a2 = 2 * Math.PI * (i + 1) / 5;
      var B = [Math.cos(a1), Math.sin(a1)];
      var C = [Math.cos(a2), Math.sin(a2)];
      tris.push([0, [0, 0], B, C]);
    }
    return tris;
  }

  function penInitAccordion() {
    // 5 blue triangles in a half-sun
    var tris = [];
    for (var i = 0; i < 5; i++) {
      var a1 = 2 * Math.PI * i / 5;
      var a2 = 2 * Math.PI * (i + 1) / 5;
      var B = [Math.cos(a1), Math.sin(a1)];
      var C = [Math.cos(a2), Math.sin(a2)];
      tris.push([1, [0, 0], B, C]);
    }
    return tris;
  }

  function penInitCarousel() {
    // 10 blue triangles (like star but from the other direction)
    var tris = [];
    for (var i = 0; i < 10; i++) {
      var a1 = 2 * Math.PI * i / 10 + Math.PI / 10;
      var a2 = 2 * Math.PI * (i + 1) / 10 + Math.PI / 10;
      var B = [Math.cos(a1) * 0.8, Math.sin(a1) * 0.8];
      var C = [Math.cos(a2) * 0.8, Math.sin(a2) * 0.8];
      tris.push([1, [0, 0], B, C]);
    }
    return tris;
  }

  function penInitRandom() {
    // Start with sun but perturb angles slightly with seeded RNG
    var tris = [];
    for (var i = 0; i < 10; i++) {
      var jitter = (penRng() - 0.5) * 0.08;
      var a1 = 2 * Math.PI * i / 10 + jitter;
      var a2 = 2 * Math.PI * (i + 1) / 10 + jitter;
      var B = [Math.cos(a1), Math.sin(a1)];
      var C = [Math.cos(a2), Math.sin(a2)];
      var color = penRng() < 0.5 ? 0 : 1;
      tris.push([color, [0, 0], B, C]);
    }
    return tris;
  }

  function penGenerate() {
    var tris;
    switch (penPreset) {
      case 'sun':       tris = penInitSun(); break;
      case 'star':      tris = penInitStar(); break;
      case 'wheel':     tris = penInitWheel(); break;
      case 'deft':      tris = penInitDeft(); break;
      case 'accordion': tris = penInitAccordion(); break;
      case 'carousel':  tris = penInitCarousel(); break;
      case 'random':    tris = penInitRandom(); break;
      default:          tris = penInitSun();
    }
    // Apply subdivisions
    for (var i = 0; i < penLevel; i++) {
      tris = penSubdivideAll(tris);
    }
    penTriangles = tris;
    penDrawIndex = 0;
    penUpdateStatus();
  }

  // Transform a point from tiling space to canvas space
  function penTransform(p) {
    var rad = penRotation * Math.PI / 180;
    var cos = Math.cos(rad), sin = Math.sin(rad);
    // Base radius maps the unit-circle tiling to ~80% of the canvas
    var baseRadius = Math.min(penW, penH) * 0.4;
    var x = p[0] * penScale * baseRadius;
    var y = p[1] * penScale * baseRadius;
    // Rotate
    var rx = x * cos - y * sin;
    var ry = x * sin + y * cos;
    // Translate to center + offset
    return [rx + penW / 2 + penCurrentOffsetX, ry + penH / 2 + penCurrentOffsetY];
  }

  // Get color for a triangle
  function penTriColor(tri, idx) {
    var color = tri[0];
    var A = tri[1], B = tri[2], C = tri[3];

    if (penColorMode === 'mono') {
      return 'hsl(' + penHueOffset + ', 0%, 75%)';
    }

    if (penColorMode === 'type') {
      if (color === 0) {
        // Red: warm hue
        var h1 = (penHueOffset + 0) % 360;
        return 'hsl(' + h1 + ', 70%, 55%)';
      } else {
        var h2 = (penHueOffset + 180) % 360;
        return 'hsl(' + h2 + ', 60%, 45%)';
      }
    }

    if (penColorMode === 'angle') {
      var angle = penTriAngle(A, B, C);
      var h3 = (penHueOffset + (angle / (2 * Math.PI)) * penHueSpread) % 360;
      return 'hsl(' + h3 + ', 70%, 55%)';
    }

    if (penColorMode === 'depth') {
      // Color by position in array (proxy for depth from center)
      var t = idx / Math.max(1, penTriangles.length);
      var h4 = (penHueOffset + t * penHueSpread) % 360;
      return 'hsl(' + h4 + ', 70%, 55%)';
    }

    if (penColorMode === 'rainbow') {
      var t2 = idx / Math.max(1, penTriangles.length);
      var h5 = (penHueOffset + t2 * 360) % 360;
      return 'hsl(' + h5 + ', 75%, 55%)';
    }

    return 'hsl(0, 0%, 50%)';
  }

  function penDrawTri(tri, idx) {
    var A = penTransform(tri[1]);
    var B = penTransform(tri[2]);
    var C = penTransform(tri[3]);
    var fillStyle = penTriColor(tri, idx);

    // Fill with low alpha
    penCtx.beginPath();
    penCtx.moveTo(A[0], A[1]);
    penCtx.lineTo(B[0], B[1]);
    penCtx.lineTo(C[0], C[1]);
    penCtx.closePath();
    penCtx.globalAlpha = 0.35;
    penCtx.fillStyle = fillStyle;
    penCtx.fill();

    // Stroke with full alpha
    penCtx.globalAlpha = 1.0;
    penCtx.strokeStyle = fillStyle;
    penCtx.lineWidth = penLineWidth;
    if (penGlow > 0) {
      penCtx.shadowColor = fillStyle;
      penCtx.shadowBlur = penGlow;
    } else {
      penCtx.shadowBlur = 0;
    }
    penCtx.stroke();
    penCtx.shadowBlur = 0;
  }

  // Draw one frame (animated drawing)
  function penDrawFrame() {
    // Clear with dark background
    penCtx.fillStyle = 'rgba(10, 10, 14, 1)';
    penCtx.fillRect(0, 0, penW, penH);

    if (penTriangles.length === 0) return;

    // Draw penDrawSpeed triangles per frame
    var count = Math.min(penDrawSpeed, penTriangles.length - penDrawIndex);
    for (var i = 0; i < count; i++) {
      penDrawTri(penTriangles[penDrawIndex], penDrawIndex);
      penDrawIndex++;
    }

    // If all drawn, keep the last frame (don't clear)
    if (penDrawIndex >= penTriangles.length) {
      penDrawIndex = 0;  // restart animation
    }
  }

  // Full render (no animation — draw all at once)
  function penRenderFull() {
    penCtx.fillStyle = 'rgba(10, 10, 14, 1)';
    penCtx.fillRect(0, 0, penW, penH);
    for (var i = 0; i < penTriangles.length; i++) {
      penDrawTri(penTriangles[i], i);
    }
    penDrawIndex = penTriangles.length;  // mark as fully drawn
  }

  function penUpdateStatus() {
    var presetNames = {
      'sun': 'Sun', 'star': 'Star', 'wheel': 'Wheel',
      'deft': 'Deft', 'accordion': 'Accordion', 'carousel': 'Carousel',
      'random': 'Random Seed'
    };
    var name = presetNames[penPreset] || 'Sun';
    document.getElementById('pen-status').textContent =
      'Penrose · ' + name + ' · Level ' + penLevel;
    document.getElementById('pen-info').textContent =
      penTriangles.length + ' tiles';
  }

  function penLoadPreset(preset) {
    penPreset = preset;
    if (preset === 'random') {
      penSeed = Math.floor(Math.random() * 100000);
      penRng = penMulberry32(penSeed);
    }
    penGenerate();
  }

  // --- Button wiring ---
  document.getElementById('pen-randomize').addEventListener('click', function() {
    var presets = ['sun', 'star', 'wheel', 'deft', 'accordion', 'carousel'];
    penPreset = presets[Math.floor(Math.random() * presets.length)];
    penLevel = 4 + Math.floor(Math.random() * 3);
    penRotation = Math.floor(Math.random() * 360);
    penHueOffset = Math.floor(Math.random() * 360);
    penHueSpread = 60 + Math.floor(Math.random() * 240);
    // Update sliders
    document.getElementById('slider-pen-level').value = penLevel;
    document.getElementById('slider-pen-rot').value = penRotation;
    document.getElementById('slider-pen-hue').value = penHueOffset;
    document.getElementById('slider-pen-spread').value = penHueSpread;
    document.getElementById('pen-level-val').textContent = penLevel;
    document.getElementById('pen-rot-val').textContent = penRotation;
    document.getElementById('pen-hue-val').textContent = penHueOffset;
    document.getElementById('pen-spread-val').textContent = penHueSpread;
    penGenerate();
    penRenderFull();
  });

  document.getElementById('pen-subdivide').addEventListener('click', function() {
    if (penLevel < 8) {
      penLevel++;
      document.getElementById('slider-pen-level').value = penLevel;
      document.getElementById('pen-level-val').textContent = penLevel;
      penGenerate();
      penRenderFull();
    }
  });

  document.getElementById('pen-pause').addEventListener('click', function() {
    expPaused[33] = !expPaused[33];
    this.textContent = expPaused[33] ? 'Resume' : 'Pause';
  });

  document.getElementById('pen-reset').addEventListener('click', function() {
    penPreset = 'sun';
    penLevel = 5;
    penRotation = 0;
    penScale = 1.0;
    penHueOffset = 40;
    penHueSpread = 120;
    penLineWidth = 1.0;
    penGlow = 4;
    penColorMode = 'type';
    penOffsetX = 0; penOffsetY = 0;
    penCurrentOffsetX = 0; penCurrentOffsetY = 0;
    // Update all sliders
    document.getElementById('slider-pen-level').value = 5;
    document.getElementById('slider-pen-rot').value = 0;
    document.getElementById('slider-pen-scale').value = 1.0;
    document.getElementById('slider-pen-hue').value = 40;
    document.getElementById('slider-pen-spread').value = 120;
    document.getElementById('slider-pen-lw').value = 1.0;
    document.getElementById('slider-pen-glow').value = 4;
    document.getElementById('pen-level-val').textContent = '5';
    document.getElementById('pen-rot-val').textContent = '0';
    document.getElementById('pen-scale-val').textContent = '1.0';
    document.getElementById('pen-hue-val').textContent = '40';
    document.getElementById('pen-spread-val').textContent = '120';
    document.getElementById('pen-lw-val').textContent = '1.0';
    document.getElementById('pen-glow-val').textContent = '4';
    var colorSel = document.getElementById('pen-color');
    if (colorSel) colorSel.value = 'type';
    // Reset preset buttons
    document.querySelectorAll('#pt-presets .preset-btn').forEach(function(b) {
      b.classList.remove('active');
    });
    var sunBtn = document.querySelector('#pt-presets .preset-btn[data-preset="sun"]');
    if (sunBtn) sunBtn.classList.add('active');
    penGenerate();
    penRenderFull();
  });

  document.getElementById('pen-save').addEventListener('click', function() {
    var link = document.createElement('a');
    link.download = 'penrose-' + penPreset + '-level' + penLevel + '.png';
    link.href = penCanvas.toDataURL();
    link.click();
  });

  // --- Preset buttons ---
  document.querySelectorAll('#pt-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#pt-presets .preset-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      this.classList.add('active');
      penLoadPreset(this.dataset.preset);
      penRenderFull();
    });
  });

  // --- Slider wiring ---
  function penSlider(id, valId, callback) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function() {
      var v = parseFloat(this.value);
      document.getElementById(valId).textContent = v;
      callback(v);
    });
  }
  penSlider('slider-pen-level', 'pen-level-val', function(v) {
    penLevel = v;
    penGenerate();
    penRenderFull();
  });
  penSlider('slider-pen-rot', 'pen-rot-val', function(v) {
    penRotation = v;
    penRenderFull();
  });
  penSlider('slider-pen-scale', 'pen-scale-val', function(v) {
    penScale = v;
    penRenderFull();
  });
  penSlider('slider-pen-speed', 'pen-speed-val', function(v) {
    penDrawSpeed = v;
  });
  penSlider('slider-pen-hue', 'pen-hue-val', function(v) {
    penHueOffset = v;
    penRenderFull();
  });
  penSlider('slider-pen-spread', 'pen-spread-val', function(v) {
    penHueSpread = v;
    penRenderFull();
  });
  penSlider('slider-pen-lw', 'pen-lw-val', function(v) {
    penLineWidth = v;
    penRenderFull();
  });
  penSlider('slider-pen-glow', 'pen-glow-val', function(v) {
    penGlow = v;
    penRenderFull();
  });
  var ptColorSel = document.getElementById('pen-color');
  if (ptColorSel) ptColorSel.addEventListener('change', function() {
    penColorMode = this.value;
    penRenderFull();
  });

  // --- Canvas pan interaction ---
  penCanvas.addEventListener('mousedown', function(e) {
    penDragging = true;
    penDragX = e.clientX;
    penDragY = e.clientY;
  });
  penCanvas.addEventListener('mousemove', function(e) {
    if (penDragging) {
      penCurrentOffsetX += (e.clientX - penDragX);
      penCurrentOffsetY += (e.clientY - penDragY);
      penDragX = e.clientX;
      penDragY = e.clientY;
      penRenderFull();
    }
  });
  penCanvas.addEventListener('mouseup', function() { penDragging = false; });
  penCanvas.addEventListener('mouseleave', function() { penDragging = false; });

  // Touch support
  penCanvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    penDragging = true;
    var t = e.touches[0];
    penDragX = t.clientX;
    penDragY = t.clientY;
  });
  penCanvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (penDragging) {
      var t = e.touches[0];
      penCurrentOffsetX += (t.clientX - penDragX);
      penCurrentOffsetY += (t.clientY - penDragY);
      penDragX = t.clientX;
      penDragY = t.clientY;
      penRenderFull();
    }
  });
  penCanvas.addEventListener('touchend', function() { penDragging = false; });

  // Initialize
  penGenerate();
  penRenderFull();
