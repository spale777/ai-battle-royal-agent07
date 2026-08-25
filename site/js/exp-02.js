// ============================================================
  //  EXPERIMENT 02 — Flow Field Particles
  // ============================================================
  const W2 = 600, H2 = 400;
  const canvas2 = document.getElementById('canvas2');
  const ctx2 = canvas2.getContext('2d');

  let ffNoiseScale = 0.003;
  let ffSpeed = 1.5;
  let ffFade = 0.04;
  let ffCount = 2000;
  let ffHueRange = 40;
  let ffHueBase = 200;

  let particles = [];
  let ffTime = 0;
  let mouseX2 = -999, mouseY2 = -999;
  let mouseDown2 = false;

  // Simple value-noise function (pseudo-Perlin via gradient interpolation)
  const perm = new Uint8Array(512);
  (function initPerm() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function grad(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }

  function noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[perm[X] + Y];
    const ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];
    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v); // returns ~[-1, 1]
  }

  function ffInit() {
    particles = [];
    for (let i = 0; i < ffCount; i++) {
      particles.push({
        x: Math.random() * W2,
        y: Math.random() * H2,
        px: 0, py: 0,
        life: Math.random() * 100,
        hue: Math.random()
      });
    }
    particles.forEach(p => { p.px = p.x; p.py = p.y; });
    ffTime = 0;
    // Clear canvas to black
    ctx2.fillStyle = '#000';
    ctx2.fillRect(0, 0, W2, H2);
  }

  function ffReset() {
    ffInit();
  }

  function ffClearTrails() {
    ctx2.fillStyle = '#000';
    ctx2.fillRect(0, 0, W2, H2);
  }

  function ffStep() {
    // Fade trails
    ctx2.fillStyle = `rgba(0, 0, 0, ${ffFade})`;
    ctx2.fillRect(0, 0, W2, H2);

    const ns = ffNoiseScale;
    const spd = ffSpeed;
    const tStep = ffTime * 0.001;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Sample noise field → angle
      const n = noise2D(p.x * ns + tStep, p.y * ns + tStep * 0.5);
      const angle = n * Math.PI * 2;

      p.px = p.x;
      p.py = p.y;
      p.x += Math.cos(angle) * spd;
      p.y += Math.sin(angle) * spd;

      // Mouse interaction — push particles away from cursor
      if (mouseX2 > 0) {
        const dx = p.x - mouseX2;
        const dy = p.y - mouseY2;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 6400) { // 80px radius
          const dist = Math.sqrt(dist2);
          const force = (1 - dist / 80) * 3;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }
      }

      // Wrap around edges
      if (p.x < 0) { p.x = W2; p.px = p.x; }
      if (p.x > W2) { p.x = 0; p.px = p.x; }
      if (p.y < 0) { p.y = H2; p.py = p.y; }
      if (p.y > H2) { p.y = 0; p.py = p.y; }

      // Draw trail
      const hue = (ffHueBase + p.hue * ffHueRange) % 360;
      ctx2.strokeStyle = `hsla(${hue}, 80%, 60%, 0.5)`;
      ctx2.lineWidth = 1;
      ctx2.beginPath();
      ctx2.moveTo(p.px, p.py);
      ctx2.lineTo(p.x, p.y);
      ctx2.stroke();

      p.life++;
      // Occasionally respawn for variety
      if (p.life > 200 + Math.random() * 300) {
        p.x = Math.random() * W2;
        p.y = Math.random() * H2;
        p.px = p.x;
        p.py = p.y;
        p.life = 0;
      }
    }

    ffTime++;
  }

  // Flow field mouse interaction
  canvas2.addEventListener('mousemove', (e) => {
    const rect = canvas2.getBoundingClientRect();
    mouseX2 = (e.clientX - rect.left) * (W2 / rect.width);
    mouseY2 = (e.clientY - rect.top) * (H2 / rect.height);
  });
  canvas2.addEventListener('mouseleave', () => { mouseX2 = -999; mouseY2 = -999; });
  canvas2.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches[0]) {
      const rect = canvas2.getBoundingClientRect();
      mouseX2 = (e.touches[0].clientX - rect.left) * (W2 / rect.width);
      mouseY2 = (e.touches[0].clientY - rect.top) * (H2 / rect.height);
    }
  }, { passive: false });
  canvas2.addEventListener('touchend', () => { mouseX2 = -999; mouseY2 = -999; });

  // Flow field controls
  bindSlider('slider-ff-noise', 'ff-noise-val', (n) => ffNoiseScale = n);
  bindSlider('slider-ff-speed', 'ff-speed-val', (n) => ffSpeed = n);
  bindSlider('slider-ff-fade', 'ff-fade-val', (n) => ffFade = n);
  bindSlider('slider-ff-count', 'ff-count-val', (n) => {
    ffCount = n;
    document.getElementById('particle-count').textContent = n;
    // Adjust particle array
    if (particles.length < n) {
      while (particles.length < n) {
        particles.push({
          x: Math.random() * W2, y: Math.random() * H2,
          px: 0, py: 0, life: 0, hue: Math.random()
        });
        particles[particles.length - 1].px = particles[particles.length - 1].x;
        particles[particles.length - 1].py = particles[particles.length - 1].y;
      }
    } else {
      particles.length = n;
    }
  });
  bindSlider('slider-ff-hue', 'ff-hue-val', (n) => ffHueRange = n);
  bindSlider('slider-ff-huebase', 'ff-huebase-val', (n) => ffHueBase = n);

  document.getElementById('ff-reset').addEventListener('click', ffReset);
  document.getElementById('ff-clear').addEventListener('click', ffClearTrails);
  document.getElementById('ff-pause').addEventListener('click', (e) => {
    expPaused[1] = !expPaused[1];
    e.target.textContent = expPaused[1] ? 'Resume' : 'Pause';
    document.getElementById('status-text').textContent = expPaused.every(p => p) ? 'paused' : 'experiment running';
  });
  document.getElementById('ff-randomize').addEventListener('click', () => {
    ffNoiseScale = 0.001 + Math.random() * 0.019;
    ffSpeed = 0.5 + Math.random() * 4;
    ffHueBase = Math.floor(Math.random() * 360);
    ffHueRange = Math.floor(Math.random() * 120) + 10;
    document.getElementById('slider-ff-noise').value = ffNoiseScale;
    document.getElementById('ff-noise-val').textContent = ffNoiseScale.toFixed(4);
    document.getElementById('slider-ff-speed').value = ffSpeed;
    document.getElementById('ff-speed-val').textContent = ffSpeed.toFixed(1);
    document.getElementById('slider-ff-hue').value = ffHueRange;
    document.getElementById('ff-hue-val').textContent = ffHueRange;
    document.getElementById('slider-ff-huebase').value = ffHueBase;
    document.getElementById('ff-huebase-val').textContent = ffHueBase;
    document.querySelectorAll('#ff-presets .preset-btn').forEach(b => b.classList.remove('active'));
    ffReset();
  });

  document.querySelectorAll('#ff-presets .preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ff-presets .preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ffNoiseScale = parseFloat(btn.dataset.noise);
      ffSpeed = parseFloat(btn.dataset.speed);
      ffFade = parseFloat(btn.dataset.fade);
      const pc = parseInt(btn.dataset.particles);
      ffCount = pc;
      document.getElementById('slider-ff-noise').value = ffNoiseScale;
      document.getElementById('ff-noise-val').textContent = ffNoiseScale.toFixed(4);
      document.getElementById('slider-ff-speed').value = ffSpeed;
      document.getElementById('ff-speed-val').textContent = ffSpeed.toFixed(1);
      document.getElementById('slider-ff-fade').value = ffFade;
      document.getElementById('ff-fade-val').textContent = ffFade.toFixed(3);
      document.getElementById('slider-ff-count').value = pc;
      document.getElementById('ff-count-val').textContent = pc;
      document.getElementById('particle-count').textContent = pc;
      ffReset();
    });
  });

  // Initialize (moved from bootstrap)
  ffInit();
