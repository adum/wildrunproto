import { app } from "./context.js";

var GB = app.GB;
var state = app.state;
var refs = app.refs;
var elements = app.elements;
var configUtils = app.configUtils;

var renderBuffer = null;
var renderCtx = null;
var pixelBuffer = null;
var pixelCtx = null;
var lastCountdownValue = null;

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

function getFadeOutConfig() {
  if (app.config) {
    return app.config.fadeout || app.config.fadeOut || {};
  }
  return {};
}

function getFadeOutDuration(level) {
  var config = getFadeOutConfig();
  var base = getNumber(config.baseSeconds, 30);
  var decrement = getNumber(config.decrementPerLevel, 5);
  var minSeconds = getNumber(config.minSeconds, 5);
  var safeLevel = clampLevel("fadeout", level, 1, 10);
  var seconds = base - (safeLevel - 1) * decrement;
  if (!Number.isFinite(seconds)) {
    seconds = base;
  }
  return Math.max(minSeconds, seconds);
}

function getFadeOutDelaySeconds() {
  var config = getFadeOutConfig();
  var base = getNumber(config.delaySeconds, 5);
  var decrement = getNumber(config.delayDecrementPerLevel, 1);
  var minDelay = getNumber(config.delayMinSeconds, 2);
  var safeLevel = clampLevel("fadeout", state.fadeOutLevel, 1, 10);
  var delay = base - (safeLevel - 1) * decrement;
  if (!Number.isFinite(delay)) {
    delay = base;
  }
  return Math.max(minDelay, delay);
}

function getFadeOutPixelSize(progress) {
  var config = getFadeOutConfig();
  var maxSize = getNumber(config.pixelationMaxSize, 8);
  if (!Number.isFinite(maxSize) || maxSize < 1) {
    maxSize = 1;
  }
  var clamped = Math.max(0, Math.min(1, progress));
  return Math.max(1, Math.round(1 + (maxSize - 1) * clamped));
}

function clampByte(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseColor(value, fallback) {
  var color = typeof value === "string" ? value.trim() : "";
  if (!color && typeof fallback === "string") {
    color = fallback.trim();
  }
  if (!color) {
    return { r: 0, g: 0, b: 0 };
  }
  if (color.charAt(0) === "#") {
    var hex = color.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex.charAt(0) + hex.charAt(0), 16),
        g: parseInt(hex.charAt(1) + hex.charAt(1), 16),
        b: parseInt(hex.charAt(2) + hex.charAt(2), 16),
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }
  if (color.indexOf("rgb") === 0) {
    var parts = color
      .replace(/rgba?\(/, "")
      .replace(")", "")
      .split(",");
    if (parts.length >= 3) {
      return {
        r: clampByte(parseFloat(parts[0])),
        g: clampByte(parseFloat(parts[1])),
        b: clampByte(parseFloat(parts[2])),
      };
    }
  }
  if (typeof fallback === "string" && fallback.trim() !== color) {
    return parseColor(fallback);
  }
  return { r: 0, g: 0, b: 0 };
}

function mixRgb(a, b, amount) {
  var t = Math.max(0, Math.min(1, amount));
  return {
    r: clampByte(a.r + (b.r - a.r) * t),
    g: clampByte(a.g + (b.g - a.g) * t),
    b: clampByte(a.b + (b.b - a.b) * t),
  };
}

function rgbToCss(color) {
  return "rgb(" + color.r + ", " + color.g + ", " + color.b + ")";
}

function getFadeOutThemeColors() {
  if (!refs.board || !refs.board.options) {
    return {
      black: parseColor("#000"),
      white: parseColor("#fff"),
      line: parseColor("#5a4c3b"),
      background: parseColor("#e6bb85"),
    };
  }
  var themeOptions = refs.board.options.themeOptions || {};
  var theme = refs.board.options.theme;
  var themeConfig = themeOptions[theme] || {};
  var defaultConfig = themeOptions.default || {};
  var black = themeConfig.flatBlackColor || defaultConfig.flatBlackColor || "#000";
  var white = themeConfig.flatWhiteColor || defaultConfig.flatWhiteColor || "#fff";
  var line = themeConfig.boardLineColor || defaultConfig.boardLineColor || "#5a4c3b";
  var background =
    themeConfig.boardBackgroundColor ||
    defaultConfig.boardBackgroundColor ||
    "#e6bb85";
  return {
    black: parseColor(black, "#000"),
    white: parseColor(white, "#fff"),
    line: parseColor(line, "#5a4c3b"),
    background: parseColor(background, "#e6bb85"),
  };
}

function updateFadeOutLevelUI() {
  if (elements.fadeOutLevelInput) {
    elements.fadeOutLevelInput.value = String(state.fadeOutLevel);
  }
  if (elements.fadeOutLevelValue) {
    elements.fadeOutLevelValue.textContent = String(state.fadeOutLevel);
  }
}

function setFadeOutLevel(level) {
  var nextLevel = clampLevel("fadeout", level, 1, 10);
  state.fadeOutLevel = nextLevel;
  updateFadeOutLevelUI();
  startFadeOutAnimation();
}

function resetFadeOutCycle() {
  if (!state.challengeFadeOut) {
    return;
  }
  state.fadeOutStartAt = performance.now();
  clearFadeOutCanvas();
  startFadeOutAnimation();
}

function syncFadeOutCanvas() {
  if (!refs.fadeOutCanvas || !refs.board) {
    return;
  }
  var ref = refs.board.canvas || refs.board.cursorCanvas || refs.board.board;
  if (!ref) {
    return;
  }
  var dpr = window.devicePixelRatio || 1;
  refs.fadeOutCanvas.width = ref.width;
  refs.fadeOutCanvas.height = ref.height;
  refs.fadeOutCanvas.style.width = ref.width / dpr + "px";
  refs.fadeOutCanvas.style.height = ref.height / dpr + "px";
}

function clearFadeOutCanvas() {
  if (!refs.fadeOutCanvas) {
    return;
  }
  var ctx = refs.fadeOutCanvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, refs.fadeOutCanvas.width, refs.fadeOutCanvas.height);
  }
}

function hideFadeOutCountdown() {
  if (!refs.fadeOutTimerEl) {
    return;
  }
  refs.fadeOutTimerEl.style.display = "none";
  refs.fadeOutTimerEl.textContent = "";
  lastCountdownValue = null;
}

function updateFadeOutCountdown(timestamp) {
  if (!refs.fadeOutTimerEl) {
    return;
  }
  if (!state.challengeFadeOut || !state.fadeOutStartAt) {
    hideFadeOutCountdown();
    return;
  }
  var delayMs = getFadeOutDelaySeconds() * 1000;
  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    hideFadeOutCountdown();
    return;
  }
  var elapsed = timestamp - state.fadeOutStartAt;
  if (elapsed >= delayMs) {
    hideFadeOutCountdown();
    return;
  }
  var remaining = Math.max(0, Math.floor((delayMs - elapsed) / 1000));
  if (remaining !== lastCountdownValue) {
    refs.fadeOutTimerEl.textContent = String(remaining);
    lastCountdownValue = remaining;
  }
  if (refs.fadeOutTimerEl.style.display !== "block") {
    refs.fadeOutTimerEl.style.display = "block";
  }
}

function getFadeOutProgress(timestamp) {
  if (!state.fadeOutStartAt) {
    return 0;
  }
  var delayMs = getFadeOutDelaySeconds() * 1000;
  var fadeMs = getFadeOutDuration(state.fadeOutLevel) * 1000;
  if (!Number.isFinite(delayMs)) {
    delayMs = 0;
  }
  if (!Number.isFinite(fadeMs)) {
    fadeMs = 0;
  }
  var elapsed = timestamp - state.fadeOutStartAt;
  if (elapsed <= delayMs) {
    return 0;
  }
  if (fadeMs <= 0) {
    return 1;
  }
  var progress = (elapsed - delayMs) / fadeMs;
  if (!Number.isFinite(progress)) {
    return 0;
  }
  return Math.max(0, Math.min(1, progress));
}

function shouldContinueFade(timestamp) {
  if (!state.fadeOutStartAt) {
    return false;
  }
  var delayMs = getFadeOutDelaySeconds() * 1000;
  var fadeMs = getFadeOutDuration(state.fadeOutLevel) * 1000;
  if (!Number.isFinite(delayMs)) {
    delayMs = 0;
  }
  if (!Number.isFinite(fadeMs)) {
    fadeMs = 0;
  }
  var endAt = state.fadeOutStartAt + delayMs + fadeMs;
  return timestamp < endAt;
}

function getFadeOutMat() {
  if (!state.currentMat) {
    return null;
  }
  if (state.challengeGhost && app.ghost && app.ghost.applyGhostMask) {
    return app.ghost.applyGhostMask(state.currentMat);
  }
  return state.currentMat;
}

function drawFadeOutStones(ctx, mat, progress) {
  if (!mat || !refs.board) {
    return;
  }
  var ref = refs.board.canvas || refs.board.cursorCanvas || refs.board.board;
  if (!ref) {
    return;
  }
  var spacing = refs.board.calcSpaceAndPadding
    ? refs.board.calcSpaceAndPadding(ref)
    : { space: 0, scaledPadding: 0 };
  var space = spacing.space;
  var scaledPadding = spacing.scaledPadding;
  if (!space) {
    return;
  }
  var themeOptions = refs.board.options.themeOptions || {};
  var theme = refs.board.options.theme;
  var ratio =
    (themeOptions[theme] && themeOptions[theme].stoneRatio) ||
    (themeOptions.default && themeOptions.default.stoneRatio) ||
    0.45;
  var radius = space * ratio;
  var colors = getFadeOutThemeColors();
  var gray = { r: 185, g: 185, b: 185 };
  var grayStroke = { r: 80, g: 80, b: 80 };
  var t = Math.max(0, Math.min(1, progress));
  var blackFill = rgbToCss(mixRgb(colors.black, gray, t));
  var whiteFill = rgbToCss(mixRgb(colors.white, gray, t));
  var stroke = rgbToCss(mixRgb(colors.line, grayStroke, t));
  var maskFill = rgbToCss(colors.background);
  var lineWidth = Math.max(space * 0.05, 1);
  var maskRadius = radius * 1.08;
  var stoneRadius = radius * 1.02;

  ctx.save();
  ctx.setTransform(refs.board.transMat);
  ctx.lineWidth = lineWidth;
  for (var i = 0; i < mat.length; i += 1) {
    if (!mat[i]) {
      continue;
    }
    for (var j = 0; j < mat[i].length; j += 1) {
      if (mat[i][j] === GB.Ki.Empty) {
        continue;
      }
      var cx = scaledPadding + i * space;
      var cy = scaledPadding + j * space;
      ctx.fillStyle = maskFill;
      ctx.beginPath();
      ctx.arc(cx, cy, maskRadius, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.fillStyle = mat[i][j] === GB.Ki.White ? whiteFill : blackFill;
      ctx.strokeStyle = stroke;
      ctx.beginPath();
      ctx.arc(cx, cy, stoneRadius, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFadeOut(timestamp) {
  updateFadeOutCountdown(timestamp);
  if (!refs.fadeOutCanvas || !refs.board) {
    refs.fadeOutAnimId = null;
    return;
  }
  syncFadeOutCanvas();
  var ctx = refs.fadeOutCanvas.getContext("2d");
  if (!ctx) {
    refs.fadeOutAnimId = null;
    return;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, refs.fadeOutCanvas.width, refs.fadeOutCanvas.height);

  if (!state.challengeFadeOut) {
    hideFadeOutCountdown();
    refs.fadeOutAnimId = null;
    return;
  }

  var mat = getFadeOutMat();
  if (!mat) {
    refs.fadeOutAnimId = null;
    return;
  }

  var progress = getFadeOutProgress(timestamp);
  if (progress > 0) {
    var renderWidth = refs.fadeOutCanvas.width;
    var renderHeight = refs.fadeOutCanvas.height;
    if (
      !renderBuffer ||
      renderBuffer.width !== renderWidth ||
      renderBuffer.height !== renderHeight
    ) {
      renderBuffer = document.createElement("canvas");
      renderBuffer.width = renderWidth;
      renderBuffer.height = renderHeight;
      renderCtx = renderBuffer.getContext("2d");
    }
    if (!renderCtx) {
      refs.fadeOutAnimId = null;
      return;
    }
    renderCtx.setTransform(1, 0, 0, 1, 0, 0);
    renderCtx.clearRect(0, 0, renderWidth, renderHeight);
    drawFadeOutStones(renderCtx, mat, progress);

    var pixelSize = getFadeOutPixelSize(progress);
    if (pixelSize > 1) {
      var targetWidth = Math.max(
        1,
        Math.round(renderWidth / pixelSize)
      );
      var targetHeight = Math.max(
        1,
        Math.round(renderHeight / pixelSize)
      );
      if (
        !pixelBuffer ||
        pixelBuffer.width !== targetWidth ||
        pixelBuffer.height !== targetHeight
      ) {
        pixelBuffer = document.createElement("canvas");
        pixelBuffer.width = targetWidth;
        pixelBuffer.height = targetHeight;
        pixelCtx = pixelBuffer.getContext("2d");
      }
      if (pixelCtx) {
        pixelCtx.setTransform(1, 0, 0, 1, 0, 0);
        pixelCtx.clearRect(0, 0, pixelBuffer.width, pixelBuffer.height);
        pixelCtx.imageSmoothingEnabled = false;
        pixelCtx.drawImage(
          renderBuffer,
          0,
          0,
          renderWidth,
          renderHeight,
          0,
          0,
          pixelBuffer.width,
          pixelBuffer.height
        );
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          pixelBuffer,
          0,
          0,
          pixelBuffer.width,
          pixelBuffer.height,
          0,
          0,
          refs.fadeOutCanvas.width,
          refs.fadeOutCanvas.height
        );
        ctx.restore();
      }
    } else {
      ctx.drawImage(renderBuffer, 0, 0);
    }
  }

  if (shouldContinueFade(timestamp)) {
    refs.fadeOutAnimId = requestAnimationFrame(drawFadeOut);
  } else {
    refs.fadeOutAnimId = null;
  }
}

function startFadeOutAnimation() {
  if (!state.challengeFadeOut) {
    stopFadeOutAnimation();
    return;
  }
  if (!state.fadeOutStartAt) {
    state.fadeOutStartAt = performance.now();
  }
  if (refs.fadeOutAnimId) {
    return;
  }
  refs.fadeOutAnimId = requestAnimationFrame(drawFadeOut);
}

function stopFadeOutAnimation() {
  if (refs.fadeOutAnimId) {
    cancelAnimationFrame(refs.fadeOutAnimId);
    refs.fadeOutAnimId = null;
  }
  clearFadeOutCanvas();
  hideFadeOutCountdown();
}

app.fadeout.updateFadeOutLevelUI = updateFadeOutLevelUI;
app.fadeout.setFadeOutLevel = setFadeOutLevel;
app.fadeout.resetFadeOutCycle = resetFadeOutCycle;
app.fadeout.startFadeOutAnimation = startFadeOutAnimation;
app.fadeout.stopFadeOutAnimation = stopFadeOutAnimation;
app.fadeout.clearFadeOutCanvas = clearFadeOutCanvas;
