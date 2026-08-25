// ============================================================
  //  EXPERIMENT 06 — Boids Flocking Simulation
  // ============================================================
  const W6 = 600, H6 = 400;
  const canvas6 = document.getElementById('canvas6');
  const ctx6 = canvas6.getContext('2d');

  let boidsSep = 1.5;
  let boidsAli = 1.0;
  let boidsCoh = 1.0;
  let boidsPop = 300;
  let boidsPerc = 60;
  let boidsMouseF = 2.0;
  let boidsTrail = 0.15;

  let boidsList = [];
  let mouseX6 = -999, mouseY6 = -999;
  let boidsGrid = null;
  let boidsCols = 0, boidsRows = 0;

  function boidsRebuildGrid() {
    boidsCols = Math.ceil(W6 / boidsPerc);
    boidsRows = Math.ceil(H6 / boidsPerc);
    boidsGrid = [];
    for (let i = 0; i < boidsCols * boidsRows; i++) boidsGrid.push([]);
  }

  function boidsPopulateGrid() {
    if (!boidsGrid) boidsRebuildGrid();
    for (let i = 0; i < boidsGrid.length; i++) boidsGrid[i].length = 0;
    for (let i = 0; i < boidsList.length; i++) {
      const b = boidsList[i];
      const cx = Math.max(0, Math.min(boidsCols - 1, Math.floor(b.x / boidsPerc)));
      const cy = Math.max(0, Math.min(boidsRows - 1, Math.floor(b.y / boidsPerc)));
      boidsGrid[cy * boidsCols + cx].push(i);
    }
  }

  function boidsInit() {
    boidsList = [];
    for (let i = 0; i < boidsPop; i++) {
      boidsList.push({
        x: Math.random() * W6,
        y: Math.random() * H6,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        hue: 180 + Math.random() * 60
      });
    }
    boidsRebuildGrid();
    ctx6.fillStyle = '#0a0a0b';
    ctx6.fillRect(0, 0, W6, H6);
  }

  function boidsStep() {
    // Fade trails
    ctx6.fillStyle = `rgba(10, 10, 11, ${boidsTrail})`;
    ctx6.fillRect(0, 0, W6, H6);

    // Rebuild spatial grid
    boidsPopulateGrid();

    const perc = boidsPerc;
    const perc2 = perc * perc;
    const sepW = boidsSep;
    const aliW = boidsAli;
    const cohW = boidsCoh;
    const maxSpeed = 4;
    const minSpeed = 1.5;
    const maxForce = 0.08;

    for (let i = 0; i < boidsList.length; i++) {
      const b = boidsList[i];

      // Determine grid cell
      const cx = Math.max(0, Math.min(boidsCols - 1, Math.floor(b.x / perc)));
      const cy = Math.max(0, Math.min(boidsRows - 1, Math.floor(b.y / perc)));

      let sepX = 0, sepY = 0, sepCount = 0;
      let aliX = 0, aliY = 0, aliCount = 0;
      let cohX = 0, cohY = 0, cohCount = 0;

      // Scan 3x3 grid cells
      for (let gy = Math.max(0, cy - 1); gy <= Math.min(boidsRows - 1, cy + 1); gy++) {
        for (let gx = Math.max(0, cx - 1); gx <= Math.min(boidsCols - 1, cx + 1); gx++) {
          const cell = boidsGrid[gy * boidsCols + gx];
          for (let k = 0; k < cell.length; k++) {
            const j = cell[k];
            if (j === i) continue;
            const o = boidsList[j];
            const dx = b.x - o.x;
            const dy = b.y - o.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < perc2 && d2 > 0) {
              // Alignment
              aliX += o.vx;
              aliY += o.vy;
              aliCount++;

              // Cohesion
              cohX += o.x;
              cohY += o.y;
              cohCount++;

              // Separation (closer range)
              if (d2 < (perc * 0.5) * (perc * 0.5)) {
                const d = Math.sqrt(d2);
                sepX += (dx / d) / d;
                sepY += (dy / d) / d;
                sepCount++;
              }
            }
          }
        }
      }

      // Compute forces
      let ax = 0, ay = 0;

      // Separation force
      if (sepCount > 0) {
        sepX /= sepCount;
        sepY /= sepCount;
        const m = Math.sqrt(sepX * sepX + sepY * sepY);
        if (m > 0) {
          sepX = (sepX / m) * maxSpeed - b.vx;
          sepY = (sepY / m) * maxSpeed - b.vy;
          const fm = Math.sqrt(sepX * sepX + sepY * sepY);
          if (fm > maxForce) { sepX = (sepX / fm) * maxForce; sepY = (sepY / fm) * maxForce; }
        }
        ax += sepX * sepW;
        ay += sepY * sepW;
      }

      // Alignment force
      if (aliCount > 0) {
        aliX /= aliCount;
        aliY /= aliCount;
        const m = Math.sqrt(aliX * aliX + aliY * aliY);
        if (m > 0) {
          aliX = (aliX / m) * maxSpeed - b.vx;
          aliY = (aliY / m) * maxSpeed - b.vy;
          const fm = Math.sqrt(aliX * aliX + aliY * aliY);
          if (fm > maxForce) { aliX = (aliX / fm) * maxForce; aliY = (aliY / fm) * maxForce; }
        }
        ax += aliX * aliW;
        ay += aliY * aliW;
      }

      // Cohesion force
      if (cohCount > 0) {
        cohX = cohX / cohCount - b.x;
        cohY = cohY / cohCount - b.y;
        const m = Math.sqrt(cohX * cohX + cohY * cohY);
        if (m > 0) {
          cohX = (cohX / m) * maxSpeed - b.vx;
          cohY = (cohY / m) * maxSpeed - b.vy;
          const fm = Math.sqrt(cohX * cohX + cohY * cohY);
          if (fm > maxForce) { cohX = (cohX / fm) * maxForce; cohY = (cohY / fm) * maxForce; }
        }
        ax += cohX * cohW;
        ay += cohY * cohW;
      }

      // Mouse force
      if (mouseX6 > 0) {
        const dx = mouseX6 - b.x;
        const dy = mouseY6 - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14400) { // 120px radius
          const d = Math.sqrt(d2);
          const f = (1 - d / 120) * boidsMouseF * 0.5;
          ax += (dx / d) * f;
          ay += (dy / d) * f;
        }
      }

      // Apply acceleration
      b.vx += ax;
      b.vy += ay;

      // Clamp speed
      const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (sp > maxSpeed) {
        b.vx = (b.vx / sp) * maxSpeed;
        b.vy = (b.vy / sp) * maxSpeed;
      } else if (sp < minSpeed && sp > 0) {
        b.vx = (b.vx / sp) * minSpeed;
        b.vy = (b.vy / sp) * minSpeed;
      }

      // Update position
      b.x += b.vx;
      b.y += b.vy;

      // Wrap edges
      if (b.x < 0) b.x += W6;
      if (b.x >= W6) b.x -= W6;
      if (b.y < 0) b.y += H6;
      if (b.y >= H6) b.y -= H6;

      // Draw
      const hue = (b.hue + sp * 5) % 360;
      ctx6.fillStyle = `hsla(${hue}, 70%, 65%, 0.85)`;
      // Draw as small triangle pointing in velocity direction
      const angle = Math.atan2(b.vy, b.vx);
      ctx6.save();
      ctx6.translate(b.x, b.y);
      ctx6.rotate(angle);
      ctx6.beginPath();
      ctx6.moveTo(4, 0);
      ctx6.lineTo(-3, -2.5);
      ctx6.lineTo(-3, 2.5);
      ctx6.closePath();
      ctx6.fill();
      ctx6.restore();
    }
  }

  // Boids mouse interaction
  canvas6.addEventListener('mousemove', (e) => {
    const rect = canvas6.getBoundingClientRect();
    mouseX6 = (e.clientX - rect.left) * (W6 / rect.width);
    mouseY6 = (e.clientY - rect.top) * (H6 / rect.height);
  });
  canvas6.addEventListener('mouseleave', () => { mouseX6 = -999; mouseY6 = -999; });
  canvas6.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches[0]) {
      const rect = canvas6.getBoundingClientRect();
      mouseX6 = (e.touches[0].clientX - rect.left) * (W6 / rect.width);
      mouseY6 = (e.touches[0].clientY - rect.top) * (H6 / rect.height);
    }
  }, { passive: false });
  canvas6.addEventListener('touchend', () => { mouseX6 = -999; mouseY6 = -999; });

  // Click to scatter boids
  canvas6.addEventListener('click', (e) => {
    const rect = canvas6.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (W6 / rect.width);
    const cy = (e.clientY - rect.top) * (H6 / rect.height);
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      boidsList.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        hue: 180 + Math.random() * 60
      });
    }
    boidsPop = boidsList.length;
    document.getElementById('boids-count-val').textContent = boidsPop;
    document.getElementById('slider-boids-pop').value = Math.min(boidsPop, 800);
    document.getElementById('boids-pop-val').textContent = Math.min(boidsPop, 800);
  });

  // Boids controls
  bindSlider('slider-boids-sep', 'boids-sep-val', (n) => boidsSep = n);
  bindSlider('slider-boids-ali', 'boids-ali-val', (n) => boidsAli = n);
  bindSlider('slider-boids-coh', 'boids-coh-val', (n) => boidsCoh = n);
  bindSlider('slider-boids-pop', 'boids-pop-val', (n) => {
    boidsPop = n;
    document.getElementById('boids-count-val').textContent = n;
    if (boidsList.length < n) {
      while (boidsList.length < n) {
        boidsList.push({
          x: Math.random() * W6, y: Math.random() * H6,
          vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
          hue: 180 + Math.random() * 60
        });
      }
    } else {
      boidsList.length = n;
    }
  });
  bindSlider('slider-boids-perc', 'boids-perc-val', (n) => {
    boidsPerc = n;
    boidsRebuildGrid();
  });
  bindSlider('slider-boids-mouse', 'boids-mouse-val', (n) => boidsMouseF = n);
  bindSlider('slider-boids-trail', 'boids-trail-val', (n) => boidsTrail = n);

  document.getElementById('boids-reset').addEventListener('click', boidsInit);
  document.getElementById('boids-pause').addEventListener('click', (e) => {
    expPaused[5] = !expPaused[5];
    e.target.textContent = expPaused[5] ? 'Resume' : 'Pause';
    document.getElementById('status-text').textContent = expPaused.every(p => p) ? 'paused' : 'experiment running';
  });
  document.getElementById('boids-randomize').addEventListener('click', () => {
    boidsSep = Math.random() * 3 + 0.5;
    boidsAli = Math.random() * 3 + 0.2;
    boidsCoh = Math.random() * 3 + 0.2;
    boidsPerc = Math.floor(Math.random() * 60) + 40;
    boidsMouseF = (Math.random() - 0.3) * 6;
    document.getElementById('slider-boids-sep').value = boidsSep;
    document.getElementById('boids-sep-val').textContent = boidsSep.toFixed(2);
    document.getElementById('slider-boids-ali').value = boidsAli;
    document.getElementById('boids-ali-val').textContent = boidsAli.toFixed(2);
    document.getElementById('slider-boids-coh').value = boidsCoh;
    document.getElementById('boids-coh-val').textContent = boidsCoh.toFixed(2);
    document.getElementById('slider-boids-perc').value = boidsPerc;
    document.getElementById('boids-perc-val').textContent = boidsPerc;
    document.getElementById('slider-boids-mouse').value = boidsMouseF;
    document.getElementById('boids-mouse-val').textContent = boidsMouseF.toFixed(1);
    document.querySelectorAll('#boids-presets .preset-btn').forEach(b => b.classList.remove('active'));
    boidsRebuildGrid();
    boidsInit();
  });

  document.querySelectorAll('#boids-presets .preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#boids-presets .preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      boidsSep = parseFloat(btn.dataset.sep);
      boidsAli = parseFloat(btn.dataset.ali);
      boidsCoh = parseFloat(btn.dataset.coh);
      boidsPerc = parseInt(btn.dataset.perc);
      boidsMouseF = parseFloat(btn.dataset.mouse);
      boidsTrail = parseFloat(btn.dataset.trail);
      document.getElementById('slider-boids-sep').value = boidsSep;
      document.getElementById('boids-sep-val').textContent = boidsSep.toFixed(2);
      document.getElementById('slider-boids-ali').value = boidsAli;
      document.getElementById('boids-ali-val').textContent = boidsAli.toFixed(2);
      document.getElementById('slider-boids-coh').value = boidsCoh;
      document.getElementById('boids-coh-val').textContent = boidsCoh.toFixed(2);
      document.getElementById('slider-boids-perc').value = boidsPerc;
      document.getElementById('boids-perc-val').textContent = boidsPerc;
      document.getElementById('slider-boids-mouse').value = boidsMouseF;
      document.getElementById('boids-mouse-val').textContent = boidsMouseF.toFixed(1);
      document.getElementById('slider-boids-trail').value = boidsTrail;
      document.getElementById('boids-trail-val').textContent = boidsTrail.toFixed(2);
      boidsRebuildGrid();
    });
  });

  // Initialize (moved from bootstrap)
  boidsInit();
