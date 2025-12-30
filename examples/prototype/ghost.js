import { app } from "./context.js";

var GB = app.GB;
var state = app.state;
var refs = app.refs;

function recordGhostStone(i, j, ki) {
  if (!state.challengeGhost) {
    return;
  }
  if (i < 0 || j < 0) {
    return;
  }
  state.ghostStones.add(i + "," + j);
  var now = performance.now();
  var duration = getGhostVisibleDuration(state.ghostLevel);
  state.ghostFlashes.push({
    i: i,
    j: j,
    ki: ki,
    start: now,
    duration: duration,
  });
  triggerGhostReveal(now);
  startGhostAnimation();
}

function clearGhostCanvas() {
  if (!refs.ghostCanvas) {
    return;
  }
  var ctx = refs.ghostCanvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, refs.ghostCanvas.width, refs.ghostCanvas.height);
  }
}

function syncGhostCanvas() {
  if (!refs.ghostCanvas || !refs.board) {
    return;
  }
  var ref = refs.board.canvas || refs.board.cursorCanvas || refs.board.board;
  if (!ref) {
    return;
  }
  var dpr = window.devicePixelRatio || 1;
  refs.ghostCanvas.width = ref.width;
  refs.ghostCanvas.height = ref.height;
  refs.ghostCanvas.style.width = ref.width / dpr + "px";
  refs.ghostCanvas.style.height = ref.height / dpr + "px";
}

function drawGhostFlashes(timestamp) {
  if (!refs.ghostCanvas || !refs.board) {
    refs.ghostAnimId = null;
    return;
  }
  syncGhostCanvas();
  var ctx = refs.ghostCanvas.getContext("2d");
  if (!ctx) {
    refs.ghostAnimId = null;
    return;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, refs.ghostCanvas.width, refs.ghostCanvas.height);

  if (!state.challengeGhost) {
    refs.ghostAnimId = null;
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

  var hasActive = false;
  var remaining = [];
  var revealActive = state.ghostRevealUntil > 0 && state.ghostRevealUntil > timestamp;

  if (revealActive && state.ghostStones.size > 0 && state.currentMat) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    state.ghostStones.forEach(function (key) {
      if (state.challengeInfection && state.infectionPoints.has(key)) {
        return;
      }
      var parts = key.split(",");
      var x = Number(parts[0]);
      var y = Number(parts[1]);
      if (
        Number.isNaN(x) ||
        Number.isNaN(y) ||
        !state.currentMat[x] ||
        state.currentMat[x][y] === GB.Ki.Empty
      ) {
        return;
      }
      var cx = scaledPadding + x * space;
      var cy = scaledPadding + y * space;
      ctx.fillStyle = state.currentMat[x][y] === GB.Ki.White ? white : black;
      ctx.strokeStyle = line;
      ctx.lineWidth = Math.max(space * 0.05, 1);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
    hasActive = true;
  }

  if (state.ghostRevealUntil && state.ghostRevealUntil <= timestamp) {
    state.ghostRevealUntil = 0;
  }

  for (var i = 0; i < state.ghostFlashes.length; i += 1) {
    var flash = state.ghostFlashes[i];
    if (state.challengeInfection && state.infectionPoints.has(flash.i + "," + flash.j)) {
      continue;
    }
    var duration = flash.duration || 500;
    var elapsed = timestamp - flash.start;
    if (elapsed >= duration) {
      continue;
    }
    var alpha = 1 - elapsed / duration;
    var cx = scaledPadding + flash.i * space;
    var cy = scaledPadding + flash.j * space;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = flash.ki === GB.Ki.White ? white : black;
    ctx.strokeStyle = line;
    ctx.lineWidth = Math.max(space * 0.05, 1);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    remaining.push(flash);
    hasActive = true;
  }

  state.ghostFlashes = remaining;
  if (hasActive) {
    refs.ghostAnimId = requestAnimationFrame(drawGhostFlashes);
  } else {
    refs.ghostAnimId = null;
  }
}

function startGhostAnimation() {
  if (refs.ghostAnimId) {
    return;
  }
  refs.ghostAnimId = requestAnimationFrame(drawGhostFlashes);
}

function getGhostVisibleDuration(level) {
  var safeLevel = Math.max(1, Number(level) || 1);
  return Math.max(500, 5000 - (safeLevel - 1) * 1000);
}

function getGhostRevealDuration(level) {
  var safeLevel = Math.max(1, Number(level) || 1);
  var seconds = 2 - (safeLevel - 1);
  return Math.max(0, seconds) * 1000;
}

function updateGhostLevelUI() {
  if (app.elements.ghostLevelInput) {
    app.elements.ghostLevelInput.value = String(state.ghostLevel);
  }
  if (app.elements.ghostLevelValue) {
    app.elements.ghostLevelValue.textContent = String(state.ghostLevel);
  }
}

function setGhostLevel(level) {
  var nextLevel = Math.max(1, Number(level) || 1);
  state.ghostLevel = nextLevel;
  updateGhostLevelUI();
}

function triggerGhostReveal(now) {
  if (!state.challengeGhost) {
    return;
  }
  var duration = getGhostRevealDuration(state.ghostLevel);
  if (duration <= 0) {
    state.ghostRevealUntil = 0;
    return;
  }
  var base = now || performance.now();
  state.ghostRevealUntil = base + duration;
  startGhostAnimation();
}

function applyGhostMask(mat) {
  if (!state.challengeGhost || state.ghostStones.size === 0) {
    return mat;
  }
  var masked = mat.map(function (row) {
    return row.slice();
  });
  var stale = [];
  state.ghostStones.forEach(function (key) {
    var parts = key.split(",");
    var x = Number(parts[0]);
    var y = Number(parts[1]);
    if (Number.isNaN(x) || Number.isNaN(y)) {
      return;
    }
    if (!masked[x] || masked[x][y] === GB.Ki.Empty) {
      stale.push(key);
      return;
    }
    masked[x][y] = GB.Ki.Empty;
  });
  stale.forEach(function (key) {
    state.ghostStones.delete(key);
  });
  return masked;
}

app.ghost.recordGhostStone = recordGhostStone;
app.ghost.clearGhostCanvas = clearGhostCanvas;
app.ghost.startGhostAnimation = startGhostAnimation;
app.ghost.getGhostVisibleDuration = getGhostVisibleDuration;
app.ghost.getGhostRevealDuration = getGhostRevealDuration;
app.ghost.updateGhostLevelUI = updateGhostLevelUI;
app.ghost.setGhostLevel = setGhostLevel;
app.ghost.triggerGhostReveal = triggerGhostReveal;
app.ghost.applyGhostMask = applyGhostMask;
