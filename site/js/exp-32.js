// ============================================================
  //  EXPERIMENT 32 — Maze Generation & Pathfinding
  // ============================================================
  const mazeCanvas = document.getElementById('canvas32');
  const mazeCtx = mazeCanvas.getContext('2d');
  const mazeW = 600, mazeH = 400;

  // Grid parameters
  let mazeCols = 25;
  let mazeRows = 17;
  let mazeCellSize = 0;          // 0 = auto-compute
  let mazeWallWidth = 2;
  let mazeHueOffset = 200;
  let mazeColorMode = 'spectrum';
  let mazeShowVisited = true;
  let mazeGenSpeed = 10;         // steps per frame
  let mazeSolveSpeed = 10;       // steps per frame
  let mazeGenAlgo = 'backtracker';
  let mazeSolveAlgo = 'bfs';

  // State machine
  let mazeState = 'idle';       // 'idle', 'generating', 'solving', 'done'
  let mazeGenStep = null;        // generator function (yields one step at a time)
  let mazeSolveStep = null;       // solver function
  let mazeGrid = null;
  let mazeStartCell = null;
  let mazeGoalCell = null;
  let mazeVisited = null;         // Set of "r,c" strings
  let mazeFrontier = [];          // array of "r,c"
  let mazePath = [];             // final path array of [r,c]
  let mazeParents = {};           // for path reconstruction
  let mazeClickMode = 'start';    // 'start' or 'goal'
  let mazeStats = { visited: 0, pathLen: 0, found: false };

  // Maze cell: walls = [N, E, S, W] (true = wall present)
  function mazeCell(r, c) {
    return { r: r, c: c, walls: [true, true, true, true], visited: false };
  }

  // Directions: N, E, S, W — delta row, delta col, wall index
  const MAZE_DIRS = [
    { dr: -1, dc: 0, wall: 0, opp: 2 },  // N
    { dr: 0, dc: 1, wall: 1, opp: 3 },   // E
    { dr: 1, dc: 0, wall: 2, opp: 0 },   // S
    { dr: 0, dc: -1, wall: 3, opp: 1 }   // W
  ];

  function mazeShuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function mazeBuildGrid() {
    mazeGrid = [];
    for (var r = 0; r < mazeRows; r++) {
      var row = [];
      for (var c = 0; c < mazeCols; c++) {
        row.push(mazeCell(r, c));
      }
      mazeGrid.push(row);
    }
  }

  function mazeGetCell(r, c) {
    if (r < 0 || r >= mazeRows || c < 0 || c >= mazeCols) return null;
    return mazeGrid[r][c];
  }

  function mazeRemoveWall(a, b) {
    // Determine direction from a to b
    var dr = b.r - a.r, dc = b.c - a.c;
    if (dr === -1) { a.walls[0] = false; b.walls[2] = false; }       // a→N
    else if (dr === 1) { a.walls[2] = false; b.walls[0] = false; }   // a→S
    else if (dc === 1) { a.walls[1] = false; b.walls[3] = false; }    // a→E
    else if (dc === -1) { a.walls[3] = false; b.walls[1] = false; }  // a→W
  }

  function mazeNeighbors(cell, unvisitedOnly) {
    var result = [];
    for (var i = 0; i < 4; i++) {
      var d = MAZE_DIRS[i];
      var nb = mazeGetCell(cell.r + d.dr, cell.c + d.dc);
      if (nb && (!unvisitedOnly || !nb.visited)) result.push(nb);
    }
    return result;
  }

  // Get neighbors reachable through open walls (for solvers)
  function mazeOpenNeighbors(cell) {
    var result = [];
    for (var i = 0; i < 4; i++) {
      if (!cell.walls[i]) {
        var d = MAZE_DIRS[i];
        var nb = mazeGetCell(cell.r + d.dr, cell.c + d.dc);
        if (nb) result.push(nb);
      }
    }
    return result;
  }

  // ---- Generators ----

  function* genBacktracker() {
    mazeBuildGrid();
    var stack = [];
    var start = mazeGrid[0][0];
    start.visited = true;
    stack.push(start);
    while (stack.length > 0) {
      var current = stack[stack.length - 1];
      var neighbors = mazeNeighbors(current, true);
      if (neighbors.length === 0) {
        stack.pop();
      } else {
        var next = neighbors[Math.floor(Math.random() * neighbors.length)];
        mazeRemoveWall(current, next);
        next.visited = true;
        stack.push(next);
      }
      yield;
    }
  }

  function* genPrim() {
    mazeBuildGrid();
    var start = mazeGrid[Math.floor(Math.random() * mazeRows)][Math.floor(Math.random() * mazeCols)];
    start.visited = true;
    var frontier = [];
    // Add all walls of start to frontier
    function addFrontier(cell) {
      var nbs = mazeNeighbors(cell, false);
      for (var i = 0; i < nbs.length; i++) {
        if (!nbs[i].visited) {
          var key = nbs[i].r + ',' + nbs[i].c;
          if (frontier.indexOf(key) < 0) frontier.push(key);
        }
      }
    }
    addFrontier(start);
    while (frontier.length > 0) {
      var idx = Math.floor(Math.random() * frontier.length);
      var key = frontier.splice(idx, 1)[0];
      var parts = key.split(',');
      var cell = mazeGrid[parseInt(parts[0])][parseInt(parts[1])];
      // Find a visited neighbor to connect to
      var vnbs = mazeNeighbors(cell, false).filter(function(n) { return n.visited; });
      if (vnbs.length > 0) {
        var conn = vnbs[Math.floor(Math.random() * vnbs.length)];
        mazeRemoveWall(cell, conn);
        cell.visited = true;
        addFrontier(cell);
      }
      yield;
    }
  }

  function* genWilson() {
    mazeBuildGrid();
    // Start with one random cell in the tree
    var tree = {};
    var startR = Math.floor(Math.random() * mazeRows);
    var startC = Math.floor(Math.random() * mazeCols);
    tree[startR + ',' + startC] = true;
    mazeGrid[startR][startC].visited = true;
    var inTree = 1;

    while (inTree < mazeRows * mazeCols) {
      // Scan grid deterministically for unvisited cells (random scan fails
      // when only 1 cell remains — ~9.5% miss rate at 1000 tries on 425 cells)
      var sr = -1, sc = -1;
      var unvisited = [];
      for (var ur = 0; ur < mazeRows; ur++) {
        for (var uc = 0; uc < mazeCols; uc++) {
          if (!mazeGrid[ur][uc].visited) unvisited.push({ r: ur, c: uc });
        }
      }
      if (unvisited.length === 0) break;
      var pick = unvisited[Math.floor(Math.random() * unvisited.length)];
      sr = pick.r; sc = pick.c;

      // Random walk until hitting the tree
      var path = [{ r: sr, c: sc }];
      var pathMap = {};
      pathMap[sr + ',' + sc] = 0;
      var cr = sr, cc = sc;

      while (!mazeGrid[cr][cc].visited) {
        var dirs = mazeShuffle([0, 1, 2, 3]);
        var moved = false;
        for (var di = 0; di < 4; di++) {
          var d = MAZE_DIRS[dirs[di]];
          var nr = cr + d.dr, nc = cc + d.dc;
          if (nr >= 0 && nr < mazeRows && nc >= 0 && nc < mazeCols) {
            var key = nr + ',' + nc;
            if (key in pathMap) {
              // Loop — erase back to that point
              path = path.slice(0, pathMap[key] + 1);
              pathMap = {};
              for (var pi = 0; pi < path.length; pi++) {
                pathMap[path[pi].r + ',' + path[pi].c] = pi;
              }
            } else {
              path.push({ r: nr, c: nc });
              pathMap[key] = path.length - 1;
            }
            cr = nr; cc = nc;
            moved = true;
            break;
          }
        }
        if (!moved) break;
        yield; // animate the random walk
      }

      // Carve the path into the maze
      for (var pi = 0; pi < path.length - 1; pi++) {
        var a = mazeGrid[path[pi].r][path[pi].c];
        var b = mazeGrid[path[pi + 1].r][path[pi + 1].c];
        mazeRemoveWall(a, b);
        if (!a.visited) { a.visited = true; inTree++; }
      }
    }
  }

  function* genBinaryTree() {
    mazeBuildGrid();
    for (var r = 0; r < mazeRows; r++) {
      for (var c = 0; c < mazeCols; c++) {
        var cell = mazeGrid[r][c];
        var choices = [];
        if (r > 0) choices.push('N');
        if (c < mazeCols - 1) choices.push('E');
        if (choices.length > 0) {
          var dir = choices[Math.floor(Math.random() * choices.length)];
          if (dir === 'N') {
            var nb = mazeGrid[r - 1][c];
            mazeRemoveWall(cell, nb);
          } else {
            var nb2 = mazeGrid[r][c + 1];
            mazeRemoveWall(cell, nb2);
          }
        }
        yield;
      }
    }
  }

  function* genSidewinder() {
    mazeBuildGrid();
    for (var r = 0; r < mazeRows; r++) {
      var run = [];
      for (var c = 0; c < mazeCols; c++) {
        var cell = mazeGrid[r][c];
        run.push(cell);
        var atEast = (c === mazeCols - 1);
        var atNorth = (r === 0);
        var closeOut = atEast || (!atNorth && Math.random() < 0.5);
        if (closeOut) {
          // Pick random cell from run, carve north
          var member = run[Math.floor(Math.random() * run.length)];
          if (member.r > 0) {
            mazeRemoveWall(member, mazeGrid[member.r - 1][member.c]);
          }
          run = [];
        } else {
          // Carve east
          if (c < mazeCols - 1) {
            mazeRemoveWall(cell, mazeGrid[r][c + 1]);
          }
        }
        yield;
      }
    }
  }

  function* genKruskal() {
    mazeBuildGrid();
    // Union-Find
    var parent = {};
    function find(key) {
      if (parent[key] === key) return key;
      parent[key] = find(parent[key]);
      return parent[key];
    }
    function union(a, b) {
      var ra = find(a), rb = find(b);
      if (ra !== rb) { parent[ra] = rb; return true; }
      return false;
    }
    for (var r = 0; r < mazeRows; r++) {
      for (var c = 0; c < mazeCols; c++) {
        parent[r + ',' + c] = r + ',' + c;
      }
    }
    // Collect all walls (edges)
    var edges = [];
    for (var r = 0; r < mazeRows; r++) {
      for (var c = 0; c < mazeCols; c++) {
        if (c < mazeCols - 1) edges.push({ a: mazeGrid[r][c], b: mazeGrid[r][c + 1] });
        if (r < mazeRows - 1) edges.push({ a: mazeGrid[r][c], b: mazeGrid[r + 1][c] });
      }
    }
    mazeShuffle(edges);
    for (var i = 0; i < edges.length; i++) {
      var e = edges[i];
      var ka = e.a.r + ',' + e.a.c;
      var kb = e.b.r + ',' + e.b.c;
      if (union(ka, kb)) {
        mazeRemoveWall(e.a, e.b);
      }
      yield;
    }
  }

  // ---- Solvers ----

  function mazeManhattan(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
  }

  function* solveBFS() {
    var queue = [mazeStartCell];
    var seen = {};
    seen[mazeStartCell.r + ',' + mazeStartCell.c] = true;
    mazeVisited = {};
    mazeVisited[mazeStartCell.r + ',' + mazeStartCell.c] = 0;
    mazeFrontier = [mazeStartCell.r + ',' + mazeStartCell.c];
    mazeParents = {};

    while (queue.length > 0) {
      var current = queue.shift();
      mazeFrontier = queue.map(function(c) { return c.r + ',' + c.c; });
      if (current === mazeGoalCell) {
        mazeReconstructPath(current);
        mazeStats.found = true;
        return;
      }
      var nbs = mazeOpenNeighbors(current);
      for (var i = 0; i < nbs.length; i++) {
        var nb = nbs[i];
        var key = nb.r + ',' + nb.c;
        if (!(key in seen)) {
          seen[key] = true;
          mazeParents[key] = current.r + ',' + current.c;
          mazeVisited[key] = Object.keys(mazeVisited).length;
          queue.push(nb);
        }
      }
      mazeStats.visited = Object.keys(mazeVisited).length;
      yield;
    }
    mazeStats.found = false;
  }

  function* solveDFS() {
    var stack = [mazeStartCell];
    var seen = {};
    seen[mazeStartCell.r + ',' + mazeStartCell.c] = true;
    mazeVisited = {};
    mazeVisited[mazeStartCell.r + ',' + mazeStartCell.c] = 0;
    mazeFrontier = [mazeStartCell.r + ',' + mazeStartCell.c];
    mazeParents = {};

    while (stack.length > 0) {
      var current = stack.pop();
      mazeFrontier = stack.map(function(c) { return c.r + ',' + c.c; });
      if (current === mazeGoalCell) {
        mazeReconstructPath(current);
        mazeStats.found = true;
        return;
      }
      var nbs = mazeShuffle(mazeOpenNeighbors(current));
      for (var i = 0; i < nbs.length; i++) {
        var nb = nbs[i];
        var key = nb.r + ',' + nb.c;
        if (!(key in seen)) {
          seen[key] = true;
          mazeParents[key] = current.r + ',' + current.c;
          mazeVisited[key] = Object.keys(mazeVisited).length;
          stack.push(nb);
        }
      }
      mazeStats.visited = Object.keys(mazeVisited).length;
      yield;
    }
    mazeStats.found = false;
  }

  // Simple priority queue for Dijkstra / A* / Greedy
  function mazePQ() {
    this.items = [];
  }
  mazePQ.prototype.push = function(item, priority) {
    this.items.push({ item: item, p: priority });
    // Sort by priority
    this.items.sort(function(a, b) { return a.p - b.p; });
  };
  mazePQ.prototype.pop = function() {
    return this.items.shift();
  };
  mazePQ.prototype.isEmpty = function() {
    return this.items.length === 0;
  };
  mazePQ.prototype.size = function() { return this.items.length; };

  function* solveDijkstra() {
    var pq = new mazePQ();
    pq.push(mazeStartCell, 0);
    var dist = {};
    dist[mazeStartCell.r + ',' + mazeStartCell.c] = 0;
    mazeVisited = {};
    mazeVisited[mazeStartCell.r + ',' + mazeStartCell.c] = 0;
    mazeFrontier = [mazeStartCell.r + ',' + mazeStartCell.c];
    mazeParents = {};

    while (!pq.isEmpty()) {
      var entry = pq.pop();
      var current = entry.item;
      var ck = current.r + ',' + current.c;
      var curDist = (ck in dist) ? dist[ck] : Infinity;
      if (entry.p > curDist) continue;
      mazeFrontier = pq.items.map(function(e) { return e.item.r + ',' + e.item.c; });
      if (current === mazeGoalCell) {
        mazeReconstructPath(current);
        mazeStats.found = true;
        return;
      }
      var nbs = mazeOpenNeighbors(current);
      for (var i = 0; i < nbs.length; i++) {
        var nb = nbs[i];
        var nk = nb.r + ',' + nb.c;
        var nd = curDist + 1;
        var oldDist = (nk in dist) ? dist[nk] : Infinity;
        if (nd < oldDist) {
          dist[nk] = nd;
          mazeParents[nk] = ck;
          if (!(nk in mazeVisited)) {
            mazeVisited[nk] = Object.keys(mazeVisited).length;
          }
          pq.push(nb, nd);
        }
      }
      mazeStats.visited = Object.keys(mazeVisited).length;
      yield;
    }
    mazeStats.found = false;
  }

  function* solveAStar() {
    var pq = new mazePQ();
    var gScore = {};
    var sk = mazeStartCell.r + ',' + mazeStartCell.c;
    gScore[sk] = 0;
    pq.push(mazeStartCell, mazeManhattan(mazeStartCell, mazeGoalCell));
    mazeVisited = {};
    mazeVisited[sk] = 0;
    mazeFrontier = [sk];
    mazeParents = {};

    while (!pq.isEmpty()) {
      var entry = pq.pop();
      var current = entry.item;
      var ck = current.r + ',' + current.c;
      mazeFrontier = pq.items.map(function(e) { return e.item.r + ',' + e.item.c; });
      if (current === mazeGoalCell) {
        mazeReconstructPath(current);
        mazeStats.found = true;
        return;
      }
      var nbs = mazeOpenNeighbors(current);
      for (var i = 0; i < nbs.length; i++) {
        var nb = nbs[i];
        var nk = nb.r + ',' + nb.c;
        var gCur = (ck in gScore) ? gScore[ck] : Infinity;
        var tentative = gCur + 1;
        var gOld = (nk in gScore) ? gScore[nk] : Infinity;
        if (tentative < gOld) {
          mazeParents[nk] = ck;
          gScore[nk] = tentative;
          if (!(nk in mazeVisited)) {
            mazeVisited[nk] = Object.keys(mazeVisited).length;
          }
          var f = tentative + mazeManhattan(nb, mazeGoalCell);
          pq.push(nb, f);
        }
      }
      mazeStats.visited = Object.keys(mazeVisited).length;
      yield;
    }
    mazeStats.found = false;
  }

  function* solveGreedy() {
    var pq = new mazePQ();
    pq.push(mazeStartCell, mazeManhattan(mazeStartCell, mazeGoalCell));
    var seen = {};
    seen[mazeStartCell.r + ',' + mazeStartCell.c] = true;
    mazeVisited = {};
    mazeVisited[mazeStartCell.r + ',' + mazeStartCell.c] = 0;
    mazeFrontier = [mazeStartCell.r + ',' + mazeStartCell.c];
    mazeParents = {};

    while (!pq.isEmpty()) {
      var entry = pq.pop();
      var current = entry.item;
      mazeFrontier = pq.items.map(function(e) { return e.item.r + ',' + e.item.c; });
      if (current === mazeGoalCell) {
        mazeReconstructPath(current);
        mazeStats.found = true;
        return;
      }
      var nbs = mazeOpenNeighbors(current);
      for (var i = 0; i < nbs.length; i++) {
        var nb = nbs[i];
        var nk = nb.r + ',' + nb.c;
        if (!(nk in seen)) {
          seen[nk] = true;
          mazeParents[nk] = current.r + ',' + current.c;
          mazeVisited[nk] = Object.keys(mazeVisited).length;
          pq.push(nb, mazeManhattan(nb, mazeGoalCell));
        }
      }
      mazeStats.visited = Object.keys(mazeVisited).length;
      yield;
    }
    mazeStats.found = false;
  }

  function mazeReconstructPath(goalCell) {
    mazePath = [];
    var current = goalCell.r + ',' + goalCell.c;
    while (current) {
      var parts = current.split(',');
      mazePath.push([parseInt(parts[0]), parseInt(parts[1])]);
      current = mazeParents[current];
    }
    mazePath.reverse();
    mazeStats.pathLen = mazePath.length;
  }

  // ---- Color helpers ----
  function mazeColorForValue(t, maxVal) {
    // t: 0..1 position in spectrum
    var h = (mazeHueOffset + t * 360) % 360;
    var s, l;
    switch (mazeColorMode) {
      case 'fire':   h = (mazeHueOffset + t * 60) % 360; s = 90; l = 50 + t * 20; break;
      case 'ocean':  h = (mazeHueOffset + t * 60) % 360; h = 180 + (h % 60); s = 80; l = 40 + t * 30; break;
      case 'electric': h = (mazeHueOffset + t * 120) % 360; s = 100; l = 50 + t * 25; break;
      case 'mono':  h = 0; s = 0; l = 30 + t * 50; break;
      default:      s = 75; l = 45 + t * 25; break; // spectrum
    }
    return 'hsl(' + h + ',' + s + '%,' + l + '%)';
  }

  // ---- Rendering ----
  function mazeComputeCellSize() {
    if (mazeCellSize > 0) return mazeCellSize;
    var maxW = Math.floor((mazeW - 10) / mazeCols);
    var maxH = Math.floor((mazeH - 10) / mazeRows);
    return Math.max(4, Math.min(maxW, maxH));
  }

  function mazeGetOffset() {
    var cs = mazeComputeCellSize();
    var ox = Math.floor((mazeW - cs * mazeCols) / 2);
    var oy = Math.floor((mazeH - cs * mazeRows) / 2);
    return { ox: ox, oy: oy, cs: cs };
  }

  function mazeRender() {
    var ctx = mazeCtx;
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, mazeW, mazeH);

    if (!mazeGrid) return;
    var off = mazeGetOffset();
    var cs = off.cs, ox = off.ox, oy = off.oy;

    var maxVis = mazeStats.visited || 1;

    // Draw visited cells (exploration)
    if (mazeShowVisited && mazeVisited) {
      for (var key in mazeVisited) {
        var parts = key.split(',');
        var r = parseInt(parts[0]), c = parseInt(parts[1]);
        var t = mazeVisited[key] / maxVis;
        ctx.fillStyle = mazeColorForValue(t, maxVis);
        ctx.globalAlpha = 0.25;
        ctx.fillRect(ox + c * cs, oy + r * cs, cs, cs);
      }
      ctx.globalAlpha = 1;
    }

    // Draw frontier cells
    if (mazeFrontier && mazeFrontier.length > 0) {
      ctx.fillStyle = 'rgba(255, 200, 0, 0.5)';
      for (var fi = 0; fi < mazeFrontier.length; fi++) {
        var fp = mazeFrontier[fi].split(',');
        var fr = parseInt(fp[0]), fc = parseInt(fp[1]);
        ctx.fillRect(ox + fc * cs, oy + fr * cs, cs, cs);
      }
    }

    // Draw final path
    if (mazePath.length > 0) {
      ctx.strokeStyle = 'rgba(100, 255, 100, 0.9)';
      ctx.lineWidth = Math.max(2, cs * 0.3);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (var pi = 0; pi < mazePath.length; pi++) {
        var pr = mazePath[pi][0], pc = mazePath[pi][1];
        var px = ox + pc * cs + cs / 2;
        var py = oy + pr * cs + cs / 2;
        if (pi === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      // Draw path dots
      ctx.fillStyle = 'rgba(100, 255, 100, 0.7)';
      for (var pi2 = 0; pi2 < mazePath.length; pi2++) {
        var pr2 = mazePath[pi2][0], pc2 = mazePath[pi2][1];
        var px2 = ox + pc2 * cs + cs / 2;
        var py2 = oy + pr2 * cs + cs / 2;
        ctx.beginPath();
        ctx.arc(px2, py2, Math.max(1, cs * 0.15), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw walls
    ctx.strokeStyle = '#5c7080';
    ctx.lineWidth = mazeWallWidth;
    ctx.lineCap = 'square';
    for (var r = 0; r < mazeRows; r++) {
      for (var c = 0; c < mazeCols; c++) {
        var cell = mazeGrid[r][c];
        var x = ox + c * cs;
        var y = oy + r * cs;
        ctx.beginPath();
        if (cell.walls[0]) { ctx.moveTo(x, y); ctx.lineTo(x + cs, y); }       // N
        if (cell.walls[1]) { ctx.moveTo(x + cs, y); ctx.lineTo(x + cs, y + cs); } // E
        if (cell.walls[2]) { ctx.moveTo(x, y + cs); ctx.lineTo(x + cs, y + cs); } // S
        if (cell.walls[3]) { ctx.moveTo(x, y); ctx.lineTo(x, y + cs); }       // W
        ctx.stroke();
      }
    }

    // Draw start and goal markers
    if (mazeStartCell) {
      var sx = ox + mazeStartCell.c * cs + cs / 2;
      var sy = oy + mazeStartCell.r * cs + cs / 2;
      ctx.fillStyle = 'rgba(80, 255, 120, 0.9)';
      ctx.beginPath();
      ctx.arc(sx, sy, cs * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (mazeGoalCell) {
      var gx = ox + mazeGoalCell.c * cs + cs / 2;
      var gy = oy + mazeGoalCell.r * cs + cs / 2;
      ctx.fillStyle = 'rgba(255, 80, 80, 0.9)';
      ctx.beginPath();
      ctx.arc(gx, gy, cs * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- Tick (called from main loop) ----
  function mazeTick() {
    if (mazeState === 'generating' && mazeGenStep) {
      for (var i = 0; i < mazeGenSpeed; i++) {
        var r = mazeGenStep.next();
        if (r.done) {
          mazeState = 'idle';
          mazeGenStep = null;
          // Reset visited flags for solving
          for (var rr = 0; rr < mazeRows; rr++) {
            for (var cc = 0; cc < mazeCols; cc++) {
              mazeGrid[rr][cc].visited = false;
            }
          }
          // Update start/goal to point at new grid cell objects
          // (generators call mazeBuildGrid() which creates new cell objects,
          // so old references point at the pre-generation grid)
          var sr = mazeStartCell ? mazeStartCell.r : 0;
          var sc = mazeStartCell ? mazeStartCell.c : 0;
          var gr = mazeGoalCell ? mazeGoalCell.r : mazeRows - 1;
          var gc = mazeGoalCell ? mazeGoalCell.c : mazeCols - 1;
          // Clamp to grid bounds (handles resize)
          sr = Math.min(sr, mazeRows - 1);
          sc = Math.min(sc, mazeCols - 1);
          gr = Math.min(gr, mazeRows - 1);
          gc = Math.min(gc, mazeCols - 1);
          mazeStartCell = mazeGrid[sr][sc];
          mazeGoalCell = mazeGrid[gr][gc];
          mazeUpdateStatus('maze generated — ready to solve');
          break;
        }
      }
      mazeRender();
    } else if (mazeState === 'solving' && mazeSolveStep) {
      for (var i = 0; i < mazeSolveSpeed; i++) {
        var r2 = mazeSolveStep.next();
        if (r2.done) {
          mazeState = 'done';
          mazeSolveStep = null;
          mazeFrontier = [];
          if (mazeStats.found) {
            mazeUpdateStatus('path found! ' + mazeStats.pathLen + ' steps, ' + mazeStats.visited + ' explored');
          } else {
            mazeUpdateStatus('no path found');
          }
          break;
        }
      }
      mazeRender();
    }
  }

  function mazeUpdateStatus(msg) {
    var el = document.getElementById('maze-step-info');
    if (el) el.textContent = msg;
  }

  // ---- Start generation ----
  function mazeStartGen() {
    mazePath = [];
    mazeVisited = null;
    mazeFrontier = [];
    mazeParents = {};
    mazeStats = { visited: 0, pathLen: 0, found: false };

    var genMap = {
      'backtracker': genBacktracker,
      'prim': genPrim,
      'wilson': genWilson,
      'binary': genBinaryTree,
      'sidewinder': genSidewinder,
      'kruskal': genKruskal
    };
    var genFn = genMap[mazeGenAlgo] || genBacktracker;
    mazeGenStep = genFn();
    mazeState = 'generating';
    mazeUpdateStatus('generating maze...');
    mazeRender();
  }

  // ---- Start solving ----
  function mazeStartSolve() {
    if (!mazeGrid || mazeState === 'generating') return;
    if (!mazeStartCell || !mazeGoalCell) return;

    mazePath = [];
    mazeVisited = {};
    mazeFrontier = [];
    mazeParents = {};
    mazeStats = { visited: 0, pathLen: 0, found: false };

    var solveMap = {
      'bfs': solveBFS,
      'dfs': solveDFS,
      'dijkstra': solveDijkstra,
      'astar': solveAStar,
      'greedy': solveGreedy
    };
    var solveFn = solveMap[mazeSolveAlgo] || solveBFS;
    mazeSolveStep = solveFn();
    mazeState = 'solving';
    mazeUpdateStatus('solving...');
    mazeRender();
  }

  // ---- Clear path ----
  function mazeClearPath() {
    mazePath = [];
    mazeVisited = {};
    mazeFrontier = [];
    mazeParents = {};
    mazeStats = { visited: 0, pathLen: 0, found: false };
    mazeState = 'idle';
    mazeUpdateStatus('path cleared');
    mazeRender();
  }

  // ---- Init ----
  function mazeInit() {
    mazeBuildGrid();
    mazeStartCell = mazeGrid[0][0];
    mazeGoalCell = mazeGrid[mazeRows - 1][mazeCols - 1];

    // Auto-generate first maze
    mazeStartGen();

    // Generate button
    document.getElementById('maze-generate').addEventListener('click', function() {
      mazeStartGen();
    });

    // Solve button
    document.getElementById('maze-solve').addEventListener('click', function() {
      mazeStartSolve();
    });

    // Clear path
    document.getElementById('maze-clear-path').addEventListener('click', function() {
      mazeClearPath();
    });

    // Pause
    document.getElementById('maze-pause').addEventListener('click', function() {
      expPaused[31] = !expPaused[31];
      this.textContent = expPaused[31] ? 'Resume' : 'Pause';
    });

    // Save PNG
    document.getElementById('maze-save').addEventListener('click', function() {
      var link = document.createElement('a');
      link.download = 'maze-' + mazeGenAlgo + '-' + mazeSolveAlgo + '.png';
      link.href = mazeCanvas.toDataURL();
      link.click();
    });

    // Generator presets
    document.querySelectorAll('#maze-gen-presets .preset-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#maze-gen-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        mazeGenAlgo = this.dataset.gen;
        var names = {
          'backtracker': 'Recursive Backtracker',
          'prim': "Prim's Algorithm",
          'wilson': "Wilson's Algorithm",
          'binary': 'Binary Tree',
          'sidewinder': 'Sidewinder',
          'kruskal': "Kruskal's"
        };
        var statusEl = document.getElementById('maze-status');
        if (statusEl) statusEl.textContent = 'Maze · ' + (names[mazeGenAlgo] || mazeGenAlgo);
        mazeStartGen();
      });
    });

    // Solver presets
    document.querySelectorAll('#maze-solve-presets .preset-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#maze-solve-presets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        mazeSolveAlgo = this.dataset.solve;
      });
    });

    // Canvas click — set start/goal
    function getCellAt(e) {
      var rect = mazeCanvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left) * (mazeCanvas.width / rect.width);
      var my = (e.clientY - rect.top) * (mazeCanvas.height / rect.height);
      var off = mazeGetOffset();
      var cc = Math.floor((mx - off.ox) / off.cs);
      var rr = Math.floor((my - off.oy) / off.cs);
      if (rr >= 0 && rr < mazeRows && cc >= 0 && cc < mazeCols) {
        return mazeGrid[rr][cc];
      }
      return null;
    }

    mazeCanvas.addEventListener('click', function(e) {
      if (mazeState === 'generating' || mazeState === 'solving') return;
      var cell = getCellAt(e);
      if (!cell) return;
      if (mazeClickMode === 'start') {
        mazeStartCell = cell;
        mazeClickMode = 'goal';
        mazeUpdateStatus('start set — click to set goal');
      } else {
        mazeGoalCell = cell;
        mazeClickMode = 'start';
        mazeUpdateStatus('goal set — click to set start');
      }
      mazeClearPath();
    });

    // Touch support
    mazeCanvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (mazeState === 'generating' || mazeState === 'solving') return;
      var t = e.touches[0];
      var cell = getCellAt(t);
      if (!cell) return;
      if (mazeClickMode === 'start') {
        mazeStartCell = cell;
        mazeClickMode = 'goal';
      } else {
        mazeGoalCell = cell;
        mazeClickMode = 'start';
      }
      mazeClearPath();
    });

    // Sliders
    document.getElementById('slider-maze-cols').addEventListener('input', function() {
      mazeCols = parseInt(this.value);
      document.getElementById('maze-cols-val').textContent = mazeCols;
    });

    document.getElementById('slider-maze-rows').addEventListener('input', function() {
      mazeRows = parseInt(this.value);
      document.getElementById('maze-rows-val').textContent = mazeRows;
    });

    document.getElementById('slider-maze-genspeed').addEventListener('input', function() {
      mazeGenSpeed = parseInt(this.value);
      document.getElementById('maze-genspeed-val').textContent = mazeGenSpeed;
    });

    document.getElementById('slider-maze-solvespeed').addEventListener('input', function() {
      mazeSolveSpeed = parseInt(this.value);
      document.getElementById('maze-solvespeed-val').textContent = mazeSolveSpeed;
    });

    document.getElementById('slider-maze-cellsize').addEventListener('input', function() {
      mazeCellSize = parseInt(this.value);
      document.getElementById('maze-cellsize-val').textContent = mazeCellSize === 0 ? 'auto' : mazeCellSize;
      mazeRender();
    });

    document.getElementById('slider-maze-hue').addEventListener('input', function() {
      mazeHueOffset = parseInt(this.value);
      document.getElementById('maze-hue-val').textContent = mazeHueOffset;
      mazeRender();
    });

    document.getElementById('slider-maze-wallw').addEventListener('input', function() {
      mazeWallWidth = parseFloat(this.value);
      document.getElementById('maze-wallw-val').textContent = mazeWallWidth;
      mazeRender();
    });

    document.getElementById('maze-color').addEventListener('change', function() {
      mazeColorMode = this.value;
      mazeRender();
    });

    document.getElementById('maze-visited').addEventListener('change', function() {
      mazeShowVisited = (this.value === 'yes');
      mazeRender();
    });

    // Regenerate when grid size changes (on mouseup/change)
    document.getElementById('slider-maze-cols').addEventListener('change', function() {
      mazeStartGen();
    });
    document.getElementById('slider-maze-rows').addEventListener('change', function() {
      mazeStartGen();
    });
  }

  mazeInit();
