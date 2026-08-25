// ============================================================
  //  EXPERIMENT 12 — Lorenz Attractor 3D
  // ============================================================
  const laCanvas = document.getElementById('canvas12');
  const laCtx = laCanvas.getContext('2d');
  const laW = 600, laH = 400;

  // Lorenz parameters
  let laSigma = 10;
  let laRho = 28;
  let laBeta = 8 / 3;
  let laDt = 0.01;
  let laNumParticles = 5;
  let laTrailLen = 300;
  let laScale = 12;
  let laHueShift = 0;

  // Camera rotation
  let laRotX = -0.5;
  let laRotY = 0.3;
  let laAutoRotate = true;
  let laDragging = false;
  let laLastMX = 0, laLastMY = 0;

  // Particles
  let laParticles = [];

  function laParticle(x, y, z, hue) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.trail = [];
    this.hue = hue;
  }

  // RK4 integration for one step of the Lorenz system
  function laRK4(x, y, z, dt, s, r, b) {
    // Derivatives
    function f(x, y, z) {
      return [s * (y - x), x * (r - z) - y, x * y - b * z];
    }
    var k1 = f(x, y, z);
    var k2 = f(x + k1[0]*dt/2, y + k1[1]*dt/2, z + k1[2]*dt/2);
    var k3 = f(x + k2[0]*dt/2, y + k2[1]*dt/2, z + k2[2]*dt/2);
    var k4 = f(x + k3[0]*dt, y + k3[1]*dt, z + k3[2]*dt);
    var nx = x + dt/6 * (k1[0] + 2*k2[0] + 2*k3[0] + k4[0]);
    var ny = y + dt/6 * (k1[1] + 2*k2[1] + 2*k3[1] + k4[1]);
    var nz = z + dt/6 * (k1[2] + 2*k2[2] + 2*k3[2] + k4[2]);
    return [nx, ny, nz];
  }

  function laInit() {
    laParticles = [];
    for (var i = 0; i < laNumParticles; i++) {
      var p = new laParticle(
        0.1 + i * 0.05,
        0.1 + i * 0.05,
        0.1 + i * 0.05,
        (i * 360 / laNumParticles + laHueShift) % 360
      );
      laParticles.push(p);
    }
    laRender();
  }

  function laStep() {
    for (var i = 0; i < laParticles.length; i++) {
      var p = laParticles[i];
      var res = laRK4(p.x, p.y, p.z, laDt, laSigma, laRho, laBeta);
      p.x = res[0];
      p.y = res[1];
      p.z = res[2];
      p.trail.push([p.x, p.y, p.z]);
      if (p.trail.length > laTrailLen) p.trail.shift();
    }
    if (laAutoRotate) {
      laRotY += 0.003;
    }
  }

  // Project 3D to 2D with rotation
  function laProject(x, y, z) {
    // Rotate around Y axis
    var cosY = Math.cos(laRotY), sinY = Math.sin(laRotY);
    var x1 = x * cosY - z * sinY;
    var z1 = x * sinY + z * cosY;
    // Rotate around X axis
    var cosX = Math.cos(laRotX), sinX = Math.sin(laRotX);
    var y1 = y * cosX - z1 * sinX;
    var z2 = y * sinX + z1 * cosX;
    // Simple perspective
    var depth = 40;
    var factor = depth / (depth + z2);
    return {
      px: laW / 2 + x1 * laScale * factor,
      py: laH / 2 - y1 * laScale * factor,
      depth: factor
    };
  }

  function laRender() {
    // Fade trails
    laCtx.fillStyle = 'rgba(10, 10, 18, 0.12)';
    laCtx.fillRect(0, 0, laW, laH);

    for (var i = 0; i < laParticles.length; i++) {
      var p = laParticles[i];
      if (p.trail.length < 2) continue;

      for (var j = 1; j < p.trail.length; j++) {
        var a0 = laProject(p.trail[j-1][0], p.trail[j-1][1], p.trail[j-1][2]);
        var a1 = laProject(p.trail[j][0], p.trail[j][1], p.trail[j][2]);
        var alpha = j / p.trail.length;
        var hue = (p.hue + laHueShift + j * 0.3) % 360;
        laCtx.strokeStyle = 'hsla(' + hue + ', 80%, ' + (40 + alpha * 30) + '%, ' + (alpha * 0.8) + ')';
        laCtx.lineWidth = alpha * 1.8 + 0.3;
        laCtx.beginPath();
        laCtx.moveTo(a0.px, a0.py);
        laCtx.lineTo(a1.px, a1.py);
        laCtx.stroke();
      }

      // Draw current particle as a glowing dot
      var head = laProject(p.x, p.y, p.z);
      var glowR = 3 * head.depth;
      var grad = laCtx.createRadialGradient(head.px, head.py, 0, head.px, head.py, glowR * 3);
      grad.addColorStop(0, 'hsla(' + p.hue + ', 90%, 70%, 1)');
      grad.addColorStop(0.5, 'hsla(' + p.hue + ', 90%, 60%, 0.5)');
      grad.addColorStop(1, 'hsla(' + p.hue + ', 90%, 50%, 0)');
      laCtx.fillStyle = grad;
      laCtx.beginPath();
      laCtx.arc(head.px, head.py, glowR * 3, 0, Math.PI * 2);
      laCtx.fill();
    }

    // Update rotation stat
    var rotDeg = Math.round((laRotY * 180 / Math.PI) % 360);
    var rotEl = document.getElementById('la-rot-stat');
    if (rotEl) rotEl.textContent = rotDeg + '°';
  }

  // --- Controls ---
  var laPauseBtn = document.getElementById('la-pause');
  var laStatusText = document.getElementById('la-status-text');

  laPauseBtn.addEventListener('click', function() {
    expPaused[11] = !expPaused[11];
    laPauseBtn.textContent = expPaused[11] ? 'Resume' : 'Pause';
    if (laStatusText) laStatusText.textContent = expPaused[11] ? 'paused' : 'running';
  });

  document.getElementById('la-reset').addEventListener('click', function() {
    laRotX = -0.5;
    laRotY = 0.3;
    laCtx.clearRect(0, 0, laW, laH);
    laInit();
  });

  document.getElementById('la-randomize').addEventListener('click', function() {
    laSigma = 3 + Math.random() * 17;
    laRho = 15 + Math.random() * 35;
    laBeta = 1 + Math.random() * 5;
    laNumParticles = 1 + Math.floor(Math.random() * 15);
    document.getElementById('slider-la-sigma').value = laSigma;
    document.getElementById('slider-la-rho').value = laRho;
    document.getElementById('slider-la-beta').value = laBeta;
    document.getElementById('slider-la-np').value = laNumParticles;
    document.getElementById('la-sigma-val').textContent = laSigma.toFixed(1);
    document.getElementById('la-rho-val').textContent = laRho.toFixed(1);
    document.getElementById('la-beta-val').textContent = laBeta.toFixed(2);
    document.getElementById('la-np-val').textContent = laNumParticles;
    document.getElementById('la-pcount').textContent = laNumParticles;
    document.getElementById('la-pc-stat').textContent = laNumParticles;
    laInit();
  });

  document.getElementById('la-clear').addEventListener('click', function() {
    laCtx.clearRect(0, 0, laW, laH);
    for (var i = 0; i < laParticles.length; i++) {
      laParticles[i].trail = [];
    }
  });

  // --- Sliders ---
  document.getElementById('slider-la-sigma').addEventListener('input', function(e) {
    laSigma = parseFloat(e.target.value);
    document.getElementById('la-sigma-val').textContent = laSigma.toFixed(1);
  });
  document.getElementById('slider-la-rho').addEventListener('input', function(e) {
    laRho = parseFloat(e.target.value);
    document.getElementById('la-rho-val').textContent = laRho.toFixed(1);
  });
  document.getElementById('slider-la-beta').addEventListener('input', function(e) {
    laBeta = parseFloat(e.target.value);
    document.getElementById('la-beta-val').textContent = laBeta.toFixed(2);
  });
  document.getElementById('slider-la-dt').addEventListener('input', function(e) {
    laDt = parseFloat(e.target.value);
    document.getElementById('la-dt-val').textContent = laDt.toFixed(3);
  });
  document.getElementById('slider-la-np').addEventListener('input', function(e) {
    var oldN = laNumParticles;
    laNumParticles = parseInt(e.target.value);
    document.getElementById('la-np-val').textContent = laNumParticles;
    document.getElementById('la-pcount').textContent = laNumParticles;
    document.getElementById('la-pc-stat').textContent = laNumParticles;
    // Add or remove particles
    if (laNumParticles > oldN) {
      for (var i = oldN; i < laNumParticles; i++) {
        laParticles.push(new laParticle(
          0.1 + i * 0.05, 0.1 + i * 0.05, 0.1 + i * 0.05,
          (i * 360 / laNumParticles + laHueShift) % 360
        ));
      }
    } else if (laNumParticles < oldN) {
      laParticles = laParticles.slice(0, laNumParticles);
    }
  });
  document.getElementById('slider-la-trail').addEventListener('input', function(e) {
    laTrailLen = parseInt(e.target.value);
    document.getElementById('la-trail-val').textContent = laTrailLen;
    // Trim existing trails
    for (var i = 0; i < laParticles.length; i++) {
      while (laParticles[i].trail.length > laTrailLen) laParticles[i].trail.shift();
    }
  });
  document.getElementById('slider-la-scale').addEventListener('input', function(e) {
    laScale = parseFloat(e.target.value);
    document.getElementById('la-scale-val').textContent = laScale.toFixed(1);
  });
  document.getElementById('slider-la-hue').addEventListener('input', function(e) {
    laHueShift = parseInt(e.target.value);
    document.getElementById('la-hue-val').textContent = laHueShift;
  });

  // --- Mouse / touch interaction ---
  laCanvas.addEventListener('mousedown', function(e) {
    laDragging = true;
    laAutoRotate = false;
    laLastMX = e.clientX;
    laLastMY = e.clientY;
  });
  window.addEventListener('mouseup', function() {
    laDragging = false;
  });
  window.addEventListener('mousemove', function(e) {
    if (laDragging) {
      var dx = e.clientX - laLastMX;
      var dy = e.clientY - laLastMY;
      laRotY += dx * 0.01;
      laRotX += dy * 0.01;
      laLastMX = e.clientX;
      laLastMY = e.clientY;
    }
  });

  // Touch support
  laCanvas.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
      laDragging = true;
      laAutoRotate = false;
      laLastMX = e.touches[0].clientX;
      laLastMY = e.touches[0].clientY;
      e.preventDefault();
    }
  }, {passive: false});
  laCanvas.addEventListener('touchmove', function(e) {
    if (laDragging && e.touches.length === 1) {
      var dx = e.touches[0].clientX - laLastMX;
      var dy = e.touches[0].clientY - laLastMY;
      laRotY += dx * 0.01;
      laRotX += dy * 0.01;
      laLastMX = e.touches[0].clientX;
      laLastMY = e.touches[0].clientY;
      e.preventDefault();
    }
  }, {passive: false});
  laCanvas.addEventListener('touchend', function() {
    laDragging = false;
  });

  // Click to spawn a particle (but not when dragging)
  var laMouseDownPos = null;
  laCanvas.addEventListener('mousedown', function(e) {
    laMouseDownPos = {x: e.clientX, y: e.clientY};
  });
  laCanvas.addEventListener('click', function(e) {
    if (!laMouseDownPos) return;
    var dist = Math.hypot(e.clientX - laMouseDownPos.x, e.clientY - laMouseDownPos.y);
    if (dist < 5) {
      // Spawn a new particle at a random near-origin position
      var hue = Math.random() * 360;
      var p = new laParticle(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2 + 10,
        (hue + laHueShift) % 360
      );
      laParticles.push(p);
      laNumParticles = laParticles.length;
      document.getElementById('la-pcount').textContent = laNumParticles;
      document.getElementById('la-pc-stat').textContent = laNumParticles;
    }
    laMouseDownPos = null;
  });

  // --- Presets ---
  var laPresets = {
    classic:   { sigma: 10, rho: 28, beta: 2.67, dt: 0.01, np: 5, trail: 300, scale: 12, hue: 0 },
    butterfly: { sigma: 10, rho: 28, beta: 2.67, dt: 0.008, np: 12, trail: 500, scale: 10, hue: 180 },
    spiral:    { sigma: 16, rho: 45, beta: 3.0, dt: 0.006, np: 8, trail: 400, scale: 8, hue: 90 },
    burst:     { sigma: 14, rho: 35, beta: 2.0, dt: 0.015, np: 20, trail: 150, scale: 14, hue: 45 },
    mill:      { sigma: 7, rho: 20, beta: 4.0, dt: 0.012, np: 6, trail: 350, scale: 15, hue: 270 },
    cycle:     { sigma: 10, rho: 28, beta: 2.67, dt: 0.01, np: 3, trail: 600, scale: 13, hue: 120 }
  };

  document.querySelectorAll('#la-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var name = btn.dataset.preset;
      var p = laPresets[name];
      if (!p) return;
      laSigma = p.sigma; laRho = p.rho; laBeta = p.beta; laDt = p.dt;
      laNumParticles = p.np; laTrailLen = p.trail; laScale = p.scale; laHueShift = p.hue;
      // Update slider values
      document.getElementById('slider-la-sigma').value = p.sigma;
      document.getElementById('slider-la-rho').value = p.rho;
      document.getElementById('slider-la-beta').value = p.beta;
      document.getElementById('slider-la-dt').value = p.dt;
      document.getElementById('slider-la-np').value = p.np;
      document.getElementById('slider-la-trail').value = p.trail;
      document.getElementById('slider-la-scale').value = p.scale;
      document.getElementById('slider-la-hue').value = p.hue;
      // Update labels
      document.getElementById('la-sigma-val').textContent = p.sigma.toFixed(1);
      document.getElementById('la-rho-val').textContent = p.rho.toFixed(1);
      document.getElementById('la-beta-val').textContent = p.beta.toFixed(2);
      document.getElementById('la-dt-val').textContent = p.dt.toFixed(3);
      document.getElementById('la-np-val').textContent = p.np;
      document.getElementById('la-trail-val').textContent = p.trail;
      document.getElementById('la-scale-val').textContent = p.scale.toFixed(1);
      document.getElementById('la-hue-val').textContent = p.hue;
      document.getElementById('la-pcount').textContent = p.np;
      document.getElementById('la-pc-stat').textContent = p.np;
      document.getElementById('la-preset-stat').textContent = name;
      document.querySelectorAll('#la-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      laInit();
    });
  });
  // Set initial preset stat
  document.getElementById('la-preset-stat').textContent = 'classic';

  // Initialize (moved from bootstrap)
  laInit();
