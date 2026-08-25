// ============================================================
  //  Main animation loop — runs all experiments, only updates
  //  the visible one for performance.
  // ============================================================
  let lastFpsTime = performance.now();
  let frameCount = 0;

  function mainLoop() {
    if (activeExp === 0 && !expPaused[0]) {
      for (let s = 0; s < speed; s++) rsStep();
      rsRender();
      document.getElementById('gen-count').textContent = generation.toLocaleString();
    } else if (activeExp === 1 && !expPaused[1]) {
      ffStep();
    } else if (activeExp === 2 && !expPaused[2]) {
      lsStep();
    } else if (activeExp === 3 && !expPaused[3]) {
      for (let s = 0; s < caSpeed; s++) caStep();
      caRender();
      caUpdateUI();
    } else if (activeExp === 4 && !expPaused[4]) {
      if (mbRendering) mbRenderFrame();
    } else if (activeExp === 5 && !expPaused[5]) {
      boidsStep();
    } else if (activeExp === 6 && !expPaused[6]) {
      for (let s = 0; s < saSpeed; s++) saStep();
    } else if (activeExp === 7 && !expPaused[7]) {
      if (svRunning) {
        svStep();
        svRender();
      }
    } else if (activeExp === 8 && !expPaused[8]) {
      waveStep();
      waveRender();
      waveUpdateStats();
    } else if (activeExp === 9 && !expPaused[9]) {
      for (let s = 0; s < nbSpeedSteps; s++) nbStep();
      nbRender();
      nbUpdateStats();
    } else if (activeExp === 11 && !expPaused[11]) {
      laStep();
      laRender();
    } else if (activeExp === 12 && !expPaused[12]) {
      fdRender();
    } else if (activeExp === 13 && !expPaused[13]) {
      sfStep();
      sfRender();
    } else if (activeExp === 14 && !expPaused[14]) {
      plStep();
      plRender();
    } else if (activeExp === 15 && !expPaused[15]) {
      spStep();
    } else if (activeExp === 16 && !expPaused[16]) {
      nfRenderChunk();
    } else if (activeExp === 17 && !expPaused[17]) {
      if (!dpPaused && !dpDragging) dpStep();
      dpRender();
    } else if (activeExp === 18) {
      if (!fsPaused) fsStep();
      fsRender();
    } else if (activeExp === 19 && !expPaused[19]) {
      ifsStep();
    } else if (activeExp === 20 && !expPaused[20]) {
      wcaStep();
    } else if (activeExp === 21 && !expPaused[21]) {
      pmStep();
    } else if (activeExp === 22 && !expPaused[22]) {
      for (var bzS = 0; bzS < bzSpeedSteps; bzS++) bzStep();
      bzRender();
    } else if (activeExp === 23 && !expPaused[23]) {
      ljStep();
    } else if (activeExp === 24 && !expPaused[24]) {
      voStep();
    } else if (activeExp === 25 && !expPaused[25]) {
      dlaStep();
      dlaRender();
    } else if (activeExp === 26) {
      if (!expPaused[26]) wfStep();
      wfRender();
    } else if (activeExp === 27) {
      // Logistic map is mostly static — no per-frame update needed
      // (re-rendered on interaction)
    } else if (activeExp === 28 && !expPaused[28]) {
      if (tspSolving) tspAnnealStep();
    } else if (activeExp === 29 && !expPaused[29]) {
      for (var ccaS = 0; ccaS < ccaSpeedSteps; ccaS++) ccaStep();
      ccaRender();
    } else if (activeExp === 30 && !expPaused[30]) {
      msStep();
      msRender();
    } else if (activeExp === 31) {
      mazeTick();
    } else if (activeExp === 32 && !expPaused[32]) {
      for (var chlS = 0; chlS < chlSpeedSteps; chlS++) chlStep();
      chlRender();
    } else if (activeExp === 33) {
      if (!expPaused[33]) penDrawFrame();
    }
    // Experiment 11 is event-driven (not in the RAF loop, terrain renders on demand)

    // FPS
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
      const fps = Math.round(frameCount * 1000 / (now - lastFpsTime));
      if (activeExp === 0) document.getElementById('fps').textContent = fps;
      else if (activeExp === 1) document.getElementById('fps2').textContent = fps;
      else if (activeExp === 2) document.getElementById('fps3').textContent = fps;
      else if (activeExp === 3) document.getElementById('fps4').textContent = fps;
      else if (activeExp === 4) document.getElementById('fps5').textContent = fps;
      else if (activeExp === 5) document.getElementById('fps6').textContent = fps;
      else if (activeExp === 6) document.getElementById('fps7').textContent = fps;
      else if (activeExp === 7) document.getElementById('fps8').textContent = fps;
      else if (activeExp === 8) document.getElementById('fps9').textContent = fps;
      else if (activeExp === 9) document.getElementById('fps10').textContent = fps;
      else if (activeExp === 10) document.getElementById('fps11').textContent = fps;
      else if (activeExp === 11) document.getElementById('fps12').textContent = fps;
      else if (activeExp === 12) document.getElementById('fps13').textContent = fps;
      else if (activeExp === 13) document.getElementById('fps14').textContent = fps;
      else if (activeExp === 14) document.getElementById('fps15').textContent = fps;
      else if (activeExp === 15) document.getElementById('fps16').textContent = fps;
      else if (activeExp === 16) document.getElementById('fps17').textContent = fps;
      else if (activeExp === 17) document.getElementById('fps18').textContent = fps;
      else if (activeExp === 18) document.getElementById('fps19').textContent = fps;
      else if (activeExp === 19) document.getElementById('fps20').textContent = fps;
      else if (activeExp === 20) document.getElementById('fps21').textContent = fps;
      else if (activeExp === 21) document.getElementById('fps22').textContent = fps;
      else if (activeExp === 22) document.getElementById('fps23').textContent = fps;
      else if (activeExp === 23) document.getElementById('fps24').textContent = fps;
      else if (activeExp === 24) document.getElementById('fps25').textContent = fps;
      else if (activeExp === 25) document.getElementById('fps26').textContent = fps;
      else if (activeExp === 26) document.getElementById('fps27').textContent = fps;
      else if (activeExp === 27) document.getElementById('fps28').textContent = fps;
      else if (activeExp === 28) document.getElementById('fps29').textContent = fps;
      else if (activeExp === 29) document.getElementById('fps30').textContent = fps;
      else if (activeExp === 30) document.getElementById('fps31').textContent = fps;
      else if (activeExp === 31) document.getElementById('fps32').textContent = fps;
      else if (activeExp === 32) document.getElementById('fps33').textContent = fps;
      else if (activeExp === 33) document.getElementById('fps34').textContent = fps;
      frameCount = 0;
      lastFpsTime = now;
    }

    rafId = requestAnimationFrame(mainLoop);
  }
