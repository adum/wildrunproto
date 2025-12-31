import { app } from "./context.js";

var state = app.state;
var refs = app.refs;
var elements = app.elements;

var FIRE_SPEED = 5;

function getFireLength(level) {
  var safeLevel = Math.max(1, Number(level) || 1);
  return 4 + (safeLevel - 1) * 2;
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
  var nextLevel = Math.max(1, Math.min(10, Number(level) || 1));
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

function ensureFirePath() {
  var size =
    (refs.board && refs.board.options && refs.board.options.boardSize) ||
    (state.currentMat ? state.currentMat.length : 0);
  if (!size) {
    state.firePath = [];
    state.firePathSize = 0;
    return;
  }
  if (!state.firePath || state.firePathSize !== size) {
    state.firePath = buildFirePath(size);
    state.firePathSize = size;
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
    ctx.fillStyle = "rgba(255, 190, 120, 0.6)";
    ctx.beginPath();
    ctx.arc(start.x, start.y, baseWidth * 0.35, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();
    return;
  }

  var gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
  gradient.addColorStop(0, "rgba(255, 90, 0, 0.18)");
  gradient.addColorStop(0.5, "rgba(255, 145, 0, 0.5)");
  gradient.addColorStop(1, "rgba(255, 230, 170, 0.85)");

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(255, 120, 0, 0.65)";
  ctx.shadowBlur = baseWidth * (0.7 + 0.3 * pulse);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = baseWidth;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (var i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  ctx.shadowBlur = baseWidth * 0.45;
  ctx.strokeStyle = "rgba(255, 235, 190, 0.75)";
  ctx.lineWidth = baseWidth * 0.55;
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
  var headIndex = Math.floor(elapsed * FIRE_SPEED);
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
  var baseWidth = Math.max(space * 0.78, 2);

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
    var flicker = 0.35 + 0.35 * Math.sin(timestamp / 90 + pos);
    var radius = space * 0.18 * (0.6 + flicker);
    ctx.fillStyle = "rgba(255, 190, 120, " + (0.3 + flicker * 0.5) + ")";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
    ctx.fill();
  });
  ctx.restore();

  var headNode = path[headIndex];
  var headX = scaledPadding + headNode.i * space;
  var headY = scaledPadding + headNode.j * space;
  var headPulse = 0.5 + 0.5 * Math.sin(timestamp / 80);
  var headRadius = baseWidth * (0.55 + headPulse * 0.2);
  var headGlow = ctx.createRadialGradient(
    headX,
    headY,
    headRadius * 0.2,
    headX,
    headY,
    headRadius
  );
  headGlow.addColorStop(0, "rgba(255, 255, 220, " + (0.85 * headPulse) + ")");
  headGlow.addColorStop(0.6, "rgba(255, 175, 0, " + (0.6 * headPulse) + ")");
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
