import { app } from "./context.js";

var refs = app.refs;
var state = {
  particles: [],
  rings: [],
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
  state.running = false;
  clearFxCanvas();
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

function drawParticles(ctx, particles) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, refs.fxCanvas.width, refs.fxCanvas.height);
  ctx.globalCompositeOperation = "source-over";
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
  state.particles = next;
  state.rings = nextRings;
  var ctx = refs.fxCanvas.getContext("2d");
  if (ctx) {
    drawParticles(ctx, state.particles);
  }
  if (state.particles.length > 0 || state.rings.length > 0) {
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

app.effects.syncFxCanvas = syncFxCanvas;
app.effects.clearFxCanvas = clearFxCanvas;
app.effects.stopFxAnimation = stopFxAnimation;
app.effects.triggerTimerShatter = triggerTimerShatter;
