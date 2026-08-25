// ============================================================
  //  EXPERIMENT 22 — Physarum Slime Mold
  // ============================================================
  const pmCanvas = document.getElementById('canvas22');
  const pmCtx = pmCanvas.getContext('2d');
  const pmW = 600, pmH = 400;

  // Trail map stored as Float32Array, scaled down for performance
  const pmScale = 2; // each trail cell = 2x2 pixels
  const pmGW = Math.floor(pmW / pmScale); // 300
  const pmGH = Math.floor(pmH / pmScale); // 200
  let pmTrail = new Float32Array(pmGW * pmGH);
  let pmTrailNext = new Float32Array(pmGW * pmGH);

  // Agents: stored as typed arrays for performance
  let pmAgents = []; // each: {x, y, angle}
  let pmAgentX, pmAgentY, pmAgentAngle;
  let pmPop = 5000;

  // Parameters
  let pmSensorAngle = Math.PI / 4;  // 45 degrees
  let pmSensorDist = 9;
  let pmTurnSpeed = Math.PI / 4;    // 45 degrees
  let pmMoveSpeed = 1;
  let pmDeposit = 5;
  let pmDiffuse = 0.4;
  let pmEvap = 0.05;
  let pmHueOffset = 0;

  // ImageData for rendering
  let pmImageData = pmCtx.createImageData(pmW, pmH);
  let pmPixels = pmImageData.data;

  function pmInit() {
    pmTrail.fill(0);
    pmTrailNext.fill(0);
    pmAgents = [];
    pmAgentX = new Float32Array(pmPop);
    pmAgentY = new Float32Array(pmPop);
    pmAgentAngle = new Float32Array(pmPop);
    for (let i = 0; i < pmPop; i++) {
      pmAgentX[i] = pmW / 2 + (Math.random() - 0.5) * 200;
      pmAgentY[i] = pmH / 2 + (Math.random() - 0.5) * 150;
      pmAgentAngle[i] = Math.random() * Math.PI * 2;
    }
    document.getElementById('pm-count-stat').textContent = pmPop;
  }

  function pmSampleTrail(x, y) {
    var gx = (x / pmScale) | 0;
    var gy = (y / pmScale) | 0;
    if (gx < 0) gx = 0; else if (gx >= pmGW) gx = pmGW - 1;
    if (gy < 0) gy = 0; else if (gy >= pmGH) gy = pmGH - 1;
    return pmTrail[gy * pmGW + gx];
  }

  function pmSenseAndTurn(i) {
    var x = pmAgentX[i], y = pmAgentY[i], a = pmAgentAngle[i];
    // Three sensor positions
    var sa = pmSensorAngle;
    var sd = pmSensorDist;
    var fwd = pmSampleTrail(x + Math.cos(a) * sd, y + Math.sin(a) * sd);
    var left = pmSampleTrail(x + Math.cos(a - sa) * sd, y + Math.sin(a - sa) * sd);
    var right = pmSampleTrail(x + Math.cos(a + sa) * sd, y + Math.sin(a + sa) * sd);

    if (fwd > left && fwd > right) {
      // Keep going straight
    } else if (fwd < left && fwd < right) {
      // Random turn left or right
      if (Math.random() < 0.5) pmAgentAngle[i] -= pmTurnSpeed;
      else pmAgentAngle[i] += pmTurnSpeed;
    } else if (left > right) {
      pmAgentAngle[i] -= pmTurnSpeed;
    } else if (right > left) {
      pmAgentAngle[i] += pmTurnSpeed;
    }
  }

  function pmMoveAgents() {
    for (var i = 0; i < pmPop; i++) {
      pmSenseAndTurn(i);
      // Move
      var nx = pmAgentX[i] + Math.cos(pmAgentAngle[i]) * pmMoveSpeed;
      var ny = pmAgentY[i] + Math.sin(pmAgentAngle[i]) * pmMoveSpeed;
      // Toroidal wrapping
      if (nx < 0) { nx += pmW; pmAgentAngle[i] += Math.PI; }
      else if (nx >= pmW) { nx -= pmW; pmAgentAngle[i] += Math.PI; }
      if (ny < 0) { ny += pmH; pmAgentAngle[i] += Math.PI; }
      else if (ny >= pmH) { ny -= pmH; pmAgentAngle[i] += Math.PI; }
      // Keep angle in range
      if (pmAgentAngle[i] > Math.PI * 2) pmAgentAngle[i] -= Math.PI * 2;
      else if (pmAgentAngle[i] < 0) pmAgentAngle[i] += Math.PI * 2;
      pmAgentX[i] = nx;
      pmAgentY[i] = ny;
      // Deposit trail
      var gx = (nx / pmScale) | 0;
      var gy = (ny / pmScale) | 0;
      if (gx >= 0 && gx < pmGW && gy >= 0 && gy < pmGH) {
        pmTrail[gy * pmGW + gx] += pmDeposit;
        if (pmTrail[gy * pmGW + gx] > 255) pmTrail[gy * pmGW + gx] = 255;
      }
    }
  }

  function pmDiffuseEvaporate() {
    // Simple 3x3 box blur + evaporation
    for (var y = 0; y < pmGH; y++) {
      for (var x = 0; x < pmGW; x++) {
        var idx = y * pmGW + x;
        var sum = 0;
        var count = 0;
        for (var dy = -1; dy <= 1; dy++) {
          var ny = y + dy;
          if (ny < 0 || ny >= pmGH) continue;
          for (var dx = -1; dx <= 1; dx++) {
            var nx = x + dx;
            if (nx < 0 || nx >= pmGW) continue;
            sum += pmTrail[ny * pmGW + nx];
            count++;
          }
        }
        var avg = sum / count;
        pmTrailNext[idx] = avg * (1 - pmEvap);
      }
    }
    // Swap
    var tmp = pmTrail;
    pmTrail = pmTrailNext;
    pmTrailNext = tmp;
  }

  function pmRender() {
    // Render trail map to canvas with hue
    for (var py = 0; py < pmH; py++) {
      var gy = (py / pmScale) | 0;
      if (gy >= pmGH) gy = pmGH - 1;
      for (var px = 0; px < pmW; px++) {
        var gx = (px / pmScale) | 0;
        if (gx >= pmGW) gx = pmGW - 1;
        var val = pmTrail[gy * pmGW + gx];
        var pixIdx = (py * pmW + px) * 4;
        if (val < 1) {
          pmPixels[pixIdx] = 10;
          pmPixels[pixIdx + 1] = 10;
          pmPixels[pixIdx + 2] = 18;
          pmPixels[pixIdx + 3] = 255;
        } else {
          var t = Math.min(1, val / 100);
          var hue = (pmHueOffset + t * 120) % 360;
          // HSL to RGB
          var s = 0.8, l = t * 0.5 + 0.1;
          var c = (1 - Math.abs(2 * l - 1)) * s;
          var h6 = hue / 60;
          var x = c * (1 - Math.abs((h6 % 2) - 1));
          var r, g, b;
          if (h6 < 1) { r = c; g = x; b = 0; }
          else if (h6 < 2) { r = x; g = c; b = 0; }
          else if (h6 < 3) { r = 0; g = c; b = x; }
          else if (h6 < 4) { r = 0; g = x; b = c; }
          else if (h6 < 5) { r = x; g = 0; b = c; }
          else { r = c; g = 0; b = x; }
          var m = l - c / 2;
          pmPixels[pixIdx] = ((r + m) * 255) | 0;
          pmPixels[pixIdx + 1] = ((g + m) * 255) | 0;
          pmPixels[pixIdx + 2] = ((b + m) * 255) | 0;
          pmPixels[pixIdx + 3] = 255;
        }
      }
    }
    pmCtx.putImageData(pmImageData, 0, 0);
  }

  function pmStep() {
    pmMoveAgents();
    pmDiffuseEvaporate();
    pmRender();
  }

  function pmReset() {
    pmInit();
    pmRender();
  }

  function pmClearTrails() {
    pmTrail.fill(0);
    pmTrailNext.fill(0);
    pmRender();
  }

  function pmRandomize() {
    pmSensorAngle = (10 + Math.random() * 80) * Math.PI / 180;
    pmSensorDist = Math.floor(3 + Math.random() * 25);
    pmTurnSpeed = (10 + Math.random() * 80) * Math.PI / 180;
    pmMoveSpeed = Math.floor(1 + Math.random() * 4);
    pmDeposit = Math.floor(1 + Math.random() * 15);
    pmDiffuse = Math.round(Math.random() * 100) / 100;
    pmEvap = Math.round((0.02 + Math.random() * 0.2) * 100) / 100;
    pmHueOffset = Math.floor(Math.random() * 360);
    pmUpdateSliders();
    pmReset();
  }

  function pmUpdateSliders() {
    var sa = Math.round(pmSensorAngle * 180 / Math.PI);
    var ts = Math.round(pmTurnSpeed * 180 / Math.PI);
    document.getElementById('slider-pm-sensor').value = sa;
    document.getElementById('pm-sensor-val').textContent = sa;
    document.getElementById('slider-pm-sensordist').value = pmSensorDist;
    document.getElementById('pm-sensordist-val').textContent = pmSensorDist;
    document.getElementById('slider-pm-turn').value = ts;
    document.getElementById('pm-turn-val').textContent = ts;
    document.getElementById('slider-pm-speed').value = pmMoveSpeed;
    document.getElementById('pm-speed-val').textContent = pmMoveSpeed;
    document.getElementById('slider-pm-deposit').value = pmDeposit;
    document.getElementById('pm-deposit-val').textContent = pmDeposit;
    document.getElementById('slider-pm-diffuse').value = pmDiffuse;
    document.getElementById('pm-diffuse-val').textContent = pmDiffuse;
    document.getElementById('slider-pm-evap').value = pmEvap;
    document.getElementById('pm-evap-val').textContent = pmEvap;
    document.getElementById('slider-pm-hue').value = pmHueOffset;
    document.getElementById('pm-hue-val').textContent = pmHueOffset;
  }

  // Presets
  var pmPresets = {
    default: { pop: 5000, sa: 45, sd: 9, ts: 45, spd: 1, dep: 5, dif: 0.4, evp: 0.05, hue: 0 },
    veins: { pop: 8000, sa: 30, sd: 15, ts: 25, spd: 1, dep: 3, dif: 0.3, evp: 0.04, hue: 20 },
    coral: { pop: 6000, sa: 60, sd: 5, ts: 60, spd: 2, dep: 8, dif: 0.5, evp: 0.06, hue: 340 },
    labyrinth: { pop: 4000, sa: 90, sd: 9, ts: 90, spd: 1, dep: 10, dif: 0.2, evp: 0.03, hue: 180 },
    sparse: { pop: 2000, sa: 45, sd: 20, ts: 30, spd: 2, dep: 3, dif: 0.6, evp: 0.08, hue: 280 },
    dense: { pop: 12000, sa: 25, sd: 5, ts: 15, spd: 1, dep: 8, dif: 0.3, evp: 0.05, hue: 120 }
  };

  function pmApplyPreset(name) {
    var p = pmPresets[name];
    if (!p) return;
    pmPop = p.pop;
    pmSensorAngle = p.sa * Math.PI / 180;
    pmSensorDist = p.sd;
    pmTurnSpeed = p.ts * Math.PI / 180;
    pmMoveSpeed = p.spd;
    pmDeposit = p.dep;
    pmDiffuse = p.dif;
    pmEvap = p.evp;
    pmHueOffset = p.hue;
    document.getElementById('slider-pm-pop').value = p.pop;
    document.getElementById('pm-pop-val').textContent = p.pop;
    pmUpdateSliders();
    pmReset();
  }

  // Event listeners
  document.getElementById('pm-reset').addEventListener('click', pmReset);
  document.getElementById('pm-pause').addEventListener('click', function() {
    expPaused[21] = !expPaused[21];
    this.textContent = expPaused[21] ? 'Resume' : 'Pause';
  });
  document.getElementById('pm-randomize').addEventListener('click', pmRandomize);
  document.getElementById('pm-clear').addEventListener('click', pmClearTrails);

  document.getElementById('slider-pm-pop').addEventListener('input', function(e) {
    pmPop = parseInt(e.target.value);
    document.getElementById('pm-pop-val').textContent = pmPop;
    document.getElementById('pm-count-stat').textContent = pmPop;
    pmInit();
    pmRender();
  });
  document.getElementById('slider-pm-sensor').addEventListener('input', function(e) {
    pmSensorAngle = parseFloat(e.target.value) * Math.PI / 180;
    document.getElementById('pm-sensor-val').textContent = e.target.value;
  });
  document.getElementById('slider-pm-sensordist').addEventListener('input', function(e) {
    pmSensorDist = parseInt(e.target.value);
    document.getElementById('pm-sensordist-val').textContent = e.target.value;
  });
  document.getElementById('slider-pm-turn').addEventListener('input', function(e) {
    pmTurnSpeed = parseFloat(e.target.value) * Math.PI / 180;
    document.getElementById('pm-turn-val').textContent = e.target.value;
  });
  document.getElementById('slider-pm-speed').addEventListener('input', function(e) {
    pmMoveSpeed = parseInt(e.target.value);
    document.getElementById('pm-speed-val').textContent = e.target.value;
  });
  document.getElementById('slider-pm-deposit').addEventListener('input', function(e) {
    pmDeposit = parseInt(e.target.value);
    document.getElementById('pm-deposit-val').textContent = e.target.value;
  });
  document.getElementById('slider-pm-diffuse').addEventListener('input', function(e) {
    pmDiffuse = parseFloat(e.target.value);
    document.getElementById('pm-diffuse-val').textContent = e.target.value;
  });
  document.getElementById('slider-pm-evap').addEventListener('input', function(e) {
    pmEvap = parseFloat(e.target.value);
    document.getElementById('pm-evap-val').textContent = e.target.value;
  });
  document.getElementById('slider-pm-hue').addEventListener('input', function(e) {
    pmHueOffset = parseInt(e.target.value);
    document.getElementById('pm-hue-val').textContent = e.target.value;
  });

  // Preset buttons
  document.querySelectorAll('#pm-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#pm-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      pmApplyPreset(btn.dataset.preset);
    });
  });

  // Click to attract
  pmCanvas.addEventListener('click', function(e) {
    var rect = pmCanvas.getBoundingClientRect();
    var cx = (e.clientX - rect.left) * (pmW / rect.width);
    var cy = (e.clientY - rect.top) * (pmH / rect.height);
    // Deposit a burst of trail
    var r = 15;
    var gx = (cx / pmScale) | 0;
    var gy = (cy / pmScale) | 0;
    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        var d2 = dx * dx + dy * dy;
        if (d2 <= r * r) {
          var nx = gx + dx, ny = gy + dy;
          if (nx >= 0 && nx < pmGW && ny >= 0 && ny < pmGH) {
            pmTrail[ny * pmGW + nx] = 200;
          }
        }
      }
    }
    // Redirect nearby agents
    for (var i = 0; i < pmPop; i++) {
      var ax = pmAgentX[i], ay = pmAgentY[i];
      var ddx = cx - ax, ddy = cy - ay;
      var dist = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dist < 100) {
        pmAgentAngle[i] = Math.atan2(ddy, ddx);
      }
    }
  });

  // Initialize
  pmInit();
  pmRender();
