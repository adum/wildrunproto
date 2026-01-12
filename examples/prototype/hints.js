import { app } from "./context.js";

var GB = app.GB;
var state = app.state;
var refs = app.refs;
var ui = app.ui;
var utils = app.utils;
var elements = app.elements;
var configUtils = app.configUtils;

function getNumber(value, fallback) {
  var num = Number(value);
  if (Number.isFinite(num)) {
    return num;
  }
  return fallback;
}

function getMoveCoord(node) {
  var moveProp =
    node && node.model && node.model.moveProps ? node.model.moveProps[0] : null;
  if (!moveProp || !moveProp.value || moveProp.value.length < 2) {
    return null;
  }
  return moveProp.value;
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

function getHintsConfig() {
  return app.config && app.config.hints ? app.config.hints : {};
}

function getMultipleChoiceOptionCount(level) {
  var hintsConfig = getHintsConfig();
  var config = hintsConfig.multipleChoice || {};
  var base = getNumber(config.baseOptions, 4);
  var decrement = getNumber(config.decrementPerLevel, 1);
  var minOptions = getNumber(config.minOptions, 2);
  var safeLevel = clampLevel("hintMultipleChoice", level, 1, 3);
  var count = base - (safeLevel - 1) * decrement;
  count = Math.max(minOptions, count);
  return Math.max(2, Math.round(count));
}

function getBandWidth(levelKey, configKey, level, fallbackWidth) {
  var hintsConfig = getHintsConfig();
  var config = hintsConfig[configKey] || {};
  var base = getNumber(config.baseWidth, fallbackWidth);
  var decrement = getNumber(config.decrementPerLevel, 1);
  var minWidth = getNumber(config.minWidth, 1);
  var safeLevel = clampLevel(levelKey, level, 1, 3);
  var width = base - (safeLevel - 1) * decrement;
  width = Math.max(minWidth, width);
  return Math.max(1, Math.round(width));
}

function getMultishotCount(level) {
  var safeLevel = clampLevel("hintMultishot", level, 1, 3);
  return Math.max(2, safeLevel + 1);
}

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
  if (!refs.rowHintEl || !state.hintRow || !refs.board) {
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

  var rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return;
  }

  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;
  var size = refs.board.options.boardSize || 19;
  var spacing = refs.board.calcSpaceAndPadding
    ? refs.board.calcSpaceAndPadding(canvas)
    : { space: 0, scaledPadding: 0 };
  var space = spacing.space;
  var scaledPadding = spacing.scaledPadding;
  var rowStart = state.hintRow.start;
  var rowCount = state.hintRow.count || 1;
  var rowHeight = space * 0.9;
  var x0 = scaledPadding - space / 2;
  var x1 = scaledPadding + space * (size - 1) + space / 2;
  var firstCenter = scaledPadding + rowStart * space;
  var lastCenter = scaledPadding + (rowStart + rowCount - 1) * space;
  var y0 = firstCenter - rowHeight / 2;
  var y1 = lastCenter + rowHeight / 2;

  var topLeft = refs.board.transMat.transformPoint(new DOMPoint(x0, y0));
  var bottomRight = refs.board.transMat.transformPoint(new DOMPoint(x1, y1));
  var left = topLeft.x / scaleX;
  var top = topLeft.y / scaleY;
  var width = (bottomRight.x - topLeft.x) / scaleX;
  var height = (bottomRight.y - topLeft.y) / scaleY;

  refs.rowHintEl.style.display = "block";
  refs.rowHintEl.style.left = left + "px";
  refs.rowHintEl.style.top = top + "px";
  refs.rowHintEl.style.width = width + "px";
  refs.rowHintEl.style.height = height + "px";
  refs.rowHintEl.classList.add("is-active");
}

function positionColumnHint() {
  if (!refs.colHintEl || !state.hintCol || !refs.board) {
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

  var rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return;
  }

  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;
  var size = refs.board.options.boardSize || 19;
  var spacing = refs.board.calcSpaceAndPadding
    ? refs.board.calcSpaceAndPadding(canvas)
    : { space: 0, scaledPadding: 0 };
  var space = spacing.space;
  var scaledPadding = spacing.scaledPadding;
  var colStart = state.hintCol.start;
  var colCount = state.hintCol.count || 1;
  var colWidth = space * 0.9;
  var firstCenter = scaledPadding + colStart * space;
  var lastCenter = scaledPadding + (colStart + colCount - 1) * space;
  var x0 = firstCenter - colWidth / 2;
  var x1 = lastCenter + colWidth / 2;
  var y0 = scaledPadding - space / 2;
  var y1 = scaledPadding + space * (size - 1) + space / 2;

  var topLeft = refs.board.transMat.transformPoint(new DOMPoint(x0, y0));
  var bottomRight = refs.board.transMat.transformPoint(new DOMPoint(x1, y1));
  var left = topLeft.x / scaleX;
  var top = topLeft.y / scaleY;
  var width = (bottomRight.x - topLeft.x) / scaleX;
  var height = (bottomRight.y - topLeft.y) / scaleY;

  refs.colHintEl.style.display = "block";
  refs.colHintEl.style.left = left + "px";
  refs.colHintEl.style.top = top + "px";
  refs.colHintEl.style.width = width + "px";
  refs.colHintEl.style.height = height + "px";
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

  var rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return;
  }

  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;
  var size = refs.board.options.boardSize || 19;
  var spacing = refs.board.calcSpaceAndPadding
    ? refs.board.calcSpaceAndPadding(canvas)
    : { space: 0, scaledPadding: 0 };
  var space = spacing.space;
  var scaledPadding = spacing.scaledPadding;
  var diag = state.hintDiag;
  var diagCount = Math.max(1, Number(diag.count) || 1);
  var diagStart =
    typeof diag.start === "number" ? diag.start : diag.value;
  if (typeof diagStart !== "number") {
    return;
  }
  var centerValue = diagStart + (diagCount - 1) / 2;

  var i0;
  var j0;
  var i1;
  var j1;
  if (diag.type === "backslash") {
    var d = centerValue;
    i0 = Math.max(0, -d);
    i1 = Math.min(size - 1, size - 1 - d);
    j0 = i0 + d;
    j1 = i1 + d;
  } else {
    var s = centerValue;
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

  var start = refs.board.transMat.transformPoint(new DOMPoint(x0, y0));
  var end = refs.board.transMat.transformPoint(new DOMPoint(x1, y1));
  var centerX = (start.x + end.x) / 2 / scaleX;
  var centerY = (start.y + end.y) / 2 / scaleY;
  var dxPx = (end.x - start.x) / scaleX;
  var dyPx = (end.y - start.y) / scaleY;
  var lengthPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
  var angle = Math.atan2(dyPx, dxPx) * (180 / Math.PI);

  var base = refs.board.transMat.transformPoint(new DOMPoint(0, 0));
  var spacePoint = refs.board.transMat.transformPoint(new DOMPoint(space, 0));
  var spacePx = Math.abs(spacePoint.x - base.x) / scaleX;
  var baseThickness = spacePx * 0.9;
  var diagSpacing = spacePx / Math.SQRT2;
  var thickness = baseThickness + (diagCount - 1) * diagSpacing;

  refs.diagHintEl.style.display = "block";
  refs.diagHintEl.style.left = centerX + "px";
  refs.diagHintEl.style.top = centerY + "px";
  refs.diagHintEl.style.width = lengthPx + "px";
  refs.diagHintEl.style.height = thickness + "px";
  refs.diagHintEl.style.transform =
    "translate(-50%, -50%) rotate(" + angle + "deg)";
  refs.diagHintEl.classList.add("is-active");
}

function updateElimRandomLevelUI() {
  if (elements.elimRandomLevelInput) {
    elements.elimRandomLevelInput.value = String(state.elimRandomLevel);
  }
  if (elements.elimRandomLevelValue) {
    elements.elimRandomLevelValue.textContent = String(state.elimRandomLevel);
  }
}

function setElimRandomLevel(level) {
  var nextLevel = clampLevel("eliminateRandom", level, 1, 3);
  state.elimRandomLevel = nextLevel;
  updateElimRandomLevelUI();
}

function updateMultipleChoiceLevelUI() {
  if (elements.hintTwoLevelInput) {
    elements.hintTwoLevelInput.value = String(state.hintTwoLevel);
  }
  if (elements.hintTwoLevelValue) {
    elements.hintTwoLevelValue.textContent = String(state.hintTwoLevel);
  }
}

function setMultipleChoiceLevel(level) {
  var nextLevel = clampLevel("hintMultipleChoice", level, 1, 3);
  state.hintTwoLevel = nextLevel;
  updateMultipleChoiceLevelUI();
}

function updateMultishotLevelUI() {
  if (elements.hintMultishotLevelInput) {
    elements.hintMultishotLevelInput.value = String(state.hintMultishotLevel);
  }
  if (elements.hintMultishotLevelValue) {
    elements.hintMultishotLevelValue.textContent = String(state.hintMultishotLevel);
  }
}

function setMultishotLevel(level) {
  var nextLevel = clampLevel("hintMultishot", level, 1, 3);
  state.hintMultishotLevel = nextLevel;
  updateMultishotLevelUI();
}

function updateMultishotIndicator() {
  if (!refs.multishotCounterEl) {
    return;
  }
  if (!state.multishotActive || state.multishotRemaining <= 0) {
    refs.multishotCounterEl.style.display = "none";
    refs.multishotCounterEl.textContent = "";
    refs.multishotCounterEl.removeAttribute("aria-label");
    return;
  }
  refs.multishotCounterEl.style.display = "block";
  refs.multishotCounterEl.textContent = String(state.multishotRemaining);
  refs.multishotCounterEl.setAttribute(
    "aria-label",
    state.multishotRemaining + " multishot moves remaining"
  );
  positionMultishotIndicator();
}

function positionMultishotIndicator() {
  if (!refs.multishotCounterEl || !refs.board || !elements.mount) {
    return;
  }
  if (!state.multishotActive || state.multishotRemaining <= 0) {
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
  var mountRect = elements.mount.getBoundingClientRect();
  if (!mountRect.width || !mountRect.height) {
    return;
  }

  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;
  var spacing = refs.board.calcSpaceAndPadding
    ? refs.board.calcSpaceAndPadding(canvas)
    : { space: 0, scaledPadding: 0 };
  var space = spacing.space;
  var scaledPadding = spacing.scaledPadding;
  if (!Number.isFinite(space) || space <= 0 || !Number.isFinite(scaledPadding)) {
    return;
  }

  var size = refs.board.options.boardSize || 19;
  var themeOptions = refs.board.options.themeOptions || {};
  var theme = refs.board.options.theme;
  var ratio =
    (themeOptions[theme] && themeOptions[theme].stoneRatio) ||
    (themeOptions.default && themeOptions.default.stoneRatio) ||
    0.45;
  var radius = space * ratio;
  var margin = Math.max(2, Math.round(space * 0.08));

  var x0 = scaledPadding - radius;
  var y0 = scaledPadding - radius;
  var x1 = scaledPadding + space * (size - 1) + radius;
  var y1 = scaledPadding + space * (size - 1) + radius;
  var p0 = refs.board.transMat.transformPoint(new DOMPoint(x0, y0));
  var p1 = refs.board.transMat.transformPoint(new DOMPoint(x1, y0));
  var p2 = refs.board.transMat.transformPoint(new DOMPoint(x1, y1));
  var p3 = refs.board.transMat.transformPoint(new DOMPoint(x0, y1));
  var minX = Math.min(p0.x, p1.x, p2.x, p3.x);
  var maxX = Math.max(p0.x, p1.x, p2.x, p3.x);
  var minY = Math.min(p0.y, p1.y, p2.y, p3.y);
  var maxY = Math.max(p0.y, p1.y, p2.y, p3.y);
  var offsetX = rect.left - mountRect.left;
  var offsetY = rect.top - mountRect.top;

  var gridLeft = minX / scaleX + offsetX;
  var gridRight = maxX / scaleX + offsetX;
  var gridTop = minY / scaleY + offsetY;
  var gridBottom = maxY / scaleY + offsetY;

  var counterRect = refs.multishotCounterEl.getBoundingClientRect();
  var counterWidth =
    counterRect.width || refs.multishotCounterEl.offsetWidth || 32;
  var counterHeight =
    counterRect.height || refs.multishotCounterEl.offsetHeight || 28;

  var maxLeft = Math.max(0, mountRect.width - counterWidth);
  var maxTop = Math.max(0, mountRect.height - counterHeight);
  var centerLeft = Math.max(
    0,
    Math.min((gridLeft + gridRight - counterWidth) / 2, maxLeft)
  );
  var centerTop = Math.max(
    0,
    Math.min((gridTop + gridBottom - counterHeight) / 2, maxTop)
  );

  var candidates = [];
  function pushCandidate(left, top) {
    var clampedLeft = Math.max(0, Math.min(left, maxLeft));
    var clampedTop = Math.max(0, Math.min(top, maxTop));
    candidates.push({ left: clampedLeft, top: clampedTop });
  }

  if (gridTop >= counterHeight) {
    pushCandidate(centerLeft, gridTop - counterHeight - margin);
  }
  if (mountRect.height - gridBottom >= counterHeight) {
    pushCandidate(centerLeft, gridBottom + margin);
  }
  if (gridLeft >= counterWidth) {
    pushCandidate(gridLeft - counterWidth - margin, centerTop);
  }
  if (mountRect.width - gridRight >= counterWidth) {
    pushCandidate(gridRight + margin, centerTop);
  }

  pushCandidate(gridLeft + margin, gridTop + margin);
  pushCandidate(gridRight - counterWidth - margin, gridTop + margin);
  pushCandidate(gridLeft + margin, gridBottom - counterHeight - margin);
  pushCandidate(
    gridRight - counterWidth - margin,
    gridBottom - counterHeight - margin
  );

  var stoneCenters = [];
  var radiusX = 0;
  var radiusY = 0;
  if (state.currentMat && state.currentMat.length) {
    var base = refs.board.transMat.transformPoint(new DOMPoint(0, 0));
    var radiusXPoint = refs.board.transMat.transformPoint(
      new DOMPoint(radius, 0)
    );
    var radiusYPoint = refs.board.transMat.transformPoint(
      new DOMPoint(0, radius)
    );
    radiusX = Math.abs(radiusXPoint.x - base.x) / scaleX;
    radiusY = Math.abs(radiusYPoint.y - base.y) / scaleY;

    for (var i = 0; i < state.currentMat.length; i += 1) {
      for (var j = 0; j < state.currentMat[i].length; j += 1) {
        if (state.currentMat[i][j] === GB.Ki.Empty) {
          continue;
        }
        var cx = scaledPadding + i * space;
        var cy = scaledPadding + j * space;
        var pos = refs.board.transMat.transformPoint(new DOMPoint(cx, cy));
        stoneCenters.push({
          x: pos.x / scaleX + offsetX,
          y: pos.y / scaleY + offsetY,
        });
      }
    }
  }

  function countStoneHits(candidate) {
    if (!stoneCenters.length) {
      return 0;
    }
    var left = candidate.left - radiusX;
    var right = candidate.left + counterWidth + radiusX;
    var top = candidate.top - radiusY;
    var bottom = candidate.top + counterHeight + radiusY;
    var hits = 0;
    for (var k = 0; k < stoneCenters.length; k += 1) {
      var stone = stoneCenters[k];
      if (stone.x > left && stone.x < right && stone.y > top && stone.y < bottom) {
        hits += 1;
      }
    }
    return hits;
  }

  if (candidates.length === 0) {
    candidates.push({ left: margin, top: margin });
  }

  var pick = candidates[0];
  var bestHits = countStoneHits(pick);
  if (bestHits !== 0) {
    for (var idx = 0; idx < candidates.length; idx += 1) {
      var hits = countStoneHits(candidates[idx]);
      if (hits === 0) {
        pick = candidates[idx];
        bestHits = 0;
        break;
      }
      if (hits < bestHits) {
        pick = candidates[idx];
        bestHits = hits;
      }
    }
  }

  refs.multishotCounterEl.style.left = Math.round(pick.left) + "px";
  refs.multishotCounterEl.style.top = Math.round(pick.top) + "px";
}

function clearMultishot() {
  state.multishotActive = false;
  state.multishotRemaining = 0;
  state.multishotSelections = [];
  state.multishotSelectionSet = new Set();
  updateMultishotIndicator();
}

function updateRowRevealLevelUI() {
  if (elements.hintRowLevelInput) {
    elements.hintRowLevelInput.value = String(state.hintRowLevel);
  }
  if (elements.hintRowLevelValue) {
    elements.hintRowLevelValue.textContent = String(state.hintRowLevel);
  }
}

function setRowRevealLevel(level) {
  var nextLevel = clampLevel("hintRow", level, 1, 3);
  state.hintRowLevel = nextLevel;
  updateRowRevealLevelUI();
}

function updateColumnRevealLevelUI() {
  if (elements.hintColLevelInput) {
    elements.hintColLevelInput.value = String(state.hintColLevel);
  }
  if (elements.hintColLevelValue) {
    elements.hintColLevelValue.textContent = String(state.hintColLevel);
  }
}

function setColumnRevealLevel(level) {
  var nextLevel = clampLevel("hintCol", level, 1, 3);
  state.hintColLevel = nextLevel;
  updateColumnRevealLevelUI();
}

function updateDiagonalRevealLevelUI() {
  if (elements.hintDiagLevelInput) {
    elements.hintDiagLevelInput.value = String(state.hintDiagLevel);
  }
  if (elements.hintDiagLevelValue) {
    elements.hintDiagLevelValue.textContent = String(state.hintDiagLevel);
  }
}

function setDiagonalRevealLevel(level) {
  var nextLevel = clampLevel("hintDiag", level, 1, 3);
  state.hintDiagLevel = nextLevel;
  updateDiagonalRevealLevelUI();
}

function clearHints() {
  state.blockedMoves = new Set();
  state.hintMoves = { correct: [], wrong: [] };
  state.hintNeighborStones = [];
  state.hintMode = "none";
  state.extraAllowedMoves = new Set();
  clearMultishot();
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
  clearMultishot();
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

  if (state.multishotSelections && state.multishotSelections.length > 0) {
    state.multishotSelections.forEach(function (coord) {
      var idx = utils.sgfToIndex(coord);
      if (!idx || mat[idx.i][idx.j] !== GB.Ki.Empty) {
        return;
      }
      appendMarkup(markup, idx.i, idx.j, GB.Markup.NeutralNode);
    });
  }

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

function collectSecondPlayerMoves(firstMoves) {
  var results = [];
  if (!firstMoves || !firstMoves.length) {
    return results;
  }
  firstMoves.forEach(function (move) {
    var firstNode = move.node;
    if (!firstNode || !firstNode.children || firstNode.children.length === 0) {
      return;
    }
    firstNode.children.forEach(function (replyNode) {
      if (!replyNode || !replyNode.children || replyNode.children.length === 0) {
        return;
      }
      replyNode.children.forEach(function (secondNode) {
        if (!secondNode || !GB.inRightPath(secondNode)) {
          return;
        }
        var coord = getMoveCoord(secondNode);
        if (coord) {
          results.push(coord);
        }
      });
    });
  });
  return results;
}

function hintFirstOrSecond() {
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

  var firstPick = rightMoves[Math.floor(Math.random() * rightMoves.length)];
  var options = [];
  var used = new Set();
  function addOption(coord) {
    if (!coord || used.has(coord)) {
      return;
    }
    used.add(coord);
    options.push(coord);
  }

  addOption(firstPick.sgf);
  var secondMoves = collectSecondPlayerMoves(rightMoves);
  if (secondMoves.length > 0) {
    secondMoves.forEach(addOption);
  } else {
    var fallback = pickRandomNearbyIntersection(firstPick.sgf);
    if (fallback) {
      addOption(fallback);
    }
  }

  if (!options.length) {
    ui.logMessage("No moves available to hint.");
    return;
  }

  var choice = options[Math.floor(Math.random() * options.length)];
  state.hintMoves = { correct: [], wrong: [] };
  state.hintNeighborStones = [];
  state.hintMode = "single";
  resetRowHint();
  resetColumnHint();
  resetDiagonalHint();

  var mat = state.currentMat;
  if (!mat) {
    var size = GB.extractBoardSize(state.currentNode, 19);
    var res = GB.calcMatAndMarkup(state.currentNode, size);
    mat = res.mat;
  }
  var idx = utils.sgfToIndex(choice);
  if (idx && mat && mat[idx.i][idx.j] !== GB.Ki.Empty) {
    state.hintNeighborStones = [choice];
  } else {
    state.hintMoves = { correct: [choice], wrong: [] };
  }

  ui.logMessage("First or Second hint: " + utils.sgfToA1(choice));
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

  var optionCount = getMultipleChoiceOptionCount(state.hintTwoLevel);
  var wrongNeeded = optionCount - 1;
  var wrongChoices = [];
  var used = new Set([correct.sgf]);

  var wrongPool = wrongMoves.slice();
  while (wrongChoices.length < wrongNeeded && wrongPool.length > 0) {
    var idx = Math.floor(Math.random() * wrongPool.length);
    var pick = wrongPool.splice(idx, 1)[0];
    if (!pick || !pick.sgf || used.has(pick.sgf)) {
      continue;
    }
    used.add(pick.sgf);
    wrongChoices.push(pick.sgf);
  }

  var attempts = 0;
  while (wrongChoices.length < wrongNeeded && attempts < 40) {
    var nearby = pickRandomNearbyWrongMove(correct.sgf, used);
    if (!nearby) {
      break;
    }
    if (!used.has(nearby)) {
      used.add(nearby);
      wrongChoices.push(nearby);
    }
    attempts += 1;
  }

  if (wrongChoices.length === 0) {
    ui.logMessage("Unable to find wrong moves for multiple choice.");
    state.hintMoves = { correct: [correct.sgf], wrong: [] };
    state.hintNeighborStones = [];
    state.hintMode = "single";
    resetRowHint();
    resetColumnHint();
    resetDiagonalHint();
  } else {
    state.hintMoves = {
      correct: [correct.sgf],
      wrong: wrongChoices,
    };
    state.hintNeighborStones = [];
    state.hintMode = "double";
    resetRowHint();
    resetColumnHint();
    resetDiagonalHint();
    var hinted = [correct.sgf].concat(wrongChoices);
    ui.logMessage(
      "Multiple choice (" +
        hinted.length +
        "): " +
        hinted.map(function (move) {
          return utils.sgfToA1(move);
        }).join(" / ")
    );
  }

  app.board.updateBoard();
}

function hintMultishot() {
  if (state.lives <= 0) {
    ui.setStatus("Out of lives. Reset to continue.", "error");
    return;
  }

  state.hintMoves = { correct: [], wrong: [] };
  state.hintNeighborStones = [];
  state.hintMode = "none";
  state.multishotActive = true;
  state.multishotSelections = [];
  state.multishotSelectionSet = new Set();
  state.multishotRemaining = getMultishotCount(state.hintMultishotLevel);
  resetRowHint();
  resetColumnHint();
  resetDiagonalHint();
  updateMultishotIndicator();
  ui.logMessage(
    "Multishot ready: " + state.multishotRemaining + " moves."
  );
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

  var size = refs.board && refs.board.options ? refs.board.options.boardSize : 19;
  var rowSet = new Set();
  rightMoves.forEach(function (move) {
    rowSet.add(move.j);
  });
  var rows = Array.from(rowSet);
  if (rows.length === 0) {
    ui.logMessage("No solution rows to reveal.");
    return;
  }

  var rowCount = getBandWidth("hintRow", "rowBand", state.hintRowLevel, 3);
  rowCount = Math.min(rowCount, size);
  var anchorRow = rows[Math.floor(Math.random() * rows.length)];
  var maxStart = Math.min(anchorRow, size - rowCount);
  var minStart = Math.max(0, anchorRow - rowCount + 1);
  var possibleStarts = [];
  for (var start = minStart; start <= maxStart; start += 1) {
    possibleStarts.push(start);
  }
  var rowStart =
    possibleStarts[Math.floor(Math.random() * possibleStarts.length)] ||
    Math.max(0, Math.min(anchorRow, size - rowCount));
  state.hintMoves = { correct: [], wrong: [] };
  state.hintNeighborStones = [];
  state.hintMode = "none";
  state.hintRow = { start: rowStart, count: rowCount };

  var startLabel = size - rowStart;
  var endLabel = size - (rowStart + rowCount - 1);
  var label =
    rowCount > 1
      ? "rows " +
        Math.max(startLabel, endLabel) +
        "-" +
        Math.min(startLabel, endLabel)
      : "row " + startLabel;
  ui.logMessage("Row reveal: " + label);
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

  var size = refs.board && refs.board.options ? refs.board.options.boardSize : 19;
  var colSet = new Set();
  rightMoves.forEach(function (move) {
    colSet.add(move.i);
  });
  var cols = Array.from(colSet);
  if (cols.length === 0) {
    ui.logMessage("No solution columns to reveal.");
    return;
  }

  var colCount = getBandWidth("hintCol", "colBand", state.hintColLevel, 3);
  colCount = Math.min(colCount, size);
  var anchorCol = cols[Math.floor(Math.random() * cols.length)];
  var maxStart = Math.min(anchorCol, size - colCount);
  var minStart = Math.max(0, anchorCol - colCount + 1);
  var possibleStarts = [];
  for (var start = minStart; start <= maxStart; start += 1) {
    possibleStarts.push(start);
  }
  var colStart =
    possibleStarts[Math.floor(Math.random() * possibleStarts.length)] ||
    Math.max(0, Math.min(anchorCol, size - colCount));
  state.hintMoves = { correct: [], wrong: [] };
  state.hintNeighborStones = [];
  state.hintMode = "none";
  state.hintCol = { start: colStart, count: colCount };

  var startLabel = GB.A1_LETTERS[colStart] || colStart + 1;
  var endLabel =
    GB.A1_LETTERS[colStart + colCount - 1] || colStart + colCount;
  var label =
    colCount > 1
      ? "columns " + startLabel + "-" + endLabel
      : "column " + startLabel;
  ui.logMessage("Column reveal: " + label);
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

  var size = refs.board && refs.board.options ? refs.board.options.boardSize : 19;
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

  var diagCount = getBandWidth("hintDiag", "diagBand", state.hintDiagLevel, 3);
  var rangeMin =
    choice.type === "backslash" ? -(size - 1) : 0;
  var rangeMax =
    choice.type === "backslash" ? size - 1 : 2 * (size - 1);
  var minStart = Math.max(rangeMin, value - (diagCount - 1));
  var maxStart = Math.min(value, rangeMax - (diagCount - 1));
  var possibleStarts = [];
  for (var start = minStart; start <= maxStart; start += 1) {
    possibleStarts.push(start);
  }
  var diagStart =
    possibleStarts[Math.floor(Math.random() * possibleStarts.length)] ||
    Math.max(rangeMin, Math.min(value, rangeMax - (diagCount - 1)));

  state.hintMoves = { correct: [], wrong: [] };
  state.hintNeighborStones = [];
  state.hintMode = "none";
  state.hintDiag = { type: choice.type, start: diagStart, count: diagCount };

  var label = choice.type === "backslash" ? "\\" : "/";
  var widthLabel =
    diagCount > 1 ? " (" + diagCount + " wide)" : "";
  ui.logMessage("Diagonal reveal: " + label + widthLabel);
  app.board.updateBoard();
}

function pickRandomNearbyWrongMove(correctSgf, extraExclude) {
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
  if (extraExclude) {
    extraExclude.forEach(function (coord) {
      exclude.add(coord);
    });
  }

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

function pickRandomNearbyIntersection(anchorSgf, extraExclude) {
  var size = GB.extractBoardSize(state.currentNode, 19);
  var idx = utils.sgfToIndex(anchorSgf);
  if (!idx) {
    return null;
  }

  var exclude = new Set([anchorSgf]);
  if (extraExclude) {
    if (Array.isArray(extraExclude)) {
      extraExclude.forEach(function (coord) {
        exclude.add(coord);
      });
    } else if (extraExclude.forEach) {
      extraExclude.forEach(function (coord) {
        exclude.add(coord);
      });
    }
  }

  function collectCandidates(radius) {
    var candidates = [];
    for (var di = -radius; di <= radius; di += 1) {
      for (var dj = -radius; dj <= radius; dj += 1) {
        if (di === 0 && dj === 0) {
          continue;
        }
        var i = idx.i + di;
        var j = idx.j + dj;
        if (i < 0 || j < 0 || i >= size || j >= size) {
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
  for (var radius = 1; radius <= 3 && candidates.length === 0; radius += 1) {
    candidates = collectCandidates(radius);
  }

  if (candidates.length === 0) {
    for (var x = 0; x < size; x += 1) {
      for (var y = 0; y < size; y += 1) {
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
app.hints.updateElimRandomLevelUI = updateElimRandomLevelUI;
app.hints.setElimRandomLevel = setElimRandomLevel;
app.hints.updateMultipleChoiceLevelUI = updateMultipleChoiceLevelUI;
app.hints.setMultipleChoiceLevel = setMultipleChoiceLevel;
app.hints.updateMultishotLevelUI = updateMultishotLevelUI;
app.hints.setMultishotLevel = setMultishotLevel;
app.hints.updateMultishotIndicator = updateMultishotIndicator;
app.hints.positionMultishotIndicator = positionMultishotIndicator;
app.hints.clearMultishot = clearMultishot;
app.hints.updateRowRevealLevelUI = updateRowRevealLevelUI;
app.hints.setRowRevealLevel = setRowRevealLevel;
app.hints.updateColumnRevealLevelUI = updateColumnRevealLevelUI;
app.hints.setColumnRevealLevel = setColumnRevealLevel;
app.hints.updateDiagonalRevealLevelUI = updateDiagonalRevealLevelUI;
app.hints.setDiagonalRevealLevel = setDiagonalRevealLevel;
app.hints.clearHints = clearHints;
app.hints.clearTemporaryState = clearTemporaryState;
app.hints.setCurrentNode = setCurrentNode;
app.hints.applyHintMarkup = applyHintMarkup;
app.hints.hintFirstMove = hintFirstMove;
app.hints.hintFirstOrSecond = hintFirstOrSecond;
app.hints.hintTwoMoves = hintTwoMoves;
app.hints.hintMultishot = hintMultishot;
app.hints.hintWaveNeighbor = hintWaveNeighbor;
app.hints.hintRowReveal = hintRowReveal;
app.hints.hintColumnReveal = hintColumnReveal;
app.hints.hintDiagonalReveal = hintDiagonalReveal;
