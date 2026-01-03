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
    icon: 'P',
    description: 'A standard go problem battle.'
  },
  boss: {
    label: 'Boss',
    icon: 'B',
    description: 'A tougher go problem with bonus stakes.'
  },
  levelBoss: {
    label: 'Level Boss',
    icon: 'LB',
    description: 'The final fight for this map.'
  },
  shop: {
    label: 'Shop',
    icon: 'SH',
    description: 'Spend coins on hints or passives.'
  },
  treasure: {
    label: 'Treasure',
    icon: 'TR',
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
    maxWidth: Number(widthInput.value),
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

function buildRowWidths(height, maxWidth) {
  const widths = [1];
  for (let row = 1; row < height - 1; row += 1) {
    const prev = widths[row - 1];
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
    const nextWidth =
      candidates[Math.floor(Math.random() * candidates.length)] || 1;
    widths.push(nextWidth);
  }
  widths.push(1);
  return widths;
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
    const widths = buildRowWidths(config.height, config.maxWidth);
    const nodes = [];
    const nodeById = new Map();
    const rows = [];
    let valid = true;

    for (let row = 0; row < config.height; row += 1) {
      const rowNodes = [];
      const width = widths[row];
      const qStart = -Math.floor((width - 1) / 2);
      for (let i = 0; i < width; i += 1) {
        const q = qStart + i;
        let type = 'empty';
        if (row === 0) {
          type = 'start';
        } else if (row === config.height - 1) {
          type = 'levelBoss';
        } else {
          type = pickType(config.weights, config.allowVoid);
        }
        if (type === 'void') {
          continue;
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
      if (!rowNodes.length) {
        valid = false;
        break;
      }
      rows.push(rowNodes);
    }

    if (!valid) {
      continue;
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
    const type = row === 0 ? 'start' : row === height - 1 ? 'levelBoss' : 'empty';
    const id = '0,' + row;
    const def = TYPE_DEFS[type] || TYPE_DEFS.empty;
    const node = {
      id: id,
      q: 0,
      r: row,
      type: type,
      label: def.label,
      description: def.description,
      icon: def.icon
    };
    nodes.push(node);
    nodeById.set(id, node);
    rows.push([node]);
  }
  return {
    nodes: nodes,
    nodeById: nodeById,
    rows: rows,
    startId: '0,0',
    endId: '0,' + (height - 1)
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

    if (node.icon) {
      const icon = document.createElement('div');
      icon.className = 'hex__icon';
      icon.textContent = node.icon;
      hex.appendChild(icon);
    }

    const label = document.createElement('div');
    label.className = 'hex__label';
    label.textContent = node.label;
    hex.appendChild(label);

    if (node.id === state.currentId) {
      const marker = document.createElement('div');
      marker.className = 'hex__marker';
      hex.appendChild(marker);
    }

    mapCanvas.appendChild(hex);
  });
}

function setStatus(message) {
  mapStatus.textContent = message;
}

function resetState(map) {
  state.map = map;
  state.currentId = map.startId;
  state.selectedId = null;
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
  if (node.id === state.currentId) {
    updateInfo(node, false);
    return;
  }

  const reachableIds = getReachableIds();
  if (!reachableIds.has(node.id)) {
    setStatus('That hex is not reachable yet.');
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
}

attachListeners();
updateValues();
regenerateMap();
