import { app } from "./context.js";

var GB = app.GB;
var state = app.state;
var refs = app.refs;
var ui = app.ui;
var utils = app.utils;
var passives = app.passives;
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

function getTimerSeconds(timerKey, level, baseFallback, decFallback, minFallback) {
  var timers = app.config && app.config.timers ? app.config.timers : {};
  var config = timers[timerKey] || {};
  var base = getNumber(config.baseSeconds, baseFallback);
  var decrement = getNumber(config.decrementPerLevel, decFallback);
  var minSeconds = getNumber(config.minSeconds, minFallback);
  var safeLevel = clampLevel(timerKey, level, 1, 10);
  var seconds = base - (safeLevel - 1) * decrement;
  if (!Number.isFinite(seconds)) {
    seconds = base;
  }
  return Math.max(minSeconds, seconds);
}

function getTimeExtendMultiplier() {
  if (passives && passives.getTimeExtendMultiplier) {
    return passives.getTimeExtendMultiplier();
  }
  return 1;
}

function applyTimeExtend(seconds) {
  var multiplier = getTimeExtendMultiplier();
  if (multiplier <= 1) {
    return seconds;
  }
  return Math.ceil(seconds * multiplier);
}

function formatTimerValue(seconds) {
  var value = Number(seconds);
  if (!Number.isFinite(value)) {
    return "0";
  }
  if (value <= 0) {
    return "0";
  }
  if (value < 1) {
    var trimmed = Math.floor(value * 100) / 100;
    return trimmed.toFixed(2);
  }
  return String(Math.ceil(value));
}

function getMysteryStoneCount(level) {
  var config = app.config && app.config.mystery ? app.config.mystery : {};
  var base = getNumber(config.baseStones, 1);
  var increment = getNumber(config.incrementPerLevel, 1);
  var minStones = getNumber(config.minStones, 1);
  var safeLevel = clampLevel("mystery", level, 1, 10);
  var count = base + (safeLevel - 1) * increment;
  if (!Number.isFinite(count)) {
    count = base;
  }
  count = Math.max(minStones, count);
  return Math.max(1, Math.round(count));
}

function getMysteryTimerSeconds(level) {
  return getTimerSeconds("mystery", level, 30, 5, 5);
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
  var seconds = applyTimeExtend(getMysteryTimerSeconds(state.mysteryLevel));
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
  var nextLevel = clampLevel("mystery", level, 1, 10);
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
  refs.mysteryTimerEl.textContent = formatTimerValue(seconds);
}

function stopMysteryTimer(expired) {
  if (state.mysteryTimerId) {
    clearInterval(state.mysteryTimerId);
    state.mysteryTimerId = null;
  }
  state.mysteryTimerActive = false;
  state.mysteryTimerEndsAt = 0;
  if (expired && app.effects && app.effects.triggerTimerShatter) {
    app.effects.triggerTimerShatter(refs.mysteryTimerEl);
  }
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
  var seconds = Math.max(0, remaining / 1000);
  updateMysteryTimerDisplay(seconds);
  if (remaining <= 0) {
    stopMysteryTimer(true);
  }
}

function startMysteryTimer() {
  if (state.mysteryTimerActive) {
    stopMysteryTimer(false);
  }
  var duration = applyTimeExtend(getMysteryTimerSeconds(state.mysteryLevel));
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
  var config = app.config && app.config.enigma ? app.config.enigma : {};
  var base = getNumber(config.baseRings, 1);
  var increment = getNumber(config.incrementPerLevel, 1);
  var minRings = getNumber(config.minRings, 1);
  var safeLevel = clampLevel("enigma", level, 1, 10);
  var count = base + (safeLevel - 1) * increment;
  if (!Number.isFinite(count)) {
    count = base;
  }
  count = Math.max(minRings, count);
  return Math.max(1, Math.round(count));
}

function getEnigmaTimerSeconds(level) {
  return getTimerSeconds("enigma", level, 30, 5, 5);
}

function updateEnigmaButtonLabel() {
  if (!refs.enigmaBtn) {
    return;
  }
  var seconds = applyTimeExtend(getEnigmaTimerSeconds(state.enigmaLevel));
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
  var nextLevel = clampLevel("enigma", level, 1, 10);
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
  refs.enigmaTimerEl.textContent = formatTimerValue(seconds);
}

function stopEnigmaTimer(expired) {
  if (state.enigmaTimerId) {
    clearInterval(state.enigmaTimerId);
    state.enigmaTimerId = null;
  }
  state.enigmaTimerActive = false;
  state.enigmaTimerEndsAt = 0;
  if (expired && app.effects && app.effects.triggerTimerShatter) {
    app.effects.triggerTimerShatter(refs.enigmaTimerEl);
  }
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
  var seconds = Math.max(0, remaining / 1000);
  updateEnigmaTimerDisplay(seconds);
  if (remaining <= 0) {
    stopEnigmaTimer(true);
  }
}

function startEnigmaTimer() {
  if (state.enigmaTimerActive) {
    stopEnigmaTimer(false);
  }
  var duration = applyTimeExtend(getEnigmaTimerSeconds(state.enigmaLevel));
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
  return getTimerSeconds("speed", level, 30, 5, 2);
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
  var nextLevel = clampLevel("speed", level, 1, 10);
  state.speedLevel = nextLevel;
  updateSpeedLevelUI();
}

function updateSpeedTimerDisplay(seconds) {
  if (!refs.speedTimerEl) {
    return;
  }
  refs.speedTimerEl.textContent = formatTimerValue(seconds);
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
  if (expired && app.effects && app.effects.triggerTimerShatter) {
    app.effects.triggerTimerShatter(refs.speedTimerEl);
  }
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
  var seconds = Math.max(0, remaining / 1000);
  updateSpeedTimerDisplay(seconds);
  if (remaining <= 0) {
    stopSpeedTimer(true);
  }
}

function startSpeedTimer() {
  if (state.speedTimerActive) {
    stopSpeedTimer(false);
  }
  var duration = applyTimeExtend(getSpeedTimerSeconds(state.speedLevel));
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
app.timers.formatTimerValue = formatTimerValue;
