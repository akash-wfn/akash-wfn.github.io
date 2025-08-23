document.addEventListener('DOMContentLoaded', () => {
  // Password gate
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

function startForestGame() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  // Modals
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
    document.body.classList.remove('modal-open');
  }
  function showWinOverlay() {
    hideAllOverlays();
    backdrop.style.display = 'block';
    winModal.classList.add('show');
    document.body.classList.add('modal-open');

    yesBtn.onclick = () => {
      winModal.classList.remove('show');
      dinnerModal.classList.add('show'); // keep backdrop
    };
    noBtn.onmouseenter = () => {
      const card = winModal.querySelector('.card');
      const maxX = Math.max(0, card.clientWidth - 100);
      const maxY = Math.max(0, card.clientHeight - 60);
      noBtn.style.position = 'relative';
      noBtn.style.left = Math.floor(Math.random()*maxX) + 'px';
      noBtn.style.top  = Math.floor(Math.random()*maxY) + 'px';
    };
  }
  function showRetryOverlay() {
    hideAllOverlays();
    backdrop.style.display = 'block';
    retryModal.classList.add('show');
    document.body.classList.add('modal-open');
    retryBtn.onclick = resetGame;
  }

  // Canvas sizing
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

  // Device tuning
  const touchDevice = matchMedia('(hover: none)').matches;
  const speedScaleBase = touchDevice ? 0.85 : 1.0; // slower on phones

  // Entities
  const anu = { x: 60, y: groundY(), w: 24, h: 24, vx: 0, vy: 0, speed: 4, onGround: true };

  // Akash turret: middle-left
  const turret = {
    x: () => 46,                               // a bit in from the left
    y: () => Math.round(canvas.clientHeight * 0.55), // middle-left vertically
    cooldown: 0,
    COOLDOWN_MAX: 70,
    RANGE_X: () => canvas.clientWidth * 0.9
  };

  const projectiles = []; // {x,y,vx,vy,ttl,guaranteed,aimId,trail:[]}
  const trees = [];
  const obstacles = [];   // {x,y,kind,w,h,id}
  const hearts = [];      // {x,y,w,h,linkedId?}

  let score = 0;
  let running = true;
  let t = 0;
  let hitCount = 0;
  let obsIdSeq = 1;

  // Controls
  let left=false, right=false, up=false, jumpTapCooldown=0;
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

  // Mobile: canvas tap still works
  canvas.addEventListener('touchstart', () => { triggerJump(); });

  // Mobile: dedicated jump button
  const jumpBtn = document.getElementById('jumpBtn');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => { triggerJump(); });
    jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); triggerJump(); }, { passive:false });
  }
  function triggerJump(){
    if (jumpTapCooldown>0) return;
    up = true;
    setTimeout(()=>{ up=false; }, 120);
    jumpTapCooldown = 8; // a few frames cooldown to avoid multi-trigger
  }

  // Spawners
  const spawnTree = () => trees.push({
    x: canvas.clientWidth + 40,
    y: Math.random()*(groundY()-60)+20,
    emo: Math.random()<0.75?'🌲':'🌳',
    spd: 1+Math.random()*1.4
  });

  function spawnObstacleWithHeart() {
    const id = obsIdSeq++;
    const o = { x: canvas.clientWidth + 30, y: groundY(), kind: Math.random()<0.5?'tiger':'snake', w: 22, h: 22, id };
    obstacles.push(o);
    if (Math.random() < 0.8) {
      hearts.push({
        x: o.x + 10,
        y: groundY() - (55 + Math.random()*10),
        w: 18, h: 18,
        linkedId: id
      });
    }
  }
  const spawnBonusHeart = () => hearts.push({
    x: canvas.clientWidth + 20,
    y: groundY() - (48 + Math.random()*18),
    w: 18, h: 18
  });

  // Helpers
  const emoji = (txt,x,y,size=28)=>{ ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif`; ctx.fillText(txt,x,y); };
  const aabb = (ax,ay,aw,ah,bx,by,bw,bh)=> ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;

  // Drawing
  function drawBackground(){
    const grad = ctx.createLinearGradient(0,0,0,canvas.clientHeight);
    grad.addColorStop(0,   '#9be7ff');
    grad.addColorStop(0.4, '#bde9a4');
    grad.addColorStop(1,   '#7bd86f');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,canvas.clientWidth,canvas.clientHeight);

    ctx.fillStyle = '#4caf50';
    ctx.fillRect(0, groundY()+24, canvas.clientWidth, 4);

    trees.forEach(tr => emoji(tr.emo, tr.x, tr.y, 28));
  }

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

    // Akash
    const ax = turret.x() + 12;
    const ay = turret.y() - 8;
    ctx.strokeStyle = '#000'; ctx.strokeText('Akash', ax, ay);
    ctx.fillStyle = '#fff';   ctx.fillText('Akash', ax, ay);

    // Anu
    const px = anu.x + 12;
    const py = anu.y - 28;
    ctx.strokeStyle = '#000'; ctx.strokeText('Anu', px, py);
    ctx.fillStyle = '#fff';   ctx.fillText('Anu', px, py);

    ctx.restore();
  }

  const drawAnu        = ()=> emoji('👩🏻', anu.x, anu.y, 30);
  const drawTurret     = ()=> emoji('👨🏻', turret.x(), turret.y(), 30);
  const drawHearts     = ()=> hearts.forEach(h=> emoji('💖', h.x, h.y, 22));
  const drawObstacles  = ()=> obstacles.forEach(o=> emoji(o.kind==='tiger'?'🐯':'🐍', o.x, o.y, 28));

  // Bright, visible projectiles with glow + short trail
  function drawProjectile(p){
    // trail
    if (!p.trail) p.trail = [];
    p.trail.push({x:p.x, y:p.y});
    if (p.trail.length>6) p.trail.shift();
    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let i=1; i<p.trail.length; i++){
      const a = p.trail[i-1], b = p.trail[i];
      ctx.strokeStyle = `rgba(255,235,59,${i/p.trail.length})`; // yellow fade
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // head
    ctx.shadowColor = '#ffeb3b';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Turret
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

    const guaranteed = hitCount < 2 ? true : Math.random() < 0.7;

    projectiles.push({
      x: tx + 16, y: ty - 4,                  // offset a bit so it looks like firing
      vx: (dx/len) * speed,
      vy: (dy/len) * speed,
      ttl: 100,
      guaranteed,
      aimId: target.id,
      trail: []
    });
  }

  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.ttl -= dt;
      drawProjectile(p);

      // collide with obstacles
      for (let j = obstacles.length - 1; j >= 0; j--) {
        const o = obstacles[j];
        if (aabb(p.x-4, p.y-4, 8, 8, o.x, o.y-22, o.w, o.h)) {
          const remove = p.guaranteed || p.aimId === o.id || Math.random() < 0.5;
          if (remove) { obstacles.splice(j,1); hitCount++; }
          projectiles.splice(i,1);
          break;
        }
      }
      if (p.ttl <= 0 || p.x > canvas.clientWidth+12 || p.y < -12 || p.y > canvas.clientHeight+12) {
        projectiles.splice(i,1);
      }
    }
  }

  // Game flow
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
    lastTime = undefined; // reset timer
    requestAnimationFrame(tick);
  }

  // Time-based loop (smooth on mobile/desktop)
  let lastTime;
  function tick(now) {
    if (!running) return;
    if (jumpTapCooldown>0) jumpTapCooldown--;

    // dt as multiple of 60fps frames
    if (lastTime === undefined) lastTime = now;
    let dt = (now - lastTime) / 16.6667; // 1 = ~60fps frame
    dt = Math.min(Math.max(dt, 0.5), 2.0); // clamp to avoid spikes
    const S = dt * speedScaleBase;
    lastTime = now;
    t += dt;

    ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);

    // Parallax forest
    if (Math.floor(t) % 30 === 0 && trees.length < 25) spawnTree();
    trees.forEach(tr => tr.x -= tr.spd * 0.9 * S);
    while (trees.length && trees[0].x < -40) trees.shift();

    // Controls + physics
    anu.vx = (right ? anu.speed : 0) + (left ? -anu.speed : 0);
    if (up && anu.onGround) { anu.vy = -9.5; anu.onGround = false; }
    anu.x += anu.vx * S;
    anu.vy += 0.5 * S;                   // gravity
    anu.y += clamp(anu.vy, -20, 20) * S;
    if (anu.y > groundY()) { anu.y = groundY(); anu.vy = 0; anu.onGround = true; }
    anu.x = Math.max(8, Math.min(canvas.clientWidth-40, anu.x));

    // Spawns
    if (Math.floor(t) % 85 === 0)  spawnObstacleWithHeart();
    if (Math.floor(t) % 220 === 0) spawnBonusHeart();

    // Move world
    const obsSpeed = 3.1 * (touchDevice ? 0.85 : 1.0);
    const heartSpeed = 3.0 * (touchDevice ? 0.85 : 1.0);
    obstacles.forEach(o => o.x -= obsSpeed * S);
    hearts.forEach(h => h.x -= heartSpeed * S);
    while (obstacles.length && obstacles[0].x < -40) obstacles.shift();
    while (hearts.length && hearts[0].x < -30) hearts.shift();

    // Turret + projectiles
    turretShoot();
    updateProjectiles(S);

    // Collect hearts
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

    // Render
    drawBackground();
    drawHearts();
    drawObstacles();
    drawTurret();
    drawAnu();
    drawLabels();

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

  function clamp(v, mn, mx){ return Math.max(mn, Math.min(mx, v)); }

  hideAllOverlays();
  requestAnimationFrame(tick);
}