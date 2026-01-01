import { app } from "./context.js";
import "./config.js";
import "./ghost.js";
import "./fire.js";
import "./frost.js";
import "./passives.js";
import "./overlays.js";
import "./timers.js";
import "./challenges.js";
import "./hints.js";
import "./board.js";

if (!app.GB) {
  throw new Error("ghostban library not found.");
}

var elements = app.elements;
var state = app.state;

app.handlers.onTimerExpired = function () {
  app.board.evaluatePosition();
};

if (elements.mount) {
  elements.mount.addEventListener("click", function (event) {
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

if (elements.sgfSelect) {
  elements.sgfSelect.addEventListener("change", function (event) {
    app.board.loadSgf(event.target.value);
  });
}

if (elements.hintOneBtn) {
  elements.hintOneBtn.addEventListener("click", app.hints.hintFirstMove);
}
if (elements.hintTwoBtn) {
  elements.hintTwoBtn.addEventListener("click", app.hints.hintTwoMoves);
}
if (elements.hintNeighborBtn) {
  elements.hintNeighborBtn.addEventListener("click", app.hints.hintWaveNeighbor);
}
if (elements.hintRowBtn) {
  elements.hintRowBtn.addEventListener("click", app.hints.hintRowReveal);
}
if (elements.hintColBtn) {
  elements.hintColBtn.addEventListener("click", app.hints.hintColumnReveal);
}
if (elements.hintDiagBtn) {
  elements.hintDiagBtn.addEventListener("click", app.hints.hintDiagonalReveal);
}
if (elements.hintDiagLevelInput) {
  elements.hintDiagLevelInput.addEventListener("input", function (event) {
    if (!event || !event.target) {
      return;
    }
    app.hints.setDiagonalRevealLevel(event.target.value);
  });
}
if (elements.hintTwoLevelInput) {
  elements.hintTwoLevelInput.addEventListener("input", function (event) {
    if (!event || !event.target) {
      return;
    }
    app.hints.setMultipleChoiceLevel(event.target.value);
  });
}
if (elements.hintRowLevelInput) {
  elements.hintRowLevelInput.addEventListener("input", function (event) {
    if (!event || !event.target) {
      return;
    }
    app.hints.setRowRevealLevel(event.target.value);
  });
}
if (elements.hintColLevelInput) {
  elements.hintColLevelInput.addEventListener("input", function (event) {
    if (!event || !event.target) {
      return;
    }
    app.hints.setColumnRevealLevel(event.target.value);
  });
}

if (elements.challengeGrayBtn) {
  elements.challengeGrayBtn.addEventListener("click", function () {
    if (state.challengeGray) {
      return;
    }
    app.challenges.setGrayPlay(true);
    app.ui.logMessage("Challenge enabled: Gray play.");
  });
}

if (elements.challengeGhostBtn) {
  elements.challengeGhostBtn.addEventListener("click", function () {
    if (state.challengeGhost) {
      return;
    }
    app.challenges.setGhostPlay(true);
    app.ui.logMessage("Challenge enabled: Ghost play.");
  });
}

if (elements.ghostLevelInput) {
  elements.ghostLevelInput.addEventListener("input", function (event) {
    if (!event || !event.target) {
      return;
    }
    app.ghost.setGhostLevel(event.target.value);
  });
}

if (elements.challengeMysteryBtn) {
  elements.challengeMysteryBtn.addEventListener("click", function () {
    if (state.challengeMystery) {
      return;
    }
    app.challenges.setMysteryPlay(true);
    app.board.updateBoard();
    app.board.evaluatePosition();
    app.ui.logMessage("Challenge enabled: Mystery timer.");
  });
}

if (elements.challengeEnigmaBtn) {
  elements.challengeEnigmaBtn.addEventListener("click", function () {
    if (state.challengeEnigma) {
      return;
    }
    app.challenges.setEnigmaPlay(true);
    app.board.updateBoard();
    app.board.evaluatePosition();
    app.ui.logMessage("Challenge enabled: Enigma timer.");
  });
}

if (elements.challengeInfectionBtn) {
  elements.challengeInfectionBtn.addEventListener("click", function () {
    if (state.challengeInfection) {
      return;
    }
    app.challenges.setInfectionPlay(true);
    app.board.updateBoard();
    app.ui.logMessage("Challenge enabled: Infection.");
  });
}

if (elements.challengeSpeedBtn) {
  elements.challengeSpeedBtn.addEventListener("click", function () {
    if (state.challengeSpeed) {
      return;
    }
    app.challenges.setSpeedPlay(true);
    app.ui.logMessage("Challenge enabled: Speed play.");
  });
}
if (elements.challengeFireBtn) {
  elements.challengeFireBtn.addEventListener("click", function () {
    if (state.challengeFire) {
      return;
    }
    app.challenges.setFirePlay(true);
    app.ui.logMessage("Challenge enabled: Fire snake.");
  });
}
if (elements.challengeFrostBtn) {
  elements.challengeFrostBtn.addEventListener("click", function () {
    if (state.challengeFrost) {
      return;
    }
    app.challenges.setFrostPlay(true);
    app.ui.logMessage("Challenge enabled: Frost snake.");
  });
}
if (elements.passiveTimeExtendBtn) {
  elements.passiveTimeExtendBtn.addEventListener("click", function () {
    if (state.passiveTimeExtend) {
      return;
    }
    app.passives.setTimeExtendActive(true);
    app.ui.logMessage("Passive enabled: Time extend.");
  });
}
if (elements.passiveSecondChanceBtn) {
  elements.passiveSecondChanceBtn.addEventListener("click", function () {
    if (state.passiveSecondChance) {
      return;
    }
    app.passives.setSecondChanceActive(true);
    app.ui.logMessage("Passive enabled: Second chance.");
  });
}

if (elements.mysteryLevelInput) {
  elements.mysteryLevelInput.addEventListener("input", function (event) {
    if (!event || !event.target) {
      return;
    }
    app.timers.setMysteryLevel(event.target.value);
  });
}

if (elements.enigmaLevelInput) {
  elements.enigmaLevelInput.addEventListener("input", function (event) {
    if (!event || !event.target) {
      return;
    }
    app.timers.setEnigmaLevel(event.target.value);
  });
}

if (elements.infectionLevelInput) {
  elements.infectionLevelInput.addEventListener("input", function (event) {
    if (!event || !event.target) {
      return;
    }
    app.challenges.setInfectionLevel(event.target.value);
  });
}

if (elements.speedLevelInput) {
  elements.speedLevelInput.addEventListener("input", function (event) {
    if (!event || !event.target) {
      return;
    }
    app.timers.setSpeedLevel(event.target.value);
  });
}
if (elements.fireLevelInput) {
  elements.fireLevelInput.addEventListener("input", function (event) {
    if (!event || !event.target) {
      return;
    }
    app.fire.setFireLevel(event.target.value);
  });
}
if (elements.frostLevelInput) {
  elements.frostLevelInput.addEventListener("input", function (event) {
    if (!event || !event.target) {
      return;
    }
    app.frost.setFrostLevel(event.target.value);
  });
}
if (elements.timeExtendLevelInput) {
  elements.timeExtendLevelInput.addEventListener("input", function (event) {
    if (!event || !event.target) {
      return;
    }
    app.passives.setTimeExtendLevel(event.target.value);
  });
}
if (elements.secondChanceLevelInput) {
  elements.secondChanceLevelInput.addEventListener("input", function (event) {
    if (!event || !event.target) {
      return;
    }
    app.passives.setSecondChanceLevel(event.target.value);
  });
}

if (elements.elimRandomLevelInput) {
  elements.elimRandomLevelInput.addEventListener("input", function (event) {
    if (!event || !event.target) {
      return;
    }
    app.hints.setElimRandomLevel(event.target.value);
  });
}

if (elements.elimRandomBtn) {
  elements.elimRandomBtn.addEventListener("click", app.board.eliminateRandomMove);
}

if (elements.clearHintsBtn) {
  elements.clearHintsBtn.addEventListener("click", function () {
    app.hints.clearHints();
    app.board.updateBoard();
  });
}

if (elements.resetPuzzleBtn) {
  elements.resetPuzzleBtn.addEventListener("click", app.board.resetPuzzle);
}

if (elements.resetLivesBtn) {
  elements.resetLivesBtn.addEventListener("click", function () {
    state.lives = 3;
    app.ui.updateHud();
    app.board.evaluatePosition();
    app.ui.logMessage("Lives reset.");
  });
}

document.addEventListener("keydown", function (event) {
  if (event.target && event.target.tagName === "SELECT") {
    return;
  }
  if (event.key === "r" || event.key === "R") {
    app.board.resetPuzzle();
  }
});

window.addEventListener("resize", function () {
  if (state.hintRow !== null) {
    app.hints.positionRowHint();
  }
  if (state.hintCol !== null) {
    app.hints.positionColumnHint();
  }
  if (state.hintDiag) {
    app.hints.positionDiagonalHint();
  }
  app.overlays.renderGrayStones(state.currentMat);
  app.overlays.renderEnigmaOverlay();
  app.fire.startFireAnimation();
  app.frost.startFrostAnimation();
  var revealActive =
    state.ghostRevealUntil > 0 && state.ghostRevealUntil > performance.now();
  if (state.challengeGhost && (state.ghostFlashes.length > 0 || revealActive)) {
    app.ghost.startGhostAnimation();
  } else {
    app.ghost.clearGhostCanvas();
  }
});

app.ui.updateHud();
if (app.configUtils && app.configUtils.applyConfigToUI) {
  app.configUtils.applyConfigToUI();
}
if (app.configReady && app.configReady.then) {
  app.configReady.then(function () {
    if (app.configUtils && app.configUtils.applyConfigToUI) {
      app.configUtils.applyConfigToUI();
    }
  });
}
app.passives.updatePassiveControls();

app.board.loadSgf(state.sgfKey);
