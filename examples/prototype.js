(function () {
  var GB = window.ghostban;
  if (!GB) {
    return;
  }

  var sgfSources = {
    "27k":
      "(;AB[ca]AB[cb]AB[db]AB[ec]AB[fc]AB[gb]AB[hb]AB[ha]AW[bb]AW[bc]AW[cc]AW[dc]AW[ed]AW[fd]AW[gc]AW[hc]AW[ic]AW[ib]AW[ea]AP[goproblems](;B[fa];W[eb];B[fb]C[RIGHT])(;B[eb];W[fa]C[])(;B[fb](;W[fa]C[CHOICE])(;W[eb];B[fa];W[ba];B[da])))",
    "23k":
      "(;FF[4]GM[1]CA[UTF-8]AP[goproblems:0.1.0]SZ[19]ST[0]AW[fs][fr][hr][ir][jr][is][ls][lr][mr][nr]AB[or][oq][nq][mq][lq][ks][jq][iq][hq][fq][eq][er][gs][ds][ko][go](;W[kr](;B[ns];W[gr]C[RIGHT])(;B[gr];W[ns]C[RIGHT]))(;W[ns];B[kr])(;W[gr];B[kr])(;W[kq];B[gr]))",
    "17k":
      "(;FF[4]GM[1]CA[UTF-8]AP[goproblems:0.1.0]SZ[19]ST[0]AB[jr][jq][iq][hq][gq][fq][ko][lp][lq]AW[fr][gr][hr][ir][eq][ep][jp][kp][lo][mp][mq][nq][oq][hl][gl][fl][en][eo][ik][jk]TR[jp]TR[kp](;B[jo];W[ip](;B[ho];W[kq](;B[lr];W[io](;B[in];W[jn];B[kn];W[hn];B[im];W[hp];B[go]C[RIGHT])(;B[kr];W[in]))(;B[kr];W[lr]))(;B[io];W[hp](;B[go];W[kq](;B[lr];W[ho];B[hn];W[in](;B[gp]C[RIGHT])(;B[kr]C[RIGHT])(;B[jn];W[gn];B[im];W[gp]))(;B[kr];W[lr]))(;B[ho];W[gp])(;B[gp];W[ho])))(;B[kq];W[jo])(;B[io];W[jo])(;B[lr];W[jo])(;B[ip];W[jo])(;B[ho];W[jo]))",
    "4k":
      "(;FF[4]GM[1]CA[UTF-8]AP[goproblems:0.1.0]SZ[19]ST[0]AB[bs][cr][dr][er][eq][ep][do][co][cn][bn][bl][fq]AW[br][ar][bp][bo][cp][dp][dq][eo][fo][fp][gp][gq][gr]LB[ar:1](;B[bq];W[cq](;B[ao];W[aq](;B[an];W[ap](;B[cs]C[RIGHT])(;B[fr];W[cs];B[ds];W[fs]))(;B[cs];W[fr];B[an]C[RIGHT]))(;B[an];W[aq];B[ao]C[RIGHT])(;B[aq];W[ap]))(;B[cq];W[bq];B[cs];W[es])(;B[ao];W[ap](;B[bq];W[an])(;B[an];W[bq]))(;B[aq];W[bq])(;B[ap];W[bq];B[ao];W[fr])(;B[cs];W[bq](;B[ao];W[ap])(;B[ap];W[ao])))",
  };

  var mount = document.getElementById("board");
  var statusEl = document.getElementById("status");
  var logEl = document.getElementById("log");
  var livesEl = document.getElementById("lives");
  var livesBoxEl = document.getElementById("livesBox");
  var comboEl = document.getElementById("combo");
  var sgfSelect = document.getElementById("sgfSelect");
  var hintOneBtn = document.getElementById("hintOne");
  var hintTwoBtn = document.getElementById("hintTwo");
  var hintNeighborBtn = document.getElementById("hintNeighbor");
  var hintRowBtn = document.getElementById("hintRow");
  var hintColBtn = document.getElementById("hintCol");
  var hintDiagBtn = document.getElementById("hintDiag");
  var challengeGrayBtn = document.getElementById("challengeGray");
  var challengeGhostBtn = document.getElementById("challengeGhost");
  var elimRandomBtn = document.getElementById("elimRandom");
  var clearHintsBtn = document.getElementById("clearHints");
  var resetPuzzleBtn = document.getElementById("resetPuzzle");
  var resetLivesBtn = document.getElementById("resetLives");

  var board = null;
  var rowHintEl = null;
  var colHintEl = null;
  var diagHintEl = null;
  var grayCanvas = null;
  var ghostCanvas = null;
  var ghostAnimId = null;

  var state = {
    sgfKey: "27k",
    rootNode: null,
    currentNode: null,
    playerColor: GB.Ki.Black,
    lives: 3,
    combo: 0,
    lastLives: null,
    blockedMoves: new Set(),
    hintMoves: { correct: [], wrong: [] },
    hintNeighborStones: [],
    hintRow: null,
    hintCol: null,
    hintDiag: null,
    challengeGray: false,
    grayStones: new Set(),
    challengeGhost: false,
    ghostStones: new Set(),
    ghostFlashes: [],
    currentMat: null,
    hintMode: "none",
    extraAllowedMoves: new Set(),
    lastNodeId: null,
    childMoves: [],
    childMoveMap: new Map(),
  };

  function logMessage(message) {
    var item = document.createElement("div");
    item.className = "log-item";
    item.textContent = message;
    logEl.prepend(item);
    while (logEl.childNodes.length > 12) {
      logEl.removeChild(logEl.lastChild);
    }
  }

  function setStatus(text, tone) {
    statusEl.textContent = text;
    statusEl.classList.remove("success", "error");
    if (tone === "success") {
      statusEl.classList.add("success");
    } else if (tone === "error") {
      statusEl.classList.add("error");
    }
  }

  function flashLivesBox() {
    if (!livesBoxEl) {
      return;
    }
    livesBoxEl.classList.remove("is-flashing");
    void livesBoxEl.offsetWidth;
    livesBoxEl.classList.add("is-flashing");
  }

  function renderLivesHearts() {
    if (!livesEl) {
      return;
    }
    livesEl.textContent = "";
    for (var i = 0; i < state.lives; i += 1) {
      var heart = document.createElement("span");
      heart.className = "heart";
      heart.setAttribute("aria-hidden", "true");
      livesEl.appendChild(heart);
    }
    livesEl.setAttribute("aria-label", state.lives + " lives");
  }

  function updateHud() {
    var shouldFlash =
      state.lastLives !== null && state.lives < state.lastLives;
    renderLivesHearts();
    comboEl.textContent = String(state.combo);
    state.lastLives = state.lives;
    if (shouldFlash) {
      flashLivesBox();
    }
  }

  function sgfToIndex(coord) {
    if (!coord || coord.length < 2) {
      return null;
    }
    var i = GB.SGF_LETTERS.indexOf(coord[0]);
    var j = GB.SGF_LETTERS.indexOf(coord[1]);
    if (i < 0 || j < 0) {
      return null;
    }
    return { i: i, j: j };
  }

  function sgfToA1(coord) {
    if (!coord) {
      return "??";
    }
    if (coord.includes("[")) {
      try {
        return GB.sgfToA1(coord);
      } catch (err) {
        return "??";
      }
    }
    var i = GB.SGF_LETTERS.indexOf(coord[0]);
    var j = GB.SGF_LETTERS.indexOf(coord[1]);
    if (i >= 0 && j >= 0) {
      return GB.A1_LETTERS[i] + GB.A1_NUMBERS[j];
    }
    return String(coord).toUpperCase();
  }

  function recordGrayStone(i, j) {
    if (!state.challengeGray) {
      return;
    }
    if (i < 0 || j < 0) {
      return;
    }
    state.grayStones.add(i + "," + j);
  }

  function recordGhostStone(i, j, ki) {
    if (!state.challengeGhost) {
      return;
    }
    if (i < 0 || j < 0) {
      return;
    }
    state.ghostStones.add(i + "," + j);
    state.ghostFlashes.push({
      i: i,
      j: j,
      ki: ki,
      start: performance.now(),
    });
    startGhostAnimation();
  }

  function clearGhostCanvas() {
    if (!ghostCanvas) {
      return;
    }
    var ctx = ghostCanvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ghostCanvas.width, ghostCanvas.height);
    }
  }

  function syncGhostCanvas() {
    if (!ghostCanvas || !board) {
      return;
    }
    var ref = board.canvas || board.cursorCanvas || board.board;
    if (!ref) {
      return;
    }
    var dpr = window.devicePixelRatio || 1;
    ghostCanvas.width = ref.width;
    ghostCanvas.height = ref.height;
    ghostCanvas.style.width = ref.width / dpr + "px";
    ghostCanvas.style.height = ref.height / dpr + "px";
  }

  function drawGhostFlashes(timestamp) {
    if (!ghostCanvas || !board) {
      ghostAnimId = null;
      return;
    }
    syncGhostCanvas();
    var ctx = ghostCanvas.getContext("2d");
    if (!ctx) {
      ghostAnimId = null;
      return;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ghostCanvas.width, ghostCanvas.height);

    if (!state.challengeGhost || state.ghostFlashes.length === 0) {
      ghostAnimId = null;
      return;
    }

    ctx.setTransform(board.transMat);
    var spacing = board.calcSpaceAndPadding
      ? board.calcSpaceAndPadding(board.canvas || board.cursorCanvas || board.board)
      : { space: 0, scaledPadding: 0 };
    var space = spacing.space;
    var scaledPadding = spacing.scaledPadding;
    var themeOptions = board.options.themeOptions || {};
    var theme = board.options.theme;
    var themeConfig = themeOptions[theme] || {};
    var defaultConfig = themeOptions.default || {};
    var black = themeConfig.flatBlackColor || defaultConfig.flatBlackColor || "#000";
    var white = themeConfig.flatWhiteColor || defaultConfig.flatWhiteColor || "#fff";
    var line = themeConfig.boardLineColor || defaultConfig.boardLineColor || "#5a4c3b";
    var ratio =
      themeConfig.stoneRatio ||
      defaultConfig.stoneRatio ||
      0.45;
    var radius = space * ratio;

    var duration = 500;
    var remaining = [];
    for (var i = 0; i < state.ghostFlashes.length; i += 1) {
      var flash = state.ghostFlashes[i];
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
    }

    state.ghostFlashes = remaining;
    if (remaining.length > 0) {
      ghostAnimId = requestAnimationFrame(drawGhostFlashes);
    } else {
      ghostAnimId = null;
    }
  }

  function startGhostAnimation() {
    if (ghostAnimId) {
      return;
    }
    ghostAnimId = requestAnimationFrame(drawGhostFlashes);
  }

  function renderGrayStones(mat) {
    if (!grayCanvas || !board) {
      return;
    }
    var ref = board.canvas || board.cursorCanvas || board.board;
    if (!ref) {
      return;
    }
    var dpr = window.devicePixelRatio || 1;
    grayCanvas.width = ref.width;
    grayCanvas.height = ref.height;
    grayCanvas.style.width = ref.width / dpr + "px";
    grayCanvas.style.height = ref.height / dpr + "px";

    var ctx = grayCanvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, grayCanvas.width, grayCanvas.height);

    if (!state.challengeGray || !mat) {
      return;
    }

    ctx.setTransform(board.transMat);
    var spacing = board.calcSpaceAndPadding
      ? board.calcSpaceAndPadding(ref)
      : { space: 0, scaledPadding: 0 };
    var space = spacing.space;
    var scaledPadding = spacing.scaledPadding;
    var themeOptions = board.options.themeOptions || {};
    var theme = board.options.theme;
    var ratio =
      (themeOptions[theme] && themeOptions[theme].stoneRatio) ||
      (themeOptions.default && themeOptions.default.stoneRatio) ||
      0.45;
    var radius = space * ratio;

    ctx.fillStyle = "#b9b9b9";
    ctx.strokeStyle = "rgba(80, 80, 80, 0.6)";
    ctx.lineWidth = Math.max(space * 0.05, 1);

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
      var cx = scaledPadding + x * space;
      var cy = scaledPadding + y * space;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.stroke();
    });
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

  function setGrayPlay(active) {
    state.challengeGray = active;
    state.grayStones = new Set();
    updateChallengeControls();
    renderGrayStones(state.currentMat);
  }

  function setGhostPlay(active) {
    state.challengeGhost = active;
    state.ghostStones = new Set();
    state.ghostFlashes = [];
    if (ghostAnimId) {
      cancelAnimationFrame(ghostAnimId);
      ghostAnimId = null;
    }
    clearGhostCanvas();
    updateChallengeControls();
  }

  function updateChallengeControls() {
    if (!challengeGrayBtn) {
      return;
    }
    if (state.challengeGray) {
      challengeGrayBtn.classList.add("active");
      challengeGrayBtn.disabled = true;
    } else {
      challengeGrayBtn.classList.remove("active");
      challengeGrayBtn.disabled = false;
    }
    if (challengeGhostBtn) {
      if (state.challengeGhost) {
        challengeGhostBtn.classList.add("active");
        challengeGhostBtn.disabled = true;
      } else {
        challengeGhostBtn.classList.remove("active");
        challengeGhostBtn.disabled = false;
      }
    }
  }

  function resetChallenges() {
    state.challengeGray = false;
    state.grayStones = new Set();
    state.challengeGhost = false;
    state.ghostStones = new Set();
    state.ghostFlashes = [];
    if (ghostAnimId) {
      cancelAnimationFrame(ghostAnimId);
      ghostAnimId = null;
    }
    clearGhostCanvas();
    updateChallengeControls();
    renderGrayStones(state.currentMat);
  }

  function resetRowHint() {
    state.hintRow = null;
    if (!rowHintEl) {
      return;
    }
    rowHintEl.classList.remove("is-active");
    rowHintEl.style.display = "none";
  }

  function resetColumnHint() {
    state.hintCol = null;
    if (!colHintEl) {
      return;
    }
    colHintEl.classList.remove("is-active");
    colHintEl.style.display = "none";
  }

  function resetDiagonalHint() {
    state.hintDiag = null;
    if (!diagHintEl) {
      return;
    }
    diagHintEl.classList.remove("is-active");
    diagHintEl.style.display = "none";
  }

  function positionRowHint() {
    if (!rowHintEl || state.hintRow === null || !board) {
      if (rowHintEl) {
        rowHintEl.classList.remove("is-active");
        rowHintEl.style.display = "none";
      }
      return;
    }

    var canvas = board.canvas || board.cursorCanvas || board.board;
    if (!canvas || !canvas.getBoundingClientRect) {
      return;
    }

    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var size = board.options.boardSize || 19;
    var spacing = board.calcSpaceAndPadding
      ? board.calcSpaceAndPadding(canvas)
      : { space: 0, scaledPadding: 0 };
    var space = spacing.space;
    var scaledPadding = spacing.scaledPadding;
    var row = state.hintRow;
    var rowHeight = space * 0.9;
    var x0 = scaledPadding - space / 2;
    var x1 = scaledPadding + space * (size - 1) + space / 2;
    var y0 = scaledPadding + row * space - rowHeight / 2;
    var y1 = scaledPadding + row * space + rowHeight / 2;

    var topLeft = board.transMat.transformPoint(new DOMPoint(x0, y0));
    var bottomRight = board.transMat.transformPoint(new DOMPoint(x1, y1));
    var left = topLeft.x / scaleX;
    var top = topLeft.y / scaleY;
    var width = (bottomRight.x - topLeft.x) / scaleX;
    var height = (bottomRight.y - topLeft.y) / scaleY;

    rowHintEl.style.display = "block";
    rowHintEl.style.left = left + "px";
    rowHintEl.style.top = top + "px";
    rowHintEl.style.width = width + "px";
    rowHintEl.style.height = height + "px";
    rowHintEl.classList.add("is-active");
  }

  function positionColumnHint() {
    if (!colHintEl || state.hintCol === null || !board) {
      if (colHintEl) {
        colHintEl.classList.remove("is-active");
        colHintEl.style.display = "none";
      }
      return;
    }

    var canvas = board.canvas || board.cursorCanvas || board.board;
    if (!canvas || !canvas.getBoundingClientRect) {
      return;
    }

    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var size = board.options.boardSize || 19;
    var spacing = board.calcSpaceAndPadding
      ? board.calcSpaceAndPadding(canvas)
      : { space: 0, scaledPadding: 0 };
    var space = spacing.space;
    var scaledPadding = spacing.scaledPadding;
    var col = state.hintCol;
    var colWidth = space * 0.9;
    var x0 = scaledPadding + col * space - colWidth / 2;
    var x1 = scaledPadding + col * space + colWidth / 2;
    var y0 = scaledPadding - space / 2;
    var y1 = scaledPadding + space * (size - 1) + space / 2;

    var topLeft = board.transMat.transformPoint(new DOMPoint(x0, y0));
    var bottomRight = board.transMat.transformPoint(new DOMPoint(x1, y1));
    var left = topLeft.x / scaleX;
    var top = topLeft.y / scaleY;
    var width = (bottomRight.x - topLeft.x) / scaleX;
    var height = (bottomRight.y - topLeft.y) / scaleY;

    colHintEl.style.display = "block";
    colHintEl.style.left = left + "px";
    colHintEl.style.top = top + "px";
    colHintEl.style.width = width + "px";
    colHintEl.style.height = height + "px";
    colHintEl.classList.add("is-active");
  }

  function positionDiagonalHint() {
    if (!diagHintEl || !state.hintDiag || !board) {
      if (diagHintEl) {
        diagHintEl.classList.remove("is-active");
        diagHintEl.style.display = "none";
      }
      return;
    }

    var canvas = board.canvas || board.cursorCanvas || board.board;
    if (!canvas || !canvas.getBoundingClientRect) {
      return;
    }

    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var size = board.options.boardSize || 19;
    var spacing = board.calcSpaceAndPadding
      ? board.calcSpaceAndPadding(canvas)
      : { space: 0, scaledPadding: 0 };
    var space = spacing.space;
    var scaledPadding = spacing.scaledPadding;
    var diag = state.hintDiag;

    var i0;
    var j0;
    var i1;
    var j1;
    if (diag.type === "backslash") {
      var d = diag.value;
      i0 = Math.max(0, -d);
      i1 = Math.min(size - 1, size - 1 - d);
      j0 = i0 + d;
      j1 = i1 + d;
    } else {
      var s = diag.value;
      i0 = Math.max(0, s - (size - 1));
      i1 = Math.min(size - 1, s);
      j0 = -i0 + s;
      j1 = -i1 + s;
    }

    var x0 = scaledPadding + i0 * space;
    var y0 = scaledPadding + j0 * space;
    var x1 = scaledPadding + i1 * space;
    var y1 = scaledPadding + j1 * space;

    var dx = x1 - x0;
    var dy = y1 - y0;
    var length = Math.sqrt(dx * dx + dy * dy);
    if (length <= 0) {
      return;
    }

    var extend = space / 2;
    var ux = dx / length;
    var uy = dy / length;
    x0 -= ux * extend;
    y0 -= uy * extend;
    x1 += ux * extend;
    y1 += uy * extend;

    var start = board.transMat.transformPoint(new DOMPoint(x0, y0));
    var end = board.transMat.transformPoint(new DOMPoint(x1, y1));
    var centerX = (start.x + end.x) / 2 / scaleX;
    var centerY = (start.y + end.y) / 2 / scaleY;
    var dxPx = (end.x - start.x) / scaleX;
    var dyPx = (end.y - start.y) / scaleY;
    var lengthPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
    var angle = Math.atan2(dyPx, dxPx) * (180 / Math.PI);

    var base = board.transMat.transformPoint(new DOMPoint(0, 0));
    var spacePoint = board.transMat.transformPoint(new DOMPoint(space, 0));
    var spacePx = Math.abs(spacePoint.x - base.x) / scaleX;
    var thickness = spacePx * 0.9;

    diagHintEl.style.display = "block";
    diagHintEl.style.left = centerX + "px";
    diagHintEl.style.top = centerY + "px";
    diagHintEl.style.width = lengthPx + "px";
    diagHintEl.style.height = thickness + "px";
    diagHintEl.style.transform = "translate(-50%, -50%) rotate(" + angle + "deg)";
    diagHintEl.classList.add("is-active");
  }

  function getTurn(node, firstTurn) {
    if (!node || node.model.moveProps.length === 0) {
      return firstTurn;
    }
    var lastColor = GB.getMoveColor(node, firstTurn);
    return lastColor === GB.Ki.Black ? GB.Ki.White : GB.Ki.Black;
  }

  function colorName(ki) {
    return ki === GB.Ki.Black ? "Black" : "White";
  }

  function clearHints() {
    state.hintMoves = { correct: [], wrong: [] };
    state.hintNeighborStones = [];
    state.hintMode = "none";
    state.extraAllowedMoves = new Set();
    resetRowHint();
    resetColumnHint();
    resetDiagonalHint();
    logMessage("Hints cleared.");
  }

  function clearTemporaryState() {
    state.blockedMoves = new Set();
    state.hintMoves = { correct: [], wrong: [] };
    state.hintNeighborStones = [];
    state.hintMode = "none";
    state.extraAllowedMoves = new Set();
    resetRowHint();
    resetColumnHint();
    resetDiagonalHint();
  }

  function setCurrentNode(node) {
    if (!node) {
      return;
    }
    var id = node.model && node.model.id ? node.model.id : null;
    if (state.lastNodeId && id && state.lastNodeId !== id) {
      clearTemporaryState();
    }
    state.currentNode = node;
    state.lastNodeId = id;
  }

  function initBoard(boardSize) {
    board = new GB.GhostBan({
      boardSize: boardSize,
      interactive: true,
      coordinate: true,
      zoom: true,
      extent: 3,
      theme: GB.Theme.Flat,
      padding: 24,
    });
    board.init(mount);
    updateChallengeControls();
    grayCanvas = document.createElement("canvas");
    grayCanvas.id = "ghostban-gray";
    grayCanvas.style.position = "absolute";
    grayCanvas.style.pointerEvents = "none";
    mount.appendChild(grayCanvas);
    ghostCanvas = document.createElement("canvas");
    ghostCanvas.id = "ghostban-ghost";
    ghostCanvas.style.position = "absolute";
    ghostCanvas.style.pointerEvents = "none";
    mount.appendChild(ghostCanvas);
    rowHintEl = document.createElement("div");
    rowHintEl.className = "row-hint";
    rowHintEl.setAttribute("aria-hidden", "true");
    rowHintEl.style.display = "none";
    mount.appendChild(rowHintEl);
    colHintEl = document.createElement("div");
    colHintEl.className = "col-hint";
    colHintEl.setAttribute("aria-hidden", "true");
    colHintEl.style.display = "none";
    mount.appendChild(colHintEl);
    diagHintEl = document.createElement("div");
    diagHintEl.className = "diag-hint";
    diagHintEl.setAttribute("aria-hidden", "true");
    diagHintEl.style.display = "none";
    mount.appendChild(diagHintEl);
  }

  function getChildMoves(node) {
    if (!node || !node.hasChildren()) {
      return [];
    }
    var moves = [];
    node.children.forEach(function (child) {
      var moveProp = child.model.moveProps[0];
      if (!moveProp || !moveProp.value || moveProp.value.length < 2) {
        return;
      }
      var coord = moveProp.value;
      var idx = sgfToIndex(coord);
      if (!idx) {
        return;
      }
      moves.push({
        node: child,
        sgf: coord,
        i: idx.i,
        j: idx.j,
      });
    });
    return moves;
  }

  function updateChildMoves() {
    state.childMoves = getChildMoves(state.currentNode);
    state.childMoveMap = new Map();
    state.childMoves.forEach(function (move) {
      state.childMoveMap.set(move.sgf, move);
    });
  }

  function buildPreventMoveMat(size) {
    return GB.zeros([size, size]);
  }

  function appendMarkup(markup, i, j, mark) {
    var existing = markup[i][j] || "";
    var parts = existing.split("|").filter(Boolean);
    if (parts.indexOf(mark) >= 0) {
      return;
    }
    parts.push(mark);
    markup[i][j] = parts.join("|");
  }

  function applyHintMarkup(markup, mat) {
    var neutral = state.hintMode === "double";
    var correctMark = neutral ? GB.Markup.NeutralNode : GB.Markup.PositiveNode;
    var wrongMark = neutral ? GB.Markup.NeutralNode : GB.Markup.NegativeNode;

    state.hintMoves.correct.forEach(function (coord) {
      var idx = sgfToIndex(coord);
      if (!idx || mat[idx.i][idx.j] !== GB.Ki.Empty) {
        return;
      }
      appendMarkup(markup, idx.i, idx.j, correctMark);
    });

    state.hintMoves.wrong.forEach(function (coord) {
      var idx = sgfToIndex(coord);
      if (!idx || mat[idx.i][idx.j] !== GB.Ki.Empty) {
        return;
      }
      appendMarkup(markup, idx.i, idx.j, wrongMark);
    });

    state.hintNeighborStones.forEach(function (coord) {
      var idx = sgfToIndex(coord);
      if (!idx || mat[idx.i][idx.j] === GB.Ki.Empty) {
        return;
      }
      appendMarkup(markup, idx.i, idx.j, GB.Markup.Highlight);
    });

    state.blockedMoves.forEach(function (coord) {
      var idx = sgfToIndex(coord);
      if (!idx || mat[idx.i][idx.j] !== GB.Ki.Empty) {
        return;
      }
      appendMarkup(markup, idx.i, idx.j, GB.Markup.Cross);
    });
  }

  function updateBoard() {
    var size = GB.extractBoardSize(state.currentNode, 19);
    updateChildMoves();

    var res = GB.calcMatAndMarkup(state.currentNode, size);
    state.currentMat = res.mat;
    applyHintMarkup(res.markup, res.mat);

    var visibleMat = applyGhostMask(res.mat);
    board.setMat(visibleMat);
    board.setVisibleAreaMat(res.visibleAreaMat);
    board.setMarkup(res.markup);
    board.setPreventMoveMat(buildPreventMoveMat(size));
    board.setTurn(getTurn(state.currentNode, state.playerColor));

    var turn = getTurn(state.currentNode, state.playerColor);
    if (turn === state.playerColor) {
      board.setCursor(
        turn === GB.Ki.Black ? GB.Cursor.BlackStone : GB.Cursor.WhiteStone
      );
    } else {
      board.setCursor(GB.Cursor.None);
    }

    board.render();
    board.renderInteractive();
    positionRowHint();
    positionColumnHint();
    positionDiagonalHint();
    renderGrayStones(state.currentMat);
    if (!state.challengeGhost && state.ghostFlashes.length === 0) {
      clearGhostCanvas();
    }
  }

  function evaluatePosition() {
    if (state.lives <= 0) {
      setStatus("Out of lives. Reset to continue.", "error");
      return;
    }

    if (!state.currentNode.hasChildren()) {
      if (GB.isRightNode(state.currentNode)) {
        setStatus("Correct. Puzzle solved.", "success");
      } else {
        setStatus("Line over. Reset to try again.", "error");
      }
      return;
    }

    var turn = getTurn(state.currentNode, state.playerColor);
    if (turn === state.playerColor) {
      setStatus("Your move: " + colorName(turn));
    } else {
      setStatus("Opponent move...");
    }
  }

  function pickOpponentMove() {
    if (state.childMoves.length === 0) {
      return null;
    }
    var correct = state.childMoves.find(function (move) {
      return GB.inRightPath(move.node);
    });
    return correct || state.childMoves[0];
  }

  function autoPlayOpponent() {
    var guard = 0;
    var turn = getTurn(state.currentNode, state.playerColor);
    while (turn !== state.playerColor && guard < 4) {
      updateChildMoves();
      var move = pickOpponentMove();
      if (!move) {
        break;
      }
      recordGrayStone(move.i, move.j);
      recordGhostStone(move.i, move.j, turn);
      setCurrentNode(move.node);
      turn = getTurn(state.currentNode, state.playerColor);
      guard += 1;
    }
  }

  function resetPuzzle() {
    if (!state.rootNode) {
      return;
    }
    resetChallenges();
    setCurrentNode(state.rootNode);
    state.combo = 0;
    clearTemporaryState();
    autoPlayOpponent();
    updateBoard();
    updateHud();
    evaluatePosition();
    logMessage("Puzzle reset.");
  }

  function loadSgf(key) {
    var sgfText = sgfSources[key];
    if (!sgfText) {
      logMessage("SGF not found: " + key);
      return;
    }

    var sgf = new GB.Sgf(sgfText);
    if (!sgf.root) {
      logMessage("Failed to parse SGF: " + key);
      return;
    }

    state.sgfKey = key;
    state.rootNode = sgf.root;
    state.playerColor = GB.getFirstToMoveColorFromRoot(
      sgf.root,
      GB.Ki.Black
    );
    state.combo = 0;
    state.lastNodeId = null;

    initBoard(GB.extractBoardSize(sgf.root, 19));
    resetPuzzle();
    logMessage("Loaded SGF " + key + ".");
  }

  function hintFirstMove() {
    if (state.lives <= 0) {
      setStatus("Out of lives. Reset to continue.", "error");
      return;
    }

    updateChildMoves();
    if (state.childMoves.length === 0) {
      logMessage("No moves available to hint.");
      return;
    }

    var correct = state.childMoves.find(function (move) {
      return GB.inRightPath(move.node);
    });
    correct = correct || state.childMoves[0];

    state.hintMoves = { correct: [correct.sgf], wrong: [] };
    state.hintNeighborStones = [];
    state.hintMode = "single";
    resetRowHint();
    resetColumnHint();
    resetDiagonalHint();
    logMessage("Hinted correct move: " + sgfToA1(correct.sgf));
    updateBoard();
  }

  function hintTwoMoves() {
    if (state.lives <= 0) {
      setStatus("Out of lives. Reset to continue.", "error");
      return;
    }

    updateChildMoves();
    if (state.childMoves.length === 0) {
      logMessage("No moves available to hint.");
      return;
    }

    var rightMoves = state.childMoves.filter(function (move) {
      return GB.inRightPath(move.node);
    });
    var correct =
      rightMoves[Math.floor(Math.random() * rightMoves.length)] ||
      state.childMoves[Math.floor(Math.random() * state.childMoves.length)];

    var wrongMoves = state.childMoves.filter(function (move) {
      return (
        move.sgf !== correct.sgf &&
        !GB.inRightPath(move.node) &&
        !GB.inVariantPath(move.node)
      );
    });

    var wrong =
      wrongMoves[Math.floor(Math.random() * wrongMoves.length)] || null;
    if (!wrong) {
      var nearby = pickRandomNearbyWrongMove(correct.sgf);
      if (nearby) {
        wrong = { sgf: nearby };
      }
    }

    if (!wrong || !wrong.sgf) {
      logMessage("Unable to find a wrong move for hint.");
      state.hintMoves = { correct: [correct.sgf], wrong: [] };
      state.hintNeighborStones = [];
      state.hintMode = "single";
      resetRowHint();
      resetColumnHint();
      resetDiagonalHint();
    } else {
      state.hintMoves = {
        correct: [correct.sgf],
        wrong: [wrong.sgf],
      };
      state.hintNeighborStones = [];
      state.hintMode = "double";
      resetRowHint();
      resetColumnHint();
      resetDiagonalHint();
      var hinted = [correct.sgf, wrong.sgf];
      if (Math.random() > 0.5) {
        hinted.reverse();
      }
      logMessage(
        "Hinted two moves: " +
          sgfToA1(hinted[0]) +
          " / " +
          sgfToA1(hinted[1])
      );
    }

    updateBoard();
  }

  function hintWaveNeighbor() {
    if (state.lives <= 0) {
      setStatus("Out of lives. Reset to continue.", "error");
      return;
    }

    updateChildMoves();
    if (state.childMoves.length === 0) {
      logMessage("No moves available to hint.");
      return;
    }

    var rightMoves = state.childMoves.filter(function (move) {
      return GB.inRightPath(move.node);
    });
    if (rightMoves.length === 0) {
      logMessage("No solution moves to hint.");
      return;
    }

    var size = GB.extractBoardSize(state.currentNode, 19);
    var res = GB.calcMatAndMarkup(state.currentNode, size);
    var mat = res.mat;

    function neighborStones(move) {
      var neighbors = [];
      var offsets = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      for (var k = 0; k < offsets.length; k += 1) {
        var ni = move.i + offsets[k][0];
        var nj = move.j + offsets[k][1];
        if (ni < 0 || nj < 0 || ni >= size || nj >= size) {
          continue;
        }
        if (mat[ni][nj] !== GB.Ki.Empty) {
          neighbors.push(GB.SGF_LETTERS[ni] + GB.SGF_LETTERS[nj]);
        }
      }
      return neighbors;
    }

    var eligible = rightMoves
      .map(function (move) {
        return { move: move, neighbors: neighborStones(move) };
      })
      .filter(function (entry) {
        return entry.neighbors.length > 0;
      });

    if (eligible.length === 0) {
      logMessage("No neighbor stones next to a solution move.");
      return;
    }

    var pick = eligible[Math.floor(Math.random() * eligible.length)];
    var neighbor =
      pick.neighbors[Math.floor(Math.random() * pick.neighbors.length)];

    state.hintMoves = { correct: [], wrong: [] };
    state.hintNeighborStones = [neighbor];
    state.hintMode = "single";
    resetRowHint();
    resetColumnHint();
    resetDiagonalHint();
    logMessage("Neighbor hint: " + sgfToA1(neighbor));
    updateBoard();
  }

  function hintRowReveal() {
    if (state.lives <= 0) {
      setStatus("Out of lives. Reset to continue.", "error");
      return;
    }

    resetRowHint();
    resetColumnHint();
    resetDiagonalHint();
    updateChildMoves();
    if (state.childMoves.length === 0) {
      logMessage("No moves available to hint.");
      return;
    }

    var rightMoves = state.childMoves.filter(function (move) {
      return GB.inRightPath(move.node);
    });
    if (rightMoves.length === 0) {
      logMessage("No solution moves to hint.");
      return;
    }

    var rowSet = new Set();
    rightMoves.forEach(function (move) {
      rowSet.add(move.j);
    });
    var rows = Array.from(rowSet);
    if (rows.length === 0) {
      logMessage("No solution rows to reveal.");
      return;
    }

    var row = rows[Math.floor(Math.random() * rows.length)];
    state.hintMoves = { correct: [], wrong: [] };
    state.hintNeighborStones = [];
    state.hintMode = "none";
    state.hintRow = row;

    var size = board && board.options ? board.options.boardSize : 19;
    var label = size - row;
    logMessage("Row reveal: row " + label);
    updateBoard();
  }

  function hintColumnReveal() {
    if (state.lives <= 0) {
      setStatus("Out of lives. Reset to continue.", "error");
      return;
    }

    resetRowHint();
    resetColumnHint();
    resetDiagonalHint();
    updateChildMoves();
    if (state.childMoves.length === 0) {
      logMessage("No moves available to hint.");
      return;
    }

    var rightMoves = state.childMoves.filter(function (move) {
      return GB.inRightPath(move.node);
    });
    if (rightMoves.length === 0) {
      logMessage("No solution moves to hint.");
      return;
    }

    var colSet = new Set();
    rightMoves.forEach(function (move) {
      colSet.add(move.i);
    });
    var cols = Array.from(colSet);
    if (cols.length === 0) {
      logMessage("No solution columns to reveal.");
      return;
    }

    var col = cols[Math.floor(Math.random() * cols.length)];
    state.hintMoves = { correct: [], wrong: [] };
    state.hintNeighborStones = [];
    state.hintMode = "none";
    state.hintCol = col;

    var label = GB.A1_LETTERS[col] || col + 1;
    logMessage("Column reveal: column " + label);
    updateBoard();
  }

  function hintDiagonalReveal() {
    if (state.lives <= 0) {
      setStatus("Out of lives. Reset to continue.", "error");
      return;
    }

    resetRowHint();
    resetColumnHint();
    resetDiagonalHint();
    updateChildMoves();
    if (state.childMoves.length === 0) {
      logMessage("No moves available to hint.");
      return;
    }

    var rightMoves = state.childMoves.filter(function (move) {
      return GB.inRightPath(move.node);
    });
    if (rightMoves.length === 0) {
      logMessage("No solution moves to hint.");
      return;
    }

    var backslashSet = new Set();
    var slashSet = new Set();
    rightMoves.forEach(function (move) {
      backslashSet.add(move.j - move.i);
      slashSet.add(move.i + move.j);
    });

    var options = [];
    if (backslashSet.size) {
      options.push({
        type: "backslash",
        values: Array.from(backslashSet),
      });
    }
    if (slashSet.size) {
      options.push({
        type: "slash",
        values: Array.from(slashSet),
      });
    }

    if (options.length === 0) {
      logMessage("No solution diagonals to reveal.");
      return;
    }

    var choice = options[Math.floor(Math.random() * options.length)];
    var values = choice.values;
    var value = values[Math.floor(Math.random() * values.length)];

    state.hintMoves = { correct: [], wrong: [] };
    state.hintNeighborStones = [];
    state.hintMode = "none";
    state.hintDiag = { type: choice.type, value: value };

    var label = choice.type === "backslash" ? "\\" : "/";
    logMessage("Diagonal reveal: " + label);
    updateBoard();
  }

  function pickRandomNearbyWrongMove(correctSgf) {
    var size = GB.extractBoardSize(state.currentNode, 19);
    var res = GB.calcMatAndMarkup(state.currentNode, size);
    var mat = res.mat;
    var idx = sgfToIndex(correctSgf);
    if (!idx || !mat) {
      return null;
    }

    var exclude = new Set();
    state.childMoves.forEach(function (move) {
      exclude.add(move.sgf);
    });
    exclude.add(correctSgf);

    function collectCandidates(radius) {
      var candidates = [];
      for (var di = -radius; di <= radius; di++) {
        for (var dj = -radius; dj <= radius; dj++) {
          if (di === 0 && dj === 0) {
            continue;
          }
          var i = idx.i + di;
          var j = idx.j + dj;
          if (i < 0 || j < 0 || i >= size || j >= size) {
            continue;
          }
          if (mat[i][j] !== GB.Ki.Empty) {
            continue;
          }
          var coord = GB.SGF_LETTERS[i] + GB.SGF_LETTERS[j];
          if (exclude.has(coord)) {
            continue;
          }
          candidates.push(coord);
        }
      }
      return candidates;
    }

    var candidates = [];
    for (var radius = 1; radius <= 3 && candidates.length === 0; radius++) {
      candidates = collectCandidates(radius);
    }

    if (candidates.length === 0) {
      for (var x = 0; x < size; x++) {
        for (var y = 0; y < size; y++) {
          if (mat[x][y] !== GB.Ki.Empty) {
            continue;
          }
          var sgf = GB.SGF_LETTERS[x] + GB.SGF_LETTERS[y];
          if (!exclude.has(sgf)) {
            candidates.push(sgf);
          }
        }
      }
    }

    if (candidates.length === 0) {
      return null;
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function eliminateRandomMove() {
    updateChildMoves();
    var wrongMoves = state.childMoves.filter(function (move) {
      return (
        !state.blockedMoves.has(move.sgf) &&
        !GB.inRightPath(move.node) &&
        !GB.inVariantPath(move.node)
      );
    });
    if (wrongMoves.length === 0) {
      logMessage("No wrong-path moves left to eliminate.");
      return;
    }
    var pick = wrongMoves[Math.floor(Math.random() * wrongMoves.length)];
    state.blockedMoves.add(pick.sgf);
    logMessage("Eliminated move: " + sgfToA1(pick.sgf));
    updateBoard();
  }

  function handleMoveSelection(i, j) {
    if (state.lives <= 0) {
      return;
    }

    var turn = getTurn(state.currentNode, state.playerColor);
    var coord = GB.SGF_LETTERS[i] + GB.SGF_LETTERS[j];
    updateChildMoves();

    var chosen = state.childMoveMap.get(coord);
    if (state.blockedMoves.has(coord)) {
      state.lives -= 1;
      state.combo = 0;
      updateHud();
      logMessage("Eliminated move selected: " + sgfToA1(coord));
      evaluatePosition();
      return;
    }

    if (!chosen) {
      state.lives -= 1;
      state.combo = 0;
      updateHud();
      logMessage("Wrong move (not in tree): " + sgfToA1(coord));
      evaluatePosition();
      return;
    }

    recordGrayStone(i, j);
    recordGhostStone(i, j, turn);
    var correct = GB.inRightPath(chosen.node);
    if (correct) {
      state.combo += 1;
      logMessage("Correct move: " + sgfToA1(coord));
    } else {
      state.lives -= 1;
      state.combo = 0;
      logMessage("Wrong move: " + sgfToA1(coord));
    }

    updateHud();
    setCurrentNode(chosen.node);
    autoPlayOpponent();
    updateBoard();
    evaluatePosition();
  }

  mount.addEventListener("click", function () {
    var pos = board.cursorPosition;
    if (!pos || pos[0] < 0 || pos[1] < 0) {
      return;
    }
    handleMoveSelection(pos[0], pos[1]);
  });

  sgfSelect.addEventListener("change", function (event) {
    loadSgf(event.target.value);
  });

  hintOneBtn.addEventListener("click", hintFirstMove);
  hintTwoBtn.addEventListener("click", hintTwoMoves);
  hintNeighborBtn.addEventListener("click", hintWaveNeighbor);
  hintRowBtn.addEventListener("click", hintRowReveal);
  hintColBtn.addEventListener("click", hintColumnReveal);
  hintDiagBtn.addEventListener("click", hintDiagonalReveal);
  challengeGrayBtn.addEventListener("click", function () {
    if (state.challengeGray) {
      return;
    }
    setGrayPlay(true);
    logMessage("Challenge enabled: Gray play.");
  });
  challengeGhostBtn.addEventListener("click", function () {
    if (state.challengeGhost) {
      return;
    }
    setGhostPlay(true);
    logMessage("Challenge enabled: Ghost play.");
  });
  elimRandomBtn.addEventListener("click", eliminateRandomMove);
  clearHintsBtn.addEventListener("click", function () {
    clearHints();
    updateBoard();
  });
  resetPuzzleBtn.addEventListener("click", resetPuzzle);
  resetLivesBtn.addEventListener("click", function () {
    state.lives = 3;
    updateHud();
    evaluatePosition();
    logMessage("Lives reset.");
  });

  document.addEventListener("keydown", function (event) {
    if (event.target && event.target.tagName === "SELECT") {
      return;
    }
    if (event.key === "r" || event.key === "R") {
      resetPuzzle();
    }
  });

  window.addEventListener("resize", function () {
    if (state.hintRow !== null) {
      positionRowHint();
    }
    if (state.hintCol !== null) {
      positionColumnHint();
    }
    if (state.hintDiag) {
      positionDiagonalHint();
    }
    renderGrayStones(state.currentMat);
    if (state.challengeGhost && state.ghostFlashes.length > 0) {
      startGhostAnimation();
    } else {
      clearGhostCanvas();
    }
  });

  updateHud();
  loadSgf(state.sgfKey);
})();
