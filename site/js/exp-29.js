// ============================================================
  //  Experiment 29 — Traveling Salesman Problem (Simulated Annealing)
  // ============================================================
  const tspCanvas = document.getElementById('canvas29');
  const tspCtx = tspCanvas.getContext('2d');
  let tspCities = [];        // [{x, y}]
  let tspTour = [];          // indices into cities, in tour order
  let tspBestTour = [];     // best tour found
  let tspBestDist = Infinity;
  let tspCurrentDist = 0;
  let tspTemperature = 0;
  let tspTemp0 = 10;
  let tspCoolRate = 0.9995;
  let tspMovesPerFrame = 200;
  let tspSolving = false;
  let tspHue = 200;
  let tspCitySize = 4;
  let tspLineWidth = 1.5;
  let tspShowBest = true;
  let tspPresetName = 'Circle';
  let tspAcceptCount = 0;
  let tspIterCount = 0;

  function tspDist(a, b) {
    const dx = tspCities[a].x - tspCities[b].x;
    const dy = tspCities[a].y - tspCities[b].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function tspTourLength(tour) {
    let d = 0;
    for (let i = 0; i < tour.length; i++) {
      d += tspDist(tour[i], tour[(i + 1) % tour.length]);
    }
    return d;
  }

  // 2-opt segment reversal: reverse tour[i..j]
  function tspTwoOpt(i, j) {
    if (i < j) {
      while (i < j) {
        const tmp = tspTour[i];
        tspTour[i] = tspTour[j];
        tspTour[j] = tmp;
        i++; j--;
      }
    } else {
      // wrap-around case: reverse the complementary segment
      let a = j + 1, b = i;
      while (a < b) {
        const tmp = tspTour[a];
        tspTour[a] = tspTour[b];
        tspTour[b] = tmp;
        a++; b--;
      }
    }
  }

  // Compute the delta (change in distance) of a 2-opt move that reverses
  // the segment from index i+1 to j (inclusive). We use the four endpoints
  // of the two edges that get removed and reconnected.
  function tspTwoOptDelta(i, j) {
    const n = tspTour.length;
    const a = tspTour[i];
    const b = tspTour[(i + 1) % n];
    const c = tspTour[j];
    const d = tspTour[(j + 1) % n];
    // removed edges: (a,b) and (c,d); added edges: (a,c) and (b,d)
    return (tspDist(a, c) + tspDist(b, d)) - (tspDist(a, b) + tspDist(c, d));
  }

  function tspAnnealStep() {
    const n = tspTour.length;
    if (n < 4) return;
    const moves = tspMovesPerFrame;
    for (let m = 0; m < moves; m++) {
      // pick two distinct indices i < j, leaving at least 2 elements between
      let i = Math.floor(Math.random() * n);
      let j = Math.floor(Math.random() * n);
      if (i === j) continue;
      if (i > j) { const t = i; i = j; j = t; }
      if (j - i < 2) continue;
      // delta for reversing segment i+1..j
      const delta = tspTwoOptDelta(i, j);
      if (delta < 0 || tspTemperature > 0.001 && Math.random() < Math.exp(-delta / tspTemperature)) {
        // accept: reverse segment i+1..j
        let a = i + 1, b = j;
        while (a < b) {
          const tmp = tspTour[a];
          tspTour[a] = tspTour[b];
          tspTour[b] = tmp;
          a++; b--;
        }
        tspCurrentDist += delta;
        tspAcceptCount++;
        if (tspCurrentDist < tspBestDist - 0.0001) {
          tspBestDist = tspCurrentDist;
          tspBestTour = tspTour.slice();
        }
      }
      tspTemperature *= tspCoolRate;
      tspIterCount++;
    }
    tspRender();
    tspUpdateStatus();
  }

  function tspUpdateStatus() {
    const sEl = document.getElementById('tsp-status');
    if (tspSolving) {
      sEl.textContent = 'TSP \u00b7 ' + (tspTemperature < 0.01 ? 'Frozen' : 'Annealing');
    } else if (tspCities.length > 0) {
      sEl.textContent = 'TSP \u00b7 ' + tspPresetName;
    } else {
      sEl.textContent = 'TSP \u00b7 Ready';
    }
    document.getElementById('tsp-tour-val').textContent = tspCities.length >= 2 ? tspCurrentDist.toFixed(1) : '\u2014';
    document.getElementById('tsp-best-val').textContent = tspCities.length >= 2 && tspBestDist < Infinity ? tspBestDist.toFixed(1) : '\u2014';
    document.getElementById('tsp-temp-val').textContent = tspSolving ? tspTemperature.toFixed(3) : '\u2014';
  }

  function tspRender() {
    const w = tspCanvas.width, h = tspCanvas.height;
    // background
    tspCtx.fillStyle = '#0a0a0b';
    tspCtx.fillRect(0, 0, w, h);

    if (tspCities.length < 2) {
      // draw cities only
      for (let i = 0; i < tspCities.length; i++) {
        tspCtx.fillStyle = 'hsl(' + tspHue + ', 70%, 60%)';
        tspCtx.beginPath();
        tspCtx.arc(tspCities[i].x, tspCities[i].y, tspCitySize, 0, Math.PI * 2);
        tspCtx.fill();
      }
      return;
    }

    // best tour ghost overlay
    if (tspShowBest && tspBestTour.length === tspTour.length) {
      tspCtx.strokeStyle = 'hsla(' + ((tspHue + 120) % 360) + ', 50%, 50%, 0.35)';
      tspCtx.lineWidth = Math.max(1, tspLineWidth * 0.8);
      tspCtx.setLineDash([4, 4]);
      tspCtx.beginPath();
      for (let i = 0; i <= tspBestTour.length; i++) {
        const idx = tspBestTour[i % tspBestTour.length];
        const p = tspCities[idx];
        if (i === 0) tspCtx.moveTo(p.x, p.y);
        else tspCtx.lineTo(p.x, p.y);
      }
      tspCtx.stroke();
      tspCtx.setLineDash([]);
    }

    // current tour
    tspCtx.strokeStyle = 'hsl(' + tspHue + ', 80%, 60%)';
    tspCtx.lineWidth = tspLineWidth;
    tspCtx.beginPath();
    for (let i = 0; i <= tspTour.length; i++) {
      const idx = tspTour[i % tspTour.length];
      const p = tspCities[idx];
      if (i === 0) tspCtx.moveTo(p.x, p.y);
      else tspCtx.lineTo(p.x, p.y);
    }
    tspCtx.stroke();

    // cities
    for (let i = 0; i < tspCities.length; i++) {
      tspCtx.fillStyle = 'hsl(' + ((tspHue + 60) % 360) + ', 90%, 70%)';
      tspCtx.beginPath();
      tspCtx.arc(tspCities[i].x, tspCities[i].y, tspCitySize, 0, Math.PI * 2);
      tspCtx.fill();
      // glow
      tspCtx.fillStyle = 'hsla(' + ((tspHue + 60) % 360) + ', 90%, 70%, 0.2)';
      tspCtx.beginPath();
      tspCtx.arc(tspCities[i].x, tspCities[i].y, tspCitySize * 2, 0, Math.PI * 2);
      tspCtx.fill();
    }
  }

  function tspGeneratePreset(name) {
    tspPresetName = name.charAt(0).toUpperCase() + name.slice(1);
    tspCities = [];
    const w = tspCanvas.width, h = tspCanvas.height;
    const cx = w / 2, cy = h / 2;
    if (name === 'circle') {
      const r = Math.min(w, h) * 0.35;
      for (let a = 0; a < 24; a++) {
        const ang = (a / 24) * Math.PI * 2;
        tspCities.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r });
      }
    } else if (name === 'grid') {
      const cols = 8, rows = 5;
      const sx = w / (cols + 1), sy = h / (rows + 1);
      for (let r = 1; r <= rows; r++)
        for (let c = 1; c <= cols; c++)
          tspCities.push({ x: c * sx, y: r * sy });
    } else if (name === 'cluster') {
      const clusters = 4;
      for (let c = 0; c < clusters; c++) {
        const ccx = 60 + Math.random() * (w - 120);
        const ccy = 60 + Math.random() * (h - 120);
        for (let i = 0; i < 10; i++)
          tspCities.push({ x: ccx + (Math.random() - 0.5) * 70, y: ccy + (Math.random() - 0.5) * 70 });
      }
    } else if (name === 'random') {
      for (let i = 0; i < 40; i++)
        tspCities.push({ x: 30 + Math.random() * (w - 60), y: 30 + Math.random() * (h - 60) });
    } else if (name === 'border') {
      const margin = 40, n = 24;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        if (t < 0.25) tspCities.push({ x: margin + t * 4 * (w - 2 * margin), y: margin });
        else if (t < 0.5) tspCities.push({ x: w - margin, y: margin + (t - 0.25) * 4 * (h - 2 * margin) });
        else if (t < 0.75) tspCities.push({ x: w - margin - (t - 0.5) * 4 * (w - 2 * margin), y: h - margin });
        else tspCities.push({ x: margin, y: h - margin - (t - 0.75) * 4 * (h - 2 * margin) });
      }
    } else if (name === 'star') {
      const points = 10, outerR = Math.min(w, h) * 0.38, innerR = outerR * 0.4;
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const ang = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        tspCities.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r });
      }
    }
    tspResetTour();
  }

  function tspResetTour() {
    const n = tspCities.length;
    tspTour = [];
    for (let i = 0; i < n; i++) tspTour.push(i);
    // shuffle for random start
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = tspTour[i]; tspTour[i] = tspTour[j]; tspTour[j] = tmp;
    }
    tspBestTour = tspTour.slice();
    tspCurrentDist = tspTourLength(tspTour);
    tspBestDist = tspCurrentDist;
    tspTemperature = tspTemp0;
    tspSolving = false;
    tspAcceptCount = 0;
    tspIterCount = 0;
    document.getElementById('tsp-pause').textContent = 'Pause';
    tspRender();
    tspUpdateStatus();
  }

  function tspInit() {
    tspGeneratePreset('circle');

    // Canvas click: add a city
    tspCanvas.addEventListener('click', function(e) {
      const rect = tspCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (tspCanvas.width / rect.width);
      const y = (e.clientY - rect.top) * (tspCanvas.height / rect.height);
      tspCities.push({ x: x, y: y });
      tspPresetName = 'Custom';
      tspResetTour();
    });

    // Solve button
    document.getElementById('tsp-solve').addEventListener('click', function() {
      if (tspCities.length < 4) return;
      if (!tspSolving) {
        tspSolving = true;
        tspTemperature = tspTemp0;
        if (expPaused[28]) {
          expPaused[28] = false;
          document.getElementById('tsp-pause').textContent = 'Pause';
        }
      } else {
        // reheat
        tspTemperature = tspTemp0;
      }
      tspUpdateStatus();
    });

    // Pause
    document.getElementById('tsp-pause').addEventListener('click', function() {
      if (!tspSolving) return;
      expPaused[28] = !expPaused[28];
      this.textContent = expPaused[28] ? 'Resume' : 'Pause';
    });

    // Reset
    document.getElementById('tsp-reset').addEventListener('click', function() {
      tspResetTour();
    });

    // Randomize cities
    document.getElementById('tsp-randomize').addEventListener('click', function() {
      tspGeneratePreset('random');
    });

    // Clear
    document.getElementById('tsp-clear').addEventListener('click', function() {
      tspCities = [];
      tspTour = [];
      tspBestTour = [];
      tspBestDist = Infinity;
      tspCurrentDist = 0;
      tspSolving = false;
      tspPresetName = 'Empty';
      tspRender();
      tspUpdateStatus();
    });

    // Save PNG
    document.getElementById('tsp-save').addEventListener('click', function() {
      const link = document.createElement('a');
      link.download = 'tsp-' + tspPresetName.toLowerCase().replace(/\s+/g, '-') + '.png';
      link.href = tspCanvas.toDataURL();
      link.click();
    });

    // Presets
    document.querySelectorAll('#tsp-presets .preset-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#tsp-presets .preset-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        tspGeneratePreset(this.dataset.preset);
      });
    });

    // Sliders
    document.getElementById('slider-tsp-temp0').addEventListener('input', function() {
      tspTemp0 = parseFloat(this.value);
      document.getElementById('tsp-temp0-val').textContent = tspTemp0.toFixed(1);
    });
    document.getElementById('slider-tsp-cool').addEventListener('input', function() {
      tspCoolRate = parseFloat(this.value);
      document.getElementById('tsp-cool-val').textContent = tspCoolRate.toFixed(5);
    });
    document.getElementById('slider-tsp-moves').addEventListener('input', function() {
      tspMovesPerFrame = parseInt(this.value);
      document.getElementById('tsp-moves-val').textContent = tspMovesPerFrame;
    });
    document.getElementById('slider-tsp-csize').addEventListener('input', function() {
      tspCitySize = parseInt(this.value);
      document.getElementById('tsp-csize-val').textContent = tspCitySize;
      tspRender();
    });
    document.getElementById('slider-tsp-lw').addEventListener('input', function() {
      tspLineWidth = parseFloat(this.value);
      document.getElementById('tsp-lw-val').textContent = tspLineWidth.toFixed(1);
      tspRender();
    });
    document.getElementById('slider-tsp-hue').addEventListener('input', function() {
      tspHue = parseInt(this.value);
      document.getElementById('tsp-hue-val').textContent = tspHue;
      tspRender();
    });
    document.getElementById('tsp-showbest').addEventListener('change', function() {
      tspShowBest = this.value === '1';
      tspRender();
    });
  }

  tspInit();
