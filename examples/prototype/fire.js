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

function getFireSpeed() {
  var config = app.config && app.config.fireSnake ? app.config.fireSnake : {};
  return getNumber(config.speed, 5);
}

function getFireLength(level) {
  var config = app.config && app.config.fireSnake ? app.config.fireSnake : {};
  var base = getNumber(config.baseLength, 4);
  var increment = getNumber(config.lengthPerLevel, 2);
  var safeLevel = clampLevel("fire", level, 1, 10);
  var length = base + (safeLevel - 1) * increment;
  if (!Number.isFinite(length)) {
    length = base;
  }
  return Math.max(1, Math.round(length));
}

function updateFireLevelUI() {
  if (elements.fireLevelInput) {
    elements.fireLevelInput.value = String(state.fireLevel);
  }
  if (elements.fireLevelValue) {
    elements.fireLevelValue.textContent = String(state.fireLevel);
  }
}

function setFireLevel(level) {
  var nextLevel = clampLevel("fire", level, 1, 10);
  state.fireLevel = nextLevel;
  updateFireLevelUI();
}

function buildFirePath(size) {
  var path = [];
  for (var row = 0; row < size; row += 1) {
    if (row % 2 === 0) {
      for (var col = 0; col < size; col += 1) {
        path.push({ i: col, j: row });
      }
    } else {
      for (var col = size - 1; col >= 0; col -= 1) {
        path.push({ i: col, j: row });
      }
    }
  }
  return path;
}

function getRowSpansFromMat(mat) {
  if (!mat) {
    return null;
  }
  var size = mat.length;
  var rows = [];
  for (var i = 0; i < size; i += 1) {
    if (!mat[i]) {
      continue;
    }
    for (var j = 0; j < size; j += 1) {
      if (mat[i][j] === GB.Ki.Empty) {
        continue;
      }
      rows[j] = rows[j] || { j: j, minI: i, maxI: i };
      if (i < rows[j].minI) {
        rows[j].minI = i;
      }
      if (i > rows[j].maxI) {
        rows[j].maxI = i;
      }
    }
  }
  var spans = rows.filter(Boolean);
  if (spans.length === 0) {
    return null;
  }
  spans.sort(function (a, b) {
    return a.j - b.j;
  });
  return spans;
}

function buildFirePathForRows(spans, size) {
  if (!spans || spans.length === 0) {
    return buildFirePath(size);
  }
  var path = [];
  for (var r = 0; r < spans.length; r += 1) {
    var row = spans[r];
    var minI = Math.max(0, row.minI);
    var maxI = Math.min(size - 1, row.maxI);
    if (minI > maxI) {
      continue;
    }
    if (r % 2 === 0) {
      for (var col = minI; col <= maxI; col += 1) {
        path.push({ i: col, j: row.j });
      }
    } else {
      for (var col = maxI; col >= minI; col -= 1) {
        path.push({ i: col, j: row.j });
      }
    }
  }
  return path.length > 0 ? path : buildFirePath(size);
}

function ensureFirePath() {
  var size =
    (refs.board && refs.board.options && refs.board.options.boardSize) ||
    (state.currentMat ? state.currentMat.length : 0);
  if (!size) {
    state.firePath = [];
    state.firePathSize = 0;
    return;
  }
  var spans = getRowSpansFromMat(state.currentMat);
  var key = spans
    ? spans
        .map(function (row) {
          return row.j + ":" + row.minI + "-" + row.maxI;
        })
        .join("|")
    : "full";
  if (
    !state.firePath ||
    state.firePathSize !== size ||
    state.firePathKey !== key
  ) {
    state.firePath = buildFirePathForRows(spans, size);
    state.firePathSize = size;
    state.firePathKey = key;
  }
}

function syncFireCanvas() {
  if (!refs.fireCanvas || !refs.board) {
    return;
  }
  var ref = refs.board.canvas || refs.board.cursorCanvas || refs.board.board;
  if (!ref) {
    return;
  }
  var dpr = window.devicePixelRatio || 1;
  refs.fireCanvas.width = ref.width;
  refs.fireCanvas.height = ref.height;
  refs.fireCanvas.style.width = ref.width / dpr + "px";
  refs.fireCanvas.style.height = ref.height / dpr + "px";
}

function clearFireCanvas() {
  if (!refs.fireCanvas) {
    return;
  }
  var ctx = refs.fireCanvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, refs.fireCanvas.width, refs.fireCanvas.height);
  }
}

function stopFireAnimation() {
  if (refs.fireAnimId) {
    cancelAnimationFrame(refs.fireAnimId);
    refs.fireAnimId = null;
  }
  clearFireCanvas();
}

function drawSnakeSegment(ctx, points, baseWidth, pulse) {
  if (points.length === 0) {
    return;
  }
  var start = points[0];
  var end = points[points.length - 1];
  if (points.length === 1) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 180, 110, 0.85)";
    ctx.beginPath();
    ctx.arc(start.x, start.y, baseWidth * 0.45, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();
    return;
  }

  var gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
  gradient.addColorStop(0, "rgba(255, 60, 0, 0.32)");
  gradient.addColorStop(0.5, "rgba(255, 140, 0, 0.75)");
  gradient.addColorStop(1, "rgba(255, 240, 190, 0.95)");

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(255, 90, 0, 0.5)";
  ctx.shadowBlur = baseWidth * (1.1 + 0.4 * pulse);
  ctx.strokeStyle = "rgba(255, 80, 0, 0.25)";
  ctx.lineWidth = baseWidth * 1.35;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (var o = 1; o < points.length; o += 1) {
    ctx.lineTo(points[o].x, points[o].y);
  }
  ctx.stroke();

  ctx.shadowColor = "rgba(255, 120, 0, 0.75)";
  ctx.shadowBlur = baseWidth * (0.85 + 0.35 * pulse);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = baseWidth * 1.05;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (var i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  ctx.shadowBlur = baseWidth * 0.65;
  ctx.strokeStyle = "rgba(255, 245, 210, 0.9)";
  ctx.lineWidth = baseWidth * 0.65;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (var j = 1; j < points.length; j += 1) {
    ctx.lineTo(points[j].x, points[j].y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawFireSnake(timestamp) {
  if (!state.challengeFire || !refs.fireCanvas || !refs.board) {
    refs.fireAnimId = null;
    clearFireCanvas();
    return;
  }

  if (!state.fireStartAt) {
    state.fireStartAt = timestamp;
  }

  ensureFirePath();
  if (!state.firePath || state.firePath.length === 0) {
    refs.fireAnimId = requestAnimationFrame(drawFireSnake);
    return;
  }

  syncFireCanvas();
  var ctx = refs.fireCanvas.getContext("2d");
  if (!ctx) {
    refs.fireAnimId = null;
    return;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, refs.fireCanvas.width, refs.fireCanvas.height);

  ctx.setTransform(refs.board.transMat);
  var spacing = refs.board.calcSpaceAndPadding
    ? refs.board.calcSpaceAndPadding(
        refs.board.canvas || refs.board.cursorCanvas || refs.board.board
      )
    : { space: 0, scaledPadding: 0 };
  var space = spacing.space;
  var scaledPadding = spacing.scaledPadding;

  var path = state.firePath;
  var pathLength = path.length;
  var snakeLength = Math.min(getFireLength(state.fireLevel), pathLength);
  var elapsed = (timestamp - state.fireStartAt) / 1000;
  var headIndex = Math.floor(elapsed * getFireSpeed());
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

  var pulse = 0.6 + 0.4 * Math.sin(timestamp / 120);
  var baseWidth = Math.max(space * 0.98, 2);

  segments.forEach(function (segment) {
    var points = segment.map(function (idx) {
      var node = path[idx];
      return {
        x: scaledPadding + node.i * space,
        y: scaledPadding + node.j * space,
      };
    });
    drawSnakeSegment(ctx, points, baseWidth, pulse);
  });

  ctx.save();
  indices.forEach(function (idx, pos) {
    var node = path[idx];
    var cx = scaledPadding + node.i * space;
    var cy = scaledPadding + node.j * space;
    var flicker = 0.45 + 0.4 * Math.sin(timestamp / 85 + pos);
    var radius = space * 0.28 * (0.7 + flicker);
    ctx.fillStyle = "rgba(255, 180, 120, " + (0.45 + flicker * 0.5) + ")";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
    ctx.fill();
  });
  ctx.restore();

  var headNode = path[headIndex];
  var headX = scaledPadding + headNode.i * space;
  var headY = scaledPadding + headNode.j * space;
  var headPulse = 0.5 + 0.5 * Math.sin(timestamp / 80);
  var headRadius = baseWidth * (0.7 + headPulse * 0.3);
  var headGlow = ctx.createRadialGradient(
    headX,
    headY,
    headRadius * 0.2,
    headX,
    headY,
    headRadius
  );
  headGlow.addColorStop(0, "rgba(255, 255, 230, " + (0.95 * headPulse) + ")");
  headGlow.addColorStop(0.6, "rgba(255, 160, 0, " + (0.75 * headPulse) + ")");
  headGlow.addColorStop(1, "rgba(255, 80, 0, 0)");
  ctx.save();
  ctx.fillStyle = headGlow;
  ctx.beginPath();
  ctx.arc(headX, headY, headRadius, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.restore();

  refs.fireAnimId = requestAnimationFrame(drawFireSnake);
}

function startFireAnimation() {
  if (!state.challengeFire) {
    stopFireAnimation();
    return;
  }
  if (!refs.fireCanvas || !refs.board) {
    return;
  }
  if (refs.fireAnimId) {
    return;
  }
  if (!state.fireStartAt) {
    state.fireStartAt = performance.now();
  }
  refs.fireAnimId = requestAnimationFrame(drawFireSnake);
}

app.fire.updateFireLevelUI = updateFireLevelUI;
app.fire.setFireLevel = setFireLevel;
app.fire.startFireAnimation = startFireAnimation;
app.fire.stopFireAnimation = stopFireAnimation;
app.fire.clearFireCanvas = clearFireCanvas;
