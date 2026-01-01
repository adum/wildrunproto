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

function getFrostSpeed() {
  var config = app.config && app.config.fireSnake ? app.config.fireSnake : {};
  return getNumber(config.speed, 5);
}

function getFrostLength(level) {
  var config = app.config && app.config.fireSnake ? app.config.fireSnake : {};
  var base = getNumber(config.baseLength, 4);
  var increment = getNumber(config.lengthPerLevel, 2);
  var safeLevel = clampLevel("frost", level, 1, 10);
  var length = base + (safeLevel - 1) * increment;
  if (!Number.isFinite(length)) {
    length = base;
  }
  return Math.max(1, Math.round(length));
}

function updateFrostLevelUI() {
  if (elements.frostLevelInput) {
    elements.frostLevelInput.value = String(state.frostLevel);
  }
  if (elements.frostLevelValue) {
    elements.frostLevelValue.textContent = String(state.frostLevel);
  }
}

function setFrostLevel(level) {
  var nextLevel = clampLevel("frost", level, 1, 10);
  state.frostLevel = nextLevel;
  updateFrostLevelUI();
}

function buildFrostPath(size) {
  var path = [];
  for (var col = 0; col < size; col += 1) {
    if (col % 2 === 0) {
      for (var row = 0; row < size; row += 1) {
        path.push({ i: col, j: row });
      }
    } else {
      for (var row = size - 1; row >= 0; row -= 1) {
        path.push({ i: col, j: row });
      }
    }
  }
  return path;
}

function getColumnSpansFromMat(mat) {
  if (!mat) {
    return null;
  }
  var size = mat.length;
  var cols = [];
  for (var i = 0; i < size; i += 1) {
    if (!mat[i]) {
      continue;
    }
    for (var j = 0; j < size; j += 1) {
      if (mat[i][j] === GB.Ki.Empty) {
        continue;
      }
      cols[i] = cols[i] || { i: i, minJ: j, maxJ: j };
      if (j < cols[i].minJ) {
        cols[i].minJ = j;
      }
      if (j > cols[i].maxJ) {
        cols[i].maxJ = j;
      }
    }
  }
  var spans = cols.filter(Boolean);
  if (spans.length === 0) {
    return null;
  }
  spans.sort(function (a, b) {
    return a.i - b.i;
  });
  return spans;
}

function buildFrostPathForColumns(spans, size) {
  if (!spans || spans.length === 0) {
    return buildFrostPath(size);
  }
  var path = [];
  for (var c = 0; c < spans.length; c += 1) {
    var col = spans[c];
    var minJ = Math.max(0, col.minJ);
    var maxJ = Math.min(size - 1, col.maxJ);
    if (minJ > maxJ) {
      continue;
    }
    if (c % 2 === 0) {
      for (var row = minJ; row <= maxJ; row += 1) {
        path.push({ i: col.i, j: row });
      }
    } else {
      for (var row = maxJ; row >= minJ; row -= 1) {
        path.push({ i: col.i, j: row });
      }
    }
  }
  return path.length > 0 ? path : buildFrostPath(size);
}

function ensureFrostPath() {
  var size =
    (refs.board && refs.board.options && refs.board.options.boardSize) ||
    (state.currentMat ? state.currentMat.length : 0);
  if (!size) {
    state.frostPath = [];
    state.frostPathSize = 0;
    return;
  }
  var spans = getColumnSpansFromMat(state.currentMat);
  var key = spans
    ? spans
        .map(function (col) {
          return col.i + ":" + col.minJ + "-" + col.maxJ;
        })
        .join("|")
    : "full";
  if (
    !state.frostPath ||
    state.frostPathSize !== size ||
    state.frostPathKey !== key
  ) {
    state.frostPath = buildFrostPathForColumns(spans, size);
    state.frostPathSize = size;
    state.frostPathKey = key;
  }
}

function syncFrostCanvas() {
  if (!refs.frostCanvas || !refs.board) {
    return;
  }
  var ref = refs.board.canvas || refs.board.cursorCanvas || refs.board.board;
  if (!ref) {
    return;
  }
  var dpr = window.devicePixelRatio || 1;
  refs.frostCanvas.width = ref.width;
  refs.frostCanvas.height = ref.height;
  refs.frostCanvas.style.width = ref.width / dpr + "px";
  refs.frostCanvas.style.height = ref.height / dpr + "px";
}

function clearFrostCanvas() {
  if (!refs.frostCanvas) {
    return;
  }
  var ctx = refs.frostCanvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, refs.frostCanvas.width, refs.frostCanvas.height);
  }
}

function stopFrostAnimation() {
  if (refs.frostAnimId) {
    cancelAnimationFrame(refs.frostAnimId);
    refs.frostAnimId = null;
  }
  clearFrostCanvas();
}

function drawFrostSegment(ctx, points, baseWidth, pulse) {
  if (points.length === 0) {
    return;
  }
  var start = points[0];
  var end = points[points.length - 1];
  if (points.length === 1) {
    ctx.save();
    ctx.fillStyle = "rgba(210, 245, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(start.x, start.y, baseWidth * 0.45, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();
    return;
  }

  var gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
  gradient.addColorStop(0, "rgba(140, 220, 255, 0.35)");
  gradient.addColorStop(0.5, "rgba(170, 245, 255, 0.8)");
  gradient.addColorStop(1, "rgba(230, 255, 255, 0.95)");

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(120, 200, 255, 0.6)";
  ctx.shadowBlur = baseWidth * (1.1 + 0.35 * pulse);
  ctx.strokeStyle = "rgba(90, 170, 220, 0.3)";
  ctx.lineWidth = baseWidth * 1.25;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (var o = 1; o < points.length; o += 1) {
    ctx.lineTo(points[o].x, points[o].y);
  }
  ctx.stroke();

  ctx.shadowColor = "rgba(170, 235, 255, 0.7)";
  ctx.shadowBlur = baseWidth * (0.8 + 0.3 * pulse);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = baseWidth * 0.95;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (var i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  ctx.shadowBlur = baseWidth * 0.6;
  ctx.strokeStyle = "rgba(235, 255, 255, 0.9)";
  ctx.lineWidth = baseWidth * 0.6;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (var j = 1; j < points.length; j += 1) {
    ctx.lineTo(points[j].x, points[j].y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawFrostSnake(timestamp) {
  if (!state.challengeFrost || !refs.frostCanvas || !refs.board) {
    refs.frostAnimId = null;
    clearFrostCanvas();
    return;
  }

  if (!state.frostStartAt) {
    state.frostStartAt = timestamp;
  }

  ensureFrostPath();
  if (!state.frostPath || state.frostPath.length === 0) {
    refs.frostAnimId = requestAnimationFrame(drawFrostSnake);
    return;
  }

  syncFrostCanvas();
  var ctx = refs.frostCanvas.getContext("2d");
  if (!ctx) {
    refs.frostAnimId = null;
    return;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, refs.frostCanvas.width, refs.frostCanvas.height);

  ctx.setTransform(refs.board.transMat);
  var spacing = refs.board.calcSpaceAndPadding
    ? refs.board.calcSpaceAndPadding(
        refs.board.canvas || refs.board.cursorCanvas || refs.board.board
      )
    : { space: 0, scaledPadding: 0 };
  var space = spacing.space;
  var scaledPadding = spacing.scaledPadding;

  var path = state.frostPath;
  var pathLength = path.length;
  var snakeLength = Math.min(getFrostLength(state.frostLevel), pathLength);
  var elapsed = (timestamp - state.frostStartAt) / 1000;
  var headIndex = Math.floor(elapsed * getFrostSpeed());
  headIndex = ((headIndex % pathLength) + pathLength) % pathLength;

  var indices = [];
  for (var k = 0; k < snakeLength; k += 1) {
    var idx = headIndex - (snakeLength - 1 - k);
    while (idx < 0) {
      idx += pathLength;
    }
    indices.push(idx);
  }

  var segments = [];
  var current = [];
  for (var s = 0; s < indices.length; s += 1) {
    var index = indices[s];
    if (current.length > 0 && index < current[current.length - 1]) {
      segments.push(current);
      current = [];
    }
    current.push(index);
  }
  if (current.length > 0) {
    segments.push(current);
  }

  var pulse = 0.55 + 0.45 * Math.sin(timestamp / 140);
  var baseWidth = Math.max(space * 0.96, 2);

  segments.forEach(function (segment) {
    var points = segment.map(function (idx) {
      var node = path[idx];
      return {
        x: scaledPadding + node.i * space,
        y: scaledPadding + node.j * space,
      };
    });
    drawFrostSegment(ctx, points, baseWidth, pulse);
  });

  ctx.save();
  indices.forEach(function (idx, pos) {
    var node = path[idx];
    var cx = scaledPadding + node.i * space;
    var cy = scaledPadding + node.j * space;
    var flicker = 0.45 + 0.35 * Math.sin(timestamp / 95 + pos);
    var radius = space * 0.26 * (0.7 + flicker);
    ctx.fillStyle = "rgba(190, 245, 255, " + (0.4 + flicker * 0.5) + ")";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
    ctx.fill();
  });
  ctx.restore();

  var headNode = path[headIndex];
  var headX = scaledPadding + headNode.i * space;
  var headY = scaledPadding + headNode.j * space;
  var headPulse = 0.5 + 0.5 * Math.sin(timestamp / 110);
  var headRadius = baseWidth * (0.7 + headPulse * 0.3);
  var headGlow = ctx.createRadialGradient(
    headX,
    headY,
    headRadius * 0.2,
    headX,
    headY,
    headRadius
  );
  headGlow.addColorStop(0, "rgba(245, 255, 255, " + (0.9 * headPulse) + ")");
  headGlow.addColorStop(0.6, "rgba(140, 220, 255, " + (0.7 * headPulse) + ")");
  headGlow.addColorStop(1, "rgba(90, 160, 210, 0)");
  ctx.save();
  ctx.fillStyle = headGlow;
  ctx.beginPath();
  ctx.arc(headX, headY, headRadius, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.restore();

  refs.frostAnimId = requestAnimationFrame(drawFrostSnake);
}

function startFrostAnimation() {
  if (!state.challengeFrost) {
    stopFrostAnimation();
    return;
  }
  if (!refs.frostCanvas || !refs.board) {
    return;
  }
  if (refs.frostAnimId) {
    return;
  }
  if (!state.frostStartAt) {
    state.frostStartAt = performance.now();
  }
  refs.frostAnimId = requestAnimationFrame(drawFrostSnake);
}

app.frost.updateFrostLevelUI = updateFrostLevelUI;
app.frost.setFrostLevel = setFrostLevel;
app.frost.startFrostAnimation = startFrostAnimation;
app.frost.stopFrostAnimation = stopFrostAnimation;
app.frost.clearFrostCanvas = clearFrostCanvas;
