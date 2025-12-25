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
  var comboEl = document.getElementById("combo");
  var sgfSelect = document.getElementById("sgfSelect");
  var hintOneBtn = document.getElementById("hintOne");
  var hintTwoBtn = document.getElementById("hintTwo");
  var hintNeighborBtn = document.getElementById("hintNeighbor");
  var elimRandomBtn = document.getElementById("elimRandom");
  var clearHintsBtn = document.getElementById("clearHints");
  var resetPuzzleBtn = document.getElementById("resetPuzzle");
  var resetLivesBtn = document.getElementById("resetLives");

  var board = null;

  var state = {
    sgfKey: "27k",
    rootNode: null,
    currentNode: null,
    playerColor: GB.Ki.Black,
    lives: 3,
    combo: 0,
    blockedMoves: new Set(),
    hintMoves: { correct: [], wrong: [] },
    hintNeighborStones: [],
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

  function updateHud() {
    livesEl.textContent = String(state.lives);
    comboEl.textContent = String(state.combo);
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
    logMessage("Hints cleared.");
  }

  function clearTemporaryState() {
    state.blockedMoves = new Set();
    state.hintMoves = { correct: [], wrong: [] };
    state.hintNeighborStones = [];
    state.hintMode = "none";
    state.extraAllowedMoves = new Set();
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
    applyHintMarkup(res.markup, res.mat);

    board.setMat(res.mat);
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
      setCurrentNode(move.node);
      turn = getTurn(state.currentNode, state.playerColor);
      guard += 1;
    }
  }

  function resetPuzzle() {
    if (!state.rootNode) {
      return;
    }
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
    } else {
      state.hintMoves = {
        correct: [correct.sgf],
        wrong: [wrong.sgf],
      };
      state.hintNeighborStones = [];
      state.hintMode = "double";
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
    logMessage("Neighbor hint: " + sgfToA1(neighbor));
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

  updateHud();
  loadSgf(state.sgfKey);
})();
