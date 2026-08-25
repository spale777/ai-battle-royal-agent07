// ============================================================
  //  EXPERIMENT 18 — Double Pendulum Chaos
  // ============================================================
  const dpCanvas = document.getElementById('canvas18');
  const dpCtx = dpCanvas.getContext('2d');
  const dpW = 600, dpH = 400;

  // Physics parameters
  let dpGravity = 9.81;
  let dpDamping = 0.0;
  let dpDt = 0.05;
  let dpTrailMax = 300;
  let dpTrailFade = 0.96;
  let dpHueOffset = 0;
  let dpHueSpread = 360;
  let dpPreset = 'single';
  let dpPaused = false;
  let dpDragging = null; // {pendulumIndex, bobIndex}

  // Pendulum class
  class DoublePendulum {
    constructor(x, y, theta1, theta2, omega1, omega2, mass1, mass2, length1, length2, hue) {
      this.px = x; this.py = y;       // pivot point
      this.theta1 = theta1;
      this.theta2 = theta2;
      this.omega1 = omega1;
      this.omega2 = omega2;
      this.m1 = mass1;
      this.m2 = mass2;
      this.l1 = length1;
      this.l2 = length2;
      this.hue = hue;
      this.trail = [];
    }

    // Full Lagrangian equations of motion for the double pendulum
    // Returns derivatives [dtheta1, domega1, dtheta2, domega2]
    derivs(theta1, omega1, theta2, omega2) {
      const g = dpGravity;
      const m1 = this.m1, m2 = this.m2, l1 = this.l1, l2 = this.l2;
      const delta = theta2 - theta1;
      const denom1 = (l1 * (2 * m1 + m2 - m2 * Math.cos(2 * delta)));
      const denom2 = (l2 * (2 * m1 + m2 - m2 * Math.cos(2 * delta)));

      // dtheta = omega
      const dtheta1 = omega1;
      const dtheta2 = omega2;

      // domega1
      const num1 = -g * (2 * m1 + m2) * Math.sin(theta1)
                   - m2 * g * Math.sin(theta1 - 2 * theta2)
                   - 2 * Math.sin(delta) * m2
                     * (omega2 * omega2 * l2 + omega1 * omega1 * l1 * Math.cos(delta));
      const domega1 = num1 / denom1;

      // domega2
      const num2 = 2 * Math.sin(delta)
                   * (omega1 * omega1 * l1 * (m1 + m2)
                      + g * (m1 + m2) * Math.cos(theta1)
                      + omega2 * omega2 * l2 * m2 * Math.cos(delta));
      const domega2 = num2 / denom2;

      return [dtheta1, domega1, dtheta2, domega2];
    }

    // RK4 integration step
    step(dt) {
      const y0 = [this.theta1, this.omega1, this.theta2, this.omega2];
      const k1 = this.derivs(y0[0], y0[1], y0[2], y0[3]);

      const s2 = [y0[0] + 0.5*dt*k1[0], y0[1] + 0.5*dt*k1[1],
                   y0[2] + 0.5*dt*k1[2], y0[3] + 0.5*dt*k1[3]];
      const k2 = this.derivs(s2[0], s2[1], s2[2], s2[3]);

      const s3 = [y0[0] + 0.5*dt*k2[0], y0[1] + 0.5*dt*k2[1],
                   y0[2] + 0.5*dt*k2[2], y0[3] + 0.5*dt*k2[3]];
      const k3 = this.derivs(s3[0], s3[1], s3[2], s3[3]);

      const s4 = [y0[0] + dt*k3[0], y0[1] + dt*k3[1],
                   y0[2] + dt*k3[2], y0[3] + dt*k3[3]];
      const k4 = this.derivs(s4[0], s4[1], s4[2], s4[3]);

      this.theta1 += dt/6 * (k1[0] + 2*k2[0] + 2*k3[0] + k4[0]);
      this.omega1 += dt/6 * (k1[1] + 2*k2[1] + 2*k3[1] + k4[1]);
      this.theta2 += dt/6 * (k1[2] + 2*k2[2] + 2*k3[2] + k4[2]);
      this.omega2 += dt/6 * (k1[3] + 2*k2[3] + 2*k3[3] + k4[3]);

      // Apply damping (proportional to angular velocity)
      if (dpDamping > 0) {
        this.omega1 *= (1 - dpDamping);
        this.omega2 *= (1 - dpDamping);
      }

      // Record trail point (tip of second arm)
      const tip = this.getTipPos();
      this.trail.push(tip);
      if (this.trail.length > dpTrailMax) this.trail.shift();
    }

    // Get positions of pivot, bob1, bob2 in canvas coordinates
    getBob1Pos() {
      return {
        x: this.px + this.l1 * Math.sin(this.theta1),
        y: this.py + this.l1 * Math.cos(this.theta1)
      };
    }

    getBob2Pos() {
      const b1 = this.getBob1Pos();
      return {
        x: b1.x + this.l2 * Math.sin(this.theta2),
        y: b1.y + this.l2 * Math.cos(this.theta2)
      };
    }

    getTipPos() {
      return this.getBob2Pos();
    }

    // Set angles from canvas coordinates (for dragging)
    setAnglesFromBobs(b1x, b1y, b2x, b2y) {
      this.theta1 = Math.atan2(b1x - this.px, b1y - this.py);
      const dx2 = b2x - b1x, dy2 = b2y - b1y;
      this.theta2 = Math.atan2(dx2, dy2);
      this.omega1 = 0;
      this.omega2 = 0;
    }

    setTheta1FromPoint(x, y) {
      this.theta1 = Math.atan2(x - this.px, y - this.py);
      this.omega1 = 0;
      this.omega2 = 0;
    }

    setTheta2FromPoint(x, y) {
      const b1 = this.getBob1Pos();
      this.theta2 = Math.atan2(x - b1.x, y - b1.y);
      this.omega1 = 0;
      this.omega2 = 0;
    }

    render(ctx) {
      const b1 = this.getBob1Pos();
      const b2 = this.getBob2Pos();

      // Draw trail
      if (this.trail.length > 1) {
        ctx.strokeStyle = `hsla(${this.hue + dpHueOffset}, 80%, 60%, 0.5)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        for (let i = 1; i < this.trail.length; i++) {
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.stroke();
      }

      // Draw arms
      ctx.strokeStyle = 'rgba(200, 200, 210, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.px, this.py);
      ctx.lineTo(b1.x, b1.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.stroke();

      // Draw pivot
      ctx.fillStyle = 'rgba(150, 150, 160, 0.5)';
      ctx.beginPath();
      ctx.arc(this.px, this.py, 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw bob1
      const r1 = 6 + this.m1 * 2;
      const grad1 = ctx.createRadialGradient(b1.x, b1.y, 0, b1.x, b1.y, r1 * 2);
      grad1.addColorStop(0, `hsla(${this.hue + dpHueOffset}, 80%, 70%, 1)`);
      grad1.addColorStop(0.4, `hsla(${this.hue + dpHueOffset}, 80%, 55%, 0.8)`);
      grad1.addColorStop(1, `hsla(${this.hue + dpHueOffset}, 80%, 40%, 0)`);
      ctx.fillStyle = grad1;
      ctx.beginPath();
      ctx.arc(b1.x, b1.y, r1 * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `hsla(${this.hue + dpHueOffset}, 80%, 65%, 1)`;
      ctx.beginPath();
      ctx.arc(b1.x, b1.y, r1, 0, Math.PI * 2);
      ctx.fill();

      // Draw bob2
      const r2 = 6 + this.m2 * 2;
      const grad2 = ctx.createRadialGradient(b2.x, b2.y, 0, b2.x, b2.y, r2 * 2.5);
      grad2.addColorStop(0, `hsla(${this.hue + dpHueOffset + 30}, 85%, 70%, 1)`);
      grad2.addColorStop(0.4, `hsla(${this.hue + dpHueOffset + 30}, 85%, 55%, 0.8)`);
      grad2.addColorStop(1, `hsla(${this.hue + dpHueOffset + 30}, 85%, 40%, 0)`);
      ctx.fillStyle = grad2;
      ctx.beginPath();
      ctx.arc(b2.x, b2.y, r2 * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `hsla(${this.hue + dpHueOffset + 30}, 85%, 65%, 1)`;
      ctx.beginPath();
      ctx.arc(b2.x, b2.y, r2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let dpPendulums = [];

  function dpApplyPreset(preset) {
    dpPendulums = [];
    const cx = dpW / 2;
    const cy = dpH * 0.35;
    const l1 = 80, l2 = 80;
    const m1 = 10, m2 = 10;

    if (preset === 'single') {
      dpPendulums.push(new DoublePendulum(cx, cy, Math.PI/2, Math.PI/2, 0, 0, m1, m2, l1, l2, 20));
    } else if (preset === 'duo') {
      dpPendulums.push(new DoublePendulum(cx, cy, Math.PI/2, Math.PI/2, 0, 0, m1, m2, l1, l2, 0));
      dpPendulums.push(new DoublePendulum(cx, cy, Math.PI/2 + 0.001, Math.PI/2, 0, 0, m1, m2, l1, l2, 180));
    } else if (preset === 'chaos') {
      for (let i = 0; i < 5; i++) {
        const h = (i / 5) * dpHueSpread;
        dpPendulums.push(new DoublePendulum(cx, cy, Math.PI/2 + i * 0.001, Math.PI/2, 0, 0, m1, m2, l1, l2, h));
      }
    } else if (preset === 'octet') {
      for (let i = 0; i < 8; i++) {
        const h = (i / 8) * dpHueSpread;
        dpPendulums.push(new DoublePendulum(cx, cy, Math.PI/2 + i * 0.0005, Math.PI/2 - 0.01, 0, 0, m1, m2, l1, l2, h));
      }
    } else if (preset === 'grid') {
      const cols = 4, rows = 3;
      const spacing = 130;
      const startX = cx - (cols-1) * spacing / 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const h = (idx / 12) * dpHueSpread;
          const px = startX + c * spacing;
          const py = cy - 20 + r * 15;
          dpPendulums.push(new DoublePendulum(px, py, Math.PI/2 + idx * 0.0002, Math.PI/2, 0, 0, 6, 6, 50, 50, h));
        }
      }
    } else if (preset === 'rainbow') {
      for (let i = 0; i < 20; i++) {
        const h = (i / 20) * 360;
        dpPendulums.push(new DoublePendulum(cx, cy, Math.PI/2 + i * 0.0001, Math.PI/2, 0, 0, 6, 6, 60, 60, h));
      }
    }
    dpUpdateCount();
  }

  function dpStep() {
    const substeps = 4; // sub-steps for stability
    const dt = dpDt / substeps;
    for (const p of dpPendulums) {
      for (let s = 0; s < substeps; s++) p.step(dt);
    }
  }

  function dpRender() {
    // Fade canvas for trail effect
    dpCtx.fillStyle = `rgba(10, 10, 11, ${1 - dpTrailFade})`;
    dpCtx.fillRect(0, 0, dpW, dpH);
    // Draw each pendulum
    for (const p of dpPendulums) p.render(dpCtx);
  }

  function dpUpdateCount() {
    document.getElementById('dp-count-stat').textContent = dpPendulums.length;
  }

  function dpReset() {
    dpApplyPreset(dpPreset);
  }

  function dpClearTrails() {
    for (const p of dpPendulums) p.trail = [];
    dpCtx.fillStyle = '#0a0a0b';
    dpCtx.fillRect(0, 0, dpW, dpH);
  }

  function dpRandomize() {
    const t1 = Math.random() * Math.PI * 2;
    const t2 = Math.random() * Math.PI * 2;
    const m1 = 5 + Math.random() * 15;
    const m2 = 5 + Math.random() * 15;
    const l1 = 50 + Math.random() * 50;
    const l2 = 50 + Math.random() * 50;
    dpPendulums = [];
    const cx = dpW / 2, cy = dpH * 0.35;
    dpPendulums.push(new DoublePendulum(cx, cy, t1, t2, 0, 0, m1, m2, l1, l2, Math.random() * 360));
    dpUpdateCount();
  }

  function dpAddPendulum() {
    const cx = dpW / 2, cy = dpH * 0.35;
    const t1 = Math.random() * Math.PI * 2;
    const t2 = Math.random() * Math.PI * 2;
    const h = dpPendulums.length > 0 ? (dpPendulums[dpPendulums.length - 1].hue + 40) % 360 : Math.random() * 360;
    dpPendulums.push(new DoublePendulum(cx, cy, t1, t2, 0, 0, 10, 10, 80, 80, h));
    dpUpdateCount();
  }

  // --- Mouse / touch interaction: drag bobs ---
  function dpGetCanvasPos(e) {
    const rect = dpCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (dpW / rect.width),
      y: (clientY - rect.top) * (dpH / rect.height)
    };
  }

  // Find the closest bob to a point — returns {pIdx, bobIdx} or null
  function dpFindBob(x, y) {
    let best = null;
    let bestDist = 20; // pixel threshold
    for (let i = 0; i < dpPendulums.length; i++) {
      const p = dpPendulums[i];
      const b1 = p.getBob1Pos();
      const b2 = p.getBob2Pos();
      const d1 = Math.hypot(x - b1.x, y - b1.y);
      const d2 = Math.hypot(x - b2.x, y - b2.y);
      if (d1 < bestDist) { bestDist = d1; best = {pIdx: i, bobIdx: 1}; }
      if (d2 < bestDist) { bestDist = d2; best = {pIdx: i, bobIdx: 2}; }
    }
    return best;
  }

  dpCanvas.addEventListener('mousedown', function(e) {
    const pos = dpGetCanvasPos(e);
    const found = dpFindBob(pos.x, pos.y);
    if (found) {
      dpDragging = found;
      const p = dpPendulums[found.pIdx];
      p.omega1 = 0;
      p.omega2 = 0;
    }
  });

  dpCanvas.addEventListener('mousemove', function(e) {
    if (!dpDragging) return;
    const pos = dpGetCanvasPos(e);
    const p = dpPendulums[dpDragging.pIdx];
    if (dpDragging.bobIdx === 1) {
      p.setTheta1FromPoint(pos.x, pos.y);
    } else {
      p.setTheta2FromPoint(pos.x, pos.y);
    }
    p.trail = []; // clear trail when repositioning
  });

  dpCanvas.addEventListener('mouseup', function() { dpDragging = null; });
  dpCanvas.addEventListener('mouseleave', function() { dpDragging = null; });

  // Touch
  dpCanvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    const pos = dpGetCanvasPos(e);
    const found = dpFindBob(pos.x, pos.y);
    if (found) {
      dpDragging = found;
      const p = dpPendulums[found.pIdx];
      p.omega1 = 0;
      p.omega2 = 0;
    }
  }, { passive: false });

  dpCanvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (!dpDragging) return;
    const pos = dpGetCanvasPos(e);
    const p = dpPendulums[dpDragging.pIdx];
    if (dpDragging.bobIdx === 1) {
      p.setTheta1FromPoint(pos.x, pos.y);
    } else {
      p.setTheta2FromPoint(pos.x, pos.y);
    }
    p.trail = [];
  }, { passive: false });

  dpCanvas.addEventListener('touchend', function() { dpDragging = null; });

  // Slider listeners
  document.getElementById('slider-dp-grav').addEventListener('input', function(e) {
    dpGravity = parseFloat(e.target.value);
    document.getElementById('dp-grav-val').textContent = dpGravity.toFixed(2);
  });

  document.getElementById('slider-dp-damp').addEventListener('input', function(e) {
    dpDamping = parseFloat(e.target.value);
    document.getElementById('dp-damp-val').textContent = dpDamping.toFixed(3);
  });

  document.getElementById('slider-dp-dt').addEventListener('input', function(e) {
    dpDt = parseFloat(e.target.value);
    document.getElementById('dp-dt-val').textContent = dpDt.toFixed(3);
  });

  document.getElementById('slider-dp-trail').addEventListener('input', function(e) {
    dpTrailMax = parseInt(e.target.value);
    document.getElementById('dp-trail-val').textContent = dpTrailMax;
    // Trim existing trails
    for (const p of dpPendulums) {
      while (p.trail.length > dpTrailMax) p.trail.shift();
    }
  });

  document.getElementById('slider-dp-fade').addEventListener('input', function(e) {
    dpTrailFade = parseFloat(e.target.value);
    document.getElementById('dp-fade-val').textContent = dpTrailFade.toFixed(2);
  });

  document.getElementById('slider-dp-hue').addEventListener('input', function(e) {
    dpHueOffset = parseInt(e.target.value);
    document.getElementById('dp-hue-val').textContent = dpHueOffset;
  });

  document.getElementById('slider-dp-spread').addEventListener('input', function(e) {
    dpHueSpread = parseInt(e.target.value);
    document.getElementById('dp-spread-val').textContent = dpHueSpread;
    // Redistribute hues
    for (let i = 0; i < dpPendulums.length; i++) {
      dpPendulums[i].hue = (i / Math.max(1, dpPendulums.length)) * dpHueSpread;
    }
  });

  // Buttons
  document.getElementById('dp-reset').addEventListener('click', dpReset);
  document.getElementById('dp-pause').addEventListener('click', function() {
    dpPaused = !dpPaused;
    document.getElementById('dp-pause').textContent = dpPaused ? 'Resume' : 'Pause';
  });
  document.getElementById('dp-add').addEventListener('click', dpAddPendulum);
  document.getElementById('dp-clear').addEventListener('click', dpClearTrails);
  document.getElementById('dp-randomize').addEventListener('click', dpRandomize);

  // Preset buttons
  document.querySelectorAll('#dp-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#dp-presets .preset-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      dpPreset = btn.dataset.preset;
      dpApplyPreset(dpPreset);
    });
  });

  // Initialize
  dpCtx.fillStyle = '#0a0a0b';
  dpCtx.fillRect(0, 0, dpW, dpH);
  dpApplyPreset('single');
