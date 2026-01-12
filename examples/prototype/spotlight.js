import { app } from "./context.js";

var GB = app.GB;
var state = app.state;
var refs = app.refs;
var elements = app.elements;
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

function getSpotlightConfig() {
  return app.config && app.config.spotlight ? app.config.spotlight : {};
}

function getSpotlightSpeed(level) {
  var config = getSpotlightConfig();
  var base = getNumber(config.baseSpeed, 2.5);
  var increment = getNumber(config.speedIncrementPerLevel, 0.4);
  var safeLevel = clampLevel("spotlight", level, 1, 10);
  var speed = base + (safeLevel - 1) * increment;
  if (!Number.isFinite(speed)) {
    speed = base;
  }
  return Math.max(0, speed);
}

function getSpotlightRadius(level) {
  var config = getSpotlightConfig();
  var base = getNumber(config.baseRadius, 2.8);
  var decrement = getNumber(config.radiusDecrementPerLevel, 0.2);
  var minRadius = getNumber(config.minRadius, 1);
  var safeLevel = clampLevel("spotlight", level, 1, 10);
  var radius = base - (safeLevel - 1) * decrement;
  if (!Number.isFinite(radius)) {
    radius = base;
  }
  radius = Math.max(minRadius, radius);
  return Math.max(0, radius);
}

function getSpotlightDarkness(level) {
  var safeLevel = clampLevel("spotlight", level, 1, 10);
  if (safeLevel >= 2) {
    return 1;
  }
  var config = getSpotlightConfig();
  var alpha = getNumber(config.darkness, 0.86);
  if (!Number.isFinite(alpha)) {
    alpha = 0.86;
  }
  return Math.min(1, Math.max(0, alpha));
}

function updateSpotlightLevelUI() {
  if (elements.spotlightLevelInput) {
    elements.spotlightLevelInput.value = String(state.spotlightLevel);
  }
  if (elements.spotlightLevelValue) {
    elements.spotlightLevelValue.textContent = String(state.spotlightLevel);
  }
}

function setSpotlightLevel(level) {
  var nextLevel = clampLevel("spotlight", level, 1, 10);
  state.spotlightLevel = nextLevel;
  updateSpotlightLevelUI();
}

function syncSpotlightCanvas() {
  if (!refs.spotlightCanvas || !refs.board) {
    return;
  }
  var ref = refs.board.canvas || refs.board.cursorCanvas || refs.board.board;
  if (!ref) {
    return;
  }
  var dpr = window.devicePixelRatio || 1;
  refs.spotlightCanvas.width = ref.width;
  refs.spotlightCanvas.height = ref.height;
  refs.spotlightCanvas.style.width = ref.width / dpr + "px";
  refs.spotlightCanvas.style.height = ref.height / dpr + "px";
}

function clearSpotlightCanvas() {
  if (!refs.spotlightCanvas) {
    return;
  }
  var ctx = refs.spotlightCanvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, refs.spotlightCanvas.width, refs.spotlightCanvas.height);
  }
}

function stopSpotlightAnimation() {
  if (refs.spotlightAnimId) {
    cancelAnimationFrame(refs.spotlightAnimId);
    refs.spotlightAnimId = null;
  }
  state.spotlightLastTs = 0;
  clearSpotlightCanvas();
}

function getSpotlightProblemBounds(size) {
  var root = state.rootNode;
  if (!root) {
    return null;
  }
  var rootId = root.model && root.model.id ? root.model.id : "";
  var key = rootId + ":" + size;
  if (state.spotlightProblemBoundsKey === key && state.spotlightProblemBounds) {
    return state.spotlightProblemBounds;
  }
  var minI = Infinity;
  var maxI = -Infinity;
  var minJ = Infinity;
  var maxJ = -Infinity;
  var addCoord = function (coord) {
    if (!coord || coord.length < 2) {
      return;
    }
    var i = GB.SGF_LETTERS.indexOf(coord[0]);
    var j = GB.SGF_LETTERS.indexOf(coord[1]);
    if (i < 0 || j < 0) {
      return;
    }
    if (Number.isFinite(size) && size > 0) {
      if (i >= size || j >= size) {
        return;
      }
    }
    if (i < minI) {
      minI = i;
    }
    if (i > maxI) {
      maxI = i;
    }
    if (j < minJ) {
      minJ = j;
    }
    if (j > maxJ) {
      maxJ = j;
    }
  };
  root.walk(function (node) {
    if (!node || !node.model) {
      return;
    }
    var model = node.model;
    if (Array.isArray(model.moveProps) && model.moveProps.length) {
      model.moveProps.forEach(function (prop) {
        if (prop && prop.value) {
          addCoord(prop.value);
        }
      });
    }
    if (Array.isArray(model.setupProps) && model.setupProps.length) {
      model.setupProps.forEach(function (prop) {
        if (!prop || !prop.values || (prop.token !== "AB" && prop.token !== "AW")) {
          return;
        }
        prop.values.forEach(function (value) {
          addCoord(value);
        });
      });
    }
  });
  var boardMax = Math.max(0, (size || 0) - 1);
  var bounds = null;
  if (!Number.isFinite(minI) || !Number.isFinite(maxI)) {
    bounds = {
      minI: 0,
      maxI: boardMax,
      minJ: 0,
      maxJ: boardMax,
    };
  } else {
    bounds = {
      minI: Math.max(0, minI),
      maxI: Math.max(0, maxI),
      minJ: Math.max(0, minJ),
      maxJ: Math.max(0, maxJ),
    };
  }
  state.spotlightProblemBoundsKey = key;
  state.spotlightProblemBounds = bounds;
  return bounds;
}

function getSpotlightBounds(mat, size) {
  var problemBounds = getSpotlightProblemBounds(size);
  if (problemBounds) {
    return problemBounds;
  }
  var minI = Infinity;
  var maxI = -Infinity;
  var minJ = Infinity;
  var maxJ = -Infinity;
  if (mat && mat.length) {
    var boardSize = mat.length;
    for (var i = 0; i < boardSize; i += 1) {
      if (!mat[i]) {
        continue;
      }
      for (var j = 0; j < boardSize; j += 1) {
        if (mat[i][j] === GB.Ki.Empty) {
          continue;
        }
        if (i < minI) {
          minI = i;
        }
        if (i > maxI) {
          maxI = i;
        }
        if (j < minJ) {
          minJ = j;
        }
        if (j > maxJ) {
          maxJ = j;
        }
      }
    }
  }
  var boardMax = Math.max(0, (size || 0) - 1);
  if (!Number.isFinite(minI) || !Number.isFinite(maxI)) {
    return {
      minI: 0,
      maxI: boardMax,
      minJ: 0,
      maxJ: boardMax,
    };
  }
  return {
    minI: Math.max(0, minI),
    maxI: Math.max(0, maxI),
    minJ: Math.max(0, minJ),
    maxJ: Math.max(0, maxJ),
  };
}

function pickSpotlightVelocity(speed, rangeI, rangeJ) {
  if (!Number.isFinite(speed) || speed <= 0) {
    return { i: 0, j: 0 };
  }
  if (rangeI <= 0 && rangeJ <= 0) {
    return { i: 0, j: 0 };
  }
  if (rangeI <= 0) {
    return { i: 0, j: (Math.random() < 0.5 ? -1 : 1) * speed };
  }
  if (rangeJ <= 0) {
    return { i: (Math.random() < 0.5 ? -1 : 1) * speed, j: 0 };
  }
  var minComponent = speed * 0.35;
  var maxComponentSq = speed * speed - minComponent * minComponent;
  if (!Number.isFinite(maxComponentSq) || maxComponentSq <= 0) {
    var diag = speed / Math.sqrt(2);
    return {
      i: (Math.random() < 0.5 ? -1 : 1) * diag,
      j: (Math.random() < 0.5 ? -1 : 1) * diag,
    };
  }
  var maxComponent = Math.sqrt(maxComponentSq);
  var compI = minComponent + Math.random() * (maxComponent - minComponent);
  var compJ = Math.sqrt(speed * speed - compI * compI);
  return {
    i: (Math.random() < 0.5 ? -1 : 1) * compI,
    j: (Math.random() < 0.5 ? -1 : 1) * compJ,
  };
}

function ensureSpotlightState(bounds, radiusUnits) {
  var key =
    bounds.minI +
    ":" +
    bounds.maxI +
    ":" +
    bounds.minJ +
    ":" +
    bounds.maxJ +
    ":" +
    radiusUnits.toFixed(3);
  if (!state.spotlightPos || !state.spotlightVel || state.spotlightBoundsKey !== key) {
    var minI = bounds.minI;
    var maxI = bounds.maxI;
    var minJ = bounds.minJ;
    var maxJ = bounds.maxJ;
    var centerI =
      Number.isFinite(minI) && Number.isFinite(maxI) ? (minI + maxI) / 2 : 0;
    var centerJ =
      Number.isFinite(minJ) && Number.isFinite(maxJ) ? (minJ + maxJ) / 2 : 0;
    var rangeI = Math.max(0, maxI - minI);
    var rangeJ = Math.max(0, maxJ - minJ);
    var posI = rangeI > 0 ? minI + Math.random() * rangeI : centerI;
    var posJ = rangeJ > 0 ? minJ + Math.random() * rangeJ : centerJ;
    var speed = getSpotlightSpeed(state.spotlightLevel);
    var velocity = pickSpotlightVelocity(speed, rangeI, rangeJ);
    var velI = velocity.i;
    var velJ = velocity.j;
    state.spotlightPos = { i: posI, j: posJ };
    state.spotlightVel = { i: velI, j: velJ };
    state.spotlightBoundsKey = key;
    state.spotlightLastTs = 0;
  }
}

function drawSpotlight(timestamp) {
  if (!state.challengeSpotlight || !refs.spotlightCanvas || !refs.board) {
    refs.spotlightAnimId = null;
    clearSpotlightCanvas();
    return;
  }

  syncSpotlightCanvas();
  var ctx = refs.spotlightCanvas.getContext("2d");
  if (!ctx) {
    refs.spotlightAnimId = null;
    return;
  }

  var size =
    (refs.board && refs.board.options && refs.board.options.boardSize) ||
    (state.currentMat ? state.currentMat.length : 0);
  var bounds = getSpotlightBounds(state.currentMat, size);
  var radiusUnits = getSpotlightRadius(state.spotlightLevel);
  ensureSpotlightState(bounds, radiusUnits);

  var minI = bounds.minI;
  var maxI = bounds.maxI;
  var minJ = bounds.minJ;
  var maxJ = bounds.maxJ;

  var pos = state.spotlightPos;
  var vel = state.spotlightVel;
  if (!pos || !vel) {
    refs.spotlightAnimId = requestAnimationFrame(drawSpotlight);
    return;
  }

  var lastTs = state.spotlightLastTs || timestamp;
  var delta = Math.max(0, (timestamp - lastTs) / 1000);
  state.spotlightLastTs = timestamp;

  if (maxI <= minI) {
    pos.i = (minI + maxI) / 2;
    vel.i = 0;
  } else {
    pos.i += vel.i * delta;
    if (pos.i <= minI || pos.i >= maxI) {
      pos.i = Math.min(maxI, Math.max(minI, pos.i));
      vel.i = -vel.i;
    }
  }

  if (maxJ <= minJ) {
    pos.j = (minJ + maxJ) / 2;
    vel.j = 0;
  } else {
    pos.j += vel.j * delta;
    if (pos.j <= minJ || pos.j >= maxJ) {
      pos.j = Math.min(maxJ, Math.max(minJ, pos.j));
      vel.j = -vel.j;
    }
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, refs.spotlightCanvas.width, refs.spotlightCanvas.height);
  ctx.fillStyle =
    "rgba(0, 0, 0, " + getSpotlightDarkness(state.spotlightLevel) + ")";
  ctx.fillRect(0, 0, refs.spotlightCanvas.width, refs.spotlightCanvas.height);

  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.setTransform(refs.board.transMat);
  var spacing = refs.board.calcSpaceAndPadding
    ? refs.board.calcSpaceAndPadding(
        refs.board.canvas || refs.board.cursorCanvas || refs.board.board
      )
    : { space: 0, scaledPadding: 0 };
  var space = spacing.space;
  var scaledPadding = spacing.scaledPadding;
  var centerX = scaledPadding + pos.i * space;
  var centerY = scaledPadding + pos.j * space;
  var radiusPx = Math.max(1, radiusUnits * space);
  var gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    radiusPx * 0.2,
    centerX,
    centerY,
    radiusPx
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radiusPx, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.restore();

  refs.spotlightAnimId = requestAnimationFrame(drawSpotlight);
}

function startSpotlightAnimation() {
  if (!state.challengeSpotlight) {
    stopSpotlightAnimation();
    return;
  }
  if (!refs.spotlightCanvas || !refs.board) {
    return;
  }
  if (refs.spotlightAnimId) {
    return;
  }
  refs.spotlightAnimId = requestAnimationFrame(drawSpotlight);
}

app.spotlight.updateSpotlightLevelUI = updateSpotlightLevelUI;
app.spotlight.setSpotlightLevel = setSpotlightLevel;
app.spotlight.startSpotlightAnimation = startSpotlightAnimation;
app.spotlight.stopSpotlightAnimation = stopSpotlightAnimation;
app.spotlight.clearSpotlightCanvas = clearSpotlightCanvas;
