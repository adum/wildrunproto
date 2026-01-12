const ICON_SOURCES = {
  problem: './img/problem0.svg',
  boss: './img/boss_problem0.svg',
  levelBoss: './img/levelboss_problem0.svg',
  shop: './img/shop0.svg',
  passiveShop: './img/shop-passive.svg?v=2',
  treasure: './img/treasure2.svg',
  start: './img/info-circle.svg'
};

const TYPE_DEFS = {
  start: {
    label: 'Start',
    description: 'Your entry point for this map.'
  },
  empty: {
    label: 'Blank',
    description: 'A quiet hex with no encounter.'
  },
  problem: {
    label: 'Problem',
    description: 'A standard go problem battle.'
  },
  boss: {
    label: 'Boss',
    description: 'A tougher go problem with bonus stakes.'
  },
  levelBoss: {
    label: 'Level Boss',
    description: 'The final fight for this map.'
  },
  shop: {
    label: 'Shop',
    description: 'Spend coins on hints.'
  },
  passiveShop: {
    label: 'Passive Shop',
    description: 'Buy passives and upgrades.'
  },
  treasure: {
    label: 'Treasure',
    description: 'Items to help you on your journey.'
  }
};

const neighborDirs = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 }
];

const HEX_SIZE = 32;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = HEX_SIZE * 2;
const HEX_H_SPACING = HEX_WIDTH;
const HEX_V_SPACING = HEX_SIZE * 1.5;
const CANVAS_PADDING = 20;

function getVoidChance(weights, allowVoid) {
  if (!allowVoid) {
    return 0;
  }
  var passiveShopWeight = weights.passiveShop || 0;
  var total =
    weights.problem +
    weights.boss +
    weights.empty +
    weights.shop +
    passiveShopWeight +
    weights.treasure +
    weights.void;
  if (!total) {
    return 0;
  }
  return weights.void / total;
}

function pickWeighted(candidates, weights) {
  var total = weights.reduce(function (sum, value) {
    return sum + value;
  }, 0);
  if (!total) {
    return candidates[0];
  }
  var roll = Math.random() * total;
  for (var i = 0; i < candidates.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) {
      return candidates[i];
    }
  }
  return candidates[candidates.length - 1];
}

function buildRowCounts(height, maxWidth, voidChance) {
  var counts = [1];
  if (height <= 1) {
    return counts;
  }
  if (height === 2) {
    return [1, 1];
  }

  counts.push(Math.min(maxWidth, 2));

  for (var row = 2; row < height - 1; row += 1) {
    var prev = counts[row - 1];
    var remaining = height - 1 - row;
    var candidates = [-1, 0, 1]
      .map(function (step) {
        return prev + step;
      })
      .filter(function (next) {
        if (next < 1 || next > maxWidth) {
          return false;
        }
        return Math.abs(next - 1) <= remaining;
      });
    if (!candidates.length) {
      counts.push(1);
      continue;
    }
    var weights = candidates.map(function (next) {
      return 1 + voidChance * (maxWidth - next);
    });
    counts.push(pickWeighted(candidates, weights));
  }
  counts.push(1);
  return counts;
}

function buildRowRanges(counts) {
  var ranges = [{ start: 0, width: 1 }];
  if (counts.length === 1) {
    return ranges;
  }

  if (counts[1] === 1) {
    ranges.push({ start: 0, width: 1 });
  } else {
    ranges.push({ start: -1, width: counts[1] });
  }

  for (var row = 2; row < counts.length; row += 1) {
    var prev = ranges[row - 1];
    var width = counts[row];
    var prevL = prev.start;
    var prevR = prev.start + prev.width - 1;
    var minL = Math.max(prevL - 1, prevR - width);
    var maxL = Math.min(prevL, prevR - width + 1);
    if (minL > maxL) {
      return null;
    }
    var start = Math.floor(Math.random() * (maxL - minL + 1)) + minL;
    ranges.push({ start: start, width: width });
  }

  return ranges;
}

function pickType(weights) {
  var passiveShopWeight = weights.passiveShop || 0;
  var weighted = [
    { key: 'problem', weight: weights.problem },
    { key: 'boss', weight: weights.boss },
    { key: 'empty', weight: weights.empty },
    { key: 'shop', weight: weights.shop },
    { key: 'passiveShop', weight: passiveShopWeight },
    { key: 'treasure', weight: weights.treasure }
  ];
  var total = weighted.reduce(function (sum, entry) {
    return sum + entry.weight;
  }, 0);
  if (!total) {
    return 'empty';
  }
  var roll = Math.random() * total;
  for (var i = 0; i < weighted.length; i += 1) {
    roll -= weighted[i].weight;
    if (roll <= 0) {
      return weighted[i].key;
    }
  }
  return weighted[weighted.length - 1].key;
}

function getNeighbors(node, map) {
  return neighborDirs
    .map(function (dir) {
      var id = node.q + dir.q + ',' + (node.r + dir.r);
      return map.nodeById.get(id);
    })
    .filter(Boolean);
}

function hasForwardPath(map) {
  var queue = [map.startId];
  var seen = new Set(queue);
  while (queue.length) {
    var id = queue.shift();
    if (id === map.endId) {
      return true;
    }
    var node = map.nodeById.get(id);
    var neighbors = getNeighbors(node, map).filter(function (neighbor) {
      return neighbor.r >= node.r;
    });
    neighbors.forEach(function (neighbor) {
      if (!seen.has(neighbor.id)) {
        seen.add(neighbor.id);
        queue.push(neighbor.id);
      }
    });
  }
  return false;
}

function hasRequiredLinks(map) {
  var height = map.rows.length;
  for (var i = 0; i < map.nodes.length; i += 1) {
    var node = map.nodes[i];
    if (node.r > 0) {
      var parentLeft = map.nodeById.get(node.q + ',' + (node.r - 1));
      var parentRight = map.nodeById.get((node.q + 1) + ',' + (node.r - 1));
      if (!parentLeft && !parentRight) {
        return false;
      }
    }
    if (node.r < height - 1) {
      var childLeft = map.nodeById.get(node.q + ',' + (node.r + 1));
      var childRight = map.nodeById.get((node.q - 1) + ',' + (node.r + 1));
      if (!childLeft && !childRight) {
        return false;
      }
    }
  }
  return true;
}

function layoutNodes(nodes) {
  var minX = Infinity;
  var maxX = -Infinity;
  var minY = Infinity;
  var maxY = -Infinity;

  nodes.forEach(function (node) {
    var x = HEX_H_SPACING * (node.q + node.r / 2);
    var y = HEX_V_SPACING * node.r;
    node.pixel = { x: x, y: y };
    minX = Math.min(minX, x - HEX_WIDTH / 2);
    maxX = Math.max(maxX, x + HEX_WIDTH / 2);
    minY = Math.min(minY, y - HEX_HEIGHT / 2);
    maxY = Math.max(maxY, y + HEX_HEIGHT / 2);
  });

  var width = maxX - minX + CANVAS_PADDING * 2;
  var height = maxY - minY + CANVAS_PADDING * 2;
  var offsetX = CANVAS_PADDING - minX;
  var offsetY = CANVAS_PADDING - minY;

  nodes.forEach(function (node) {
    node.pixel.x += offsetX;
    node.pixel.y += offsetY;
  });

  return { width: width, height: height };
}

function createMap(config, options) {
  var maxAttempts = options && options.maxAttempts ? options.maxAttempts : 60;
  for (var attempt = 0; attempt < maxAttempts; attempt += 1) {
    var voidChance = getVoidChance(config.weights, config.allowVoid);
    var counts = buildRowCounts(config.height, config.maxWidth, voidChance);
    var ranges = buildRowRanges(counts);
    if (!ranges) {
      continue;
    }
    var nodes = [];
    var nodeById = new Map();
    var rows = [];
    var valid = true;

    function applyNodeType(node, type) {
      var def = TYPE_DEFS[type] || TYPE_DEFS.empty;
      node.type = type;
      node.label = def.label;
      node.description = def.description;
      node.icon = def.icon;
    }

    function addNode(q, row, forcedType) {
      var type = forcedType || 'empty';
      if (!forcedType) {
        if (row === 0) {
          type = 'start';
        } else if (row === config.height - 1) {
          type = 'levelBoss';
        } else {
          type = pickType(config.weights);
        }
      }
      var id = q + ',' + row;
      var node = {
        id: id,
        q: q,
        r: row,
        type: type,
        label: "",
        description: "",
        icon: ""
      };
      applyNodeType(node, type);
      nodes.push(node);
      nodeById.set(id, node);
      return node;
    }

    function enforceUniqueType(nodes, type) {
      var matches = nodes.filter(function (node) {
        return node.type === type;
      });
      if (matches.length <= 1) {
        return;
      }
      var keep = matches[Math.floor(Math.random() * matches.length)];
      matches.forEach(function (node) {
        if (node !== keep) {
          applyNodeType(node, 'empty');
        }
      });
    }

    for (var row = 0; row < config.height; row += 1) {
      var rowNodes = [];
      var range = ranges[row];
      if (row === 1 && config.height > 2) {
        if (range.start > -1 || range.start + range.width - 1 < 0) {
          valid = false;
          break;
        }
      }
      var requiredQs =
        row === 1 && config.height > 2 ? new Set([-1, 0]) : new Set();
      for (var i = 0; i < range.width; i += 1) {
        var q = range.start + i;
        var keep = true;
        if (row > 0 && row < config.height - 1) {
          if (requiredQs.has(q)) {
            keep = true;
          } else if (config.allowVoid && Math.random() < voidChance) {
            keep = false;
          }
        }
        if (!keep) {
          continue;
        }
        rowNodes.push(addNode(q, row));
      }
      if (!rowNodes.length) {
        var fallbackQ = range.start + Math.floor(range.width / 2);
        rowNodes.push(addNode(fallbackQ, row));
      }
      rows.push(rowNodes);
    }

    if (!valid) {
      continue;
    }

    var startNode = nodes.find(function (node) {
      return node.type === 'start';
    });
    var endNode = nodes.find(function (node) {
      return node.type === 'levelBoss';
    });
    if (!startNode || !endNode) {
      continue;
    }

    enforceUniqueType(nodes, 'shop');
    enforceUniqueType(nodes, 'passiveShop');

    var map = {
      nodes: nodes,
      nodeById: nodeById,
      rows: rows,
      startId: startNode.id,
      endId: endNode.id
    };

    var startBranches = getNeighbors(startNode, map).filter(function (neighbor) {
      return neighbor.r === startNode.r + 1;
    });
    if (config.height > 2 && startBranches.length < 2) {
      continue;
    }

    if (!hasRequiredLinks(map)) {
      continue;
    }

    if (hasForwardPath(map)) {
      return map;
    }
  }

  return null;
}

function createFallbackMap(height) {
  var nodes = [];
  var nodeById = new Map();
  var rows = [];
  for (var row = 0; row < height; row += 1) {
    var qs = [0];
    if (row === 1 && height > 2) {
      qs = [-1, 0];
    } else if (row > 1) {
      qs = [-1];
    }
    var rowNodes = [];
    qs.forEach(function (q) {
      var type = row === 0 ? 'start' : row === height - 1 ? 'levelBoss' : 'empty';
      var id = q + ',' + row;
      var def = TYPE_DEFS[type] || TYPE_DEFS.empty;
      var node = {
        id: id,
        q: q,
        r: row,
        type: type,
        label: def.label,
        description: def.description,
        icon: def.icon
      };
      nodes.push(node);
      nodeById.set(id, node);
      rowNodes.push(node);
    });
    rows.push(rowNodes);
  }
  var endNode = nodes.find(function (node) {
    return node.type === 'levelBoss';
  });
  return {
    nodes: nodes,
    nodeById: nodeById,
    rows: rows,
    startId: '0,0',
    endId: endNode ? endNode.id : '0,' + (height - 1)
  };
}

function createPlayMap(options) {
  var canvas = options.canvas;
  var statusEl = options.status;
  var infoTitle = options.infoTitle;
  var infoDesc = options.infoDesc;
  var infoHint = options.infoHint;
  var overlay = options.overlay;
  var onMove = options.onMove;

  var mapState = {
    map: null,
    currentId: null,
    selectedId: null,
    visited: new Set(),
    tooltipId: null,
    suppressClose: false,
    debugJumpId: null,
    debugJumpAt: 0,
    bounds: { width: 0, height: 0 }
  };

  function setStatus(text) {
    if (statusEl) {
      statusEl.textContent = text;
    }
  }

  function updateInfo(node, isPreview) {
    if (!infoTitle || !infoDesc || !infoHint) {
      return;
    }
    if (!node) {
      infoTitle.textContent = 'Select a node';
      infoDesc.textContent = 'Click a neighboring hex to preview it.';
      infoHint.textContent = 'Click again to move.';
      return;
    }
    infoTitle.textContent = node.label || 'Unknown';
    infoDesc.textContent = node.description || '';
    infoHint.textContent = isPreview ? 'Click again to move forward.' : 'Choose a highlighted neighbor.';
  }

  function closeTooltip() {
    if (!mapState.tooltipId) {
      return;
    }
    mapState.tooltipId = null;
    render(false);
  }

  function isDebugJumpEvent(event) {
    return (
      event &&
      (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
    );
  }

  function recordDebugJump(node) {
    mapState.debugJumpId = node.id;
    mapState.debugJumpAt = Date.now();
  }

  function isDuplicateDebugJump(node) {
    return (
      mapState.debugJumpId === node.id &&
      Date.now() - mapState.debugJumpAt < 350
    );
  }

  function renderTooltip() {
    if (!mapState.tooltipId || !mapState.map) {
      return;
    }
    var node = mapState.map.nodeById.get(mapState.tooltipId);
    if (!node || node.type === 'empty') {
      return;
    }

    var tooltip = document.createElement('div');
    tooltip.className = 'play-map__tooltip';
    var title = document.createElement('div');
    title.className = 'play-map__tooltip-title';
    title.textContent = node.label || '';
    var body = document.createElement('div');
    body.className = 'play-map__tooltip-body';
    body.textContent = node.description || '';
    tooltip.appendChild(title);
    tooltip.appendChild(body);

    var reachable = mapState.reachable && mapState.reachable.has(node.id);
    if (reachable) {
      var goButton = document.createElement('button');
      goButton.type = 'button';
      goButton.className = 'button play-map__tooltip-cta';
      goButton.textContent = 'Go';
      goButton.addEventListener('click', function (event) {
        if (event) {
          event.stopPropagation();
        }
        moveToNode(node);
      });
      tooltip.appendChild(goButton);
    }
    canvas.appendChild(tooltip);

    var margin = 12;
    var gap = 10;
    var baseX = node.pixel.x;
    var baseY = node.pixel.y;
    var hexRect = {
      left: baseX - HEX_WIDTH / 2,
      right: baseX + HEX_WIDTH / 2,
      top: baseY - HEX_HEIGHT / 2,
      bottom: baseY + HEX_HEIGHT / 2
    };

    var tooltipWidth = tooltip.offsetWidth;
    var tooltipHeight = tooltip.offsetHeight;
    var placements = [
      {
        side: 'right',
        left: hexRect.right + gap,
        top: baseY - tooltipHeight / 2
      },
      {
        side: 'left',
        left: hexRect.left - gap - tooltipWidth,
        top: baseY - tooltipHeight / 2
      },
      {
        side: 'bottom',
        left: baseX - tooltipWidth / 2,
        top: hexRect.bottom + gap
      },
      {
        side: 'top',
        left: baseX - tooltipWidth / 2,
        top: hexRect.top - gap - tooltipHeight
      }
    ];

    var chosen = placements.find(function (placement) {
      return (
        placement.left >= margin &&
        placement.left + tooltipWidth <= mapState.bounds.width - margin &&
        placement.top >= margin &&
        placement.top + tooltipHeight <= mapState.bounds.height - margin
      );
    });

    if (!chosen) {
      chosen = placements
        .map(function (placement) {
          var visibleWidth = Math.min(
            mapState.bounds.width - margin,
            placement.left + tooltipWidth
          ) - Math.max(margin, placement.left);
          var visibleHeight = Math.min(
            mapState.bounds.height - margin,
            placement.top + tooltipHeight
          ) - Math.max(margin, placement.top);
          var area = Math.max(0, visibleWidth) * Math.max(0, visibleHeight);
          return { placement: placement, area: area };
        })
        .sort(function (a, b) {
          return b.area - a.area;
        })[0].placement;
    }

    tooltip.dataset.side = chosen.side;
    tooltip.style.left = chosen.left + 'px';
    tooltip.style.top = chosen.top + 'px';
  }

  function getReachableIds() {
    var reachable = new Set();
    if (!mapState.map) {
      return reachable;
    }
    var current = mapState.map.nodeById.get(mapState.currentId);
    if (!current) {
      return reachable;
    }
    getNeighbors(current, mapState.map)
      .filter(function (neighbor) {
        return neighbor.r >= current.r;
      })
      .forEach(function (neighbor) {
        if (!mapState.visited.has(neighbor.id)) {
          reachable.add(neighbor.id);
        }
      });
    return reachable;
  }

  function moveToNode(node, force) {
    if (!node) {
      return;
    }
    if (!force) {
      var reachable = mapState.reachable || getReachableIds();
      if (!reachable.has(node.id)) {
        return;
      }
    }
    mapState.currentId = node.id;
    mapState.visited.add(node.id);
    mapState.selectedId = null;
    mapState.tooltipId = null;
    updateInfo(node, false);
    setStatus('Moved to ' + node.label + '.');

    render(false);
    if (onMove) {
      onMove(node);
    }
  }

  function render(animate) {
    if (!canvas || !mapState.map) {
      return;
    }
    while (canvas.firstChild) {
      canvas.removeChild(canvas.firstChild);
    }

    mapState.bounds = layoutNodes(mapState.map.nodes);
    canvas.style.width = mapState.bounds.width + 'px';
    canvas.style.height = mapState.bounds.height + 'px';
    canvas.style.setProperty('--map-hex-width', HEX_WIDTH + 'px');
    canvas.style.setProperty('--map-hex-height', HEX_HEIGHT + 'px');

    var reachable = getReachableIds();
    mapState.reachable = reachable;

    mapState.map.nodes.forEach(function (node) {
      var hex = document.createElement('button');
      hex.type = 'button';
      hex.className = 'play-map__hex';
      hex.dataset.id = node.id;
      hex.dataset.type = node.type;
      hex.style.left = node.pixel.x + 'px';
      hex.style.top = node.pixel.y + 'px';
      hex.title = node.label;

      if (mapState.visited.has(node.id) && node.id !== mapState.currentId) {
        hex.classList.add('is-visited');
      }
      if (node.id === mapState.currentId) {
        hex.classList.add('is-current');
      }
      if (reachable.has(node.id)) {
        hex.classList.add('is-reachable');
      }
      if (node.id === mapState.selectedId) {
        hex.classList.add('is-selected');
      }
      if (animate) {
        hex.classList.add('play-map__hex--animate');
        hex.style.animationDelay = node.r * 60 + 'ms';
      }

      var shape = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      shape.classList.add('play-map__shape');
      shape.setAttribute('viewBox', '0 0 100 100');
      shape.setAttribute('preserveAspectRatio', 'none');
      shape.setAttribute('aria-hidden', 'true');
      var borderPolygon = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'polygon'
      );
      borderPolygon.setAttribute('points', '50 2 93 25 93 75 50 98 7 75 7 25');
      var fillPolygon = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'polygon'
      );
      fillPolygon.classList.add('play-map__shape-fill');
      fillPolygon.setAttribute('points', '50 2 93 25 93 75 50 98 7 75 7 25');
      shape.appendChild(borderPolygon);
      shape.appendChild(fillPolygon);
      hex.appendChild(shape);

      var fill = getHexFill(node.type);
      if (fill) {
        hex.style.setProperty('--hex-fill', fill);
      }

      var iconSrc = ICON_SOURCES[node.type] || '';
      if (iconSrc) {
        var icon = document.createElement('div');
        icon.className = 'play-map__icon';
        var img = document.createElement('img');
        img.alt = node.label;
        img.src = iconSrc;
        icon.appendChild(img);
        hex.appendChild(icon);
      }

      if (node.id === mapState.currentId) {
        var marker = document.createElement('div');
        marker.className = 'play-map__marker';
        hex.appendChild(marker);
      }

      canvas.appendChild(hex);
    });

    renderTooltip();
  }

  function getHexFill(type) {
    if (type === 'start') {
      return '#fef4e6';
    }
    if (type === 'empty') {
      return '#fdf8f2';
    }
    if (type === 'problem') {
      return '#eef3f3';
    }
    if (type === 'boss') {
      return '#fdeedc';
    }
    if (type === 'levelBoss') {
      return '#f7e2e2';
    }
  if (type === 'shop') {
    return '#e8f3f1';
  }
  if (type === 'passiveShop') {
    return '#eef2f6';
  }
  if (type === 'treasure') {
    return '#fff1cf';
  }
    return '#fef8ef';
  }

  function handleCanvasClick(event) {
    var target = event.target.closest('.play-map__hex');
    if (!target || !canvas.contains(target)) {
      return;
    }
    var node = mapState.map.nodeById.get(target.dataset.id);
    if (!node) {
      return;
    }
    if (isDebugJumpEvent(event) && event.detail > 1) {
      if (node.id === mapState.currentId || isDuplicateDebugJump(node)) {
        return;
      }
      moveToNode(node, true);
      recordDebugJump(node);
      return;
    }

    var reachable = getReachableIds();
    var isReachable = reachable.has(node.id);
    var hasTooltip = node.type !== 'empty';

    if (hasTooltip) {
      if (!isReachable && mapState.tooltipId === node.id) {
        closeTooltip();
        return;
      }
      mapState.tooltipId = node.id;
      mapState.suppressClose = true;
      updateInfo(node, true);
    } else {
      closeTooltip();
    }

    if (node.id === mapState.currentId) {
      updateInfo(node, false);
      render(false);
      return;
    }

    if (!isReachable) {
      if (!hasTooltip) {
        setStatus('That hex is not reachable yet.');
      }
      render(false);
      return;
    }

    if (mapState.selectedId !== node.id) {
      mapState.selectedId = node.id;
      updateInfo(node, true);
      setStatus('Previewing ' + node.label + '.');
      render(false);
      return;
    }
    moveToNode(node);
  }

  function handleCanvasDoubleClick(event) {
    if (!isDebugJumpEvent(event)) {
      return;
    }
    if (!mapState.map) {
      return;
    }
    var target = event.target.closest('.play-map__hex');
    if (!target || !canvas.contains(target)) {
      return;
    }
    var node = mapState.map.nodeById.get(target.dataset.id);
    if (!node) {
      return;
    }
    if (node.id === mapState.currentId) {
      return;
    }
    if (isDuplicateDebugJump(node)) {
      return;
    }
    moveToNode(node, true);
    recordDebugJump(node);
    if (event.preventDefault) {
      event.preventDefault();
    }
  }

  function setMap(map) {
    mapState.map = map;
    mapState.currentId = map.startId;
    mapState.selectedId = null;
    mapState.tooltipId = null;
    mapState.visited = new Set([map.startId]);
    updateInfo(map.nodeById.get(map.startId), false);
    setStatus('Map ready. Select a neighbor.');
    render(true);
  }

  function isVisible() {
    return !overlay || !overlay.classList.contains('is-hidden');
  }

  function attachListeners() {
    if (canvas) {
      canvas.addEventListener('click', handleCanvasClick);
      canvas.addEventListener('dblclick', handleCanvasDoubleClick);
    }
    document.addEventListener('click', function () {
      if (!mapState.tooltipId || !isVisible()) {
        return;
      }
      if (mapState.suppressClose) {
        mapState.suppressClose = false;
        return;
      }
      closeTooltip();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeTooltip();
      }
    });
  }

  attachListeners();

  return {
    setMap: setMap,
    render: function () {
      render(false);
    },
    createMap: createMap,
    createFallbackMap: createFallbackMap,
    getState: function () {
      return mapState;
    },
    setStatus: setStatus,
    setCurrent: function (id) {
      mapState.currentId = id;
      mapState.visited.add(id);
      render(false);
    }
  };
}

export { createPlayMap, createMap, createFallbackMap };
