// ============================================================
  //  EXPERIMENT 15 — Particle Life
  // ============================================================
  const plCanvas = document.getElementById('canvas15');
  const plCtx = plCanvas.getContext('2d');
  const plW = 600, plH = 400;

  // Color palette for particle species
  const plColors = [
    [255, 80, 80],    // red
    [80, 200, 255],   // blue
    [80, 255, 120],   // green
    [255, 200, 60],   // yellow
    [200, 100, 255],  // purple
    [255, 140, 200],  // pink
    [100, 255, 220],  // teal
    [255, 160, 60]    // orange
  ];

  // Simulation parameters
  let plParticleCount = 400;
  let plNumColors = 6;
  let plForceMult = 1.0;
  let plFriction = 0.85;
  let plRmax = 80;
  let plRmin = 30;
  let plVmax = 4.0;
  let plTrailFade = 0.12;

  // Interaction matrix: a[i][j] = force color i exerts on color j
  let plMatrix = [];
  let plParticles = [];
  let plGrid = [];       // spatial grid
  let plGridCols, plGridRows;
  let plCellSize;        // = plRmax
  let plMatrixCanvas = document.getElementById('pl-matrix');
  let plMatrixCtx = plMatrixCanvas.getContext('2d');

  function plRandomMatrix(n) {
    const m = [];
    for (let i = 0; i < n; i++) {
      m[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          // Same color: slight repulsion or small attraction
          m[i][j] = (Math.random() - 0.7) * 0.5;
        } else {
          m[i][j] = Math.random() * 2 - 1;
        }
      }
    }
    return m;
  }

  function plInit() {
    plParticles = [];
    for (let i = 0; i < plParticleCount; i++) {
      plParticles.push({
        x: Math.random() * plW,
        y: Math.random() * plH,
        vx: 0,
        vy: 0,
        color: Math.floor(Math.random() * plNumColors)
      });
    }
    plBuildGrid();
    plDrawMatrix();
  }

  function plBuildGrid() {
    plCellSize = plRmax;
    plGridCols = Math.ceil(plW / plCellSize) + 1;
    plGridRows = Math.ceil(plH / plCellSize) + 1;
    plGrid = new Array(plGridCols * plGridRows);
    for (let i = 0; i < plGrid.length; i++) plGrid[i] = [];
    for (let i = 0; i < plParticles.length; i++) {
      const p = plParticles[i];
      const cx = Math.max(0, Math.min(plGridCols - 1, Math.floor(p.x / plCellSize)));
      const cy = Math.max(0, Math.min(plGridRows - 1, Math.floor(p.y / plCellSize)));
      plGrid[cy * plGridCols + cx].push(i);
    }
  }

  function plStep() {
    // Rebuild grid
    plBuildGrid();

    const rmaxSq = plRmax * plRmax;
    const rmin = plRmin;
    const rminSq = rmin * rmin;
    const halfRmin = rmin * 0.5;
    // Force profile:
    //  d < halfRmin: strong repulsion (avoid overlap)
    //  halfRmin < d < rmin: repulsion tapering to 0
    //  rmin < d < rmax: attraction scaled by matrix[i][j]
    //  d > rmax: no force

    for (let i = 0; i < plParticles.length; i++) {
      const p = plParticles[i];
      let fx = 0, fy = 0;
      const cx = Math.max(0, Math.min(plGridCols - 1, Math.floor(p.x / plCellSize)));
      const cy = Math.max(0, Math.min(plGridRows - 1, Math.floor(p.y / plCellSize)));

      // Check neighboring cells in 3x3 around particle
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || nx >= plGridCols || ny < 0 || ny >= plGridRows) continue;
          const cell = plGrid[ny * plGridCols + nx];
          for (let k = 0; k < cell.length; k++) {
            const j = cell[k];
            if (j === i) continue;
            const q = plParticles[j];
            const ddx = q.x - p.x;
            const ddy = q.y - p.y;
            const distSq = ddx * ddx + ddy * ddy;
            if (distSq > rmaxSq || distSq < 1) continue;

            const dist = Math.sqrt(distSq);
            const force = plMatrix[p.color][q.color] * plForceMult;
            let f;
            if (dist < halfRmin) {
              // Strong repulsion to prevent overlap
              f = -1.0 * Math.abs(force) * 2.0;
              if (force < 0) f = -Math.abs(force) * 2.0; // repulsive colors push harder
            } else if (dist < rmin) {
              // Tapering repulsion zone
              const t = (dist - halfRmin) / (rmin - halfRmin);
              f = -Math.abs(force) * (1 - t);
            } else {
              // Attraction zone: rmin to rmax
              const t = 1 - (dist - rmin) / (plRmax - rmin);
              f = force * t;
            }

            fx += (ddx / dist) * f;
            fy += (ddy / dist) * f;
          }
        }
      }

      // Apply force to velocity
      p.vx = (p.vx + fx) * plFriction;
      p.vy = (p.vy + fy) * plFriction;

      // Clamp speed
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > plVmax) {
        p.vx = (p.vx / speed) * plVmax;
        p.vy = (p.vy / speed) * plVmax;
      }

      // Update position with toroidal wrapping
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x += plW;
      else if (p.x >= plW) p.x -= plW;
      if (p.y < 0) p.y += plH;
      else if (p.y >= plH) p.y -= plH;
    }
  }

  function plRender() {
    // Trail fade
    plCtx.fillStyle = 'rgba(10, 10, 11, ' + plTrailFade + ')';
    plCtx.fillRect(0, 0, plW, plH);

    // Draw particles as glowing circles
    for (let i = 0; i < plParticles.length; i++) {
      const p = plParticles[i];
      const c = plColors[p.color];
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const brightness = 0.6 + Math.min(speed / plVmax, 1) * 0.4;

      // Glow
      plCtx.fillStyle = 'rgba(' + (c[0] * brightness) + ',' + (c[1] * brightness) + ',' + (c[2] * brightness) + ',0.25)';
      plCtx.beginPath();
      plCtx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      plCtx.fill();

      // Core
      plCtx.fillStyle = 'rgb(' + (c[0] * brightness) + ',' + (c[1] * brightness) + ',' + (c[2] * brightness) + ')';
      plCtx.beginPath();
      plCtx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      plCtx.fill();
    }
  }

  function plDrawMatrix() {
    const s = 200 / 8;  // cell size in matrix canvas (max 8x8)
    const n = plNumColors;
    const cs = 200 / n;
    plMatrixCtx.fillStyle = '#0a0a0b';
    plMatrixCtx.fillRect(0, 0, 200, 200);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = plMatrix[i] && plMatrix[i][j] !== undefined ? plMatrix[i][j] : 0;
        const mag = Math.min(1, Math.abs(v));
        if (v >= 0) {
          // Green = attract
          plMatrixCtx.fillStyle = 'rgba(74, 222, 128, ' + mag + ')';
        } else {
          // Red = repel
          plMatrixCtx.fillStyle = 'rgba(255, 80, 80, ' + mag + ')';
        }
        plMatrixCtx.fillRect(j * cs, i * cs, cs, cs);
        // Grid lines
        plMatrixCtx.strokeStyle = 'rgba(255,255,255,0.1)';
        plMatrixCtx.strokeRect(j * cs, i * cs, cs, cs);
      }
    }
  }

  function plScatter() {
    for (let i = 0; i < plParticles.length; i++) {
      plParticles[i].x = Math.random() * plW;
      plParticles[i].y = Math.random() * plH;
      plParticles[i].vx = (Math.random() - 0.5) * 2;
      plParticles[i].vy = (Math.random() - 0.5) * 2;
    }
  }

  function plRandomize() {
    plMatrix = plRandomMatrix(plNumColors);
    plDrawMatrix();
  }

  function plReset() {
    plMatrix = plRandomMatrix(plNumColors);
    plInit();
  }

  // Presets
  function plApplyPreset(name) {
    const n = plNumColors;
    switch (name) {
      case 'cells': {
        // Self-repulsion, cross-attraction in a cycle → cell-like clusters
        plMatrix = [];
        for (let i = 0; i < n; i++) {
          plMatrix[i] = [];
          for (let j = 0; j < n; j++) {
            if (i === j) plMatrix[i][j] = -0.4;
            else plMatrix[i][j] = 0.5 + Math.random() * 0.3;
          }
        }
        break;
      }
      case 'chains': {
        // Each color attracts the next in sequence → chains
        plMatrix = [];
        for (let i = 0; i < n; i++) {
          plMatrix[i] = [];
          for (let j = 0; j < n; j++) {
            if (j === (i + 1) % n) plMatrix[i][j] = 0.8;
            else if (i === j) plMatrix[i][j] = -0.3;
            else plMatrix[i][j] = -0.1;
          }
        }
        break;
      }
      case 'ecology': {
        // Predator-prey: some colors chase others, others flee
        plMatrix = [];
        for (let i = 0; i < n; i++) {
          plMatrix[i] = [];
          for (let j = 0; j < n; j++) {
            if (i === j) { plMatrix[i][j] = 0.3; continue; }
            const diff = (j - i + n) % n;
            if (diff === 1) plMatrix[i][j] = 0.7;      // attract next
            else if (diff === n - 1) plMatrix[i][j] = -0.6; // repel prev (flee predator)
            else plMatrix[i][j] = (Math.random() - 0.5) * 0.3;
          }
        }
        break;
      }
      case 'crystal': {
        // Strong self-attraction, weak cross → crystalline clusters
        plMatrix = [];
        for (let i = 0; i < n; i++) {
          plMatrix[i] = [];
          for (let j = 0; j < n; j++) {
            if (i === j) plMatrix[i][j] = 0.8;
            else plMatrix[i][j] = -0.15;
          }
        }
        break;
      }
      case 'chaos': {
        plMatrix = plRandomMatrix(n);
        // Amplify
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++)
            plMatrix[i][j] *= 1.5;
        break;
      }
      case 'default':
      default: {
        plMatrix = plRandomMatrix(n);
        break;
      }
    }
    plDrawMatrix();
    plScatter();
  }

  // --- UI wiring ---
  document.getElementById('pl-pause').addEventListener('click', function(e) {
    expPaused[14] = !expPaused[14];
    e.target.textContent = expPaused[14] ? 'Resume' : 'Pause';
    document.getElementById('status-text').textContent = expPaused.every(p => p) ? 'paused' : 'experiment running';
  });

  document.getElementById('pl-reset').addEventListener('click', function() {
    plReset();
    plScatter();
    document.querySelectorAll('#pl-presets .preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('#pl-presets .preset-btn[data-preset="default"]').classList.add('active');
  });

  document.getElementById('pl-randomize').addEventListener('click', function() {
    plRandomize();
    plScatter();
    document.querySelectorAll('#pl-presets .preset-btn').forEach(b => b.classList.remove('active'));
  });

  document.getElementById('pl-scatter').addEventListener('click', plScatter);

  document.querySelectorAll('#pl-presets .preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#pl-presets .preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      plApplyPreset(btn.dataset.preset);
    });
  });

  // Sliders
  document.getElementById('slider-pl-count').addEventListener('input', function(e) {
    plParticleCount = parseInt(e.target.value);
    document.getElementById('pl-count-val').textContent = plParticleCount;
    document.getElementById('pl-count-stat').textContent = plParticleCount;
    plInit();
  });
  document.getElementById('slider-pl-colors').addEventListener('input', function(e) {
    plNumColors = parseInt(e.target.value);
    document.getElementById('pl-colors-val').textContent = plNumColors;
    plMatrix = plRandomMatrix(plNumColors);
    plInit();
    document.querySelectorAll('#pl-presets .preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('#pl-presets .preset-btn[data-preset="default"]').classList.add('active');
  });
  document.getElementById('slider-pl-force').addEventListener('input', function(e) {
    plForceMult = parseFloat(e.target.value);
    document.getElementById('pl-force-val').textContent = plForceMult.toFixed(1);
  });
  document.getElementById('slider-pl-friction').addEventListener('input', function(e) {
    plFriction = parseFloat(e.target.value);
    document.getElementById('pl-friction-val').textContent = plFriction.toFixed(2);
  });
  document.getElementById('slider-pl-rmax').addEventListener('input', function(e) {
    plRmax = parseInt(e.target.value);
    document.getElementById('pl-rmax-val').textContent = plRmax;
    if (plRmax <= plRmin) { plRmin = Math.max(10, plRmax - 10); document.getElementById('slider-pl-rmin').value = plRmin; document.getElementById('pl-rmin-val').textContent = plRmin; }
  });
  document.getElementById('slider-pl-rmin').addEventListener('input', function(e) {
    plRmin = parseInt(e.target.value);
    document.getElementById('pl-rmin-val').textContent = plRmin;
    if (plRmin >= plRmax) { plRmax = plRmin + 10; document.getElementById('slider-pl-rmax').value = plRmax; document.getElementById('pl-rmax-val').textContent = plRmax; }
  });
  document.getElementById('slider-pl-vmax').addEventListener('input', function(e) {
    plVmax = parseFloat(e.target.value);
    document.getElementById('pl-vmax-val').textContent = plVmax.toFixed(1);
  });
  document.getElementById('slider-pl-trail').addEventListener('input', function(e) {
    plTrailFade = parseFloat(e.target.value);
    document.getElementById('pl-trail-val').textContent = plTrailFade.toFixed(2);
  });

  // Canvas interaction — click to scatter
  plCanvas.addEventListener('click', function(e) {
    const rect = plCanvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) / rect.width * plW;
    const sy = (e.clientY - rect.top) / rect.height * plH;
    for (let i = 0; i < plParticles.length; i++) {
      const dx = plParticles[i].x - sx;
      const dy = plParticles[i].y - sy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 100) {
        const force = (100 - d) / 100;
        plParticles[i].vx += (dx / (d + 1)) * force * 5;
        plParticles[i].vy += (dy / (d + 1)) * force * 5;
      }
    }
  });

  // Touch support
  plCanvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    const rect = plCanvas.getBoundingClientRect();
    const touch = e.touches[0];
    const sx = (touch.clientX - rect.left) / rect.width * plW;
    const sy = (touch.clientY - rect.top) / rect.height * plH;
    for (let i = 0; i < plParticles.length; i++) {
      const dx = plParticles[i].x - sx;
      const dy = plParticles[i].y - sy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 100) {
        const force = (100 - d) / 100;
        plParticles[i].vx += (dx / (d + 1)) * force * 5;
        plParticles[i].vy += (dy / (d + 1)) * force * 5;
      }
    }
  });

  // Initialize
  plReset();
  plApplyPreset('default');
