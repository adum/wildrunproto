import {
  createMap as createPlayMap,
  createFallbackMap as createPlayFallbackMap
} from './play/map-ui.js';

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
function resolveIcon(path) {
  return new URL(path, import.meta.url).href;
}

const ICON_SOURCES = {
  problem: resolveIcon('./img/problem0.svg'),
  boss: resolveIcon('./img/boss_problem0.svg'),
  levelBoss: resolveIcon('./img/levelboss_problem0.svg'),
  shop: resolveIcon('./img/shop0.svg'),
  treasure: resolveIcon('./img/treasure2.svg')
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

const clickSoundState = {
  ctx: null,
  lastAt: 0
};

function playMapClickSound() {
  if (typeof window === 'undefined') {
    return;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return;
  }
  const now = Date.now();
  if (now - clickSoundState.lastAt < 60) {
    return;
  }
  clickSoundState.lastAt = now;
  if (!clickSoundState.ctx) {
    try {
      clickSoundState.ctx = new AudioContext();
    } catch (err) {
      return;
    }
  }
  const ctx = clickSoundState.ctx;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(function () {});
  }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(420, ctx.currentTime);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.025, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.09);
}

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

function applyTypeDefs(map) {
  if (!map || !map.nodes) {
    return;
  }
  map.nodes.forEach(function (node) {
    var def = TYPE_DEFS[node.type];
    if (!def) {
      return;
    }
    node.label = def.label;
    node.description = def.description;
    node.icon = def.icon;
  });
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
  var map = createPlayMap(config);
  if (!map && config.allowVoid) {
    const safeConfig = Object.assign({}, config, { allowVoid: false });
    map = createPlayMap(safeConfig);
    if (map) {
      statusMessage = 'Voids trimmed for a valid path.';
    }
  }
  if (!map) {
    map = createPlayMap(Object.assign({}, config, { allowVoid: false }));
  }
  if (!map) {
    map = createPlayFallbackMap(config.height);
    statusMessage = 'Fallback map generated.';
  }

  applyTypeDefs(map);
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
  playMapClickSound();
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
