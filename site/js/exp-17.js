// ============================================================
  //  EXPERIMENT 17 — Newton's Fractal
  //  Newton's method on complex polynomials, colored by root
  //  convergence and iteration count (smooth coloring).
  // ============================================================
  const nfCanvas = document.getElementById('canvas17');
  const nfCtx = nfCanvas.getContext('2d');
  const nfW = 600, nfH = 400;
  const nfImageData = nfCtx.createImageData(nfW, nfH);
  const nfBuf = nfImageData.data;

  let nfDegree = 3;
  let nfMaxIter = 60;
  let nfZoom = 1.0;
  let nfCenterX = 0;
  let nfCenterY = 0;
  let nfHueOffset = 0;
  let nfHueSpread = 270;
  let nfBrightness = 0.85;
  let nfContrast = 1.5;
  let nfPalette = 'spectrum';
  let nfPreset = 'classic';
  let nfRendering = false;
  let nfRenderRow = 0;
  let nfRenderRowData = null;

  // Roots of the polynomial: for z^n - 1, roots are n-th roots of unity.
  // For custom mode, we perturb them.
  let nfRoots = []; // array of {re, im}
  let nfUseCustom = false;
  let nfCustomRoots = [];

  function nfComputeRoots() {
    if (nfUseCustom && nfCustomRoots.length === nfDegree) {
      nfRoots = nfCustomRoots.slice();
    } else {
      nfRoots = [];
      for (let i = 0; i < nfDegree; i++) {
        const angle = (2 * Math.PI * i) / nfDegree;
        nfRoots.push({ re: Math.cos(angle), im: Math.sin(angle) });
      }
    }
  }

  // Evaluate polynomial f(z) = product(z - root_i) and f'(z)
  // We use the factored form: f(z) = prod(z - r_i), f'(z) = sum_i prod_{j≠i}(z - r_j)
  // For Newton iteration: z_new = z - f(z)/f'(z)
  function nfNewtonStep(zr, zi) {
    // Evaluate f(z) = prod(z - r_i) in factored form
    // Also compute f'(z) = sum_i prod_{j≠i}(z - r_j)
    // More efficient: use the logarithmic derivative:
    // f'(z)/f(z) = sum_i 1/(z - r_i)
    // So z_new = z - 1 / (sum_i 1/(z - r_i))
    // This is numerically stable and O(n) per step.

    let sumR = 0, sumI = 0;
    for (let i = 0; i < nfRoots.length; i++) {
      // 1/(z - r_i)
      const dr = zr - nfRoots[i].re;
      const di = zi - nfRoots[i].im;
      const denom = dr * dr + di * di;
      if (denom < 1e-30) return null; // at a root
      const invR = dr / denom;
      const invI = -di / denom;
      sumR += invR;
      sumI += invI;
    }
    // z_new = z - 1/sum
    const sdenom = sumR * sumR + sumI * sumI;
    if (sdenom < 1e-30) return null;
    const recipR = sumR / sdenom;
    const recipI = -sumI / sdenom;
    return { re: zr - recipR, im: zi - recipI };
  }

  // Find which root a point converges to and how many iterations
  function nfIterate(zr, zi) {
    for (let it = 0; it < nfMaxIter; it++) {
      const result = nfNewtonStep(zr, zi);
      if (result === null) return { root: -1, iters: it, zr: zr, zi: zi };
      zr = result.re;
      zi = result.im;
      // Check convergence to each root
      for (let r = 0; r < nfRoots.length; r++) {
        const dr = zr - nfRoots[r].re;
        const di = zi - nfRoots[r].im;
        if (dr * dr + di * di < 1e-6) {
          // Smooth iteration count for continuous coloring
          // t = it + 1 - log(log(|z - root|)) / log(2)
          // But |z-root| is ~sqrt(1e-6)=1e-3, so log(log(...)) is problematic.
          // Use a simpler smoothing: fractional part based on distance
          const dist = Math.sqrt(dr * dr + di * di);
          const smooth = it + 1 - Math.log(Math.max(dist, 1e-10)) / Math.LN2;
          return { root: r, iters: it, smooth: smooth, zr: zr, zi: zi };
        }
      }
    }
    return { root: -1, iters: nfMaxIter, smooth: nfMaxIter, zr: zr, zi: zi };
  }

  // Color palettes
  const nfPalettes = {
    spectrum: function(root, t, hueOff, spread, bright, contrast) {
      if (root < 0) return [10, 10, 15];
      const hue = (hueOff + (root / nfDegree) * spread) % 360;
      const tnorm = Math.min(1, Math.max(0, 1 - t / nfMaxIter));
      const val = Math.pow(tnorm, contrast) * bright;
      return hslToRgb(hue, 0.75, val * 0.85 + 0.15);
    },
    fire: function(root, t, hueOff, spread, bright, contrast) {
      if (root < 0) return [5, 5, 10];
      const tnorm = Math.min(1, Math.max(0, 1 - t / nfMaxIter));
      const v = Math.pow(tnorm, contrast) * bright;
      const hue = (10 + v * 50) % 360;
      return hslToRgb(hue, 0.9, v * 0.6 + 0.05);
    },
    ocean: function(root, t, hueOff, spread, bright, contrast) {
      if (root < 0) return [5, 10, 20];
      const tnorm = Math.min(1, Math.max(0, 1 - t / nfMaxIter));
      const v = Math.pow(tnorm, contrast) * bright;
      const hue = (180 + v * 60) % 360;
      return hslToRgb(hue, 0.7, v * 0.6 + 0.1);
    },
    electric: function(root, t, hueOff, spread, bright, contrast) {
      if (root < 0) return [5, 5, 10];
      const tnorm = Math.min(1, Math.max(0, 1 - t / nfMaxIter));
      const v = Math.pow(tnorm, contrast) * bright;
      const hue = (260 + v * 100) % 360;
      return hslToRgb(hue, 0.85, v * 0.5 + 0.1);
    },
    grayscale: function(root, t, hueOff, spread, bright, contrast) {
      if (root < 0) return [0, 0, 0];
      const tnorm = Math.min(1, Math.max(0, 1 - t / nfMaxIter));
      const v = Math.pow(tnorm, contrast) * bright;
      const g = Math.floor(v * 255);
      return [g, g, g];
    }
  };

  // Progressive rendering — render in chunks across frames
  function nfRenderChunk() {
    if (!nfRendering) return;
    const chunkRows = 8; // rows per frame
    const rowsThisFrame = Math.min(chunkRows, nfH - nfRenderRow);

    for (let py = nfRenderRow; py < nfRenderRow + rowsThisFrame; py++) {
      for (let px = 0; px < nfW; px++) {
        // Map pixel to complex plane
        const scale = 3.0 / (nfZoom * nfW);
        const zr = nfCenterX + (px - nfW / 2) * scale;
        const zi = nfCenterY + (py - nfH / 2) * scale;

        const result = nfIterate(zr, zi);
        const palette = nfPalettes[nfPalette] || nfPalettes.spectrum;
        const [r2, g2, b2] = palette(
          result.root, result.smooth || result.iters,
          nfHueOffset, nfHueSpread, nfBrightness, nfContrast
        );

        const idx = (py * nfW + px) * 4;
        nfBuf[idx] = r2;
        nfBuf[idx + 1] = g2;
        nfBuf[idx + 2] = b2;
        nfBuf[idx + 3] = 255;
      }
    }

    nfRenderRow += rowsThisFrame;

    // Partial update
    nfCtx.putImageData(nfImageData, 0, 0);

    if (nfRenderRow >= nfH) {
      nfRendering = false;
      nfRenderRow = 0;
      document.getElementById('nf-stat').textContent = 'ready';
    } else {
      document.getElementById('nf-stat').textContent = Math.round(nfRenderRow / nfH * 100) + '%';
    }
  }

  function nfFullRender() {
    nfRendering = true;
    nfRenderRow = 0;
    document.getElementById('nf-stat').textContent = 'rendering…';
  }

  function nfResetView() {
    nfZoom = 1;
    nfCenterX = 0;
    nfCenterY = 0;
    document.getElementById('slider-nf-zoom').value = 1;
    document.getElementById('nf-zoom-val').textContent = '1.0×';
    document.getElementById('slider-nf-cx').value = 0;
    document.getElementById('nf-cx-val').textContent = '0.00';
    document.getElementById('slider-nf-cy').value = 0;
    document.getElementById('nf-cy-val').textContent = '0.00';
    nfFullRender();
  }

  function nfRandomizeRoots() {
    nfCustomRoots = [];
    for (let i = 0; i < nfDegree; i++) {
      const angle = (2 * Math.PI * i) / nfDegree + (Math.random() - 0.5) * 1.5;
      const radius = 0.7 + Math.random() * 0.6;
      nfCustomRoots.push({ re: Math.cos(angle) * radius, im: Math.sin(angle) * radius });
    }
    nfUseCustom = true;
    nfComputeRoots();
    nfFullRender();
  }

  // Presets
  const nfPresetData = {
    classic: { degree: 3, custom: false },
    quadratic: { degree: 2, custom: false },
    quartic: { degree: 4, custom: false },
    quintic: { degree: 5, custom: false },
    sextic: { degree: 6, custom: false },
    custom: { degree: 4, custom: true }
  };

  function nfApplyPreset(name) {
    const p = nfPresetData[name];
    if (!p) return;
    nfDegree = p.degree;
    nfUseCustom = p.custom;
    if (p.custom) {
      nfRandomizeRoots();
    } else {
      nfCustomRoots = [];
      nfComputeRoots();
    }
    document.getElementById('slider-nf-degree').value = p.degree;
    document.getElementById('nf-degree-val').textContent = p.degree;
    nfResetView();
  }

  // Canvas click to recenter
  nfCanvas.addEventListener('click', function(e) {
    const rect = nfCanvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const scale = 3.0 / (nfZoom * nfW);
    nfCenterX += (px - 0.5) * scale * nfW;
    nfCenterY += (py - 0.5) * scale * nfH;
    // Clamp
    nfCenterX = Math.max(-2, Math.min(2, nfCenterX));
    nfCenterY = Math.max(-2, Math.min(2, nfCenterY));
    document.getElementById('slider-nf-cx').value = nfCenterX;
    document.getElementById('nf-cx-val').textContent = nfCenterX.toFixed(2);
    document.getElementById('slider-nf-cy').value = nfCenterY;
    document.getElementById('nf-cy-val').textContent = nfCenterY.toFixed(2);
    nfFullRender();
  });

  // Slider listeners
  document.getElementById('slider-nf-degree').addEventListener('input', function(e) {
    nfDegree = parseInt(e.target.value);
    document.getElementById('nf-degree-val').textContent = nfDegree;
    if (nfUseCustom) nfRandomizeRoots(); else nfComputeRoots();
    nfFullRender();
  });

  document.getElementById('slider-nf-iter').addEventListener('input', function(e) {
    nfMaxIter = parseInt(e.target.value);
    document.getElementById('nf-iter-val').textContent = nfMaxIter;
    nfFullRender();
  });

  document.getElementById('slider-nf-zoom').addEventListener('input', function(e) {
    nfZoom = parseFloat(e.target.value);
    document.getElementById('nf-zoom-val').textContent = nfZoom.toFixed(1) + '×';
    nfFullRender();
  });

  document.getElementById('slider-nf-cx').addEventListener('input', function(e) {
    nfCenterX = parseFloat(e.target.value);
    document.getElementById('nf-cx-val').textContent = nfCenterX.toFixed(2);
    nfFullRender();
  });

  document.getElementById('slider-nf-cy').addEventListener('input', function(e) {
    nfCenterY = parseFloat(e.target.value);
    document.getElementById('nf-cy-val').textContent = nfCenterY.toFixed(2);
    nfFullRender();
  });

  document.getElementById('slider-nf-hue').addEventListener('input', function(e) {
    nfHueOffset = parseInt(e.target.value);
    document.getElementById('nf-hue-val').textContent = nfHueOffset;
    nfFullRender();
  });

  document.getElementById('slider-nf-spread').addEventListener('input', function(e) {
    nfHueSpread = parseInt(e.target.value);
    document.getElementById('nf-spread-val').textContent = nfHueSpread;
    nfFullRender();
  });

  document.getElementById('slider-nf-bright').addEventListener('input', function(e) {
    nfBrightness = parseFloat(e.target.value);
    document.getElementById('nf-bright-val').textContent = nfBrightness.toFixed(2);
    nfFullRender();
  });

  document.getElementById('slider-nf-contrast').addEventListener('input', function(e) {
    nfContrast = parseFloat(e.target.value);
    document.getElementById('nf-contrast-val').textContent = nfContrast.toFixed(1);
    nfFullRender();
  });

  document.getElementById('nf-palette').addEventListener('change', function(e) {
    nfPalette = e.target.value;
    nfFullRender();
  });

  // Buttons
  document.getElementById('nf-reset').addEventListener('click', nfResetView);
  document.getElementById('nf-randomize').addEventListener('click', nfRandomizeRoots);
  document.getElementById('nf-save').addEventListener('click', function() {
    const a = document.createElement('a');
    a.download = 'newton-fractal.png';
    a.href = nfCanvas.toDataURL();
    a.click();
  });

  // Preset buttons
  document.querySelectorAll('#nf-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#nf-presets .preset-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      nfPreset = btn.dataset.preset;
      nfApplyPreset(nfPreset);
    });
  });

  // Touch support — tap to recenter
  nfCanvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = nfCanvas.getBoundingClientRect();
      const px = (touch.clientX - rect.left) / rect.width;
      const py = (touch.clientY - rect.top) / rect.height;
      const scale = 3.0 / (nfZoom * nfW);
      nfCenterX += (px - 0.5) * scale * nfW;
      nfCenterY += (py - 0.5) * scale * nfH;
      nfCenterX = Math.max(-2, Math.min(2, nfCenterX));
      nfCenterY = Math.max(-2, Math.min(2, nfCenterY));
      document.getElementById('slider-nf-cx').value = nfCenterX;
      document.getElementById('nf-cx-val').textContent = nfCenterX.toFixed(2);
      document.getElementById('slider-nf-cy').value = nfCenterY;
      document.getElementById('nf-cy-val').textContent = nfCenterY.toFixed(2);
      nfFullRender();
    }
  }, { passive: false });

  // Initialize
  nfComputeRoots();
  nfFullRender();
