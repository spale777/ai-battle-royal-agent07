// ============================================================
  //  EXPERIMENT 21 — Wolfram Elementary Cellular Automata
  //  1D cellular automaton with scrolling display
  // ============================================================
  var wcaCanvas = document.getElementById('canvas21');
  var wcaCtx = wcaCanvas.getContext('2d');
  var wcaW = wcaCanvas.width;
  var wcaH = wcaCanvas.height;

  // Parameters
  var wcaRule = 30;
  var wcaSpeed = 2;       // rows per frame
  var wcaCellSize = 2;    // pixel size per cell
  var wcaHueOffset = 30;
  var wcaPalette = 'amber';
  var wcaSeedMode = 'single';

  // Grid dimensions (derived from cell size)
  var wcaCols = Math.floor(wcaW / wcaCellSize);
  var wcaRows = Math.floor(wcaH / wcaCellSize);

  // State: two arrays for double-buffering
  var wcaCurrent = new Uint8Array(wcaCols);
  var wcaNext = new Uint8Array(wcaCols);
  var wcaRowIdx = 0;       // current row being written to display
  var wcaTotalRows = 0;   // total rows computed

  // Precompute rule lookup table (8 entries for 3-bit neighborhood)
  var wcaRuleTable = new Uint8Array(8);
  function wcaBuildRuleTable(rule) {
    for (var i = 0; i < 8; i++) {
      wcaRuleTable[i] = (rule >> i) & 1;
    }
  }

  // Color palette function: returns [r,g,b] for a cell at given row
  function wcaCellColor(rowIdx) {
    var t = rowIdx / wcaRows; // 0..1 top to bottom
    var h, s, l;
    switch (wcaPalette) {
      case 'fire':
        h = (wcaHueOffset + t * 40) % 360;
        s = 90; l = 50 + t * 15;
        break;
      case 'ocean':
        h = (wcaHueOffset + 180 + t * 60) % 360;
        s = 70; l = 45 + t * 20;
        break;
      case 'electric':
        h = (wcaHueOffset + 200 + t * 100) % 360;
        s = 95; l = 55;
        break;
      case 'rainbow':
        h = (wcaHueOffset + t * 300) % 360;
        s = 80; l = 55;
        break;
      case 'grayscale':
        h = 0; s = 0; l = 70 + t * 25;
        break;
      default: // amber
        h = (wcaHueOffset + t * 20) % 360;
        s = 85; l = 50 + t * 15;
        break;
    }
    return 'hsl(' + h + ',' + s + '%,' + l + '%)';
  }

  // Background color (dark)
  function wcaBgColor() {
    switch (wcaPalette) {
      case 'fire': return '#0a0503';
      case 'ocean': return '#03080a';
      case 'electric': return '#03030a';
      case 'rainbow': return '#0a0a0b';
      case 'grayscale': return '#0a0a0a';
      default: return '#0a0a0b';
    }
  }

  // Seed the initial row
  function wcaSeed() {
    wcaCurrent.fill(0);
    wcaNext.fill(0);
    var c = wcaCols >> 1;
    switch (wcaSeedMode) {
      case 'random':
        for (var i = 0; i < wcaCols; i++) {
          wcaCurrent[i] = Math.random() < 0.5 ? 1 : 0;
        }
        break;
      case 'left':
        wcaCurrent[0] = 1;
        break;
      case 'double':
        wcaCurrent[c - 1] = 1;
        wcaCurrent[c + 1] = 1;
        break;
      default: // single center
        wcaCurrent[c] = 1;
        break;
    }
  }

  // Compute next row from current
  function wcaComputeRow() {
    for (var i = 0; i < wcaCols; i++) {
      var left = wcaCurrent[(i - 1 + wcaCols) % wcaCols];
      var center = wcaCurrent[i];
      var right = wcaCurrent[(i + 1) % wcaCols];
      var idx = (left << 2) | (center << 1) | right;
      wcaNext[i] = wcaRuleTable[idx];
    }
    // Swap
    var tmp = wcaCurrent;
    wcaCurrent = wcaNext;
    wcaNext = tmp;
    wcaTotalRows++;
  }

  // Draw a single row to canvas at y position
  function wcaDrawRow(yPx) {
    var color = wcaCellColor(wcaRowIdx);
    wcaCtx.fillStyle = color;
    for (var i = 0; i < wcaCols; i++) {
      if (wcaCurrent[i]) {
        wcaCtx.fillRect(i * wcaCellSize, yPx, wcaCellSize, wcaCellSize);
      }
    }
  }

  // Step: compute rows and draw them
  function wcaStep() {
    // Scroll up by wcaSpeed rows
    var scrollPx = wcaSpeed * wcaCellSize;
    // Grab the image data and shift it up
    var imgData = wcaCtx.getImageData(0, scrollPx, wcaW, wcaH - scrollPx);
    wcaCtx.fillStyle = wcaBgColor();
    wcaCtx.fillRect(0, 0, wcaW, wcaH);
    wcaCtx.putImageData(imgData, 0, 0);

    // Draw new rows at the bottom
    for (var s = 0; s < wcaSpeed; s++) {
      wcaComputeRow();
      wcaRowIdx = wcaRows - wcaSpeed + s;
      var yPx = (wcaRows - wcaSpeed + s) * wcaCellSize;
      wcaDrawRow(yPx);
    }
    wcaRowIdx = wcaRows - 1;

    document.getElementById('wca-row-stat').textContent = wcaTotalRows.toLocaleString();
  }

  // Full render
  function wcaRender() {
    wcaCtx.fillStyle = wcaBgColor();
    wcaCtx.fillRect(0, 0, wcaW, wcaH);
    var savedCurrent = new Uint8Array(wcaCurrent);
    var savedNext = new Uint8Array(wcaNext);
    var savedTotal = wcaTotalRows;

    // Re-seed and recompute all rows
    wcaSeed();
    wcaBuildRuleTable(wcaRule);
    for (var r = 0; r < wcaRows; r++) {
      wcaDrawRow(r * wcaCellSize);
      wcaComputeRow();
    }

    // Restore current state for continuation
    wcaCurrent = savedCurrent;
    wcaNext = savedNext;
    wcaTotalRows = savedTotal;
  }

  // Reset
  function wcaReset() {
    wcaCols = Math.floor(wcaW / wcaCellSize);
    wcaRows = Math.floor(wcaH / wcaCellSize);
    wcaCurrent = new Uint8Array(wcaCols);
    wcaNext = new Uint8Array(wcaCols);
    wcaRowIdx = 0;
    wcaTotalRows = 0;
    wcaBuildRuleTable(wcaRule);
    wcaSeed();
    wcaCtx.fillStyle = wcaBgColor();
    wcaCtx.fillRect(0, 0, wcaW, wcaH);
    // Draw initial row at top
    wcaDrawRow(0);
    wcaRowIdx = 0;
    document.getElementById('wca-row-stat').textContent = '0';
  }

  // Randomize
  function wcaRandomize() {
    wcaRule = Math.floor(Math.random() * 256);
    wcaHueOffset = Math.floor(Math.random() * 360);
    var palettes = ['amber', 'fire', 'ocean', 'electric', 'rainbow', 'grayscale'];
    wcaPalette = palettes[Math.floor(Math.random() * palettes.length)];
    var seeds = ['single', 'random', 'left', 'double'];
    wcaSeedMode = seeds[Math.floor(Math.random() * seeds.length)];

    // Update UI
    document.getElementById('slider-wca-rule').value = wcaRule;
    document.getElementById('wca-rule-val').textContent = wcaRule;
    document.getElementById('wca-rule-stat').textContent = wcaRule;
    document.getElementById('slider-wca-hue').value = wcaHueOffset;
    document.getElementById('wca-hue-val').textContent = wcaHueOffset;
    document.getElementById('wca-palette').value = wcaPalette;
    document.getElementById('wca-seed').value = wcaSeedMode;

    // Update preset button states
    document.querySelectorAll('#wca-presets .preset-btn').forEach(function(btn) {
      btn.classList.toggle('active', parseInt(btn.dataset.preset) === wcaRule);
    });

    wcaReset();
  }

  // Click to inject cells
  wcaCanvas.addEventListener('click', function(e) {
    var rect = wcaCanvas.getBoundingClientRect();
    var scaleX = wcaW / rect.width;
    var scaleY = wcaH / rect.height;
    var x = (e.clientX - rect.left) * scaleX;
    var y = (e.clientY - rect.top) * scaleY;
    var col = Math.floor(x / wcaCellSize);
    var row = Math.floor(y / wcaCellSize);
    if (col >= 0 && col < wcaCols) {
      wcaCurrent[col] = wcaCurrent[col] ? 0 : 1;
      // Draw the modified row
      var yPx = row * wcaCellSize;
      // Clear the row strip and redraw
      wcaCtx.fillStyle = wcaBgColor();
      wcaCtx.fillRect(0, yPx, wcaW, wcaCellSize);
      wcaRowIdx = row;
      wcaDrawRow(yPx);
    }
  });

  // Controls
  var wcaPauseBtn = document.getElementById('wca-pause');
  wcaPauseBtn.addEventListener('click', function() {
    expPaused[20] = !expPaused[20];
    wcaPauseBtn.textContent = expPaused[20] ? 'Resume' : 'Pause';
  });
  document.getElementById('wca-reset').addEventListener('click', function() {
    wcaReset();
  });
  document.getElementById('wca-randomize').addEventListener('click', function() {
    wcaRandomize();
  });
  document.getElementById('wca-clear').addEventListener('click', function() {
    wcaCtx.fillStyle = wcaBgColor();
    wcaCtx.fillRect(0, 0, wcaW, wcaH);
    wcaCurrent.fill(0);
    wcaNext.fill(0);
    wcaTotalRows = 0;
    document.getElementById('wca-row-stat').textContent = '0';
  });

  // Preset buttons
  document.querySelectorAll('#wca-presets .preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#wca-presets .preset-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      wcaRule = parseInt(btn.dataset.preset);
      document.getElementById('slider-wca-rule').value = wcaRule;
      document.getElementById('wca-rule-val').textContent = wcaRule;
      document.getElementById('wca-rule-stat').textContent = wcaRule;
      wcaReset();
    });
  });

  // Sliders
  document.getElementById('slider-wca-rule').addEventListener('input', function(e) {
    wcaRule = parseInt(e.target.value);
    document.getElementById('wca-rule-val').textContent = wcaRule;
    document.getElementById('wca-rule-stat').textContent = wcaRule;
    // Update preset buttons
    document.querySelectorAll('#wca-presets .preset-btn').forEach(function(btn) {
      btn.classList.toggle('active', parseInt(btn.dataset.preset) === wcaRule);
    });
    wcaBuildRuleTable(wcaRule);
    wcaReset();
  });
  document.getElementById('slider-wca-speed').addEventListener('input', function(e) {
    wcaSpeed = parseInt(e.target.value);
    document.getElementById('wca-speed-val').textContent = wcaSpeed;
  });
  document.getElementById('slider-wca-cell').addEventListener('change', function(e) {
    wcaCellSize = parseInt(e.target.value);
    document.getElementById('wca-cell-val').textContent = wcaCellSize;
    wcaReset();
  });
  document.getElementById('slider-wca-hue').addEventListener('input', function(e) {
    wcaHueOffset = parseInt(e.target.value);
    document.getElementById('wca-hue-val').textContent = wcaHueOffset;
    wcaRender();
  });
  document.getElementById('wca-palette').addEventListener('change', function(e) {
    wcaPalette = e.target.value;
    wcaReset();
  });
  document.getElementById('wca-seed').addEventListener('change', function(e) {
    wcaSeedMode = e.target.value;
    wcaReset();
  });

  // Initialize
  wcaReset();
