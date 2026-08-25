// ============================================================
  //  EXPERIMENT 03 — L-System Fractal Trees
  // ============================================================
  const W3 = 600, H3 = 400;
  const canvas3 = document.getElementById('canvas3');
  const ctx3 = canvas3.getContext('2d');

  let lsDepth = 5;
  let lsAngle = 22.5;
  let lsLen = 6;
  let lsShrink = 0.70;
  let lsHue = 120;
  let lsSpeed = 8;
  let lsCurrentRules = 'fractal';

  // L-system definitions: axiom + production rules
  const lsSystems = {
    fractal: {
      axiom: 'F',
      rules: { 'F': 'FF+[+F-F-F]-[-F+F+F]' }
    },
    bush: {
      axiom: 'F',
      rules: { 'F': 'F[+F]F[-F][F]' }
    },
    seaweed: {
      axiom: 'F',
      rules: { 'F': 'FF-[-F+F+F]+[+F-F-F]' }
    },
    dragon: {
      axiom: 'FX',
      rules: { 'X': 'X+YF+', 'Y': '-FX-Y' }
    },
    sierpinski: {
      axiom: 'F-G-G',
      rules: { 'F': 'F-G+F+G-F', 'G': 'GG' }
    },
    alga: {
      axiom: 'A',
      rules: { 'A': 'F[+A][-A]FA', 'F': 'FF' }
    }
  };

  // Expand the L-system string
  function lsExpand(axiom, rules, iterations) {
    let str = axiom;
    for (let i = 0; i < iterations; i++) {
      let next = '';
      for (let c = 0; c < str.length; c++) {
        const ch = str[c];
        next += rules[ch] || ch;
      }
      str = next;
      // Safety: prevent runaway string explosion
      if (str.length > 500000) break;
    }
    return str;
  }

  // Pre-compute segments from the L-system string
  let lsSegments = [];
  let lsDrawIndex = 0;
  let lsStartX = W3 / 2;
  let lsStartY = H3 - 10;

  function lsGenerate() {
    const system = lsSystems[lsCurrentRules];
    const str = lsExpand(system.axiom, system.rules, lsDepth);
    const segments = [];

    let x = lsStartX;
    let y = lsStartY;
    let angle = -Math.PI / 2; // pointing up
    const angleStep = lsAngle * Math.PI / 180;
    let len = lsLen;
    const stack = [];

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      switch (ch) {
        case 'F':
        case 'G':
          const nx = x + Math.cos(angle) * len;
          const ny = y + Math.sin(angle) * len;
          // Compute depth from stack size
          segments.push({ x1: x, y1: y, x2: nx, y2: ny, depth: stack.length });
          x = nx;
          y = ny;
          break;
        case 'f':
          x += Math.cos(angle) * len;
          y += Math.sin(angle) * len;
          break;
        case '+':
          angle += angleStep;
          break;
        case '-':
          angle -= angleStep;
          break;
        case '[':
          stack.push({ x, y, angle, len });
          len *= lsShrink;
          break;
        case ']':
          const state = stack.pop();
          if (state) {
            x = state.x;
            y = state.y;
            angle = state.angle;
            len = state.len;
          }
          break;
      }
    }

    return segments;
  }

  function lsReset() {
    lsStartX = W3 / 2;
    lsStartY = H3 - 10;
    lsSegments = lsGenerate();
    lsDrawIndex = 0;
    ctx3.fillStyle = '#000';
    ctx3.fillRect(0, 0, W3, H3);
    document.getElementById('ls-iteration').textContent = 'depth ' + lsDepth + ' · ' + lsSegments.length + ' segments';
  }

  function lsRedraw() {
    lsDrawIndex = 0;
    ctx3.fillStyle = '#000';
    ctx3.fillRect(0, 0, W3, H3);
  }

  function lsStep() {
    if (lsDrawIndex >= lsSegments.length) return;

    const maxSegs = Math.min(lsSpeed, lsSegments.length - lsDrawIndex);
    ctx3.lineCap = 'round';
    ctx3.lineJoin = 'round';

    for (let s = 0; s < maxSegs; s++) {
      const seg = lsSegments[lsDrawIndex];
      // Color by depth: deeper branches shift hue
      const hueShift = (seg.depth * 15) % 360;
      const hue = (lsHue + hueShift) % 360;
      // Thicker at base (low depth), thinner at tips
      const lineWidth = Math.max(0.5, 4 - seg.depth * 0.6);

      ctx3.strokeStyle = `hsla(${hue}, 75%, ${55 - seg.depth * 3}%, 0.85)`;
      ctx3.lineWidth = lineWidth;
      ctx3.beginPath();
      ctx3.moveTo(seg.x1, seg.y1);
      ctx3.lineTo(seg.x2, seg.y2);
      ctx3.stroke();

      lsDrawIndex++;
    }
  }

  function lsIsComplete() {
    return lsDrawIndex >= lsSegments.length;
  }

  // Click on canvas to grow a new tree from that point
  function getCanvas3Pos(e) {
    const rect = canvas3.getBoundingClientRect();
    let cx, cy;
    if (e.touches && e.touches[0]) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }
    return [
      (cx - rect.left) * (W3 / rect.width),
      (cy - rect.top) * (H3 / rect.height)
    ];
  }

  canvas3.addEventListener('click', (e) => {
    const [x, y] = getCanvas3Pos(e);
    lsStartX = x;
    lsStartY = y;
    lsSegments = lsGenerate();
    lsDrawIndex = 0;
    ctx3.fillStyle = '#000';
    ctx3.fillRect(0, 0, W3, H3);
    document.getElementById('ls-iteration').textContent = 'depth ' + lsDepth + ' · ' + lsSegments.length + ' segments';
  });

  canvas3.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const [x, y] = getCanvas3Pos(e);
    lsStartX = x;
    lsStartY = y;
    lsSegments = lsGenerate();
    lsDrawIndex = 0;
    ctx3.fillStyle = '#000';
    ctx3.fillRect(0, 0, W3, H3);
    document.getElementById('ls-iteration').textContent = 'depth ' + lsDepth + ' · ' + lsSegments.length + ' segments';
  }, { passive: false });

  // L-system controls
  bindSlider('slider-ls-depth', 'ls-depth-val', (n) => {
    lsDepth = n;
    lsReset();
  });
  bindSlider('slider-ls-angle', 'ls-angle-val', (n) => {
    lsAngle = n;
    lsReset();
  });
  bindSlider('slider-ls-len', 'ls-len-val', (n) => {
    lsLen = n;
    lsReset();
  });
  bindSlider('slider-ls-shrink', 'ls-shrink-val', (n) => {
    lsShrink = n;
    lsReset();
  });
  bindSlider('slider-ls-hue', 'ls-hue-val', (n) => {
    lsHue = n;
    lsRedraw();
  });
  bindSlider('slider-ls-speed', 'ls-speed-val', (n) => {
    lsSpeed = n;
  });

  document.getElementById('ls-reset').addEventListener('click', lsReset);
  document.getElementById('ls-redraw').addEventListener('click', lsRedraw);
  document.getElementById('ls-pause').addEventListener('click', (e) => {
    expPaused[2] = !expPaused[2];
    e.target.textContent = expPaused[2] ? 'Resume' : 'Pause';
    document.getElementById('status-text').textContent = expPaused.every(p => p) ? 'paused' : 'experiment running';
  });
  document.getElementById('ls-randomize').addEventListener('click', () => {
    lsAngle = 10 + Math.random() * 60;
    lsHue = Math.floor(Math.random() * 360);
    lsShrink = 0.5 + Math.random() * 0.4;
    document.getElementById('slider-ls-angle').value = lsAngle;
    document.getElementById('ls-angle-val').textContent = lsAngle.toFixed(1);
    document.getElementById('slider-ls-hue').value = lsHue;
    document.getElementById('ls-hue-val').textContent = lsHue;
    document.getElementById('slider-ls-shrink').value = lsShrink;
    document.getElementById('ls-shrink-val').textContent = lsShrink.toFixed(2);
    document.querySelectorAll('#ls-presets .preset-btn').forEach(b => b.classList.remove('active'));
    lsReset();
  });

  document.querySelectorAll('#ls-presets .preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ls-presets .preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      lsCurrentRules = btn.dataset.rules;
      lsAngle = parseFloat(btn.dataset.angle);
      lsDepth = parseInt(btn.dataset.depth);
      lsLen = parseInt(btn.dataset.len);
      document.getElementById('slider-ls-angle').value = lsAngle;
      document.getElementById('ls-angle-val').textContent = lsAngle.toFixed(1);
      document.getElementById('slider-ls-depth').value = lsDepth;
      document.getElementById('ls-depth-val').textContent = lsDepth;
      document.getElementById('slider-ls-len').value = lsLen;
      document.getElementById('ls-len-val').textContent = lsLen;
      lsReset();
    });
  });

  // Initialize (moved from bootstrap)
  lsReset();
