import { app } from "../prototype/context.js";
import "../prototype/config.js";
import "../prototype/ghost.js";
import "../prototype/fire.js";
import "../prototype/frost.js";
import "../prototype/effects.js";
import "../prototype/passives.js";
import "../prototype/overlays.js";
import "../prototype/timers.js";
import "../prototype/challenges.js";
import "../prototype/hints.js";
import "../prototype/board.js";

if (!app.GB) {
  throw new Error("ghostban library not found.");
}

var state = app.state;
var refs = app.refs;

var startOverlay = document.getElementById("startOverlay");
var startGameBtn = document.getElementById("startGameBtn");
var advanceOverlay = document.getElementById("advanceOverlay");
var advanceLabel = document.getElementById("advanceLabel");
var advanceBtn = document.getElementById("advanceBtn");
var retryOverlay = document.getElementById("retryOverlay");
var retryLabel = document.getElementById("retryLabel");
var retryBtn = document.getElementById("retryBtn");
var shopOverlay = document.getElementById("shopOverlay");
var shopTitle = document.getElementById("shopTitle");
var shopSubtitle = document.getElementById("shopSubtitle");
var shopContinueBtn = document.getElementById("shopContinueBtn");
var shopCoinsValue = document.getElementById("shopCoinsValue");
var shopHintList = document.getElementById("shopHintList");
var shopPassiveList = document.getElementById("shopPassiveList");
var coinBurst = document.getElementById("coinBurst");
var adminToggle = document.getElementById("adminToggle");
var adminOverlay = document.getElementById("adminOverlay");
var adminClose = document.getElementById("adminClose");
var adminCoinsInput = document.getElementById("adminCoinsInput");
var adminCoinsAdd = document.getElementById("adminCoinsAdd");
var adminHintSelect = document.getElementById("adminHintSelect");
var adminHintLevel = document.getElementById("adminHintLevel");
var adminHintAdd = document.getElementById("adminHintAdd");
var adminPassiveSelect = document.getElementById("adminPassiveSelect");
var adminPassiveLevel = document.getElementById("adminPassiveLevel");
var adminPassiveAdd = document.getElementById("adminPassiveAdd");
var adminChallengeSelect = document.getElementById("adminChallengeSelect");
var adminChallengeLevel = document.getElementById("adminChallengeLevel");
var adminChallengeSet = document.getElementById("adminChallengeSet");
var difficultyLabel = document.getElementById("difficultyLabel");
var passiveList = document.getElementById("passiveList");
var hintList = document.getElementById("hintList");
var challengeSection = document.getElementById("challengeSection");
var challengeList = document.getElementById("challengeList");

var problems = Array.isArray(window.gpProblems) ? window.gpProblems : [];

app.handlers.onTimerExpired = function () {
  app.board.evaluatePosition();
};

var PASSIVE_DEFS = {
  timeExtend: {
    label: "Time Extend",
    tooltip: "Slows countdown timers by 10% per level.",
  },
  secondChance: {
    label: "Second Chance",
    tooltip: "One timed retry per puzzle on a mistake.",
  },
  freeUpgrades: {
    label: "Free Upgrades",
    tooltip: "Chance to level up new hints for free.",
  },
  friendlyCapture: {
    label: "Friendly Capture",
    tooltip: "Lights up if any correct line sacrifices a player stone.",
    indicatorKey: "friendlyCaptureDetected",
  },
  enemyCapture: {
    label: "Enemy Capture",
    tooltip: "Lights up if any correct line captures an enemy stone.",
    indicatorKey: "enemyCaptureDetected",
  },
};

var HINT_DEFS = {
  firstMove: {
    label: "First Move",
    tooltip: "Marks the next correct move.",
    action: function () {
      app.hints.hintFirstMove();
    },
  },
  multipleChoice: {
    label: "Multiple Choice",
    tooltip: "Marks multiple options with one correct move.",
    action: function () {
      app.hints.hintTwoMoves();
    },
  },
  neighbor: {
    label: "Wave to Your Neighbor",
    tooltip: "Highlights a stone adjacent to a correct move.",
    action: function () {
      app.hints.hintWaveNeighbor();
    },
  },
  rowReveal: {
    label: "Row Reveal",
    tooltip: "Reveals a row containing a correct move.",
    action: function () {
      app.hints.hintRowReveal();
    },
  },
  colReveal: {
    label: "Column Reveal",
    tooltip: "Reveals a column containing a correct move.",
    action: function () {
      app.hints.hintColumnReveal();
    },
  },
  diagReveal: {
    label: "Diagonal Reveal",
    tooltip: "Reveals a diagonal containing a correct move.",
    action: function () {
      app.hints.hintDiagonalReveal();
    },
  },
  eliminateRandom: {
    label: "Eliminate Random Move",
    tooltip: "Blocks a random wrong-path move.",
    action: function () {
      app.board.eliminateRandomMove();
    },
  },
};

var CHALLENGE_DEFS = {
  gray: {
    label: "Gray Play",
    tooltip: "New stones are shown as gray.",
    enable: function () {
      app.challenges.setGrayPlay(true);
    },
  },
  ghost: {
    label: "Ghost Play",
    tooltip: "New stones flash, then become invisible.",
    setLevel: function (level) {
      app.ghost.setGhostLevel(level);
    },
    enable: function () {
      app.challenges.setGhostPlay(true);
    },
  },
  mystery: {
    label: "Mystery Timer",
    tooltip: "Hide stones; reveal them to start a timer.",
    setLevel: function (level) {
      app.timers.setMysteryLevel(level);
    },
    enable: function () {
      app.challenges.setMysteryPlay(true);
    },
  },
  enigma: {
    label: "Enigma Timer",
    tooltip: "Marks stones or adjacent empties with rings.",
    setLevel: function (level) {
      app.timers.setEnigmaLevel(level);
    },
    enable: function () {
      app.challenges.setEnigmaPlay(true);
    },
  },
  infection: {
    label: "Infection",
    tooltip: "Adds hollow rings next to newly played stones.",
    setLevel: function (level) {
      app.challenges.setInfectionLevel(level);
    },
    enable: function () {
      app.challenges.setInfectionPlay(true);
    },
  },
  speed: {
    label: "Speed Play",
    tooltip: "Limits time for each move after your first.",
    setLevel: function (level) {
      app.timers.setSpeedLevel(level);
    },
    enable: function () {
      app.challenges.setSpeedPlay(true);
    },
  },
  fire: {
    label: "Fire Snake",
    tooltip: "Animated fire snake sweeps the board.",
    setLevel: function (level) {
      app.fire.setFireLevel(level);
    },
    enable: function () {
      app.challenges.setFirePlay(true);
    },
  },
  frost: {
    label: "Frost Snake",
    tooltip: "Animated frost snake sweeps the board.",
    setLevel: function (level) {
      app.frost.setFrostLevel(level);
    },
    enable: function () {
      app.challenges.setFrostPlay(true);
    },
  },
};

var problemIndex = buildProblemIndex(problems);

var game = {
  started: false,
  levelNumber: 0,
  bossCount: 0,
  difficulty: null,
  levelActive: false,
  currentProblem: null,
  passives: [],
  hints: [],
  challenge: null,
  shop: { hints: [], passives: [] },
  pendingNext: null,
  maxLives: 3,
  isBoss: false,
};

app.handlers.onPuzzleSolved = function () {
  if (!game.started || !game.levelActive) {
    return;
  }
  game.levelActive = false;
  awardCoins();
  var config = getPlayConfig();
  if (isShopLevel(config, game.levelNumber)) {
    showShopOverlay();
  } else {
    showAdvanceOverlay();
  }
};

app.handlers.onPuzzleFailed = function () {
  if (!game.started) {
    return;
  }
  game.levelActive = false;
  hideAdvanceOverlay();
  if (state.lives <= 0) {
    endGame();
  } else {
    showRetryOverlay();
  }
};

function getPlayConfig() {
  var config = app.config && app.config.play ? app.config.play : {};
  var coins = config.coins || {};
  var hintPool = Array.isArray(config.hintPool)
    ? config.hintPool.slice()
    : Object.keys(HINT_DEFS);
  var passivePool = Array.isArray(config.passivePool)
    ? config.passivePool.slice()
    : Object.keys(PASSIVE_DEFS);
  var challengePool = Array.isArray(config.challengePool)
    ? config.challengePool.slice()
    : Object.keys(CHALLENGE_DEFS);
  var shop = config.shop || {};
  var shopPrices = shop.prices || {};
  var shopHintPool = Array.isArray(shop.hintPool)
    ? shop.hintPool.slice()
    : hintPool.slice();
  var shopPassivePool = Array.isArray(shop.passivePool)
    ? shop.passivePool.slice()
    : ["timeExtend", "secondChance", "freeUpgrades"];
  return {
    startDifficulty: config.startDifficulty || "30kyu",
    difficultyStep: toNumber(config.difficultyStep, 1),
    hintsPerLevel: Math.max(0, toNumber(config.hintsPerLevel, 2)),
    passivesPerRun: Math.max(0, toNumber(config.passivesPerRun, 1)),
    bossFrequency: Math.max(0, toNumber(config.bossFrequency, 0)),
    challengeLevelStart: toNumber(config.challengeLevelStart, 1),
    challengeLevelRamp: toNumber(config.challengeLevelRamp, 1),
    coins: {
      base: toNumber(coins.base, 5),
      perDifficulty: toNumber(coins.perDifficulty, 1),
      bossBonus: toNumber(coins.bossBonus, 0),
    },
    shop: {
      frequency: Math.max(0, toNumber(shop.frequency, 3)),
      startAfterLevel: Math.max(0, toNumber(shop.startAfterLevel, 1)),
      hintCount: Math.max(0, toNumber(shop.hintCount, 2)),
      passiveCount: Math.max(0, toNumber(shop.passiveCount, 1)),
      hintPool: shopHintPool,
      passivePool: shopPassivePool,
      prices: {
        hints: shopPrices.hints || {},
        passives: shopPrices.passives || {},
      },
    },
    hintPool: hintPool,
    passivePool: passivePool,
    challengePool: challengePool,
  };
}

function toNumber(value, fallback) {
  var num = Number(value);
  if (Number.isFinite(num)) {
    return num;
  }
  return fallback;
}

function getShopPrice(priceMap, id) {
  if (!priceMap || !id) {
    return null;
  }
  var value = toNumber(priceMap[id], NaN);
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.round(value));
}

function getLevelBoundsSafe(levelKey, fallbackMin, fallbackMax) {
  if (app.configUtils && app.configUtils.getLevelBounds) {
    return app.configUtils.getLevelBounds(levelKey, fallbackMin, fallbackMax);
  }
  return { min: fallbackMin, max: fallbackMax };
}

function clampNumber(value, min, max) {
  var num = Math.round(toNumber(value, min));
  if (!Number.isFinite(num)) {
    return min;
  }
  if (num < min) {
    return min;
  }
  if (num > max) {
    return max;
  }
  return num;
}

function shuffle(list) {
  var array = list.slice();
  for (var i = array.length - 1; i > 0; i -= 1) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

function pickRandom(list, count) {
  if (!Array.isArray(list) || list.length === 0) {
    return [];
  }
  var picks = shuffle(list);
  return picks.slice(0, Math.min(count, picks.length));
}

function getHintLevelKey(hintId) {
  if (hintId === "multipleChoice") {
    return "hintMultipleChoice";
  }
  if (hintId === "rowReveal") {
    return "hintRow";
  }
  if (hintId === "colReveal") {
    return "hintCol";
  }
  if (hintId === "diagReveal") {
    return "hintDiag";
  }
  if (hintId === "eliminateRandom") {
    return "eliminateRandom";
  }
  return null;
}

function getHintMaxLevel(hintId) {
  var key = getHintLevelKey(hintId);
  if (!key) {
    return 1;
  }
  var levels = app.config && app.config.levels ? app.config.levels : {};
  var config = levels[key] || {};
  var max = toNumber(config.max, 1);
  if (!Number.isFinite(max) || max <= 0) {
    return 1;
  }
  return Math.max(1, Math.round(max));
}

function clampHintLevel(hintId, level) {
  var maxLevel = getHintMaxLevel(hintId);
  return clampNumber(level, 1, maxLevel);
}

function applyHintLevel(hintId, level) {
  var safe = Math.max(1, Math.round(level || 1));
  if (hintId === "multipleChoice" && app.hints.setMultipleChoiceLevel) {
    app.hints.setMultipleChoiceLevel(safe);
  } else if (hintId === "rowReveal" && app.hints.setRowRevealLevel) {
    app.hints.setRowRevealLevel(safe);
  } else if (hintId === "colReveal" && app.hints.setColumnRevealLevel) {
    app.hints.setColumnRevealLevel(safe);
  } else if (hintId === "diagReveal" && app.hints.setDiagonalRevealLevel) {
    app.hints.setDiagonalRevealLevel(safe);
  } else if (hintId === "eliminateRandom" && app.hints.setElimRandomLevel) {
    app.hints.setElimRandomLevel(safe);
  }
}

function maybeUpgradeHintLevel(hintId, level) {
  var maxLevel = getHintMaxLevel(hintId);
  var current = Math.min(maxLevel, Math.max(1, Math.round(level || 1)));
  if (current >= maxLevel) {
    return current;
  }
  var chance =
    app.passives && app.passives.getFreeUpgradesChance
      ? app.passives.getFreeUpgradesChance()
      : 0;
  if (chance > 0 && Math.random() < chance) {
    return Math.min(maxLevel, current + 1);
  }
  return current;
}

function createHintItem(id) {
  return {
    id: id,
    used: false,
    level: maybeUpgradeHintLevel(id, 1),
  };
}

function parseDifficulty(value) {
  if (!value) {
    return null;
  }
  var text = String(value).trim().toLowerCase();
  var match = text.match(/(\d+)\s*(kyu|k|dan|d)/);
  if (!match) {
    return null;
  }
  var level = parseInt(match[1], 10);
  if (!Number.isFinite(level)) {
    return null;
  }
  var type = match[2] === "dan" || match[2] === "d" ? "dan" : "kyu";
  return { type: type, value: level };
}

function formatDifficulty(diff) {
  if (!diff) {
    return "unknown";
  }
  return diff.value + (diff.type === "dan" ? "dan" : "kyu");
}

function advanceDifficulty(diff, step) {
  if (!diff) {
    return null;
  }
  var delta = Math.max(1, toNumber(step, 1));
  if (diff.type === "dan") {
    return { type: "dan", value: diff.value + delta };
  }
  var nextValue = diff.value - delta;
  if (nextValue < 1) {
    return { type: "dan", value: 1 };
  }
  return { type: "kyu", value: nextValue };
}

function stepDownDifficulty(diff) {
  if (!diff) {
    return null;
  }
  if (diff.type === "dan") {
    if (diff.value <= 1) {
      return { type: "kyu", value: 1 };
    }
    return { type: "dan", value: diff.value - 1 };
  }
  if (diff.value >= 30) {
    return null;
  }
  return { type: "kyu", value: diff.value + 1 };
}

function buildProblemIndex(list) {
  var index = {};
  list.forEach(function (problem) {
    var parsed = parseDifficulty(problem.difficulty);
    if (!parsed) {
      return;
    }
    var key = formatDifficulty(parsed);
    if (!index[key]) {
      index[key] = [];
    }
    index[key].push(problem);
  });
  return index;
}

function pickProblemForDifficulty(target) {
  var current = target;
  var attempts = 0;
  while (current && attempts < 40) {
    var label = formatDifficulty(current);
    var options = problemIndex[label];
    if (options && options.length) {
      return {
        problem: options[Math.floor(Math.random() * options.length)],
        label: label,
      };
    }
    current = stepDownDifficulty(current);
    attempts += 1;
  }
  if (problems.length) {
    var fallback = problems[Math.floor(Math.random() * problems.length)];
    var parsed = parseDifficulty(fallback.difficulty);
    return {
      problem: fallback,
      label: parsed ? formatDifficulty(parsed) : fallback.difficulty || "unknown",
    };
  }
  return null;
}

function ensureBoard(size) {
  if (!refs.board) {
    app.board.initBoard(size);
  }
  if (startOverlay && startOverlay.parentElement !== app.elements.mount) {
    app.elements.mount.appendChild(startOverlay);
  }
  if (advanceOverlay && advanceOverlay.parentElement !== app.elements.mount) {
    app.elements.mount.appendChild(advanceOverlay);
  }
  if (retryOverlay && retryOverlay.parentElement !== app.elements.mount) {
    app.elements.mount.appendChild(retryOverlay);
  }
  if (shopOverlay && shopOverlay.parentElement !== app.elements.mount) {
    app.elements.mount.appendChild(shopOverlay);
  }
  if (adminOverlay && adminOverlay.parentElement !== app.elements.mount) {
    app.elements.mount.appendChild(adminOverlay);
  }
  if (coinBurst && coinBurst.parentElement !== app.elements.mount) {
    app.elements.mount.appendChild(coinBurst);
  }
}

function resetHintLevels() {
  app.hints.setMultipleChoiceLevel(1);
  app.hints.setRowRevealLevel(1);
  app.hints.setColumnRevealLevel(1);
  app.hints.setDiagonalRevealLevel(1);
  app.hints.setElimRandomLevel(1);
}

function renderPassives() {
  if (!passiveList) {
    return;
  }
  passiveList.textContent = "";
  game.passives.forEach(function (passive) {
    var def = PASSIVE_DEFS[passive.id];
    if (!def) {
      return;
    }
    var item = document.createElement("div");
    item.className = "play-chip";
    item.title = def.tooltip;
    var label = document.createElement("span");
    label.textContent = def.label;
    if (def.indicatorKey) {
      var indicator = document.createElement("span");
      indicator.className = "play-chip__indicator";
      if (state[def.indicatorKey]) {
        indicator.classList.add("is-active");
      }
      item.appendChild(indicator);
    }
    item.appendChild(label);
    if (!def.indicatorKey) {
      var level = document.createElement("span");
      level.className = "play-chip__level";
      level.textContent = "L" + passive.level;
      item.appendChild(level);
    }
    passiveList.appendChild(item);
  });
}

function renderHints() {
  if (!hintList) {
    return;
  }
  hintList.textContent = "";
  game.hints.forEach(function (hint) {
    var def = HINT_DEFS[hint.id];
    if (!def) {
      return;
    }
    var button = document.createElement("button");
    button.type = "button";
    button.className = "button play-hint";
    button.title = def.tooltip;
    var label = document.createElement("span");
    label.textContent = def.label;
    var level = document.createElement("span");
    level.className = "play-chip__level";
    level.textContent = "L" + (hint.level || 1);
    button.appendChild(label);
    button.appendChild(level);
    if (hint.used) {
      button.classList.add("is-used");
      button.disabled = true;
    }
    button.addEventListener("click", function (event) {
      if (event) {
        event.stopPropagation();
      }
      if (hint.used || !game.levelActive) {
        return;
      }
      applyHintLevel(hint.id, hint.level || 1);
      def.action();
      hint.used = true;
      button.classList.add("is-used");
      button.disabled = true;
    });
    hintList.appendChild(button);
  });
}

function renderChallenges() {
  if (!challengeSection || !challengeList) {
    return;
  }
  challengeList.textContent = "";
  if (!game.challenge) {
    challengeSection.classList.add("is-hidden");
    return;
  }
  var def = CHALLENGE_DEFS[game.challenge.id];
  if (!def) {
    challengeSection.classList.add("is-hidden");
    return;
  }
  challengeSection.classList.remove("is-hidden");
  var item = document.createElement("div");
  item.className = "play-chip";
  item.title = def.tooltip;
  var label = document.createElement("span");
  label.textContent = def.label;
  var level = document.createElement("span");
  level.className = "play-chip__level";
  level.textContent = "L" + game.challenge.level;
  item.appendChild(label);
  item.appendChild(level);
  challengeList.appendChild(item);
}

function updateShopCoins() {
  if (!shopCoinsValue) {
    return;
  }
  var rounded = Math.round(state.coins || 0);
  shopCoinsValue.textContent = String(rounded);
}

function buildShopInventory(config) {
  var shopConfig = config.shop;
  if (!shopConfig) {
    game.shop = { hints: [], passives: [] };
    return;
  }
  var hintPrices = shopConfig.prices ? shopConfig.prices.hints : {};
  var passivePrices = shopConfig.prices ? shopConfig.prices.passives : {};
  var ownedPassives = new Set(
    game.passives.map(function (passive) {
      return passive.id;
    })
  );
  var hintCandidates = shopConfig.hintPool.filter(function (id) {
    if (!HINT_DEFS[id]) {
      return false;
    }
    return getShopPrice(hintPrices, id) !== null;
  });
  var passiveCandidates = shopConfig.passivePool.filter(function (id) {
    if (!PASSIVE_DEFS[id]) {
      return false;
    }
    if (ownedPassives.has(id)) {
      return false;
    }
    return getShopPrice(passivePrices, id) !== null;
  });
  var hints = pickRandom(hintCandidates, shopConfig.hintCount).map(function (id) {
    return {
      id: id,
      price: getShopPrice(hintPrices, id),
      purchased: false,
    };
  });
  var passives = pickRandom(passiveCandidates, shopConfig.passiveCount).map(function (id) {
    return {
      id: id,
      price: getShopPrice(passivePrices, id),
      purchased: false,
    };
  });
  game.shop = { hints: hints, passives: passives };
}

function renderShopList(listEl, items, defs, type) {
  if (!listEl) {
    return;
  }
  listEl.textContent = "";
  if (!items || items.length === 0) {
    var empty = document.createElement("div");
    empty.className = "shop-empty";
    empty.textContent = "No items right now.";
    listEl.appendChild(empty);
    return;
  }
  items.forEach(function (item) {
    var def = defs[item.id];
    if (!def) {
      return;
    }
    var row = document.createElement("div");
    row.className = "shop-item";
    row.title = def.tooltip || "";
    var info = document.createElement("div");
    info.className = "shop-item__info";
    var name = document.createElement("div");
    name.className = "shop-item__name";
    name.textContent = def.label;
    var priceRow = document.createElement("div");
    priceRow.className = "shop-item__price";
    var priceIcon = document.createElement("span");
    priceIcon.className = "coin-icon";
    priceIcon.setAttribute("aria-hidden", "true");
    var priceValue = document.createElement("span");
    if (item.price <= 0) {
      priceValue.textContent = "Free";
    } else {
      priceValue.textContent = String(item.price);
    }
    priceRow.appendChild(priceIcon);
    priceRow.appendChild(priceValue);
    info.appendChild(name);
    info.appendChild(priceRow);
    row.appendChild(info);
    var button = document.createElement("button");
    button.type = "button";
    button.className = "button shop-buy";
    var lockAfterPurchase = type === "passive";
    var isOwned = lockAfterPurchase && item.purchased;
    var canAfford = item.price <= (state.coins || 0);
    if (isOwned) {
      row.classList.add("is-owned");
      button.textContent = "Owned";
      button.disabled = true;
    } else {
      button.textContent = "Buy";
      if (!canAfford) {
        button.classList.add("is-disabled");
        button.setAttribute("aria-disabled", "true");
      }
    }
    button.addEventListener("click", function (event) {
      if (event) {
        event.stopPropagation();
      }
      if (isOwned) {
        return;
      }
      var currentCoins = state.coins || 0;
      if (item.price > currentCoins) {
        row.classList.remove("is-warn");
        void row.offsetWidth;
        row.classList.add("is-warn");
        return;
      }
      state.coins = (state.coins || 0) - item.price;
      if (type === "hint") {
        game.hints.push(createHintItem(item.id));
        renderHints();
      } else if (type === "passive") {
        game.passives.push({ id: item.id, level: 1 });
        applyPassives();
        renderPassives();
        item.purchased = true;
      }
      app.ui.updateHud();
      renderShop();
    });
    row.appendChild(button);
    listEl.appendChild(row);
  });
}

function renderShop() {
  updateShopCoins();
  renderShopList(shopHintList, game.shop.hints, HINT_DEFS, "hint");
  renderShopList(shopPassiveList, game.shop.passives, PASSIVE_DEFS, "passive");
}

function getSortedDefIds(defs) {
  return Object.keys(defs || {}).sort(function (a, b) {
    var labelA = defs[a] && defs[a].label ? defs[a].label : a;
    var labelB = defs[b] && defs[b].label ? defs[b].label : b;
    return labelA.localeCompare(labelB);
  });
}

function populateAdminSelect(select, defs, includeNone, noneLabel) {
  if (!select) {
    return;
  }
  select.textContent = "";
  if (includeNone) {
    var empty = document.createElement("option");
    empty.value = "";
    empty.textContent = noneLabel || "None";
    select.appendChild(empty);
  }
  getSortedDefIds(defs).forEach(function (id) {
    var def = defs[id];
    if (!def) {
      return;
    }
    var option = document.createElement("option");
    option.value = id;
    option.textContent = def.label || id;
    select.appendChild(option);
  });
}

function updateAdminHintLevel() {
  if (!adminHintLevel || !adminHintSelect) {
    return;
  }
  var id = adminHintSelect.value;
  if (!id) {
    adminHintLevel.disabled = true;
    adminHintLevel.value = "1";
    adminHintLevel.min = "1";
    adminHintLevel.max = "1";
    return;
  }
  var maxLevel = getHintMaxLevel(id);
  adminHintLevel.disabled = false;
  adminHintLevel.min = "1";
  adminHintLevel.max = String(maxLevel);
  adminHintLevel.value = String(clampHintLevel(id, adminHintLevel.value));
}

function updateAdminPassiveLevel() {
  if (!adminPassiveLevel || !adminPassiveSelect) {
    return;
  }
  var id = adminPassiveSelect.value;
  var bounds = getPassiveLevelBounds(id);
  adminPassiveLevel.disabled =
    !id || (PASSIVE_DEFS[id] && PASSIVE_DEFS[id].indicatorKey);
  adminPassiveLevel.min = String(bounds.min);
  adminPassiveLevel.max = String(bounds.max);
  adminPassiveLevel.value = String(
    clampNumber(adminPassiveLevel.value, bounds.min, bounds.max)
  );
}

function updateAdminChallengeLevel() {
  if (!adminChallengeLevel || !adminChallengeSelect) {
    return;
  }
  var id = adminChallengeSelect.value;
  if (!id) {
    adminChallengeLevel.disabled = true;
    adminChallengeLevel.value = "1";
    adminChallengeLevel.min = "1";
    adminChallengeLevel.max = "1";
    return;
  }
  var bounds = getChallengeLevelBounds(id);
  adminChallengeLevel.disabled = false;
  adminChallengeLevel.min = String(bounds.min);
  adminChallengeLevel.max = String(bounds.max);
  adminChallengeLevel.value = String(
    clampNumber(adminChallengeLevel.value, bounds.min, bounds.max)
  );
}

function refreshAdminLevels() {
  updateAdminHintLevel();
  updateAdminPassiveLevel();
  updateAdminChallengeLevel();
}

function initAdminPanel() {
  populateAdminSelect(adminHintSelect, HINT_DEFS, false);
  populateAdminSelect(adminPassiveSelect, PASSIVE_DEFS, false);
  populateAdminSelect(adminChallengeSelect, CHALLENGE_DEFS, true, "None");
  refreshAdminLevels();
  if (adminHintSelect) {
    adminHintSelect.addEventListener("change", updateAdminHintLevel);
  }
  if (adminPassiveSelect) {
    adminPassiveSelect.addEventListener("change", updateAdminPassiveLevel);
  }
  if (adminChallengeSelect) {
    adminChallengeSelect.addEventListener("change", updateAdminChallengeLevel);
  }
  if (app.configReady && app.configReady.then) {
    app.configReady.then(function () {
      refreshAdminLevels();
    });
  }
}

function addAdminCoins() {
  if (!adminCoinsInput) {
    return;
  }
  var amount = Math.round(toNumber(adminCoinsInput.value, 0));
  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }
  state.coins = (state.coins || 0) + amount;
  app.ui.updateHud();
  updateShopCoins();
  if (shopOverlay && !shopOverlay.classList.contains("is-hidden")) {
    renderShop();
  }
  flashCoinAward(amount);
}

function addAdminHint() {
  if (!adminHintSelect) {
    return;
  }
  var id = adminHintSelect.value;
  if (!id || !HINT_DEFS[id]) {
    return;
  }
  var level = clampHintLevel(id, adminHintLevel ? adminHintLevel.value : 1);
  game.hints.push({ id: id, used: false, level: level });
  renderHints();
}

function addAdminPassive() {
  if (!adminPassiveSelect) {
    return;
  }
  var id = adminPassiveSelect.value;
  var def = id ? PASSIVE_DEFS[id] : null;
  if (!id || !def) {
    return;
  }
  var bounds = getPassiveLevelBounds(id);
  var level = clampNumber(
    adminPassiveLevel ? adminPassiveLevel.value : 1,
    bounds.min,
    bounds.max
  );
  var existing = game.passives.find(function (passive) {
    return passive.id === id;
  });
  if (existing) {
    existing.level = level;
  } else {
    game.passives.push({ id: id, level: level });
  }
  if (app.passives && app.passives.updateCaptureIndicators) {
    app.passives.updateCaptureIndicators();
  }
  applyPassives();
  renderPassives();
}

function setAdminChallenge() {
  if (!adminChallengeSelect) {
    return;
  }
  var id = adminChallengeSelect.value;
  if (!id) {
    game.challenge = null;
    applyChallenge();
    return;
  }
  if (!CHALLENGE_DEFS[id]) {
    return;
  }
  var level = clampChallengeLevel(
    id,
    adminChallengeLevel ? adminChallengeLevel.value : 1
  );
  game.challenge = { id: id, level: level };
  applyChallenge();
  if (app.board) {
    app.board.updateBoard();
    app.board.evaluatePosition();
  }
}

function applyPassives() {
  app.passives.resetPassives();
  game.passives.forEach(function (passive) {
    if (passive.id === "timeExtend") {
      app.passives.setTimeExtendLevel(passive.level);
      app.passives.setTimeExtendActive(true);
    } else if (passive.id === "secondChance") {
      app.passives.setSecondChanceLevel(passive.level);
      app.passives.setSecondChanceActive(true);
    } else if (passive.id === "freeUpgrades") {
      app.passives.setFreeUpgradesLevel(passive.level);
      app.passives.setFreeUpgradesActive(true);
    }
  });
}

function applyChallenge() {
  app.challenges.resetChallenges();
  if (!game.challenge) {
    renderChallenges();
    return;
  }
  var def = CHALLENGE_DEFS[game.challenge.id];
  if (!def) {
    game.challenge = null;
    renderChallenges();
    return;
  }
  if (def.setLevel) {
    def.setLevel(game.challenge.level);
  }
  def.enable();
  renderChallenges();
}

function setupHints(config) {
  var hintIds = pickRandom(config.hintPool, config.hintsPerLevel);
  game.hints = hintIds.map(createHintItem);
  renderHints();
}

function pruneUsedHints() {
  if (!Array.isArray(game.hints)) {
    game.hints = [];
    return;
  }
  game.hints = game.hints.filter(function (hint) {
    return !hint.used;
  });
}

function setupPassives(config) {
  var passiveIds = pickRandom(config.passivePool, config.passivesPerRun);
  game.passives = passiveIds.map(function (id) {
    return { id: id, level: 1 };
  });
  renderPassives();
  applyPassives();
}

function setupChallenge(config, isBoss) {
  if (!isBoss) {
    game.challenge = null;
    applyChallenge();
    return;
  }
  var challengeIds = pickRandom(config.challengePool, 1);
  var challengeId = challengeIds.length ? challengeIds[0] : null;
  if (!challengeId) {
    game.challenge = null;
    applyChallenge();
    return;
  }
  var bossLevel = game.bossCount;
  var level =
    config.challengeLevelStart +
    Math.max(0, bossLevel - 1) * config.challengeLevelRamp;
  var clamped = clampChallengeLevel(challengeId, level);
  game.challenge = { id: challengeId, level: clamped };
  applyChallenge();
}

function getChallengeLevelKey(challengeId) {
  if (challengeId === "ghost") {
    return "ghost";
  }
  if (challengeId === "mystery") {
    return "mystery";
  }
  if (challengeId === "enigma") {
    return "enigma";
  }
  if (challengeId === "infection") {
    return "infection";
  }
  if (challengeId === "speed") {
    return "speed";
  }
  if (challengeId === "fire") {
    return "fire";
  }
  if (challengeId === "frost") {
    return "frost";
  }
  return null;
}

function getChallengeLevelBounds(challengeId) {
  var key = getChallengeLevelKey(challengeId);
  if (!key) {
    return { min: 1, max: 1 };
  }
  return getLevelBoundsSafe(key, 1, 10);
}

function getPassiveLevelBounds(passiveId) {
  if (!passiveId) {
    return { min: 1, max: 1 };
  }
  var def = PASSIVE_DEFS[passiveId];
  if (def && def.indicatorKey) {
    return { min: 1, max: 1 };
  }
  return getLevelBoundsSafe(passiveId, 1, 10);
}

function clampChallengeLevel(challengeId, level) {
  if (!app.configUtils || !app.configUtils.clampLevel) {
    return Math.max(1, Math.round(level));
  }
  var key = getChallengeLevelKey(challengeId);
  if (!key) {
    return 1;
  }
  return app.configUtils.clampLevel(key, level, 1, 10);
}

function loadProblem(problem, difficultyLabelText, isBoss) {
  var sgf = new app.GB.Sgf(problem.sgf);
  if (!sgf.root) {
    return;
  }
  state.rootNode = sgf.root;
  state.playerColor = app.GB.getFirstToMoveColorFromRoot(
    sgf.root,
    app.GB.Ki.Black
  );
  state.combo = 0;
  state.lastNodeId = null;
  if (app.board && app.board.resetSpeedSolveTracking) {
    app.board.resetSpeedSolveTracking();
  }
  if (app.passives && app.passives.updateCaptureIndicators) {
    app.passives.updateCaptureIndicators();
  }

  var size = app.GB.extractBoardSize(sgf.root, 19);
  ensureBoard(size);

  app.hints.setCurrentNode(state.rootNode);
  app.hints.clearHints();
  resetHintLevels();

  app.timers.stopMysteryTimer(false);
  state.mysteryStoneKeys = [];
  state.mysteryRevealed = false;
  app.timers.updateMysteryUI();
  app.timers.stopEnigmaTimer(false);
  state.enigmaPoints = [];
  state.enigmaRevealed = false;
  app.timers.updateEnigmaUI();
  app.timers.stopSpeedTimer(false);
  state.speedMoveCount = 0;

  applyPassives();
  renderPassives();
  setupChallenge(getPlayConfig(), isBoss);

  app.board.autoPlayOpponent();
  app.board.updateBoard();
  app.ui.updateHud();
  app.board.evaluatePosition();

  if (difficultyLabel) {
    difficultyLabel.textContent = difficultyLabelText;
  }
}

function loadLevel() {
  var config = getPlayConfig();
  var isBoss = isBossLevel(config, game.levelNumber);
  if (isBoss) {
    game.bossCount += 1;
  }
  game.isBoss = isBoss;

  var pick = pickProblemForDifficulty(game.difficulty);
  if (!pick) {
    return;
  }

  game.currentProblem = pick.problem;
  game.levelActive = true;
  loadProblem(pick.problem, pick.label, isBoss);
  pruneUsedHints();
  renderHints();
}

function isBossLevel(config, levelNumber) {
  if (!config.bossFrequency) {
    return false;
  }
  return levelNumber % config.bossFrequency === 0;
}

function isShopLevel(config, levelNumber) {
  if (!config.shop || !config.shop.frequency) {
    return false;
  }
  var startAfter = Math.max(0, toNumber(config.shop.startAfterLevel, 1));
  if (levelNumber < startAfter) {
    return false;
  }
  return (levelNumber - startAfter) % config.shop.frequency === 0;
}

function getNextLevelInfo(config) {
  var nextDifficulty = advanceDifficulty(game.difficulty, config.difficultyStep);
  var nextLevelNumber = game.levelNumber + 1;
  var nextIsBoss = isBossLevel(config, nextLevelNumber);
  var label = formatDifficulty(nextDifficulty);
  var buttonLabel = nextIsBoss ? label + " (Boss)" : label;
  return {
    difficulty: nextDifficulty,
    levelNumber: nextLevelNumber,
    isBoss: nextIsBoss,
    label: label,
    buttonLabel: buttonLabel,
  };
}

function showAdvanceOverlay() {
  if (!advanceOverlay || !advanceLabel || !advanceBtn) {
    return;
  }
  var config = getPlayConfig();
  var nextInfo = getNextLevelInfo(config);
  advanceLabel.textContent = "On to " + nextInfo.label;
  advanceBtn.textContent = "Continue to " + nextInfo.buttonLabel;
  advanceOverlay.classList.remove("is-hidden");
  hideRetryOverlay();
  hideShopOverlay();
  hideAdminOverlay();
  game.pendingNext = {
    difficulty: nextInfo.difficulty,
    levelNumber: nextInfo.levelNumber,
    isBoss: nextInfo.isBoss,
  };
}

function hideAdvanceOverlay() {
  if (advanceOverlay) {
    advanceOverlay.classList.add("is-hidden");
  }
}

function showShopOverlay() {
  if (!shopOverlay || !shopContinueBtn) {
    showAdvanceOverlay();
    return;
  }
  var config = getPlayConfig();
  var nextInfo = getNextLevelInfo(config);
  if (shopTitle) {
    shopTitle.textContent = "Shop";
  }
  if (shopSubtitle) {
    shopSubtitle.textContent = "Next: " + nextInfo.buttonLabel;
  }
  shopContinueBtn.textContent = "Continue to " + nextInfo.buttonLabel;
  buildShopInventory(config);
  renderShop();
  shopOverlay.classList.remove("is-hidden");
  hideRetryOverlay();
  hideAdvanceOverlay();
  hideAdminOverlay();
  game.pendingNext = {
    difficulty: nextInfo.difficulty,
    levelNumber: nextInfo.levelNumber,
    isBoss: nextInfo.isBoss,
  };
}

function hideShopOverlay() {
  if (shopOverlay) {
    shopOverlay.classList.add("is-hidden");
  }
}

function showAdminOverlay() {
  if (!adminOverlay) {
    return;
  }
  adminOverlay.classList.remove("is-hidden");
  if (adminToggle) {
    adminToggle.classList.add("is-active");
  }
  refreshAdminLevels();
}

function hideAdminOverlay() {
  if (adminOverlay) {
    adminOverlay.classList.add("is-hidden");
  }
  if (adminToggle) {
    adminToggle.classList.remove("is-active");
  }
}

function toggleAdminOverlay() {
  if (!adminOverlay) {
    return;
  }
  if (adminOverlay.classList.contains("is-hidden")) {
    showAdminOverlay();
  } else {
    hideAdminOverlay();
  }
}

function showStartOverlay() {
  if (startOverlay) {
    startOverlay.classList.remove("is-hidden");
  }
  hideAdminOverlay();
  clearCoinBurst();
}

function showRetryOverlay() {
  if (!retryOverlay) {
    return;
  }
  if (retryLabel && state.lives <= 0) {
    retryLabel.textContent = "Out of lives. Retry?";
  } else if (retryLabel) {
    retryLabel.textContent = "Retry this level";
  }
  retryOverlay.classList.remove("is-hidden");
  hideShopOverlay();
  hideAdminOverlay();
}

function hideRetryOverlay() {
  if (retryOverlay) {
    retryOverlay.classList.add("is-hidden");
  }
}

function hideStartOverlay() {
  if (startOverlay) {
    startOverlay.classList.add("is-hidden");
  }
}

function advanceToPendingLevel() {
  if (!game.pendingNext) {
    return;
  }
  hideAdvanceOverlay();
  hideShopOverlay();
  clearCoinBurst();
  game.difficulty = game.pendingNext.difficulty;
  game.levelNumber = game.pendingNext.levelNumber;
  game.pendingNext = null;
  loadLevel();
}

function endGame() {
  game.started = false;
  game.levelActive = false;
  game.levelNumber = 0;
  game.bossCount = 0;
  game.difficulty = null;
  game.currentProblem = null;
  game.pendingNext = null;
  game.hints = [];
  game.passives = [];
  game.challenge = null;
  game.shop = { hints: [], passives: [] };
  game.isBoss = false;
  state.coins = 0;
  renderHints();
  renderPassives();
  renderChallenges();
  app.passives.resetPassives();
  app.challenges.resetChallenges();
  app.hints.clearHints();
  app.ui.setStatus("Game over. Start a new run.", "error");
  app.ui.updateHud();
  hideRetryOverlay();
  hideAdvanceOverlay();
  hideShopOverlay();
  hideAdminOverlay();
  clearCoinBurst();
  showStartOverlay();
}

function startGame() {
  var config = getPlayConfig();
  game.started = true;
  game.levelNumber = 1;
  game.bossCount = 0;
  game.isBoss = false;
  game.shop = { hints: [], passives: [] };
  game.difficulty = parseDifficulty(config.startDifficulty) || {
    type: "kyu",
    value: 30,
  };
  state.lives = 3;
  state.coins = 0;
  game.maxLives = state.lives;
  app.ui.updateHud();
  setupPassives(config);
  setupHints(config);
  hideStartOverlay();
  hideRetryOverlay();
  hideShopOverlay();
  hideAdminOverlay();
  clearCoinBurst();
  loadLevel();
}

if (startGameBtn) {
  startGameBtn.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    startGame();
  });
}

if (adminToggle) {
  adminToggle.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    toggleAdminOverlay();
  });
}

if (adminClose) {
  adminClose.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    hideAdminOverlay();
  });
}

if (adminCoinsAdd) {
  adminCoinsAdd.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    addAdminCoins();
  });
}

if (adminHintAdd) {
  adminHintAdd.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    addAdminHint();
  });
}

if (adminPassiveAdd) {
  adminPassiveAdd.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    addAdminPassive();
  });
}

if (adminChallengeSet) {
  adminChallengeSet.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    setAdminChallenge();
  });
}

if (advanceBtn) {
  advanceBtn.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    advanceToPendingLevel();
  });
}

if (shopContinueBtn) {
  shopContinueBtn.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    advanceToPendingLevel();
  });
}

if (retryBtn) {
  retryBtn.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    if (!game.started || !game.currentProblem) {
      return;
    }
    if (state.lives <= 0) {
      endGame();
      return;
    }
    hideRetryOverlay();
    game.levelActive = true;
    app.board.resetPuzzle();
    applyPassives();
    applyChallenge();
    renderHints();
    app.board.updateBoard();
    app.board.evaluatePosition();
  });
}

if (app.elements.mount) {
  app.elements.mount.addEventListener("click", function (event) {
    if (!game.started || !game.levelActive) {
      return;
    }
    if (
      event &&
      event.target &&
      event.target.closest &&
      event.target.closest(".play-overlay")
    ) {
      return;
    }
    if (
      event &&
      event.target &&
      event.target.classList &&
      event.target.classList.contains("board-control")
    ) {
      return;
    }
    if (!app.refs.board) {
      return;
    }
    var pos = app.refs.board.cursorPosition;
    if (!pos || pos[0] < 0 || pos[1] < 0) {
      return;
    }
    app.board.handleMoveSelection(pos[0], pos[1]);
  });
}

document.addEventListener("keydown", function (event) {
  if (event.target && event.target.tagName === "SELECT") {
    return;
  }
  var advanceVisible =
    advanceOverlay && !advanceOverlay.classList.contains("is-hidden");
  var shopVisible = shopOverlay && !shopOverlay.classList.contains("is-hidden");
  if (!advanceVisible && !shopVisible) {
    return;
  }
  var key = event.key;
  if (key === " " || key === "Enter" || key === "n" || key === "N") {
    event.preventDefault();
    if (shopVisible && shopContinueBtn) {
      shopContinueBtn.click();
    } else if (advanceVisible && advanceBtn) {
      advanceBtn.click();
    }
  }
});

initAdminPanel();
app.ui.updateHud();

function getCoinAwardBreakdown() {
  var config = getPlayConfig();
  var steps = Math.max(0, game.levelNumber - 1) * config.difficultyStep;
  var base = config.coins.base + steps * config.coins.perDifficulty;
  if (!Number.isFinite(base)) {
    base = 0;
  }
  base = Math.max(0, base);
  var bonus = game.isBoss ? config.coins.bossBonus : 0;
  if (!Number.isFinite(bonus)) {
    bonus = 0;
  }
  var total = base + bonus;
  if (!Number.isFinite(total)) {
    total = base;
  }
  total = Math.max(0, total);
  var multiplier = 1;
  if (base > 0) {
    multiplier = total / base;
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      multiplier = 1;
    }
  }
  return {
    base: base,
    bonus: bonus,
    total: total,
    multiplier: multiplier,
  };
}

function formatMultiplier(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "1x";
  }
  var rounded = Math.round(value * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 0.01) {
    return Math.round(rounded) + "x";
  }
  return rounded.toFixed(1) + "x";
}

function renderCoinBurst(breakdown) {
  if (!coinBurst) {
    return;
  }
  coinBurst.classList.remove("is-active");
  while (coinBurst.firstChild) {
    coinBurst.removeChild(coinBurst.firstChild);
  }
  var baseValue = Math.round(breakdown.base || 0);
  var totalValue = Math.round(breakdown.total || 0);
  var multiplierText = formatMultiplier(breakdown.multiplier);

  var grid = document.createElement("div");
  grid.className = "coin-burst__grid";

  function addSlot(value, label, type, placeholder) {
    var slot = document.createElement("div");
    slot.className = "coin-burst__slot";
    if (type) {
      slot.classList.add("coin-burst__slot--" + type);
    }
    if (placeholder) {
      slot.classList.add("is-placeholder");
      slot.setAttribute("aria-hidden", "true");
    }
    var valueEl = document.createElement("div");
    valueEl.className = "coin-burst__value";
    if (type === "total") {
      valueEl.classList.add("coin-burst__value--total");
      var icon = document.createElement("span");
      icon.className = "coin-icon coin-burst__icon";
      icon.setAttribute("aria-hidden", "true");
      var text = document.createElement("span");
      text.textContent = String(value);
      valueEl.appendChild(icon);
      valueEl.appendChild(text);
    } else {
      valueEl.textContent = String(value);
    }
    var labelEl = document.createElement("div");
    labelEl.className = "coin-burst__label";
    labelEl.textContent = label || "";
    slot.appendChild(valueEl);
    slot.appendChild(labelEl);
    grid.appendChild(slot);
  }

  addSlot(baseValue, "Base", "base");
  addSlot(multiplierText, "Challenge", "multiplier");
  addSlot("", "", "extra", true);
  addSlot("", "", "extra", true);
  addSlot(totalValue, "Total", "total");

  coinBurst.appendChild(grid);
  void coinBurst.offsetWidth;
  coinBurst.classList.add("is-active");
}

function clearCoinBurst() {
  if (!coinBurst) {
    return;
  }
  coinBurst.classList.remove("is-active");
  while (coinBurst.firstChild) {
    coinBurst.removeChild(coinBurst.firstChild);
  }
}

function flashCoinAward(amount) {
  var value = Math.round(amount || 0);
  if (value <= 0) {
    return;
  }
  renderCoinBurst({
    base: value,
    bonus: 0,
    total: value,
    multiplier: 1,
  });
}

function awardCoins() {
  var breakdown = getCoinAwardBreakdown();
  var award = Math.round(breakdown.total);
  if (award <= 0) {
    return;
  }
  state.coins = (state.coins || 0) + award;
  app.ui.updateHud();
  updateShopCoins();
  if (shopOverlay && !shopOverlay.classList.contains("is-hidden")) {
    renderShop();
  }
  renderCoinBurst(breakdown);
}
