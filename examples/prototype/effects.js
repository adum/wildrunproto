import { app } from "./context.js";

var refs = app.refs;
var state = {
  particles: [],
  rings: [],
  badMoves: [],
  lastTime: 0,
  running: false,
};

function getNumber(value, fallback) {
  var num = Number(value);
  if (Number.isFinite(num)) {
    return num;
  }
  return fallback;
}

function syncFxCanvas() {
  if (!refs.fxCanvas || !refs.board) {
    return;
  }
  var ref = refs.board.canvas || refs.board.cursorCanvas || refs.board.board;
  if (!ref) {
    return;
  }
  var dpr = window.devicePixelRatio || 1;
  refs.fxCanvas.width = ref.width;
  refs.fxCanvas.height = ref.height;
  refs.fxCanvas.style.width = ref.width / dpr + "px";
  refs.fxCanvas.style.height = ref.height / dpr + "px";
}

function clearFxCanvas() {
  if (!refs.fxCanvas) {
    return;
  }
  var ctx = refs.fxCanvas.getContext("2d");
  if (!ctx) {
    return;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, refs.fxCanvas.width, refs.fxCanvas.height);
}

function stopFxAnimation() {
  if (refs.fxAnimId) {
    cancelAnimationFrame(refs.fxAnimId);
    refs.fxAnimId = null;
  }
  state.particles = [];
  state.rings = [];
  state.badMoves = [];
  state.running = false;
  clearFxCanvas();
}

function getBoardStyle() {
  if (!refs.board) {
    return null;
  }
  var canvas = refs.board.canvas || refs.board.cursorCanvas || refs.board.board;
  if (!canvas || !refs.board.calcSpaceAndPadding) {
    return null;
  }
  var spacing = refs.board.calcSpaceAndPadding(canvas);
  var themeOptions = refs.board.options.themeOptions || {};
  var theme = refs.board.options.theme;
  var themeConfig = themeOptions[theme] || {};
  var defaultConfig = themeOptions.default || {};
  return {
    space: spacing.space,
    scaledPadding: spacing.scaledPadding,
    ratio: themeConfig.stoneRatio || defaultConfig.stoneRatio || 0.45,
    black: themeConfig.flatBlackColor || defaultConfig.flatBlackColor || "#000",
    white: themeConfig.flatWhiteColor || defaultConfig.flatWhiteColor || "#fff",
    line: themeConfig.boardLineColor || defaultConfig.boardLineColor || "#5a4c3b",
    transMat: refs.board.transMat,
  };
}

function toCanvasPoint(i, j, radius) {
  var style = getBoardStyle();
  if (!style) {
    return null;
  }
  var x = style.scaledPadding + i * style.space;
  var y = style.scaledPadding + j * style.space;
  var point = new DOMPoint(x, y);
  var radiusPoint = new DOMPoint(x + radius, y);
  var mat = style.transMat;
  if (mat && typeof mat.transformPoint === "function") {
    point = mat.transformPoint(point);
    radiusPoint = mat.transformPoint(radiusPoint);
  }
  var radiusPx = Math.abs(radiusPoint.x - point.x);
  return {
    x: point.x,
    y: point.y,
    radius: radiusPx,
    black: style.black,
    white: style.white,
    line: style.line,
  };
}

function getElementCenter(el) {
  var boardEl = app.elements.mount;
  if (!el || !boardEl) {
    return null;
  }
  var rect = el.getBoundingClientRect();
  var boardRect = boardEl.getBoundingClientRect();
  if (!rect || !boardRect) {
    return null;
  }
  var dpr = window.devicePixelRatio || 1;
  var width = rect.width || 0;
  var height = rect.height || 0;
  if (width <= 0 || height <= 0) {
    return {
      x: (boardRect.width * 0.5) * dpr,
      y: (boardRect.height * 0.22) * dpr,
    };
  }
  return {
    x: (rect.left - boardRect.left + rect.width * 0.5) * dpr,
    y: (rect.top - boardRect.top + rect.height * 0.5) * dpr,
  };
}

function sampleTextPoints(text, style) {
  var fontSize = getNumber(style.fontSize && style.fontSize.replace("px", ""), 14);
  var fontWeight = style.fontWeight || "700";
  var fontFamily = style.fontFamily || "sans-serif";
  var dpr = window.devicePixelRatio || 1;
  var off = document.createElement("canvas");
  var ctx = off.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.font = fontWeight + " " + fontSize + "px " + fontFamily;
  var metrics = ctx.measureText(text);
  var pad = fontSize * 0.4;
  var width = Math.ceil(metrics.width + pad * 2);
  var height = Math.ceil(fontSize * 1.4 + pad * 2);
  off.width = Math.max(1, Math.ceil(width * dpr));
  off.height = Math.max(1, Math.ceil(height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = fontWeight + " " + fontSize + "px " + fontFamily;
  ctx.fillStyle = style.color || "#fff8ea";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);
  var data = ctx.getImageData(0, 0, off.width, off.height).data;
  var step = Math.max(2, Math.round(dpr * 2));
  var points = [];
  for (var y = 0; y < off.height; y += step) {
    for (var x = 0; x < off.width; x += step) {
      var index = (y * off.width + x) * 4 + 3;
      if (data[index] > 60) {
        points.push({ x: x, y: y });
      }
    }
  }
  return {
    points: points,
    width: off.width,
    height: off.height,
    color: style.color || "#fff8ea",
  };
}

function buildParticles(text, center, style) {
  var sample = sampleTextPoints(text, style);
  if (!sample || sample.points.length === 0) {
    return [];
  }
  var maxParticles = 240;
  var points = sample.points;
  if (points.length > maxParticles) {
    var shuffled = points.slice();
    for (var i = shuffled.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    points = shuffled.slice(0, maxParticles);
  }
  var particles = [];
  var width = sample.width;
  var height = sample.height;
  var baseSpeed = 150;
  points.forEach(function (point) {
    var dx = point.x - width / 2;
    var dy = point.y - height / 2;
    var angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.6;
    var speed = baseSpeed * (0.6 + Math.random() * 0.8);
    particles.push({
      x: center.x + dx,
      y: center.y + dy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40 * Math.random(),
      life: 560 + Math.random() * 360,
      age: 0,
      size: 20 + Math.random() * 13,
      color: sample.color,
    });
  });
  return particles;
}

function drawBadMoves(ctx, badMoves) {
  if (!badMoves || badMoves.length === 0) {
    return;
  }
  ctx.save();
  ctx.shadowBlur = 0;
  badMoves.forEach(function (move) {
    var age = move.age || 0;
    var hold = move.hold || 0;
    var duration = move.duration || 1;
    var alpha = 1;
    var fill = move.baseColor;
    var stroke = move.lineColor;
    if (age >= hold) {
      var t = Math.min(1, (age - hold) / Math.max(1, duration - hold));
      alpha = Math.max(0, 1 - t);
      fill = "rgba(210, 60, 50, 0.95)";
      stroke = "rgba(120, 40, 30, 0.85)";
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, move.radius * 0.08);
    ctx.beginPath();
    ctx.arc(move.x, move.y, move.radius, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawParticles(ctx, particles, badMoves) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, refs.fxCanvas.width, refs.fxCanvas.height);
  ctx.globalCompositeOperation = "source-over";
  drawBadMoves(ctx, badMoves);
  state.rings.forEach(function (ring) {
    var t = ring.age / ring.life;
    var alpha = Math.max(0, 1 - t);
    if (alpha <= 0) {
      return;
    }
    var radius = ring.radius + t * ring.grow;
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = ring.width;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2, true);
    ctx.stroke();
  });
  ctx.shadowColor = "rgba(90, 40, 15, 0.45)";
  ctx.shadowBlur = 12;
  particles.forEach(function (particle) {
    var t = particle.age / particle.life;
    var alpha = Math.max(0, 1 - t);
    if (alpha <= 0) {
      return;
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = "source-over";
}

function spawnBadMoveShards(move) {
  var count = Math.max(12, Math.min(24, Math.round(move.radius * 0.8)));
  var shardColor = "rgba(210, 60, 50, 0.95)";
  for (var i = 0; i < count; i += 1) {
    var angle = Math.random() * Math.PI * 2;
    var speed = 140 + Math.random() * 140;
    var life = 200 + Math.random() * 140;
    var size = Math.max(2, move.radius * (0.12 + Math.random() * 0.12));
    state.particles.push({
      x: move.x + Math.cos(angle) * move.radius * 0.2,
      y: move.y + Math.sin(angle) * move.radius * 0.2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60 * Math.random(),
      life: life,
      age: 0,
      size: size,
      color: shardColor,
    });
  }
  state.rings.push({
    x: move.x,
    y: move.y,
    radius: move.radius * 0.4,
    grow: move.radius * 1.3,
    width: Math.max(2, move.radius * 0.2),
    age: 0,
    life: 200,
    color: "rgba(190, 50, 40, 0.55)",
  });
}

function tickFx(timestamp) {
  if (!refs.fxCanvas) {
    refs.fxAnimId = null;
    state.running = false;
    return;
  }
  if (!state.running) {
    state.running = true;
    state.lastTime = timestamp;
  }
  var dt = Math.min(0.05, (timestamp - state.lastTime) / 1000);
  state.lastTime = timestamp;
  var gravity = 300;
  var next = [];
  state.particles.forEach(function (particle) {
    particle.age += dt * 1000;
    if (particle.age >= particle.life) {
      return;
    }
    particle.vx *= 0.96;
    particle.vy += gravity * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    next.push(particle);
  });
  var nextRings = [];
  state.rings.forEach(function (ring) {
    ring.age += dt * 1000;
    if (ring.age < ring.life) {
      nextRings.push(ring);
    }
  });
  var nextBadMoves = [];
  state.badMoves.forEach(function (move) {
    move.age = timestamp - move.start;
    if (move.age >= move.duration) {
      return;
    }
    if (move.age >= move.hold && !move.shattered) {
      move.shattered = true;
      spawnBadMoveShards(move);
    }
    nextBadMoves.push(move);
  });
  state.particles = next;
  state.rings = nextRings;
  state.badMoves = nextBadMoves;
  var ctx = refs.fxCanvas.getContext("2d");
  if (ctx) {
    drawParticles(ctx, state.particles, state.badMoves);
  }
  if (
    state.particles.length > 0 ||
    state.rings.length > 0 ||
    state.badMoves.length > 0
  ) {
    refs.fxAnimId = requestAnimationFrame(tickFx);
  } else {
    refs.fxAnimId = null;
    state.running = false;
    clearFxCanvas();
  }
}

function triggerTimerShatter(sourceEl) {
  if (!refs.fxCanvas || !refs.board) {
    return;
  }
  syncFxCanvas();
  var center = getElementCenter(sourceEl);
  if (!center) {
    return;
  }
  var text = sourceEl && sourceEl.textContent ? sourceEl.textContent.trim() : "0";
  if (!text) {
    text = "0";
  }
  var baseStyle = sourceEl
    ? window.getComputedStyle(sourceEl)
    : {
        fontSize: "14px",
        fontWeight: "700",
        fontFamily: "sans-serif",
        color: "#fff8ea",
      };
  var style = {
    fontSize: baseStyle.fontSize,
    fontWeight: baseStyle.fontWeight,
    fontFamily: baseStyle.fontFamily,
    color: "rgba(110, 60, 30, 0.95)",
  };
  var particles = buildParticles(text, center, style);
  if (particles.length === 0) {
    return;
  }
  state.particles = state.particles.concat(particles);
  state.rings.push({
    x: center.x,
    y: center.y,
    radius: 14,
    grow: 44,
    width: 3,
    age: 0,
    life: 260,
    color: "rgba(120, 60, 30, 0.6)",
  });
  if (!refs.fxAnimId) {
    refs.fxAnimId = requestAnimationFrame(tickFx);
  }
}

function triggerBadMoveShatter(i, j, ki) {
  if (!refs.fxCanvas || !refs.board) {
    return;
  }
  syncFxCanvas();
  var style = getBoardStyle();
  if (!style || style.space <= 0) {
    return;
  }
  var radius = style.space * style.ratio;
  var point = toCanvasPoint(i, j, radius);
  if (!point) {
    return;
  }
  var baseColor = ki === app.GB.Ki.White ? point.white : point.black;
  state.badMoves.push({
    x: point.x,
    y: point.y,
    radius: point.radius,
    baseColor: baseColor,
    lineColor: point.line,
    start: performance.now(),
    hold: 180,
    duration: 500,
    age: 0,
    shattered: false,
  });
  if (!refs.fxAnimId) {
    refs.fxAnimId = requestAnimationFrame(tickFx);
  }
}

app.effects.syncFxCanvas = syncFxCanvas;
app.effects.clearFxCanvas = clearFxCanvas;
app.effects.stopFxAnimation = stopFxAnimation;
app.effects.triggerTimerShatter = triggerTimerShatter;
app.effects.triggerBadMoveShatter = triggerBadMoveShatter;
