const mapCanvas = document.getElementById('mapCanvas');
const mapStatus = document.getElementById('mapStatus');
const mapInfoTitle = document.getElementById('mapInfoTitle');
const mapInfoDesc = document.getElementById('mapInfoDesc');
const mapInfoHint = document.getElementById('mapInfoHint');
const regenBtn = document.getElementById('regenBtn');

const heightInput = document.getElementById('heightInput');
const widthInput = document.getElementById('widthInput');
const problemInput = document.getElementById('problemInput');
const bossInput = document.getElementById('bossInput');
const emptyInput = document.getElementById('emptyInput');
const shopInput = document.getElementById('shopInput');
const treasureInput = document.getElementById('treasureInput');
const voidInput = document.getElementById('voidInput');

const heightValue = document.getElementById('heightValue');
const widthValue = document.getElementById('widthValue');
const problemValue = document.getElementById('problemValue');
const bossValue = document.getElementById('bossValue');
const emptyValue = document.getElementById('emptyValue');
const shopValue = document.getElementById('shopValue');
const treasureValue = document.getElementById('treasureValue');
const voidValue = document.getElementById('voidValue');

const allowVoidInput = document.getElementById('allowVoidInput');
const showLinksInput = document.getElementById('showLinksInput');
const showLabelsInput = document.getElementById('showLabelsInput');

const HEX_SIZE = 38;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = HEX_SIZE * 2;
const HEX_H_SPACING = HEX_WIDTH;
const HEX_V_SPACING = HEX_SIZE * 1.5;
const CANVAS_PADDING = 28;
const MAX_ATTEMPTS = 50;
const ICON_SOURCES = {
  problem: './img/problem0.svg',
  boss: './img/boss_problem0.svg',
  levelBoss: './img/levelboss_problem0.svg',
  shop: './img/shop0.svg',
  treasure: './img/treasure0.svg'
};

const TYPE_DEFS = {
  start: {
    label: 'Start',
    icon: 'IN',
    description: 'Your entry point for this level map.'
  },
  empty: {
    label: 'Blank',
    icon: '',
    description: 'A quiet hex with no encounter.'
  },
  problem: {
    label: 'Problem',
    icon: '',
    description: 'A standard go problem battle.'
  },
  boss: {
    label: 'Boss',
    icon: '',
    description: 'A tougher go problem with bonus stakes.'
  },
  levelBoss: {
    label: 'Level Boss',
    icon: '',
    description: 'The final fight for this map.'
  },
  shop: {
    label: 'Shop',
    icon: '',
    description: 'Spend coins on hints or passives.'
  },
  treasure: {
    label: 'Treasure',
    icon: '',
    description: 'Collect a reward or bonus.'
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

const state = {
  map: null,
  currentId: null,
  selectedId: null,
  tooltipId: null,
  suppressClose: false,
  visited: new Set(),
  pendingReset: null
};

let regenTimer = null;

function scheduleRegen() {
  if (regenTimer) {
    clearTimeout(regenTimer);
  }
  regenTimer = setTimeout(function () {
    regenTimer = null;
    regenerateMap();
  }, 80);
}

function updateValues() {
  heightValue.textContent = heightInput.value;
  widthValue.textContent = widthInput.value;
  problemValue.textContent = problemInput.value;
  bossValue.textContent = bossInput.value;
  emptyValue.textContent = emptyInput.value;
  shopValue.textContent = shopInput.value;
  treasureValue.textContent = treasureInput.value;
  voidValue.textContent = voidInput.value;
}

function getConfig() {
  return {
    height: Number(heightInput.value),
    maxWidth: Math.max(2, Number(widthInput.value)),
    weights: {
      problem: Number(problemInput.value),
      boss: Number(bossInput.value),
      empty: Number(emptyInput.value),
      shop: Number(shopInput.value),
      treasure: Number(treasureInput.value),
      void: Number(voidInput.value)
    },
    allowVoid: allowVoidInput.checked,
    showLinks: showLinksInput.checked,
    showLabels: showLabelsInput.checked
  };
}

function getVoidBias(weights, allowVoid) {
  if (!allowVoid) {
    return 0;
  }
  const total =
    weights.problem +
    weights.boss +
    weights.empty +
    weights.shop +
    weights.treasure +
    weights.void;
  if (!total) {
    return 0;
  }
  return weights.void / total;
}

function pickWeighted(candidates, weights) {
  const total = weights.reduce(function (sum, value) {
    return sum + value;
  }, 0);
  if (!total) {
    return candidates[0];
  }
  var roll = Math.random() * total;
  for (let i = 0; i < candidates.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) {
      return candidates[i];
    }
  }
  return candidates[candidates.length - 1];
}

function buildRowCounts(height, maxWidth, voidBias) {
  const counts = [1];
  if (height <= 1) {
    return counts;
  }
  if (height === 2) {
    return [1, 1];
  }

  counts.push(Math.min(maxWidth, 2));

  for (let row = 2; row < height - 1; row += 1) {
    const prev = counts[row - 1];
    const remaining = height - 1 - row;
    const candidates = [-1, 0, 1]
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
    const weights = candidates.map(function (next) {
      return 1 + voidBias * (maxWidth - next);
    });
    counts.push(pickWeighted(candidates, weights));
  }
  counts.push(1);
  return counts;
}

function buildRowRanges(counts) {
  const ranges = [{ start: 0, width: 1 }];
  if (counts.length === 1) {
    return ranges;
  }

  if (counts[1] === 1) {
    ranges.push({ start: 0, width: 1 });
  } else {
    ranges.push({ start: -1, width: counts[1] });
  }

  for (let row = 2; row < counts.length; row += 1) {
    const prev = ranges[row - 1];
    const width = counts[row];
    const prevL = prev.start;
    const prevR = prev.start + prev.width - 1;
    const minL = Math.max(prevL - 1, prevR - width);
    const maxL = Math.min(prevL, prevR - width + 1);
    if (minL > maxL) {
      return null;
    }
    const start = Math.floor(Math.random() * (maxL - minL + 1)) + minL;
    ranges.push({ start: start, width: width });
  }

  return ranges;
}

function pickType(weights, allowVoid) {
  const weighted = [
    { key: 'problem', weight: weights.problem },
    { key: 'boss', weight: weights.boss },
    { key: 'empty', weight: weights.empty },
    { key: 'shop', weight: weights.shop },
    { key: 'treasure', weight: weights.treasure }
  ];
  if (allowVoid) {
    weighted.push({ key: 'void', weight: weights.void });
  }
  const total = weighted.reduce(function (sum, entry) {
    return sum + entry.weight;
  }, 0);
  if (!total) {
    return 'empty';
  }
  var roll = Math.random() * total;
  for (let i = 0; i < weighted.length; i += 1) {
    roll -= weighted[i].weight;
    if (roll <= 0) {
      return weighted[i].key;
    }
  }
  return weighted[weighted.length - 1].key;
}

function buildMap(config) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const voidBias = getVoidBias(config.weights, config.allowVoid);
    const counts = buildRowCounts(config.height, config.maxWidth, voidBias);
    const ranges = buildRowRanges(counts);
    if (!ranges) {
      continue;
    }
    const nodes = [];
    const nodeById = new Map();
    const rows = [];

    for (let row = 0; row < config.height; row += 1) {
      const rowNodes = [];
      const range = ranges[row];
      for (let i = 0; i < range.width; i += 1) {
        const q = range.start + i;
        let type = 'empty';
        if (row === 0) {
          type = 'start';
        } else if (row === config.height - 1) {
          type = 'levelBoss';
        } else {
          type = pickType(config.weights, false);
        }
        const id = q + ',' + row;
        const def = TYPE_DEFS[type] || TYPE_DEFS.empty;
        const node = {
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
      }
      rows.push(rowNodes);
    }

    const startId = nodes.find(function (node) {
      return node.type === 'start';
    }).id;
    const endId = nodes.find(function (node) {
      return node.type === 'levelBoss';
    }).id;

    const map = {
      nodes: nodes,
      nodeById: nodeById,
      rows: rows,
      startId: startId,
      endId: endId
    };

    const startNode = map.nodeById.get(map.startId);
    const startBranches = getNeighbors(startNode, map).filter(function (neighbor) {
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

function buildFallbackMap(height) {
  const nodes = [];
  const nodeById = new Map();
  const rows = [];
  for (let row = 0; row < height; row += 1) {
    let qs = [0];
    if (row === 1 && height > 2) {
      qs = [-1, 0];
    } else if (row > 1) {
      qs = [-1];
    }
    const rowNodes = [];
    qs.forEach(function (q) {
      const type =
        row === 0 ? 'start' : row === height - 1 ? 'levelBoss' : 'empty';
      const id = q + ',' + row;
      const def = TYPE_DEFS[type] || TYPE_DEFS.empty;
      const node = {
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
  const endNode = nodes.find(function (node) {
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

function hasForwardPath(map) {
  const queue = [map.startId];
  const seen = new Set(queue);
  while (queue.length) {
    const id = queue.shift();
    if (id === map.endId) {
      return true;
    }
    const node = map.nodeById.get(id);
    const neighbors = getNeighbors(node, map).filter(function (neighbor) {
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
  const height = map.rows.length;
  for (let i = 0; i < map.nodes.length; i += 1) {
    const node = map.nodes[i];
    if (node.r > 0) {
      const parentLeft = map.nodeById.get(node.q + ',' + (node.r - 1));
      const parentRight = map.nodeById.get((node.q + 1) + ',' + (node.r - 1));
      if (!parentLeft && !parentRight) {
        return false;
      }
    }
    if (node.r < height - 1) {
      const childLeft = map.nodeById.get(node.q + ',' + (node.r + 1));
      const childRight = map.nodeById.get((node.q - 1) + ',' + (node.r + 1));
      if (!childLeft && !childRight) {
        return false;
      }
    }
  }
  return true;
}

function getNeighbors(node, map) {
  return neighborDirs
    .map(function (dir) {
      const id = node.q + dir.q + ',' + (node.r + dir.r);
      return map.nodeById.get(id);
    })
    .filter(Boolean);
}

function layoutNodes(nodes) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach(function (node) {
    const x = HEX_H_SPACING * (node.q + node.r / 2);
    const y = HEX_V_SPACING * node.r;
    node.pixel = { x: x, y: y };
    minX = Math.min(minX, x - HEX_WIDTH / 2);
    maxX = Math.max(maxX, x + HEX_WIDTH / 2);
    minY = Math.min(minY, y - HEX_HEIGHT / 2);
    maxY = Math.max(maxY, y + HEX_HEIGHT / 2);
  });

  const width = maxX - minX + CANVAS_PADDING * 2;
  const height = maxY - minY + CANVAS_PADDING * 2;
  const offsetX = CANVAS_PADDING - minX;
  const offsetY = CANVAS_PADDING - minY;

  nodes.forEach(function (node) {
    node.pixel.x += offsetX;
    node.pixel.y += offsetY;
  });

  return { width: width, height: height };
}

function createLinks(map, width, height) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'map-links');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

  map.nodes.forEach(function (node) {
    const neighbors = getNeighbors(node, map).filter(function (neighbor) {
      return neighbor.r === node.r + 1;
    });
    neighbors.forEach(function (neighbor) {
      const line = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line'
      );
      line.setAttribute('x1', node.pixel.x);
      line.setAttribute('y1', node.pixel.y + HEX_HEIGHT * 0.2);
      line.setAttribute('x2', neighbor.pixel.x);
      line.setAttribute('y2', neighbor.pixel.y - HEX_HEIGHT * 0.2);
      svg.appendChild(line);
    });
  });

  return svg;
}

function getReachableIds() {
  const reachable = new Set();
  const current = state.map.nodeById.get(state.currentId);
  if (!current) {
    return reachable;
  }
  getNeighbors(current, state.map)
    .filter(function (neighbor) {
      return neighbor.r >= current.r;
    })
    .forEach(function (neighbor) {
      if (!state.visited.has(neighbor.id)) {
        reachable.add(neighbor.id);
      }
    });
  return reachable;
}

function updateInfo(node, isPreview) {
  if (!node) {
    mapInfoTitle.textContent = 'Select a neighbor';
    mapInfoDesc.textContent = 'Click a neighboring hex to preview it.';
    mapInfoHint.textContent = 'Click the same hex again to move.';
    return;
  }
  mapInfoTitle.textContent = node.label;
  mapInfoDesc.textContent = node.description;
  if (isPreview) {
    mapInfoHint.textContent = 'Click again to move forward.';
  } else {
    mapInfoHint.textContent = 'Choose a highlighted neighbor to preview.';
  }
}

function closeTooltip() {
  if (!state.tooltipId) {
    return;
  }
  state.tooltipId = null;
  renderMap(getConfig(), false);
}

function renderTooltip(bounds) {
  if (!state.tooltipId || !state.map) {
    return;
  }
  const node = state.map.nodeById.get(state.tooltipId);
  if (!node || node.type === 'empty') {
    return;
  }
  const def = TYPE_DEFS[node.type] || node;

  const tooltip = document.createElement('div');
  tooltip.className = 'map-tooltip';
  const title = document.createElement('div');
  title.className = 'map-tooltip__title';
  title.textContent = def.label || node.label || 'Unknown';
  const body = document.createElement('div');
  body.className = 'map-tooltip__body';
  body.textContent = def.description || node.description || '';
  tooltip.appendChild(title);
  tooltip.appendChild(body);

  mapCanvas.appendChild(tooltip);

  const margin = 12;
  const gap = 10;
  const baseX = node.pixel.x;
  const baseY = node.pixel.y;
  const hexRect = {
    left: baseX - HEX_WIDTH / 2,
    right: baseX + HEX_WIDTH / 2,
    top: baseY - HEX_HEIGHT / 2,
    bottom: baseY + HEX_HEIGHT / 2
  };

  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;

  const placements = [
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

  let chosen = placements.find(function (placement) {
    return (
      placement.left >= margin &&
      placement.left + tooltipWidth <= bounds.width - margin &&
      placement.top >= margin &&
      placement.top + tooltipHeight <= bounds.height - margin
    );
  });

  if (!chosen) {
    chosen = placements
      .map(function (placement) {
        const visibleWidth = Math.min(
          bounds.width - margin,
          placement.left + tooltipWidth
        ) - Math.max(margin, placement.left);
        const visibleHeight = Math.min(
          bounds.height - margin,
          placement.top + tooltipHeight
        ) - Math.max(margin, placement.top);
        const area = Math.max(0, visibleWidth) * Math.max(0, visibleHeight);
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

function renderMap(config, animate) {
  mapCanvas.innerHTML = '';
  mapCanvas.classList.toggle('map-canvas--hide-labels', !config.showLabels);
  mapCanvas.style.setProperty('--hex-size', HEX_SIZE + 'px');

  const bounds = layoutNodes(state.map.nodes);
  mapCanvas.style.width = bounds.width + 'px';
  mapCanvas.style.height = bounds.height + 'px';

  if (config.showLinks) {
    mapCanvas.appendChild(createLinks(state.map, bounds.width, bounds.height));
  }

  const reachableIds = getReachableIds();

  state.map.nodes.forEach(function (node) {
    const hex = document.createElement('button');
    hex.type = 'button';
    hex.className = 'hex';
    hex.dataset.id = node.id;
    hex.dataset.type = node.type;
    hex.style.left = node.pixel.x + 'px';
    hex.style.top = node.pixel.y + 'px';
    hex.title = node.label;

    if (state.visited.has(node.id) && node.id !== state.currentId) {
      hex.classList.add('is-visited');
    }
    if (node.id === state.currentId) {
      hex.classList.add('is-current');
    }
    if (reachableIds.has(node.id)) {
      hex.classList.add('is-reachable');
    }
    if (node.id === state.selectedId) {
      hex.classList.add('is-selected');
    }
    if (animate) {
      hex.classList.add('hex--animate');
      hex.style.animationDelay = node.r * 60 + 'ms';
    }

    const shape = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    shape.classList.add('hex__shape');
    shape.setAttribute('viewBox', '0 0 100 100');
    shape.setAttribute('preserveAspectRatio', 'none');
    shape.setAttribute('aria-hidden', 'true');
    const borderPolygon = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'polygon'
    );
    borderPolygon.setAttribute(
      'points',
      '50 2 93 25 93 75 50 98 7 75 7 25'
    );
    const fillPolygon = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'polygon'
    );
    fillPolygon.classList.add('hex__shape-fill');
    fillPolygon.setAttribute('points', '50 2 93 25 93 75 50 98 7 75 7 25');
    shape.appendChild(borderPolygon);
    shape.appendChild(fillPolygon);
    hex.appendChild(shape);

    if (ICON_SOURCES[node.type]) {
      const icon = document.createElement('div');
      icon.className = 'hex__icon hex__icon--image';
      const img = document.createElement('img');
      img.alt = node.label;
      img.src = ICON_SOURCES[node.type];
      icon.appendChild(img);
      hex.appendChild(icon);
    } else if (node.icon) {
      const icon = document.createElement('div');
      icon.className = 'hex__icon';
      icon.textContent = node.icon;
      hex.appendChild(icon);
    }

    if (node.type !== 'empty' && !ICON_SOURCES[node.type]) {
      const label = document.createElement('div');
      label.className = 'hex__label';
      label.textContent = node.label;
      hex.appendChild(label);
    }

    if (node.id === state.currentId) {
      const marker = document.createElement('div');
      marker.className = 'hex__marker';
      hex.appendChild(marker);
    }

    mapCanvas.appendChild(hex);
  });

  renderTooltip(bounds);
}

function setStatus(message) {
  mapStatus.textContent = message;
}

function resetState(map) {
  state.map = map;
  state.currentId = map.startId;
  state.selectedId = null;
  state.tooltipId = null;
  state.suppressClose = false;
  state.visited = new Set([map.startId]);
}

function regenerateMap() {
  if (regenTimer) {
    clearTimeout(regenTimer);
    regenTimer = null;
  }
  if (state.pendingReset) {
    clearTimeout(state.pendingReset);
    state.pendingReset = null;
  }

  updateValues();
  const config = getConfig();
  let statusMessage = 'Map ready. Select a neighbor.';
  var map = buildMap(config);
  if (!map && config.allowVoid) {
    const safeConfig = Object.assign({}, config, { allowVoid: false });
    map = buildMap(safeConfig);
    if (map) {
      statusMessage = 'Voids trimmed for a valid path.';
    }
  }
  if (!map) {
    map = buildMap(Object.assign({}, config, { allowVoid: false }));
  }
  if (!map) {
    map = buildFallbackMap(config.height);
    statusMessage = 'Fallback map generated.';
  }

  resetState(map);
  renderMap(config, true);
  updateInfo(state.map.nodeById.get(state.currentId), false);
  setStatus(statusMessage);
}

function handleHexClick(event) {
  const hex = event.target.closest('.hex');
  if (!hex || !mapCanvas.contains(hex)) {
    return;
  }
  const node = state.map.nodeById.get(hex.dataset.id);
  if (!node) {
    return;
  }

  const reachableIds = getReachableIds();
  const isReachable = reachableIds.has(node.id);
  const hasTooltip = node.type !== 'empty';

  if (hasTooltip) {
    if (!isReachable && state.tooltipId === node.id) {
      closeTooltip();
      return;
    }
    state.tooltipId = node.id;
    state.suppressClose = true;
    updateInfo(node, true);
  } else {
    closeTooltip();
  }

  if (node.id === state.currentId) {
    updateInfo(node, false);
    renderMap(getConfig(), false);
    return;
  }

  if (!isReachable) {
    if (!hasTooltip) {
      setStatus('That hex is not reachable yet.');
    }
    renderMap(getConfig(), false);
    return;
  }

  if (state.selectedId !== node.id) {
    state.selectedId = node.id;
    updateInfo(node, true);
    setStatus('Previewing ' + node.label + '.');
  } else {
    state.currentId = node.id;
    state.visited.add(node.id);
    state.selectedId = null;
    updateInfo(node, false);
    setStatus('Moved to ' + node.label + '.');

    if (node.type === 'levelBoss') {
      setStatus('Level boss cleared. Generating a new map.');
      state.pendingReset = setTimeout(function () {
        regenerateMap();
      }, 900);
    }
  }

  renderMap(getConfig(), false);
}

function attachListeners() {
  [
    heightInput,
    widthInput,
    problemInput,
    bossInput,
    emptyInput,
    shopInput,
    treasureInput,
    voidInput
  ].forEach(function (input) {
    input.addEventListener('input', function () {
      updateValues();
      scheduleRegen();
    });
  });

  [allowVoidInput, showLinksInput, showLabelsInput].forEach(function (input) {
    input.addEventListener('change', function () {
      scheduleRegen();
    });
  });

  regenBtn.addEventListener('click', function () {
    regenerateMap();
  });

  mapCanvas.addEventListener('click', handleHexClick);

  document.addEventListener('click', function () {
    if (!state.tooltipId) {
      return;
    }
    if (state.suppressClose) {
      state.suppressClose = false;
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
updateValues();
regenerateMap();
