// ============================================================
  //  EXPERIMENT 11 — Perlin Noise Terrain
  // ============================================================
  const ptCanvas = document.getElementById('canvas11');
  const ptCtx = ptCanvas.getContext('2d');
  const ptW = 600, ptH = 400;
  const ptImageData = ptCtx.createImageData(ptW, ptH);
  let ptHeightmap = new Float32Array(ptW * ptH);
  let ptModification = new Float32Array(ptW * ptH); // user sculpting deltas
  let ptPaused = false;
  let ptSeed = Math.floor(Math.random() * 100000);
  let ptOctaves = 6;
  let ptScale = 0.008;
  let ptPersistence = 0.5;
  let ptLacunarity = 2.0;
  let ptSeaLevel = 0.40;
  let ptContrast = 1.0;
  let ptPreset = 'islands';
  let ptSculpting = false;
  let ptSculptMode = 1; // 1 = raise, -1 = lower
  let ptNeedsRegen = true;
  let ptPermutation = new Uint8Array(512);

  // Seeded PRNG (mulberry32)
  function ptMulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Build permutation table from seed
  function ptBuildPermutation(seed) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    const rng = ptMulberry32(seed);
    // Fisher-Yates shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    for (let i = 0; i < 256; i++) {
      ptPermutation[i] = p[i];
      ptPermutation[i + 256] = p[i];
    }
  }

  // Perlin noise 2D
  function ptFade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function ptLerp(a, b, t) { return a + t * (b - a); }
  function ptGrad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  }

  function ptNoise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = ptFade(x);
    const v = ptFade(y);
    const A = ptPermutation[X] + Y;
    const B = ptPermutation[X + 1] + Y;
    return ptLerp(
      ptLerp(ptGrad(ptPermutation[A], x, y), ptGrad(ptPermutation[B], x - 1, y), u),
      ptLerp(ptGrad(ptPermutation[A + 1], x, y - 1), ptGrad(ptPermutation[B + 1], x - 1, y - 1), u),
      v
    ) * 0.5 + 0.5; // normalize to 0-1
  }

  // Fractal Brownian Motion
  function ptFBM(x, y) {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    for (let i = 0; i < ptOctaves; i++) {
      total += ptNoise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= ptPersistence;
      frequency *= ptLacunarity;
    }
    return total / maxValue;
  }

  // Color mapping: elevation (0-1) -> [r, g, b]
  function ptElevationColor(e) {
    // Apply contrast
    e = Math.max(0, Math.min(1, (e - 0.5) * ptContrast + 0.5));
    const sea = ptSeaLevel;

    if (e < sea * 0.3) {
      // Deep water
      const t = e / (sea * 0.3);
      return [10 + t * 10, 20 + t * 30, 60 + t * 40];
    } else if (e < sea * 0.6) {
      // Mid water
      const t = (e - sea * 0.3) / (sea * 0.3);
      return [20 + t * 20, 50 + t * 50, 100 + t * 50];
    } else if (e < sea) {
      // Shallow water
      const t = (e - sea * 0.6) / (sea * 0.4);
      return [40 + t * 30, 100 + t * 50, 150 + t * 30];
    } else if (e < sea + 0.03) {
      // Beach/sand
      const t = (e - sea) / 0.03;
      return [200 - t * 30, 180 - t * 20, 120 - t * 40];
    } else if (e < sea + 0.12) {
      // Grassland
      const t = (e - sea - 0.03) / 0.09;
      return [60 + t * 20, 120 - t * 20, 50 + t * 10];
    } else if (e < sea + 0.22) {
      // Forest
      const t = (e - sea - 0.12) / 0.10;
      return [40 + t * 10, 100 - t * 30, 40 + t * 10];
    } else if (e < sea + 0.35) {
      // Mountain rock
      const t = (e - sea - 0.22) / 0.13;
      return [80 + t * 60, 70 + t * 50, 60 + t * 40];
    } else if (e < sea + 0.50) {
      // High mountain
      const t = (e - sea - 0.35) / 0.15;
      return [140 + t * 60, 120 + t * 70, 100 + t * 60];
    } else {
      // Snow
      const t = Math.min(1, (e - sea - 0.50) / 0.20);
      return [220 + t * 35, 220 + t * 35, 230 + t * 25];
    }
  }

  function ptGenerate() {
    ptBuildPermutation(ptSeed);
    let waterCount = 0;
    for (let y = 0; y < ptH; y++) {
      for (let x = 0; x < ptW; x++) {
        const idx = y * ptW + x;
        let e = ptFBM(x * ptScale, y * ptScale);
        // Apply user modifications
        e += ptModification[idx];
        e = Math.max(0, Math.min(1, e));
        ptHeightmap[idx] = e;
        if (e < ptSeaLevel) waterCount++;

        const [r, g, b] = ptElevationColor(e);
        const pi = idx * 4;
        ptImageData.data[pi] = r;
        ptImageData.data[pi + 1] = g;
        ptImageData.data[pi + 2] = b;
        ptImageData.data[pi + 3] = 255;
      }
    }
    ptCtx.putImageData(ptImageData, 0, 0);
    const waterPct = Math.round(waterCount / (ptW * ptH) * 100);
    document.getElementById('pt-water-stat').textContent = waterPct + '%';
    document.getElementById('pt-land-stat').textContent = (100 - waterPct) + '%';
  }

  function ptRegenerate(newSeed) {
    if (newSeed !== undefined) ptSeed = newSeed;
    else ptSeed = Math.floor(Math.random() * 100000);
    ptModification.fill(0);
    document.getElementById('pt-seed-val').textContent = ptSeed;
    document.getElementById('pt-seed-stat').textContent = ptSeed;
    ptGenerate();
  }

  // Sculpt terrain at mouse position
  function ptSculpt(mx, my, mode) {
    const radius = 25;
    const strength = 0.03;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const px = mx + dx;
        const py = my + dy;
        if (px < 0 || px >= ptW || py < 0 || py >= ptH) continue;
        const idx = py * ptW + px;
        const falloff = 1 - dist / radius;
        ptModification[idx] += mode * strength * falloff * falloff;
        ptModification[idx] = Math.max(-1, Math.min(1, ptModification[idx]));

        // Re-render just this pixel
        let e = ptHeightmap[idx] + ptModification[idx];
        // Actually we need to recompute from fBm + modification
        e = ptFBM(px * ptScale, py * ptScale) + ptModification[idx];
        e = Math.max(0, Math.min(1, e));
        ptHeightmap[idx] = e;
        const [r, g, b] = ptElevationColor(e);
        const pi = idx * 4;
        ptImageData.data[pi] = r;
        ptImageData.data[pi + 1] = g;
        ptImageData.data[pi + 2] = b;
        ptImageData.data[pi + 3] = 255;
      }
    }
    ptCtx.putImageData(ptImageData, 0, 0);
  }

  // Mouse interaction
  ptCanvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    ptSculpting = true;
    ptSculptMode = (e.button === 2) ? -1 : 1;
    const rect = ptCanvas.getBoundingClientRect();
    const mx = Math.floor((e.clientX - rect.left) * (ptW / rect.width));
    const my = Math.floor((e.clientY - rect.top) * (ptH / rect.height));
    ptSculpt(mx, my, ptSculptMode);
  });

  ptCanvas.addEventListener('mousemove', (e) => {
    if (!ptSculpting) return;
    const rect = ptCanvas.getBoundingClientRect();
    const mx = Math.floor((e.clientX - rect.left) * (ptW / rect.width));
    const my = Math.floor((e.clientY - rect.top) * (ptH / rect.height));
    ptSculpt(mx, my, ptSculptMode);
  });

  ptCanvas.addEventListener('mouseup', () => { ptSculpting = false; });
  ptCanvas.addEventListener('mouseleave', () => { ptSculpting = false; });
  ptCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Touch support
  ptCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    ptSculpting = true;
    ptSculptMode = 1;
    const rect = ptCanvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = Math.floor((touch.clientX - rect.left) * (ptW / rect.width));
    const my = Math.floor((touch.clientY - rect.top) * (ptH / rect.height));
    ptSculpt(mx, my, ptSculptMode);
  });

  ptCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!ptSculpting) return;
    const rect = ptCanvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = Math.floor((touch.clientX - rect.left) * (ptW / rect.width));
    const my = Math.floor((touch.clientY - rect.top) * (ptH / rect.height));
    ptSculpt(mx, my, ptSculptMode);
  });

  ptCanvas.addEventListener('touchend', () => { ptSculpting = false; });

  // Presets
  const ptPresets = {
    islands: { octaves: 6, scale: 0.010, persistence: 0.50, lacunarity: 2.0, seaLevel: 0.48, contrast: 1.0 },
    mountains: { octaves: 7, scale: 0.006, persistence: 0.55, lacunarity: 2.1, seaLevel: 0.15, contrast: 1.3 },
    plains: { octaves: 4, scale: 0.015, persistence: 0.35, lacunarity: 2.0, seaLevel: 0.20, contrast: 0.8 },
    archipelago: { octaves: 5, scale: 0.012, persistence: 0.60, lacunarity: 2.3, seaLevel: 0.55, contrast: 1.2 },
    canyons: { octaves: 6, scale: 0.008, persistence: 0.65, lacunarity: 2.5, seaLevel: 0.10, contrast: 1.8 },
    continent: { octaves: 8, scale: 0.004, persistence: 0.50, lacunarity: 2.0, seaLevel: 0.42, contrast: 1.1 }
  };

  function ptApplyPreset(name) {
    const p = ptPresets[name];
    if (!p) return;
    ptPreset = name;
    ptOctaves = p.octaves;
    ptScale = p.scale;
    ptPersistence = p.persistence;
    ptLacunarity = p.lacunarity;
    ptSeaLevel = p.seaLevel;
    ptContrast = p.contrast;
    document.getElementById('slider-pt-oct').value = p.octaves;
    document.getElementById('pt-oct-val').textContent = p.octaves;
    document.getElementById('slider-pt-scale').value = p.scale;
    document.getElementById('pt-scale-val').textContent = p.scale.toFixed(3);
    document.getElementById('slider-pt-pers').value = p.persistence;
    document.getElementById('pt-pers-val').textContent = p.persistence.toFixed(2);
    document.getElementById('slider-pt-lac').value = p.lacunarity;
    document.getElementById('pt-lac-val').textContent = p.lacunarity.toFixed(1);
    document.getElementById('slider-pt-sea').value = p.seaLevel;
    document.getElementById('pt-sea-val').textContent = p.seaLevel.toFixed(2);
    document.getElementById('slider-pt-cont').value = p.contrast;
    document.getElementById('pt-cont-val').textContent = p.contrast.toFixed(1);
    document.getElementById('pt-preset-stat').textContent = name;
    ptModification.fill(0);
    ptGenerate();
  }

  // Button handlers
  document.getElementById('pt-pause').addEventListener('click', function() {
    ptPaused = !ptPaused;
    this.textContent = ptPaused ? 'Resume' : 'Pause';
    document.getElementById('pt-status-text').textContent = ptPaused ? 'paused' : 'running';
  });

  document.getElementById('pt-regenerate').addEventListener('click', () => {
    ptRegenerate();
  });

  document.getElementById('pt-randomize').addEventListener('click', () => {
    const presetNames = Object.keys(ptPresets);
    const randomPreset = presetNames[Math.floor(Math.random() * presetNames.length)];
    document.querySelectorAll('#pt-presets .preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('#pt-presets [data-preset="' + randomPreset + '"]').classList.add('active');
    ptApplyPreset(randomPreset);
    ptRegenerate();
  });

  document.querySelectorAll('#pt-presets .preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pt-presets .preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ptApplyPreset(btn.dataset.preset);
    });
  });

  // Slider handlers
  document.getElementById('slider-pt-oct').addEventListener('input', (e) => {
    ptOctaves = parseInt(e.target.value);
    document.getElementById('pt-oct-val').textContent = ptOctaves;
    ptGenerate();
  });

  document.getElementById('slider-pt-scale').addEventListener('input', (e) => {
    ptScale = parseFloat(e.target.value);
    document.getElementById('pt-scale-val').textContent = ptScale.toFixed(3);
    ptGenerate();
  });

  document.getElementById('slider-pt-pers').addEventListener('input', (e) => {
    ptPersistence = parseFloat(e.target.value);
    document.getElementById('pt-pers-val').textContent = ptPersistence.toFixed(2);
    ptGenerate();
  });

  document.getElementById('slider-pt-lac').addEventListener('input', (e) => {
    ptLacunarity = parseFloat(e.target.value);
    document.getElementById('pt-lac-val').textContent = ptLacunarity.toFixed(1);
    ptGenerate();
  });

  document.getElementById('slider-pt-sea').addEventListener('input', (e) => {
    ptSeaLevel = parseFloat(e.target.value);
    document.getElementById('pt-sea-val').textContent = ptSeaLevel.toFixed(2);
    ptGenerate();
  });

  document.getElementById('slider-pt-cont').addEventListener('input', (e) => {
    ptContrast = parseFloat(e.target.value);
    document.getElementById('pt-cont-val').textContent = ptContrast.toFixed(1);
    ptGenerate();
  });

  // Initialize
  ptRegenerate(ptSeed);
