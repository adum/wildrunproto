import { app } from "./context.js";

var GB = app.GB;
var state = app.state;
var refs = app.refs;

function renderGrayStones(mat) {
  if (!refs.grayCanvas || !refs.board) {
    return;
  }
  var ref = refs.board.canvas || refs.board.cursorCanvas || refs.board.board;
  if (!ref) {
    return;
  }
  var dpr = window.devicePixelRatio || 1;
  refs.grayCanvas.width = ref.width;
  refs.grayCanvas.height = ref.height;
  refs.grayCanvas.style.width = ref.width / dpr + "px";
  refs.grayCanvas.style.height = ref.height / dpr + "px";

  var ctx = refs.grayCanvas.getContext("2d");
  if (!ctx) {
    return;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, refs.grayCanvas.width, refs.grayCanvas.height);

  var hasMystery =
    state.challengeMystery &&
    state.mysteryStoneKeys.length > 0 &&
    !state.mysteryRevealed;
  if ((!state.challengeGray && !hasMystery) || !mat) {
    return;
  }

  ctx.setTransform(refs.board.transMat);
  var spacing = refs.board.calcSpaceAndPadding
    ? refs.board.calcSpaceAndPadding(ref)
    : { space: 0, scaledPadding: 0 };
  var space = spacing.space;
  var scaledPadding = spacing.scaledPadding;
  var themeOptions = refs.board.options.themeOptions || {};
  var theme = refs.board.options.theme;
  var ratio =
    (themeOptions[theme] && themeOptions[theme].stoneRatio) ||
    (themeOptions.default && themeOptions.default.stoneRatio) ||
    0.45;
  var radius = space * ratio;

  ctx.fillStyle = "#b9b9b9";
  ctx.strokeStyle = "rgba(80, 80, 80, 0.6)";
  ctx.lineWidth = Math.max(space * 0.05, 1);

  if (state.challengeGray) {
    state.grayStones.forEach(function (key) {
      var parts = key.split(",");
      var x = Number(parts[0]);
      var y = Number(parts[1]);
      if (Number.isNaN(x) || Number.isNaN(y)) {
        return;
      }
      if (!mat[x] || mat[x][y] === GB.Ki.Empty) {
        return;
      }
      if (state.challengeInfection && state.infectionPoints.has(key)) {
        return;
      }
      var cx = scaledPadding + x * space;
      var cy = scaledPadding + y * space;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.stroke();
    });
  }

  if (hasMystery) {
    state.mysteryStoneKeys.forEach(function (key) {
      var parts = key.split(",");
      var mx = Number(parts[0]);
      var my = Number(parts[1]);
      if (
        Number.isNaN(mx) ||
        Number.isNaN(my) ||
        !mat[mx] ||
        mat[mx][my] === GB.Ki.Empty
      ) {
        return;
      }
      if (state.challengeInfection && state.infectionPoints.has(key)) {
        return;
      }
      var mxp = scaledPadding + mx * space;
      var myp = scaledPadding + my * space;
      ctx.beginPath();
      ctx.arc(mxp, myp, radius, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.stroke();
    });
  }
}

function collectEnigmaCandidates(mat) {
  var stones = [];
  var emptyAdj = new Set();
  if (!mat) {
    return { stones: stones, empties: [] };
  }
  var size = mat.length;
  var offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (var i = 0; i < size; i += 1) {
    for (var j = 0; j < size; j += 1) {
      if (mat[i][j] === GB.Ki.Empty) {
        continue;
      }
      stones.push({ i: i, j: j });
      for (var k = 0; k < offsets.length; k += 1) {
        var ni = i + offsets[k][0];
        var nj = j + offsets[k][1];
        if (ni < 0 || nj < 0 || ni >= size || nj >= size) {
          continue;
        }
        if (mat[ni][nj] === GB.Ki.Empty) {
          emptyAdj.add(ni + "," + nj);
        }
      }
    }
  }
  var empties = [];
  emptyAdj.forEach(function (key) {
    var parts = key.split(",");
    var x = Number(parts[0]);
    var y = Number(parts[1]);
    if (!Number.isNaN(x) && !Number.isNaN(y)) {
      empties.push({ i: x, j: y });
    }
  });
  return { stones: stones, empties: empties };
}

function ensureEnigmaPoints(mat) {
  if (
    !state.challengeEnigma ||
    state.enigmaPoints.length > 0 ||
    state.enigmaRevealed
  ) {
    return;
  }
  if (!mat || mat.length === 0) {
    return;
  }
  var candidates = collectEnigmaCandidates(mat);
  var stones = candidates.stones;
  var empties = candidates.empties;
  if (stones.length === 0 && empties.length === 0) {
    state.enigmaRevealed = true;
    return;
  }
  for (var k = stones.length - 1; k > 0; k -= 1) {
    var swap = Math.floor(Math.random() * (k + 1));
    var temp = stones[k];
    stones[k] = stones[swap];
    stones[swap] = temp;
  }
  for (var m = empties.length - 1; m > 0; m -= 1) {
    var swapEmpty = Math.floor(Math.random() * (m + 1));
    var tempEmpty = empties[m];
    empties[m] = empties[swapEmpty];
    empties[swapEmpty] = tempEmpty;
  }
  var count = Math.min(
    app.timers.getEnigmaPointCount(state.enigmaLevel),
    stones.length + empties.length
  );
  var picked = [];
  for (var n = 0; n < count; n += 1) {
    var pickEmpty = Math.random() < 0.5;
    var pool = pickEmpty ? empties : stones;
    var fallback = pickEmpty ? stones : empties;
    if (pool.length === 0) {
      pool = fallback;
    }
    if (pool.length === 0) {
      break;
    }
    picked.push(pool.pop());
  }
  state.enigmaPoints = picked;
}

function syncEnigmaCanvas() {
  if (!refs.enigmaCanvas || !refs.board) {
    return;
  }
  var ref = refs.board.canvas || refs.board.cursorCanvas || refs.board.board;
  if (!ref) {
    return;
  }
  var dpr = window.devicePixelRatio || 1;
  refs.enigmaCanvas.width = ref.width;
  refs.enigmaCanvas.height = ref.height;
  refs.enigmaCanvas.style.width = ref.width / dpr + "px";
  refs.enigmaCanvas.style.height = ref.height / dpr + "px";
}

function clearEnigmaCanvas() {
  if (!refs.enigmaCanvas) {
    return;
  }
  var ctx = refs.enigmaCanvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, refs.enigmaCanvas.width, refs.enigmaCanvas.height);
  }
}

function renderEnigmaOverlay() {
  if (!refs.enigmaCanvas || !refs.board) {
    return;
  }
  syncEnigmaCanvas();
  var ctx = refs.enigmaCanvas.getContext("2d");
  if (!ctx) {
    return;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, refs.enigmaCanvas.width, refs.enigmaCanvas.height);

  var showEnigma = state.challengeEnigma && !state.enigmaRevealed;
  var showInfection = state.challengeInfection && state.infectionPoints.size > 0;
  if (!showEnigma && !showInfection) {
    return;
  }

  if (showEnigma) {
    ensureEnigmaPoints(state.currentMat);
  }

  ctx.setTransform(refs.board.transMat);
  var spacing = refs.board.calcSpaceAndPadding
    ? refs.board.calcSpaceAndPadding(
        refs.board.canvas || refs.board.cursorCanvas || refs.board.board
      )
    : { space: 0, scaledPadding: 0 };
  var space = spacing.space;
  var scaledPadding = spacing.scaledPadding;
  var radius = space * 0.32;
  var ringLineWidth = Math.max(space * 0.045, 1);
  var ringDash = [space * 0.12, space * 0.08];
  var themeOptions = refs.board.options.themeOptions || {};
  var theme = refs.board.options.theme;
  var themeConfig = themeOptions[theme] || {};
  var defaultConfig = themeOptions.default || {};
  var line = themeConfig.boardLineColor || defaultConfig.boardLineColor || "#5a4c3b";
  var background =
    themeConfig.boardBackgroundColor ||
    defaultConfig.boardBackgroundColor ||
    "#e6bb85";
  var stoneRatio = themeConfig.stoneRatio || defaultConfig.stoneRatio || 0.45;
  var stoneRadius = space * stoneRatio;
  var maskRadius = Math.max(stoneRadius * 1.05, radius + space * 0.08);

  if (showEnigma && state.enigmaPoints.length > 0) {
    state.enigmaPoints.forEach(function (point) {
      var cx = scaledPadding + point.i * space;
      var cy = scaledPadding + point.j * space;
      var hasStone =
        state.currentMat &&
        state.currentMat[point.i] &&
        state.currentMat[point.i][point.j] !== GB.Ki.Empty;

      if (hasStone) {
        ctx.save();
        ctx.fillStyle = background;
        ctx.beginPath();
        ctx.arc(cx, cy, maskRadius, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.strokeStyle = line;
        ctx.lineWidth = Math.max(space * 0.04, 1);
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(cx - maskRadius, cy);
        ctx.lineTo(cx + maskRadius, cy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy - maskRadius);
        ctx.lineTo(cx, cy + maskRadius);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = "rgba(110, 120, 130, 0.7)";
      ctx.lineWidth = ringLineWidth;
      ctx.setLineDash(ringDash);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
      ctx.stroke();
      ctx.restore();
    });
  }

  if (showInfection && state.infectionPoints.size > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(110, 120, 130, 0.7)";
    ctx.lineWidth = ringLineWidth;
    ctx.setLineDash(ringDash);
    state.infectionPoints.forEach(function (key) {
      var parts = key.split(",");
      var x = Number(parts[0]);
      var y = Number(parts[1]);
      if (Number.isNaN(x) || Number.isNaN(y)) {
        return;
      }
      var cx = scaledPadding + x * space;
      var cy = scaledPadding + y * space;
      var hasStone =
        state.currentMat &&
        state.currentMat[x] &&
        state.currentMat[x][y] !== GB.Ki.Empty;
      if (hasStone) {
        ctx.save();
        ctx.fillStyle = background;
        ctx.beginPath();
        ctx.arc(cx, cy, maskRadius, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.strokeStyle = line;
        ctx.lineWidth = Math.max(space * 0.04, 1);
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(cx - maskRadius, cy);
        ctx.lineTo(cx + maskRadius, cy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy - maskRadius);
        ctx.lineTo(cx, cy + maskRadius);
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = "rgba(110, 120, 130, 0.7)";
        ctx.lineWidth = ringLineWidth;
        ctx.setLineDash(ringDash);
      }
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
      ctx.stroke();
    });
    ctx.restore();
  }
}

app.overlays.renderGrayStones = renderGrayStones;
app.overlays.collectEnigmaCandidates = collectEnigmaCandidates;
app.overlays.ensureEnigmaPoints = ensureEnigmaPoints;
app.overlays.syncEnigmaCanvas = syncEnigmaCanvas;
app.overlays.clearEnigmaCanvas = clearEnigmaCanvas;
app.overlays.renderEnigmaOverlay = renderEnigmaOverlay;
