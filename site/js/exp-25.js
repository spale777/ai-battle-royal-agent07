// ============================================================
  //  EXPERIMENT 25 — Voronoi Diagram Explorer (JFA)
  // ============================================================
  var voCanvas = document.getElementById('canvas25');
  var voCtx = voCanvas.getContext('2d');
  var voCW = 600, voCH = 400;

  // Parameters
  var voRes = 2;       // resolution multiplier (1=150x100, 2=300x200, 3=450x300, 4=600x400)
  var voHueOffset = 0;
  var voEdgeThick = 1;
  var voAnimSpeed = 1;
  var voMetric = 'euclidean';
  var voDisplayMode = 'cells';
  var voPower = 1.0;
  var voWeightRange = 0;  // 0-100% of base radius

  // Grid state
  var voGW, voGH;       // grid dimensions
  var voSeedX, voSeedY; // Float32Array of seed coords (in grid space)
  var voSeedWeight;     // per-seed weight
  var voSeedCount = 0;
  var voMaxSeeds = 60;
  var voOwner;          // Int32Array — index of nearest seed per cell
  var voOwnerX, voOwnerY; // Float32Array — seed coord stored per cell (for JFA)
  var voDist;           // Float32Array — distance to nearest seed
  var voImageData;
  var voNeedsRecompute = true;
  var voAnimT = 0;
  var voDragging = -1;  // index of seed being dragged

  // HSL to RGB
  function voHsl(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }

  function voGridDims() {
    var gw = Math.floor(150 * voRes);
    var gh = Math.floor(100 * voRes);
    // Maintain aspect ratio of canvas
    gw = Math.floor(voCW * voRes / 4);
    gh = Math.floor(voCH * voRes / 4);
    return [gw, gh];
  }

  function voDistMetric(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    if (voMetric === 'manhattan') return Math.abs(dx) + Math.abs(dy);
    if (voMetric === 'chebyshev') return Math.max(Math.abs(dx), Math.abs(dy));
    return Math.sqrt(dx * dx + dy * dy);
  }

  function voWeightedDist(ax, ay, bx, by, weight) {
    var d = voDistMetric(ax, ay, bx, by);
    if (voDisplayMode === 'weight' && voPower !== 1.0) {
      return Math.pow(d, voPower) - weight;
    }
    if (voDisplayMode === 'weight' && weight > 0) {
      return d * d - weight * weight;
    }
    return d;
  }

  function voSetupGrid() {
    var dims = voGridDims();
    voGW = dims[0];
    voGH = dims[1];
    voOwner = new Int32Array(voGW * voGH);
    voOwnerX = new Float32Array(voGW * voGH);
    voOwnerY = new Float32Array(voGW * voGH);
    voDist = new Float32Array(voGW * voGH);
    voImageData = voCtx.createImageData(voCW, voCH);
  }

  function voGenerateSeeds(count) {
    voSeedX = new Float32Array(voMaxSeeds);
    voSeedY = new Float32Array(voMaxSeeds);
    voSeedWeight = new Float32Array(voMaxSeeds);
    voSeedCount = count;
    for (var i = 0; i < count; i++) {
      voSeedX[i] = Math.random() * voGW;
      voSeedY[i] = Math.random() * voGH;
      voSeedWeight[i] = 0;
    }
    voApplyWeights();
    voNeedsRecompute = true;
  }

  function voApplyWeights() {
    if (voWeightRange > 0 && voDisplayMode === 'weight') {
      var baseR = Math.min(voGW, voGH) * 0.1;
      for (var i = 0; i < voSeedCount; i++) {
        voSeedWeight[i] = baseR * (voWeightRange / 100) * (0.3 + Math.random() * 0.7);
      }
    } else {
      for (var i = 0; i < voSeedCount; i++) {
        voSeedWeight[i] = 0;
      }
    }
  }

  // Jump-flooding algorithm
  function voJFA() {
    var n = voGW * voGH;
    // Initialize: each cell is its own seed (or -1 if no seed there)
    for (var i = 0; i < n; i++) {
      voOwnerX[i] = Infinity;
      voOwnerY[i] = Infinity;
      voOwner[i] = -1;
    }
    // Plant seeds
    for (var s = 0; s < voSeedCount; s++) {
      var sx = Math.round(voSeedX[s]);
      var sy = Math.round(voSeedY[s]);
      if (sx < 0) sx = 0; if (sx >= voGW) sx = voGW - 1;
      if (sy < 0) sy = 0; if (sy >= voGH) sy = voGH - 1;
      var idx = sy * voGW + sx;
      voOwnerX[idx] = voSeedX[s];
      voOwnerY[idx] = voSeedY[s];
      voOwner[idx] = s;
    }

    var step = Math.max(voGW, voGH);
    while (step >= 1) {
      // We need read from current, write to new
      var readX = new Float32Array(voOwnerX);
      var readY = new Float32Array(voOwnerY);
      var readOwner = new Int32Array(voOwner);

      for (var y = 0; y < voGH; y++) {
        for (var x = 0; x < voGW; x++) {
          var idx2 = y * voGW + x;
          var bestX = readX[idx2];
          var bestY = readY[idx2];
          var bestOwner = readOwner[idx2];
          var bestDist;
          if (bestOwner >= 0) {
            bestDist = voWeightedDist(x, y, bestX, bestY, voSeedWeight[bestOwner]);
          } else {
            bestDist = Infinity;
          }

          // Check 8 neighbors at current step
          for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              var nx = x + dx * step;
              var ny = y + dy * step;
              if (nx < 0 || nx >= voGW || ny < 0 || ny >= voGH) continue;
              var nidx = ny * voGW + nx;
              if (readOwner[nidx] < 0) continue;
              var candidateX = readX[nidx];
              var candidateY = readY[nidx];
              var candidateOwner = readOwner[nidx];
              var d = voWeightedDist(x, y, candidateX, candidateY, voSeedWeight[candidateOwner]);
              if (d < bestDist) {
                bestDist = d;
                bestX = candidateX;
                bestY = candidateY;
                bestOwner = candidateOwner;
              }
            }
          }
          voOwnerX[idx2] = bestX;
          voOwnerY[idx2] = bestY;
          voOwner[idx2] = bestOwner;
        }
      }
      step = Math.floor(step / 2);
    }

    // Compute distances for distance field mode
    if (voDisplayMode === 'distfield') {
      for (var i2 = 0; i2 < n; i2++) {
        if (voOwner[i2] >= 0) {
          voDist[i2] = voDistMetric(i2 % voGW, Math.floor(i2 / voGW), voOwnerX[i2], voOwnerY[i2]);
        } else {
          voDist[i2] = 0;
        }
      }
    }
  }

  function voRender() {
    var data = voImageData.data;
    var maxDist = Math.sqrt(voGW * voGW + voGH * voGH);

    for (var py = 0; py < voCH; py++) {
      for (var px = 0; px < voCW; px++) {
        // Map canvas pixel to grid
        var gx = Math.floor(px * voGW / voCW);
        var gy = Math.floor(py * voGH / voCH);
        var gidx = gy * voGW + gx;
        var owner = voOwner[gidx];
        var pi = (py * voCW + px) * 4;

        if (owner < 0) {
          data[pi] = 10; data[pi + 1] = 10; data[pi + 2] = 14; data[pi + 3] = 255;
          continue;
        }

        if (voDisplayMode === 'distfield') {
          var d = voDist[gidx];
          var norm = Math.min(1, d / (maxDist * 0.15));
          var hue = (voHueOffset + norm * 240) % 360;
          var rgb = voHsl(hue, 70, 50 - norm * 30);
          data[pi] = rgb[0]; data[pi + 1] = rgb[1]; data[pi + 2] = rgb[2]; data[pi + 3] = 255;
        } else if (voDisplayMode === 'edges') {
          // Edge detection: compare with neighbors
          var isEdge = false;
          if (gx > 0 && voOwner[gy * voGW + gx - 1] !== owner) isEdge = true;
          if (gx < voGW - 1 && voOwner[gy * voGW + gx + 1] !== owner) isEdge = true;
          if (gy > 0 && voOwner[(gy - 1) * voGW + gx] !== owner) isEdge = true;
          if (gy < voGH - 1 && voOwner[(gy + 1) * voGW + gx] !== owner) isEdge = true;

          if (isEdge && voEdgeThick > 0) {
            var hue2 = (voHueOffset + owner * (360 / Math.max(voSeedCount, 1))) % 360;
            var rgb2 = voHsl(hue2, 90, 60);
            data[pi] = rgb2[0]; data[pi + 1] = rgb2[1]; data[pi + 2] = rgb2[2]; data[pi + 3] = 255;
          } else {
            data[pi] = 12; data[pi + 1] = 12; data[pi + 2] = 18; data[pi + 3] = 255;
          }
        } else {
          // Cell colors or weighted
          var hue3 = (voHueOffset + owner * (360 / Math.max(voSeedCount, 1))) % 360;
          // Check if near edge (for edge overlay)
          var nearEdge = false;
          if (voEdgeThick > 0) {
            var et = Math.ceil(voEdgeThick);
            for (var ey = -et; ey <= et && !nearEdge; ey++) {
              for (var ex = -et; ex <= et && !nearEdge; ex++) {
                var nx2 = gx + ex, ny2 = gy + ey;
                if (nx2 < 0 || nx2 >= voGW || ny2 < 0 || ny2 >= voGH) continue;
                if (voOwner[ny2 * voGW + nx2] !== owner) {
                  if (Math.sqrt(ex * ex + ey * ey) <= voEdgeThick) nearEdge = true;
                }
              }
            }
          }

          if (nearEdge) {
            data[pi] = 240; data[pi + 1] = 240; data[pi + 2] = 250; data[pi + 3] = 255;
          } else {
            var rgb3 = voHsl(hue3, 65, 50);
            data[pi] = rgb3[0]; data[pi + 1] = rgb3[1]; data[pi + 2] = rgb3[2]; data[pi + 3] = 255;
          }
        }
      }
    }

    voCtx.putImageData(voImageData, 0, 0);

    // Draw seed markers
    voCtx.fillStyle = '#fff';
    for (var s = 0; s < voSeedCount; s++) {
      var sx = voSeedX[s] / voGW * voCW;
      var sy = voSeedY[s] / voGH * voCH;
      voCtx.beginPath();
      voCtx.arc(sx, sy, 3, 0, Math.PI * 2);
      voCtx.fill();
      voCtx.strokeStyle = 'rgba(255,255,255,0.3)';
      voCtx.lineWidth = 1;
      voCtx.beginPath();
      voCtx.arc(sx, sy, 6, 0, Math.PI * 2);
      voCtx.stroke();
    }
  }

  function voStep() {
    if (voAnimSpeed > 0) {
      voAnimT += voAnimSpeed * 0.01;
      // Animate seeds with gentle orbital motion
      for (var i = 0; i < voSeedCount; i++) {
        // Store original position and apply gentle oscillation
        // We use a per-seed phase
        var phase = i * 0.7;
        var baseX = voSeedX[i];
        var baseY = voSeedY[i];
        // We need to store base positions separately for animation
      }
      voNeedsRecompute = true;
    }

    if (voNeedsRecompute) {
      voJFA();
      voNeedsRecompute = false;
    }
    voRender();
  }

  // Base positions for animation
  var voBaseX = new Float32Array(voMaxSeeds);
  var voBaseY = new Float32Array(voMaxSeeds);
  var voHasBase = false;

  function voStoreBase() {
    for (var i = 0; i < voSeedCount; i++) {
      voBaseX[i] = voSeedX[i];
      voBaseY[i] = voSeedY[i];
    }
    voHasBase = true;
  }

  function voAnimate() {
    if (voAnimSpeed === 0 || !voHasBase) return;
    for (var i = 0; i < voSeedCount; i++) {
      var phase = i * 0.7;
      var amp = Math.min(voGW, voGH) * 0.05;
      voSeedX[i] = voBaseX[i] + Math.cos(voAnimT + phase) * amp;
      voSeedY[i] = voBaseY[i] + Math.sin(voAnimT * 1.3 + phase) * amp;
    }
    voNeedsRecompute = true;
  }

  // Override voStep to use animation
  voStep = function() {
    voAnimT += voAnimSpeed * 0.01;
    if (voAnimSpeed > 0) voAnimate();
    if (voNeedsRecompute) {
      voJFA();
      voNeedsRecompute = false;
    }
    voRender();
  };

  function voUpdateStatus() {
    var el = document.getElementById('vo-status');
    if (el) {
      var mode = voDisplayMode === 'cells' ? 'Cells' :
                 voDisplayMode === 'distfield' ? 'Distance' :
                 voDisplayMode === 'edges' ? 'Edges' : 'Weighted';
      el.textContent = 'Voronoi · ' + voMetric + ' · ' + mode;
    }
  }

  // Presets
  var voPresets = {
    random12: function() {
      voGenerateSeeds(12);
      voStoreBase();
    },
    grid44: function() {
      var count = 16;
      voSeedCount = count;
      for (var i = 0; i < count; i++) voSeedWeight[i] = 0;
      var row = 0, col = 0;
      for (var i = 0; i < count; i++) {
        voSeedX[i] = voGW * (0.1 + 0.8 * col / 3);
        voSeedY[i] = voGH * (0.1 + 0.8 * row / 3);
        col++;
        if (col >= 4) { col = 0; row++; }
      }
      voStoreBase();
      voNeedsRecompute = true;
    },
    hex6: function() {
      var count = 7;
      voSeedCount = count;
      for (var i = 0; i < count; i++) voSeedWeight[i] = 0;
      voSeedX[0] = voGW / 2; voSeedY[0] = voGH / 2;
      for (var i = 1; i < 7; i++) {
        var a = (i - 1) / 6 * Math.PI * 2;
        voSeedX[i] = voGW / 2 + Math.cos(a) * voGW * 0.3;
        voSeedY[i] = voGH / 2 + Math.sin(a) * voGH * 0.3;
      }
      voStoreBase();
      voNeedsRecompute = true;
    },
    poisson: function() {
      // Simple Poisson-like: random with min distance
      var count = 30;
      voSeedCount = 0;
      var minD = Math.min(voGW, voGH) * 0.08;
      var attempts = 0;
      while (voSeedCount < count && attempts < 5000) {
        attempts++;
        var x = Math.random() * voGW;
        var y = Math.random() * voGH;
        var ok = true;
        for (var i = 0; i < voSeedCount; i++) {
          if (voDistMetric(x, y, voSeedX[i], voSeedY[i]) < minD) { ok = false; break; }
        }
        if (ok) {
          voSeedX[voSeedCount] = x;
          voSeedY[voSeedCount] = y;
          voSeedWeight[voSeedCount] = 0;
          voSeedCount++;
        }
      }
      voStoreBase();
      voNeedsRecompute = true;
    },
    cluster: function() {
      var nClusters = 4;
      var perCluster = 6;
      voSeedCount = 0;
      for (var c = 0; c < nClusters; c++) {
        var cx = Math.random() * voGW * 0.6 + voGW * 0.2;
        var cy = Math.random() * voGH * 0.6 + voGH * 0.2;
        var r = Math.min(voGW, voGH) * 0.08;
        for (var i = 0; i < perCluster; i++) {
          var a = Math.random() * Math.PI * 2;
          var d = Math.random() * r;
          voSeedX[voSeedCount] = cx + Math.cos(a) * d;
          voSeedY[voSeedCount] = cy + Math.sin(a) * d;
          voSeedWeight[voSeedCount] = 0;
          voSeedCount++;
        }
      }
      voStoreBase();
      voNeedsRecompute = true;
    },
    line: function() {
      var count = 8;
      voSeedCount = count;
      for (var i = 0; i < count; i++) voSeedWeight[i] = 0;
      for (var i = 0; i < count; i++) {
        voSeedX[i] = voGW * (0.1 + 0.8 * i / (count - 1));
        voSeedY[i] = voGH * 0.5;
      }
      voStoreBase();
      voNeedsRecompute = true;
    },
    circle: function() {
      var rings = 3;
      voSeedCount = 0;
      for (var r = 1; r <= rings; r++) {
        var perRing = r * 6;
        for (var i = 0; i < perRing; i++) {
          var a = i / perRing * Math.PI * 2;
          var radius = Math.min(voGW, voGH) * 0.15 * r;
          voSeedX[voSeedCount] = voGW / 2 + Math.cos(a) * radius;
          voSeedY[voSeedCount] = voGH / 2 + Math.sin(a) * radius;
          voSeedWeight[voSeedCount] = 0;
          voSeedCount++;
        }
      }
      // Add center seed
      voSeedX[voSeedCount] = voGW / 2;
      voSeedY[voSeedCount] = voGH / 2;
      voSeedWeight[voSeedCount] = 0;
      voSeedCount++;
      voStoreBase();
      voNeedsRecompute = true;
    }
  };

  function voReset() {
    var dims = voGridDims();
    voGW = dims[0];
    voGH = dims[1];
    voSetupGrid();
    voApplyPreset('random12');
    // Update UI to reflect default
    document.getElementById('slider-vo-ncount').value = 12;
    document.getElementById('vo-ncount-val').textContent = 12;
    document.getElementById('slider-vo-res').value = 2;
    document.getElementById('vo-res-val').textContent = 2;
    document.getElementById('vo-metric').value = 'euclidean';
    document.getElementById('vo-dmode').value = 'cells';
    voUpdateStatus();
  }

  function voRandomize() {
    var n = voSeedCount;
    voGenerateSeeds(n);
    voStoreBase();
    voUpdateStatus();
  }

  function voSyncUI() {
    document.getElementById('vo-ncount-val').textContent = voSeedCount;
    document.getElementById('slider-vo-ncount').value = voSeedCount;
    document.getElementById('vo-res-val').textContent = voRes;
    document.getElementById('slider-vo-res').value = voRes;
    document.getElementById('vo-hue-val').textContent = voHueOffset;
    document.getElementById('slider-vo-hue').value = voHueOffset;
    document.getElementById('vo-edge-val').textContent = voEdgeThick;
    document.getElementById('slider-vo-edge').value = voEdgeThick;
    document.getElementById('vo-anim-val').textContent = voAnimSpeed;
    document.getElementById('slider-vo-anim').value = voAnimSpeed;
    document.getElementById('vo-power-val').textContent = voPower.toFixed(1);
    document.getElementById('slider-vo-power').value = voPower;
    document.getElementById('vo-wrange-val').textContent = voWeightRange;
    document.getElementById('slider-vo-wrange').value = voWeightRange;
  }

  function voApplyPreset(name) {
    var fn = voPresets[name];
    if (fn) fn();
    voUpdateStatus();
  }

  function voInit() {
    voSetupGrid();
    voApplyPreset('random12');
    voUpdateStatus();
  }

  // Mouse interaction
  function voGetMousePos(e) {
    var rect = voCanvas.getBoundingClientRect();
    var px = (e.clientX - rect.left) / rect.width * voCW;
    var py = (e.clientY - rect.top) / rect.height * voCH;
    return [px, py];
  }

  function voFindSeed(px, py) {
    var bestDist = 15; // pixel radius for hit
    var bestIdx = -1;
    for (var i = 0; i < voSeedCount; i++) {
      var sx = voSeedX[i] / voGW * voCW;
      var sy = voSeedY[i] / voGH * voCH;
      var d = Math.sqrt((px - sx) * (px - sx) + (py - sy) * (py - sy));
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    return bestIdx;
  }

  voCanvas.addEventListener('mousedown', function(e) {
    e.preventDefault();
    var pos = voGetMousePos(e);
    var px = pos[0], py = pos[1];

    if (e.shiftKey) {
      // Remove nearest seed
      var idx = voFindSeed(px, py);
      if (idx >= 0) {
        // Shift remaining seeds down
        for (var i = idx; i < voSeedCount - 1; i++) {
          voSeedX[i] = voSeedX[i + 1];
          voSeedY[i] = voSeedY[i + 1];
          voSeedWeight[i] = voSeedWeight[i + 1];
        }
        voSeedCount--;
        voStoreBase();
        voNeedsRecompute = true;
      }
      return;
    }

    var idx = voFindSeed(px, py);
    if (idx >= 0) {
      voDragging = idx;
    } else {
      // Add new seed
      if (voSeedCount < voMaxSeeds) {
        voSeedX[voSeedCount] = px / voCW * voGW;
        voSeedY[voSeedCount] = py / voCH * voGH;
        voSeedWeight[voSeedCount] = 0;
        voSeedCount++;
        voStoreBase();
        voNeedsRecompute = true;
      }
    }
  });

  voCanvas.addEventListener('mousemove', function(e) {
    if (voDragging < 0) return;
    var pos = voGetMousePos(e);
    voSeedX[voDragging] = pos[0] / voCW * voGW;
    voSeedY[voDragging] = pos[1] / voCH * voGH;
    voBaseX[voDragging] = voSeedX[voDragging];
    voBaseY[voDragging] = voSeedY[voDragging];
    voNeedsRecompute = true;
  });

  voCanvas.addEventListener('mouseup', function() { voDragging = -1; });
  voCanvas.addEventListener('mouseleave', function() { voDragging = -1; });

  // Touch support
  voCanvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var t = e.touches[0];
    var fake = { clientX: t.clientX, clientY: t.clientY, shiftKey: false, preventDefault: function(){} };
    var pos = voGetMousePos(fake);
    var idx = voFindSeed(pos[0], pos[1]);
    if (idx >= 0) {
      voDragging = idx;
    } else if (voSeedCount < voMaxSeeds) {
      voSeedX[voSeedCount] = pos[0] / voCW * voGW;
      voSeedY[voSeedCount] = pos[1] / voCH * voGH;
      voSeedWeight[voSeedCount] = 0;
      voSeedCount++;
      voStoreBase();
      voNeedsRecompute = true;
    }
  });
  voCanvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (voDragging < 0) return;
    var t = e.touches[0];
    var fake = { clientX: t.clientX, clientY: t.clientY };
    var pos = voGetMousePos(fake);
    voSeedX[voDragging] = pos[0] / voCW * voGW;
    voSeedY[voDragging] = pos[1] / voCH * voGH;
    voBaseX[voDragging] = voSeedX[voDragging];
    voBaseY[voDragging] = voSeedY[voDragging];
    voNeedsRecompute = true;
  });
  voCanvas.addEventListener('touchend', function() { voDragging = -1; });

  // Button handlers
  document.getElementById('vo-reset').addEventListener('click', function() {
    voReset();
  });
  document.getElementById('vo-pause').addEventListener('click', function() {
    expPaused[24] = !expPaused[24];
    this.textContent = expPaused[24] ? 'Resume' : 'Pause';
    if (!expPaused[24]) voRender(); // render once when resuming
  });
  document.getElementById('vo-randomize').addEventListener('click', voRandomize);
  document.getElementById('vo-clear').addEventListener('click', function() {
    voSeedCount = 0;
    voNeedsRecompute = true;
    voRender();
  });

  // Preset buttons
  document.querySelectorAll('#vo-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#vo-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      voApplyPreset(btn.dataset.preset);
    });
  });

  // Slider handlers
  document.getElementById('slider-vo-ncount').addEventListener('input', function(e) {
    var n = parseInt(e.target.value);
    document.getElementById('vo-ncount-val').textContent = n;
    if (n !== voSeedCount) {
      voGenerateSeeds(n);
      voStoreBase();
      voUpdateStatus();
    }
  });
  document.getElementById('slider-vo-res').addEventListener('input', function(e) {
    voRes = parseInt(e.target.value);
    document.getElementById('vo-res-val').textContent = voRes;
    var dims = voGridDims();
    voGW = dims[0];
    voGH = dims[1];
    voSetupGrid();
    voStoreBase();
    // Scale seed positions to new grid
    voNeedsRecompute = true;
    voRender();
  });
  document.getElementById('slider-vo-hue').addEventListener('input', function(e) {
    voHueOffset = parseInt(e.target.value);
    document.getElementById('vo-hue-val').textContent = voHueOffset;
    voRender();
  });
  document.getElementById('slider-vo-edge').addEventListener('input', function(e) {
    voEdgeThick = parseFloat(e.target.value);
    document.getElementById('vo-edge-val').textContent = voEdgeThick;
    voRender();
  });
  document.getElementById('slider-vo-anim').addEventListener('input', function(e) {
    voAnimSpeed = parseFloat(e.target.value);
    document.getElementById('vo-anim-val').textContent = voAnimSpeed;
    if (voAnimSpeed > 0 && !voHasBase) voStoreBase();
  });
  document.getElementById('slider-vo-power').addEventListener('input', function(e) {
    voPower = parseFloat(e.target.value);
    document.getElementById('vo-power-val').textContent = voPower.toFixed(1);
    voNeedsRecompute = true;
  });
  document.getElementById('slider-vo-wrange').addEventListener('input', function(e) {
    voWeightRange = parseInt(e.target.value);
    document.getElementById('vo-wrange-val').textContent = voWeightRange;
    voApplyWeights();
    voNeedsRecompute = true;
  });

  // Select handlers
  document.getElementById('vo-metric').addEventListener('change', function(e) {
    voMetric = e.target.value;
    voUpdateStatus();
    voNeedsRecompute = true;
    voRender();
  });
  document.getElementById('vo-dmode').addEventListener('change', function(e) {
    voDisplayMode = e.target.value;
    voApplyWeights();
    voUpdateStatus();
    voNeedsRecompute = true;
    voRender();
  });

  // Initialize (moved from bootstrap)
  voInit();
