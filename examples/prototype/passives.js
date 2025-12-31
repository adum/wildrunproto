import { app } from "./context.js";

var GB = app.GB;
var state = app.state;
var elements = app.elements;

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
  var nextLevel = Math.max(1, Math.min(10, Number(level) || 1));
  state.timeExtendLevel = nextLevel;
  updateTimeExtendLevelUI();
}

function getTimeExtendMultiplier() {
  if (!state.passiveTimeExtend) {
    return 1;
  }
  var safeLevel = Math.max(1, Number(state.timeExtendLevel) || 1);
  return 1 + safeLevel * 0.1;
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
}

function setTimeExtendActive(active) {
  state.passiveTimeExtend = active;
  updatePassiveControls();
  updateTimeExtendLevelUI();
  updateCaptureIndicators();
}

function updateCaptureIndicators() {
  if (!elements.friendlyCaptureIndicator && !elements.enemyCaptureIndicator) {
    return;
  }
  if (!state.rootNode) {
    state.friendlyCaptureDetected = false;
    state.enemyCaptureDetected = false;
    if (elements.friendlyCaptureIndicator) {
      elements.friendlyCaptureIndicator.classList.remove("is-active");
    }
    if (elements.enemyCaptureIndicator) {
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
  if (elements.friendlyCaptureIndicator) {
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
  if (elements.enemyCaptureIndicator) {
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
  updatePassiveControls();
  updateTimeExtendLevelUI();
  updateCaptureIndicators();
}

app.passives.updateTimeExtendLevelUI = updateTimeExtendLevelUI;
app.passives.setTimeExtendLevel = setTimeExtendLevel;
app.passives.getTimeExtendMultiplier = getTimeExtendMultiplier;
app.passives.updatePassiveControls = updatePassiveControls;
app.passives.setTimeExtendActive = setTimeExtendActive;
app.passives.resetPassives = resetPassives;
app.passives.updateCaptureIndicators = updateCaptureIndicators;
