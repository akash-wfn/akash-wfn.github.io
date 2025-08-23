---
layout: default
title: "Anu & Akash Forest Game"
permalink: /anu-game/
---

<div id="password-screen" class="game-block">
  <h2>🔒 Enter Password</h2>
  <p>Hint: Anu’s DOB (ddmm)</p>
  <input type="password" id="password-input" placeholder="Enter password" />
  <button id="unlock-btn" type="button">Unlock</button>
  <p id="pw-error" class="error hidden">❌ Wrong password, try again!</p>
</div>

<div id="forest-game" class="game-block hidden">
  <canvas id="gameCanvas"></canvas>

  <!-- Question overlay -->
  <div id="question-overlay" class="overlay hidden">
    <h2>You made it out of the forest, Anu! 🌲✨</h2>
    <p>Will you go on a date with me?</p>
    <div class="btn-row">
      <button id="yesBtn" class="primary">💖 Yes</button>
      <button id="noBtn" class="ghost">No 🙈</button>
    </div>
  </div>

  <!-- Final dinner scene -->
  <div id="dinner-overlay" class="overlay hidden">
    <div class="dinner-scene">
      <div class="dinner-row">
        <span class="sprite">👨🏻</span>
        <span class="table">🍽️ 🕯️ 🍽️</span>
        <span class="sprite">👩🏻</span>
      </div>
      <p class="ending">Happily ever after ✨</p>
    </div>
  </div>
</div>

<script src="{{ '/js/game.js' | relative_url }}"></script>