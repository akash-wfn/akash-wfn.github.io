// --- Simple DOB gate (ddmm): 2412 ---
(function initGate() {
    const unlockBtn = document.getElementById('unlock-btn');
    unlockBtn?.addEventListener('click', () => {
      const val = (document.getElementById('password-input').value || '').trim();
      if (val === '2412') {
        document.getElementById('password-screen').classList.add('hidden');
        document.getElementById('forest-game').classList.remove('hidden');
        startForestGame();
      } else {
        document.getElementById('pw-error').classList.remove('hidden');
      }
    });
  })();
  
  // --- Emoji forest game ---
  function startForestGame() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d', { alpha: false });
  
    // Make canvas crisp on high-DPI
    function sizeCanvas() {
      const cssWidth = canvas.clientWidth;
      const cssHeight = cssWidth / (18/10); // must match aspect-ratio
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
    }
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
  
    // Game state
    const GROUND_Y = () => canvas.clientHeight - 56;     // ground baseline
    let running = true;
    let time = 0;
    let score = 0;
  
    // Player: Anu (👩🏻), helper: Akash (👨🏻)
    const player = { x: 40, y: GROUND_Y(), w: 36, h: 36, vx: 0, vy: 0, speed: 4, onGround: true };
    let akash = null; // {x,y,ttl}
    const hearts = [];     // {x,y}
    const obstacles = [];  // {x,y,kind} kind: 'tiger' | 'snake'
    const trees = [];      // parallax forest: {x,y,emoji,spd}
  
    // Controls (desktop + mobile)
    let left = false, right = false, up = false;
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') left = true;
      if (e.key === 'ArrowRight') right = true;
      if (e.key === 'ArrowUp' || e.code === 'Space') up = true;
    });
    document.addEventListener('keyup', e => {
      if (e.key === 'ArrowLeft') left = false;
      if (e.key === 'ArrowRight') right = false;
      if (e.key === 'ArrowUp' || e.code === 'Space') up = false;
    });
    // Tap to jump on mobile
    canvas.addEventListener('touchstart', () => { up = true; setTimeout(()=>up=false, 120); });
  
    // Spawners
    function spawnTree() {
      const y = Math.random() * (GROUND_Y() - 60) + 20;
      trees.push({ x: canvas.clientWidth + 50, y, emoji: Math.random() < 0.75 ? '🌲' : '🌳', spd: 1 + Math.random()*1.5 });
    }
    function spawnObstacle() {
      const kind = Math.random() < 0.55 ? 'tiger' : 'snake';
      obstacles.push({ x: canvas.clientWidth + 40, y: GROUND_Y(), kind });
    }
    function spawnHeart() {
      hearts.push({ x: canvas.clientWidth + 20, y: GROUND_Y() - (60 + Math.random()*80) });
    }
  
    // Helper appears after collecting a heart
    function callAkash(px, py) {
      akash = { x: px + 70, y: py, ttl: 220 }; // ~ few seconds
    }
  
    // Drawing helpers
    function drawTextEmoji(emoji, x, y, sizePx) {
      ctx.font = `${sizePx || 28}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif`;
      ctx.fillText(emoji, x, y);
    }
  
    function drawBackground() {
      // Parallax “ground” line
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(0, GROUND_Y() + 24, canvas.clientWidth, 4);
      // Trees
      trees.forEach(t => drawTextEmoji(t.emoji, t.x, t.y, 28));
    }
  
    function drawPlayer() {
      drawTextEmoji('👩🏻', player.x, player.y, 34); // Anu
      // subtle shadow
      ctx.fillStyle = '#0003';
      ctx.fillRect(player.x + 2, player.y + 6, 18, 3);
    }
  
    function drawAkash() {
      if (!akash) return;
      drawTextEmoji('👨🏻', akash.x, akash.y, 34);
    }
  
    function drawHearts() {
      hearts.forEach(h => drawTextEmoji('💖', h.x, h.y, 24));
    }
  
    function drawObstacles() {
      obstacles.forEach(o => {
        const emoji = o.kind === 'tiger' ? '🐯' : '🐍';
        drawTextEmoji(emoji, o.x, o.y, 30);
      });
    }
  
    function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
      return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }
  
    // Game loop
    function tick() {
      if (!running) return;
      time++;
  
      // Clear
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  
      // Background objects
      if (time % 30 === 0) spawnTree();
      trees.forEach(t => t.x -= t.spd);
      while (trees.length && trees[0].x < -40) trees.shift();
  
      // Player physics
      player.vx = (right ? player.speed : 0) + (left ? -player.speed : 0);
      if (up && player.onGround) { player.vy = -9.5; player.onGround = false; }
  
      player.x += player.vx;
      player.vy += 0.5; // gravity
      player.y += player.vy;
  
      // ground clamp
      const pBase = GROUND_Y();
      if (player.y > pBase) { player.y = pBase; player.vy = 0; player.onGround = true; }
      player.x = Math.max(8, Math.min(canvas.clientWidth - 40, player.x));
  
      // Spawns
      if (time % 85 === 0) spawnObstacle();
      if (time % 180 === 0) spawnHeart();
  
      // Move/cleanup obstacles
      obstacles.forEach(o => o.x -= 3.2);
      while (obstacles.length && obstacles[0].x < -40) obstacles.shift();
  
      // Move/cleanup hearts
      hearts.forEach(h => h.x -= 2.6);
      while (hearts.length && hearts[0].x < -30) hearts.shift();
  
      // Update helper
      if (akash) {
        akash.ttl--;
        if (akash.ttl <= 0) akash = null;
        else akash.x = player.x + 70; // follow alongside
        akash && (akash.y = player.y);
      }
  
      // Collisions
      // 1) Collect hearts
      hearts.forEach((h, i) => {
        if (aabb(player.x, player.y-26, 24, 24, h.x, h.y-20, 20, 20)) {
          score++;
          hearts.splice(i, 1);
          callAkash(player.x, player.y);
        }
      });
  
      // 2) Animals hit player unless Akash is present (bodyguard mode)
      obstacles.forEach((o, i) => {
        const hitPlayer = aabb(player.x, player.y-26, 24, 24, o.x, o.y-22, 26, 26);
        const hitAkash  = akash && aabb(akash.x, akash.y-26, 24, 24, o.x, o.y-22, 26, 26);
  
        if (hitAkash) {
          // Akash blocks the animal: remove obstacle, reduce Akash ttl slightly
          obstacles.splice(i, 1);
          if (akash) akash.ttl -= 40;
        } else if (hitPlayer) {
          // Reached the end condition by narrative: Anu “makes it out” (we pop question)
          running = false;
          showQuestion();
        }
      });
  
      // Win condition by collecting hearts too (e.g., 6)
      if (score >= 6 && running) {
        running = false;
        showQuestion();
      }
  
      // Draw everything
      drawBackground();
      drawHearts();
      drawObstacles();
      drawAkash();
      drawPlayer();
  
      // HUD
      ctx.fillStyle = '#222';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText(`Hearts: ${score}`, 10, 22);
  
      requestAnimationFrame(tick);
    }
  
    requestAnimationFrame(tick);
  
    // Overlays
    function showQuestion() {
      document.getElementById('question-overlay').classList.remove('hidden');
  
      const yesBtn = document.getElementById('yesBtn');
      const noBtn  = document.getElementById('noBtn');
  
      yesBtn.onclick = () => {
        document.getElementById('question-overlay').classList.add('hidden');
        showDinner();
      };
  
      // Runaway “No” (gaslight-lite 😅)
      const container = document.querySelector('#forest-game');
      noBtn.onmouseenter = () => {
        const maxX = Math.max(0, container.clientWidth - 100);
        const maxY = 200; // keep in overlay region
        noBtn.style.position = 'relative';
        noBtn.style.left = Math.floor(Math.random() * maxX) + 'px';
        noBtn.style.top  = Math.floor(Math.random() * maxY) + 'px';
      };
    }
  
    function showDinner() {
      const dinner = document.getElementById('dinner-overlay');
      dinner.classList.remove('hidden');
    }
  }