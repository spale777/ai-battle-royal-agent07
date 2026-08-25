// ============================================================
  //  EXPERIMENT 07 — Strange Attractors
  // ============================================================
  const saCanvas = document.getElementById('canvas7');
  const saCtx = saCanvas.getContext('2d');
  const SA_W = saCanvas.width;
  const SA_H = saCanvas.height;

  // Parameters
  let saType = 'clifford';
  let saA = -1.4;
  let saB = 1.6;
  let saC = 1.0;
  let saD = 0.7;
  let saSpeed = 2;
  let saSize = 1.0;
  let saHueRate = 0.5;
  let saScale = 100;

  // State
  let saX = 0.1, saY = 0.1;
  let saHue = 0;
  let saPointCount = 0;

  function saClear() {
    saCtx.fillStyle = '#0a0a0b';
    saCtx.fillRect(0, 0, SA_W, SA_H);
    saPointCount = 0;
    document.getElementById('sa-points-val').textContent = '0';
  }

  function saInit() {
    saClear();
    saX = 0.1;
    saY = 0.1;
    saHue = 0;
  }

  function saIterate(x, y) {
    let nx, ny;
    if (saType === 'clifford') {
      nx = Math.sin(saA * y) + saC * Math.cos(saA * x);
      ny = Math.sin(saB * x) + saD * Math.cos(saB * y);
    } else {
      // De Jong
      nx = Math.sin(saA * y) - Math.cos(saB * x);
      ny = Math.sin(saC * x) - Math.cos(saD * y);
    }
    return [nx, ny];
  }

  function saStep() {
    const pointsPerFrame = 2000;
    const halfW = SA_W / 2;
    const halfH = SA_H / 2;
    const scale = saScale;

    saCtx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < pointsPerFrame; i++) {
      const result = saIterate(saX, saY);
      saX = result[0];
      saY = result[1];

      const px = halfW + saX * scale;
      const py = halfH + saY * scale;

      if (px >= 0 && px < SA_W && py >= 0 && py < SA_H) {
        const h = (saHue + saPointCount * 0.0003) % 360;
        saCtx.fillStyle = 'hsla(' + h + ', 80%, 60%, 0.06)';
        saCtx.fillRect(px, py, saSize, saSize);
      }
      saPointCount++;
    }

    saHue = (saHue + saHueRate * 0.5) % 360;
    document.getElementById('sa-points-val').textContent = saPointCount.toLocaleString();
  }

  // Reset
  document.getElementById('sa-reset').addEventListener('click', () => {
    saInit();
    expPaused[6] = false;
    document.getElementById('sa-pause').textContent = 'Pause';
    document.getElementById('status-text').textContent = 'experiment running';
  });

  // Pause
  document.getElementById('sa-pause').addEventListener('click', () => {
    expPaused[6] = !expPaused[6];
    document.getElementById('sa-pause').textContent = expPaused[6] ? 'Resume' : 'Pause';
    document.getElementById('status-text').textContent = expPaused.every(p => p) ? 'paused' : 'experiment running';
  });

  // Randomize
  document.getElementById('sa-randomize').addEventListener('click', () => {
    const types = ['clifford', 'dejong'];
    saType = types[Math.floor(Math.random() * types.length)];
    saA = (Math.random() - 0.5) * 4;
    saB = (Math.random() - 0.5) * 4;
    saC = (Math.random() - 0.5) * 4;
    saD = (Math.random() - 0.5) * 4;
    document.getElementById('slider-sa-a').value = saA;
    document.getElementById('sa-a-val').textContent = saA.toFixed(2);
    document.getElementById('slider-sa-b').value = saB;
    document.getElementById('sa-b-val').textContent = saB.toFixed(2);
    document.getElementById('slider-sa-c').value = saC;
    document.getElementById('sa-c-val').textContent = saC.toFixed(2);
    document.getElementById('slider-sa-d').value = saD;
    document.getElementById('sa-d-val').textContent = saD.toFixed(2);
    document.querySelectorAll('#sa-presets .preset-btn').forEach(b => b.classList.remove('active'));
    saInit();
  });

  // Clear
  document.getElementById('sa-clear').addEventListener('click', () => {
    saClear();
  });

  // Presets
  document.querySelectorAll('#sa-presets .preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#sa-presets .preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      saType = btn.dataset.type;
      saA = parseFloat(btn.dataset.a);
      saB = parseFloat(btn.dataset.b);
      saC = parseFloat(btn.dataset.c);
      saD = parseFloat(btn.dataset.d);
      document.getElementById('slider-sa-a').value = saA;
      document.getElementById('sa-a-val').textContent = saA.toFixed(2);
      document.getElementById('slider-sa-b').value = saB;
      document.getElementById('sa-b-val').textContent = saB.toFixed(2);
      document.getElementById('slider-sa-c').value = saC;
      document.getElementById('sa-c-val').textContent = saC.toFixed(2);
      document.getElementById('slider-sa-d').value = saD;
      document.getElementById('sa-d-val').textContent = saD.toFixed(2);
      saInit();
    });
  });

  // Sliders
  document.getElementById('slider-sa-a').addEventListener('input', (e) => {
    saA = parseFloat(e.target.value);
    document.getElementById('sa-a-val').textContent = saA.toFixed(2);
  });
  document.getElementById('slider-sa-b').addEventListener('input', (e) => {
    saB = parseFloat(e.target.value);
    document.getElementById('sa-b-val').textContent = saB.toFixed(2);
  });
  document.getElementById('slider-sa-c').addEventListener('input', (e) => {
    saC = parseFloat(e.target.value);
    document.getElementById('sa-c-val').textContent = saC.toFixed(2);
  });
  document.getElementById('slider-sa-d').addEventListener('input', (e) => {
    saD = parseFloat(e.target.value);
    document.getElementById('sa-d-val').textContent = saD.toFixed(2);
  });
  document.getElementById('slider-sa-speed').addEventListener('input', (e) => {
    saSpeed = parseInt(e.target.value);
    document.getElementById('sa-speed-val').textContent = saSpeed;
  });
  document.getElementById('slider-sa-size').addEventListener('input', (e) => {
    saSize = parseFloat(e.target.value);
    document.getElementById('sa-size-val').textContent = saSize.toFixed(1);
  });
  document.getElementById('slider-sa-hue').addEventListener('input', (e) => {
    saHueRate = parseFloat(e.target.value);
    document.getElementById('sa-hue-val').textContent = saHueRate.toFixed(2);
  });
  document.getElementById('slider-sa-scale').addEventListener('input', (e) => {
    saScale = parseInt(e.target.value);
    document.getElementById('sa-scale-val').textContent = saScale;
  });

  // Click on canvas to recenter
  saCanvas.addEventListener('click', (e) => {
    const rect = saCanvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (SA_W / rect.width);
    const py = (e.clientY - rect.top) * (SA_H / rect.height);
    saX = (px - SA_W / 2) / saScale;
    saY = (py - SA_H / 2) / saScale;
  });

  // Initialize (moved from bootstrap)
  saInit();
