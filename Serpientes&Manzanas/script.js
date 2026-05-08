// ==================== DOM ====================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const canvasWrap = document.getElementById("canvasWrap");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const restartButton = document.getElementById("restartButton");
const hintButton = document.getElementById("hintButton");
const exportButton = document.getElementById("exportButton");
const clearScoresButton = document.getElementById("clearScoresButton");
const scoreValue = document.getElementById("scoreValue");
const levelValue = document.getElementById("levelValue");
const timeValue = document.getElementById("timeValue");
const comboValue = document.getElementById("comboValue");
const speedValue = document.getElementById("speedValue");
const stateValue = document.getElementById("stateValue");
const hintText = document.getElementById("hintText");
const highScoreList = document.getElementById("highScoreList");
const playerName = document.getElementById("playerName");
const modeSelect = document.getElementById("modeSelect");
const boardSizeSelect = document.getElementById("boardSizeSelect");
const obstacleInput = document.getElementById("obstacleInput");
const wrapToggle = document.getElementById("wrapToggle");
const touchButtons = document.querySelectorAll("[data-dir]");
const skinSelect = document.getElementById("skinSelect");
const arenaSelect = document.getElementById("arenaSelect");
const multiPlayerToggle = document.getElementById("multiPlayerToggle");
const p2Controls = document.getElementById("p2Controls");
const p2Name = document.getElementById("p2Name");
const skinSelectP2 = document.getElementById("skinSelectP2");
const p2StatsRow = document.getElementById("p2StatsRow");
const score2Value = document.getElementById("score2Value");
const musicToggle = document.getElementById("musicToggle");
const trackSelect = document.getElementById("trackSelect");
const volumeSlider = document.getElementById("volumeSlider");

// ==================== CONSTANTS ====================
const STORAGE_KEY = "snake-lab-scores-v1";
const BEST_SCORE_KEY = "snake-lab-best-v1";

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

const MODE_CONFIG = {
  classic: {
    label: "Classic",
    baseSpeed: 6,
    levelEvery: 4,
    addObstaclesOnLevel: 1,
    specialFoodRate: 0.18
  },
  zen: {
    label: "Zen",
    baseSpeed: 5,
    levelEvery: 6,
    addObstaclesOnLevel: 0,
    specialFoodRate: 0.08
  },
  chaos: {
    label: "Chaos",
    baseSpeed: 8,
    levelEvery: 3,
    addObstaclesOnLevel: 2,
    specialFoodRate: 0.3
  }
};

// ==================== SKINS ====================
const SKINS = {
  clasico: { label: "🟢 Clasico",  head: "#007f5f", body: "#2a9d8f", unlockAt: 0   },
  neon:    { label: "⚡ Neon",     head: "#00f5d4", body: "#0466c8", unlockAt: 100  },
  fuego:   { label: "🔥 Fuego",    head: "#ff4500", body: "#ff8c00", unlockAt: 300  },
  selva:   { label: "🌿 Selva",    head: "#1b4332", body: "#52b788", unlockAt: 500  }
};

const SKINS_P2 = {
  manzana: { label: "🍎 Manzana", head: "#c1121f", body: "#e63946" },
  mora:    { label: "🫐 Mora",    head: "#5a189a", body: "#9d4edd" }
};

// ==================== ARENAS ====================
const ARENAS = {
  default:  { label: "Default",        bg: "#f1f6fa", alt: "rgba(16,24,32,0.035)", img: null,                          glow: null       },
  neonka:   { label: "Neonka",         bg: "#18001f", alt: "rgba(255,0,255,0.05)", img: "Fruits/Neonka.png",           glow: "#cc00ff"  },
  electro:  { label: "Electro Future", bg: "#001020", alt: "rgba(0,200,255,0.05)", img: "Fruits/Electro_Future.png",   glow: "#00c8ff"  },
  original: { label: "Original",       bg: "#0f1f05", alt: "rgba(80,200,0,0.04)",  img: "Fruits/Fondo_Original.png",   glow: "#55cc00"  }
};

const arenaImgs = {};
for (const [key, cfg] of Object.entries(ARENAS)) {
  if (cfg.img) {
    arenaImgs[key] = new Image();
    arenaImgs[key].src = cfg.img;
  }
}

// ==================== MUSIC ====================
const audioEls = [
  new Audio("Fruits/Arcade Slither Loop.mp3"),
  new Audio("Fruits/Pixel Snake Pursuit.mp3")
];
audioEls.forEach((a) => { a.loop = true; a.volume = 0.6; });
let currentTrackIdx = 0;
let musicOn = false;

function playMusic() {
  if (!musicOn) { return; }
  audioEls[currentTrackIdx].play().catch(() => {});
}

function stopMusic() {
  audioEls.forEach((a) => { a.pause(); a.currentTime = 0; });
}

function switchTrack(idx) {
  stopMusic();
  currentTrackIdx = clamp(Number(idx), 0, audioEls.length - 1);
  playMusic();
}

function setVolume(v) {
  const vol = clamp(Number(v), 0, 100) / 100;
  audioEls.forEach((a) => { a.volume = vol; });
}

// ==================== GAME STATE ====================
const game = {
  running: false,
  paused: false,
  loopId: null,
  tickMs: 160,
  boardSize: 24,
  cellSize: 24,
  mode: "classic",
  wrapEdges: false,
  skin: "clasico",
  arena: "default",
  // P1
  snake: [],
  pendingDir: "right",
  direction: "right",
  food: null,
  specialFood: null,
  specialFoodExpiresAt: 0,
  obstacles: [],
  ghostUntil: 0,
  slowUntil: 0,
  score: 0,
  level: 1,
  combo: 1,
  apples: 0,
  startTime: 0,
  // P2 (Manzana)
  multiPlayer: false,
  snake2: [],
  pendingDir2: "left",
  direction2: "left",
  score2: 0,
  combo2: 1,
  p2alive: false,
  ghostUntil2: 0,
  skinP2: "manzana"
};

// ==================== INIT ====================
function initialize() {
  bindEvents();
  bindMusicControls();
  updateSkinSelector();
  drawIdleBoard();
  renderScores();
  updateHud();
}

function bindEvents() {
  startButton.addEventListener("click", startGame);
  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", startGame);
  hintButton.addEventListener("click", handleHint);
  exportButton.addEventListener("click", exportRun);
  clearScoresButton.addEventListener("click", clearScores);

  multiPlayerToggle.addEventListener("change", () => {
    p2Controls.classList.toggle("hidden", !multiPlayerToggle.checked);
    p2StatsRow.classList.toggle("hidden", !multiPlayerToggle.checked);
  });

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    const p1Map = {
      arrowup: "up",   w: "up",
      arrowdown: "down", s: "down",
      arrowleft: "left",  a: "left",
      arrowright: "right", d: "right"
    };

    const p2Map = { i: "up", k: "down", j: "left", l: "right" };

    if (key === " ") {
      togglePause();
      return;
    }

    if (p1Map[key]) {
      queueDirection(p1Map[key]);
    }

    if (p2Map[key] && game.multiPlayer) {
      queueDirection2(p2Map[key]);
    }
  });

  touchButtons.forEach((button) => {
    button.addEventListener("click", () => queueDirection(button.dataset.dir));
  });
}

function bindMusicControls() {
  musicToggle.addEventListener("change", () => {
    musicOn = musicToggle.checked;
    if (musicOn && game.running && !game.paused) {
      playMusic();
    } else {
      stopMusic();
    }
  });

  trackSelect.addEventListener("change", () => {
    switchTrack(Number(trackSelect.value));
  });

  volumeSlider.addEventListener("input", () => {
    setVolume(volumeSlider.value);
  });
}

// ==================== SKIN SYSTEM ====================
function getBestEverScore() {
  return Number(localStorage.getItem(BEST_SCORE_KEY) || "0");
}

function updateBestEverScore(score) {
  if (score > getBestEverScore()) {
    localStorage.setItem(BEST_SCORE_KEY, String(score));
  }
}

function updateSkinSelector() {
  const best = getBestEverScore();
  Array.from(skinSelect.options).forEach((opt) => {
    const skinCfg = SKINS[opt.value];
    if (!skinCfg) { return; }
    if (best >= skinCfg.unlockAt) {
      opt.disabled = false;
      opt.text = skinCfg.label;
    } else {
      opt.disabled = true;
      opt.text = `${skinCfg.label} — desbloquea en ${skinCfg.unlockAt} pts`;
    }
  });
  if (skinSelect.options[skinSelect.selectedIndex] && skinSelect.options[skinSelect.selectedIndex].disabled) {
    skinSelect.value = "clasico";
  }
}

// ==================== START ====================
function startGame() {
  const boardSize = Number(boardSizeSelect.value);
  const obstacleCount = clamp(Number(obstacleInput.value), 0, 40);
  const selectedMode = modeSelect.value;
  const selectedSkin = skinSelect.value;
  const selectedArena = arenaSelect.value;
  const isMulti = multiPlayerToggle.checked;

  game.running = true;
  game.paused = false;
  game.mode = MODE_CONFIG[selectedMode] ? selectedMode : "classic";
  game.boardSize = boardSize;
  game.cellSize = Math.floor(canvas.width / boardSize);
  game.wrapEdges = wrapToggle.checked;
  game.skin = SKINS[selectedSkin] ? selectedSkin : "clasico";
  game.arena = ARENAS[selectedArena] ? selectedArena : "default";
  game.multiPlayer = isMulti;
  game.score = 0;
  game.level = 1;
  game.combo = 1;
  game.apples = 0;
  game.startTime = Date.now();
  game.ghostUntil = 0;
  game.slowUntil = 0;

  const center = Math.floor(boardSize / 2);
  game.snake = [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center }
  ];
  game.direction = "right";
  game.pendingDir = "right";
  game.obstacles = [];

  // Initialise P2 (Manzana)
  game.snake2 = [];
  game.p2alive = false;
  if (isMulti) {
    game.score2 = 0;
    game.combo2 = 1;
    game.p2alive = true;
    game.ghostUntil2 = 0;
    game.skinP2 = skinSelectP2.value;
    const c2 = boardSize - center - 1;
    game.snake2 = [
      { x: c2, y: c2 },
      { x: c2 + 1, y: c2 },
      { x: c2 + 2, y: c2 }
    ];
    game.direction2 = "left";
    game.pendingDir2 = "left";
    p2StatsRow.classList.remove("hidden");
    score2Value.textContent = "0";
  }

  // Apply arena glow to canvas-wrap
  const arenaCfg = ARENAS[game.arena];
  canvasWrap.dataset.arena = game.arena;
  canvasWrap.style.borderColor = arenaCfg.glow || "";
  canvasWrap.style.boxShadow = arenaCfg.glow ? `0 0 30px ${arenaCfg.glow}88` : "";

  seedObstacles(obstacleCount);
  game.food = spawnFood();
  spawnSpecialFood(true);

  hintText.textContent = "Sugerencia: -";
  hideOverlay();
  startLoop();
  updateHud();
  playMusic();
}

function startLoop() {
  if (game.loopId) {
    clearInterval(game.loopId);
  }
  game.tickMs = calculateTickMs();
  game.loopId = setInterval(stepGame, game.tickMs);
}

function calculateTickMs() {
  const modeBase = MODE_CONFIG[game.mode].baseSpeed;
  const effectiveSpeed = modeBase + game.level - 1;
  const slowed = Date.now() < game.slowUntil ? 2 : 0;
  const speed = clamp(effectiveSpeed - slowed, 3, 18);
  speedValue.textContent = String(speed);
  return Math.floor(1000 / speed);
}

function togglePause() {
  if (!game.running) {
    return;
  }

  game.paused = !game.paused;
  if (game.paused) {
    showOverlay("Pausa", "Presiona Pausar o Espacio para continuar");
    stateValue.textContent = "Pausa";
    stopMusic();
  } else {
    hideOverlay();
    stateValue.textContent = "Jugando";
    playMusic();
  }
}

function queueDirection(nextDir) {
  if (!game.running || game.paused || !DIRECTIONS[nextDir]) {
    return;
  }

  const opposite = {
    up: "down",
    down: "up",
    left: "right",
    right: "left"
  };

  if (opposite[game.direction] === nextDir) {
    return;
  }

  game.pendingDir = nextDir;
}

function queueDirection2(nextDir) {
  if (!game.running || game.paused || !game.p2alive || !DIRECTIONS[nextDir]) {
    return;
  }
  if (OPPOSITE[game.direction2] === nextDir) {
    return;
  }
  game.pendingDir2 = nextDir;
}

function stepGame() {
  if (!game.running || game.paused) {
    return;
  }

  const now = Date.now();
  game.direction = game.pendingDir;

  const head = game.snake[0];
  const move = DIRECTIONS[game.direction];
  let next = { x: head.x + move.x, y: head.y + move.y };

  if (game.wrapEdges) {
    next.x = (next.x + game.boardSize) % game.boardSize;
    next.y = (next.y + game.boardSize) % game.boardSize;
  }

  const outOfBounds =
    next.x < 0 ||
    next.y < 0 ||
    next.x >= game.boardSize ||
    next.y >= game.boardSize;

  if (outOfBounds && now >= game.ghostUntil) {
    return endGame("Golpeaste el borde", "P2");
  }

  if (outOfBounds) {
    next = {
      x: clamp(next.x, 0, game.boardSize - 1),
      y: clamp(next.y, 0, game.boardSize - 1)
    };
  }

  const hitSelf = game.snake.some((part) => part.x === next.x && part.y === next.y);
  if (hitSelf && now >= game.ghostUntil) {
    return endGame("Te mordiste", "P2");
  }

  const hitObstacle = game.obstacles.some((block) => block.x === next.x && block.y === next.y);
  if (hitObstacle && now >= game.ghostUntil) {
    return endGame("Choque contra obstaculo", "P2");
  }

  if (game.multiPlayer && game.p2alive) {
    const hitP2 = game.snake2.some((part) => part.x === next.x && part.y === next.y);
    if (hitP2 && now >= game.ghostUntil) {
      return endGame("P1 choco con Manzana", "P2");
    }
  }

  game.snake.unshift(next);
  let grew = false;

  if (next.x === game.food.x && next.y === game.food.y) {
    grew = true;
    game.apples += 1;
    game.combo = clamp(game.combo + 1, 1, 8);
    game.score += 10 * game.combo;
    game.food = spawnFood();
    if (Math.random() < MODE_CONFIG[game.mode].specialFoodRate) {
      spawnSpecialFood(false);
    }
    evaluateLevelUp();
  }

  if (game.specialFood && next.x === game.specialFood.x && next.y === game.specialFood.y) {
    grew = true;
    applySpecialReward(1);
    game.specialFood = null;
    game.specialFoodExpiresAt = 0;
  }

  if (!grew) {
    game.snake.pop();
    if (game.combo > 1 && Math.random() < 0.15) {
      game.combo -= 1;
    }
  }

  if (game.specialFood && now > game.specialFoodExpiresAt) {
    game.specialFood = null;
    game.specialFoodExpiresAt = 0;
  }

  // Step P2 (Manzana)
  if (game.multiPlayer && game.p2alive) {
    stepSnake2(now);
  }

  if (game.tickMs !== calculateTickMs()) {
    startLoop();
  }

  drawBoard();
  updateHud();
}

function stepSnake2(now) {
  game.direction2 = game.pendingDir2;
  const head = game.snake2[0];
  const move = DIRECTIONS[game.direction2];
  let next = { x: head.x + move.x, y: head.y + move.y };

  if (game.wrapEdges) {
    next.x = (next.x + game.boardSize) % game.boardSize;
    next.y = (next.y + game.boardSize) % game.boardSize;
  }

  const outOfBounds = next.x < 0 || next.y < 0 || next.x >= game.boardSize || next.y >= game.boardSize;
  if (outOfBounds && now >= game.ghostUntil2) {
    endGame("Manzana golpeo el borde", "P1");
    return;
  }
  if (outOfBounds) {
    next = { x: clamp(next.x, 0, game.boardSize - 1), y: clamp(next.y, 0, game.boardSize - 1) };
  }

  const hitSelf2 = game.snake2.some((part) => part.x === next.x && part.y === next.y);
  if (hitSelf2 && now >= game.ghostUntil2) { endGame("Manzana se mordio", "P1"); return; }

  const hitObstacle = game.obstacles.some((block) => block.x === next.x && block.y === next.y);
  if (hitObstacle && now >= game.ghostUntil2) { endGame("Manzana choco con obstaculo", "P1"); return; }

  const hitP1 = game.snake.some((part) => part.x === next.x && part.y === next.y);
  if (hitP1 && now >= game.ghostUntil2) { endGame("Manzana choco con P1", "P1"); return; }

  game.snake2.unshift(next);
  let grew2 = false;

  if (next.x === game.food.x && next.y === game.food.y) {
    grew2 = true;
    game.combo2 = clamp(game.combo2 + 1, 1, 8);
    game.score2 += 10 * game.combo2;
    game.food = spawnFood();
    if (Math.random() < MODE_CONFIG[game.mode].specialFoodRate) {
      spawnSpecialFood(false);
    }
  }

  if (game.specialFood && next.x === game.specialFood.x && next.y === game.specialFood.y) {
    grew2 = true;
    applySpecialReward(2);
    game.specialFood = null;
    game.specialFoodExpiresAt = 0;
  }

  if (!grew2) {
    game.snake2.pop();
    if (game.combo2 > 1 && Math.random() < 0.15) {
      game.combo2 -= 1;
    }
  }
}

function evaluateLevelUp() {
  const cfg = MODE_CONFIG[game.mode];
  const nextLevel = Math.floor(game.apples / cfg.levelEvery) + 1;
  if (nextLevel <= game.level) {
    return;
  }

  game.level = nextLevel;
  if (cfg.addObstaclesOnLevel > 0) {
    for (let i = 0; i < cfg.addObstaclesOnLevel; i += 1) {
      const obstacle = randomFreeCell();
      if (obstacle) {
        game.obstacles.push(obstacle);
      }
    }
  }
}

function applySpecialReward(player) {
  const roll = Math.random();
  if (roll < 0.34) {
    if (player === 1) {
      game.score += 30;
      game.combo = clamp(game.combo + 1, 1, 8);
    } else {
      game.score2 += 30;
      game.combo2 = clamp(game.combo2 + 1, 1, 8);
    }
    hintText.textContent = "Sugerencia: Bonus de puntos +30";
  } else if (roll < 0.67) {
    game.slowUntil = Date.now() + 5000;
    hintText.textContent = "Sugerencia: Tiempo lento por 5s";
  } else {
    if (player === 1) {
      game.ghostUntil = Date.now() + 5000;
    } else {
      game.ghostUntil2 = Date.now() + 5000;
    }
    hintText.textContent = "Sugerencia: Modo fantasma por 5s";
  }
}

function spawnFood() {
  return randomFreeCell();
}

function spawnSpecialFood(force) {
  if (!force && Math.random() > 0.45) {
    return;
  }
  const cell = randomFreeCell();
  if (!cell) {
    return;
  }
  game.specialFood = cell;
  game.specialFoodExpiresAt = Date.now() + 9000;
}

function randomFreeCell() {
  const attempts = game.boardSize * game.boardSize;
  for (let i = 0; i < attempts; i += 1) {
    const point = {
      x: Math.floor(Math.random() * game.boardSize),
      y: Math.floor(Math.random() * game.boardSize)
    };

    const occupiedBySnake = game.snake.some((part) => part.x === point.x && part.y === point.y);
    const occupiedBySnake2 = game.snake2 && game.snake2.some((part) => part.x === point.x && part.y === point.y);
    const occupiedByObstacle = game.obstacles.some((item) => item.x === point.x && item.y === point.y);
    const occupiedByFood = game.food && game.food.x === point.x && game.food.y === point.y;
    const occupiedBySpecial = game.specialFood && game.specialFood.x === point.x && game.specialFood.y === point.y;

    if (!occupiedBySnake && !occupiedBySnake2 && !occupiedByObstacle && !occupiedByFood && !occupiedBySpecial) {
      return point;
    }
  }
  return null;
}

function seedObstacles(count) {
  for (let i = 0; i < count; i += 1) {
    const obstacle = randomFreeCell();
    if (obstacle) {
      game.obstacles.push(obstacle);
    }
  }
}

function drawIdleBoard() {
  ctx.fillStyle = "#f4f8fb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cell = 24;
  for (let y = 0; y < canvas.height; y += cell) {
    for (let x = 0; x < canvas.width; x += cell) {
      if (((x + y) / cell) % 2 === 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.03)";
        ctx.fillRect(x, y, cell, cell);
      }
    }
  }
}

function drawBoard() {
  const size = game.cellSize;
  const arenaCfg = ARENAS[game.arena] || ARENAS.default;
  const img = arenaImgs[game.arena];

  // Arena background
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = arenaCfg.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Checkerboard overlay
  for (let y = 0; y < game.boardSize; y += 1) {
    for (let x = 0; x < game.boardSize; x += 1) {
      if ((x + y) % 2 === 0) {
        ctx.fillStyle = arenaCfg.alt;
        ctx.fillRect(x * size, y * size, size, size);
      }
    }
  }

  // Obstacles
  game.obstacles.forEach((block) => {
    ctx.fillStyle = "#5f0f40";
    roundedCell(block.x, block.y, size, 4);
  });

  // Regular food
  if (game.food) {
    ctx.fillStyle = "#ef233c";
    roundedCell(game.food.x, game.food.y, size, 8);
  }

  // Special food with pulse glow
  if (game.specialFood) {
    ctx.fillStyle = "#ffb703";
    roundedCell(game.specialFood.x, game.specialFood.y, size, 8);
    const pulse = 0.3 + 0.3 * Math.sin((Date.now() % 800) / 800 * Math.PI * 2);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#fff";
    roundedCell(game.specialFood.x, game.specialFood.y, size, 8);
    ctx.globalAlpha = 1;
  }

  // P1 snake with active skin
  const skinCfg = SKINS[game.skin] || SKINS.clasico;
  game.snake.forEach((part, index) => {
    ctx.fillStyle = index === 0 ? skinCfg.head : skinCfg.body;
    roundedCell(part.x, part.y, size, 6);
  });

  // P2 snake (Manzana)
  if (game.multiPlayer && game.p2alive && game.snake2.length > 0) {
    const s2Cfg = SKINS_P2[game.skinP2] || SKINS_P2.manzana;
    game.snake2.forEach((part, index) => {
      ctx.fillStyle = index === 0 ? s2Cfg.head : s2Cfg.body;
      roundedCell(part.x, part.y, size, 6);
    });
  }

  // Ghost border P1
  if (Date.now() < game.ghostUntil) {
    ctx.strokeStyle = `${skinCfg.head}cc`;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  }

  // Ghost border P2
  if (game.multiPlayer && Date.now() < game.ghostUntil2) {
    const s2Cfg = SKINS_P2[game.skinP2] || SKINS_P2.manzana;
    ctx.strokeStyle = `${s2Cfg.head}cc`;
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
  }
}

function roundedCell(x, y, size, radius) {
  const px = x * size + 1;
  const py = y * size + 1;
  const s = size - 2;

  ctx.beginPath();
  ctx.moveTo(px + radius, py);
  ctx.lineTo(px + s - radius, py);
  ctx.quadraticCurveTo(px + s, py, px + s, py + radius);
  ctx.lineTo(px + s, py + s - radius);
  ctx.quadraticCurveTo(px + s, py + s, px + s - radius, py + s);
  ctx.lineTo(px + radius, py + s);
  ctx.quadraticCurveTo(px, py + s, px, py + s - radius);
  ctx.lineTo(px, py + radius);
  ctx.quadraticCurveTo(px, py, px + radius, py);
  ctx.closePath();
  ctx.fill();
}

function endGame(reason, winner) {
  game.running = false;
  game.paused = false;
  if (game.loopId) {
    clearInterval(game.loopId);
    game.loopId = null;
  }
  stopMusic();

  updateBestEverScore(Math.max(game.score, game.score2));
  updateSkinSelector();

  saveScore(reason);
  drawBoard();

  if (game.multiPlayer) {
    const winnerName = winner === "P1"
      ? sanitizeName(playerName.value)
      : sanitizeName(p2Name.value);
    const winnerScore = winner === "P1" ? game.score : game.score2;
    showOverlay(`🏆 Gana ${winnerName}!`, `${reason}. Puntos: ${winnerScore}`);
  } else {
    showOverlay("Game Over", `${reason}. Puntaje final: ${game.score}`);
  }

  stateValue.textContent = "Derrota";
  renderScores();
}

function saveScore(reason) {
  const allScores = readScores();
  const list = allScores[game.mode] || [];
  const runDuration = Math.floor((Date.now() - game.startTime) / 1000);

  list.push({
    name: sanitizeName(playerName.value),
    score: game.score,
    level: game.level,
    mode: game.mode,
    duration: runDuration,
    reason,
    date: new Date().toISOString()
  });

  list.sort((a, b) => b.score - a.score);
  allScores[game.mode] = list.slice(0, 5);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allScores));
}

function readScores() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function renderScores() {
  const allScores = readScores();
  const list = allScores[modeSelect.value] || [];
  highScoreList.innerHTML = "";

  if (list.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Sin records por ahora";
    highScoreList.append(li);
    return;
  }

  list.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.name} - ${item.score} pts - lvl ${item.level}`;
    highScoreList.append(li);
  });
}

function clearScores() {
  const scores = readScores();
  scores[modeSelect.value] = [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  renderScores();
}

function exportRun() {
  const payload = {
    name: sanitizeName(playerName.value),
    mode: modeSelect.value,
    score: game.score,
    level: game.level,
    apples: game.apples,
    combo: game.combo,
    timestamp: new Date().toISOString()
  };

  const content = JSON.stringify(payload, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `snake-run-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleHint() {
  if (!game.running || game.paused) {
    hintText.textContent = "Sugerencia: inicia partida para recibir ayuda";
    return;
  }

  const options = Object.keys(DIRECTIONS).filter((dir) => {
    const opposite = {
      up: "down",
      down: "up",
      left: "right",
      right: "left"
    };
    return opposite[game.direction] !== dir;
  });

  options.sort((a, b) => evaluateDirection(b) - evaluateDirection(a));
  const best = options[0] || "right";
  hintText.textContent = `Sugerencia: mueve ${best}`;
}

function evaluateDirection(dir) {
  const move = DIRECTIONS[dir];
  const head = game.snake[0];
  const next = {
    x: head.x + move.x,
    y: head.y + move.y
  };

  let score = 0;
  if (game.wrapEdges) {
    next.x = (next.x + game.boardSize) % game.boardSize;
    next.y = (next.y + game.boardSize) % game.boardSize;
  }

  if (next.x < 0 || next.y < 0 || next.x >= game.boardSize || next.y >= game.boardSize) {
    return -999;
  }

  const collision =
    game.snake.some((part) => part.x === next.x && part.y === next.y) ||
    game.obstacles.some((part) => part.x === next.x && part.y === next.y);

  if (collision) {
    return -999;
  }

  const distToFood = manhattan(next, game.food);
  score += 100 - distToFood;

  const freeNeighbors = Object.values(DIRECTIONS).filter((delta) => {
    const nx = next.x + delta.x;
    const ny = next.y + delta.y;
    const badEdge = nx < 0 || ny < 0 || nx >= game.boardSize || ny >= game.boardSize;
    const badSnake = game.snake.some((part) => part.x === nx && part.y === ny);
    const badObstacle = game.obstacles.some((part) => part.x === nx && part.y === ny);
    return !badEdge && !badSnake && !badObstacle;
  }).length;

  score += freeNeighbors * 5;
  return score;
}

function manhattan(a, b) {
  if (!a || !b) {
    return 999;
  }
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function updateHud() {
  scoreValue.textContent = String(game.score);
  levelValue.textContent = String(game.level);
  comboValue.textContent = `x${game.combo}`;

  if (game.multiPlayer) {
    score2Value.textContent = String(game.score2);
  }

  if (game.running) {
    const elapsed = Math.floor((Date.now() - game.startTime) / 1000);
    timeValue.textContent = formatTime(elapsed);
    if (!game.paused) {
      stateValue.textContent = "Jugando";
    }
  } else {
    timeValue.textContent = "00:00";
    stateValue.textContent = "Listo";
  }
}

function formatTime(totalSeconds) {
  const min = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const sec = (totalSeconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

function sanitizeName(name) {
  const clean = String(name || "Jugador").trim().slice(0, 18);
  return clean || "Jugador";
}

function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.add("show");
}

function hideOverlay() {
  overlay.classList.remove("show");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

modeSelect.addEventListener("change", renderScores);
initialize();
