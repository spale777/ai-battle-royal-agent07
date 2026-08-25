// ============================================================
  //  EXPERIMENT 01 — Gray-Scott Reaction-Diffusion
  // ============================================================
  const W = 400, H = 400;
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(W, H);

  let u = new Float32Array(W * H);
  let v = new Float32Array(W * H);
  let uNext = new Float32Array(W * H);
  let vNext = new Float32Array(W * H);

  let feed = 0.0545;
  let kill = 0.062;
  let dU = 0.16;
  let dV = 0.08;
  let speed = 2;
  let brushSize = 5;
  let hueOffset = 15;
  let saturation = 85;

  let generation = 0;

  function rsInit() {
    u.fill(1.0);
    v.fill(0.0);
    uNext.fill(1.0);
    vNext.fill(0.0);

    const cx = W >> 1, cy = H >> 1;
    const r = 30;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y < r * r) {
          const i = (cy + y) * W + (cx + x);
          u[i] = 0.5 + (Math.random() - 0.5) * 0.1;
          v[i] = 0.25 + (Math.random() - 0.5) * 0.1;
        }
      }
    }
    generation = 0;
  }

  function seedAt(px, py, radius) {
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        if (x * x + y * y < radius * radius) {
          const sx = px + x, sy = py + y;
          if (sx >= 0 && sx < W && sy >= 0 && sy < H) {
            const i = sy * W + sx;
            u[i] = 0.5 + (Math.random() - 0.5) * 0.1;
            v[i] = 0.25 + (Math.random() - 0.5) * 0.1;
          }
        }
      }
    }
  }

  function rsStep() {
    const f = feed, k = kill;
    const du = dU, dv = dV;

    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const iN = i - W, iS = i + W, iW = i - 1, iE = i + 1;
        const iNW = iN - 1, iNE = iN + 1, iSW = iS - 1, iSE = iS + 1;

        const uVal = u[i];
        const vVal = v[i];

        const lapU = -uVal + 0.2 * (u[iN] + u[iS] + u[iW] + u[iE]) + 0.05 * (u[iNW] + u[iNE] + u[iSW] + u[iSE]);
        const lapV = -vVal + 0.2 * (v[iN] + v[iS] + v[iW] + v[iE]) + 0.05 * (v[iNW] + v[iNE] + v[iSW] + v[iSE]);

        const uvv = uVal * vVal * vVal;

        uNext[i] = uVal + du * lapU - uvv + f * (1 - uVal);
        vNext[i] = vVal + dv * lapV + uvv - (k + f) * vVal;

        if (uNext[i] < 0) uNext[i] = 0;
        else if (uNext[i] > 1) uNext[i] = 1;
        if (vNext[i] < 0) vNext[i] = 0;
        else if (vNext[i] > 1) vNext[i] = 1;
      }
    }

    for (let x = 0; x < W; x++) {
      const top = x, bot = (H - 1) * W + x;
      uNext[top] = u[top]; vNext[top] = v[top];
      uNext[bot] = u[bot]; vNext[bot] = v[bot];
    }
    for (let y = 0; y < H; y++) {
      const left = y * W, right = y * W + W - 1;
      uNext[left] = u[left]; vNext[left] = v[left];
      uNext[right] = u[right]; vNext[right] = v[right];
    }

    const tmpU = u, tmpV = v;
    u = uNext; v = vNext;
    uNext = tmpU; vNext = tmpV;

    generation++;
  }

  function rsRender() {
    const data = imageData.data;
    for (let i = 0; i < W * H; i++) {
      const val = v[i];
      const hue = (hueOffset + val * 280) % 360;
      const lum = Math.max(0, Math.min(100, val * 120));
      const rgb = hslToRgb(hue, saturation / 100, lum / 100);

      const j = i * 4;
      data[j] = rgb[0];
      data[j + 1] = rgb[1];
      data[j + 2] = rgb[2];
      data[j + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function hslToRgb(h, s, l) {
    h = h / 360;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  // R-D mouse interaction
  let isDrawing = false;
  function getCanvasPos(e, canv) {
    const rect = canv.getBoundingClientRect();
    const scaleX = canv.width / rect.width;
    const scaleY = canv.height / rect.height;
    let cx, cy;
    if (e.touches && e.touches[0]) {
      cx = (e.touches[0].clientX - rect.left) * scaleX;
      cy = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      cx = (e.clientX - rect.left) * scaleX;
      cy = (e.clientY - rect.top) * scaleY;
    }
    return [Math.floor(cx), Math.floor(cy)];
  }
  function handleDraw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const [x, y] = getCanvasPos(e, canvas);
    seedAt(x, y, brushSize);
  }
  canvas.addEventListener('mousedown', (e) => { isDrawing = true; handleDraw(e); });
  canvas.addEventListener('mousemove', handleDraw);
  canvas.addEventListener('mouseup', () => isDrawing = false);
  canvas.addEventListener('mouseleave', () => isDrawing = false);
  canvas.addEventListener('touchstart', (e) => { isDrawing = true; handleDraw(e); }, { passive: false });
  canvas.addEventListener('touchmove', handleDraw, { passive: false });
  canvas.addEventListener('touchend', () => isDrawing = false);

  // R-D controls
  function bindSlider(sliderId, valId, setter) {
    const slider = document.getElementById(sliderId);
    const val = document.getElementById(valId);
    slider.addEventListener('input', () => {
      const num = parseFloat(slider.value);
      setter(num);
      val.textContent = num;
    });
  }
  bindSlider('slider-f', 'f-val', (n) => feed = n);
  bindSlider('slider-k', 'k-val', (n) => kill = n);
  bindSlider('slider-du', 'du-val', (n) => dU = n);
  bindSlider('slider-dv', 'dv-val', (n) => dV = n);
  bindSlider('slider-speed', 'speed-val', (n) => speed = n);
  bindSlider('slider-brush', 'brush-val', (n) => brushSize = n);
  bindSlider('slider-hue', 'hue-val', (n) => hueOffset = n);
  bindSlider('slider-sat', 'sat-val', (n) => saturation = n);

  document.getElementById('btn-reset').addEventListener('click', rsInit);
  document.getElementById('btn-pause').addEventListener('click', (e) => {
    expPaused[0] = !expPaused[0];
    e.target.textContent = expPaused[0] ? 'Resume' : 'Pause';
    document.getElementById('status-text').textContent = expPaused.every(p => p) ? 'paused' : 'experiment running';
  });
  document.getElementById('btn-randomize').addEventListener('click', () => {
    const presets = [
      [0.0545, 0.062], [0.029, 0.057], [0.03, 0.06],
      [0.039, 0.058], [0.014, 0.045], [0.04, 0.06],
      [0.046, 0.0594], [0.022, 0.051], [0.034, 0.062]
    ];
    const p = presets[Math.floor(Math.random() * presets.length)];
    feed = p[0]; kill = p[1];
    hueOffset = Math.floor(Math.random() * 360);
    document.getElementById('slider-f').value = feed;
    document.getElementById('slider-k').value = kill;
    document.getElementById('f-val').textContent = feed.toFixed(4);
    document.getElementById('k-val').textContent = kill.toFixed(4);
    document.getElementById('slider-hue').value = hueOffset;
    document.getElementById('hue-val').textContent = hueOffset;
    document.querySelectorAll('#presets .preset-btn').forEach(b => b.classList.remove('active'));
    rsInit();
  });
  document.querySelectorAll('#presets .preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#presets .preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      feed = parseFloat(btn.dataset.f);
      kill = parseFloat(btn.dataset.k);
      document.getElementById('slider-f').value = feed;
      document.getElementById('slider-k').value = kill;
      document.getElementById('f-val').textContent = feed.toFixed(4);
      document.getElementById('k-val').textContent = kill.toFixed(4);
    });
  });

  // Initialize (moved from bootstrap)
  rsInit();
  rsRender();
