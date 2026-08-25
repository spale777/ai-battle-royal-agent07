// ============================================================
  //  EXPERIMENT 08 — Sorting Algorithm Visualizer
  // ============================================================
  const svCanvas = document.getElementById('canvas8');
  const svCtx = svCanvas.getContext('2d');
  const SV_W = 600, SV_H = 400;

  let svArr = [];
  let svSize = 64;
  let svSpeed = 8;       // operations per frame
  let svHue = 20;
  let svAlgo = 'bubble';
  let svGen = null;       // current generator
  let svRunning = false;
  let svSorted = [];      // indices that are in final position
  let svCompCount = 0;
  let svSwapCount = 0;
  let svHighlight = [];   // [{i, color}] for current frame
  let svDone = false;

  const svAlgoInfo = {
    bubble:    { name: 'Bubble Sort',    complexity: 'O(n²)' },
    selection: { name: 'Selection Sort', complexity: 'O(n²)' },
    insertion: { name: 'Insertion Sort', complexity: 'O(n²)' },
    quick:     { name: 'Quick Sort',     complexity: 'O(n log n)' },
    merge:     { name: 'Merge Sort',     complexity: 'O(n log n)' },
    heap:      { name: 'Heap Sort',      complexity: 'O(n log n)' },
    shell:     { name: 'Shell Sort',     complexity: 'O(n log²n)' },
    cocktail:  { name: 'Cocktail Sort',  complexity: 'O(n²)' },
  };

  function svBuildArray() {
    svArr = [];
    for (let i = 0; i < svSize; i++) {
      svArr.push(i + 1);
    }
    // Shuffle (Fisher-Yates)
    for (let i = svArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [svArr[i], svArr[j]] = [svArr[j], svArr[i]];
    }
    svSorted = [];
    svCompCount = 0;
    svSwapCount = 0;
    svHighlight = [];
    svDone = false;
    svGen = null;
    svRunning = false;
    svUpdateStats();
  }

  function svRender() {
    svCtx.fillStyle = '#0a0a0b';
    svCtx.fillRect(0, 0, SV_W, SV_H);

    const n = svArr.length;
    if (n === 0) return;
    const barW = SV_W / n;
    const maxVal = n;
    const gap = barW > 4 ? 1 : 0;
    const drawW = Math.max(1, barW - gap);

    // Build a map of highlight indices for quick lookup
    const hlMap = {};
    for (const h of svHighlight) {
      hlMap[h.i] = h.color;
    }

    for (let i = 0; i < n; i++) {
      const val = svArr[i];
      const barH = (val / maxVal) * (SV_H - 20);
      const x = i * barW;
      const y = SV_H - barH;

      let color;
      if (hlMap[i]) {
        color = hlMap[i];
      } else if (svSorted.includes(i)) {
        color = '#60a5fa';
      } else {
        // Color by height with hue offset
        const hue = (svHue + (val / maxVal) * 120) % 360;
        const light = 50 + (val / maxVal) * 15;
        color = `hsl(${hue}, 70%, ${light}%)`;
      }

      svCtx.fillStyle = color;
      svCtx.fillRect(x, y, drawW, barH);
    }

    // Reset highlight after drawing
    svHighlight = [];
  }

  function svUpdateStats() {
    document.getElementById('sv-comp-val').textContent = svCompCount.toLocaleString();
    document.getElementById('sv-swap-val').textContent = svSwapCount.toLocaleString();
    document.getElementById('sv-arr-size-stat').textContent = svSize;
    const info = svAlgoInfo[svAlgo];
    document.getElementById('sv-algo-name').textContent = info.name;
    document.getElementById('sv-complexity').textContent = info.complexity;
    let stateText = 'idle';
    let statusText = 'ready';
    if (svDone) {
      stateText = 'sorted!';
      statusText = 'complete';
    } else if (svRunning) {
      stateText = 'sorting';
      statusText = 'running';
    }
    document.getElementById('sv-state-val').textContent = stateText;
    document.getElementById('sv-status-text').textContent = statusText;
  }

  // ---- Generator-based sorting algorithms ----
  // Each yields {comp:[], swap:[]} to indicate what just happened.

  function* bubbleSort(arr) {
    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        svCompCount++;
        yield { comp: [j, j + 1] };
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          svSwapCount++;
          yield { swap: [j, j + 1] };
        }
      }
      svSorted.unshift(n - i - 1);
    }
    svSorted.unshift(0);
  }

  function* selectionSort(arr) {
    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      for (let j = i + 1; j < n; j++) {
        svCompCount++;
        yield { comp: [minIdx, j] };
        if (arr[j] < arr[minIdx]) {
          minIdx = j;
        }
      }
      if (minIdx !== i) {
        [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
        svSwapCount++;
        yield { swap: [i, minIdx] };
      }
      svSorted.push(i);
    }
    svSorted.push(n - 1);
  }

  function* insertionSort(arr) {
    const n = arr.length;
    svSorted.push(0);
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0) {
        svCompCount++;
        yield { comp: [j - 1, j] };
        if (arr[j - 1] > arr[j]) {
          [arr[j - 1], arr[j]] = [arr[j], arr[j - 1]];
          svSwapCount++;
          yield { swap: [j - 1, j] };
          j--;
        } else {
          break;
        }
      }
      // Mark sorted prefix — but we only mark the final sorted array at end
    }
    for (let k = 0; k < n; k++) svSorted.push(k);
  }

  function* quickSort(arr, lo, hi) {
    if (lo === undefined) lo = 0;
    if (hi === undefined) hi = arr.length - 1;
    if (lo < hi) {
      const pivot = arr[hi];
      let i = lo - 1;
      for (let j = lo; j < hi; j++) {
        svCompCount++;
        yield { comp: [j, hi] };
        if (arr[j] <= pivot) {
          i++;
          if (i !== j) {
            [arr[i], arr[j]] = [arr[j], arr[i]];
            svSwapCount++;
            yield { swap: [i, j] };
          }
        }
      }
      [arr[i + 1], arr[hi]] = [arr[hi], arr[i + 1]];
      svSwapCount++;
      yield { swap: [i + 1, hi] };
      const p = i + 1;
      yield* quickSort(arr, lo, p - 1);
      yield* quickSort(arr, p + 1, hi);
    } else if (lo === hi) {
      svSorted.push(lo);
    }
  }

  function* mergeSort(arr, lo, hi) {
    if (lo === undefined) lo = 0;
    if (hi === undefined) hi = arr.length - 1;
    if (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      yield* mergeSort(arr, lo, mid);
      yield* mergeSort(arr, mid + 1, hi);
      yield* mergeArr(arr, lo, mid, hi);
    }
  }

  function* mergeArr(arr, lo, mid, hi) {
    const temp = [];
    let i = lo, j = mid + 1;
    while (i <= mid && j <= hi) {
      svCompCount++;
      yield { comp: [i, j] };
      if (arr[i] <= arr[j]) {
        temp.push(arr[i++]);
      } else {
        temp.push(arr[j++]);
      }
    }
    while (i <= mid) temp.push(arr[i++]);
    while (j <= hi) temp.push(arr[j++]);
    for (let k = 0; k < temp.length; k++) {
      arr[lo + k] = temp[k];
      svSwapCount++;
      yield { swap: [lo + k] };
    }
    // Mark sorted range if this is a full-range merge
    if (lo === 0 && hi === arr.length - 1) {
      for (let k = 0; k < arr.length; k++) svSorted.push(k);
    }
  }

  function* heapSort(arr) {
    const n = arr.length;

    function* siftDown(start, end) {
      let root = start;
      while (2 * root + 1 <= end) {
        let child = 2 * root + 1;
        let swap = root;
        svCompCount++;
        yield { comp: [swap, child] };
        if (arr[swap] < arr[child]) swap = child;
        if (child + 1 <= end) {
          svCompCount++;
          yield { comp: [swap, child + 1] };
          if (arr[swap] < arr[child + 1]) swap = child + 1;
        }
        if (swap === root) return;
        [arr[root], arr[swap]] = [arr[swap], arr[root]];
        svSwapCount++;
        yield { swap: [root, swap] };
        root = swap;
      }
    }

    // Build max-heap
    for (let start = Math.floor(n / 2) - 1; start >= 0; start--) {
      yield* siftDown(start, n - 1);
    }
    // Extract elements
    for (let end = n - 1; end > 0; end--) {
      [arr[0], arr[end]] = [arr[end], arr[0]];
      svSwapCount++;
      yield { swap: [0, end] };
      svSorted.unshift(end);
      yield* siftDown(0, end - 1);
    }
    svSorted.unshift(0);
  }

  function* shellSort(arr) {
    const n = arr.length;
    let gap = Math.floor(n / 2);
    while (gap > 0) {
      for (let i = gap; i < n; i++) {
        const temp = arr[i];
        let j = i;
        while (j >= gap) {
          svCompCount++;
          yield { comp: [j - gap, j] };
          if (arr[j - gap] > temp) {
            arr[j] = arr[j - gap];
            svSwapCount++;
            yield { swap: [j] };
            j -= gap;
          } else {
            break;
          }
        }
        arr[j] = temp;
        svSwapCount++;
        yield { swap: [j] };
      }
      gap = Math.floor(gap / 2);
    }
    for (let k = 0; k < n; k++) svSorted.push(k);
  }

  function* cocktailSort(arr) {
    const n = arr.length;
    let lo = 0, hi = n - 1;
    let swapped = true;
    while (swapped) {
      swapped = false;
      for (let i = lo; i < hi; i++) {
        svCompCount++;
        yield { comp: [i, i + 1] };
        if (arr[i] > arr[i + 1]) {
          [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
          svSwapCount++;
          yield { swap: [i, i + 1] };
          swapped = true;
        }
      }
      svSorted.unshift(hi);
      hi--;
      if (!swapped) break;
      swapped = false;
      for (let i = hi; i > lo; i--) {
        svCompCount++;
        yield { comp: [i - 1, i] };
        if (arr[i - 1] > arr[i]) {
          [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
          svSwapCount++;
          yield { swap: [i - 1, i] };
          swapped = true;
        }
      }
      svSorted.push(lo);
      lo++;
    }
    // Fill any remaining
    for (let k = lo; k <= hi; k++) {
      if (!svSorted.includes(k)) svSorted.push(k);
    }
  }

  function svStartSort() {
    if (svDone) {
      svBuildArray();
    }
    if (!svGen) {
      // De-duplicate sorted indices
      svSorted = [];
      switch (svAlgo) {
        case 'bubble':    svGen = bubbleSort(svArr); break;
        case 'selection': svGen = selectionSort(svArr); break;
        case 'insertion': svGen = insertionSort(svArr); break;
        case 'quick':     svGen = quickSort(svArr); break;
        case 'merge':     svGen = mergeSort(svArr); break;
        case 'heap':      svGen = heapSort(svArr); break;
        case 'shell':     svGen = shellSort(svArr); break;
        case 'cocktail':  svGen = cocktailSort(svArr); break;
      }
    }
    svRunning = true;
    svUpdateStats();
  }

  function svStep() {
    if (!svGen || svDone) return;
    for (let s = 0; s < svSpeed; s++) {
      const result = svGen.next();
      if (result.done) {
        svDone = true;
        svRunning = false;
        // Ensure all indices marked sorted
        svSorted = [];
        for (let k = 0; k < svArr.length; k++) svSorted.push(k);
        svUpdateStats();
        break;
      }
      const val = result.value;
      if (val.comp) {
        for (const idx of val.comp) {
          svHighlight.push({ i: idx, color: '#ff5c1f' });
        }
      }
      if (val.swap) {
        for (const idx of val.swap) {
          svHighlight.push({ i: idx, color: '#4ade80' });
        }
      }
    }
    svUpdateStats();
  }

  // Control event listeners
  document.getElementById('sv-start').addEventListener('click', () => {
    if (svDone) {
      svBuildArray();
    }
    svStartSort();
  });

  document.getElementById('sv-pause').addEventListener('click', (e) => {
    svRunning = !svRunning;
    e.target.textContent = svRunning ? 'Pause' : 'Resume';
    document.getElementById('status-text').textContent = svRunning ? 'experiment running' : 'paused';
    svUpdateStats();
  });

  document.getElementById('sv-shuffle').addEventListener('click', () => {
    svBuildArray();
    svRender();
  });

  document.getElementById('sv-reset').addEventListener('click', () => {
    svBuildArray();
    svRender();
  });

  // Algorithm preset buttons
  document.querySelectorAll('#sv-algos .preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#sv-algos .preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      svAlgo = btn.dataset.algo;
      svBuildArray();
      svRender();
    });
  });

  // Sliders
  document.getElementById('slider-sv-size').addEventListener('input', (e) => {
    svSize = parseInt(e.target.value);
    document.getElementById('sv-size-val').textContent = svSize;
    svBuildArray();
    svRender();
  });
  document.getElementById('slider-sv-speed').addEventListener('input', (e) => {
    svSpeed = parseInt(e.target.value);
    document.getElementById('sv-speed-val').textContent = svSpeed;
  });
  document.getElementById('slider-sv-hue').addEventListener('input', (e) => {
    svHue = parseInt(e.target.value);
    document.getElementById('sv-hue-val').textContent = svHue;
    svRender();
  });

  // Initialize
  svBuildArray();
  svRender();
