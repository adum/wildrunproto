import { app } from "./context.js";

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

function getSpyglassConfig() {
  if (app.config && app.config.spyglass) {
    return app.config.spyglass;
  }
  if (app.config && app.config.spotlight) {
    return app.config.spotlight;
  }
  return {};
}

function getSpyglassRadius(level) {
  var config = getSpyglassConfig();
  var base = getNumber(config.baseRadius, 2.8);
  var decrement = getNumber(config.radiusDecrementPerLevel, 0.2);
  var minRadius = getNumber(config.minRadius, 1);
  var safeLevel = clampLevel("spyglass", level, 1, 10);
  var radius = base - (safeLevel - 1) * decrement;
  if (!Number.isFinite(radius)) {
    radius = base;
  }
  radius = Math.max(minRadius, radius);
  return Math.max(0, radius);
}

function getSpyglassDarkness(level) {
  var safeLevel = clampLevel("spyglass", level, 1, 10);
  if (safeLevel >= 2) {
    return 1;
  }
  var config = getSpyglassConfig();
  var alpha = getNumber(config.darkness, 0.86);
  if (!Number.isFinite(alpha)) {
    alpha = 0.86;
  }
  return Math.min(1, Math.max(0, alpha));
}

function updateSpyglassLevelUI() {
  if (elements.spyglassLevelInput) {
    elements.spyglassLevelInput.value = String(state.spyglassLevel);
  }
  if (elements.spyglassLevelValue) {
    elements.spyglassLevelValue.textContent = String(state.spyglassLevel);
  }
}

function setSpyglassLevel(level) {
  var nextLevel = clampLevel("spyglass", level, 1, 10);
  state.spyglassLevel = nextLevel;
  updateSpyglassLevelUI();
  scheduleSpyglassDraw();
}

function syncSpyglassCanvas() {
  if (!refs.spyglassCanvas || !refs.board) {
    return;
  }
  var ref = refs.board.canvas || refs.board.cursorCanvas || refs.board.board;
  if (!ref) {
    return;
  }
  var dpr = window.devicePixelRatio || 1;
  refs.spyglassCanvas.width = ref.width;
  refs.spyglassCanvas.height = ref.height;
  refs.spyglassCanvas.style.width = ref.width / dpr + "px";
  refs.spyglassCanvas.style.height = ref.height / dpr + "px";
}

function clearSpyglassCanvas() {
  if (!refs.spyglassCanvas) {
    return;
  }
  var ctx = refs.spyglassCanvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, refs.spyglassCanvas.width, refs.spyglassCanvas.height);
  }
}

function getClientPoint(event) {
  if (!event) {
    return null;
  }
  if (event.touches && event.touches.length) {
    return { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }
  if (typeof event.clientX === "number" && typeof event.clientY === "number") {
    return { x: event.clientX, y: event.clientY };
  }
  return null;
}

function updateSpyglassPosition(point) {
  if (!point) {
    state.spyglassPos = null;
    return;
  }
  if (!state.challengeSpyglass || !refs.board) {
    return;
  }
  var canvas = refs.board.canvas || refs.board.cursorCanvas || refs.board.board;
  if (!canvas || !canvas.getBoundingClientRect) {
    return;
  }
  var rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return;
  }
  if (
    point.x < rect.left ||
    point.x > rect.right ||
    point.y < rect.top ||
    point.y > rect.bottom
  ) {
    state.spyglassPos = null;
    return;
  }
  state.spyglassPointer = { x: point.x, y: point.y };

  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;
  var canvasX = (point.x - rect.left) * scaleX;
  var canvasY = (point.y - rect.top) * scaleY;
  var inverse = null;
  if (refs.board.transMat && typeof refs.board.transMat.inverse === "function") {
    inverse = refs.board.transMat.inverse();
  } else if (
    refs.board.transMat &&
    typeof refs.board.transMat.invertSelf === "function"
  ) {
    var copy = new DOMMatrix(refs.board.transMat);
    inverse = copy.invertSelf();
  }
  var transformed = inverse
    ? inverse.transformPoint(new DOMPoint(canvasX, canvasY))
    : new DOMPoint(canvasX, canvasY);
  var spacing = refs.board.calcSpaceAndPadding
    ? refs.board.calcSpaceAndPadding(canvas)
    : { space: 0, scaledPadding: 0 };
  if (!spacing.space) {
    state.spyglassPos = null;
    return;
  }
  var i = (transformed.x - spacing.scaledPadding) / spacing.space;
  var j = (transformed.y - spacing.scaledPadding) / spacing.space;
  if (!Number.isFinite(i) || !Number.isFinite(j)) {
    state.spyglassPos = null;
    return;
  }
  var size =
    (refs.board && refs.board.options && refs.board.options.boardSize) ||
    (state.currentMat ? state.currentMat.length : 0);
  var maxIndex = Math.max(0, size - 1);
  i = Math.max(0, Math.min(maxIndex, i));
  j = Math.max(0, Math.min(maxIndex, j));
  state.spyglassPos = { i: i, j: j };
}

function drawSpyglass() {
  if (!state.challengeSpyglass || !refs.spyglassCanvas || !refs.board) {
    clearSpyglassCanvas();
    return;
  }

  syncSpyglassCanvas();
  var ctx = refs.spyglassCanvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, refs.spyglassCanvas.width, refs.spyglassCanvas.height);
  ctx.fillStyle =
    "rgba(0, 0, 0, " + getSpyglassDarkness(state.spyglassLevel) + ")";
  ctx.fillRect(0, 0, refs.spyglassCanvas.width, refs.spyglassCanvas.height);

  var pos = state.spyglassPos;
  if (!pos) {
    return;
  }

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
  var radiusPx = Math.max(1, getSpyglassRadius(state.spyglassLevel) * space);
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
}

function scheduleSpyglassDraw() {
  if (!state.challengeSpyglass || !refs.spyglassCanvas) {
    return;
  }
  if (refs.spyglassAnimId) {
    return;
  }
  refs.spyglassAnimId = requestAnimationFrame(function () {
    refs.spyglassAnimId = null;
    drawSpyglass();
  });
}

function handleSpyglassMove(event) {
  if (!state.challengeSpyglass) {
    return;
  }
  var point = getClientPoint(event);
  updateSpyglassPosition(point);
  scheduleSpyglassDraw();
}

function handleSpyglassLeave() {
  if (!state.challengeSpyglass) {
    return;
  }
  state.spyglassPointer = null;
  state.spyglassPos = null;
  scheduleSpyglassDraw();
}

var spyglassBound = false;
function bindSpyglassInput() {
  if (spyglassBound || !elements.mount) {
    return;
  }
  spyglassBound = true;
  elements.mount.addEventListener("mousemove", handleSpyglassMove);
  elements.mount.addEventListener("mouseleave", handleSpyglassLeave);
  elements.mount.addEventListener("touchmove", handleSpyglassMove, {
    passive: true,
  });
  elements.mount.addEventListener("touchend", handleSpyglassLeave);
  elements.mount.addEventListener("touchcancel", handleSpyglassLeave);
}

function startSpyglassAnimation() {
  if (!state.challengeSpyglass) {
    stopSpyglassAnimation();
    return;
  }
  bindSpyglassInput();
  if (state.spyglassPointer) {
    updateSpyglassPosition(state.spyglassPointer);
  }
  scheduleSpyglassDraw();
}

function stopSpyglassAnimation() {
  if (refs.spyglassAnimId) {
    cancelAnimationFrame(refs.spyglassAnimId);
    refs.spyglassAnimId = null;
  }
  clearSpyglassCanvas();
}

app.spyglass.updateSpyglassLevelUI = updateSpyglassLevelUI;
app.spyglass.setSpyglassLevel = setSpyglassLevel;
app.spyglass.startSpyglassAnimation = startSpyglassAnimation;
app.spyglass.stopSpyglassAnimation = stopSpyglassAnimation;
app.spyglass.clearSpyglassCanvas = clearSpyglassCanvas;
