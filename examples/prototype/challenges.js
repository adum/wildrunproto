import { app } from "./context.js";

var state = app.state;
var refs = app.refs;
var elements = app.elements;
var configUtils = app.configUtils;

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

function recordGrayStone(i, j) {
  if (!state.challengeGray) {
    return;
  }
  if (i < 0 || j < 0) {
    return;
  }
  state.grayStones.add(i + "," + j);
}

function getInfectionCounts(level) {
  var safeLevel = clampLevel("infection", level, 1, 4);
  var playerCount = safeLevel >= 3 ? 2 : 1;
  var opponentCount = 0;
  if (safeLevel >= 2) {
    opponentCount = safeLevel >= 4 ? 2 : 1;
  }
  return { player: playerCount, opponent: opponentCount };
}

function recordInfection(i, j, isPlayerMove) {
  if (!state.challengeInfection) {
    return;
  }
  if (i < 0 || j < 0) {
    return;
  }
  var counts = getInfectionCounts(state.infectionLevel);
  var count = isPlayerMove ? counts.player : counts.opponent;
  if (count <= 0) {
    return;
  }
  var size =
    (refs.board && refs.board.options && refs.board.options.boardSize) ||
    (state.currentMat ? state.currentMat.length : 0);
  if (!size) {
    return;
  }
  var neighbors = [];
  if (i > 0) {
    neighbors.push({ i: i - 1, j: j });
  }
  if (i < size - 1) {
    neighbors.push({ i: i + 1, j: j });
  }
  if (j > 0) {
    neighbors.push({ i: i, j: j - 1 });
  }
  if (j < size - 1) {
    neighbors.push({ i: i, j: j + 1 });
  }
  if (neighbors.length === 0) {
    return;
  }
  for (var k = neighbors.length - 1; k > 0; k -= 1) {
    var swap = Math.floor(Math.random() * (k + 1));
    var temp = neighbors[k];
    neighbors[k] = neighbors[swap];
    neighbors[swap] = temp;
  }
  var added = 0;
  for (var n = 0; n < neighbors.length && added < count; n += 1) {
    var key = neighbors[n].i + "," + neighbors[n].j;
    if (!state.infectionPoints.has(key)) {
      state.infectionPoints.add(key);
      added += 1;
    }
  }
}

function setGrayPlay(active) {
  state.challengeGray = active;
  state.grayStones = new Set();
  updateChallengeControls();
  app.overlays.renderGrayStones(state.currentMat);
}

function setGhostPlay(active) {
  state.challengeGhost = active;
  state.ghostStones = new Set();
  state.ghostFlashes = [];
  state.ghostRevealUntil = 0;
  if (refs.ghostAnimId) {
    cancelAnimationFrame(refs.ghostAnimId);
    refs.ghostAnimId = null;
  }
  app.ghost.clearGhostCanvas();
  updateChallengeControls();
}

function setMysteryPlay(active) {
  state.challengeMystery = active;
  state.mysteryStoneKeys = [];
  state.mysteryRevealed = false;
  app.timers.stopMysteryTimer(false);
  if (active) {
    app.timers.ensureMysteryStones(state.currentMat);
  }
  updateChallengeControls();
  app.timers.updateMysteryLevelUI();
  app.timers.updateMysteryUI();
  app.overlays.renderGrayStones(state.currentMat);
}

function setEnigmaPlay(active) {
  state.challengeEnigma = active;
  state.enigmaPoints = [];
  state.enigmaRevealed = false;
  app.timers.stopEnigmaTimer(false);
  if (active) {
    app.overlays.ensureEnigmaPoints(state.currentMat);
  }
  updateChallengeControls();
  app.timers.updateEnigmaLevelUI();
  app.timers.updateEnigmaUI();
  app.overlays.renderEnigmaOverlay();
}

function updateInfectionLevelUI() {
  if (elements.infectionLevelInput) {
    elements.infectionLevelInput.value = String(state.infectionLevel);
  }
  if (elements.infectionLevelValue) {
    elements.infectionLevelValue.textContent = String(state.infectionLevel);
  }
}

function setInfectionLevel(level) {
  var nextLevel = clampLevel("infection", level, 1, 4);
  state.infectionLevel = nextLevel;
  updateInfectionLevelUI();
}

function setInfectionPlay(active) {
  state.challengeInfection = active;
  state.infectionPoints = new Set();
  updateChallengeControls();
  updateInfectionLevelUI();
  app.overlays.renderEnigmaOverlay();
}

function setSpeedPlay(active) {
  state.challengeSpeed = active;
  state.speedMoveCount = 0;
  app.timers.stopSpeedTimer(false);
  updateChallengeControls();
  app.timers.updateSpeedLevelUI();
  app.timers.updateSpeedUI();
}

function setFirePlay(active) {
  state.challengeFire = active;
  state.fireStartAt = active ? performance.now() : 0;
  state.firePath = [];
  state.firePathSize = 0;
  state.firePathKey = "";
  updateChallengeControls();
  app.fire.updateFireLevelUI();
  if (active) {
    app.fire.startFireAnimation();
  } else {
    app.fire.stopFireAnimation();
  }
}

function setFrostPlay(active) {
  state.challengeFrost = active;
  state.frostStartAt = active ? performance.now() : 0;
  state.frostPath = [];
  state.frostPathSize = 0;
  state.frostPathKey = "";
  updateChallengeControls();
  app.frost.updateFrostLevelUI();
  if (active) {
    app.frost.startFrostAnimation();
  } else {
    app.frost.stopFrostAnimation();
  }
}

function updateChallengeControls() {
  if (elements.challengeGrayBtn) {
    if (state.challengeGray) {
      elements.challengeGrayBtn.classList.add("active");
      elements.challengeGrayBtn.disabled = true;
    } else {
      elements.challengeGrayBtn.classList.remove("active");
      elements.challengeGrayBtn.disabled = false;
    }
  }
  if (elements.challengeGhostBtn) {
    if (state.challengeGhost) {
      elements.challengeGhostBtn.classList.add("active");
      elements.challengeGhostBtn.disabled = true;
    } else {
      elements.challengeGhostBtn.classList.remove("active");
      elements.challengeGhostBtn.disabled = false;
    }
  }
  if (elements.challengeMysteryBtn) {
    if (state.challengeMystery) {
      elements.challengeMysteryBtn.classList.add("active");
      elements.challengeMysteryBtn.disabled = true;
    } else {
      elements.challengeMysteryBtn.classList.remove("active");
      elements.challengeMysteryBtn.disabled = false;
    }
  }
  if (elements.challengeEnigmaBtn) {
    if (state.challengeEnigma) {
      elements.challengeEnigmaBtn.classList.add("active");
      elements.challengeEnigmaBtn.disabled = true;
    } else {
      elements.challengeEnigmaBtn.classList.remove("active");
      elements.challengeEnigmaBtn.disabled = false;
    }
  }
  if (elements.challengeInfectionBtn) {
    if (state.challengeInfection) {
      elements.challengeInfectionBtn.classList.add("active");
      elements.challengeInfectionBtn.disabled = true;
    } else {
      elements.challengeInfectionBtn.classList.remove("active");
      elements.challengeInfectionBtn.disabled = false;
    }
  }
  if (elements.challengeSpeedBtn) {
    if (state.challengeSpeed) {
      elements.challengeSpeedBtn.classList.add("active");
      elements.challengeSpeedBtn.disabled = true;
    } else {
      elements.challengeSpeedBtn.classList.remove("active");
      elements.challengeSpeedBtn.disabled = false;
    }
  }
  if (elements.challengeFireBtn) {
    if (state.challengeFire) {
      elements.challengeFireBtn.classList.add("active");
      elements.challengeFireBtn.disabled = true;
    } else {
      elements.challengeFireBtn.classList.remove("active");
      elements.challengeFireBtn.disabled = false;
    }
  }
  if (elements.challengeFrostBtn) {
    if (state.challengeFrost) {
      elements.challengeFrostBtn.classList.add("active");
      elements.challengeFrostBtn.disabled = true;
    } else {
      elements.challengeFrostBtn.classList.remove("active");
      elements.challengeFrostBtn.disabled = false;
    }
  }
}

function resetChallenges() {
  state.challengeGray = false;
  state.grayStones = new Set();
  state.challengeGhost = false;
  state.ghostStones = new Set();
  state.ghostFlashes = [];
  state.ghostRevealUntil = 0;
  state.challengeMystery = false;
  state.mysteryStoneKeys = [];
  state.mysteryRevealed = false;
  app.timers.stopMysteryTimer(false);
  state.challengeEnigma = false;
  state.enigmaPoints = [];
  state.enigmaRevealed = false;
  app.timers.stopEnigmaTimer(false);
  state.challengeInfection = false;
  state.infectionPoints = new Set();
  state.challengeSpeed = false;
  state.speedMoveCount = 0;
  app.timers.stopSpeedTimer(false);
  state.challengeFire = false;
  state.fireStartAt = 0;
  state.firePath = [];
  state.firePathSize = 0;
  state.firePathKey = "";
  app.fire.stopFireAnimation();
  state.challengeFrost = false;
  state.frostStartAt = 0;
  state.frostPath = [];
  state.frostPathSize = 0;
  state.frostPathKey = "";
  app.frost.stopFrostAnimation();
  if (refs.ghostAnimId) {
    cancelAnimationFrame(refs.ghostAnimId);
    refs.ghostAnimId = null;
  }
  app.ghost.clearGhostCanvas();
  updateChallengeControls();
  app.timers.updateMysteryUI();
  app.timers.updateEnigmaUI();
  app.timers.updateSpeedUI();
  app.overlays.renderGrayStones(state.currentMat);
  app.overlays.renderEnigmaOverlay();
}

app.challenges.recordGrayStone = recordGrayStone;
app.challenges.recordInfection = recordInfection;
app.challenges.setGrayPlay = setGrayPlay;
app.challenges.setGhostPlay = setGhostPlay;
app.challenges.setMysteryPlay = setMysteryPlay;
app.challenges.setEnigmaPlay = setEnigmaPlay;
app.challenges.setInfectionPlay = setInfectionPlay;
app.challenges.setSpeedPlay = setSpeedPlay;
app.challenges.setFirePlay = setFirePlay;
app.challenges.setFrostPlay = setFrostPlay;
app.challenges.updateChallengeControls = updateChallengeControls;
app.challenges.resetChallenges = resetChallenges;
app.challenges.updateInfectionLevelUI = updateInfectionLevelUI;
app.challenges.setInfectionLevel = setInfectionLevel;
