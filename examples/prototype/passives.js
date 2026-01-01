import { app } from "./context.js";

var GB = app.GB;
var state = app.state;
var elements = app.elements;
var refs = app.refs;
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

function updateTimeExtendLevelUI() {
  if (elements.timeExtendLevelInput) {
    elements.timeExtendLevelInput.value = String(state.timeExtendLevel);
  }
  if (elements.timeExtendLevelValue) {
    elements.timeExtendLevelValue.textContent = String(state.timeExtendLevel);
  }
  if (app.timers && app.timers.updateMysteryButtonLabel) {
    app.timers.updateMysteryButtonLabel();
  }
  if (app.timers && app.timers.updateEnigmaButtonLabel) {
    app.timers.updateEnigmaButtonLabel();
  }
  if (app.timers && app.timers.updateSpeedUI) {
    app.timers.updateSpeedUI();
  }
}

function setTimeExtendLevel(level) {
  var nextLevel = clampLevel("timeExtend", level, 1, 10);
  state.timeExtendLevel = nextLevel;
  updateTimeExtendLevelUI();
}

function updateSecondChanceLevelUI() {
  if (elements.secondChanceLevelInput) {
    elements.secondChanceLevelInput.value = String(state.secondChanceLevel);
  }
  if (elements.secondChanceLevelValue) {
    elements.secondChanceLevelValue.textContent = String(state.secondChanceLevel);
  }
}

function setSecondChanceLevel(level) {
  var nextLevel = clampLevel("secondChance", level, 1, 10);
  state.secondChanceLevel = nextLevel;
  updateSecondChanceLevelUI();
}

function getTimeExtendMultiplier() {
  if (!state.passiveTimeExtend) {
    return 1;
  }
  var config = app.config && app.config.passives ? app.config.passives : {};
  var percentPerLevel = getNumber(config.timeExtendPercentPerLevel, 10);
  var safeLevel = clampLevel("timeExtend", state.timeExtendLevel, 1, 10);
  return 1 + safeLevel * (percentPerLevel / 100);
}

function getSecondChanceSeconds(level) {
  var config = app.config && app.config.passives ? app.config.passives : {};
  var secondsConfig = config.secondChance || {};
  var base = getNumber(secondsConfig.baseSeconds, 2);
  var increment = getNumber(secondsConfig.incrementPerLevel, 1);
  var minSeconds = getNumber(secondsConfig.minSeconds, 1);
  var safeLevel = clampLevel("secondChance", level, 1, 10);
  var seconds = base + (safeLevel - 1) * increment;
  if (!Number.isFinite(seconds)) {
    seconds = base;
  }
  return Math.max(minSeconds, seconds);
}

function updateSecondChanceTimerDisplay(seconds) {
  if (!refs.secondChanceTimerEl) {
    return;
  }
  if (app.timers && app.timers.formatTimerValue) {
    refs.secondChanceTimerEl.textContent = app.timers.formatTimerValue(seconds);
    return;
  }
  var value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) {
    refs.secondChanceTimerEl.textContent = "0";
    return;
  }
  if (value < 1) {
    var trimmed = Math.floor(value * 100) / 100;
    refs.secondChanceTimerEl.textContent = trimmed.toFixed(2);
    return;
  }
  refs.secondChanceTimerEl.textContent = String(Math.ceil(value));
}

function updateSecondChanceUI() {
  if (!refs.secondChanceTimerEl) {
    return;
  }
  if (state.secondChanceActive) {
    refs.secondChanceTimerEl.style.display = "block";
  } else {
    refs.secondChanceTimerEl.style.display = "none";
  }
}

function updatePassiveControls() {
  if (elements.passiveTimeExtendBtn) {
    if (state.passiveTimeExtend) {
      elements.passiveTimeExtendBtn.classList.add("active");
      elements.passiveTimeExtendBtn.disabled = true;
    } else {
      elements.passiveTimeExtendBtn.classList.remove("active");
      elements.passiveTimeExtendBtn.disabled = false;
    }
  }
  if (elements.passiveSecondChanceBtn) {
    if (state.passiveSecondChance) {
      elements.passiveSecondChanceBtn.classList.add("active");
      elements.passiveSecondChanceBtn.disabled = true;
    } else {
      elements.passiveSecondChanceBtn.classList.remove("active");
      elements.passiveSecondChanceBtn.disabled = false;
    }
  }
}

function setTimeExtendActive(active) {
  state.passiveTimeExtend = active;
  updatePassiveControls();
  updateTimeExtendLevelUI();
  updateCaptureIndicators();
}

function setSecondChanceActive(active) {
  state.passiveSecondChance = active;
  updatePassiveControls();
  updateSecondChanceLevelUI();
}

function clearSecondChanceTimer() {
  if (state.secondChanceTimerId) {
    clearInterval(state.secondChanceTimerId);
    state.secondChanceTimerId = null;
  }
  state.secondChanceActive = false;
  state.secondChanceEndsAt = 0;
  updateSecondChanceUI();
}

function startSecondChance(onExpire) {
  if (
    !state.passiveSecondChance ||
    state.secondChanceUsed ||
    state.secondChanceActive
  ) {
    return null;
  }
  state.secondChanceUsed = true;
  clearSecondChanceTimer();
  state.secondChanceActive = true;
  var duration = getSecondChanceSeconds(state.secondChanceLevel);
  state.secondChanceEndsAt = performance.now() + duration * 1000;
  updateSecondChanceTimerDisplay(duration);
  updateSecondChanceUI();
  state.secondChanceTimerId = setInterval(function () {
    var remaining = state.secondChanceEndsAt - performance.now();
    var seconds = Math.max(0, remaining / 1000);
    updateSecondChanceTimerDisplay(seconds);
    if (remaining <= 0) {
      clearSecondChanceTimer();
      if (typeof onExpire === "function") {
        onExpire();
      }
    }
  }, 100);
  return duration;
}

function updateCaptureIndicators() {
  var hasFriendlyEl = !!elements.friendlyCaptureIndicator;
  var hasEnemyEl = !!elements.enemyCaptureIndicator;
  if (!state.rootNode) {
    state.friendlyCaptureDetected = false;
    state.enemyCaptureDetected = false;
    if (hasFriendlyEl) {
      elements.friendlyCaptureIndicator.classList.remove("is-active");
    }
    if (hasEnemyEl) {
      elements.enemyCaptureIndicator.classList.remove("is-active");
    }
    return;
  }

  var size = GB.extractBoardSize(state.rootNode, 19);
  var playerColor = state.playerColor;
  var enemyColor = playerColor === GB.Ki.Black ? GB.Ki.White : GB.Ki.Black;
  var cache = new Map();
  var friendlyFound = false;
  var enemyFound = false;

  function getMat(node) {
    if (!node) {
      return null;
    }
    var id = node.model && node.model.id ? node.model.id : null;
    if (id && cache.has(id)) {
      return cache.get(id);
    }
    var mat = GB.calcMatAndMarkup(node, size).mat;
    if (id) {
      cache.set(id, mat);
    }
    return mat;
  }

  function inspectCapture(parentMat, mat) {
    if (!parentMat || !mat) {
      return;
    }
    for (var i = 0; i < parentMat.length; i += 1) {
      var row = parentMat[i];
      var nextRow = mat[i];
      if (!row || !nextRow) {
        continue;
      }
      for (var j = 0; j < row.length; j += 1) {
        if (!friendlyFound && row[j] === playerColor && nextRow[j] !== playerColor) {
          friendlyFound = true;
        }
        if (!enemyFound && row[j] === enemyColor && nextRow[j] !== enemyColor) {
          enemyFound = true;
        }
        if (friendlyFound && enemyFound) {
          return;
        }
      }
    }
  }

  function walk(node) {
    if (!node || (friendlyFound && enemyFound)) {
      return;
    }
    if (node.parent && GB.inRightPath(node)) {
      var parentMat = getMat(node.parent);
      var mat = getMat(node);
      inspectCapture(parentMat, mat);
      if (friendlyFound && enemyFound) {
        return;
      }
    }
    if (node.children && node.children.length > 0) {
      node.children.forEach(walk);
    }
  }

  walk(state.rootNode);
  state.friendlyCaptureDetected = friendlyFound;
  state.enemyCaptureDetected = enemyFound;
  if (hasFriendlyEl) {
    if (friendlyFound) {
      elements.friendlyCaptureIndicator.classList.add("is-active");
      elements.friendlyCaptureIndicator.setAttribute(
        "aria-label",
        "Friendly capture detected"
      );
    } else {
      elements.friendlyCaptureIndicator.classList.remove("is-active");
      elements.friendlyCaptureIndicator.setAttribute(
        "aria-label",
        "No friendly capture detected"
      );
    }
  }
  if (hasEnemyEl) {
    if (enemyFound) {
      elements.enemyCaptureIndicator.classList.add("is-active");
      elements.enemyCaptureIndicator.setAttribute(
        "aria-label",
        "Enemy capture detected"
      );
    } else {
      elements.enemyCaptureIndicator.classList.remove("is-active");
      elements.enemyCaptureIndicator.setAttribute(
        "aria-label",
        "No enemy capture detected"
      );
    }
  }
}

function resetPassives() {
  state.passiveTimeExtend = false;
  state.passiveSecondChance = false;
  state.secondChanceUsed = false;
  clearSecondChanceTimer();
  updatePassiveControls();
  updateTimeExtendLevelUI();
  updateSecondChanceLevelUI();
  updateSecondChanceUI();
  updateCaptureIndicators();
}

app.passives.updateTimeExtendLevelUI = updateTimeExtendLevelUI;
app.passives.setTimeExtendLevel = setTimeExtendLevel;
app.passives.getTimeExtendMultiplier = getTimeExtendMultiplier;
app.passives.updatePassiveControls = updatePassiveControls;
app.passives.setTimeExtendActive = setTimeExtendActive;
app.passives.resetPassives = resetPassives;
app.passives.updateCaptureIndicators = updateCaptureIndicators;
app.passives.updateSecondChanceLevelUI = updateSecondChanceLevelUI;
app.passives.setSecondChanceLevel = setSecondChanceLevel;
app.passives.setSecondChanceActive = setSecondChanceActive;
app.passives.getSecondChanceSeconds = getSecondChanceSeconds;
app.passives.startSecondChance = startSecondChance;
app.passives.clearSecondChanceTimer = clearSecondChanceTimer;
app.passives.updateSecondChanceUI = updateSecondChanceUI;
