// ============================================================
  //  EXPERIMENT 05 — Mandelbrot & Julia Set Explorer
  // ============================================================
  const W5 = 600, H5 = 400;
  const canvas5 = document.getElementById('canvas5');
  const ctx5 = canvas5.getContext('2d');
  const mbImageData = ctx5.createImageData(W5, H5);

  let mbCenterX = -0.5;
  let mbCenterY = 0.0;
  let mbZoom = 1.0;
  let mbMaxIter = 256;
  let mbJuliaMode = false;
  let mbJuliaCX = -0.4;
  let mbJuliaCY = 0.6;
  let mbPalette = 0;
  let mbColorShift = 0;
  let mbPaused = false;

  // Progressive rendering state
  let mbRenderRow = 0;
  let mbRenderPass = 0;
  let mbRendering = false;
  let mbRowStep = 8; // start coarse

  // Color palettes — each returns [r, g, b] for iteration count t (0..1)
  const mbPalettes = [
    // 0: Fire — black→red→orange→yellow→white
    function(t) {
      const r = Math.min(255, t * 4 * 255);
      const g = Math.max(0, Math.min(255, (t - 0.25) * 4 * 255));
      const b = Math.max(0, Math.min(255, (t - 0.5) * 4 * 255));
      return [r | 0, g | 0, b | 0];
    },
    // 1: Ocean — deep blue→cyan→white
    function(t) {
      const r = Math.max(0, Math.min(255, (t - 0.6) * 3 * 255));
      const g = Math.max(0, Math.min(255, t * 2 * 255));
      const b = Math.min(255, (0.2 + t * 0.8) * 255);
      return [r | 0, g | 0, b | 0];
    },
    // 2: Electric — black→purple→magenta→cyan
    function(t) {
      const r = Math.min(255, Math.sin(t * Math.PI) * 255 + t * 100);
      const g = Math.max(0, Math.min(255, (t - 0.3) * 2 * 255));
      const b = Math.min(255, (0.3 + Math.cos(t * Math.PI) * 0.7) * 255);
      return [r | 0, g | 0, b | 0];
    },
    // 3: Rainbow — smooth hue cycling
    function(t) {
      const hue = (t * 360) % 360;
      const c = hslToRgb(hue, 0.9, t < 0.05 ? 0 : 0.5);
      return c;
    },
    // 4: Grayscale — black→white
    function(t) {
      const v = Math.min(255, t * 255) | 0;
      return [v, v, v];
    },
    // 5: Psychedelic — high-frequency color cycling
    function(t) {
      const r = Math.min(255, (Math.sin(t * 12) * 0.5 + 0.5) * 255) | 0;
      const g = Math.min(255, (Math.sin(t * 12 + 2) * 0.5 + 0.5) * 255) | 0;
      const b = Math.min(255, (Math.sin(t * 12 + 4) * 0.5 + 0.5) * 255) | 0;
      return [r, g, b];
    }
  ];
  const mbPaletteNames = ['Fire', 'Ocean', 'Electric', 'Rainbow', 'Grayscale', 'Psychedelic'];

  // Map complex plane to pixel coordinates
  // The view spans 3.5 / zoom units wide, centered at (mbCenterX, mbCenterY)
  function mbPixelToComplex(px, py) {
    const aspect = H5 / W5;
    const scale = 3.5 / mbZoom;
    const cx = mbCenterX + (px - W5 / 2) / W5 * scale;
    const cy = mbCenterY + (py - H5 / 2) / H5 * scale;
    return [cx, cy];
  }

  // Core iteration: returns escape count (or -1 if in set)
  function mbIterate(zx0, zy0, cx, cy) {
    let zx = zx0, zy = zy0;
    let i = 0;
    const maxIter = mbMaxIter;
    while (i < maxIter) {
      const zx2 = zx * zx;
      const zy2 = zy * zy;
      if (zx2 + zy2 > 4) {
        // Smooth coloring: fractional iteration
        const log_zn = Math.log(zx2 + zy2) / 2;
        const nu = Math.log(log_zn / Math.log(2)) / Math.log(2);
        return i + 1 - nu;
      }
      zy = 2 * zx * zy + cy;
      zx = zx2 - zy2 + cx;
      i++;
    }
    return -1; // in set
  }

  function mbColorForIter(iter) {
    if (iter < 0) return [0, 0, 0]; // in the set — black
    // Normalize to 0..1 with log scaling for better color distribution
    const t = Math.log(1 + iter) / Math.log(1 + mbMaxIter);
    const shifted = (t + mbColorShift / 360) % 1;
    const palette = mbPalettes[mbPalette];
    return palette(shifted < 0 ? shifted + 1 : shifted);
  }

  // Progressive renderer: renders a band of rows each frame
  function mbRenderFrame() {
    const data = mbImageData.data;
    const step = mbRowStep;

    // Render rows for this pass
    let renderedAny = false;
    const rowsThisFrame = Math.min(step, H5 - mbRenderRow);

    for (let r = 0; r < rowsThisFrame; r++) {
      const py = mbRenderRow + r;
      if (py >= H5) break;
      renderedAny = true;

      for (let px = 0; px < W5; px++) {
        let iter;
        if (mbJuliaMode) {
          const [zx0, zy0] = mbPixelToComplex(px, py);
          iter = mbIterate(zx0, zy0, mbJuliaCX, mbJuliaCY);
        } else {
          const [cx, cy] = mbPixelToComplex(px, py);
          iter = mbIterate(0, 0, cx, cy);
        }

        const [cr, cg, cb] = mbColorForIter(iter);
        const j = (py * W5 + px) * 4;
        data[j] = cr;
        data[j + 1] = cg;
        data[j + 2] = cb;
        data[j + 3] = 255;
      }
    }

    if (renderedAny) {
      mbRenderRow += rowsThisFrame;
    }

    // Put partial image to show progress
    ctx5.putImageData(mbImageData, 0, 0);

    // Check if pass is complete
    if (mbRenderRow >= H5) {
      // Next pass with finer resolution
      mbRenderPass++;
      if (mbRowStep > 1) {
        mbRowStep = Math.max(1, Math.floor(mbRowStep / 2));
        mbRenderRow = 0;
        // Restart with finer pass — need to re-render from top
        // But we already have a full coarse image, so now refine
      } else {
        // Fully rendered at full resolution
        mbRendering = false;
      }
    }
  }

  // Start a fresh render from scratch
  function mbStartRender() {
    mbRenderRow = 0;
    mbRenderPass = 0;
    mbRowStep = 8;
    mbRendering = true;
    // Clear to black
    const data = mbImageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0; data[i+1] = 0; data[i+2] = 0; data[i+3] = 255;
    }
    ctx5.putImageData(mbImageData, 0, 0);
  }

  function mbReset() {
    mbCenterX = -0.5;
    mbCenterY = 0.0;
    mbZoom = 1.0;
    mbJuliaMode = false;
    mbMaxIter = 256;
    mbPalette = 0;
    mbColorShift = 0;
    mbUpdateSliders();
    mbUpdateModeLabel();
    mbStartRender();
  }

  function mbUpdateSliders() {
    document.getElementById('slider-mb-iter').value = mbMaxIter;
    document.getElementById('mb-iter-val').textContent = mbMaxIter;
    document.getElementById('slider-mb-palette').value = mbPalette;
    document.getElementById('mb-palette-val').textContent = mbPaletteNames[mbPalette];
    document.getElementById('slider-mb-shift').value = mbColorShift;
    document.getElementById('mb-shift-val').textContent = mbColorShift;
    document.getElementById('slider-mb-zoom').value = mbZoom;
    document.getElementById('mb-zoom-val').textContent = mbZoom.toFixed(2);
    document.getElementById('mb-zoom').textContent = mbZoom.toFixed(1);
    document.getElementById('slider-mb-cx').value = mbCenterX;
    document.getElementById('mb-cx-val').textContent = mbCenterX.toFixed(3);
    document.getElementById('slider-mb-cy').value = mbCenterY;
    document.getElementById('mb-cy-val').textContent = mbCenterY.toFixed(3);
  }

  function mbUpdateModeLabel() {
    const label = document.getElementById('mb-mode-label');
    label.textContent = mbJuliaMode ? 'Julia' : 'Mandelbrot';
    document.getElementById('mb-julia-toggle').textContent = mbJuliaMode ? 'Mandelbrot Mode' : 'Julia Mode';
  }

  // Mouse interaction: click to zoom, right-click to zoom out, drag to pan
  let mbDragging = false;
  let mbDragStartX = 0, mbDragStartY = 0;
  let mbDragCenterX = 0, mbDragCenterY = 0;
  let mbHasDragged = false;

  function getCanvas5Pos(e) {
    const rect = canvas5.getBoundingClientRect();
    let cx, cy;
    if (e.touches && e.touches[0]) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }
    return [
      (cx - rect.left) * (W5 / rect.width),
      (cy - rect.top) * (H5 / rect.height)
    ];
  }

  canvas5.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (e.button === 2) return; // right-click handled separately
    mbDragging = true;
    mbHasDragged = false;
    const [px, py] = getCanvas5Pos(e);
    mbDragStartX = px;
    mbDragStartY = py;
    mbDragCenterX = mbCenterX;
    mbDragCenterY = mbCenterY;
  });

  canvas5.addEventListener('mousemove', (e) => {
    if (!mbDragging) return;
    const [px, py] = getCanvas5Pos(e);
    const dx = px - mbDragStartX;
    const dy = py - mbDragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) mbHasDragged = true;

    const scale = 3.5 / mbZoom;
    mbCenterX = mbDragCenterX - dx / W5 * scale;
    mbCenterY = mbDragCenterY - dy / W5 * scale;
    mbUpdateSliders();
    mbStartRender();
  });

  canvas5.addEventListener('mouseup', (e) => {
    if (!mbDragging) return;
    mbDragging = false;
    if (!mbHasDragged) {
      // Click — zoom in 2x at that point
      const [px, py] = getCanvas5Pos(e);
      const [cx, cy] = mbPixelToComplex(px, py);
      if (mbJuliaMode) {
        // In Julia mode, clicking sets the Julia parameter c
        mbJuliaCX = cx;
        mbJuliaCY = cy;
      } else {
        mbCenterX = cx;
        mbCenterY = cy;
        mbZoom *= 2;
      }
      mbUpdateSliders();
      mbStartRender();
    }
  });

  canvas5.addEventListener('mouseleave', () => { mbDragging = false; });

  canvas5.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    // Right-click — zoom out 2x
    mbZoom = Math.max(0.5, mbZoom / 2);
    mbUpdateSliders();
    mbStartRender();
  });

  // Touch support
  let mbTouchLastDist = 0;
  canvas5.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      mbDragging = true;
      mbHasDragged = false;
      const [px, py] = getCanvas5Pos(e);
      mbDragStartX = px;
      mbDragStartY = py;
      mbDragCenterX = mbCenterX;
      mbDragCenterY = mbCenterY;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      mbTouchLastDist = Math.sqrt(dx*dx + dy*dy);
    }
  }, { passive: false });

  canvas5.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && mbDragging) {
      const [px, py] = getCanvas5Pos(e);
      const dx = px - mbDragStartX;
      const dy = py - mbDragStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) mbHasDragged = true;
      const scale = 3.5 / mbZoom;
      mbCenterX = mbDragCenterX - dx / W5 * scale;
      mbCenterY = mbDragCenterY - dy / W5 * scale;
      mbUpdateSliders();
      mbStartRender();
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (mbTouchLastDist > 0) {
        const ratio = dist / mbTouchLastDist;
        mbZoom *= ratio;
        mbZoom = Math.max(0.5, Math.min(100000, mbZoom));
        mbUpdateSliders();
        mbStartRender();
      }
      mbTouchLastDist = dist;
    }
  }, { passive: false });

  canvas5.addEventListener('touchend', (e) => {
    if (mbDragging && !mbHasDragged && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const rect = canvas5.getBoundingClientRect();
      const px = (touch.clientX - rect.left) * (W5 / rect.width);
      const py = (touch.clientY - rect.top) * (H5 / rect.height);
      const [cx, cy] = mbPixelToComplex(px, py);
      if (mbJuliaMode) {
        mbJuliaCX = cx;
        mbJuliaCY = cy;
      } else {
        mbCenterX = cx;
        mbCenterY = cy;
        mbZoom *= 2;
      }
      mbUpdateSliders();
      mbStartRender();
    }
    mbDragging = false;
    mbTouchLastDist = 0;
  });

  // Control bindings
  bindSlider('slider-mb-iter', 'mb-iter-val', (n) => {
    mbMaxIter = n;
    mbStartRender();
  });
  bindSlider('slider-mb-palette', 'mb-palette-val', (n) => {
    mbPalette = n;
    document.getElementById('mb-palette-val').textContent = mbPaletteNames[n];
    mbStartRender();
  });
  bindSlider('slider-mb-shift', 'mb-shift-val', (n) => {
    mbColorShift = n;
    mbStartRender();
  });
  bindSlider('slider-mb-zoom', 'mb-zoom-val', (n) => {
    mbZoom = n;
    document.getElementById('mb-zoom').textContent = mbZoom.toFixed(1);
    mbStartRender();
  });
  bindSlider('slider-mb-cx', 'mb-cx-val', (n) => {
    mbCenterX = n;
    mbStartRender();
  });
  bindSlider('slider-mb-cy', 'mb-cy-val', (n) => {
    mbCenterY = n;
    mbStartRender();
  });

  document.getElementById('mb-reset').addEventListener('click', mbReset);
  document.getElementById('mb-pause').addEventListener('click', (e) => {
    expPaused[4] = !expPaused[4];
    e.target.textContent = expPaused[4] ? 'Resume' : 'Pause';
    document.getElementById('status-text').textContent = expPaused.every(p => p) ? 'paused' : 'experiment running';
  });
  document.getElementById('mb-julia-toggle').addEventListener('click', () => {
    mbJuliaMode = !mbJuliaMode;
    if (mbJuliaMode) {
      // Initialize Julia parameters from current center
      mbJuliaCX = mbCenterX;
      mbJuliaCY = mbCenterY;
      mbZoom = 1.0;
    }
    mbUpdateModeLabel();
    mbUpdateSliders();
    mbStartRender();
  });
  document.getElementById('mb-screenshot').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = (mbJuliaMode ? 'julia' : 'mandelbrot') + '-agent07.png';
    link.href = canvas5.toDataURL('image/png');
    link.click();
  });

  document.querySelectorAll('#mb-presets .preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#mb-presets .preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mbCenterX = parseFloat(btn.dataset.cx);
      mbCenterY = parseFloat(btn.dataset.cy);
      mbZoom = parseFloat(btn.dataset.zoom);
      mbJuliaMode = btn.dataset.julia === '1';
      if (mbJuliaMode && btn.dataset.jcx) {
        mbJuliaCX = parseFloat(btn.dataset.jcx);
        mbJuliaCY = parseFloat(btn.dataset.jcy);
      }
      mbUpdateModeLabel();
      mbUpdateSliders();
      mbStartRender();
    });
  });

  // Initialize
  mbStartRender();
