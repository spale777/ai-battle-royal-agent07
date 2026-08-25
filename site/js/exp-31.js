// ============================================================
  //  EXPERIMENT 31 — Marching Squares & Metaballs
  // ============================================================
  const msCanvas = document.getElementById('canvas31');
  const msCtx = msCanvas.getContext('2d');
  const msW = 600, msH = 400;

  // Parameters
  let msNumBlobs = 8;
  let msBlobSize = 40;
  let msThreshold = 1.0;
  let msSpeed = 1.0;
  let msGridRes = 2;           // pixels per grid cell
  let msLineWidth = 2;
  let msHueOffset = 0;
  let msMode = 'contour';      // 'contour', 'filled', 'both', 'field'
  let msColorMode = 'spectrum';
  let msFadePct = 0;
  let msPresetName = 'Classic Blobs';

  // Grid
  let msGW = 0, msGH = 0;       // grid dimensions
  let msField = null;           // Float32Array for scalar field
  let msImageData = null;

  // Blobs
  let msBlobs = [];
  let msDragging = -1;
  let msMouseDown = false;

  function msBlob(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
  }

  function msAllocGrid() {
    msGW = Math.floor(msW / msGridRes);
    msGH = Math.floor(msH / msGridRes);
    msField = new Float32Array(msGW * msGH);
    msImageData = null;
  }

  function msFieldAt(x, y) {
    var total = 0;
    for (var i = 0; i < msBlobs.length; i++) {
      var b = msBlobs[i];
      var dx = x - b.x;
      var dy = y - b.y;
      var d2 = dx * dx + dy * dy;
      total += (b.r * b.r) / (d2 + 0.01);
    }
    return total;
  }

  function msComputeField() {
    var res = msGridRes;
    var gw = msGW, gh = msGH;
    for (var gy = 0; gy < gh; gy++) {
      for (var gx = 0; gx < gw; gx++) {
        var px = gx * res;
        var py = gy * res;
        msField[gy * gw + gx] = msFieldAt(px, py);
      }
    }
  }

  // Marching Squares — returns array of line segments [{x1,y1,x2,y2}]
  function msMarchingSquares() {
    var gw = msGW, gh = msGH;
    var T = msThreshold;
    var res = msGridRes;
    var segments = [];

    for (var gy = 0; gy < gh - 1; gy++) {
      for (var gx = 0; gx < gw - 1; gx++) {
        // 4 corner values
        var i00 = gy * gw + gx;           // bottom-left
        var i10 = gy * gw + gx + 1;       // bottom-right
        var i01 = (gy + 1) * gw + gx;     // top-left
        var i11 = (gy + 1) * gw + gx + 1; // top-right

        var v00 = msField[i00];
        var v10 = msField[i10];
        var v01 = msField[i01];
        var v11 = msField[i11];

        // Classify corners: 1 if above threshold
        var c00 = v00 >= T ? 1 : 0;
        var c10 = v10 >= T ? 1 : 0;
        var c11 = v11 >= T ? 1 : 0;
        var c01 = v01 >= T ? 1 : 0;

        var caseIdx = (c00 | (c10 << 1) | (c11 << 2) | (c01 << 3));

        if (caseIdx === 0 || caseIdx === 15) continue;

        // Interpolate edge crossing points
        // Edges: bottom (00->10), right (10->11), top (01->11), left (00->01)
        function interpEdge(a, b, va, vb, t) {
          if (vb === va) return a;
          return a + (b - a) * (t - va) / (vb - va);
        }

        var px = gx * res;
        var py = gy * res;
        var px1 = (gx + 1) * res;
        var py1 = (gy + 1) * res;

        // Bottom edge: between (px,py) and (px1,py)
        var bx, by_ = py;
        if (c00 !== c10) bx = interpEdge(px, px1, v00, v10, T);

        // Right edge: between (px1,py) and (px1,py1)
        var rx = px1, ry;
        if (c10 !== c11) ry = interpEdge(py, py1, v10, v11, T);

        // Top edge: between (px,py1) and (px1,py1)
        var tx, ty = py1;
        if (c01 !== c11) tx = interpEdge(px, px1, v01, v11, T);

        // Left edge: between (px,py) and (px,py1)
        var lx = px, ly;
        if (c00 !== c01) ly = interpEdge(py, py1, v00, v01, T);

        // Generate segments based on case
        switch (caseIdx) {
          case 1:  case 14: // bottom-left
            segments.push({x1: lx, y1: ly, x2: bx, y2: by_});
            break;
          case 2:  case 13: // bottom-right
            segments.push({x1: bx, y1: by_, x2: rx, y2: ry});
            break;
          case 3:  case 12: // bottom half
            segments.push({x1: lx, y1: ly, x2: rx, y2: ry});
            break;
          case 4:  case 11: // top-right
            segments.push({x1: rx, y1: ry, x2: tx, y2: ty});
            break;
          case 5:          // saddle: bottom-left + top-right
            segments.push({x1: lx, y1: ly, x2: bx, y2: by_});
            segments.push({x1: rx, y1: ry, x2: tx, y2: ty});
            break;
          case 6:  case 9:  // right half
            segments.push({x1: bx, y1: by_, x2: tx, y2: ty});
            break;
          case 7:  case 8:  // top half (excluding bottom-left)
            segments.push({x1: lx, y1: ly, x2: tx, y2: ty});
            break;
          case 10:         // saddle: bottom-right + top-left
            segments.push({x1: bx, y1: by_, x2: rx, y2: ry});
            segments.push({x1: lx, y1: ly, x2: tx, y2: ty});
            break;
        }
      }
    }

    return segments;
  }

  // Color helper
  function msGetColor(t) {
    // t: 0..1 (normalized field value or position-based)
    if (msColorMode === 'mono') {
      var v = Math.floor(40 + t * 200);
      return 'rgb(' + v + ',' + v + ',' + v + ')';
    }
    var hue, sat, light;
    if (msColorMode === 'spectrum') {
      hue = (msHueOffset + t * 360) % 360;
      sat = 85; light = 55;
    } else if (msColorMode === 'fire') {
      hue = (msHueOffset + t * 60) % 360;
      if (hue < 0) hue += 360;
      sat = 100; light = 25 + t * 45;
    } else if (msColorMode === 'ocean') {
      hue = (msHueOffset + 160 + t * 80) % 360;
      if (hue < 0) hue += 360;
      sat = 80; light = 30 + t * 40;
    } else if (msColorMode === 'electric') {
      hue = (msHueOffset + 180 + t * 120) % 360;
      if (hue < 0) hue += 360;
      sat = 100; light = 40 + t * 30;
    } else {
      hue = 0; sat = 0; light = 50;
    }
    var rgb = hslToRgb(hue, sat / 100, light / 100);
    return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
  }

  function msRenderField() {
    // Render scalar field as heat-map
    var cw = msCanvas.width, ch = msCanvas.height;
    if (!msImageData || msImageData.width !== cw || msImageData.height !== ch) {
      msImageData = msCtx.createImageData(cw, ch);
    }
    var data = msImageData.data;
    var res = msGridRes;
    var gw = msGW, gh = msGH;

    // For each pixel, sample field and color it
    for (var py = 0; py < ch; py++) {
      var gy = Math.floor(py / res);
      if (gy >= gh) gy = gh - 1;
      for (var px = 0; px < cw; px++) {
        var gx = Math.floor(px / res);
        if (gx >= gw) gx = gw - 1;
        var v = msField[gy * gw + gx];
        // Normalize: map field to 0..1 (clamp above threshold)
        var t = Math.min(v / (msThreshold * 3), 1);
        var rgb;
        if (msColorMode === 'mono') {
          var gv = Math.floor(t * 255);
          rgb = [gv, gv, gv];
        } else {
          var hue, sat, light;
          if (msColorMode === 'spectrum') {
            hue = (msHueOffset + t * 360) % 360;
            sat = 90; light = 20 + t * 50;
          } else if (msColorMode === 'fire') {
            hue = (msHueOffset + t * 60) % 360;
            if (hue < 0) hue += 360;
            sat = 100; light = 15 + t * 55;
          } else if (msColorMode === 'ocean') {
            hue = (msHueOffset + 160 + t * 80) % 360;
            if (hue < 0) hue += 360;
            sat = 80; light = 20 + t * 50;
          } else if (msColorMode === 'electric') {
            hue = (msHueOffset + 180 + t * 120) % 360;
            if (hue < 0) hue += 360;
            sat = 100; light = 25 + t * 45;
          } else {
            hue = 0; sat = 0; light = t * 80;
          }
          rgb = hslToRgb(hue, sat / 100, light / 100);
        }
        var di = (py * cw + px) * 4;
        data[di] = rgb[0];
        data[di + 1] = rgb[1];
        data[di + 2] = rgb[2];
        data[di + 3] = 255;
      }
    }
    msCtx.putImageData(msImageData, 0, 0);
  }

  function msRender() {
    msComputeField();
    var cw = msCanvas.width, ch = msCanvas.height;

    // Apply trail fade or clear
    if (msFadePct > 0) {
      msCtx.globalAlpha = 1 - msFadePct / 100;
      msCtx.fillStyle = '#0a0a0b';
      msCtx.fillRect(0, 0, cw, ch);
      msCtx.globalAlpha = 1;
    } else {
      msCtx.fillStyle = '#0a0a0b';
      msCtx.fillRect(0, 0, cw, ch);
    }

    if (msMode === 'field') {
      msRenderField();
      // Draw blob centers for reference
      msCtx.fillStyle = 'rgba(255,255,255,0.3)';
      for (var i = 0; i < msBlobs.length; i++) {
        msCtx.beginPath();
        msCtx.arc(msBlobs[i].x, msBlobs[i].y, 2, 0, Math.PI * 2);
        msCtx.fill();
      }
      return;
    }

    var segments = msMarchingSquares();

    // Filled mode: fill the interior of the contour
    if (msMode === 'filled' || msMode === 'both') {
      // Use a clip path approach: draw field-based fill via ImageData
      // But faster approach: draw filled circles at high-alpha where field > threshold
      // Use grid-based approach for filled rendering
      var res = msGridRes;
      var gw = msGW, gh = msGH;
      var T = msThreshold;
      msCtx.save();
      for (var gy = 0; gy < gh; gy++) {
        for (var gx = 0; gx < gw; gx++) {
          var v = msField[gy * gw + gx];
          if (v >= T) {
            var t = Math.min((v - T) / (T * 2), 1);
            // Position-based hue for variety
            var posT = (gx / gw + gy / gh) * 0.5;
            msCtx.fillStyle = msGetColor(posT + t * 0.3);
            msCtx.globalAlpha = 0.15 + t * 0.5;
            msCtx.fillRect(gx * res, gy * res, res, res);
          }
        }
      }
      msCtx.globalAlpha = 1;
      msCtx.restore();
    }

    // Draw contour lines
    if (msMode === 'contour' || msMode === 'both') {
      msCtx.lineWidth = msLineWidth;
      msCtx.lineCap = 'round';
      msCtx.lineJoin = 'round';

      // Color by blob proximity: use segment position to determine hue
      for (var i = 0; i < segments.length; i++) {
        var s = segments[i];
        var mx = (s.x1 + s.x2) / 2;
        var my = (s.y1 + s.y2) / 2;
        // Hue based on position for a nice spatial gradient
        var t = (mx / msW + my / msH) * 0.5;
        msCtx.strokeStyle = msGetColor(t);
        msCtx.beginPath();
        msCtx.moveTo(s.x1, s.y1);
        msCtx.lineTo(s.x2, s.y2);
        msCtx.stroke();
      }
    }

    // Update blob count display
    var countEl = document.getElementById('ms-count-val');
    if (countEl) countEl.textContent = msBlobs.length;
  }

  function msStep() {
    var spd = msSpeed;
    for (var i = 0; i < msBlobs.length; i++) {
      var b = msBlobs[i];
      if (msPresetName === 'Gravity Pool') {
        // Attract toward center
        var dxc = msW / 2 - b.x;
        var dyc = msH / 2 - b.y;
        var dc = Math.sqrt(dxc * dxc + dyc * dyc) + 1;
        b.vx += dxc / dc * 0.05 * spd;
        b.vy += dyc / dc * 0.05 * spd;
        // Damping
        b.vx *= 0.98;
        b.vy *= 0.98;
      } else if (msPresetName === 'Orbit Dance') {
        // Orbital motion
        var cx = msW / 2, cy = msH / 2;
        var dx_ = b.x - cx, dy_ = b.y - cy;
        var r = Math.sqrt(dx_ * dx_ + dy_ * dy_) + 1;
        var ang = Math.atan2(dy_, dx_);
        ang += 0.01 * spd;
        b.x = cx + r * Math.cos(ang);
        b.y = cy + r * Math.sin(ang);
        continue;
      } else if (msPresetName === 'Grid March') {
        // Organized grid positions — no movement
        continue;
      }

      b.x += b.vx * spd;
      b.y += b.vy * spd;

      // Bounce off walls
      if (b.x < b.r * 0.3) { b.x = b.r * 0.3; b.vx = Math.abs(b.vx); }
      if (b.x > msW - b.r * 0.3) { b.x = msW - b.r * 0.3; b.vx = -Math.abs(b.vx); }
      if (b.y < b.r * 0.3) { b.y = b.r * 0.3; b.vy = Math.abs(b.vy); }
      if (b.y > msH - b.r * 0.3) { b.y = msH - b.r * 0.3; b.vy = -Math.abs(b.vy); }
    }
  }

  function msRandomize() {
    msBlobs = [];
    for (var i = 0; i < msNumBlobs; i++) {
      var b = new msBlob(
        Math.random() * msW,
        Math.random() * msH,
        msBlobSize * (0.7 + Math.random() * 0.6)
      );
      b.vx = (Math.random() - 0.5) * 3;
      b.vy = (Math.random() - 0.5) * 3;
      msBlobs.push(b);
    }
    msRender();
  }

  function msClear() {
    msBlobs = [];
    msRender();
  }

  function msLoadPreset(name) {
    var presetLabels = {
      'blobs': 'Classic Blobs',
      'gravity': 'Gravity Pool',
      'orbit': 'Orbit Dance',
      'spray': 'Spray',
      'fountain': 'Fountain',
      'grid': 'Grid March',
      'chaos': 'Chaos Cloud'
    };
    msPresetName = presetLabels[name] || name;
    var statusEl = document.getElementById('ms-status');
    if (statusEl) statusEl.textContent = 'Metaballs \u00b7 ' + msPresetName;

    if (name === 'blobs') {
      msNumBlobs = 8; msBlobSize = 40; msThreshold = 1.0;
      msMode = 'contour'; msColorMode = 'spectrum'; msHueOffset = 0;
      msRandomize();
    } else if (name === 'gravity') {
      msNumBlobs = 6; msBlobSize = 45; msThreshold = 1.0;
      msMode = 'filled'; msColorMode = 'ocean'; msHueOffset = 180;
      msBlobs = [];
      for (var i = 0; i < msNumBlobs; i++) {
        var b = new msBlob(
          100 + Math.random() * 400,
          100 + Math.random() * 200,
          msBlobSize * (0.8 + Math.random() * 0.4)
        );
        b.vx = (Math.random() - 0.5) * 5;
        b.vy = (Math.random() - 0.5) * 5;
        msBlobs.push(b);
      }
      msRender();
    } else if (name === 'orbit') {
      msNumBlobs = 10; msBlobSize = 30; msThreshold = 0.8;
      msMode = 'contour'; msColorMode = 'electric'; msHueOffset = 200;
      msBlobs = [];
      for (var i = 0; i < msNumBlobs; i++) {
        var angle = (i / msNumBlobs) * Math.PI * 2;
        var radius = 120 + (i % 3) * 40;
        var b = new msBlob(
          msW / 2 + Math.cos(angle) * radius,
          msH / 2 + Math.sin(angle) * radius,
          msBlobSize
        );
        msBlobs.push(b);
      }
      msRender();
    } else if (name === 'spray') {
      msNumBlobs = 15; msBlobSize = 25; msThreshold = 1.2;
      msMode = 'both'; msColorMode = 'fire'; msHueOffset = 0;
      msRandomize();
    } else if (name === 'fountain') {
      msNumBlobs = 12; msBlobSize = 30; msThreshold = 1.0;
      msMode = 'both'; msColorMode = 'spectrum'; msHueOffset = 120;
      msBlobs = [];
      for (var i = 0; i < msNumBlobs; i++) {
        var b = new msBlob(
          msW / 2 + (Math.random() - 0.5) * 60,
          msH - 50,
          msBlobSize * (0.6 + Math.random() * 0.8)
        );
        b.vx = (Math.random() - 0.5) * 4;
        b.vy = -3 - Math.random() * 4;
        msBlobs.push(b);
      }
      msRender();
    } else if (name === 'grid') {
      msNumBlobs = 16; msBlobSize = 35; msThreshold = 1.0;
      msMode = 'contour'; msColorMode = 'mono'; msHueOffset = 0;
      msBlobs = [];
      var cols = 4, rows_ = 4;
      for (var r = 0; r < rows_; r++) {
        for (var c = 0; c < cols; c++) {
          var b = new msBlob(
            (c + 0.5) * msW / cols,
            (r + 0.5) * msH / rows_,
            msBlobSize
          );
          msBlobs.push(b);
        }
      }
      msRender();
    } else if (name === 'chaos') {
      msNumBlobs = 20; msBlobSize = 20; msThreshold = 1.5;
      msMode = 'contour'; msColorMode = 'spectrum'; msHueOffset = 280;
      msRandomize();
    }

    // Sync UI controls
    var numSlider = document.getElementById('slider-ms-num');
    if (numSlider) { numSlider.value = msNumBlobs; document.getElementById('ms-num-val').textContent = msNumBlobs; }
    var sizeSlider = document.getElementById('slider-ms-size');
    if (sizeSlider) { sizeSlider.value = msBlobSize; document.getElementById('ms-size-val').textContent = msBlobSize; }
    var threshSlider = document.getElementById('slider-ms-thresh');
    if (threshSlider) { threshSlider.value = msThreshold; document.getElementById('ms-thresh-val').textContent = msThreshold.toFixed(2); }
    var hueSlider = document.getElementById('slider-ms-hue');
    if (hueSlider) { hueSlider.value = msHueOffset; document.getElementById('ms-hue-val').textContent = msHueOffset; }
    var modeSelect = document.getElementById('ms-mode');
    if (modeSelect) modeSelect.value = msMode;
    var colorSelect = document.getElementById('ms-color');
    if (colorSelect) colorSelect.value = msColorMode;
  }

  function msInit() {
    msAllocGrid();
    msLoadPreset('blobs');

    // Mouse interaction
    function getMousePos(e) {
      var rect = msCanvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (msCanvas.width / rect.width),
        y: (e.clientY - rect.top) * (msCanvas.height / rect.height)
      };
    }

    function findBlob(x, y) {
      for (var i = msBlobs.length - 1; i >= 0; i--) {
        var b = msBlobs[i];
        var dx = x - b.x, dy = y - b.y;
        if (dx * dx + dy * dy < b.r * b.r * 0.5) return i;
      }
      return -1;
    }

    msCanvas.addEventListener('mousedown', function(e) {
      msMouseDown = true;
      var p = getMousePos(e);
      var idx = findBlob(p.x, p.y);
      if (idx >= 0) {
        msDragging = idx;
      } else {
        // Spawn new blob at click position
        var b = new msBlob(p.x, p.y, msBlobSize * (0.8 + Math.random() * 0.4));
        b.vx = (Math.random() - 0.5) * 2;
        b.vy = (Math.random() - 0.5) * 2;
        msBlobs.push(b);
        if (msBlobs.length > 50) msBlobs.shift(); // limit
      }
      msRender();
    });

    msCanvas.addEventListener('mousemove', function(e) {
      if (!msMouseDown) return;
      var p = getMousePos(e);
      if (msDragging >= 0 && msBlobs[msDragging]) {
        msBlobs[msDragging].x = p.x;
        msBlobs[msDragging].y = p.y;
        msBlobs[msDragging].vx = 0;
        msBlobs[msDragging].vy = 0;
      }
      msRender();
    });

    msCanvas.addEventListener('mouseup', function() {
      msMouseDown = false;
      msDragging = -1;
    });

    msCanvas.addEventListener('mouseleave', function() {
      msMouseDown = false;
      msDragging = -1;
    });

    // Touch support
    msCanvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      var t = e.touches[0];
      var rect = msCanvas.getBoundingClientRect();
      var x = (t.clientX - rect.left) * (msCanvas.width / rect.width);
      var y = (t.clientY - rect.top) * (msCanvas.height / rect.height);
      var b = new msBlob(x, y, msBlobSize * (0.8 + Math.random() * 0.4));
      msBlobs.push(b);
      if (msBlobs.length > 50) msBlobs.shift();
      msRender();
    });

    // Pause
    document.getElementById('ms-pause').addEventListener('click', function() {
      expPaused[30] = !expPaused[30];
      this.textContent = expPaused[30] ? 'Resume' : 'Pause';
    });

    // Reset
    document.getElementById('ms-reset').addEventListener('click', function() {
      msLoadPreset('blobs');
      document.querySelectorAll('#ms-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
      document.querySelector('#ms-presets .preset-btn[data-preset="blobs"]').classList.add('active');
    });

    // Randomize
    document.getElementById('ms-randomize').addEventListener('click', function() {
      msRandomize();
    });

    // Clear
    document.getElementById('ms-clear').addEventListener('click', function() {
      msClear();
    });

    // Save PNG
    document.getElementById('ms-save').addEventListener('click', function() {
      var link = document.createElement('a');
      link.download = 'metaballs-' + msPresetName.toLowerCase().replace(/\s+/g, '-') + '.png';
      link.href = msCanvas.toDataURL();
      link.click();
    });

    // Presets
    document.querySelectorAll('#ms-presets .preset-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#ms-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        msLoadPreset(this.dataset.preset);
      });
    });

    // Sliders
    document.getElementById('slider-ms-num').addEventListener('input', function() {
      msNumBlobs = parseInt(this.value);
      document.getElementById('ms-num-val').textContent = msNumBlobs;
      // Adjust blob count
      while (msBlobs.length < msNumBlobs) {
        var b = new msBlob(Math.random() * msW, Math.random() * msH, msBlobSize * (0.8 + Math.random() * 0.4));
        b.vx = (Math.random() - 0.5) * 3;
        b.vy = (Math.random() - 0.5) * 3;
        msBlobs.push(b);
      }
      while (msBlobs.length > msNumBlobs) msBlobs.pop();
      msRender();
    });

    document.getElementById('slider-ms-size').addEventListener('input', function() {
      msBlobSize = parseInt(this.value);
      document.getElementById('ms-size-val').textContent = msBlobSize;
      for (var i = 0; i < msBlobs.length; i++) {
        msBlobs[i].r = msBlobSize * (0.8 + (i % 3) * 0.1);
      }
      msRender();
    });

    document.getElementById('slider-ms-thresh').addEventListener('input', function() {
      msThreshold = parseFloat(this.value);
      document.getElementById('ms-thresh-val').textContent = msThreshold.toFixed(2);
      msRender();
    });

    document.getElementById('slider-ms-speed').addEventListener('input', function() {
      msSpeed = parseFloat(this.value);
      document.getElementById('ms-speed-val').textContent = msSpeed.toFixed(1);
    });

    document.getElementById('slider-ms-res').addEventListener('input', function() {
      msGridRes = parseInt(this.value);
      document.getElementById('ms-res-val').textContent = msGridRes;
      msAllocGrid();
      msRender();
    });

    document.getElementById('slider-ms-lw').addEventListener('input', function() {
      msLineWidth = parseFloat(this.value);
      document.getElementById('ms-lw-val').textContent = msLineWidth;
      msRender();
    });

    document.getElementById('slider-ms-hue').addEventListener('input', function() {
      msHueOffset = parseInt(this.value);
      document.getElementById('ms-hue-val').textContent = msHueOffset;
      msRender();
    });

    document.getElementById('ms-mode').addEventListener('change', function() {
      msMode = this.value;
      msRender();
    });

    document.getElementById('ms-color').addEventListener('change', function() {
      msColorMode = this.value;
      msRender();
    });

    document.getElementById('slider-ms-fade').addEventListener('input', function() {
      msFadePct = parseInt(this.value);
      document.getElementById('ms-fade-val').textContent = msFadePct;
    });
  }

  msInit();
