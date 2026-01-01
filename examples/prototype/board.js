import { app } from "./context.js";

var GB = app.GB;
var state = app.state;
var refs = app.refs;
var ui = app.ui;
var utils = app.utils;
var configUtils = app.configUtils;

function getNumber(value, fallback) {
  var num = Number(value);
  if (Number.isFinite(num)) {
    return num;
  }
  return fallback;
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

function initBoard(boardSize) {
  refs.board = new GB.GhostBan({
    boardSize: boardSize,
    interactive: true,
    coordinate: true,
    zoom: true,
    extent: 3,
    theme: GB.Theme.Flat,
    padding: 24,
  });
  refs.board.init(app.elements.mount);
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
  if (turn === state.playerColor) {
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
  app.overlays.renderGrayStones(state.currentMat);
  app.timers.updateMysteryUI();
  app.overlays.renderEnigmaOverlay();
  app.timers.updateEnigmaUI();
  app.fire.startFireAnimation();
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
      ui.setStatus("Correct. Puzzle solved.", "success");
      if (app.handlers.onPuzzleSolved) {
        app.handlers.onPuzzleSolved();
      }
    } else {
      ui.setStatus("Line over. Reset to try again.", "error");
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
    ui.setStatus("Your move: " + utils.colorName(turn));
  } else {
    ui.setStatus("Opponent move...");
  }
  app.timers.syncSpeedTimer();
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
  updateChildMoves();

  var chosen = state.childMoveMap.get(coord);
  if (state.blockedMoves.has(coord)) {
    state.lives -= 1;
    state.combo = 0;
    ui.updateHud();
    ui.logMessage("Eliminated move selected: " + utils.sgfToA1(coord));
    evaluatePosition();
    return;
  }

  if (!chosen) {
    state.lives -= 1;
    state.combo = 0;
    ui.updateHud();
    ui.logMessage("Wrong move (not in tree): " + utils.sgfToA1(coord));
    evaluatePosition();
    return;
  }

  app.challenges.recordGrayStone(i, j);
  app.ghost.recordGhostStone(i, j, turn);
  if (turn === state.playerColor) {
    app.challenges.recordInfection(i, j, true);
    state.speedMoveCount += 1;
  }
  var correct = GB.inRightPath(chosen.node);
  if (correct) {
    state.combo += 1;
    ui.logMessage("Correct move: " + utils.sgfToA1(coord));
  } else {
    state.lives -= 1;
    state.combo = 0;
    ui.logMessage("Wrong move: " + utils.sgfToA1(coord));
  }

  ui.updateHud();
  app.hints.setCurrentNode(chosen.node);
  autoPlayOpponent();
  updateBoard();
  evaluatePosition();
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
