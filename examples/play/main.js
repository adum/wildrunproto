import { app } from "../prototype/context.js";
import "../prototype/config.js";
import "../prototype/ghost.js";
import "../prototype/fire.js";
import "../prototype/frost.js";
import "../prototype/passives.js";
import "../prototype/overlays.js";
import "../prototype/timers.js";
import "../prototype/challenges.js";
import "../prototype/hints.js";
import "../prototype/board.js";

if (!app.GB) {
  throw new Error("ghostban library not found.");
}

var state = app.state;
var refs = app.refs;

var startOverlay = document.getElementById("startOverlay");
var startGameBtn = document.getElementById("startGameBtn");
var advanceOverlay = document.getElementById("advanceOverlay");
var advanceLabel = document.getElementById("advanceLabel");
var advanceBtn = document.getElementById("advanceBtn");
var retryOverlay = document.getElementById("retryOverlay");
var retryLabel = document.getElementById("retryLabel");
var retryBtn = document.getElementById("retryBtn");
var coinBurst = document.getElementById("coinBurst");
var difficultyLabel = document.getElementById("difficultyLabel");
var passiveList = document.getElementById("passiveList");
var hintList = document.getElementById("hintList");
var challengeSection = document.getElementById("challengeSection");
var challengeList = document.getElementById("challengeList");

var problems = Array.isArray(window.gpProblems) ? window.gpProblems : [];

app.handlers.onTimerExpired = function () {
  app.board.evaluatePosition();
};

var PASSIVE_DEFS = {
  timeExtend: {
    label: "Time Extend",
    tooltip: "Slows countdown timers by 10% per level.",
  },
  secondChance: {
    label: "Second Chance",
    tooltip: "One timed retry per puzzle on a mistake.",
  },
  friendlyCapture: {
    label: "Friendly Capture",
    tooltip: "Lights up if any correct line sacrifices a player stone.",
    indicatorKey: "friendlyCaptureDetected",
  },
  enemyCapture: {
    label: "Enemy Capture",
    tooltip: "Lights up if any correct line captures an enemy stone.",
    indicatorKey: "enemyCaptureDetected",
  },
};

var HINT_DEFS = {
  firstMove: {
    label: "First Move",
    tooltip: "Marks the next correct move.",
    action: function () {
      app.hints.hintFirstMove();
    },
  },
  multipleChoice: {
    label: "Multiple Choice",
    tooltip: "Marks multiple options with one correct move.",
    action: function () {
      app.hints.hintTwoMoves();
    },
  },
  neighbor: {
    label: "Wave to Your Neighbor",
    tooltip: "Highlights a stone adjacent to a correct move.",
    action: function () {
      app.hints.hintWaveNeighbor();
    },
  },
  rowReveal: {
    label: "Row Reveal",
    tooltip: "Reveals a row containing a correct move.",
    action: function () {
      app.hints.hintRowReveal();
    },
  },
  colReveal: {
    label: "Column Reveal",
    tooltip: "Reveals a column containing a correct move.",
    action: function () {
      app.hints.hintColumnReveal();
    },
  },
  diagReveal: {
    label: "Diagonal Reveal",
    tooltip: "Reveals a diagonal containing a correct move.",
    action: function () {
      app.hints.hintDiagonalReveal();
    },
  },
  eliminateRandom: {
    label: "Eliminate Random Move",
    tooltip: "Blocks a random wrong-path move.",
    action: function () {
      app.board.eliminateRandomMove();
    },
  },
};

var CHALLENGE_DEFS = {
  gray: {
    label: "Gray Play",
    tooltip: "New stones are shown as gray.",
    enable: function () {
      app.challenges.setGrayPlay(true);
    },
  },
  ghost: {
    label: "Ghost Play",
    tooltip: "New stones flash, then become invisible.",
    setLevel: function (level) {
      app.ghost.setGhostLevel(level);
    },
    enable: function () {
      app.challenges.setGhostPlay(true);
    },
  },
  mystery: {
    label: "Mystery Timer",
    tooltip: "Hide stones; reveal them to start a timer.",
    setLevel: function (level) {
      app.timers.setMysteryLevel(level);
    },
    enable: function () {
      app.challenges.setMysteryPlay(true);
    },
  },
  enigma: {
    label: "Enigma Timer",
    tooltip: "Marks stones or adjacent empties with rings.",
    setLevel: function (level) {
      app.timers.setEnigmaLevel(level);
    },
    enable: function () {
      app.challenges.setEnigmaPlay(true);
    },
  },
  infection: {
    label: "Infection",
    tooltip: "Adds hollow rings next to newly played stones.",
    setLevel: function (level) {
      app.challenges.setInfectionLevel(level);
    },
    enable: function () {
      app.challenges.setInfectionPlay(true);
    },
  },
  speed: {
    label: "Speed Play",
    tooltip: "Limits time for each move after your first.",
    setLevel: function (level) {
      app.timers.setSpeedLevel(level);
    },
    enable: function () {
      app.challenges.setSpeedPlay(true);
    },
  },
  fire: {
    label: "Fire Snake",
    tooltip: "Animated fire snake sweeps the board.",
    setLevel: function (level) {
      app.fire.setFireLevel(level);
    },
    enable: function () {
      app.challenges.setFirePlay(true);
    },
  },
  frost: {
    label: "Frost Snake",
    tooltip: "Animated frost snake sweeps the board.",
    setLevel: function (level) {
      app.frost.setFrostLevel(level);
    },
    enable: function () {
      app.challenges.setFrostPlay(true);
    },
  },
};

var problemIndex = buildProblemIndex(problems);

var game = {
  started: false,
  levelNumber: 0,
  bossCount: 0,
  difficulty: null,
  levelActive: false,
  currentProblem: null,
  passives: [],
  hints: [],
  challenge: null,
  pendingNext: null,
  maxLives: 3,
  isBoss: false,
};

app.handlers.onPuzzleSolved = function () {
  if (!game.started || !game.levelActive) {
    return;
  }
  game.levelActive = false;
  awardCoins();
  showAdvanceOverlay();
};

app.handlers.onPuzzleFailed = function () {
  if (!game.started) {
    return;
  }
  game.levelActive = false;
  hideAdvanceOverlay();
  if (state.lives <= 0) {
    endGame();
  } else {
    showRetryOverlay();
  }
};

function getPlayConfig() {
  var config = app.config && app.config.play ? app.config.play : {};
  var coins = config.coins || {};
  var hintPool = Array.isArray(config.hintPool)
    ? config.hintPool.slice()
    : Object.keys(HINT_DEFS);
  var passivePool = Array.isArray(config.passivePool)
    ? config.passivePool.slice()
    : Object.keys(PASSIVE_DEFS);
  var challengePool = Array.isArray(config.challengePool)
    ? config.challengePool.slice()
    : Object.keys(CHALLENGE_DEFS);
  return {
    startDifficulty: config.startDifficulty || "30kyu",
    difficultyStep: toNumber(config.difficultyStep, 1),
    hintsPerLevel: Math.max(0, toNumber(config.hintsPerLevel, 2)),
    passivesPerRun: Math.max(0, toNumber(config.passivesPerRun, 1)),
    bossFrequency: Math.max(0, toNumber(config.bossFrequency, 0)),
    challengeLevelStart: toNumber(config.challengeLevelStart, 1),
    challengeLevelRamp: toNumber(config.challengeLevelRamp, 1),
    coins: {
      base: toNumber(coins.base, 5),
      perDifficulty: toNumber(coins.perDifficulty, 1),
      bossBonus: toNumber(coins.bossBonus, 0),
    },
    hintPool: hintPool,
    passivePool: passivePool,
    challengePool: challengePool,
  };
}

function toNumber(value, fallback) {
  var num = Number(value);
  if (Number.isFinite(num)) {
    return num;
  }
  return fallback;
}

function shuffle(list) {
  var array = list.slice();
  for (var i = array.length - 1; i > 0; i -= 1) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

function pickRandom(list, count) {
  if (!Array.isArray(list) || list.length === 0) {
    return [];
  }
  var picks = shuffle(list);
  return picks.slice(0, Math.min(count, picks.length));
}

function parseDifficulty(value) {
  if (!value) {
    return null;
  }
  var text = String(value).trim().toLowerCase();
  var match = text.match(/(\d+)\s*(kyu|k|dan|d)/);
  if (!match) {
    return null;
  }
  var level = parseInt(match[1], 10);
  if (!Number.isFinite(level)) {
    return null;
  }
  var type = match[2] === "dan" || match[2] === "d" ? "dan" : "kyu";
  return { type: type, value: level };
}

function formatDifficulty(diff) {
  if (!diff) {
    return "unknown";
  }
  return diff.value + (diff.type === "dan" ? "dan" : "kyu");
}

function advanceDifficulty(diff, step) {
  if (!diff) {
    return null;
  }
  var delta = Math.max(1, toNumber(step, 1));
  if (diff.type === "dan") {
    return { type: "dan", value: diff.value + delta };
  }
  var nextValue = diff.value - delta;
  if (nextValue < 1) {
    return { type: "dan", value: 1 };
  }
  return { type: "kyu", value: nextValue };
}

function stepDownDifficulty(diff) {
  if (!diff) {
    return null;
  }
  if (diff.type === "dan") {
    if (diff.value <= 1) {
      return { type: "kyu", value: 1 };
    }
    return { type: "dan", value: diff.value - 1 };
  }
  if (diff.value >= 30) {
    return null;
  }
  return { type: "kyu", value: diff.value + 1 };
}

function buildProblemIndex(list) {
  var index = {};
  list.forEach(function (problem) {
    var parsed = parseDifficulty(problem.difficulty);
    if (!parsed) {
      return;
    }
    var key = formatDifficulty(parsed);
    if (!index[key]) {
      index[key] = [];
    }
    index[key].push(problem);
  });
  return index;
}

function pickProblemForDifficulty(target) {
  var current = target;
  var attempts = 0;
  while (current && attempts < 40) {
    var label = formatDifficulty(current);
    var options = problemIndex[label];
    if (options && options.length) {
      return {
        problem: options[Math.floor(Math.random() * options.length)],
        label: label,
      };
    }
    current = stepDownDifficulty(current);
    attempts += 1;
  }
  if (problems.length) {
    var fallback = problems[Math.floor(Math.random() * problems.length)];
    var parsed = parseDifficulty(fallback.difficulty);
    return {
      problem: fallback,
      label: parsed ? formatDifficulty(parsed) : fallback.difficulty || "unknown",
    };
  }
  return null;
}

function ensureBoard(size) {
  if (!refs.board) {
    app.board.initBoard(size);
  }
  if (startOverlay && startOverlay.parentElement !== app.elements.mount) {
    app.elements.mount.appendChild(startOverlay);
  }
  if (advanceOverlay && advanceOverlay.parentElement !== app.elements.mount) {
    app.elements.mount.appendChild(advanceOverlay);
  }
  if (retryOverlay && retryOverlay.parentElement !== app.elements.mount) {
    app.elements.mount.appendChild(retryOverlay);
  }
  if (coinBurst && coinBurst.parentElement !== app.elements.mount) {
    app.elements.mount.appendChild(coinBurst);
  }
}

function resetHintLevels() {
  app.hints.setMultipleChoiceLevel(1);
  app.hints.setRowRevealLevel(1);
  app.hints.setColumnRevealLevel(1);
  app.hints.setDiagonalRevealLevel(1);
  app.hints.setElimRandomLevel(1);
}

function renderPassives() {
  if (!passiveList) {
    return;
  }
  passiveList.textContent = "";
  game.passives.forEach(function (passive) {
    var def = PASSIVE_DEFS[passive.id];
    if (!def) {
      return;
    }
    var item = document.createElement("div");
    item.className = "play-chip";
    item.title = def.tooltip;
    var label = document.createElement("span");
    label.textContent = def.label;
    if (def.indicatorKey) {
      var indicator = document.createElement("span");
      indicator.className = "play-chip__indicator";
      if (state[def.indicatorKey]) {
        indicator.classList.add("is-active");
      }
      item.appendChild(indicator);
    }
    item.appendChild(label);
    if (!def.indicatorKey) {
      var level = document.createElement("span");
      level.className = "play-chip__level";
      level.textContent = "L" + passive.level;
      item.appendChild(level);
    }
    passiveList.appendChild(item);
  });
}

function renderHints() {
  if (!hintList) {
    return;
  }
  hintList.textContent = "";
  game.hints.forEach(function (hint) {
    var def = HINT_DEFS[hint.id];
    if (!def) {
      return;
    }
    var button = document.createElement("button");
    button.type = "button";
    button.className = "button play-hint";
    button.title = def.tooltip;
    var label = document.createElement("span");
    label.textContent = def.label;
    var level = document.createElement("span");
    level.className = "play-chip__level";
    level.textContent = "L1";
    button.appendChild(label);
    button.appendChild(level);
    if (hint.used) {
      button.classList.add("is-used");
      button.disabled = true;
    }
    button.addEventListener("click", function (event) {
      if (event) {
        event.stopPropagation();
      }
      if (hint.used || !game.levelActive) {
        return;
      }
      def.action();
      hint.used = true;
      button.classList.add("is-used");
      button.disabled = true;
    });
    hintList.appendChild(button);
  });
}

function renderChallenges() {
  if (!challengeSection || !challengeList) {
    return;
  }
  challengeList.textContent = "";
  if (!game.challenge) {
    challengeSection.classList.add("is-hidden");
    return;
  }
  var def = CHALLENGE_DEFS[game.challenge.id];
  if (!def) {
    challengeSection.classList.add("is-hidden");
    return;
  }
  challengeSection.classList.remove("is-hidden");
  var item = document.createElement("div");
  item.className = "play-chip";
  item.title = def.tooltip;
  var label = document.createElement("span");
  label.textContent = def.label;
  var level = document.createElement("span");
  level.className = "play-chip__level";
  level.textContent = "L" + game.challenge.level;
  item.appendChild(label);
  item.appendChild(level);
  challengeList.appendChild(item);
}

function applyPassives() {
  app.passives.resetPassives();
  game.passives.forEach(function (passive) {
    if (passive.id === "timeExtend") {
      app.passives.setTimeExtendLevel(passive.level);
      app.passives.setTimeExtendActive(true);
    } else if (passive.id === "secondChance") {
      app.passives.setSecondChanceLevel(passive.level);
      app.passives.setSecondChanceActive(true);
    }
  });
}

function applyChallenge() {
  app.challenges.resetChallenges();
  if (!game.challenge) {
    renderChallenges();
    return;
  }
  var def = CHALLENGE_DEFS[game.challenge.id];
  if (!def) {
    game.challenge = null;
    renderChallenges();
    return;
  }
  if (def.setLevel) {
    def.setLevel(game.challenge.level);
  }
  def.enable();
  renderChallenges();
}

function setupHints(config) {
  var hintIds = pickRandom(config.hintPool, config.hintsPerLevel);
  game.hints = hintIds.map(function (id) {
    return { id: id, used: false };
  });
  renderHints();
}

function pruneUsedHints() {
  if (!Array.isArray(game.hints)) {
    game.hints = [];
    return;
  }
  game.hints = game.hints.filter(function (hint) {
    return !hint.used;
  });
}

function setupPassives(config) {
  var passiveIds = pickRandom(config.passivePool, config.passivesPerRun);
  game.passives = passiveIds.map(function (id) {
    return { id: id, level: 1 };
  });
  renderPassives();
  applyPassives();
}

function setupChallenge(config, isBoss) {
  if (!isBoss) {
    game.challenge = null;
    applyChallenge();
    return;
  }
  var challengeIds = pickRandom(config.challengePool, 1);
  var challengeId = challengeIds.length ? challengeIds[0] : null;
  if (!challengeId) {
    game.challenge = null;
    applyChallenge();
    return;
  }
  var bossLevel = game.bossCount;
  var level =
    config.challengeLevelStart +
    Math.max(0, bossLevel - 1) * config.challengeLevelRamp;
  var clamped = clampChallengeLevel(challengeId, level);
  game.challenge = { id: challengeId, level: clamped };
  applyChallenge();
}

function clampChallengeLevel(challengeId, level) {
  if (!app.configUtils || !app.configUtils.clampLevel) {
    return Math.max(1, Math.round(level));
  }
  var key = null;
  if (challengeId === "ghost") {
    key = "ghost";
  } else if (challengeId === "mystery") {
    key = "mystery";
  } else if (challengeId === "enigma") {
    key = "enigma";
  } else if (challengeId === "infection") {
    key = "infection";
  } else if (challengeId === "speed") {
    key = "speed";
  } else if (challengeId === "fire") {
    key = "fire";
  } else if (challengeId === "frost") {
    key = "frost";
  }
  if (!key) {
    return 1;
  }
  return app.configUtils.clampLevel(key, level, 1, 10);
}

function loadProblem(problem, difficultyLabelText, isBoss) {
  var sgf = new app.GB.Sgf(problem.sgf);
  if (!sgf.root) {
    return;
  }
  state.rootNode = sgf.root;
  state.playerColor = app.GB.getFirstToMoveColorFromRoot(
    sgf.root,
    app.GB.Ki.Black
  );
  state.combo = 0;
  state.lastNodeId = null;
  if (app.passives && app.passives.updateCaptureIndicators) {
    app.passives.updateCaptureIndicators();
  }

  var size = app.GB.extractBoardSize(sgf.root, 19);
  ensureBoard(size);

  app.hints.setCurrentNode(state.rootNode);
  app.hints.clearHints();
  resetHintLevels();

  app.timers.stopMysteryTimer(false);
  state.mysteryStoneKeys = [];
  state.mysteryRevealed = false;
  app.timers.updateMysteryUI();
  app.timers.stopEnigmaTimer(false);
  state.enigmaPoints = [];
  state.enigmaRevealed = false;
  app.timers.updateEnigmaUI();
  app.timers.stopSpeedTimer(false);
  state.speedMoveCount = 0;

  applyPassives();
  renderPassives();
  setupChallenge(getPlayConfig(), isBoss);

  app.board.autoPlayOpponent();
  app.board.updateBoard();
  app.ui.updateHud();
  app.board.evaluatePosition();

  if (difficultyLabel) {
    difficultyLabel.textContent = difficultyLabelText;
  }
}

function loadLevel() {
  var config = getPlayConfig();
  var isBoss = isBossLevel(config, game.levelNumber);
  if (isBoss) {
    game.bossCount += 1;
  }
  game.isBoss = isBoss;

  var pick = pickProblemForDifficulty(game.difficulty);
  if (!pick) {
    return;
  }

  game.currentProblem = pick.problem;
  game.levelActive = true;
  loadProblem(pick.problem, pick.label, isBoss);
  pruneUsedHints();
  renderHints();
}

function isBossLevel(config, levelNumber) {
  if (!config.bossFrequency) {
    return false;
  }
  return levelNumber % config.bossFrequency === 0;
}

function showAdvanceOverlay() {
  if (!advanceOverlay || !advanceLabel || !advanceBtn) {
    return;
  }
  var config = getPlayConfig();
  var nextDifficulty = advanceDifficulty(game.difficulty, config.difficultyStep);
  var nextLevelNumber = game.levelNumber + 1;
  var nextIsBoss = isBossLevel(config, nextLevelNumber);
  var label = formatDifficulty(nextDifficulty);
  var buttonLabel = nextIsBoss ? label + " (Boss)" : label;
  advanceLabel.textContent = "On to " + label;
  advanceBtn.textContent = "Continue to " + buttonLabel;
  advanceOverlay.classList.remove("is-hidden");
  hideRetryOverlay();
  game.pendingNext = {
    difficulty: nextDifficulty,
    levelNumber: nextLevelNumber,
    isBoss: nextIsBoss,
  };
}

function hideAdvanceOverlay() {
  if (advanceOverlay) {
    advanceOverlay.classList.add("is-hidden");
  }
}

function showStartOverlay() {
  if (startOverlay) {
    startOverlay.classList.remove("is-hidden");
  }
}

function showRetryOverlay() {
  if (!retryOverlay) {
    return;
  }
  if (retryLabel && state.lives <= 0) {
    retryLabel.textContent = "Out of lives. Retry?";
  } else if (retryLabel) {
    retryLabel.textContent = "Retry this level";
  }
  retryOverlay.classList.remove("is-hidden");
}

function hideRetryOverlay() {
  if (retryOverlay) {
    retryOverlay.classList.add("is-hidden");
  }
}

function hideStartOverlay() {
  if (startOverlay) {
    startOverlay.classList.add("is-hidden");
  }
}

function endGame() {
  game.started = false;
  game.levelActive = false;
  game.levelNumber = 0;
  game.bossCount = 0;
  game.difficulty = null;
  game.currentProblem = null;
  game.pendingNext = null;
  game.hints = [];
  game.passives = [];
  game.challenge = null;
  game.isBoss = false;
  state.coins = 0;
  renderHints();
  renderPassives();
  renderChallenges();
  app.passives.resetPassives();
  app.challenges.resetChallenges();
  app.hints.clearHints();
  app.ui.setStatus("Game over. Start a new run.", "error");
  app.ui.updateHud();
  hideRetryOverlay();
  hideAdvanceOverlay();
  showStartOverlay();
}

function startGame() {
  var config = getPlayConfig();
  game.started = true;
  game.levelNumber = 1;
  game.bossCount = 0;
  game.isBoss = false;
  game.difficulty = parseDifficulty(config.startDifficulty) || {
    type: "kyu",
    value: 30,
  };
  state.lives = 3;
  state.coins = 0;
  game.maxLives = state.lives;
  app.ui.updateHud();
  setupPassives(config);
  setupHints(config);
  hideStartOverlay();
  hideRetryOverlay();
  loadLevel();
}

if (startGameBtn) {
  startGameBtn.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    startGame();
  });
}

  if (advanceBtn) {
    advanceBtn.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    if (!game.pendingNext) {
      return;
    }
      hideAdvanceOverlay();
      game.difficulty = game.pendingNext.difficulty;
      game.levelNumber = game.pendingNext.levelNumber;
      game.pendingNext = null;
      loadLevel();
    });
  }

if (retryBtn) {
  retryBtn.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    if (!game.started || !game.currentProblem) {
      return;
    }
    if (state.lives <= 0) {
      endGame();
      return;
    }
    hideRetryOverlay();
    game.levelActive = true;
    app.board.resetPuzzle();
    applyPassives();
    applyChallenge();
    renderHints();
    app.board.updateBoard();
    app.board.evaluatePosition();
  });
}

if (app.elements.mount) {
  app.elements.mount.addEventListener("click", function (event) {
    if (!game.started || !game.levelActive) {
      return;
    }
    if (
      event &&
      event.target &&
      event.target.closest &&
      event.target.closest(".play-overlay")
    ) {
      return;
    }
    if (
      event &&
      event.target &&
      event.target.classList &&
      event.target.classList.contains("board-control")
    ) {
      return;
    }
    if (!app.refs.board) {
      return;
    }
    var pos = app.refs.board.cursorPosition;
    if (!pos || pos[0] < 0 || pos[1] < 0) {
      return;
    }
    app.board.handleMoveSelection(pos[0], pos[1]);
  });
}

document.addEventListener("keydown", function (event) {
  if (event.target && event.target.tagName === "SELECT") {
    return;
  }
  if (!advanceOverlay || advanceOverlay.classList.contains("is-hidden")) {
    return;
  }
  var key = event.key;
  if (key === " " || key === "Enter" || key === "n" || key === "N") {
    event.preventDefault();
    if (advanceBtn) {
      advanceBtn.click();
    }
  }
});

app.ui.updateHud();

function calculateCoinAward() {
  var config = getPlayConfig();
  var steps = Math.max(0, game.levelNumber - 1) * config.difficultyStep;
  var amount = config.coins.base + steps * config.coins.perDifficulty;
  if (game.isBoss) {
    amount += config.coins.bossBonus;
  }
  if (!Number.isFinite(amount)) {
    amount = 0;
  }
  return Math.max(0, amount);
}

function flashCoinAward(amount) {
  if (!coinBurst || amount <= 0) {
    return;
  }
  coinBurst.classList.remove("is-active");
  while (coinBurst.firstChild) {
    coinBurst.removeChild(coinBurst.firstChild);
  }
  var icon = document.createElement("span");
  icon.className = "coin-icon coin-burst__icon";
  icon.setAttribute("aria-hidden", "true");
  var text = document.createElement("span");
  text.className = "coin-burst__value";
  text.textContent = "+" + amount;
  coinBurst.appendChild(icon);
  coinBurst.appendChild(text);
  void coinBurst.offsetWidth;
  coinBurst.classList.add("is-active");
}

function awardCoins() {
  var raw = calculateCoinAward();
  var award = Math.round(raw);
  if (award <= 0) {
    return;
  }
  state.coins = (state.coins || 0) + award;
  app.ui.updateHud();
  flashCoinAward(award);
}
