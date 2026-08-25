// ============================================================
  //  EXPERIMENT 19 — Fourier Series
  //  Visualizes the partial sums of Fourier series for standard
  //  waveforms (square, sawtooth, triangle, etc.), showing
  //  convergence and the Gibbs phenomenon.
  // ============================================================
  const fsCanvas = document.getElementById('canvas19');
  const fsCtx = fsCanvas.getContext('2d');
  const fsW = 600, fsH = 400;

  // Parameters
  let fsMaxTerms = 50;
  let fsSpeed = 0;        // animation speed (0 = static)
  let fsPhase = 0;
  let fsHue = 200;
  let fsShowComp = 1;
  let fsPreset = 'square';
  let fsPaused = false;
  let fsAnimTerms = 0;   // animated term count (when speed > 0)

  // Waveform definitions: each returns f(x) for x in [-PI, PI]
  // and the Fourier coefficients [a_n, b_n] for n=1,2,...
  // We define both the target function and its coefficients.
  const fsWaveforms = {
    square: {
      fn: function(x) {
        // Period 2π: +1 for 0 < x < π, -1 for -π < x < 0
        const xx = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        return xx < Math.PI ? 1 : -1;
      },
      a0: 0,
      // b_n = 4/(nπ) for odd n, 0 for even; a_n = 0
      coeff: function(n) {
        if (n % 2 === 1) return [0, 4 / (n * Math.PI)];
        return [0, 0];
      }
    },
    sawtooth: {
      fn: function(x) {
        const xx = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        return 1 - 2 * (xx / (2 * Math.PI));
      },
      a0: 0,
      // b_n = 2*(-1)^(n+1) / (nπ); a_n = 0
      coeff: function(n) {
        return [0, 2 * Math.pow(-1, n + 1) / (n * Math.PI)];
      }
    },
    triangle: {
      fn: function(x) {
        const xx = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        // Triangle wave: 0→1 at 0→π/2, 1→-1 at π/2→3π/2, -1→0 at 3π/2→2π
        if (xx < Math.PI / 2) return 2 * xx / Math.PI - 0;
        if (xx < 3 * Math.PI / 2) return 1 - 2 * (xx - Math.PI / 2) / Math.PI;
        return -1 + 2 * (xx - 3 * Math.PI / 2) / Math.PI;
      },
      a0: 0,
      // Triangle wave: only odd cosines, a_n = 8*(-1)^((n-1)/2) / (π²n²) for odd n, 0 for even
      coeff: function(n) {
        if (n % 2 === 1) {
          const sign = Math.pow(-1, (n - 1) / 2);
          return [8 * sign / (Math.PI * Math.PI * n * n), 0];
        }
        return [0, 0];
      }
    },
    pulse: {
      fn: function(x) {
        const xx = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        // Pulse: +1 for 0 < x < π/3, else 0
        return (xx > 0 && xx < Math.PI / 3) ? 1 : 0;
      },
      a0: 1 / 6,
      coeff: function(n) {
        // a_n = (2/(nπ)) sin(nπ/6), b_n = (2/(nπ))(1 - cos(nπ/6))
        const an = (2 / (n * Math.PI)) * Math.sin(n * Math.PI / 6);
        const bn = (2 / (n * Math.PI)) * (1 - Math.cos(n * Math.PI / 6));
        return [an, bn];
      }
    },
    ramp: {
      fn: function(x) {
        const xx = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        return xx / Math.PI - 1;
      },
      a0: 0,
      coeff: function(n) {
        // a_n = 0, b_n = 2*(-1)^(n+1) / (nπ)
        return [0, 2 * Math.pow(-1, n + 1) / (n * Math.PI)];
      }
    },
    parabola: {
      fn: function(x) {
        const xx = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        // Parabola: (x - π)² / π² - 1/3 (centered)
        const t = xx - Math.PI;
        return t * t / (Math.PI * Math.PI) - 1 / 3;
      },
      a0: 0,
      // a_n = 4/(π²) * cos(nπ)/n² = 4*(-1)^n/(π²n²); b_n = 0
      coeff: function(n) {
        return [4 * Math.pow(-1, n) / (Math.PI * Math.PI * n * n), 0];
      }
    },
    stair: {
      fn: function(x) {
        const xx = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        // 4-step staircase
        if (xx < Math.PI / 4) return 0;
        if (xx < Math.PI / 2) return 0.5;
        if (xx < 3 * Math.PI / 4) return 1.0;
        if (xx < Math.PI) return 0.5;
        if (xx < 5 * Math.PI / 4) return 0;
        if (xx < 3 * Math.PI / 2) return -0.5;
        if (xx < 7 * Math.PI / 4) return -1.0;
        return -0.5;
      },
      a0: 0,
      // We'll compute coefficients numerically
      _numerical: true
    }
  };

  // Compute Fourier coefficients numerically (for waveforms without closed forms)
  function fsNumericCoeff(waveformFn, n, N) {
    // Numerical integration: a_n = (1/π) ∫ f(x) cos(nx) dx, b_n = (1/π) ∫ f(x) sin(nx) dx
    // Integrate over [0, 2π] using trapezoidal rule with N samples
    let an = 0, bn = 0;
    const dx = 2 * Math.PI / N;
    for (let i = 0; i < N; i++) {
      const x = i * dx;
      const f = waveformFn(x);
      an += f * Math.cos(n * x) * dx;
      bn += f * Math.sin(n * x) * dx;
    }
    an /= Math.PI;
    bn /= Math.PI;
    return [an, bn];
  }

  // Precompute coefficients for the current waveform
  let fsCoeffs = []; // [{a, b}, ...] for n=1,2,...
  let fsA0 = 0;

  function fsComputeCoeffs() {
    const wf = fsWaveforms[fsPreset];
    fsCoeffs = [];
    fsA0 = wf.a0 || 0;
    if (wf._numerical) {
      for (let n = 1; n <= fsMaxTerms; n++) {
        const c = fsNumericCoeff(wf.fn, n, 1000);
        fsCoeffs.push({ a: c[0], b: c[1] });
      }
    } else {
      for (let n = 1; n <= fsMaxTerms; n++) {
        const c = wf.coeff(n);
        fsCoeffs.push({ a: c[0], b: c[1] });
      }
    }
  }

  // Compute partial sum S_n(x) for n terms
  function fsPartialSum(x, nTerms) {
    let sum = fsA0 / 2;
    for (let k = 0; k < nTerms && k < fsCoeffs.length; k++) {
      const c = fsCoeffs[k];
      const n = k + 1;
      sum += c.a * Math.cos(n * (x + fsPhase)) + c.b * Math.sin(n * (x + fsPhase));
    }
    return sum;
  }

  // Compute individual harmonic k(x)
  function fsHarmonic(x, k) {
    if (k >= fsCoeffs.length) return 0;
    const c = fsCoeffs[k];
    const n = k + 1;
    return c.a * Math.cos(n * (x + fsPhase)) + c.b * Math.sin(n * (x + fsPhase));
  }

  function fsRender() {
    // Clear
    fsCtx.fillStyle = '#0a0a0b';
    fsCtx.fillRect(0, 0, fsW, fsH);

    // Grid lines
    fsCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    fsCtx.lineWidth = 1;
    // X-axis (y=0)
    const cy = fsH / 2;
    fsCtx.beginPath();
    fsCtx.moveTo(0, cy);
    fsCtx.lineTo(fsW, cy);
    fsCtx.stroke();
    // Vertical center line
    fsCtx.beginPath();
    fsCtx.moveTo(fsW / 2, 0);
    fsCtx.lineTo(fsW / 2, fsH);
    fsCtx.stroke();
    // Grid
    for (let i = 1; i < 8; i++) {
      const x = (i / 8) * fsW;
      fsCtx.beginPath();
      fsCtx.moveTo(x, 0);
      fsCtx.lineTo(x, fsH);
      fsCtx.stroke();
    }
    for (let i = 1; i < 6; i++) {
      const y = (i / 6) * fsH;
      fsCtx.beginPath();
      fsCtx.moveTo(0, y);
      fsCtx.lineTo(fsW, y);
      fsCtx.stroke();
    }

    // Scale: x from -π to π (width 600), y from -1.5 to 1.5 (height 400)
    const xScale = fsW / (2 * Math.PI);
    const yScale = fsH / 3.0; // amplitude range -1.5 to 1.5
    const wf = fsWaveforms[fsPreset];

    // Determine current number of terms
    const nTerms = fsSpeed > 0 ? Math.max(1, Math.floor(fsAnimTerms)) : fsMaxTerms;
    document.getElementById('fs-terms-stat').textContent = nTerms;
    document.getElementById('fs-max-stat').textContent = fsMaxTerms;

    // Draw target function (white, dashed)
    fsCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    fsCtx.lineWidth = 1.5;
    fsCtx.setLineDash([4, 4]);
    fsCtx.beginPath();
    for (let px = 0; px <= fsW; px += 1) {
      const x = (px - fsW / 2) / xScale;
      const y = wf.fn(x);
      const py = cy - y * yScale;
      if (px === 0) fsCtx.moveTo(px, py);
      else fsCtx.lineTo(px, py);
    }
    fsCtx.stroke();
    fsCtx.setLineDash([]);

    // Draw individual harmonics (thin, dimmed)
    if (fsShowComp && nTerms <= 30) {
      for (let k = 0; k < nTerms && k < fsCoeffs.length; k++) {
        const hue = (fsHue + k * (360 / Math.max(1, nTerms))) % 360;
        fsCtx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.15)`;
        fsCtx.lineWidth = 1;
        fsCtx.beginPath();
        for (let px = 0; px <= fsW; px += 2) {
          const x = (px - fsW / 2) / xScale;
          const y = fsHarmonic(x, k);
          const py = cy - y * yScale;
          if (px === 0) fsCtx.moveTo(px, py);
          else fsCtx.lineTo(px, py);
        }
        fsCtx.stroke();
      }
    }

    // Draw partial sum (bright color)
    fsCtx.strokeStyle = `hsl(${fsHue}, 80%, 65%)`;
    fsCtx.lineWidth = 2.5;
    fsCtx.shadowBlur = 8;
    fsCtx.shadowColor = `hsla(${fsHue}, 80%, 60%, 0.5)`;
    fsCtx.beginPath();
    for (let px = 0; px <= fsW; px += 1) {
      const x = (px - fsW / 2) / xScale;
      const y = fsPartialSum(x, nTerms);
      const py = cy - y * yScale;
      if (px === 0) fsCtx.moveTo(px, py);
      else fsCtx.lineTo(px, py);
    }
    fsCtx.stroke();
    fsCtx.shadowBlur = 0;

    // Labels
    fsCtx.fillStyle = 'rgba(200, 200, 210, 0.4)';
    fsCtx.font = '10px monospace';
    fsCtx.fillText('−π', 5, cy + 12);
    fsCtx.fillText('π', fsW - 12, cy + 12);
    fsCtx.fillText('0', fsW / 2 + 3, 12);
    fsCtx.fillText('+1', fsW / 2 - 20, cy - yScale + 12);
    fsCtx.fillText('−1', fsW / 2 - 22, cy + yScale - 2);
  }

  function fsStep() {
    if (fsSpeed > 0 && !fsPaused) {
      fsAnimTerms += fsSpeed / 1000;
      if (fsAnimTerms > fsMaxTerms) {
        fsAnimTerms = 1;
      }
    }
  }

  function fsApplyPreset(preset) {
    fsPreset = preset;
    fsComputeCoeffs();
    fsAnimTerms = 1;
    fsRender();
  }

  function fsReset() {
    fsAnimTerms = 1;
    fsRender();
  }

  function fsRandomize() {
    const presets = Object.keys(fsWaveforms);
    fsPreset = presets[Math.floor(Math.random() * presets.length)];
    fsComputeCoeffs();
    fsHue = Math.floor(Math.random() * 360);
    document.getElementById('slider-fs-hue').value = fsHue;
    document.getElementById('fs-hue-val').textContent = fsHue;
    fsAnimTerms = 1;
    // Update preset buttons
    document.querySelectorAll('#fs-presets .preset-btn').forEach(function(b) {
      b.classList.remove('active');
      if (b.dataset.preset === fsPreset) b.classList.add('active');
    });
    fsRender();
  }

  // Slider listeners
  document.getElementById('slider-fs-terms').addEventListener('input', function(e) {
    fsMaxTerms = parseInt(e.target.value);
    document.getElementById('fs-terms-val').textContent = fsMaxTerms;
    fsComputeCoeffs();
    if (fsAnimTerms > fsMaxTerms) fsAnimTerms = 1;
    fsRender();
  });

  document.getElementById('slider-fs-speed').addEventListener('input', function(e) {
    fsSpeed = parseFloat(e.target.value);
    document.getElementById('fs-speed-val').textContent = fsSpeed;
  });

  document.getElementById('slider-fs-phase').addEventListener('input', function(e) {
    fsPhase = parseFloat(e.target.value);
    document.getElementById('fs-phase-val').textContent = fsPhase.toFixed(2);
    fsRender();
  });

  document.getElementById('slider-fs-hue').addEventListener('input', function(e) {
    fsHue = parseInt(e.target.value);
    document.getElementById('fs-hue-val').textContent = fsHue;
    fsRender();
  });

  document.getElementById('slider-fs-comp').addEventListener('input', function(e) {
    fsShowComp = parseInt(e.target.value);
    document.getElementById('fs-comp-val').textContent = fsShowComp ? 'ON' : 'OFF';
    fsRender();
  });

  // Buttons
  document.getElementById('fs-reset').addEventListener('click', fsReset);
  document.getElementById('fs-pause').addEventListener('click', function() {
    fsPaused = !fsPaused;
    document.getElementById('fs-pause').textContent = fsPaused ? 'Resume' : 'Pause';
  });
  document.getElementById('fs-randomize').addEventListener('click', fsRandomize);

  // Preset buttons
  document.querySelectorAll('#fs-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#fs-presets .preset-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      fsApplyPreset(btn.dataset.preset);
    });
  });

  // Initialize
  fsApplyPreset('square');
