import { app } from "./context.js";

var GB = app.GB;
var state = app.state;
var refs = app.refs;
var ui = app.ui;
var utils = app.utils;
var configUtils = app.configUtils;

var soundState = {
  ctx: null,
  lastClickAt: 0,
};
var boardLineCache = {};

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }
  var AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return null;
  }
  if (!soundState.ctx) {
    try {
      soundState.ctx = new AudioContext();
    } catch (err) {
      return null;
    }
  }
  if (soundState.ctx.state === "suspended") {
    soundState.ctx.resume().catch(function () {});
  }
  return soundState.ctx;
}

function playBoardClickSound() {
  var now = Date.now();
  if (now - soundState.lastClickAt < 50) {
    return;
  }
  soundState.lastClickAt = now;
  var ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(360, ctx.currentTime);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

function scheduleTone(ctx, freq, start, duration, peak, type) {
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = type || "triangle";
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.01);
}

function playVictorySound() {
  var ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  var now = ctx.currentTime;
  scheduleTone(ctx, 523.25, now, 0.12, 0.05);
  scheduleTone(ctx, 659.25, now + 0.12, 0.16, 0.05);
}

function playVictoryAccent(level) {
  var ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  var intensity = Number(level);
  if (!Number.isFinite(intensity)) {
    intensity = 1;
  }
  var now = ctx.currentTime + 0.24;
  var peak = intensity >= 2 ? 0.08 : 0.06;
  scheduleTone(ctx, 783.99, now, 0.1, peak);
  scheduleTone(ctx, 987.77, now + 0.1, 0.12, peak);
  if (intensity >= 2) {
    scheduleTone(ctx, 1174.66, now + 0.22, 0.16, peak);
  }
}

function playHintSound() {
  var ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  var now = ctx.currentTime;
  scheduleTone(ctx, 560, now, 0.08, 0.03, "sine");
  scheduleTone(ctx, 720, now + 0.06, 0.1, 0.035, "sine");
}

function playShopSound() {
  var ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  var now = ctx.currentTime;
  scheduleTone(ctx, 523.25, now, 0.08, 0.05, "triangle");
  scheduleTone(ctx, 659.25, now + 0.05, 0.1, 0.05, "triangle");
  scheduleTone(ctx, 783.99, now + 0.1, 0.14, 0.05, "triangle");
}

function playTreasureSound() {
  var ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  var now = ctx.currentTime;
  scheduleTone(ctx, 660, now, 0.1, 0.04, "triangle");
  scheduleTone(ctx, 880, now + 0.07, 0.12, 0.05, "triangle");
  scheduleTone(ctx, 1175, now + 0.14, 0.16, 0.055, "triangle");
}

function playLifeLossSound() {
  var ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  var now = ctx.currentTime;
  scheduleTone(ctx, 220, now, 0.12, 0.06, "sine");
  scheduleTone(ctx, 175, now + 0.08, 0.18, 0.05, "sine");
}

function playRunFailSound() {
  var ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  var now = ctx.currentTime;
  scheduleTone(ctx, 196, now, 0.14, 0.05, "triangle");
  scheduleTone(ctx, 147, now + 0.12, 0.2, 0.06, "triangle");
  scheduleTone(ctx, 110, now + 0.24, 0.28, 0.06, "sine");
}

function flashTimerButton(button) {
  if (!button) {
    return;
  }
  if (button._flashTimeout) {
    clearTimeout(button._flashTimeout);
  }
  button.classList.remove("is-flashing");
  void button.offsetWidth;
  button.classList.add("is-flashing");
  button._flashTimeout = setTimeout(function () {
    button.classList.remove("is-flashing");
  }, 520);
}

function getNumber(value, fallback) {
  var num = Number(value);
  if (Number.isFinite(num)) {
    return num;
  }
  return fallback;
}

function getNodeId(node) {
  return node && node.model && node.model.id ? node.model.id : null;
}

function getThemeValue(themeOptions, theme, key, fallback) {
  if (!themeOptions || !key) {
    return fallback;
  }
  var themeConfig = themeOptions[theme] || {};
  if (Object.prototype.hasOwnProperty.call(themeConfig, key)) {
    return themeConfig[key];
  }
  var defaultConfig = themeOptions.default || {};
  if (Object.prototype.hasOwnProperty.call(defaultConfig, key)) {
    return defaultConfig[key];
  }
  return fallback;
}

function setBoardLinesVisible(visible) {
  if (!refs.board) {
    return;
  }
  var theme = refs.board.options.theme;
  var themeOptions = refs.board.options.themeOptions || {};
  if (!boardLineCache[theme]) {
    boardLineCache[theme] = {
      boardLineColor: getThemeValue(
        themeOptions,
        theme,
        "boardLineColor",
        "#000000"
      ),
      activeColor: getThemeValue(
        themeOptions,
        theme,
        "activeColor",
        "#000000"
      ),
      inactiveColor: getThemeValue(
        themeOptions,
        theme,
        "inactiveColor",
        "#000000"
      ),
    };
  }
  var nextThemeConfig = Object.assign({}, themeOptions[theme] || {});
  if (visible) {
    var cached = boardLineCache[theme];
    if (cached) {
      nextThemeConfig.boardLineColor = cached.boardLineColor;
      nextThemeConfig.activeColor = cached.activeColor;
      nextThemeConfig.inactiveColor = cached.inactiveColor;
    }
  } else {
    nextThemeConfig.boardLineColor = "rgba(0, 0, 0, 0)";
    nextThemeConfig.activeColor = "rgba(0, 0, 0, 0)";
    nextThemeConfig.inactiveColor = "rgba(0, 0, 0, 0)";
  }
  refs.board.setOptions({
    themeOptions: Object.assign({}, themeOptions, {
      [theme]: nextThemeConfig,
    }),
  });
  refs.board.render();
  refs.board.renderInteractive();
}

function clampLevel(levelKey, level, fallbackMin, fallbackMax) {
  if (configUtils && configUtils.clampLevel) {
    return configUtils.clampLevel(levelKey, level, fallbackMin, fallbackMax);
  }
  var min = typeof fallbackMin === "number" ? fallbackMin : 1;
  var max = typeof fallbackMax === "number" ? fallbackMax : min;
  var value = Number(level);
  if (!Number.isFinite(value)) {
    value = min;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function getEliminateRandomConfig() {
  if (app.config && app.config.hints && app.config.hints.eliminateRandom) {
    return app.config.hints.eliminateRandom;
  }
  return {};
}

function getSpeedSolveConfig() {
  var config = app.config && app.config.speedSolve ? app.config.speedSolve : {};
  var first = getNumber(config.firstMoveSeconds, 5);
  var follow = getNumber(config.followupSeconds, 2);
  return {
    firstMoveSeconds: Math.max(0, first),
    followupSeconds: Math.max(0, follow),
  };
}

function resetSpeedSolveTracking() {
  state.speedSolveStartAt = 0;
  state.speedSolveLastMoveAt = 0;
  state.speedSolveMoveCount = 0;
  state.speedSolveFirstOk = false;
  state.speedSolveFollowupOk = true;
}

function ensureSpeedSolveStart() {
  if (state.speedSolveStartAt) {
    return;
  }
  state.speedSolveStartAt = performance.now();
}

function recordSpeedSolveMove() {
  var config = getSpeedSolveConfig();
  var now = performance.now();
  if (state.speedSolveMoveCount === 0) {
    if (!state.speedSolveStartAt) {
      state.speedSolveStartAt = now;
      state.speedSolveFirstOk = false;
    } else {
      var firstDelta = now - state.speedSolveStartAt;
      state.speedSolveFirstOk = firstDelta <= config.firstMoveSeconds * 1000;
    }
  } else if (state.speedSolveLastMoveAt) {
    var delta = now - state.speedSolveLastMoveAt;
    if (delta > config.followupSeconds * 1000) {
      state.speedSolveFollowupOk = false;
    }
  }
  state.speedSolveMoveCount += 1;
  state.speedSolveLastMoveAt = now;
}

function getSpeedSolveMark() {
  if (state.speedSolveMoveCount <= 0) {
    return "success";
  }
  if (state.speedSolveFirstOk && state.speedSolveFollowupOk) {
    return "speed-solve";
  }
  if (state.speedSolveMoveCount > 1 && state.speedSolveFollowupOk) {
    return "speed-play";
  }
  return "success";
}

function initBoard(boardSize) {
  refs.board = new GB.GhostBan({
    boardSize: boardSize,
    interactive: true,
    coordinate: false,
    zoom: true,
    extent: 3,
    theme: GB.Theme.Flat,
    padding: 24,
  });
  refs.board.init(app.elements.mount);
  if (state.challengeLineless) {
    setBoardLinesVisible(false);
  }
  app.challenges.updateChallengeControls();
  refs.grayCanvas = document.createElement("canvas");
  refs.grayCanvas.id = "ghostban-gray";
  refs.grayCanvas.style.position = "absolute";
  refs.grayCanvas.style.pointerEvents = "none";
  app.elements.mount.appendChild(refs.grayCanvas);
  refs.ghostCanvas = document.createElement("canvas");
  refs.ghostCanvas.id = "ghostban-ghost";
  refs.ghostCanvas.style.position = "absolute";
  refs.ghostCanvas.style.pointerEvents = "none";
  app.elements.mount.appendChild(refs.ghostCanvas);
  refs.enigmaCanvas = document.createElement("canvas");
  refs.enigmaCanvas.id = "ghostban-enigma";
  refs.enigmaCanvas.style.position = "absolute";
  refs.enigmaCanvas.style.pointerEvents = "none";
  app.elements.mount.appendChild(refs.enigmaCanvas);
  refs.fireCanvas = document.createElement("canvas");
  refs.fireCanvas.id = "ghostban-fire";
  refs.fireCanvas.style.position = "absolute";
  refs.fireCanvas.style.pointerEvents = "none";
  app.elements.mount.appendChild(refs.fireCanvas);
  refs.frostCanvas = document.createElement("canvas");
  refs.frostCanvas.id = "ghostban-frost";
  refs.frostCanvas.style.position = "absolute";
  refs.frostCanvas.style.pointerEvents = "none";
  app.elements.mount.appendChild(refs.frostCanvas);
  refs.flipCanvas = document.createElement("canvas");
  refs.flipCanvas.id = "ghostban-flip";
  refs.flipCanvas.style.position = "absolute";
  refs.flipCanvas.style.pointerEvents = "none";
  app.elements.mount.appendChild(refs.flipCanvas);
  refs.spotlightCanvas = document.createElement("canvas");
  refs.spotlightCanvas.id = "ghostban-spotlight";
  refs.spotlightCanvas.style.position = "absolute";
  refs.spotlightCanvas.style.pointerEvents = "none";
  app.elements.mount.appendChild(refs.spotlightCanvas);
  refs.spyglassCanvas = document.createElement("canvas");
  refs.spyglassCanvas.id = "ghostban-spyglass";
  refs.spyglassCanvas.style.position = "absolute";
  refs.spyglassCanvas.style.pointerEvents = "none";
  app.elements.mount.appendChild(refs.spyglassCanvas);
  refs.fxCanvas = document.createElement("canvas");
  refs.fxCanvas.id = "ghostban-fx";
  refs.fxCanvas.style.position = "absolute";
  refs.fxCanvas.style.pointerEvents = "none";
  app.elements.mount.appendChild(refs.fxCanvas);
  state.enigmaPoints = [];

  refs.mysteryBtn = document.createElement("button");
  refs.mysteryBtn.id = "mysteryTimerBtn";
  refs.mysteryBtn.className = "board-control";
  refs.mysteryBtn.type = "button";
  refs.mysteryBtn.textContent = "Reveal & Start Timer";
  refs.mysteryBtn.style.display = "none";
  refs.mysteryBtn.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    app.timers.revealMysteryAndStart();
  });
  app.elements.mount.appendChild(refs.mysteryBtn);
  refs.mysteryTimerEl = document.createElement("div");
  refs.mysteryTimerEl.id = "mysteryTimerCountdown";
  refs.mysteryTimerEl.className = "board-control";
  refs.mysteryTimerEl.setAttribute("aria-live", "polite");
  refs.mysteryTimerEl.style.display = "none";
  app.elements.mount.appendChild(refs.mysteryTimerEl);
  app.timers.updateMysteryButtonLabel();

  refs.enigmaBtn = document.createElement("button");
  refs.enigmaBtn.id = "enigmaTimerBtn";
  refs.enigmaBtn.className = "board-control";
  refs.enigmaBtn.type = "button";
  refs.enigmaBtn.textContent = "Reveal & Start Timer";
  refs.enigmaBtn.style.display = "none";
  refs.enigmaBtn.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    app.timers.revealEnigmaAndStart();
  });
  app.elements.mount.appendChild(refs.enigmaBtn);
  refs.enigmaTimerEl = document.createElement("div");
  refs.enigmaTimerEl.id = "enigmaTimerCountdown";
  refs.enigmaTimerEl.className = "board-control";
  refs.enigmaTimerEl.setAttribute("aria-live", "polite");
  refs.enigmaTimerEl.style.display = "none";
  app.elements.mount.appendChild(refs.enigmaTimerEl);
  app.timers.updateEnigmaButtonLabel();

  refs.speedTimerEl = document.createElement("div");
  refs.speedTimerEl.id = "speedTimerCountdown";
  refs.speedTimerEl.className = "board-control";
  refs.speedTimerEl.setAttribute("aria-live", "polite");
  refs.speedTimerEl.style.display = "none";
  app.elements.mount.appendChild(refs.speedTimerEl);

  refs.secondChanceTimerEl = document.createElement("div");
  refs.secondChanceTimerEl.id = "secondChanceCountdown";
  refs.secondChanceTimerEl.className = "board-control";
  refs.secondChanceTimerEl.setAttribute("aria-live", "polite");
  refs.secondChanceTimerEl.style.display = "none";
  app.elements.mount.appendChild(refs.secondChanceTimerEl);

  refs.multishotCounterEl = document.createElement("div");
  refs.multishotCounterEl.id = "multishotCounter";
  refs.multishotCounterEl.className = "board-control";
  refs.multishotCounterEl.setAttribute("aria-live", "polite");
  refs.multishotCounterEl.style.display = "none";
  app.elements.mount.appendChild(refs.multishotCounterEl);
  if (app.hints && app.hints.updateMultishotIndicator) {
    app.hints.updateMultishotIndicator();
  }

  refs.rowHintEl = document.createElement("div");
  refs.rowHintEl.className = "row-hint";
  refs.rowHintEl.setAttribute("aria-hidden", "true");
  refs.rowHintEl.style.display = "none";
  app.elements.mount.appendChild(refs.rowHintEl);
  refs.colHintEl = document.createElement("div");
  refs.colHintEl.className = "col-hint";
  refs.colHintEl.setAttribute("aria-hidden", "true");
  refs.colHintEl.style.display = "none";
  app.elements.mount.appendChild(refs.colHintEl);
  refs.diagHintEl = document.createElement("div");
  refs.diagHintEl.className = "diag-hint";
  refs.diagHintEl.setAttribute("aria-hidden", "true");
  refs.diagHintEl.style.display = "none";
  app.elements.mount.appendChild(refs.diagHintEl);
}

function getChildMoves(node) {
  if (!node || !node.hasChildren()) {
    return [];
  }
  var moves = [];
  node.children.forEach(function (child) {
    var moveProp = child.model.moveProps[0];
    if (!moveProp || !moveProp.value || moveProp.value.length < 2) {
      return;
    }
    var coord = moveProp.value;
    var idx = utils.sgfToIndex(coord);
    if (!idx) {
      return;
    }
    moves.push({
      node: child,
      sgf: coord,
      i: idx.i,
      j: idx.j,
    });
  });
  return moves;
}

function updateChildMoves() {
  state.childMoves = getChildMoves(state.currentNode);
  state.childMoveMap = new Map();
  state.childMoves.forEach(function (move) {
    state.childMoveMap.set(move.sgf, move);
  });
}

function buildPreventMoveMat(size) {
  return GB.zeros([size, size]);
}

function updateBoard() {
  var size = GB.extractBoardSize(state.currentNode, 19);
  updateChildMoves();

  var res = GB.calcMatAndMarkup(state.currentNode, size);
  state.currentMat = res.mat;
  app.hints.applyHintMarkup(res.markup, res.mat);
  app.timers.ensureMysteryStones(state.currentMat);

  var visibleMat = app.ghost.applyGhostMask(res.mat);
  refs.board.setMat(visibleMat);
  refs.board.setVisibleAreaMat(res.visibleAreaMat);
  refs.board.setMarkup(res.markup);
  refs.board.setPreventMoveMat(buildPreventMoveMat(size));
  refs.board.setTurn(utils.getTurn(state.currentNode, state.playerColor));

  var turn = utils.getTurn(state.currentNode, state.playerColor);
  var revealBlocked =
    (state.challengeMystery && !state.mysteryRevealed) ||
    (state.challengeEnigma && !state.enigmaRevealed);
  if (!revealBlocked && turn === state.playerColor) {
    refs.board.setCursor(
      turn === GB.Ki.Black ? GB.Cursor.BlackStone : GB.Cursor.WhiteStone
    );
  } else {
    refs.board.setCursor(GB.Cursor.None);
  }

  refs.board.render();
  refs.board.renderInteractive();
  app.hints.positionRowHint();
  app.hints.positionColumnHint();
  app.hints.positionDiagonalHint();
  app.hints.positionMultishotIndicator();
  app.overlays.renderGrayStones(state.currentMat);
  app.timers.updateMysteryUI();
  app.overlays.renderEnigmaOverlay();
  app.timers.updateEnigmaUI();
  app.fire.startFireAnimation();
  app.frost.startFrostAnimation();
  app.flip.startFlipAnimation();
  app.spotlight.startSpotlightAnimation();
  app.spyglass.startSpyglassAnimation();
  var revealActive =
    state.ghostRevealUntil > 0 && state.ghostRevealUntil > performance.now();
  if (state.challengeGhost && (state.ghostFlashes.length > 0 || revealActive)) {
    app.ghost.startGhostAnimation();
  } else {
    app.ghost.clearGhostCanvas();
  }
}

function evaluatePosition() {
  if (state.lives <= 0) {
    ui.setStatus("Out of lives. Reset to continue.", "error");
    app.timers.stopSpeedTimer(false);
    if (app.handlers.onPuzzleFailed) {
      app.handlers.onPuzzleFailed();
    }
    return;
  }

  if (!state.currentNode.hasChildren()) {
    if (GB.isRightNode(state.currentNode)) {
      ui.setStatus(
        "Correct. Puzzle solved.",
        "success",
        null,
        getSpeedSolveMark()
      );
      playVictorySound();
      if (app.handlers.onPuzzleSolved) {
        app.handlers.onPuzzleSolved();
      }
    } else {
      var nodeId = getNodeId(state.currentNode);
      if (!nodeId || state.lastMistakeEndId !== nodeId) {
        state.lives -= 1;
        state.combo = 0;
        state.lastMistakeEndId = nodeId || null;
        ui.updateHud();
        ui.logMessage("Mistake branch ended: lost a life.");
      }
      if (state.lives <= 0) {
        ui.setStatus("Out of lives. Reset to continue.", "error");
      } else {
        ui.setStatus("Line over. Reset to try again.", "error");
      }
      if (app.handlers.onPuzzleFailed) {
        app.handlers.onPuzzleFailed();
      }
    }
    app.timers.stopSpeedTimer(false);
    return;
  }

  if (
    (state.challengeMystery && !state.mysteryRevealed) ||
    (state.challengeEnigma && !state.enigmaRevealed)
  ) {
    ui.setStatus("Reveal & start timer to begin.");
    app.timers.stopSpeedTimer(false);
    return;
  }

  var turn = utils.getTurn(state.currentNode, state.playerColor);
  if (turn === state.playerColor) {
    ensureSpeedSolveStart();
    ui.setStatus("Your move", null, turn);
  } else {
    ui.setStatus("Opponent move...");
  }
  app.timers.syncSpeedTimer();
}

function handleImmediateFailure() {
  if (state.lives <= 0) {
    ui.setStatus("Out of lives. Reset to continue.", "error");
  } else {
    ui.setStatus("Line over. Reset to try again.", "error");
  }
  app.timers.stopSpeedTimer(false);
  if (app.handlers.onPuzzleFailed) {
    app.handlers.onPuzzleFailed();
  }
}

function pickOpponentMove() {
  if (state.childMoves.length === 0) {
    return null;
  }
  var correct = state.childMoves.find(function (move) {
    return GB.inRightPath(move.node);
  });
  return correct || state.childMoves[0];
}

function autoPlayOpponent() {
  var guard = 0;
  var turn = utils.getTurn(state.currentNode, state.playerColor);
  while (turn !== state.playerColor && guard < 4) {
    updateChildMoves();
    var move = pickOpponentMove();
    if (!move) {
      break;
    }
    app.challenges.recordGrayStone(move.i, move.j);
    app.ghost.recordGhostStone(move.i, move.j, turn);
    app.challenges.recordInfection(move.i, move.j, false);
    app.hints.setCurrentNode(move.node);
    turn = utils.getTurn(state.currentNode, state.playerColor);
    guard += 1;
  }
}

function resetPuzzle() {
  if (!state.rootNode) {
    return;
  }
  resetSpeedSolveTracking();
  app.timers.stopMysteryTimer(false);
  state.mysteryStoneKeys = [];
  state.mysteryRevealed = false;
  app.timers.updateMysteryUI();
  app.timers.stopEnigmaTimer(false);
  state.enigmaPoints = [];
  state.enigmaRevealed = false;
  app.timers.updateEnigmaUI();
  app.challenges.resetChallenges();
  app.passives.resetPassives();
  app.hints.setCurrentNode(state.rootNode);
  state.combo = 0;
  state.lastMistakeEndId = null;
  app.hints.clearTemporaryState();
  autoPlayOpponent();
  updateBoard();
  ui.updateHud();
  evaluatePosition();
  ui.logMessage("Puzzle reset.");
}

function loadSgf(key) {
  var sgfText = app.sgfSources[key];
  if (!sgfText) {
    ui.logMessage("SGF not found: " + key);
    return;
  }

  var sgf = new GB.Sgf(sgfText);
  if (!sgf.root) {
    ui.logMessage("Failed to parse SGF: " + key);
    return;
  }

  state.sgfKey = key;
  state.rootNode = sgf.root;
  state.playerColor = GB.getFirstToMoveColorFromRoot(sgf.root, GB.Ki.Black);
  state.combo = 0;
  state.lastNodeId = null;
  state.lastMistakeEndId = null;
  if (app.passives && app.passives.updateCaptureIndicators) {
    app.passives.updateCaptureIndicators();
  }

  initBoard(GB.extractBoardSize(sgf.root, 19));
  resetPuzzle();
  ui.logMessage("Loaded SGF " + key + ".");
}

function collectEliminateDecoys(count, wrongMoves) {
  if (count <= 0 || !state.currentMat) {
    return [];
  }

  var size = state.currentMat.length || GB.extractBoardSize(state.currentNode, 19);
  var turn = utils.getTurn(state.currentNode, state.playerColor);
  var previousBoardState =
    refs.board && refs.board.getPreviousBoardState
      ? refs.board.getPreviousBoardState()
      : null;
  var offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  var taken = new Set();
  state.childMoves.forEach(function (move) {
    taken.add(move.sgf);
  });
  state.blockedMoves.forEach(function (coord) {
    taken.add(coord);
  });
  if (wrongMoves && wrongMoves.length) {
    wrongMoves.forEach(function (move) {
      taken.add(move.sgf);
    });
  }

  var candidates = [];
  state.childMoves.forEach(function (move) {
    offsets.forEach(function (offset) {
      var i = move.i + offset[0];
      var j = move.j + offset[1];
      if (i < 0 || j < 0 || i >= size || j >= size) {
        return;
      }
      if (!state.currentMat[i] || state.currentMat[i][j] !== GB.Ki.Empty) {
        return;
      }
      var coord = GB.SGF_LETTERS[i] + GB.SGF_LETTERS[j];
      if (taken.has(coord)) {
        return;
      }
      if (!GB.canMove(state.currentMat, i, j, turn, previousBoardState)) {
        return;
      }
      candidates.push(coord);
      taken.add(coord);
    });
  });

  if (candidates.length === 0) {
    return [];
  }

  var picks = [];
  var pool = candidates.slice();
  while (picks.length < count && pool.length > 0) {
    var index = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  return picks;
}

function eliminateRandomMove() {
  updateChildMoves();
  var wrongMoves = state.childMoves.filter(function (move) {
    return (
      !state.blockedMoves.has(move.sgf) &&
      !GB.inRightPath(move.node) &&
      !GB.inVariantPath(move.node)
    );
  });

  var level = clampLevel("eliminateRandom", state.elimRandomLevel, 1, 3);
  var config = getEliminateRandomConfig();
  var baseDecoys = getNumber(config.baseDecoys, 2);
  var decrement = getNumber(config.decrementPerLevel, 1);
  var minDecoys = getNumber(config.minDecoys, 0);
  var minIfNoWrong = getNumber(config.minIfNoWrong, 1);
  var decoyCount = baseDecoys - (level - 1) * decrement;
  if (!Number.isFinite(decoyCount)) {
    decoyCount = baseDecoys;
  }
  decoyCount = Math.max(minDecoys, Math.round(decoyCount));
  if (wrongMoves.length === 0 && decoyCount <= 0) {
    decoyCount = minIfNoWrong;
  }

  var decoys = collectEliminateDecoys(decoyCount, wrongMoves);
  var candidates = wrongMoves.map(function (move) {
    return move.sgf;
  });
  decoys.forEach(function (coord) {
    candidates.push(coord);
  });

  if (candidates.length === 0) {
    ui.logMessage("No moves available to eliminate.");
    return;
  }

  var pick = candidates[Math.floor(Math.random() * candidates.length)];
  state.blockedMoves.add(pick);
  ui.logMessage("Eliminated move: " + utils.sgfToA1(pick));
  updateBoard();
}

function applyMoveAt(i, j) {
  var coord = GB.SGF_LETTERS[i] + GB.SGF_LETTERS[j];
  updateChildMoves();

  var turn = utils.getTurn(state.currentNode, state.playerColor);
  var chosen = state.childMoveMap.get(coord);
  var isBlocked = state.blockedMoves.has(coord);
  var isCorrect = chosen && GB.inRightPath(chosen.node);
  var immediateFailure = isBlocked || !chosen;

  if (state.secondChanceActive) {
    if (isCorrect) {
      if (app.passives && app.passives.clearSecondChanceTimer) {
        app.passives.clearSecondChanceTimer();
      }
      ui.logMessage("Second chance used: " + utils.sgfToA1(coord));
    } else if (immediateFailure) {
      if (app.passives && app.passives.clearSecondChanceTimer) {
        app.passives.clearSecondChanceTimer();
      }
      state.lives -= 1;
      state.combo = 0;
      ui.updateHud();
      if (isBlocked) {
        ui.logMessage(
          "Second chance failed: eliminated move " + utils.sgfToA1(coord)
        );
      } else if (!chosen) {
        ui.logMessage(
          "Second chance failed: wrong move (not in tree) " +
            utils.sgfToA1(coord)
        );
      } else {
        ui.logMessage("Second chance failed: wrong move " + utils.sgfToA1(coord));
      }
      if (!chosen && app.effects && app.effects.triggerBadMoveShatter) {
        app.effects.triggerBadMoveShatter(i, j, turn);
      }
      handleImmediateFailure();
      return false;
    } else if (app.passives && app.passives.clearSecondChanceTimer) {
      app.passives.clearSecondChanceTimer();
    }
  } else if (immediateFailure && app.passives && app.passives.startSecondChance) {
    var duration = app.passives.startSecondChance(function () {
      state.lives -= 1;
      state.combo = 0;
      ui.updateHud();
      ui.logMessage("Second chance expired: lost a life.");
      handleImmediateFailure();
    });
    if (duration) {
      ui.setStatus("Second chance! Play the correct move.");
      ui.logMessage("Second chance active (" + duration + "s).");
      return false;
    }
  }

  if (immediateFailure) {
    state.lives -= 1;
    state.combo = 0;
    ui.updateHud();
    if (isBlocked) {
      ui.logMessage("Eliminated move selected: " + utils.sgfToA1(coord));
    } else {
      ui.logMessage("Wrong move (not in tree): " + utils.sgfToA1(coord));
    }
    if (!chosen && app.effects && app.effects.triggerBadMoveShatter) {
      app.effects.triggerBadMoveShatter(i, j, turn);
    }
    handleImmediateFailure();
    return false;
  }

  app.challenges.recordGrayStone(i, j);
  app.ghost.recordGhostStone(i, j, turn);
  if (turn === state.playerColor) {
    recordSpeedSolveMove();
    app.challenges.recordInfection(i, j, true);
    state.speedMoveCount += 1;
  }
  if (isCorrect) {
    state.combo += 1;
    ui.logMessage("Correct move: " + utils.sgfToA1(coord));
  } else {
    state.combo = 0;
    ui.logMessage("Wrong branch move: " + utils.sgfToA1(coord));
  }

  ui.updateHud();
  app.hints.setCurrentNode(chosen.node);
  autoPlayOpponent();
  updateBoard();
  evaluatePosition();
  return true;
}

function handleMultishotPick(coord, i, j) {
  if (!state.multishotActive) {
    return;
  }
  if (!state.multishotSelectionSet) {
    state.multishotSelectionSet = new Set();
  }
  if (state.multishotSelectionSet.has(coord)) {
    return;
  }
  state.multishotSelectionSet.add(coord);
  if (!Array.isArray(state.multishotSelections)) {
    state.multishotSelections = [];
  }
  state.multishotSelections.push(coord);
  state.multishotRemaining = Math.max(0, state.multishotRemaining - 1);
  if (app.hints && app.hints.updateMultishotIndicator) {
    app.hints.updateMultishotIndicator();
  }
  if (state.multishotRemaining > 0) {
    ui.logMessage(
      "Multishot pick: " +
        utils.sgfToA1(coord) +
        " (" +
        state.multishotRemaining +
        " left)"
    );
    updateBoard();
    return;
  }

  var picks = state.multishotSelections.slice();
  var chosenCoord = null;
  for (var p = 0; p < picks.length; p += 1) {
    var pick = picks[p];
    var move = state.childMoveMap.get(pick);
    if (!move) {
      continue;
    }
    if (state.blockedMoves.has(pick)) {
      continue;
    }
    if (GB.inRightPath(move.node)) {
      chosenCoord = pick;
      break;
    }
  }
  var resolved = chosenCoord || picks[picks.length - 1];
  if (app.hints && app.hints.clearMultishot) {
    app.hints.clearMultishot();
  } else {
    state.multishotActive = false;
    state.multishotRemaining = 0;
    state.multishotSelections = [];
    state.multishotSelectionSet = new Set();
  }
  var idx = utils.sgfToIndex(resolved);
  if (!idx) {
    updateBoard();
    return;
  }
  var moved = applyMoveAt(idx.i, idx.j);
  if (!moved) {
    updateBoard();
  }
}

function handleMoveSelection(i, j) {
  if (state.lives <= 0) {
    return;
  }

  if (
    (state.challengeMystery && !state.mysteryRevealed) ||
    (state.challengeEnigma && !state.enigmaRevealed)
  ) {
    ui.setStatus("Reveal & start timer to begin.");
    ui.logMessage("Reveal & start the timer before playing.");
    if (state.challengeMystery && !state.mysteryRevealed) {
      flashTimerButton(refs.mysteryBtn);
    }
    if (state.challengeEnigma && !state.enigmaRevealed) {
      flashTimerButton(refs.enigmaBtn);
    }
    return;
  }

  var turn = utils.getTurn(state.currentNode, state.playerColor);
  if (
    !state.currentMat ||
    !state.currentMat[i] ||
    typeof state.currentMat[i][j] === "undefined"
  ) {
    return;
  }
  var previousBoardState =
    refs.board && refs.board.getPreviousBoardState
      ? refs.board.getPreviousBoardState()
      : null;
  if (!GB.canMove(state.currentMat, i, j, turn, previousBoardState)) {
    return;
  }

  playBoardClickSound();

  if (state.mysteryTimerActive) {
    app.timers.stopMysteryTimer(false);
  }
  if (state.enigmaTimerActive) {
    app.timers.stopEnigmaTimer(false);
  }
  if (state.speedTimerActive) {
    app.timers.stopSpeedTimer(false);
  }

  var coord = GB.SGF_LETTERS[i] + GB.SGF_LETTERS[j];
  if (state.multishotActive) {
    updateChildMoves();
    handleMultishotPick(coord, i, j);
    return;
  }

  applyMoveAt(i, j);
}

app.board.initBoard = initBoard;
app.board.updateBoard = updateBoard;
app.board.evaluatePosition = evaluatePosition;
app.board.updateChildMoves = updateChildMoves;
app.board.autoPlayOpponent = autoPlayOpponent;
app.board.resetPuzzle = resetPuzzle;
app.board.loadSgf = loadSgf;
app.board.handleMoveSelection = handleMoveSelection;
app.board.eliminateRandomMove = eliminateRandomMove;
app.board.resetSpeedSolveTracking = resetSpeedSolveTracking;
app.board.ensureSpeedSolveStart = ensureSpeedSolveStart;
app.board.getSpeedSolveMark = getSpeedSolveMark;
app.board.setBoardLinesVisible = setBoardLinesVisible;
app.board.playVictoryAccent = playVictoryAccent;
app.board.playHintSound = playHintSound;
app.board.playShopSound = playShopSound;
app.board.playTreasureSound = playTreasureSound;
app.board.playLifeLossSound = playLifeLossSound;
app.board.playRunFailSound = playRunFailSound;
