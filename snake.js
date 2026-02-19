(() => {
  const GRID = 20;
  const COLORS = {
    bg:       '#3b2a1e',
    grid:     '#4a3528',
    snake:    '#d4bfa0',
    head:     '#f7f3ee',
    food:     '#b85c38',
    gameover: '#f7f3ee',
  };

  const overlay  = document.getElementById('snakeOverlay');
  const canvas   = document.getElementById('snakeCanvas');
  const scoreEl  = document.getElementById('score');
  const hintEl   = document.getElementById('snakeHint');
  const closeBtn = document.getElementById('snakeClose');
  const trigger  = document.getElementById('snakeTrigger');
  const ctx      = canvas.getContext('2d');

  let snake, dir, nextDir, food, score, state, intervalId, CELL;

  function initCanvas() {
    const size = Math.min(window.innerWidth - 64, 360);
    CELL = Math.floor(size / GRID);
    canvas.width  = CELL * GRID;
    canvas.height = CELL * GRID;
  }

  function init() {
    initCanvas();
    snake   = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dir     = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    food    = spawnFood();
    score   = 0;
    state   = 'idle';
    scoreEl.textContent = '0';
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    hintEl.textContent = isTouch ? 'Swipe or use d-pad to start' : 'Arrow keys to move';
    draw();
  }

  function spawnFood() {
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  function step() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) return gameOver();
    if (snake.some(s => s.x === head.x && s.y === head.y)) return gameOver();

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score++;
      scoreEl.textContent = score;
      food = spawnFood();
    } else {
      snake.pop();
    }
    draw();
  }

  function gameOver() {
    state = 'over';
    stopLoop();
    draw();
    hintEl.textContent = 'Game over — tap or press R to restart';
  }

  function draw() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, GRID * CELL); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(GRID * CELL, i * CELL); ctx.stroke();
    }

    ctx.fillStyle = COLORS.food;
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? COLORS.head : COLORS.snake;
      const pad = i === 0 ? 1 : 2;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 3);
      ctx.fill();
    });

    if (state === 'over') {
      ctx.fillStyle = 'rgba(59,42,30,0.55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = COLORS.gameover;
      ctx.font = `600 ${Math.round(CELL * 1.2)}px 'Inter', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
    }
  }

  function startLoop() {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(step, 130);
  }

  function stopLoop() {
    clearInterval(intervalId);
    intervalId = null;
  }

  function steer(d) {
    if (d.x === -dir.x && d.y === -dir.y) return; // no reversing
    nextDir = d;
    if (state === 'idle') {
      state = 'running';
      hintEl.textContent = window.matchMedia('(pointer: coarse)').matches
        ? 'Swipe to steer'
        : 'Arrow keys to steer — Esc to close';
      startLoop();
    }
    if (state === 'over') {
      stopLoop();
      init();
    }
  }

  // ── Keyboard ────────────────────────────────────
  document.addEventListener('keydown', e => {
    if ((e.key === 's' || e.key === 'S') && !overlay.classList.contains('active')) {
      openGame(); return;
    }
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') { closeGame(); return; }
    if ((e.key === 'r' || e.key === 'R') && state === 'over') { stopLoop(); init(); return; }

    const map = { ArrowUp: {x:0,y:-1}, ArrowDown: {x:0,y:1}, ArrowLeft: {x:-1,y:0}, ArrowRight: {x:1,y:0} };
    if (!map[e.key]) return;
    e.preventDefault();
    steer(map[e.key]);
  });

  // ── D-pad ────────────────────────────────────────
  const dirMap = { up: {x:0,y:-1}, down: {x:0,y:1}, left: {x:-1,y:0}, right: {x:1,y:0} };
  document.getElementById('dpad').addEventListener('pointerdown', e => {
    const btn = e.target.closest('[data-dir]');
    if (!btn) return;
    e.preventDefault();
    steer(dirMap[btn.dataset.dir]);
  });

  // ── Swipe on canvas ──────────────────────────────
  // Fires mid-swipe once threshold is crossed, then resets origin
  // so chained turns work without lifting the finger.
  const SWIPE_THRESHOLD = 24;
  let touchOrigin = null;

  canvas.addEventListener('touchstart', e => {
    touchOrigin = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  canvas.addEventListener('touchmove', e => {
    if (!touchOrigin) return;
    const dx = e.touches[0].clientX - touchOrigin.x;
    const dy = e.touches[0].clientY - touchOrigin.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      steer(dx > 0 ? {x:1,y:0} : {x:-1,y:0});
    } else {
      steer(dy > 0 ? {x:0,y:1} : {x:0,y:-1});
    }
    // Reset origin so the next segment of the swipe is a fresh read
    touchOrigin = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  canvas.addEventListener('touchend', e => {
    const wasTap = touchOrigin &&
      Math.abs(e.changedTouches[0].clientX - touchOrigin.x) < SWIPE_THRESHOLD &&
      Math.abs(e.changedTouches[0].clientY - touchOrigin.y) < SWIPE_THRESHOLD;
    touchOrigin = null;
    if (wasTap && state === 'over') { stopLoop(); init(); }
  }, { passive: true });

  // ── Open / close ─────────────────────────────────
  trigger.addEventListener('click', openGame);
  closeBtn.addEventListener('click', closeGame);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeGame(); });

  function openGame() {
    overlay.classList.add('active');
    init();
  }

  function closeGame() {
    overlay.classList.remove('active');
    stopLoop();
  }
})();
