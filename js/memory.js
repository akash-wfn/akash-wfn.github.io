document.addEventListener('DOMContentLoaded', () => {
  // ----- Password gate -----
  const pwScreen = document.getElementById('password-screen');
  const memoryGame = document.getElementById('memory-game');
  const unlockBtn = document.getElementById('unlock-btn');
  const pwInput  = document.getElementById('password-input');
  const pwError  = document.getElementById('pw-error');

  unlockBtn.addEventListener('click', () => {
    const val = (pwInput.value || '').trim();
    if (val === '2412') {
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
  const gridEl = document.getElementById('grid');
  const movesEl = document.getElementById('moves');
  const matchesEl = document.getElementById('matches');
  const restartBtn = document.getElementById('restart');

  // Modals
  const backdrop = document.getElementById('modal-backdrop');
  const winModal = document.getElementById('win-modal');
  const dinnerModal = document.getElementById('dinner-modal');
  const yesBtn = document.getElementById('yesBtn');
  const noBtn  = document.getElementById('noBtn');

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

  // Pairs (8 total)
  const pairs = [
    ['Salt','Pepper'],
    ['Bread','Butter'],
    ['Day','Night'],
    ['Sun','Moon'],
    ['Coffee','Tea'],
    ['Anu','Akash'],          // special gold
    ['Mountain','Beach'],
    ['Meghna','Biryani']
  ];

  // Build deck (two cards per pair) with metadata for colors
  function buildDeck() {
    const arr = [];
    pairs.forEach(([a,b]) => {
      const isGoldA = (a === 'Anu' || a === 'Akash');
      const isGoldB = (b === 'Anu' || b === 'Akash');
      arr.push({ id:`${a}-${b}-1`, pairKey:`${a}|${b}`, label:a, gold:isGoldA });
      arr.push({ id:`${a}-${b}-2`, pairKey:`${a}|${b}`, label:b, gold:isGoldB });
    });
    return shuffle(arr);
  }

  // Fisher–Yates
  function shuffle(a){
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  // Render deck
  let deck = [];
  let first=null, second=null, lock=false, moves=0, matches=0;

  function render() {
    gridEl.innerHTML = '';
    deck.forEach(card => {
      const wrapper = document.createElement('div');
      wrapper.className = 'card' + (card.gold ? ' gold' : '');
      wrapper.dataset.id = card.id;
      wrapper.dataset.key = card.pairKey;

      wrapper.innerHTML = `
        <div class="inner">
          <div class="face front">${card.label}</div>
          <div class="face back">💞</div>
        </div>
      `;

      wrapper.addEventListener('click', () => onFlip(wrapper, card));
      gridEl.appendChild(wrapper);
    });
    movesEl.textContent = moves;
    matchesEl.textContent = matches;
  }

  function reset() {
    deck = buildDeck();
    first = second = null; lock = false; moves = 0; matches = 0;
    render();
  }

  function onFlip(el, card) {
    if (lock) return;
    if (el.classList.contains('matched') || el.classList.contains('flipped')) return;

    el.classList.add('flipped');

    if (!first) { first = { el, card }; return; }
    if (first && !second) {
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
      first = second = null;
      matches++; matchesEl.textContent = matches;
      if (matches === 8) {
        setTimeout(() => {
          showModal(winModal);
          // Runaway "No"
          noBtn.onmouseenter = runaway;
          noBtn.ontouchstart = runaway;
          yesBtn.onclick = () => {
            winModal.classList.remove('show');
            showModal(dinnerModal);
          };
        }, 400);
      }
    } else {
      // Not a match → flip back after short delay
      lock = true;
      setTimeout(() => {
        first.el.classList.remove('flipped');
        second.el.classList.remove('flipped');
        first = second = null;
        lock = false;
      }, 700);
    }
  }

  function runaway() {
    const card = winModal.querySelector('.cardx');
    const maxX = Math.max(0, card.clientWidth - 100);
    const maxY = Math.max(0, card.clientHeight - 60);
    this.style.position = 'relative';
    this.style.left = Math.floor(Math.random() * maxX) + 'px';
    this.style.top  = Math.floor(Math.random() * maxY) + 'px';
  }

  restartBtn.addEventListener('click', () => {
    hideModals();
    reset();
  });

  // Start
  reset();
}