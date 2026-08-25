// ============================================================
  //  EXPERIMENT 10 — N-Body Gravity Simulation
  // ============================================================
  const nbCanvas = document.getElementById('canvas10');
  const nbCtx = nbCanvas.getContext('2d');
  const NB_W = nbCanvas.width, NB_H = nbCanvas.height;

  let nbBodies = [];
  let nbGrav = 1.0;
  let nbSoft = 5;
  let nbTrailLen = 40;
  let nbSpeedSteps = 1;
  let nbHue = 200;
  let nbCurrentPreset = 'binary';
  let nbMergeCount = 0;
  let nbDragging = false;
  let nbDragStart = null;
  let nbDragEnd = null;
  let nbMouseX = 0, nbMouseY = 0;
  let nbMouseInside = false;

  function nbBody(x, y, vx, vy, mass, hue) {
    return {
      x, y, vx, vy, mass,
      r: Math.max(2, Math.cbrt(mass) * 2),
      hue: hue !== undefined ? hue : Math.floor(Math.random() * 360),
      trail: [],
      ax: 0, ay: 0
    };
  }

  function nbComputeForces() {
    const n = nbBodies.length;
    const eps2 = nbSoft * nbSoft;
    for (let i = 0; i < n; i++) {
      nbBodies[i].ax = 0;
      nbBodies[i].ay = 0;
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = nbBodies[j].x - nbBodies[i].x;
        const dy = nbBodies[j].y - nbBodies[i].y;
        const distSq = dx * dx + dy * dy + eps2;
        const dist = Math.sqrt(distSq);
        const f = nbGrav * nbBodies[i].mass * nbBodies[j].mass / distSq;
        const fx = f * dx / dist;
        const fy = f * dy / dist;
        nbBodies[i].ax += fx / nbBodies[i].mass;
        nbBodies[i].ay += fy / nbBodies[i].mass;
        nbBodies[j].ax -= fx / nbBodies[j].mass;
        nbBodies[j].ay -= fy / nbBodies[j].mass;
      }
    }
  }

  function nbHandleMerges() {
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < nbBodies.length; i++) {
        for (let j = i + 1; j < nbBodies.length; j++) {
          const dx = nbBodies[j].x - nbBodies[i].x;
          const dy = nbBodies[j].y - nbBodies[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < nbBodies[i].r + nbBodies[j].r) {
            const totalMass = nbBodies[i].mass + nbBodies[j].mass;
            nbBodies[i].x = (nbBodies[i].x * nbBodies[i].mass + nbBodies[j].x * nbBodies[j].mass) / totalMass;
            nbBodies[i].y = (nbBodies[i].y * nbBodies[i].mass + nbBodies[j].y * nbBodies[j].mass) / totalMass;
            nbBodies[i].vx = (nbBodies[i].vx * nbBodies[i].mass + nbBodies[j].vx * nbBodies[j].mass) / totalMass;
            nbBodies[i].vy = (nbBodies[i].vy * nbBodies[i].mass + nbBodies[j].vy * nbBodies[j].mass) / totalMass;
            nbBodies[i].mass = totalMass;
            nbBodies[i].r = Math.max(2, Math.cbrt(totalMass) * 2);
            nbBodies.splice(j, 1);
            nbMergeCount++;
            merged = true;
            break;
          }
        }
        if (merged) break;
      }
    }
  }

  function nbStep() {
    nbComputeForces();
    for (let i = 0; i < nbBodies.length; i++) {
      const b = nbBodies[i];
      b.vx += b.ax;
      b.vy += b.ay;
      b.x += b.vx;
      b.y += b.vy;

      // Boundary: wrap around toroidally
      if (b.x < 0) { b.x += NB_W; }
      else if (b.x >= NB_W) { b.x -= NB_W; }
      if (b.y < 0) { b.y += NB_H; }
      else if (b.y >= NB_H) { b.y -= NB_H; }

      // Trail
      if (nbTrailLen > 0) {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > nbTrailLen) b.trail.shift();
      } else {
        b.trail.length = 0;
      }
    }
    nbHandleMerges();
  }

  function nbRender() {
    // Fade background for trail effect
    nbCtx.fillStyle = 'rgba(10, 10, 11, 0.25)';
    nbCtx.fillRect(0, 0, NB_W, NB_H);

    // Draw trails
    for (let i = 0; i < nbBodies.length; i++) {
      const b = nbBodies[i];
      if (b.trail.length < 2) continue;
      nbCtx.strokeStyle = `hsla(${(b.hue + nbHue) % 360}, 80%, 60%, 0.5)`;
      nbCtx.lineWidth = 1.5;
      nbCtx.beginPath();
      // Handle wrapping: draw trail segments, breaking at wraps
      let prev = b.trail[0];
      nbCtx.moveTo(prev.x, prev.y);
      for (let k = 1; k < b.trail.length; k++) {
        const p = b.trail[k];
        const dx = Math.abs(p.x - prev.x);
        const dy = Math.abs(p.y - prev.y);
        if (dx > NB_W / 2 || dy > NB_H / 2) {
          nbCtx.moveTo(p.x, p.y);
        } else {
          nbCtx.lineTo(p.x, p.y);
        }
        prev = p;
      }
      nbCtx.stroke();
    }

    // Draw bodies with glow
    for (let i = 0; i < nbBodies.length; i++) {
      const b = nbBodies[i];
      const h = (b.hue + nbHue) % 360;

      // Glow
      const glowR = b.r * 3;
      const grad = nbCtx.createRadialGradient(b.x, b.y, 0, b.x, b.y, glowR);
      grad.addColorStop(0, `hsla(${h}, 100%, 70%, 0.8)`);
      grad.addColorStop(0.4, `hsla(${h}, 90%, 50%, 0.3)`);
      grad.addColorStop(1, `hsla(${h}, 80%, 40%, 0)`);
      nbCtx.fillStyle = grad;
      nbCtx.beginPath();
      nbCtx.arc(b.x, b.y, glowR, 0, Math.PI * 2);
      nbCtx.fill();

      // Core
      nbCtx.fillStyle = `hsl(${h}, 100%, 85%)`;
      nbCtx.beginPath();
      nbCtx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      nbCtx.fill();
    }

    // Draw drag indicator
    if (nbDragging && nbDragStart && nbDragEnd) {
      nbCtx.strokeStyle = 'rgba(255, 92, 31, 0.7)';
      nbCtx.lineWidth = 2;
      nbCtx.setLineDash([5, 5]);
      nbCtx.beginPath();
      nbCtx.moveTo(nbDragStart.x, nbDragStart.y);
      nbCtx.lineTo(nbDragEnd.x, nbDragEnd.y);
      nbCtx.stroke();
      nbCtx.setLineDash([]);
      nbCtx.fillStyle = 'rgba(255, 92, 31, 0.3)';
      nbCtx.beginPath();
      nbCtx.arc(nbDragStart.x, nbDragStart.y, 8, 0, Math.PI * 2);
      nbCtx.fill();
    }
  }

  function nbUpdateStats() {
    document.getElementById('nb-count-val').textContent = nbBodies.length;
    document.getElementById('nb-body-stat').textContent = nbBodies.length;
    document.getElementById('nb-merges-stat').textContent = nbMergeCount;
    // Compute total kinetic energy
    let ke = 0;
    for (let i = 0; i < nbBodies.length; i++) {
      const b = nbBodies[i];
      ke += 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy);
    }
    document.getElementById('nb-energy-val').textContent = Math.round(ke);
    document.getElementById('nb-mode-stat').textContent = nbCurrentPreset;
  }

  function nbApplyPreset(name) {
    nbCurrentPreset = name;
    nbBodies = [];
    nbMergeCount = 0;
    const cx = NB_W / 2, cy = NB_H / 2;

    if (name === 'binary') {
      // Two large bodies in orbit
      const m = 500;
      const sep = 120;
      const v = Math.sqrt(nbGrav * m / (4 * sep));
      nbBodies.push(nbBody(cx - sep, cy, 0, -v, m, 200));
      nbBodies.push(nbBody(cx + sep, cy, 0, v, m, 30));
    } else if (name === 'solar') {
      // Central star with planets
      const starM = 2000;
      nbBodies.push(nbBody(cx, cy, 0, 0, starM, 40));
      const planetData = [
        { d: 60, m: 10, h: 100 },
        { d: 100, m: 20, h: 150 },
        { d: 150, m: 15, h: 280 },
        { d: 200, m: 30, h: 200 },
      ];
      for (const p of planetData) {
        const v = Math.sqrt(nbGrav * starM / p.d);
        const angle = Math.random() * Math.PI * 2;
        nbBodies.push(nbBody(
          cx + Math.cos(angle) * p.d,
          cy + Math.sin(angle) * p.d,
          -Math.sin(angle) * v,
          Math.cos(angle) * v,
          p.m, p.h
        ));
      }
    } else if (name === 'galaxy') {
      // Central black hole + spiral of bodies
      const bhM = 1500;
      nbBodies.push(nbBody(cx, cy, 0, 0, bhM, 0));
      const arms = 3;
      const count = 80;
      for (let i = 0; i < count; i++) {
        const arm = i % arms;
        const t = i / count;
        const angle = arm * (Math.PI * 2 / arms) + t * Math.PI * 3;
        const r = 30 + t * 200;
        const v = Math.sqrt(nbGrav * bhM / r) * 0.9;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        nbBodies.push(nbBody(
          px, py,
          -Math.sin(angle) * v,
          Math.cos(angle) * v,
          3 + Math.random() * 5,
          (arm * 120 + t * 60) % 360
        ));
      }
    } else if (name === 'cluster') {
      // Random cluster of medium-mass bodies
      for (let i = 0; i < 40; i++) {
        const r = Math.random() * 150;
        const angle = Math.random() * Math.PI * 2;
        nbBodies.push(nbBody(
          cx + Math.cos(angle) * r,
          cy + Math.sin(angle) * r,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          20 + Math.random() * 30,
          Math.floor(Math.random() * 360)
        ));
      }
    } else if (name === 'trinary') {
      // Three bodies in a Lagrange-like configuration
      const m = 300;
      const r = 100;
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const v = Math.sqrt(nbGrav * m / r) * 0.8;
        nbBodies.push(nbBody(
          cx + Math.cos(angle) * r,
          cy + Math.sin(angle) * r,
          -Math.sin(angle) * v,
          Math.cos(angle) * v,
          m,
          i * 120
        ));
      }
    } else if (name === 'chaos') {
      // Random cloud with varied masses
      for (let i = 0; i < 60; i++) {
        nbBodies.push(nbBody(
          50 + Math.random() * (NB_W - 100),
          50 + Math.random() * (NB_H - 100),
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3,
          5 + Math.random() * 50,
          Math.floor(Math.random() * 360)
        ));
      }
    }

    nbUpdateStats();
    nbRender();
  }

  function nbInit() {
    nbApplyPreset('binary');
  }

  // Mouse / touch interaction
  function nbGetCanvasPos(e) {
    const rect = nbCanvas.getBoundingClientRect();
    const scaleX = NB_W / rect.width;
    const scaleY = NB_H / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  nbCanvas.addEventListener('mousedown', (e) => {
    const p = nbGetCanvasPos(e);
    nbDragging = true;
    nbDragStart = p;
    nbDragEnd = p;
  });

  nbCanvas.addEventListener('mousemove', (e) => {
    const p = nbGetCanvasPos(e);
    nbMouseX = p.x; nbMouseY = p.y;
    nbMouseInside = true;
    if (nbDragging) nbDragEnd = p;
  });

  nbCanvas.addEventListener('mouseleave', () => {
    nbMouseInside = false;
  });

  nbCanvas.addEventListener('mouseup', (e) => {
    if (!nbDragging) return;
    const p = nbGetCanvasPos(e);
    nbDragEnd = p;
    const dx = nbDragEnd.x - nbDragStart.x;
    const dy = nbDragEnd.y - nbDragStart.y;
    const mass = 20 + Math.random() * 30;
    const hue = Math.floor(Math.random() * 360);
    nbBodies.push(nbBody(nbDragStart.x, nbDragStart.y, dx * 0.05, dy * 0.05, mass, hue));
    nbDragging = false;
    nbDragStart = null;
    nbDragEnd = null;
    nbUpdateStats();
  });

  // Touch support
  nbCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const p = nbGetCanvasPos(e);
    nbDragging = true;
    nbDragStart = p;
    nbDragEnd = p;
  }, { passive: false });

  nbCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (nbDragging) nbDragEnd = nbGetCanvasPos(e);
  }, { passive: false });

  nbCanvas.addEventListener('touchend', (e) => {
    if (!nbDragging) return;
    const dx = nbDragEnd.x - nbDragStart.x;
    const dy = nbDragEnd.y - nbDragStart.y;
    const mass = 20 + Math.random() * 30;
    const hue = Math.floor(Math.random() * 360);
    nbBodies.push(nbBody(nbDragStart.x, nbDragStart.y, dx * 0.05, dy * 0.05, mass, hue));
    nbDragging = false;
    nbDragStart = null;
    nbDragEnd = null;
    nbUpdateStats();
  });

  // Button handlers
  document.getElementById('nb-pause').addEventListener('click', () => {
    expPaused[9] = !expPaused[9];
    document.getElementById('nb-pause').textContent = expPaused[9] ? 'Resume' : 'Pause';
    document.getElementById('nb-status-text').textContent = expPaused[9] ? 'paused' : 'running';
  });

  document.getElementById('nb-reset').addEventListener('click', () => {
    nbApplyPreset(nbCurrentPreset);
    expPaused[9] = false;
    document.getElementById('nb-pause').textContent = 'Pause';
    document.getElementById('nb-status-text').textContent = 'running';
  });

  document.getElementById('nb-randomize').addEventListener('click', () => {
    nbBodies = [];
    nbMergeCount = 0;
    for (let i = 0; i < 30 + Math.floor(Math.random() * 30); i++) {
      nbBodies.push(nbBody(
        50 + Math.random() * (NB_W - 100),
        50 + Math.random() * (NB_H - 100),
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        10 + Math.random() * 60,
        Math.floor(Math.random() * 360)
      ));
    }
    nbCurrentPreset = 'random';
    nbUpdateStats();
    nbRender();
  });

  document.getElementById('nb-clear').addEventListener('click', () => {
    nbBodies = [];
    nbMergeCount = 0;
    nbCtx.fillStyle = '#0a0a0b';
    nbCtx.fillRect(0, 0, NB_W, NB_H);
    nbUpdateStats();
  });

  // Preset buttons
  document.querySelectorAll('#nb-presets .preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#nb-presets .preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      nbApplyPreset(btn.dataset.preset);
    });
  });

  // Slider handlers
  document.getElementById('slider-nb-grav').addEventListener('input', (e) => {
    nbGrav = parseFloat(e.target.value);
    document.getElementById('nb-grav-val').textContent = nbGrav.toFixed(1);
  });

  document.getElementById('slider-nb-soft').addEventListener('input', (e) => {
    nbSoft = parseInt(e.target.value);
    document.getElementById('nb-soft-val').textContent = nbSoft;
  });

  document.getElementById('slider-nb-trail').addEventListener('input', (e) => {
    nbTrailLen = parseInt(e.target.value);
    document.getElementById('nb-trail-val').textContent = nbTrailLen;
  });

  document.getElementById('slider-nb-speed').addEventListener('input', (e) => {
    nbSpeedSteps = parseInt(e.target.value);
    document.getElementById('nb-speed-val').textContent = nbSpeedSteps;
  });

  document.getElementById('slider-nb-hue').addEventListener('input', (e) => {
    nbHue = parseInt(e.target.value);
    document.getElementById('nb-hue-val').textContent = nbHue;
  });

  // Initialize
  nbInit();
