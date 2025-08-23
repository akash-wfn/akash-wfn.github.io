// ===== Small helper: SHA-256 (hex) for light client-side obfuscation =====
async function sha256Hex(message) {
  const enc = new TextEncoder();
  const data = enc.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  // ----- Password gate (hashed compare) -----
  const pwScreen   = document.getElementById('password-screen');
  const memoryGame = document.getElementById('memory-game');
  const unlockBtn  = document.getElementById('unlock-btn');
  const pwInput    = document.getElementById('password-input');
  const pwError    = document.getElementById('pw-error');

  // SHA-256("2412")
  const PASS_HASH_HEX = '93e2a45037eb149bd13e633f2cdd848b0caaa04a4f048df7c49de10fb41a3d16';

  unlockBtn.addEventListener('click', async () => {
    const val = (pwInput.value || '').trim();
    const got = await sha256Hex(val);
    if (got === PASS_HASH_HEX) {
      pwScreen.style.display = 'none';
      memoryGame.style.display = 'block';
      startMemory();
    } else {
      pwError.style.display = 'block';
    }
  });
});

// ================= Memory Game =================
function startMemory() {
  const gridEl     = document.getElementById('grid');
  const movesEl    = document.getElementById('moves');
  const matchesEl  = document.getElementById('matches');
  const restartBtn = document.getElementById('restart');

  // Modals
  const backdrop    = document.getElementById('modal-backdrop');
  const winModal    = document.getElementById('win-modal');
  const dinnerModal = document.getElementById('dinner-modal');
  const yesBtn      = document.getElementById('yesBtn');
  const noBtn       = document.getElementById('noBtn');

  function lockBody(lock) {
    document.documentElement.style.overflow = lock ? 'hidden' : '';
    document.body.style.overflow = lock ? 'hidden' : '';
  }
  function showModal(el) {
    window.scrollTo(0,0);
    lockBody(true);
    backdrop.style.display = 'block';
    el.classList.add('show');
  }
  function hideModals() {
    [winModal, dinnerModal].forEach(m => m.classList.remove('show'));
    backdrop.style.display = 'none';
    lockBody(false);
  }

  // Pairs (6 total; gold pair unlocked only at the end)
  const pairs = [
    ['Day','Night'],
    ['Sun','Moon'],
    ['Coffee','Tea'],
    ['Anu','Akash'],          // special gold
    ['Mountain','Beach'],
    ['Meghna','Biryani']
  ];
  const GOLD_SET = new Set(['Anu','Akash']);

  // Build deck
  function buildDeck() {
    const arr = [];
    pairs.forEach(([a,b]) => {
      const goldA = GOLD_SET.has(a), goldB = GOLD_SET.has(b);
      arr.push({ id:`${a}-${b}-1`, pairKey:`${a}|${b}`, label:a, gold:goldA, matched:false });
      arr.push({ id:`${a}-${b}-2`, pairKey:`${a}|${b}`, label:b, gold:goldB, matched:false });
    });
    return shuffle(arr);
  }

  function shuffle(a){
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  // State
  let deck = [];
  let first=null, second=null, lock=false, moves=0, matches=0;
  const totalPairs    = pairs.length;      // 6
  const nonGoldTarget = totalPairs - 1;    // 5 (match these first)

  function render() {
    gridEl.innerHTML = '';
    deck.forEach(card => {
      const wrapper = document.createElement('div');
      wrapper.className = 'card' + (card.gold ? ' gold' : '');
      wrapper.dataset.id  = card.id;
      wrapper.dataset.key = card.pairKey;

      // Back icon: 🔒 only if gold is still locked (dynamic via class we'll set below)
      wrapper.innerHTML = `
        <div class="inner">
          <div class="face front">${card.label}</div>
          <div class="face back">💞</div>
        </div>
      `;

      // If already matched (e.g., after flipping), reflect in DOM so they don't re-flip
      if (card.matched) {
        wrapper.classList.add('matched', 'flipped');
      }

      // Add click handler (we compute "locked" dynamically from class on the element)
      wrapper.addEventListener('click', () => onFlip(wrapper, card));
      gridEl.appendChild(wrapper);
    });

    // Initially lock gold (with 🔒 icon) until 5 non-gold matched
    if (matches < nonGoldTarget) {
      lockGoldDOM(true);
    }

    movesEl.textContent = moves;
    matchesEl.textContent = matches;
  }

  // Lock/unlock the gold cards in place without re-rendering the grid
  function lockGoldDOM(locked) {
    const goldEls = gridEl.querySelectorAll('.card.gold');
    goldEls.forEach(el => {
      const back = el.querySelector('.back');
      if (locked) {
        el.classList.add('locked');
        if (back) back.textContent = '🔒';
      } else {
        el.classList.remove('locked');
        if (back) back.textContent = '💞';
      }
    });
  }

  function reset() {
    deck = buildDeck();
    first = second = null; lock = false; moves = 0; matches = 0;
    render();
  }

  function onFlip(el, card) {
    if (lock) return;
    // Don't allow interaction with matched cards
    if (card.matched || el.classList.contains('matched')) return;

    // Prevent flipping Anu/Akash UNTIL all other pairs are matched (dynamic by DOM class)
    if (el.classList.contains('locked')) return;

    // Ignore if it's already face-up
    if (el.classList.contains('flipped')) return;

    el.classList.add('flipped');

    if (!first) { first = { el, card }; return; }
    if (!second) {
      second = { el, card };
      moves++; movesEl.textContent = moves;
      checkMatch();
    }
  }

  function checkMatch() {
    const k1 = first.card.pairKey;
    const k2 = second.card.pairKey;

    if (k1 === k2) {
      // Matched pair
      first.el.classList.add('matched');
      second.el.classList.add('matched');
      first.card.matched = true;
      second.card.matched = true;
      first = second = null;

      matches++; matchesEl.textContent = matches;

      // If we've matched all non-gold pairs, just UNLOCK gold (do NOT auto-flip).
      if (matches === nonGoldTarget) {
        lockGoldDOM(false); // remove 'locked' + change 🔒 to 💞 on existing elements
      }

      // If that was the final (gold) match, show win flow.
      if (matches === totalPairs) {
        setTimeout(showWinFlow, 400);
      }
    } else {
      // Not a match → flip back
      lock = true;
      setTimeout(() => {
        if (first)  first.el.classList.remove('flipped');
        if (second) second.el.classList.remove('flipped');
        first = second = null;
        lock = false;
      }, 700);
    }
  }

  function showWinFlow() {
    showModal(winModal);
    // runaway "No"
    const runaway = function(){
      const card = winModal.querySelector('.cardx');
      const maxX = Math.max(0, card.clientWidth - 100);
      const maxY = Math.max(0, card.clientHeight - 60);
      this.style.position = 'relative';
      this.style.left = Math.floor(Math.random()*maxX)+'px';
      this.style.top  = Math.floor(Math.random()*maxY)+'px';
    };
    noBtn.onmouseenter = runaway;
    noBtn.ontouchstart = runaway;
    yesBtn.onclick = () => {
      winModal.classList.remove('show');
      showModal(dinnerModal);
    };
  }

  restartBtn.addEventListener('click', () => {
    hideModals();
    reset();
  });

  // Start
  reset();
}