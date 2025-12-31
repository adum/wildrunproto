import { app } from "./context.js";

var DEFAULT_CONFIG = {
  levels: {
    ghost: { min: 1, max: 10 },
    mystery: { min: 1, max: 10 },
    enigma: { min: 1, max: 10 },
    infection: { min: 1, max: 4 },
    speed: { min: 1, max: 10 },
    fire: { min: 1, max: 10 },
    timeExtend: { min: 1, max: 10 },
    hintMultipleChoice: { min: 1, max: 3 },
    hintRow: { min: 1, max: 3 },
    hintCol: { min: 1, max: 3 },
    hintDiag: { min: 1, max: 3 },
    eliminateRandom: { min: 1, max: 3 },
  },
  timers: {
    mystery: { baseSeconds: 30, decrementPerLevel: 5, minSeconds: 5 },
    enigma: { baseSeconds: 30, decrementPerLevel: 5, minSeconds: 5 },
    speed: { baseSeconds: 30, decrementPerLevel: 5, minSeconds: 2 },
  },
  mystery: { baseStones: 1, incrementPerLevel: 1, minStones: 1 },
  enigma: { baseRings: 1, incrementPerLevel: 1, minRings: 1 },
  passives: {
    timeExtendPercentPerLevel: 10,
  },
  ghost: {
    flashSeconds: 5,
    flashDecrementPerLevel: 1,
    flashMinSeconds: 0.5,
    revealSeconds: 2,
    revealDecrementPerLevel: 1,
    revealMinSeconds: 0,
  },
  fireSnake: {
    speed: 5,
    baseLength: 4,
    lengthPerLevel: 2,
  },
  hints: {
    multipleChoice: {
      baseOptions: 4,
      decrementPerLevel: 1,
      minOptions: 2,
    },
    rowBand: { baseWidth: 3, decrementPerLevel: 1, minWidth: 1 },
    colBand: { baseWidth: 3, decrementPerLevel: 1, minWidth: 1 },
    diagBand: { baseWidth: 3, decrementPerLevel: 1, minWidth: 1 },
    eliminateRandom: {
      baseDecoys: 2,
      decrementPerLevel: 1,
      minDecoys: 0,
      minIfNoWrong: 1,
    },
  },
};

if (!app.config) {
  app.config = {};
}
if (!app.configUtils) {
  app.configUtils = {};
}

function isPlainObject(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

function mergeConfig(target, source) {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return target;
  }
  Object.keys(source).forEach(function (key) {
    var value = source[key];
    if (isPlainObject(value)) {
      if (!isPlainObject(target[key])) {
        target[key] = {};
      }
      mergeConfig(target[key], value);
    } else {
      target[key] = value;
    }
  });
  return target;
}

function getNumber(value, fallback) {
  var num = Number(value);
  if (Number.isFinite(num)) {
    return num;
  }
  return fallback;
}

function getDefaultLevelBounds(levelKey) {
  var levels = DEFAULT_CONFIG.levels || {};
  var entry = levels[levelKey] || {};
  return {
    min: getNumber(entry.min, 1),
    max: getNumber(entry.max, 1),
  };
}

function getLevelBounds(levelKey, fallbackMin, fallbackMax) {
  var levels = app.config && app.config.levels ? app.config.levels[levelKey] : null;
  var min = getNumber(levels && levels.min, fallbackMin);
  var max = getNumber(levels && levels.max, fallbackMax);
  if (!Number.isFinite(min)) {
    min = 1;
  }
  if (!Number.isFinite(max)) {
    max = min;
  }
  if (max < min) {
    max = min;
  }
  return { min: min, max: max };
}

function clampLevel(levelKey, level, fallbackMin, fallbackMax) {
  var bounds = getLevelBounds(levelKey, fallbackMin, fallbackMax);
  var value = Number(level);
  if (!Number.isFinite(value)) {
    value = bounds.min;
  }
  if (value < bounds.min) {
    return bounds.min;
  }
  if (value > bounds.max) {
    return bounds.max;
  }
  return value;
}

function applyLevelRange(input, levelKey) {
  if (!input) {
    return null;
  }
  var defaults = getDefaultLevelBounds(levelKey);
  var bounds = getLevelBounds(levelKey, defaults.min, defaults.max);
  input.min = String(bounds.min);
  input.max = String(bounds.max);
  var current = Number(input.value);
  if (!Number.isFinite(current)) {
    input.value = String(bounds.min);
  } else if (current < bounds.min) {
    input.value = String(bounds.min);
  } else if (current > bounds.max) {
    input.value = String(bounds.max);
  }
  return bounds;
}

function applyConfigToUI() {
  var elements = app.elements;
  var state = app.state;

  applyLevelRange(elements.ghostLevelInput, "ghost");
  applyLevelRange(elements.mysteryLevelInput, "mystery");
  applyLevelRange(elements.enigmaLevelInput, "enigma");
  applyLevelRange(elements.infectionLevelInput, "infection");
  applyLevelRange(elements.speedLevelInput, "speed");
  applyLevelRange(elements.fireLevelInput, "fire");
  applyLevelRange(elements.timeExtendLevelInput, "timeExtend");
  applyLevelRange(elements.hintTwoLevelInput, "hintMultipleChoice");
  applyLevelRange(elements.hintRowLevelInput, "hintRow");
  applyLevelRange(elements.hintColLevelInput, "hintCol");
  applyLevelRange(elements.hintDiagLevelInput, "hintDiag");
  applyLevelRange(elements.elimRandomLevelInput, "eliminateRandom");

  if (app.ghost && app.ghost.setGhostLevel) {
    var ghostValue = elements.ghostLevelInput
      ? elements.ghostLevelInput.value
      : state.ghostLevel;
    app.ghost.setGhostLevel(ghostValue);
  } else if (app.ghost && app.ghost.updateGhostLevelUI) {
    app.ghost.updateGhostLevelUI();
  }

  if (app.timers && app.timers.setMysteryLevel) {
    var mysteryValue = elements.mysteryLevelInput
      ? elements.mysteryLevelInput.value
      : state.mysteryLevel;
    app.timers.setMysteryLevel(mysteryValue);
  } else if (app.timers && app.timers.updateMysteryLevelUI) {
    app.timers.updateMysteryLevelUI();
  }

  if (app.timers && app.timers.setEnigmaLevel) {
    var enigmaValue = elements.enigmaLevelInput
      ? elements.enigmaLevelInput.value
      : state.enigmaLevel;
    app.timers.setEnigmaLevel(enigmaValue);
  } else if (app.timers && app.timers.updateEnigmaLevelUI) {
    app.timers.updateEnigmaLevelUI();
  }

  if (app.challenges && app.challenges.setInfectionLevel) {
    var infectionValue = elements.infectionLevelInput
      ? elements.infectionLevelInput.value
      : state.infectionLevel;
    app.challenges.setInfectionLevel(infectionValue);
  } else if (app.challenges && app.challenges.updateInfectionLevelUI) {
    app.challenges.updateInfectionLevelUI();
  }

  if (app.timers && app.timers.setSpeedLevel) {
    var speedValue = elements.speedLevelInput
      ? elements.speedLevelInput.value
      : state.speedLevel;
    app.timers.setSpeedLevel(speedValue);
  } else if (app.timers && app.timers.updateSpeedLevelUI) {
    app.timers.updateSpeedLevelUI();
  }

  if (app.fire && app.fire.setFireLevel) {
    var fireValue = elements.fireLevelInput
      ? elements.fireLevelInput.value
      : state.fireLevel;
    app.fire.setFireLevel(fireValue);
  } else if (app.fire && app.fire.updateFireLevelUI) {
    app.fire.updateFireLevelUI();
  }

  if (app.passives && app.passives.setTimeExtendLevel) {
    var timeExtendValue = elements.timeExtendLevelInput
      ? elements.timeExtendLevelInput.value
      : state.timeExtendLevel;
    app.passives.setTimeExtendLevel(timeExtendValue);
  } else if (app.passives && app.passives.updateTimeExtendLevelUI) {
    app.passives.updateTimeExtendLevelUI();
  }

  if (app.hints && app.hints.setRowRevealLevel) {
    var rowValue = elements.hintRowLevelInput
      ? elements.hintRowLevelInput.value
      : state.hintRowLevel;
    app.hints.setRowRevealLevel(rowValue);
  }
  if (app.hints && app.hints.setColumnRevealLevel) {
    var colValue = elements.hintColLevelInput
      ? elements.hintColLevelInput.value
      : state.hintColLevel;
    app.hints.setColumnRevealLevel(colValue);
  }
  if (app.hints && app.hints.setDiagonalRevealLevel) {
    var diagValue = elements.hintDiagLevelInput
      ? elements.hintDiagLevelInput.value
      : state.hintDiagLevel;
    app.hints.setDiagonalRevealLevel(diagValue);
  }
  if (app.hints && app.hints.setMultipleChoiceLevel) {
    var multipleValue = elements.hintTwoLevelInput
      ? elements.hintTwoLevelInput.value
      : state.hintTwoLevel;
    app.hints.setMultipleChoiceLevel(multipleValue);
  }
  if (app.hints && app.hints.setElimRandomLevel) {
    var elimValue = elements.elimRandomLevelInput
      ? elements.elimRandomLevelInput.value
      : state.elimRandomLevel;
    app.hints.setElimRandomLevel(elimValue);
  }
}

function loadConfig() {
  mergeConfig(app.config, DEFAULT_CONFIG);
  var url = new URL("./config.json", import.meta.url);
  return fetch(url, { cache: "no-store" })
    .then(function (response) {
      if (!response || !response.ok) {
        return null;
      }
      return response.json();
    })
    .then(function (data) {
      if (data && typeof data === "object") {
        mergeConfig(app.config, data);
      }
      return app.config;
    })
    .catch(function () {
      return app.config;
    });
}

app.configUtils.getLevelBounds = getLevelBounds;
app.configUtils.clampLevel = clampLevel;
app.configUtils.applyConfigToUI = applyConfigToUI;
app.configUtils.loadConfig = loadConfig;

app.configReady = loadConfig();
