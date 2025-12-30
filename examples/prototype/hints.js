import { app } from "./context.js";

var GB = app.GB;
var state = app.state;
var refs = app.refs;
var ui = app.ui;
var utils = app.utils;

function resetRowHint() {
  state.hintRow = null;
  if (!refs.rowHintEl) {
    return;
  }
  refs.rowHintEl.classList.remove("is-active");
  refs.rowHintEl.style.display = "none";
}

function resetColumnHint() {
  state.hintCol = null;
  if (!refs.colHintEl) {
    return;
  }
  refs.colHintEl.classList.remove("is-active");
  refs.colHintEl.style.display = "none";
}

function resetDiagonalHint() {
  state.hintDiag = null;
  if (!refs.diagHintEl) {
    return;
  }
  refs.diagHintEl.classList.remove("is-active");
  refs.diagHintEl.style.display = "none";
}

function positionRowHint() {
  if (!refs.rowHintEl || state.hintRow === null || !refs.board) {
    if (refs.rowHintEl) {
      refs.rowHintEl.classList.remove("is-active");
      refs.rowHintEl.style.display = "none";
    }
    return;
  }

  var canvas = refs.board.canvas || refs.board.cursorCanvas || refs.board.board;
  if (!canvas || !canvas.getBoundingClientRect) {
    return;
  }

  var size = refs.board.options.boardSize || 19;
  var spacing = refs.board.calcSpaceAndPadding
    ? refs.board.calcSpaceAndPadding(canvas)
    : { space: 0, scaledPadding: 0 };
  var space = spacing.space;
  var scaledPadding = spacing.scaledPadding;
  var row = state.hintRow;
  var x0 = scaledPadding;
  var x1 = scaledPadding + (size - 1) * space;
  var y = scaledPadding + row * space;

  var topLeft = refs.board.transMat.transformPoint(new DOMPoint(x0, y));
  var bottomRight = refs.board.transMat.transformPoint(new DOMPoint(x1, y));
  var rect = canvas.getBoundingClientRect();
  var scaleX = rect.width / canvas.width;
  var scaleY = rect.height / canvas.height;

  var left = topLeft.x * scaleX;
  var right = bottomRight.x * scaleX;
  var top = topLeft.y * scaleY;
  var width = Math.abs(right - left);

  refs.rowHintEl.style.display = "block";
  refs.rowHintEl.style.width = width + "px";
  refs.rowHintEl.style.left = Math.min(left, right) + "px";
  refs.rowHintEl.style.top = top + "px";
  refs.rowHintEl.classList.add("is-active");
}

function positionColumnHint() {
  if (!refs.colHintEl || state.hintCol === null || !refs.board) {
    if (refs.colHintEl) {
      refs.colHintEl.classList.remove("is-active");
      refs.colHintEl.style.display = "none";
    }
    return;
  }

  var canvas = refs.board.canvas || refs.board.cursorCanvas || refs.board.board;
  if (!canvas || !canvas.getBoundingClientRect) {
    return;
  }

  var size = refs.board.options.boardSize || 19;
  var spacing = refs.board.calcSpaceAndPadding
    ? refs.board.calcSpaceAndPadding(canvas)
    : { space: 0, scaledPadding: 0 };
  var space = spacing.space;
  var scaledPadding = spacing.scaledPadding;
  var col = state.hintCol;
  var y0 = scaledPadding;
  var y1 = scaledPadding + (size - 1) * space;
  var x = scaledPadding + col * space;

  var topLeft = refs.board.transMat.transformPoint(new DOMPoint(x, y0));
  var bottomRight = refs.board.transMat.transformPoint(new DOMPoint(x, y1));
  var rect = canvas.getBoundingClientRect();
  var scaleX = rect.width / canvas.width;
  var scaleY = rect.height / canvas.height;

  var top = topLeft.y * scaleY;
  var bottom = bottomRight.y * scaleY;
  var left = topLeft.x * scaleX;
  var height = Math.abs(bottom - top);

  refs.colHintEl.style.display = "block";
  refs.colHintEl.style.height = height + "px";
  refs.colHintEl.style.top = Math.min(top, bottom) + "px";
  refs.colHintEl.style.left = left + "px";
  refs.colHintEl.classList.add("is-active");
}

function positionDiagonalHint() {
  if (!refs.diagHintEl || !state.hintDiag || !refs.board) {
    if (refs.diagHintEl) {
      refs.diagHintEl.classList.remove("is-active");
      refs.diagHintEl.style.display = "none";
    }
    return;
  }

  var canvas = refs.board.canvas || refs.board.cursorCanvas || refs.board.board;
  if (!canvas || !canvas.getBoundingClientRect) {
    return;
  }

  var size = refs.board.options.boardSize || 19;
  var spacing = refs.board.calcSpaceAndPadding
    ? refs.board.calcSpaceAndPadding(canvas)
    : { space: 0, scaledPadding: 0 };
  var space = spacing.space;
  var scaledPadding = spacing.scaledPadding;
  var diag = state.hintDiag;

  var rect = canvas.getBoundingClientRect();
  var scaleX = rect.width / canvas.width;
  var scaleY = rect.height / canvas.height;

  var x0 = 0;
  var y0 = 0;
  var x1 = 0;
  var y1 = 0;
  if (diag.type === "backslash") {
    var offset = diag.value;
    if (offset >= 0) {
      x0 = 0;
      y0 = offset;
    } else {
      x0 = -offset;
      y0 = 0;
    }
    if (offset <= 0) {
      x1 = size - 1;
      y1 = size - 1 + offset;
    } else {
      x1 = size - 1 - offset;
      y1 = size - 1;
    }
  } else {
    var sum = diag.value;
    if (sum <= size - 1) {
      x0 = 0;
      y0 = sum;
    } else {
      x0 = sum - (size - 1);
      y0 = size - 1;
    }
    if (sum <= size - 1) {
      x1 = sum;
      y1 = 0;
    } else {
      x1 = size - 1;
      y1 = sum - (size - 1);
    }
  }

  var startX = scaledPadding + x0 * space;
  var startY = scaledPadding + y0 * space;
  var endX = scaledPadding + x1 * space;
  var endY = scaledPadding + y1 * space;

  var dx = endX - startX;
  var dy = endY - startY;
  var length = Math.sqrt(dx * dx + dy * dy);
  var extend = space * 0.6;
  var ux = dx / length;
  var uy = dy / length;
  var x0e = startX - ux * extend;
  var y0e = startY - uy * extend;
  var x1e = endX + ux * extend;
  var y1e = endY + uy * extend;

  var start = refs.board.transMat.transformPoint(new DOMPoint(x0e, y0e));
  var end = refs.board.transMat.transformPoint(new DOMPoint(x1e, y1e));
  var centerX = (start.x + end.x) / 2 / scaleX;
  var centerY = (start.y + end.y) / 2 / scaleY;
  var dxPx = (end.x - start.x) / scaleX;
  var dyPx = (end.y - start.y) / scaleY;
  var lengthPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
  var angle = Math.atan2(dyPx, dxPx) * (180 / Math.PI);

  var base = refs.board.transMat.transformPoint(new DOMPoint(0, 0));
  var spacePoint = refs.board.transMat.transformPoint(new DOMPoint(space, 0));
  var spacePx = Math.abs(spacePoint.x - base.x) / scaleX;
  var thickness = spacePx * 0.9;

  refs.diagHintEl.style.display = "block";
  refs.diagHintEl.style.left = centerX + "px";
  refs.diagHintEl.style.top = centerY + "px";
  refs.diagHintEl.style.width = lengthPx + "px";
  refs.diagHintEl.style.height = thickness + "px";
  refs.diagHintEl.style.transform =
    "translate(-50%, -50%) rotate(" + angle + "deg)";
  refs.diagHintEl.classList.add("is-active");
}

function clearHints() {
  state.hintMoves = { correct: [], wrong: [] };
  state.hintNeighborStones = [];
  state.hintMode = "none";
  state.extraAllowedMoves = new Set();
  resetRowHint();
  resetColumnHint();
  resetDiagonalHint();
  ui.logMessage("Hints cleared.");
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
    var idx = utils.sgfToIndex(coord);
    if (!idx || mat[idx.i][idx.j] !== GB.Ki.Empty) {
      return;
    }
    appendMarkup(markup, idx.i, idx.j, correctMark);
  });

  state.hintMoves.wrong.forEach(function (coord) {
    var idx = utils.sgfToIndex(coord);
    if (!idx || mat[idx.i][idx.j] !== GB.Ki.Empty) {
      return;
    }
    appendMarkup(markup, idx.i, idx.j, wrongMark);
  });

  state.hintNeighborStones.forEach(function (coord) {
    var idx = utils.sgfToIndex(coord);
    if (!idx || mat[idx.i][idx.j] === GB.Ki.Empty) {
      return;
    }
    appendMarkup(markup, idx.i, idx.j, GB.Markup.Highlight);
  });

  state.blockedMoves.forEach(function (coord) {
    var idx = utils.sgfToIndex(coord);
    if (!idx || mat[idx.i][idx.j] !== GB.Ki.Empty) {
      return;
    }
    appendMarkup(markup, idx.i, idx.j, GB.Markup.Cross);
  });
}

function hintFirstMove() {
  if (state.lives <= 0) {
    ui.setStatus("Out of lives. Reset to continue.", "error");
    return;
  }

  app.board.updateChildMoves();
  if (state.childMoves.length === 0) {
    ui.logMessage("No moves available to hint.");
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
  ui.logMessage("Hinted correct move: " + utils.sgfToA1(correct.sgf));
  app.board.updateBoard();
}

function hintTwoMoves() {
  if (state.lives <= 0) {
    ui.setStatus("Out of lives. Reset to continue.", "error");
    return;
  }

  app.board.updateChildMoves();
  if (state.childMoves.length === 0) {
    ui.logMessage("No moves available to hint.");
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

  var wrong = wrongMoves[Math.floor(Math.random() * wrongMoves.length)] || null;
  if (!wrong) {
    var nearby = pickRandomNearbyWrongMove(correct.sgf);
    if (nearby) {
      wrong = { sgf: nearby };
    }
  }

  if (!wrong || !wrong.sgf) {
    ui.logMessage("Unable to find a wrong move for hint.");
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
    ui.logMessage(
      "Hinted two moves: " +
        utils.sgfToA1(hinted[0]) +
        " / " +
        utils.sgfToA1(hinted[1])
    );
  }

  app.board.updateBoard();
}

function hintWaveNeighbor() {
  if (state.lives <= 0) {
    ui.setStatus("Out of lives. Reset to continue.", "error");
    return;
  }

  app.board.updateChildMoves();
  if (state.childMoves.length === 0) {
    ui.logMessage("No moves available to hint.");
    return;
  }

  var rightMoves = state.childMoves.filter(function (move) {
    return GB.inRightPath(move.node);
  });
  if (rightMoves.length === 0) {
    ui.logMessage("No solution moves to hint.");
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
    ui.logMessage("No neighbor stones next to a solution move.");
    return;
  }

  var pick = eligible[Math.floor(Math.random() * eligible.length)];
  var neighbor = pick.neighbors[Math.floor(Math.random() * pick.neighbors.length)];

  state.hintMoves = { correct: [], wrong: [] };
  state.hintNeighborStones = [neighbor];
  state.hintMode = "single";
  resetRowHint();
  resetColumnHint();
  resetDiagonalHint();
  ui.logMessage("Neighbor hint: " + utils.sgfToA1(neighbor));
  app.board.updateBoard();
}

function hintRowReveal() {
  if (state.lives <= 0) {
    ui.setStatus("Out of lives. Reset to continue.", "error");
    return;
  }

  resetRowHint();
  resetColumnHint();
  resetDiagonalHint();
  app.board.updateChildMoves();
  if (state.childMoves.length === 0) {
    ui.logMessage("No moves available to hint.");
    return;
  }

  var rightMoves = state.childMoves.filter(function (move) {
    return GB.inRightPath(move.node);
  });
  if (rightMoves.length === 0) {
    ui.logMessage("No solution moves to hint.");
    return;
  }

  var rowSet = new Set();
  rightMoves.forEach(function (move) {
    rowSet.add(move.j);
  });
  var rows = Array.from(rowSet);
  if (rows.length === 0) {
    ui.logMessage("No solution rows to reveal.");
    return;
  }

  var row = rows[Math.floor(Math.random() * rows.length)];
  state.hintMoves = { correct: [], wrong: [] };
  state.hintNeighborStones = [];
  state.hintMode = "none";
  state.hintRow = row;

  var size = refs.board && refs.board.options ? refs.board.options.boardSize : 19;
  var label = size - row;
  ui.logMessage("Row reveal: row " + label);
  app.board.updateBoard();
}

function hintColumnReveal() {
  if (state.lives <= 0) {
    ui.setStatus("Out of lives. Reset to continue.", "error");
    return;
  }

  resetRowHint();
  resetColumnHint();
  resetDiagonalHint();
  app.board.updateChildMoves();
  if (state.childMoves.length === 0) {
    ui.logMessage("No moves available to hint.");
    return;
  }

  var rightMoves = state.childMoves.filter(function (move) {
    return GB.inRightPath(move.node);
  });
  if (rightMoves.length === 0) {
    ui.logMessage("No solution moves to hint.");
    return;
  }

  var colSet = new Set();
  rightMoves.forEach(function (move) {
    colSet.add(move.i);
  });
  var cols = Array.from(colSet);
  if (cols.length === 0) {
    ui.logMessage("No solution columns to reveal.");
    return;
  }

  var col = cols[Math.floor(Math.random() * cols.length)];
  state.hintMoves = { correct: [], wrong: [] };
  state.hintNeighborStones = [];
  state.hintMode = "none";
  state.hintCol = col;

  var label = GB.A1_LETTERS[col] || col + 1;
  ui.logMessage("Column reveal: column " + label);
  app.board.updateBoard();
}

function hintDiagonalReveal() {
  if (state.lives <= 0) {
    ui.setStatus("Out of lives. Reset to continue.", "error");
    return;
  }

  resetRowHint();
  resetColumnHint();
  resetDiagonalHint();
  app.board.updateChildMoves();
  if (state.childMoves.length === 0) {
    ui.logMessage("No moves available to hint.");
    return;
  }

  var rightMoves = state.childMoves.filter(function (move) {
    return GB.inRightPath(move.node);
  });
  if (rightMoves.length === 0) {
    ui.logMessage("No solution moves to hint.");
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
    ui.logMessage("No solution diagonals to reveal.");
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
  ui.logMessage("Diagonal reveal: " + label);
  app.board.updateBoard();
}

function pickRandomNearbyWrongMove(correctSgf) {
  var size = GB.extractBoardSize(state.currentNode, 19);
  var res = GB.calcMatAndMarkup(state.currentNode, size);
  var mat = res.mat;
  var idx = utils.sgfToIndex(correctSgf);
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

app.hints.resetRowHint = resetRowHint;
app.hints.resetColumnHint = resetColumnHint;
app.hints.resetDiagonalHint = resetDiagonalHint;
app.hints.positionRowHint = positionRowHint;
app.hints.positionColumnHint = positionColumnHint;
app.hints.positionDiagonalHint = positionDiagonalHint;
app.hints.clearHints = clearHints;
app.hints.clearTemporaryState = clearTemporaryState;
app.hints.setCurrentNode = setCurrentNode;
app.hints.applyHintMarkup = applyHintMarkup;
app.hints.hintFirstMove = hintFirstMove;
app.hints.hintTwoMoves = hintTwoMoves;
app.hints.hintWaveNeighbor = hintWaveNeighbor;
app.hints.hintRowReveal = hintRowReveal;
app.hints.hintColumnReveal = hintColumnReveal;
app.hints.hintDiagonalReveal = hintDiagonalReveal;
