// ============================================================
  //  EXPERIMENT 27 — 3D Wireframe Solids
  // ============================================================
  const wfCanvas = document.getElementById('canvas27');
  const wfCtx = wfCanvas.getContext('2d');
  let wfW = wfCanvas.width, wfH = wfCanvas.height;

  let wfVerts = [];      // [[x,y,z], ...]
  let wfEdges = [];      // [[i,j], ...]
  let wfName = 'Tetrahedron';

  let wfRotX = 0, wfRotY = 0, wfRotZ = 0;
  let wfManualPitch = -0.3;
  let wfManualYaw = 0;
  let wfSpinX = 0.4, wfSpinY = 0.6, wfSpinZ = 0;
  let wfScale = 1, wfPersp = 3, wfLineW = 1.5, wfHue = 190, wfGlow = 4;
  let wfMode = 'wire';
  let wfDragging = false, wfLastMX = 0, wfLastMY = 0;

  // --- Polyhedron definitions ---
  const PHI = (1 + Math.sqrt(5)) / 2; // golden ratio

  function wfSetShape(verts, edges, name) {
    wfVerts = verts;
    wfEdges = edges;
    wfName = name;
    document.getElementById('wf-status').textContent = 'Wireframe \u00b7 ' + name;
    document.getElementById('wf-verts-stat').textContent = verts.length;
    document.getElementById('wf-edges-stat').textContent = edges.length;
    // re-center and normalize size
    wfNormalize();
  }

  function wfNormalize() {
    // center at origin, scale so max radius = 1
    let cx = 0, cy = 0, cz = 0;
    for (const v of wfVerts) { cx += v[0]; cy += v[1]; cz += v[2]; }
    cx /= wfVerts.length; cy /= wfVerts.length; cz /= wfVerts.length;
    let maxR = 0;
    for (const v of wfVerts) { v[0] -= cx; v[1] -= cy; v[2] -= cz; const r = Math.hypot(v[0], v[1], v[2]); if (r > maxR) maxR = r; }
    if (maxR > 0) { const s = 1 / maxR; for (const v of wfVerts) { v[0] *= s; v[1] *= s; v[2] *= s; } }
  }

  // Build edges by connecting all vertex pairs at the minimum non-zero distance.
  // Works for any regular/semi-regular convex polyhedron.
  function wfEdgesByMinDist(verts, tolerance) {
    tolerance = tolerance || 0.001;
    let minDist = Infinity;
    for (let i = 0; i < verts.length; i++) {
      for (let j = i + 1; j < verts.length; j++) {
        const d = Math.hypot(verts[i][0]-verts[j][0], verts[i][1]-verts[j][1], verts[i][2]-verts[j][2]);
        if (d > tolerance && d < minDist) minDist = d;
      }
    }
    const edges = [];
    for (let i = 0; i < verts.length; i++) {
      for (let j = i + 1; j < verts.length; j++) {
        const d = Math.hypot(verts[i][0]-verts[j][0], verts[i][1]-verts[j][1], verts[i][2]-verts[j][2]);
        if (Math.abs(d - minDist) < tolerance) edges.push([i, j]);
      }
    }
    return edges;
  }

  function wfLoadPreset(name) {
    let verts, edges;
    switch (name) {
      case 'tetra':
        verts = [[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]];
        edges = wfEdgesByMinDist(verts);
        wfSetShape(verts, edges, 'Tetrahedron');
        break;
      case 'cube':
        verts = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
        edges = wfEdgesByMinDist(verts);
        wfSetShape(verts, edges, 'Cube');
        break;
      case 'octa':
        verts = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
        edges = wfEdgesByMinDist(verts);
        wfSetShape(verts, edges, 'Octahedron');
        break;
      case 'dodeca': {
        // 20 vertices: cube corners + golden-ratio rectangles on each coordinate plane
        const a = 1, b = 1 / PHI, c = PHI;
        verts = [
          [a,a,a],[a,a,-a],[a,-a,a],[a,-a,-a],
          [-a,a,a],[-a,a,-a],[-a,-a,a],[-a,-a,-a],
          [0,b,c],[0,b,-c],[0,-b,c],[0,-b,-c],
          [b,c,0],[b,-c,0],[-b,c,0],[-b,-c,0],
          [c,0,b],[c,0,-b],[-c,0,b],[-c,0,-b]
        ];
        edges = wfEdgesByMinDist(verts);
        wfSetShape(verts, edges, 'Dodecahedron');
        break;
      }
      case 'icosa': {
        // 12 vertices: three golden rectangles on perpendicular planes
        verts = [
          [-1, PHI, 0],[1, PHI, 0],[-1,-PHI,0],[1,-PHI,0],
          [0,-1,PHI],[0,1,PHI],[0,-1,-PHI],[0,1,-PHI],
          [PHI,0,-1],[PHI,0,1],[-PHI,0,-1],[-PHI,0,1]
        ];
        edges = wfEdgesByMinDist(verts);
        wfSetShape(verts, edges, 'Icosahedron');
        break;
      }
      case 'star': {
        // Stella octangula — two interpenetrating tetrahedra (8 cube vertices)
        verts = [
          [1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1],  // tetra 1
          [1,-1,1],[-1,1,1],[-1,-1,-1],[1,1,-1]   // tetra 2 (dual)
        ];
        // Each tetrahedron has its own 6 edges; no cross edges
        edges = [
          [0,1],[0,2],[0,3],[1,2],[1,3],[2,3],
          [4,5],[4,6],[4,7],[5,6],[5,7],[6,7]
        ];
        wfSetShape(verts, edges, 'Stellated Octahedron');
        break;
      }
      case 'staricosa': {
        // Stellated icosahedron: original 12 verts + 20 spike verts (one per face)
        const base = [
          [-1, PHI, 0],[1, PHI, 0],[-1,-PHI,0],[1,-PHI,0],
          [0,-1,PHI],[0,1,PHI],[0,-1,-PHI],[0,1,-PHI],
          [PHI,0,-1],[PHI,0,1],[-PHI,0,-1],[-PHI,0,1]
        ];
        const faces = [
          [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
          [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
          [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
          [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
        ];
        const spikes = [];
        for (const f of faces) {
          let sx=0, sy=0, sz=0;
          for (const vi of f) { sx += base[vi][0]; sy += base[vi][1]; sz += base[vi][2]; }
          const cx = sx/3, cy = sy/3, cz = sz/3;
          const r = Math.hypot(cx, cy, cz);
          const s = 1.8 / r;
          spikes.push([cx*s, cy*s, cz*s]);
        }
        verts = base.concat(spikes);
        // Base edges (min dist) + spike-to-face-vertex edges
        edges = wfEdgesByMinDist(base);
        for (let i = 0; i < faces.length; i++) {
          const spikeIdx = base.length + i;
          for (const vi of faces[i]) edges.push([vi, spikeIdx]);
        }
        wfSetShape(verts, edges, 'Stellated Icosahedron');
        break;
      }
      case 'pyrito': {
        // Pyritohedron: same topology as dodecahedron but with lower symmetry.
        // Use golden-ratio dodecahedron vertices to compute the correct edge
        // list via min-distance, then replace vertices with pyritohedron coords
        // (using b≠1/φ to break the 5-fold symmetry down to 2-fold).
        const ga = 1, gb = 1 / PHI, gc = PHI;
        const goldVerts = [
          [ga,ga,ga],[ga,ga,-ga],[ga,-ga,ga],[ga,-ga,-ga],
          [-ga,ga,ga],[-ga,ga,-ga],[-ga,-ga,ga],[-ga,-ga,-ga],
          [0,gb,gc],[0,gb,-gc],[0,-gb,gc],[0,-gb,-gc],
          [gb,gc,0],[gb,-gc,0],[-gb,gc,0],[-gb,-gc,0],
          [gc,0,gb],[gc,0,-gb],[-gc,0,gb],[-gc,0,-gb]
        ];
        edges = wfEdgesByMinDist(goldVerts);
        // Now create pyritohedron coordinates with the same vertex ordering
        // but using a different ratio b/a (here b=0.7, c=a+b for planarity)
        const pa = 1, pb = 0.7, pc = pa + pb;
        verts = [
          [pa,pa,pa],[pa,pa,-pa],[pa,-pa,pa],[pa,-pa,-pa],
          [-pa,pa,pa],[-pa,pa,-pa],[-pa,-pa,pa],[-pa,-pa,-pa],
          [0,pb,pc],[0,pb,-pc],[0,-pb,pc],[0,-pb,-pc],
          [pb,pc,0],[pb,-pc,0],[-pb,pc,0],[-pb,-pc,0],
          [pc,0,pb],[pc,0,-pb],[-pc,0,pb],[-pc,0,-pb]
        ];
        wfSetShape(verts, edges, 'Pyritohedron');
        break;
      }
      case 'prism': {
        // Hexagonal prism
        verts = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          verts.push([Math.cos(a), Math.sin(a), -0.5]);
          verts.push([Math.cos(a), Math.sin(a), 0.5]);
        }
        edges = [];
        for (let i = 0; i < 12; i += 2) {
          edges.push([i, (i + 2) % 12]);
          edges.push([i + 1, (i + 3) % 12]);
          edges.push([i, i + 1]);
        }
        wfSetShape(verts, edges, 'Hex Prism');
        break;
      }
      case 'antiprism': {
        // Hexagonal antiprism: two hexagons offset by 30°, connected by triangles
        verts = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          verts.push([Math.cos(a), Math.sin(a), -0.5]);
        }
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          verts.push([Math.cos(a), Math.sin(a), 0.5]);
        }
        edges = [];
        for (let i = 0; i < 6; i++) edges.push([i, (i + 1) % 6]);           // bottom ring
        for (let i = 0; i < 6; i++) edges.push([6+i, 6+((i+1)%6)]);        // top ring
        for (let i = 0; i < 6; i++) { edges.push([i, 6+i]); edges.push([i, 6+((i+1)%6)]); } // sides
        wfSetShape(verts, edges, 'Hex Antiprism');
        break;
      }
      case 'bucky': {
        // Truncated icosahedron (C60) — 60 vertices, 90 edges
        // Standard coordinates via cyclic permutations
        const p = PHI;
        verts = [];
        // (0, ±1, ±3p) and cyclic permutations → 12+12+12 = 36
        const c1 = [[0,1,3*p],[0,1,-3*p],[0,-1,3*p],[0,-1,-3*p]];
        for (const [x,y,z] of c1) { verts.push([x,y,z]); verts.push([y,z,x]); verts.push([z,x,y]); }
        // (±2, ±(1+2p), ±p) and cyclic → 24
        const c2 = [[2,1+2*p,p],[2,1+2*p,-p],[2,-(1+2*p),p],[2,-(1+2*p),-p],
                    [-2,1+2*p,p],[-2,1+2*p,-p],[-2,-(1+2*p),p],[-2,-(1+2*p),-p]];
        for (const [x,y,z] of c2) { verts.push([x,y,z]); verts.push([y,z,x]); verts.push([z,x,y]); }
        // (±1, ±(2+p), ±2p) and cyclic → 24
        const c3 = [[1,2+p,2*p],[1,2+p,-2*p],[1,-(2+p),2*p],[1,-(2+p),-2*p],
                    [-1,2+p,2*p],[-1,2+p,-2*p],[-1,-(2+p),2*p],[-1,-(2+p),-2*p]];
        for (const [x,y,z] of c3) { verts.push([x,y,z]); verts.push([y,z,x]); verts.push([z,x,y]); }
        edges = wfEdgesByMinDist(verts);
        wfSetShape(verts, edges, 'Buckyball');
        break;
      }
      case 'torus': {
        // Torus wireframe lattice
        const R = 0.7, r = 0.3, segU = 24, segV = 12;
        verts = [];
        for (let i = 0; i < segU; i++) {
          const u = (i / segU) * Math.PI * 2;
          for (let j = 0; j < segV; j++) {
            const v = (j / segV) * Math.PI * 2;
            verts.push([(R + r*Math.cos(v))*Math.cos(u), (R + r*Math.cos(v))*Math.sin(u), r*Math.sin(v)]);
          }
        }
        edges = [];
        for (let i = 0; i < segU; i++) {
          for (let j = 0; j < segV; j++) {
            const idx = i * segV + j;
            edges.push([idx, ((i+1)%segU)*segV + j]);
            edges.push([idx, i*segV + ((j+1)%segV)]);
          }
        }
        wfSetShape(verts, edges, 'Torus');
        break;
      }
    }
  }

  function wfProject(v) {
    // rotate
    let x = v[0], y = v[1], z = v[2];
    // Rx (pitch)
    const ca = Math.cos(wfRotX + wfManualPitch), sa = Math.sin(wfRotX + wfManualPitch);
    let y1 = y * ca - z * sa;
    let z1 = y * sa + z * ca;
    // Ry (yaw)
    const cb = Math.cos(wfRotY + wfManualYaw), sb = Math.sin(wfRotY + wfManualYaw);
    let x1 = x * cb + z1 * sb;
    let z2 = -x * sb + z1 * cb;
    // Rz (roll)
    const cc = Math.cos(wfRotZ), sc = Math.sin(wfRotZ);
    let x2 = x1 * cc - y1 * sc;
    let y2 = x1 * sc + y1 * cc;

    // perspective
    const d = wfPersp;
    const denom = d + z2;
    const f = d / Math.max(0.01, denom);
    const sc2 = wfScale * 120 * f;
    return { sx: wfW / 2 + x2 * sc2, sy: wfH / 2 + y2 * sc2, z: z2 };
  }

  function wfRender() {
    wfCtx.fillStyle = '#0a0a0f';
    wfCtx.fillRect(0, 0, wfW, wfH);
    // subtle grid
    wfCtx.strokeStyle = 'rgba(255,255,255,0.03)';
    wfCtx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const p = (i / 10) * wfW;
      wfCtx.beginPath(); wfCtx.moveTo(p, 0); wfCtx.lineTo(p, wfH);
      wfCtx.stroke();
      wfCtx.beginPath(); wfCtx.moveTo(0, p * wfH / wfW); wfCtx.lineTo(wfW, p * wfH / wfW);
      wfCtx.stroke();
    }

    if (wfVerts.length === 0) return;

    // project all vertices
    const projected = wfVerts.map(v => wfProject(v));

    // draw edges
    if (wfMode === 'wire' || wfMode === 'both') {
      wfCtx.lineWidth = wfLineW;
      wfCtx.lineCap = 'round';
      for (const e of wfEdges) {
        const p1 = projected[e[0]], p2 = projected[e[1]];
        const avgZ = (p1.z + p2.z) / 2;
        // depth shade: closer = brighter
        const t = Math.max(0, Math.min(1, (wfPersp + 1.5 - avgZ) / 3));
        const light = 30 + t * 70;
        const hue = (wfHue + avgZ * 20) % 360;
        wfCtx.strokeStyle = `hsl(${hue}, 80%, ${light}%)`;
        wfCtx.beginPath();
        wfCtx.moveTo(p1.sx, p1.sy);
        wfCtx.lineTo(p2.sx, p2.sy);
        wfCtx.stroke();
      }
    }

    // draw vertices
    if (wfMode === 'points' || wfMode === 'both') {
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const t = Math.max(0, Math.min(1, (wfPersp + 1.5 - p.z) / 3));
        const hue = (wfHue + p.z * 20) % 360;
        wfCtx.fillStyle = `hsl(${hue}, 90%, ${50 + t * 30}%)`;
        if (wfGlow > 0) {
          wfCtx.shadowColor = `hsl(${hue}, 90%, 60%)`;
          wfCtx.shadowBlur = wfGlow;
        }
        wfCtx.beginPath();
        wfCtx.arc(p.sx, p.sy, wfMode === 'points' ? 3 : 2, 0, Math.PI * 2);
        wfCtx.fill();
      }
      wfCtx.shadowBlur = 0;
    }
  }

  function wfStep() {
    wfRotX += wfSpinX * 0.01;
    wfRotY += wfSpinY * 0.01;
    wfRotZ += wfSpinZ * 0.01;
  }

  // --- Interaction ---
  wfCanvas.addEventListener('mousedown', function(e) {
    wfDragging = true;
    wfLastMX = e.clientX;
    wfLastMY = e.clientY;
  });
  window.addEventListener('mousemove', function(e) {
    if (!wfDragging) return;
    const dx = e.clientX - wfLastMX;
    const dy = e.clientY - wfLastMY;
    wfManualYaw += dx * 0.01;
    wfManualPitch += dy * 0.01;
    wfLastMX = e.clientX;
    wfLastMY = e.clientY;
  });
  window.addEventListener('mouseup', function() { wfDragging = false; });

  // Touch
  wfCanvas.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
      wfDragging = true;
      wfLastMX = e.touches[0].clientX;
      wfLastMY = e.touches[0].clientY;
      e.preventDefault();
    }
  }, { passive: false });
  wfCanvas.addEventListener('touchmove', function(e) {
    if (!wfDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - wfLastMX;
    const dy = e.touches[0].clientY - wfLastMY;
    wfManualYaw += dx * 0.01;
    wfManualPitch += dy * 0.01;
    wfLastMX = e.touches[0].clientX;
    wfLastMY = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });
  wfCanvas.addEventListener('touchend', function() { wfDragging = false; });

  // --- Controls ---
  document.getElementById('slider-wf-spinx').addEventListener('input', function() {
    wfSpinX = parseFloat(this.value);
    document.getElementById('wf-spinx-val').textContent = wfSpinX.toFixed(2);
  });
  document.getElementById('slider-wf-spiny').addEventListener('input', function() {
    wfSpinY = parseFloat(this.value);
    document.getElementById('wf-spiny-val').textContent = wfSpinY.toFixed(2);
  });
  document.getElementById('slider-wf-spinz').addEventListener('input', function() {
    wfSpinZ = parseFloat(this.value);
    document.getElementById('wf-spinz-val').textContent = wfSpinZ.toFixed(2);
  });
  document.getElementById('slider-wf-pitch').addEventListener('input', function() {
    wfManualPitch = parseFloat(this.value);
    document.getElementById('wf-pitch-val').textContent = wfManualPitch.toFixed(2);
  });
  document.getElementById('slider-wf-scale').addEventListener('input', function() {
    wfScale = parseFloat(this.value);
    document.getElementById('wf-scale-val').textContent = wfScale.toFixed(2);
  });
  document.getElementById('slider-wf-persp').addEventListener('input', function() {
    wfPersp = parseFloat(this.value);
    document.getElementById('wf-persp-val').textContent = wfPersp.toFixed(1);
  });
  document.getElementById('slider-wf-lw').addEventListener('input', function() {
    wfLineW = parseFloat(this.value);
    document.getElementById('wf-lw-val').textContent = wfLineW.toFixed(1);
  });
  document.getElementById('slider-wf-hue').addEventListener('input', function() {
    wfHue = parseInt(this.value);
    document.getElementById('wf-hue-val').textContent = this.value;
  });
  document.getElementById('slider-wf-glow').addEventListener('input', function() {
    wfGlow = parseInt(this.value);
    document.getElementById('wf-glow-val').textContent = this.value;
  });
  document.getElementById('wf-mode').addEventListener('change', function() {
    wfMode = this.value;
  });

  // Presets
  document.querySelectorAll('#wf-presets .preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#wf-presets .preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      wfLoadPreset(this.dataset.preset);
    });
  });

  document.getElementById('wf-reset').addEventListener('click', function() {
    wfRotX = 0; wfRotY = 0; wfRotZ = 0;
    wfManualPitch = -0.3; wfManualYaw = 0;
    document.getElementById('slider-wf-pitch').value = -0.3;
    document.getElementById('wf-pitch-val').textContent = '-0.30';
  });
  document.getElementById('wf-pause').addEventListener('click', function() {
    expPaused[26] = !expPaused[26];
    this.textContent = expPaused[26] ? 'Resume' : 'Pause';
    document.getElementById('wf-status').textContent = expPaused[26] ? 'paused' : 'Wireframe \u00b7 ' + wfName;
  });
  document.getElementById('wf-randomize').addEventListener('click', function() {
    wfSpinX = (Math.random() - 0.5) * 3;
    wfSpinY = (Math.random() - 0.5) * 3;
    wfSpinZ = (Math.random() - 0.5) * 2;
    wfHue = Math.floor(Math.random() * 360);
    document.getElementById('slider-wf-spinx').value = wfSpinX;
    document.getElementById('wf-spinx-val').textContent = wfSpinX.toFixed(2);
    document.getElementById('slider-wf-spiny').value = wfSpinY;
    document.getElementById('wf-spiny-val').textContent = wfSpinY.toFixed(2);
    document.getElementById('slider-wf-spinz').value = wfSpinZ;
    document.getElementById('wf-spinz-val').textContent = wfSpinZ.toFixed(2);
    document.getElementById('slider-wf-hue').value = wfHue;
    document.getElementById('wf-hue-val').textContent = wfHue;
  });
  document.getElementById('wf-save').addEventListener('click', function() {
    const link = document.createElement('a');
    link.download = 'wireframe-' + wfName.toLowerCase().replace(/\s+/g, '-') + '.png';
    link.href = wfCanvas.toDataURL();
    link.click();
  });

  // Initialize
  wfLoadPreset('tetra');
