document.addEventListener('DOMContentLoaded', () => {
  // --- Password gate ---
  const pwScreen  = document.getElementById('password-screen');
  const forestGame= document.getElementById('forest-game');
  const unlockBtn = document.getElementById('unlock-btn');
  const pwInput   = document.getElementById('password-input');
  const pwError   = document.getElementById('pw-error');

  unlockBtn.addEventListener('click', () => {
    const val = (pwInput.value || '').trim();
    if (val === '2412') {
      pwScreen.style.display = 'none';
      forestGame.style.display = 'block';
      startForestGame();
    } else {
      pwError.style.display = 'block';
    }
  });
});

// ======================= GAME =======================
function startForestGame() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  // ======= MODALS =======
  const backdrop    = document.getElementById('modal-backdrop');
  const winModal    = document.getElementById('question-modal');
  const retryModal  = document.getElementById('retry-modal');
  const dinnerModal = document.getElementById('dinner-modal');
  const yesBtn      = document.getElementById('yesBtn');
  const noBtn       = document.getElementById('noBtn');
  const retryBtn    = document.getElementById('retryBtn');

  function hideAllOverlays() {
    winModal.classList.remove('show');
    retryModal.classList.remove('show');
    dinnerModal.classList.remove('show');
    backdrop.style.display = 'none';
  }
  function showWinOverlay() {
    hideAllOverlays();
    backdrop.style.display = 'block';
    winModal.classList.add('show');

    yesBtn.onclick = () => {
      winModal.classList.remove('show');
      dinnerModal.classList.add('show'); // keep backdrop
    };
    // runaway "No"
    noBtn.onmouseenter = () => {
      const card = winModal.querySelector('.card');
      const maxX = Math.max(0, card.clientWidth - 100);
      const maxY = Math.max(0, card.clientHeight - 60);
      noBtn.style.position = 'relative';
      noBtn.style.left = Math.floor(Math.random() * maxX) + 'px';
      noBtn.style.top  = Math.floor(Math.random() * maxY) + 'px';
    };
  }
  function showRetryOverlay() {
    hideAllOverlays();
    backdrop.style.display = 'block';
    retryModal.classList.add('show');
    retryBtn.onclick = resetGame;
  }

  // ======= Canvas sizing =======
  function sizeCanvas() {
    const wrap = document.getElementById('forest-game');
    const cssW = Math.min(720, wrap.clientWidth || window.innerWidth - 24);
    const cssH = Math.round(cssW * (10/18));
    const dpr  = window.devicePixelRatio || 1;
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width  = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  const groundY = () => canvas.clientHeight - 56;

  // ======= Entities =======
  // Player (Anu)
  const anu = { x: 60, y: groundY(), w: 24, h: 24, vx: 0, vy: 0, speed: 4, onGround: true };

  // Stationary turret (Akash) top-left
  const turret = {
    x: () => 24,
    y: () => 48,
    cooldown: 0,
    COOLDOWN_MAX: 70,
    RANGE_X: () => canvas.clientWidth * 0.85
  };
  const projectiles = []; // {x,y,vx,vy,ttl,guaranteed,aimId}

  const trees = [];       // parallax
  const obstacles = [];   // {x,y,kind,w,h,id}
  const hearts = [];      // {x,y,w,h,linkedId?}

  let score = 0;
  let running = true;
  let t = 0;
  let hitCount = 0;       // ensure at least 2 hits per run
  let obsIdSeq = 1;

  // ======= Controls =======
  let left=false, right=false, up=false;
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  left = true;
    if (e.key === 'ArrowRight') right = true;
    if (e.key === 'ArrowUp' || e.code === 'Space') up = true;
  });
  document.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft')  left = false;
    if (e.key === 'ArrowRight') right = false;
    if (e.key === 'ArrowUp' || e.code === 'Space') up = false;
  });
  canvas.addEventListener('touchstart', () => { up = true; setTimeout(() => up = false, 120); });

  // ======= Spawners =======
  const spawnTree = () => trees.push({
    x: canvas.clientWidth + 40,
    y: Math.random() * (groundY() - 60) + 20,
    emo: Math.random() < 0.75 ? '🌲' : '🌳',
    spd: 1 + Math.random() * 1.4
  });

  function spawnObstacleWithHeart() {
    const id = obsIdSeq++;
    const o = { x: canvas.clientWidth + 30, y: groundY(), kind: Math.random() < 0.5 ? 'tiger' : 'snake', w: 22, h: 22, id };
    obstacles.push(o);
    // 80% chance to place a heart just above and slightly ahead → collectable during jump
    if (Math.random() < 0.8) {
      hearts.push({
        x: o.x + 10,
        y: groundY() - (55 + Math.random() * 10),
        w: 18, h: 18,
        linkedId: id
      });
    }
  }
  const spawnBonusHeart = () => hearts.push({
    x: canvas.clientWidth + 20,
    y: groundY() - (48 + Math.random() * 18),
    w: 18, h: 18
  });

  // ======= Draw helpers =======
  const emoji = (txt, x, y, size = 28) => {
    ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif`;
    ctx.fillText(txt, x, y);
  };
  const aabb = (ax,ay,aw,ah,bx,by,bw,bh) => ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;

  function drawBackground(){
    // Bright gradient background (avoids black canvas)
    const grad = ctx.createLinearGradient(0,0,0,canvas.clientHeight);
    grad.addColorStop(0,   '#9be7ff');
    grad.addColorStop(0.4, '#bde9a4');
    grad.addColorStop(1,   '#7bd86f');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,canvas.clientWidth,canvas.clientHeight);

    // ground line
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(0, groundY()+24, canvas.clientWidth, 4);

    // trees
    trees.forEach(tr => emoji(tr.emo, tr.x, tr.y, 28));
  }

  // High-contrast name labels (white fill + black stroke + shadow)
  function drawLabels() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '14px system-ui, sans-serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;

    // Akash label (top-left turret)
    const ax = turret.x() + 12;
    const ay = turret.y() - 8;
    ctx.strokeStyle = '#000';
    ctx.strokeText('Akash', ax, ay);
    ctx.fillStyle = '#fff';
    ctx.fillText('Akash', ax, ay);

    // Anu label (above player)
    const px = anu.x + 12;
    const py = anu.y - 28;
    ctx.strokeStyle = '#000';
    ctx.strokeText('Anu', px, py);
    ctx.fillStyle = '#fff';
    ctx.fillText('Anu', px, py);

    ctx.restore();
  }

  const drawAnu        = () => emoji('👩🏻', anu.x, anu.y, 30);
  const drawTurret     = () => emoji('👨🏻', turret.x(), turret.y(), 26);
  const drawHearts     = () => hearts.forEach(h => emoji('💖', h.x, h.y, 22));
  const drawObstacles  = () => obstacles.forEach(o => emoji(o.kind === 'tiger' ? '🐯' : '🐍', o.x, o.y, 28));
  const drawProjectile = (p) => { ctx.fillStyle = '#ff4081'; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI*2); ctx.fill(); };

  // ======= Turret logic =======
  function turretShoot() {
    if (turret.cooldown > 0) { turret.cooldown--; return; }

    let target = null, bestDx = Infinity;
    const tx = turret.x();
    const ty = turret.y();
    obstacles.forEach(o => {
      const dx = o.x - tx;
      if (dx > 20 && dx < turret.RANGE_X() && dx < bestDx) { bestDx = dx; target = o; }
    });
    if (!target) return;

    turret.cooldown = turret.COOLDOWN_MAX;

    const dx = (target.x) - tx;
    const dy = (target.y - 10) - ty;
    const len = Math.max(1, Math.hypot(dx, dy));
    const speed = 7.2;

    // Guarantee at least 2 hits, then ~70% aimed chance
    const guaranteed = hitCount < 2 ? true : Math.random() < 0.7;

    projectiles.push({
      x: tx + 12, y: ty,
      vx: (dx/len) * speed,
      vy: (dy/len) * speed,
      ttl: 100,
      guaranteed,
      aimId: target.id
    });
  }

  function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.x += p.vx; p.y += p.vy; p.ttl--;
      drawProjectile(p);

      // collide with obstacles
      for (let j = obstacles.length - 1; j >= 0; j--) {
        const o = obstacles[j];
        if (aabb(p.x-3, p.y-3, 6, 6, o.x, o.y-22, o.w, o.h)) {
          const remove = p.guaranteed || p.aimId === o.id || Math.random() < 0.5;
          if (remove) { obstacles.splice(j,1); hitCount++; }
          projectiles.splice(i,1);
          break;
        }
      }

      if (p.ttl <= 0 || p.x > canvas.clientWidth+10 || p.y < -10 || p.y > canvas.clientHeight+10) {
        projectiles.splice(i,1);
      }
    }
  }

  // ======= Game flow =======
  function resetGame() {
    obstacles.length = 0;
    hearts.length = 0;
    trees.length = 0;
    projectiles.length = 0;
    score = 0; hitCount = 0; t = 0; obsIdSeq = 1;
    anu.x = 60; anu.y = groundY(); anu.vx = 0; anu.vy = 0; anu.onGround = true;
    turret.cooldown = 0;
    running = true;
    hideAllOverlays();
    requestAnimationFrame(tick);
  }

  function tick() {
    if (!running) return;
    t++;

    ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);

    // Parallax forest
    if (t % 30 === 0) spawnTree();
    trees.forEach(tr => tr.x -= tr.spd);
    while (trees.length && trees[0].x < -40) trees.shift();

    // Controls + physics
    anu.vx = (right ? anu.speed : 0) + (left ? -anu.speed : 0);
    if (up && anu.onGround) { anu.vy = -9.5; anu.onGround = false; }
    anu.x += anu.vx;
    anu.vy += 0.5; // gravity
    anu.y += clamp(anu.vy, -20, 20);
    if (anu.y > groundY()) { anu.y = groundY(); anu.vy = 0; anu.onGround = true; }
    anu.x = Math.max(8, Math.min(canvas.clientWidth - 40, anu.x));

    // Spawns
    if (t % 85 === 0)  spawnObstacleWithHeart();
    if (t % 220 === 0) spawnBonusHeart();

    // Move world
    const obsSpeed = 3.1;
    const heartSpeed = 3.0;
    obstacles.forEach(o => o.x -= obsSpeed);
    hearts.forEach(h => h.x -= heartSpeed);
    while (obstacles.length && obstacles[0].x < -40) obstacles.shift();
    while (hearts.length && hearts[0].x < -30) hearts.shift();

    // Turret + projectiles
    turretShoot();
    updateProjectiles();

    // Heart collection
    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i];
      if (aabb(anu.x, anu.y-20, 20, 20, h.x, h.y-18, h.w, h.h)) {
        score++; hearts.splice(i,1);
      }
    }

    // Collision with animals
    let hit = false;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (aabb(anu.x, anu.y-22, 22, 22, o.x, o.y-22, o.w, o.h)) { hit = true; break; }
    }
    if (hit) { running = false; showRetryOverlay(); return; }

    // Win condition
    if (running && (score >= 6 || t > 90 * 12)) {
      running = false;
      showWinOverlay();
      return;
    }

    // ---- Render (order matters) ----
    drawBackground();
    drawHearts();
    drawObstacles();
    drawTurret();
    drawAnu();
    drawLabels(); // on top with stroke for contrast

    // HUD
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.font = '16px system-ui, sans-serif';
    ctx.lineJoin = 'round';
    ctx.strokeText(`Hearts: ${score}`, 12, 24);
    ctx.fillText(`Hearts: ${score}`, 12, 24);

    requestAnimationFrame(tick);
  }

  // helpers
  function clamp(v, mn, mx){ return Math.max(mn, Math.min(mx, v)); }

  // Init
  hideAllOverlays();
  requestAnimationFrame(tick);
}