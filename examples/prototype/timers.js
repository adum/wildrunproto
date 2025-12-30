import { app } from "./context.js";

var GB = app.GB;
var state = app.state;
var refs = app.refs;
var ui = app.ui;
var utils = app.utils;

function getMysteryStoneCount(level) {
  var safeLevel = Math.max(1, Number(level) || 1);
  return safeLevel;
}

function getMysteryTimerSeconds(level) {
  var safeLevel = Math.max(1, Number(level) || 1);
  return Math.max(5, 30 - (safeLevel - 1) * 5);
}

function ensureMysteryStones(mat) {
  if (
    !state.challengeMystery ||
    state.mysteryStoneKeys.length > 0 ||
    state.mysteryRevealed
  ) {
    return;
  }
  if (!mat || mat.length === 0) {
    return;
  }
  var stones = [];
  for (var i = 0; i < mat.length; i += 1) {
    for (var j = 0; j < mat[i].length; j += 1) {
      if (mat[i][j] !== GB.Ki.Empty) {
        stones.push(i + "," + j);
      }
    }
  }
  if (stones.length === 0) {
    state.mysteryStoneKeys = [];
    state.mysteryRevealed = true;
    return;
  }
  var count = getMysteryStoneCount(state.mysteryLevel);
  var picked = [];
  for (var k = stones.length - 1; k > 0; k -= 1) {
    var swap = Math.floor(Math.random() * (k + 1));
    var temp = stones[k];
    stones[k] = stones[swap];
    stones[swap] = temp;
  }
  for (var n = 0; n < stones.length && picked.length < count; n += 1) {
    picked.push(stones[n]);
  }
  state.mysteryStoneKeys = picked;
}

function updateMysteryButtonLabel() {
  if (!refs.mysteryBtn) {
    return;
  }
  var seconds = getMysteryTimerSeconds(state.mysteryLevel);
  refs.mysteryBtn.textContent = "Reveal & Start Timer " + seconds + "s";
}

function updateMysteryLevelUI() {
  if (app.elements.mysteryLevelInput) {
    app.elements.mysteryLevelInput.value = String(state.mysteryLevel);
  }
  if (app.elements.mysteryLevelValue) {
    app.elements.mysteryLevelValue.textContent = String(state.mysteryLevel);
  }
  updateMysteryButtonLabel();
}

function setMysteryLevel(level) {
  var nextLevel = Math.max(1, Number(level) || 1);
  state.mysteryLevel = nextLevel;
  updateMysteryLevelUI();
  if (state.challengeMystery && !state.mysteryRevealed) {
    state.mysteryStoneKeys = [];
    ensureMysteryStones(state.currentMat);
    app.overlays.renderGrayStones(state.currentMat);
    updateMysteryUI();
  }
}

function updateMysteryUI() {
  updateMysteryButtonLabel();
  if (refs.mysteryBtn) {
    if (
      state.challengeMystery &&
      state.mysteryStoneKeys.length > 0 &&
      !state.mysteryRevealed
    ) {
      refs.mysteryBtn.style.display = "inline-flex";
    } else {
      refs.mysteryBtn.style.display = "none";
    }
  }
  if (refs.mysteryTimerEl) {
    if (state.mysteryTimerActive) {
      refs.mysteryTimerEl.style.display = "block";
    } else {
      refs.mysteryTimerEl.style.display = "none";
    }
  }
}

function updateMysteryTimerDisplay(seconds) {
  if (!refs.mysteryTimerEl) {
    return;
  }
  refs.mysteryTimerEl.textContent = String(seconds);
}

function stopMysteryTimer(expired) {
  if (state.mysteryTimerId) {
    clearInterval(state.mysteryTimerId);
    state.mysteryTimerId = null;
  }
  state.mysteryTimerActive = false;
  state.mysteryTimerEndsAt = 0;
  updateMysteryUI();

  if (expired) {
    state.lives -= 1;
    state.combo = 0;
    ui.updateHud();
    ui.logMessage("Mystery timer expired: lost a life.");
    if (app.handlers.onTimerExpired) {
      app.handlers.onTimerExpired();
    }
  }
}

function tickMysteryTimer() {
  if (!state.mysteryTimerActive) {
    return;
  }
  var remaining = state.mysteryTimerEndsAt - performance.now();
  var seconds = Math.max(0, Math.ceil(remaining / 1000));
  updateMysteryTimerDisplay(seconds);
  if (remaining <= 0) {
    stopMysteryTimer(true);
  }
}

function startMysteryTimer() {
  if (state.mysteryTimerActive) {
    stopMysteryTimer(false);
  }
  var duration = getMysteryTimerSeconds(state.mysteryLevel);
  state.mysteryTimerActive = true;
  state.mysteryTimerEndsAt = performance.now() + duration * 1000;
  updateMysteryTimerDisplay(duration);
  updateMysteryUI();
  state.mysteryTimerId = setInterval(tickMysteryTimer, 100);
}

function revealMysteryAndStart() {
  if (!state.challengeMystery || state.mysteryRevealed) {
    return;
  }
  if (state.mysteryStoneKeys.length === 0) {
    ui.logMessage("No mystery stone available.");
    state.mysteryRevealed = true;
    updateMysteryUI();
    return;
  }
  state.mysteryRevealed = true;
  app.overlays.renderGrayStones(state.currentMat);
  updateMysteryUI();
  startMysteryTimer();
  ui.logMessage("Mystery stone revealed. Timer started.");
}

function getEnigmaPointCount(level) {
  var safeLevel = Math.max(1, Number(level) || 1);
  return safeLevel;
}

function getEnigmaTimerSeconds(level) {
  var safeLevel = Math.max(1, Number(level) || 1);
  return Math.max(5, 30 - (safeLevel - 1) * 5);
}

function updateEnigmaButtonLabel() {
  if (!refs.enigmaBtn) {
    return;
  }
  var seconds = getEnigmaTimerSeconds(state.enigmaLevel);
  refs.enigmaBtn.textContent = "Reveal & Start Timer " + seconds + "s";
}

function updateEnigmaLevelUI() {
  if (app.elements.enigmaLevelInput) {
    app.elements.enigmaLevelInput.value = String(state.enigmaLevel);
  }
  if (app.elements.enigmaLevelValue) {
    app.elements.enigmaLevelValue.textContent = String(state.enigmaLevel);
  }
  updateEnigmaButtonLabel();
}

function setEnigmaLevel(level) {
  var nextLevel = Math.max(1, Number(level) || 1);
  state.enigmaLevel = nextLevel;
  updateEnigmaLevelUI();
  if (state.challengeEnigma && !state.enigmaRevealed) {
    state.enigmaPoints = [];
    app.overlays.renderEnigmaOverlay();
    updateEnigmaUI();
  }
}

function updateEnigmaTimerDisplay(seconds) {
  if (!refs.enigmaTimerEl) {
    return;
  }
  refs.enigmaTimerEl.textContent = String(seconds);
}

function stopEnigmaTimer(expired) {
  if (state.enigmaTimerId) {
    clearInterval(state.enigmaTimerId);
    state.enigmaTimerId = null;
  }
  state.enigmaTimerActive = false;
  state.enigmaTimerEndsAt = 0;
  updateEnigmaUI();

  if (expired) {
    state.lives -= 1;
    state.combo = 0;
    ui.updateHud();
    ui.logMessage("Enigma timer expired: lost a life.");
    if (app.handlers.onTimerExpired) {
      app.handlers.onTimerExpired();
    }
  }
}

function tickEnigmaTimer() {
  if (!state.enigmaTimerActive) {
    return;
  }
  var remaining = state.enigmaTimerEndsAt - performance.now();
  var seconds = Math.max(0, Math.ceil(remaining / 1000));
  updateEnigmaTimerDisplay(seconds);
  if (remaining <= 0) {
    stopEnigmaTimer(true);
  }
}

function startEnigmaTimer() {
  if (state.enigmaTimerActive) {
    stopEnigmaTimer(false);
  }
  var duration = getEnigmaTimerSeconds(state.enigmaLevel);
  state.enigmaTimerActive = true;
  state.enigmaTimerEndsAt = performance.now() + duration * 1000;
  updateEnigmaTimerDisplay(duration);
  updateEnigmaUI();
  state.enigmaTimerId = setInterval(tickEnigmaTimer, 100);
}

function updateEnigmaUI() {
  updateEnigmaButtonLabel();
  if (refs.enigmaBtn) {
    if (state.challengeEnigma && state.enigmaPoints.length > 0 && !state.enigmaRevealed) {
      refs.enigmaBtn.style.display = "inline-flex";
    } else {
      refs.enigmaBtn.style.display = "none";
    }
  }
  if (refs.enigmaTimerEl) {
    if (state.enigmaTimerActive) {
      refs.enigmaTimerEl.style.display = "block";
    } else {
      refs.enigmaTimerEl.style.display = "none";
    }
  }
}

function revealEnigmaAndStart() {
  if (!state.challengeEnigma || state.enigmaRevealed) {
    return;
  }
  if (state.enigmaPoints.length === 0) {
    ui.logMessage("No enigma points available.");
    state.enigmaRevealed = true;
    updateEnigmaUI();
    return;
  }
  state.enigmaRevealed = true;
  state.enigmaPoints = [];
  app.overlays.renderEnigmaOverlay();
  updateEnigmaUI();
  startEnigmaTimer();
  ui.logMessage("Enigma rings revealed. Timer started.");
}

function getSpeedTimerSeconds(level) {
  var safeLevel = Math.max(1, Number(level) || 1);
  return Math.max(2, 30 - (safeLevel - 1) * 5);
}

function updateSpeedLevelUI() {
  if (app.elements.speedLevelInput) {
    app.elements.speedLevelInput.value = String(state.speedLevel);
  }
  if (app.elements.speedLevelValue) {
    app.elements.speedLevelValue.textContent = String(state.speedLevel);
  }
}

function setSpeedLevel(level) {
  var nextLevel = Math.max(1, Number(level) || 1);
  state.speedLevel = nextLevel;
  updateSpeedLevelUI();
}

function updateSpeedTimerDisplay(seconds) {
  if (!refs.speedTimerEl) {
    return;
  }
  refs.speedTimerEl.textContent = String(seconds);
}

function updateSpeedUI() {
  if (!refs.speedTimerEl) {
    return;
  }
  if (state.speedTimerActive) {
    refs.speedTimerEl.style.display = "block";
  } else {
    refs.speedTimerEl.style.display = "none";
  }
}

function stopSpeedTimer(expired) {
  if (state.speedTimerId) {
    clearInterval(state.speedTimerId);
    state.speedTimerId = null;
  }
  state.speedTimerActive = false;
  state.speedTimerEndsAt = 0;
  updateSpeedUI();

  if (expired) {
    state.lives -= 1;
    state.combo = 0;
    ui.updateHud();
    ui.logMessage("Speed timer expired: lost a life.");
    if (app.handlers.onTimerExpired) {
      app.handlers.onTimerExpired();
    }
  }
}

function tickSpeedTimer() {
  if (!state.speedTimerActive) {
    return;
  }
  var remaining = state.speedTimerEndsAt - performance.now();
  var seconds = Math.max(0, Math.ceil(remaining / 1000));
  updateSpeedTimerDisplay(seconds);
  if (remaining <= 0) {
    stopSpeedTimer(true);
  }
}

function startSpeedTimer() {
  if (state.speedTimerActive) {
    stopSpeedTimer(false);
  }
  var duration = getSpeedTimerSeconds(state.speedLevel);
  state.speedTimerActive = true;
  state.speedTimerEndsAt = performance.now() + duration * 1000;
  updateSpeedTimerDisplay(duration);
  updateSpeedUI();
  state.speedTimerId = setInterval(tickSpeedTimer, 100);
}

function shouldRunSpeedTimer() {
  if (!state.challengeSpeed) {
    return false;
  }
  if (state.lives <= 0) {
    return false;
  }
  if (!state.currentNode || !state.currentNode.hasChildren()) {
    return false;
  }
  if (state.speedMoveCount <= 0) {
    return false;
  }
  if (
    (state.challengeMystery && !state.mysteryRevealed) ||
    (state.challengeEnigma && !state.enigmaRevealed)
  ) {
    return false;
  }
  var turn = utils.getTurn(state.currentNode, state.playerColor);
  return turn === state.playerColor;
}

function syncSpeedTimer() {
  if (shouldRunSpeedTimer()) {
    if (!state.speedTimerActive) {
      startSpeedTimer();
    }
  } else if (state.speedTimerActive) {
    stopSpeedTimer(false);
  }
}

app.timers.getMysteryStoneCount = getMysteryStoneCount;
app.timers.getMysteryTimerSeconds = getMysteryTimerSeconds;
app.timers.ensureMysteryStones = ensureMysteryStones;
app.timers.updateMysteryButtonLabel = updateMysteryButtonLabel;
app.timers.updateMysteryLevelUI = updateMysteryLevelUI;
app.timers.setMysteryLevel = setMysteryLevel;
app.timers.updateMysteryUI = updateMysteryUI;
app.timers.stopMysteryTimer = stopMysteryTimer;
app.timers.startMysteryTimer = startMysteryTimer;
app.timers.revealMysteryAndStart = revealMysteryAndStart;

app.timers.getEnigmaPointCount = getEnigmaPointCount;
app.timers.getEnigmaTimerSeconds = getEnigmaTimerSeconds;
app.timers.updateEnigmaButtonLabel = updateEnigmaButtonLabel;
app.timers.updateEnigmaLevelUI = updateEnigmaLevelUI;
app.timers.setEnigmaLevel = setEnigmaLevel;
app.timers.updateEnigmaUI = updateEnigmaUI;
app.timers.stopEnigmaTimer = stopEnigmaTimer;
app.timers.startEnigmaTimer = startEnigmaTimer;
app.timers.revealEnigmaAndStart = revealEnigmaAndStart;

app.timers.getSpeedTimerSeconds = getSpeedTimerSeconds;
app.timers.updateSpeedLevelUI = updateSpeedLevelUI;
app.timers.setSpeedLevel = setSpeedLevel;
app.timers.updateSpeedUI = updateSpeedUI;
app.timers.stopSpeedTimer = stopSpeedTimer;
app.timers.startSpeedTimer = startSpeedTimer;
app.timers.syncSpeedTimer = syncSpeedTimer;
