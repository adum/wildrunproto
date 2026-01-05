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

function getFlipSnakeConfig() {
  if (app.config && app.config.flipSnake) {
    return app.config.flipSnake;
  }
  return app.config && app.config.fireSnake ? app.config.fireSnake : {};
}

function getFlipSpeed() {
  var config = getFlipSnakeConfig();
  return getNumber(config.speed, 5);
}

function getFlipLength(level) {
  var config = getFlipSnakeConfig();
  var base = getNumber(config.baseLength, 4);
  var increment = getNumber(config.lengthPerLevel, 2);
  var safeLevel = clampLevel("flip", level, 1, 10);
  var length = base + (safeLevel - 1) * increment;
  if (!Number.isFinite(length)) {
    length = base;
  }
  return Math.max(1, Math.round(length));
}

function updateFlipLevelUI() {
  if (elements.flipLevelInput) {
    elements.flipLevelInput.value = String(state.flipLevel);
  }
  if (elements.flipLevelValue) {
    elements.flipLevelValue.textContent = String(state.flipLevel);
  }
}

function setFlipLevel(level) {
  var nextLevel = clampLevel("flip", level, 1, 10);
  state.flipLevel = nextLevel;
  updateFlipLevelUI();
}

function buildFlipPath(size) {
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

function buildFlipPathForRows(spans, size) {
  if (!spans || spans.length === 0) {
    return buildFlipPath(size);
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
  return path.length > 0 ? path : buildFlipPath(size);
}

function ensureFlipPath() {
  var size =
    (refs.board && refs.board.options && refs.board.options.boardSize) ||
    (state.currentMat ? state.currentMat.length : 0);
  if (!size) {
    state.flipPath = [];
    state.flipPathSize = 0;
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
    !state.flipPath ||
    state.flipPathSize !== size ||
    state.flipPathKey !== key
  ) {
    state.flipPath = buildFlipPathForRows(spans, size);
    state.flipPathSize = size;
    state.flipPathKey = key;
  }
}

function syncFlipCanvas() {
  if (!refs.flipCanvas || !refs.board) {
    return;
  }
  var ref = refs.board.canvas || refs.board.cursorCanvas || refs.board.board;
  if (!ref) {
    return;
  }
  var dpr = window.devicePixelRatio || 1;
  refs.flipCanvas.width = ref.width;
  refs.flipCanvas.height = ref.height;
  refs.flipCanvas.style.width = ref.width / dpr + "px";
  refs.flipCanvas.style.height = ref.height / dpr + "px";
}

function clearFlipCanvas() {
  if (!refs.flipCanvas) {
    return;
  }
  var ctx = refs.flipCanvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, refs.flipCanvas.width, refs.flipCanvas.height);
  }
}

function stopFlipAnimation() {
  if (refs.flipAnimId) {
    cancelAnimationFrame(refs.flipAnimId);
    refs.flipAnimId = null;
  }
  clearFlipCanvas();
}

function drawFlipSegment(ctx, points, baseWidth, pulse) {
  if (points.length === 0) {
    return;
  }
  var start = points[0];
  var end = points[points.length - 1];
  if (points.length === 1) {
    ctx.save();
    ctx.fillStyle = "rgba(140, 255, 200, 0.85)";
    ctx.beginPath();
    ctx.arc(start.x, start.y, baseWidth * 0.4, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();
    return;
  }

  var gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
  gradient.addColorStop(0, "rgba(80, 210, 150, 0.35)");
  gradient.addColorStop(0.5, "rgba(140, 255, 210, 0.8)");
  gradient.addColorStop(1, "rgba(235, 255, 245, 0.92)");

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(80, 200, 150, 0.6)";
  ctx.shadowBlur = baseWidth * (0.9 + 0.35 * pulse);
  ctx.strokeStyle = "rgba(70, 170, 120, 0.35)";
  ctx.lineWidth = baseWidth * 1.15;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (var o = 1; o < points.length; o += 1) {
    ctx.lineTo(points[o].x, points[o].y);
  }
  ctx.stroke();

  ctx.shadowBlur = baseWidth * (0.6 + 0.25 * pulse);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = baseWidth;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (var i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  ctx.shadowBlur = baseWidth * 0.45;
  ctx.strokeStyle = "rgba(245, 255, 245, 0.9)";
  ctx.lineWidth = baseWidth * 0.65;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (var j = 1; j < points.length; j += 1) {
    ctx.lineTo(points[j].x, points[j].y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawFlipSnake(timestamp) {
  if (!state.challengeFlip || !refs.flipCanvas || !refs.board) {
    refs.flipAnimId = null;
    clearFlipCanvas();
    return;
  }

  if (!state.flipStartAt) {
    state.flipStartAt = timestamp;
  }

  ensureFlipPath();
  if (!state.flipPath || state.flipPath.length === 0) {
    refs.flipAnimId = requestAnimationFrame(drawFlipSnake);
    return;
  }

  syncFlipCanvas();
  var ctx = refs.flipCanvas.getContext("2d");
  if (!ctx) {
    refs.flipAnimId = null;
    return;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, refs.flipCanvas.width, refs.flipCanvas.height);

  if (!state.currentMat) {
    refs.flipAnimId = requestAnimationFrame(drawFlipSnake);
    return;
  }

  ctx.setTransform(refs.board.transMat);
  var spacing = refs.board.calcSpaceAndPadding
    ? refs.board.calcSpaceAndPadding(
        refs.board.canvas || refs.board.cursorCanvas || refs.board.board
      )
    : { space: 0, scaledPadding: 0 };
  var space = spacing.space;
  var scaledPadding = spacing.scaledPadding;
  var themeOptions = refs.board.options.themeOptions || {};
  var theme = refs.board.options.theme;
  var themeConfig = themeOptions[theme] || {};
  var defaultConfig = themeOptions.default || {};
  var black = themeConfig.flatBlackColor || defaultConfig.flatBlackColor || "#000";
  var white = themeConfig.flatWhiteColor || defaultConfig.flatWhiteColor || "#fff";
  var line = themeConfig.boardLineColor || defaultConfig.boardLineColor || "#5a4c3b";
  var ratio = themeConfig.stoneRatio || defaultConfig.stoneRatio || 0.45;
  var radius = space * ratio;

  var path = state.flipPath;
  var pathLength = path.length;
  var snakeLength = Math.min(getFlipLength(state.flipLevel), pathLength);
  var elapsed = (timestamp - state.flipStartAt) / 1000;
  var headIndex = Math.floor(elapsed * getFlipSpeed());
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

  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(space * 0.05, 1);

  for (var m = 0; m < indices.length; m += 1) {
    var node = path[indices[m]];
    if (!state.currentMat[node.i]) {
      continue;
    }
    var stoneValue = state.currentMat[node.i][node.j];
    if (stoneValue === GB.Ki.Empty) {
      continue;
    }
    var cx = scaledPadding + node.i * space;
    var cy = scaledPadding + node.j * space;
    ctx.fillStyle = stoneValue === GB.Ki.White ? black : white;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  var pulse = 0.55 + 0.45 * Math.sin(timestamp / 135);
  var baseWidth = Math.max(space * 0.35, 1);

  segments.forEach(function (segment) {
    var points = segment.map(function (segIndex) {
      var segNode = path[segIndex];
      return {
        x: scaledPadding + segNode.i * space,
        y: scaledPadding + segNode.j * space,
      };
    });
    drawFlipSegment(ctx, points, baseWidth, pulse);
  });

  var headNode = path[headIndex];
  var headX = scaledPadding + headNode.i * space;
  var headY = scaledPadding + headNode.j * space;
  var headPulse = 0.5 + 0.5 * Math.sin(timestamp / 110);
  var headRadius = baseWidth * (0.6 + headPulse * 0.35);
  var headGlow = ctx.createRadialGradient(
    headX,
    headY,
    headRadius * 0.2,
    headX,
    headY,
    headRadius
  );
  headGlow.addColorStop(0, "rgba(245, 255, 245, " + (0.8 * headPulse) + ")");
  headGlow.addColorStop(0.65, "rgba(120, 230, 175, " + (0.6 * headPulse) + ")");
  headGlow.addColorStop(1, "rgba(70, 170, 130, 0)");
  ctx.save();
  ctx.fillStyle = headGlow;
  ctx.beginPath();
  ctx.arc(headX, headY, headRadius, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.restore();

  refs.flipAnimId = requestAnimationFrame(drawFlipSnake);
}

function startFlipAnimation() {
  if (!state.challengeFlip) {
    stopFlipAnimation();
    return;
  }
  if (!refs.flipCanvas || !refs.board) {
    return;
  }
  if (refs.flipAnimId) {
    return;
  }
  if (!state.flipStartAt) {
    state.flipStartAt = performance.now();
  }
  refs.flipAnimId = requestAnimationFrame(drawFlipSnake);
}

app.flip.updateFlipLevelUI = updateFlipLevelUI;
app.flip.setFlipLevel = setFlipLevel;
app.flip.startFlipAnimation = startFlipAnimation;
app.flip.stopFlipAnimation = stopFlipAnimation;
app.flip.clearFlipCanvas = clearFlipCanvas;
