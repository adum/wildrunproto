import { app } from "../prototype/context.js";
import "../prototype/config.js";
import "../prototype/ghost.js";
import "../prototype/fire.js";
import "../prototype/frost.js";
import "../prototype/flip.js";
import "../prototype/spotlight.js";
import "../prototype/spyglass.js";
import "../prototype/effects.js";
import "../prototype/passives.js";
import "../prototype/overlays.js";
import "../prototype/timers.js";
import "../prototype/challenges.js";
import "../prototype/hints.js";
import "../prototype/board.js";
import { createPlayMap } from "./map-ui.js";

if (!app.GB) {
  throw new Error("ghostban library not found.");
}

var state = app.state;
var refs = app.refs;

var startOverlay = document.getElementById("startOverlay");
var startGameBtn = document.getElementById("startGameBtn");
var startPassiveSection = document.getElementById("startPassiveSection");
var startPassiveList = document.getElementById("startPassiveList");
var startBestRun = document.getElementById("startBestRun");
var startBestRunValue = document.getElementById("startBestRunValue");
var resetStateBtn = document.getElementById("resetStateBtn");
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
var shopCoinsIcon = document.getElementById("shopCoinsIcon");
var shopCoinsValue = document.getElementById("shopCoinsValue");
var shopHintSection = document.getElementById("shopHintSection");
var shopHintLabel = document.getElementById("shopHintLabel");
var shopHintList = document.getElementById("shopHintList");
var shopPassiveSection = document.getElementById("shopPassiveSection");
var shopPassiveLabel = document.getElementById("shopPassiveLabel");
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
var difficultyCard = document.getElementById("difficultyCard");
var difficultyLabel = document.getElementById("difficultyLabel");
var passiveList = document.getElementById("passiveList");
var hintList = document.getElementById("hintList");
var challengeSection = document.getElementById("challengeSection");
var challengeList = document.getElementById("challengeList");
var mapOverlay = document.getElementById("mapOverlay");
var mapStatus = document.getElementById("mapStatus");
var playMapCanvas = document.getElementById("playMapCanvas");
var playMapInfoTitle = document.getElementById("playMapInfoTitle");
var playMapInfoDesc = document.getElementById("playMapInfoDesc");
var playMapInfoHint = document.getElementById("playMapInfoHint");
var mapLevelLabel = document.getElementById("mapLevelLabel");
var levelCongratsOverlay = document.getElementById("levelCongratsOverlay");
var levelCongratsTitle = document.getElementById("levelCongratsTitle");
var levelCongratsBtn = document.getElementById("levelCongratsBtn");
var treasureOverlay = document.getElementById("treasureOverlay");
var treasureList = document.getElementById("treasureList");

var problems = Array.isArray(window.gpProblems) ? window.gpProblems : [];
var DEFAULT_DIFFICULTY_RANGES = [
  { start: "30kyu", end: "25kyu" },
  { start: "25kyu", end: "20kyu" },
  { start: "20kyu", end: "15kyu" },
  { start: "15kyu", end: "10kyu" },
  { start: "10kyu", end: "5kyu" },
  { start: "5kyu", end: "1dan" },
  { start: "1dan", end: "3dan" },
  { start: "3dan", end: "5dan" },
  { start: "5dan", end: "9dan" },
];
var playMap = null;

function logEvent(message, data) {
  if (data !== undefined) {
    console.log("[Play]", message, data);
    return;
  }
  console.log("[Play]", message);
}

app.handlers.onTimerExpired = function () {
  app.board.evaluatePosition();
};

var PASSIVE_DEFS = {
  timeExtend: {
    label: "Time Extend",
    tooltip: "Timers slower: L1 10%, +10%/level (before start).",
  },
  secondChance: {
    label: "Second Chance",
    tooltip: "Retry window: L1 2s, +1s/level.",
  },
  freeUpgrades: {
    label: "Free Upgrades",
    tooltip: "Upgrade chance: L1 30%, +10%/level.",
  },
  bigMoney: {
    label: "Big Money",
    tooltip: "Coins: L1 1.2x, +0.05x/level.",
  },
  shopaholic: {
    label: "Shopaholic",
    tooltip: "Shop items: L1 +1, +1/level.",
  },
  friendlyCapture: {
    label: "Friendly Capture",
    tooltip: "Indicator: any correct line sacrifices a player stone.",
    indicatorKey: "friendlyCaptureDetected",
  },
  enemyCapture: {
    label: "Enemy Capture",
    tooltip: "Indicator: any correct line captures an enemy stone.",
    indicatorKey: "enemyCaptureDetected",
  },
  majorCapture: {
    label: "Major Capture",
    tooltip: "Indicator: any correct line captures 5+ stones.",
    indicatorKey: "majorCaptureDetected",
  },
  lineOfDeath: {
    label: "Line of Death",
    tooltip: "Indicator: any correct line plays a player stone on the edge.",
    indicatorKey: "lineOfDeathDetected",
  },
  underStones: {
    label: "Under Stones",
    tooltip: "Indicator: any correct line plays a move on a previously used spot.",
    indicatorKey: "underStonesDetected",
  },
};

var HINT_DEFS = {
  firstMove: {
    label: "First Move",
    tooltip: "Marks the next correct move in the line.",
    action: function () {
      app.hints.hintFirstMove();
    },
  },
  firstOrSecond: {
    label: "First or Second",
    tooltip: "Shows either the first correct move or your second move.",
    action: function () {
      app.hints.hintFirstOrSecond();
    },
  },
  multipleChoice: {
    label: "Multiple Choice",
    tooltip: "Shows candidate moves; fewer as level rises.",
    action: function () {
      app.hints.hintTwoMoves();
    },
  },
  multishot: {
    label: "Multishot",
    tooltip: "Place multiple moves; correct one auto-plays.",
    action: function () {
      app.hints.hintMultishot();
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
    tooltip: "Reveals row containing a solution; width shrinks with level.",
    action: function () {
      app.hints.hintRowReveal();
    },
  },
  colReveal: {
    label: "Column Reveal",
    tooltip: "Reveals column containing a solution; width shrinks with level.",
    action: function () {
      app.hints.hintColumnReveal();
    },
  },
  diagReveal: {
    label: "Diagonal Reveal",
    tooltip: "Reveals diagonal containing a solution; width shrinks with level.",
    action: function () {
      app.hints.hintDiagonalReveal();
    },
  },
  eliminateRandom: {
    label: "Eliminate Random Move",
    tooltip: "Eliminates wrong/decoy moves; more at higher levels.",
    action: function () {
      app.board.eliminateRandomMove();
    },
  },
};

var CHALLENGE_DEFS = {
  gray: {
    label: "Gray Play",
    tooltip: "New stones gray (no levels).",
    enable: function () {
      app.challenges.setGrayPlay(true);
    },
  },
  ghost: {
    label: "Ghost Play",
    tooltip: "Flash 5s -1s/level (min 0.5s); reveal 2s -1s/level.",
    setLevel: function (level) {
      app.ghost.setGhostLevel(level);
    },
    enable: function () {
      app.challenges.setGhostPlay(true);
    },
  },
  mystery: {
    label: "Mystery Timer",
    tooltip: "Hidden stones L1 1, +1/level; timer 30s -5s/level (min 5s).",
    setLevel: function (level) {
      app.timers.setMysteryLevel(level);
    },
    enable: function () {
      app.challenges.setMysteryPlay(true);
    },
  },
  enigma: {
    label: "Enigma Timer",
    tooltip: "Rings L1 1, +1/level; timer 30s -5s/level (min 5s).",
    setLevel: function (level) {
      app.timers.setEnigmaLevel(level);
    },
    enable: function () {
      app.challenges.setEnigmaPlay(true);
    },
  },
  infection: {
    label: "Infection",
    tooltip: "Rings: L1 player1, L2 player1/opp1, L3 player2/opp1, L4 player2/opp2.",
    setLevel: function (level) {
      app.challenges.setInfectionLevel(level);
    },
    enable: function () {
      app.challenges.setInfectionPlay(true);
    },
  },
  speed: {
    label: "Speed Play",
    tooltip: "Per-move timer L1 30s, -5s/level (min 2s).",
    setLevel: function (level) {
      app.timers.setSpeedLevel(level);
    },
    enable: function () {
      app.challenges.setSpeedPlay(true);
    },
  },
  fire: {
    label: "Fire Snake",
    tooltip: "Snake length L1 4, +2/level.",
    setLevel: function (level) {
      app.fire.setFireLevel(level);
    },
    enable: function () {
      app.challenges.setFirePlay(true);
    },
  },
  frost: {
    label: "Frost Snake",
    tooltip: "Snake length L1 4, +2/level.",
    setLevel: function (level) {
      app.frost.setFrostLevel(level);
    },
    enable: function () {
      app.challenges.setFrostPlay(true);
    },
  },
  flip: {
    label: "Flip Snake",
    tooltip: "Flips stones; length L1 4, +2/level.",
    setLevel: function (level) {
      app.flip.setFlipLevel(level);
    },
    enable: function () {
      app.challenges.setFlipPlay(true);
    },
  },
  spotlight: {
    label: "Spotlight",
    tooltip: "Radius 2.8 -0.2/level (min 1); speed +0.4/level; dark L1 dim, L2+ black.",
    setLevel: function (level) {
      app.spotlight.setSpotlightLevel(level);
    },
    enable: function () {
      app.challenges.setSpotlightPlay(true);
    },
  },
  spyglass: {
    label: "Spy Glass",
    tooltip: "Mouse spotlight: radius 2.8 -0.2/level (min 1); dark L1 dim, L2+ black.",
    setLevel: function (level) {
      app.spyglass.setSpyglassLevel(level);
    },
    enable: function () {
      app.challenges.setSpyglassPlay(true);
    },
  },
  lineless: {
    label: "Lineless",
    tooltip: "Hide board grid lines and star points.",
    enable: function () {
      app.challenges.setLinelessPlay(true);
    },
  },
};

var problemIndex = buildProblemIndex(problems);
var PASSIVE_STORAGE_KEY = "wildrun.passives";
var BANKED_STORAGE_KEY = "wildrun.bankedCoins";
var BEST_RUN_STORAGE_KEY = "wildrun.bestRunLevel";

var game = {
  started: false,
  levelNumber: 0,
  bossCount: 0,
  mapIndex: 0,
  bestRunLevel: 0,
  difficulty: null,
  difficultyLabel: "",
  levelActive: false,
  currentProblem: null,
  currentNode: null,
  blockClicksUntil: 0,
  passives: [],
  hints: [],
  challenges: [],
  shop: { hints: [], passives: [] },
  maxLives: 3,
  isBoss: false,
  map: null,
  hintLevels: {},
};
game.passives = loadStoredPassives();
state.bankedCoins = loadBankedCoins();
game.bestRunLevel = loadBestRunLevel();

app.handlers.onPuzzleSolved = function () {
  if (!game.started || !game.levelActive) {
    return;
  }
  game.levelActive = false;
  setDifficultyVisible(false);
  awardCoins();
  logEvent("Puzzle solved.", {
    difficulty: game.difficultyLabel || formatDifficulty(game.difficulty),
    node: game.currentNode ? game.currentNode.type : null,
  });
  var node = game.currentNode;
  if (node && app.board && app.board.playVictoryAccent) {
    if (node.type === "levelBoss") {
      app.board.playVictoryAccent(2);
    } else if (node.type === "boss") {
      app.board.playVictoryAccent(1);
    }
  }
  advanceAfterSolve();
  if (node && node.type === "levelBoss") {
    logEvent("Level boss cleared. Generating new map.");
    startNewMap();
    showCongratsOverlay();
  } else {
    showMapOverlay();
  }
};

app.handlers.onPuzzleFailed = function () {
  if (!game.started) {
    return;
  }
  game.levelActive = false;
  setDifficultyVisible(false);
  logEvent("Puzzle failed.", {
    difficulty: game.difficultyLabel || formatDifficulty(game.difficulty),
    node: game.currentNode ? game.currentNode.type : null,
  });
  hideMapOverlay();
  if (state.lives <= 0) {
    endGame();
  } else {
    showRetryOverlay();
  }
};

function getPlayConfig() {
  var config = app.config && app.config.play ? app.config.play : {};
  var coins = config.coins || {};
  var mapConfig = config.map || {};
  var mapWeights = mapConfig.weights || {};
  var treasureConfig = config.treasure || {};
  var hintPool = Array.isArray(config.hintPool)
    ? config.hintPool.slice()
    : Object.keys(HINT_DEFS);
  var passivePool = Array.isArray(config.passivePool)
    ? config.passivePool.slice()
    : Object.keys(PASSIVE_DEFS);
  var challengePool = Array.isArray(config.challengePool)
    ? config.challengePool.slice()
    : Object.keys(CHALLENGE_DEFS);
  var difficultyRanges =
    Array.isArray(config.difficultyRanges) && config.difficultyRanges.length
      ? config.difficultyRanges.slice()
      : DEFAULT_DIFFICULTY_RANGES.slice();
  var treasureHintPool = Array.isArray(treasureConfig.hintPool)
    ? treasureConfig.hintPool.slice()
    : hintPool.slice();
  var treasurePassivePool = Array.isArray(treasureConfig.passivePool)
    ? treasureConfig.passivePool.slice()
    : passivePool.slice();
  var shop = config.shop || {};
  var shopPrices = shop.prices || {};
  var shopHintPool = Array.isArray(shop.hintPool)
    ? shop.hintPool.slice()
    : hintPool.slice();
  var shopPassivePool = Array.isArray(shop.passivePool)
    ? shop.passivePool.slice()
    : [];
  var passiveShop = config.passiveShop || {};
  var passiveShopPrices = passiveShop.prices || {};
  var passiveShopPassivePool = Array.isArray(passiveShop.passivePool)
    ? passiveShop.passivePool.slice()
    : passivePool.slice();
  var passiveShopPriceExponent = toNumber(passiveShop.priceExponent, 1.2);
  if (!Number.isFinite(passiveShopPriceExponent) || passiveShopPriceExponent <= 0) {
    passiveShopPriceExponent = 1.2;
  }
  return {
    startDifficulty: config.startDifficulty || "30kyu",
    difficultyStep: toNumber(config.difficultyStep, 1),
    difficultyRanges: difficultyRanges,
    hintsPerLevel: Math.max(0, toNumber(config.hintsPerLevel, 2)),
    passivesPerRun: Math.max(0, toNumber(config.passivesPerRun, 1)),
    challengeLevelStart: toNumber(config.challengeLevelStart, 1),
    challengeLevelRamp: toNumber(config.challengeLevelRamp, 1),
    coins: {
      base: toNumber(coins.base, 5),
      perDifficulty: toNumber(coins.perDifficulty, 1),
      bossBonus: toNumber(coins.bossBonus, 0),
      levelBossBonusMultiplier: Math.max(
        1,
        toNumber(coins.levelBossBonusMultiplier, 2)
      ),
      speedPlayMultiplier: Math.max(1, toNumber(coins.speedPlayMultiplier, 1)),
      speedSolveMultiplier: Math.max(1, toNumber(coins.speedSolveMultiplier, 1)),
    },
    map: {
      height: Math.max(3, toNumber(mapConfig.height, 7)),
      maxWidth: Math.max(2, toNumber(mapConfig.maxWidth, 5)),
      allowVoid: mapConfig.allowVoid !== false,
      maxAttempts: Math.max(10, toNumber(mapConfig.maxAttempts, 60)),
      passiveShopMinLevel: Math.max(
        1,
        toNumber(mapConfig.passiveShopMinLevel, 2)
      ),
      shopMinCount: Math.max(
        0,
        Math.min(1, Math.round(toNumber(mapConfig.shopMinCount, 1)))
      ),
      weights: {
        problem: Math.max(0, toNumber(mapWeights.problem, 6)),
        boss: Math.max(0, toNumber(mapWeights.boss, 1)),
        empty: Math.max(0, toNumber(mapWeights.empty, 2)),
        shop: Math.max(0, toNumber(mapWeights.shop, 1)),
        passiveShop: Math.max(0, toNumber(mapWeights.passiveShop, 1)),
        treasure: Math.max(0, toNumber(mapWeights.treasure, 1)),
        void: Math.max(0, toNumber(mapWeights.void, 1)),
      },
    },
    treasure: {
      coinMin: Math.max(0, toNumber(treasureConfig.coinMin, 6)),
      coinMax: Math.max(0, toNumber(treasureConfig.coinMax, 12)),
      hintPool: treasureHintPool,
      passivePool: treasurePassivePool,
    },
    challengeCombos: config.challengeCombos || null,
    shop: {
      hintCount: Math.max(0, toNumber(shop.hintCount, 2)),
      passiveCount: Math.max(0, toNumber(shop.passiveCount, 1)),
      hintPool: shopHintPool,
      passivePool: shopPassivePool,
      prices: {
        hints: shopPrices.hints || {},
        passives: shopPrices.passives || {},
      },
    },
    passiveShop: {
      passiveCount: Math.max(0, toNumber(passiveShop.passiveCount, 1)),
      upgradeCount: Math.max(0, toNumber(passiveShop.upgradeCount, 1)),
      passivePool: passiveShopPassivePool,
      priceExponent: passiveShopPriceExponent,
      prices: {
        passives: passiveShopPrices.passives || shopPrices.passives || {},
        upgrades: passiveShopPrices.upgrades || {},
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

function getPassivePriceScale(passiveCount, exponent) {
  var count = Math.max(0, Math.round(passiveCount || 0));
  var exp = Number(exponent);
  if (!Number.isFinite(exp) || exp <= 0) {
    exp = 1;
  }
  var scale = Math.pow(exp, count);
  if (!Number.isFinite(scale) || scale <= 0) {
    return 1;
  }
  return scale;
}

function getScaledPrice(base, scale) {
  if (!Number.isFinite(base)) {
    return null;
  }
  var price = base * scale;
  if (!Number.isFinite(price)) {
    return null;
  }
  return Math.max(0, Math.round(price));
}

function getPassiveUpgradePrice(passivePrices, upgradePrices, id, level, scale) {
  var base = getShopPrice(upgradePrices, id);
  if (base === null) {
    base = getShopPrice(passivePrices, id);
  }
  if (base === null) {
    return null;
  }
  var safeLevel = Math.max(1, Math.round(level || 1));
  var multiplier = safeLevel * safeLevel;
  return getScaledPrice(base * multiplier, scale);
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

function getStorage() {
  try {
    return window.localStorage || null;
  } catch (error) {
    return null;
  }
}

function normalizePassives(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  var ordered = [];
  var lookup = {};
  list.forEach(function (item) {
    if (!item || !item.id) {
      return;
    }
    var id = String(item.id);
    var def = PASSIVE_DEFS[id];
    if (!def) {
      return;
    }
    var bounds = getPassiveLevelBounds(id);
    var level = clampNumber(item.level, bounds.min, bounds.max);
    if (!lookup[id]) {
      lookup[id] = { id: id, level: level };
      ordered.push(id);
      return;
    }
    if (level > lookup[id].level) {
      lookup[id].level = level;
    }
  });
  return ordered.map(function (id) {
    return lookup[id];
  });
}

function loadStoredPassives() {
  var storage = getStorage();
  if (!storage) {
    return [];
  }
  var raw = storage.getItem(PASSIVE_STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    return normalizePassives(JSON.parse(raw));
  } catch (error) {
    return [];
  }
}

function persistPassives() {
  var normalized = normalizePassives(game.passives);
  game.passives = normalized;
  var storage = getStorage();
  if (!storage) {
    return;
  }
  if (!normalized.length) {
    storage.removeItem(PASSIVE_STORAGE_KEY);
    return;
  }
  try {
    storage.setItem(PASSIVE_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    // Ignore storage failures (quota/private mode).
  }
}

function loadBankedCoins() {
  var storage = getStorage();
  if (!storage) {
    return 0;
  }
  var raw = storage.getItem(BANKED_STORAGE_KEY);
  if (raw === null || raw === undefined || raw === "") {
    return 0;
  }
  var value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.round(value);
}

function loadBestRunLevel() {
  var storage = getStorage();
  if (!storage) {
    return 0;
  }
  var raw = storage.getItem(BEST_RUN_STORAGE_KEY);
  if (raw === null || raw === undefined || raw === "") {
    return 0;
  }
  var value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(value));
}

function persistBankedCoins() {
  var storage = getStorage();
  if (!storage) {
    return;
  }
  var banked = Math.max(0, Math.round(state.bankedCoins || 0));
  if (banked <= 0) {
    storage.removeItem(BANKED_STORAGE_KEY);
    return;
  }
  try {
    storage.setItem(BANKED_STORAGE_KEY, String(banked));
  } catch (error) {
    // Ignore storage failures (quota/private mode).
  }
}

function persistBestRunLevel() {
  var storage = getStorage();
  if (!storage) {
    return;
  }
  var best = Math.max(0, Math.round(game.bestRunLevel || 0));
  if (best <= 0) {
    storage.removeItem(BEST_RUN_STORAGE_KEY);
    return;
  }
  try {
    storage.setItem(BEST_RUN_STORAGE_KEY, String(best));
  } catch (error) {
    // Ignore storage failures (quota/private mode).
  }
}

function updateBestRunLevel(level) {
  var next = Math.max(0, Math.round(level || 0));
  if (next <= 0) {
    game.bestRunLevel = 0;
    persistBestRunLevel();
    renderStartBestRun();
    return;
  }
  if (!game.bestRunLevel || next > game.bestRunLevel) {
    game.bestRunLevel = next;
    persistBestRunLevel();
    renderStartBestRun();
  }
}

function addBankedCoins(amount) {
  var gain = Math.round(toNumber(amount, 0));
  if (!Number.isFinite(gain) || gain <= 0) {
    return;
  }
  state.bankedCoins = Math.max(0, Math.round(state.bankedCoins || 0)) + gain;
  persistBankedCoins();
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
  if (hintId === "multishot") {
    return "hintMultishot";
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

function getHintTypeLevel(hintId) {
  if (!hintId) {
    return 1;
  }
  if (!game.hintLevels) {
    game.hintLevels = {};
  }
  var level = game.hintLevels[hintId];
  if (!Number.isFinite(level) || level <= 0) {
    level = 1;
    if (Array.isArray(game.hints)) {
      var maxFound = 0;
      game.hints.forEach(function (hint) {
        if (hint && hint.id === hintId) {
          var hintLevel = Number(hint.level);
          if (Number.isFinite(hintLevel) && hintLevel > maxFound) {
            maxFound = hintLevel;
          }
        }
      });
      if (maxFound > 0) {
        level = maxFound;
      }
    }
  }
  return clampHintLevel(hintId, level);
}

function setHintTypeLevel(hintId, level) {
  if (!hintId) {
    return 1;
  }
  if (!game.hintLevels) {
    game.hintLevels = {};
  }
  var current = getHintTypeLevel(hintId);
  var safe = clampHintLevel(hintId, level);
  if (safe < current) {
    safe = current;
  }
  game.hintLevels[hintId] = safe;
  if (Array.isArray(game.hints)) {
    game.hints.forEach(function (hint) {
      if (hint.id === hintId) {
        hint.level = safe;
      }
    });
  }
  return safe;
}

function applyHintLevel(hintId, level) {
  var safe = Math.max(1, Math.round(level || 1));
  if (hintId === "multipleChoice" && app.hints.setMultipleChoiceLevel) {
    app.hints.setMultipleChoiceLevel(safe);
  } else if (hintId === "multishot" && app.hints.setMultishotLevel) {
    app.hints.setMultishotLevel(safe);
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

function maybeUpgradeHintLevel(hintId) {
  var maxLevel = getHintMaxLevel(hintId);
  var current = getHintTypeLevel(hintId);
  if (current >= maxLevel) {
    return current;
  }
  var chance =
    app.passives && app.passives.getFreeUpgradesChance
      ? app.passives.getFreeUpgradesChance()
      : 0;
  if (chance > 0 && Math.random() < chance) {
    return setHintTypeLevel(hintId, current + 1);
  }
  return current;
}

function createHintItem(id) {
  var level = maybeUpgradeHintLevel(id);
  return {
    id: id,
    used: false,
    level: level,
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

var MAX_KYU_LEVEL = 30;
var MAX_DAN_LEVEL = 9;
var HARD_MIN_DAN_LEVEL = 5;
var MAX_DIFFICULTY_RANK = MAX_KYU_LEVEL - 1 + MAX_DAN_LEVEL;
var HARD_MIN_RANK = MAX_KYU_LEVEL - 1 + HARD_MIN_DAN_LEVEL;

function difficultyToRank(diff) {
  if (!diff) {
    return null;
  }
  var value = Number(diff.value);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  var rounded = Math.round(value);
  if (diff.type === "dan") {
    return MAX_KYU_LEVEL - 1 + rounded;
  }
  return MAX_KYU_LEVEL - rounded;
}

function clampDifficultyRank(rank) {
  if (!Number.isFinite(rank)) {
    return 0;
  }
  return Math.max(0, Math.min(MAX_DIFFICULTY_RANK, Math.round(rank)));
}

function rankToDifficulty(rank) {
  var clamped = clampDifficultyRank(rank);
  if (clamped <= MAX_KYU_LEVEL - 1) {
    return { type: "kyu", value: MAX_KYU_LEVEL - clamped };
  }
  return { type: "dan", value: clamped - (MAX_KYU_LEVEL - 1) };
}

function normalizeDifficultyRange(range) {
  if (!range || typeof range !== "object") {
    return null;
  }
  var startValue = range.start || range.min || range.low || range.from;
  var endValue = range.end || range.max || range.high || range.to;
  if (!startValue || !endValue) {
    return null;
  }
  var start = parseDifficulty(startValue);
  var end = parseDifficulty(endValue);
  if (!start || !end) {
    return null;
  }
  var startRank = difficultyToRank(start);
  var endRank = difficultyToRank(end);
  if (startRank === null || endRank === null) {
    return null;
  }
  var minRank = Math.min(startRank, endRank);
  var maxRank = Math.max(startRank, endRank);
  minRank = clampDifficultyRank(minRank);
  maxRank = clampDifficultyRank(maxRank);
  if (maxRank >= MAX_DIFFICULTY_RANK) {
    maxRank = MAX_DIFFICULTY_RANK;
    minRank = Math.max(minRank, HARD_MIN_RANK);
  }
  if (minRank > maxRank) {
    minRank = maxRank;
  }
  return { minRank: minRank, maxRank: maxRank };
}

function getDifficultyRangeForLevel(config, mapLevel) {
  var ranges = config && Array.isArray(config.difficultyRanges)
    ? config.difficultyRanges
    : [];
  if (!ranges.length) {
    ranges = DEFAULT_DIFFICULTY_RANGES;
  }
  var index = Math.max(0, (mapLevel || 1) - 1);
  var entry = ranges[index] || ranges[ranges.length - 1];
  var normalized = normalizeDifficultyRange(entry);
  if (normalized) {
    return normalized;
  }
  for (var i = ranges.length - 1; i >= 0; i -= 1) {
    normalized = normalizeDifficultyRange(ranges[i]);
    if (normalized) {
      return normalized;
    }
  }
  return normalizeDifficultyRange(DEFAULT_DIFFICULTY_RANGES[0]);
}

function formatDifficultyRange(range) {
  if (!range) {
    return "unknown";
  }
  var start = rankToDifficulty(range.minRank);
  var end = rankToDifficulty(range.maxRank);
  return formatDifficulty(start) + "-" + formatDifficulty(end);
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

function pickRandomProblem() {
  if (!problems.length) {
    return null;
  }
  var fallback = problems[Math.floor(Math.random() * problems.length)];
  var parsed = parseDifficulty(fallback.difficulty);
  return {
    problem: fallback,
    label: parsed ? formatDifficulty(parsed) : fallback.difficulty || "unknown",
    difficulty: parsed,
  };
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
        difficulty: current,
      };
    }
    current = stepDownDifficulty(current);
    attempts += 1;
  }
  return pickRandomProblem();
}

function pickProblemForRank(targetRank, minRank, maxRank) {
  if (targetRank === null || targetRank === undefined) {
    return pickRandomProblem();
  }
  var low = clampDifficultyRank(minRank);
  var high = clampDifficultyRank(maxRank);
  if (low > high) {
    var swap = low;
    low = high;
    high = swap;
  }
  var rank = clampDifficultyRank(targetRank);
  if (rank < low) {
    rank = low;
  }
  if (rank > high) {
    rank = high;
  }
  for (var down = rank; down >= low; down -= 1) {
    var downDiff = rankToDifficulty(down);
    var downLabel = formatDifficulty(downDiff);
    var downOptions = problemIndex[downLabel];
    if (downOptions && downOptions.length) {
      return {
        problem: downOptions[Math.floor(Math.random() * downOptions.length)],
        label: downLabel,
        difficulty: downDiff,
      };
    }
  }
  for (var up = rank + 1; up <= high; up += 1) {
    var upDiff = rankToDifficulty(up);
    var upLabel = formatDifficulty(upDiff);
    var upOptions = problemIndex[upLabel];
    if (upOptions && upOptions.length) {
      return {
        problem: upOptions[Math.floor(Math.random() * upOptions.length)],
        label: upLabel,
        difficulty: upDiff,
      };
    }
  }
  return pickRandomProblem();
}

function getTargetRankForNode(node, mapHeight, range) {
  if (!range) {
    return null;
  }
  var minRank = range.minRank;
  var maxRank = range.maxRank;
  if (node && (node.type === "boss" || node.type === "levelBoss")) {
    return maxRank;
  }
  if (minRank === maxRank) {
    return minRank;
  }
  var height = Math.max(3, Math.round(mapHeight || 0));
  var playable = Math.max(1, height - 2);
  var row = node && Number.isFinite(node.r) ? node.r : 1;
  var progress = (row - 1) / playable;
  if (!Number.isFinite(progress)) {
    progress = 0;
  }
  progress = Math.max(0, Math.min(1, progress));
  return clampDifficultyRank(minRank + (maxRank - minRank) * progress);
}

function pickProblemForNode(node, config) {
  var mapLevel = Math.max(1, game.mapIndex || 1);
  var range = getDifficultyRangeForLevel(config, mapLevel);
  if (!range) {
    var fallbackStart =
      parseDifficulty(config.startDifficulty) || { type: "kyu", value: 30 };
    return pickProblemForDifficulty(fallbackStart);
  }
  var mapHeight =
    game.map && Array.isArray(game.map.rows)
      ? game.map.rows.length
      : config.map.height;
  var targetRank = getTargetRankForNode(node, mapHeight, range);
  return pickProblemForRank(targetRank, range.minRank, range.maxRank);
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
  if (
    levelCongratsOverlay &&
    levelCongratsOverlay.parentElement !== app.elements.mount
  ) {
    app.elements.mount.appendChild(levelCongratsOverlay);
  }
  if (mapOverlay && mapOverlay.parentElement !== app.elements.mount) {
    app.elements.mount.appendChild(mapOverlay);
  }
  if (treasureOverlay && treasureOverlay.parentElement !== app.elements.mount) {
    app.elements.mount.appendChild(treasureOverlay);
  }
  if (coinBurst && !app.elements.mount.contains(coinBurst)) {
    app.elements.mount.appendChild(coinBurst);
  }
}

function resetHintLevels() {
  app.hints.setMultipleChoiceLevel(1);
  app.hints.setMultishotLevel(1);
  app.hints.setRowRevealLevel(1);
  app.hints.setColumnRevealLevel(1);
  app.hints.setDiagonalRevealLevel(1);
  app.hints.setElimRandomLevel(1);
}

function renderPassiveChips(listEl, passives, showIndicators) {
  if (!listEl) {
    return;
  }
  listEl.textContent = "";
  (passives || []).forEach(function (passive) {
    var def = PASSIVE_DEFS[passive.id];
    if (!def) {
      return;
    }
    var item = document.createElement("div");
    item.className = "play-chip";
    item.title = def.tooltip;
    item.dataset.passiveId = passive.id;
    var label = document.createElement("span");
    label.textContent = def.label;
    if (showIndicators && def.indicatorKey) {
      var indicator = document.createElement("span");
      indicator.className = "play-chip__indicator";
      if (state[def.indicatorKey]) {
        indicator.classList.add("is-active");
      }
      item.appendChild(indicator);
    }
    item.appendChild(label);
    if (!def.indicatorKey) {
      var bounds = getPassiveLevelBounds(passive.id);
      if (bounds.max > 1) {
        var level = document.createElement("span");
        level.className = "play-chip__level";
        level.textContent = "L" + passive.level;
        item.appendChild(level);
      }
    }
    listEl.appendChild(item);
  });
}

function renderPassives() {
  renderPassiveChips(passiveList, game.passives, true);
}

function renderStartPassives() {
  if (!startPassiveSection || !startPassiveList) {
    return;
  }
  if (!game.passives || game.passives.length === 0) {
    startPassiveList.textContent = "";
    startPassiveSection.classList.add("is-hidden");
    return;
  }
  startPassiveSection.classList.remove("is-hidden");
  renderPassiveChips(startPassiveList, game.passives, false);
}

function renderStartBestRun() {
  if (!startBestRun || !startBestRunValue) {
    return;
  }
  var best = Math.max(0, Math.round(game.bestRunLevel || 0));
  if (best <= 0) {
    startBestRun.classList.add("is-hidden");
    return;
  }
  startBestRun.classList.remove("is-hidden");
  startBestRunValue.textContent = "Level " + best;
}

function renderHints() {
  if (!hintList) {
    return;
  }
  hintList.textContent = "";
  if (!Array.isArray(game.hints) || !game.hints.length) {
    return;
  }
  var grouped = [];
  var groupedById = {};
  game.hints.forEach(function (hint) {
    if (hint.used) {
      return;
    }
    var def = HINT_DEFS[hint.id];
    if (!def) {
      return;
    }
    if (!groupedById[hint.id]) {
      groupedById[hint.id] = { id: hint.id, def: def, count: 0 };
      grouped.push(groupedById[hint.id]);
    }
    groupedById[hint.id].count += 1;
  });
  grouped.forEach(function (group) {
    var hintId = group.id;
    var def = group.def;
    var count = group.count;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "button play-hint";
    button.title = def.tooltip;
    button.dataset.hintId = hintId;
    var label = document.createElement("span");
    label.textContent = def.label + (count > 1 ? " x" + count : "");
    button.appendChild(label);
    if (getHintMaxLevel(hintId) > 1) {
      var level = document.createElement("span");
      level.className = "play-chip__level";
      level.textContent = "L" + getHintTypeLevel(hintId);
      button.appendChild(level);
    }
    button.addEventListener("click", function (event) {
      if (event) {
        event.stopPropagation();
      }
      if (!game.levelActive) {
        return;
      }
      var hintItem = game.hints.find(function (item) {
        return item.id === hintId && !item.used;
      });
      if (!hintItem) {
        return;
      }
      applyHintLevel(hintId, getHintTypeLevel(hintId));
      def.action();
      hintItem.used = true;
      if (app.board && app.board.playHintSound) {
        app.board.playHintSound();
      }
      renderHints();
    });
    hintList.appendChild(button);
  });
}

function flashUpgradedItem(type, id) {
  var list = type === "hint" ? hintList : passiveList;
  if (!list || !id) {
    return;
  }
  var selector =
    type === "hint"
      ? '[data-hint-id="' + id + '"]'
      : '[data-passive-id="' + id + '"]';
  var item = list.querySelector(selector);
  if (!item) {
    return;
  }
  if (item._upgradeTimeoutId) {
    clearTimeout(item._upgradeTimeoutId);
  }
  item.classList.remove("is-upgraded");
  void item.offsetWidth;
  item.classList.add("is-upgraded");
  item._upgradeTimeoutId = window.setTimeout(function () {
    item.classList.remove("is-upgraded");
    item._upgradeTimeoutId = null;
  }, 400);
}

function renderChallenges() {
  if (!challengeSection || !challengeList) {
    return;
  }
  challengeList.textContent = "";
  if (!game.challenges || !game.challenges.length) {
    challengeSection.classList.add("is-hidden");
    return;
  }
  challengeSection.classList.remove("is-hidden");
  game.challenges.forEach(function (challenge) {
    var def = CHALLENGE_DEFS[challenge.id];
    if (!def) {
      return;
    }
    var item = document.createElement("div");
    item.className = "play-chip";
    item.title = def.tooltip;
    var label = document.createElement("span");
    label.textContent = def.label;
    item.appendChild(label);
    if (getChallengeLevelBounds(challenge.id).max > 1) {
      var level = document.createElement("span");
      level.className = "play-chip__level";
      level.textContent = "L" + challenge.level;
      item.appendChild(level);
    }
    challengeList.appendChild(item);
  });
}

function setDifficultyVisible(visible) {
  if (!difficultyCard) {
    return;
  }
  difficultyCard.classList.toggle("is-hidden", !visible);
}

function updateShopCoins() {
  if (!shopCoinsValue) {
    return;
  }
  var isPassiveShop = game.shop && game.shop.type === "passiveShop";
  var rounded = Math.round(
    (isPassiveShop ? state.bankedCoins : state.coins) || 0
  );
  shopCoinsValue.textContent = String(rounded);
  if (shopCoinsIcon) {
    shopCoinsIcon.className = isPassiveShop ? "bank-icon" : "coin-icon";
  }
}

function buildShopInventory(config, shopType) {
  var isPassiveShop = shopType === "passiveShop";
  var resolvedType = isPassiveShop ? "passiveShop" : "shop";
  var shopConfig = isPassiveShop ? config.passiveShop || config.shop : config.shop;
  if (!shopConfig) {
    game.shop = { hints: [], passives: [], type: resolvedType };
    return;
  }
  var shopBonus =
    app.passives && app.passives.getShopaholicBonus
      ? app.passives.getShopaholicBonus()
      : 0;
  var hintPrices = shopConfig.prices ? shopConfig.prices.hints : {};
  var passivePrices = shopConfig.prices ? shopConfig.prices.passives : {};
  var upgradePrices = shopConfig.prices ? shopConfig.prices.upgrades : {};
  var hints = [];
  var passives = [];
  if (!isPassiveShop) {
    var hintCandidates = shopConfig.hintPool.filter(function (id) {
      if (!HINT_DEFS[id]) {
        return false;
      }
      return getShopPrice(hintPrices, id) !== null;
    });
    var hintTargetCount = Math.max(0, shopConfig.hintCount + Math.max(0, shopBonus));
    hints = pickRandom(hintCandidates, hintTargetCount).map(function (id) {
      return {
        id: id,
        price: getShopPrice(hintPrices, id),
        purchased: false,
      };
    });
  } else {
    var ownedPassives = new Set(
      game.passives.map(function (passive) {
        return passive.id;
      })
    );
    var passivePriceScale = getPassivePriceScale(
      game.passives.length,
      shopConfig.priceExponent
    );
    var passivePool = Array.isArray(shopConfig.passivePool)
      ? shopConfig.passivePool
      : [];
    var passivePoolSet = new Set(passivePool);
    var passiveCandidates = passivePool.filter(function (id) {
      if (!PASSIVE_DEFS[id]) {
        return false;
      }
      if (ownedPassives.has(id)) {
        return false;
      }
      return getShopPrice(passivePrices, id) !== null;
    });
    var passiveTargetCount = Math.max(
      0,
      shopConfig.passiveCount + Math.max(0, shopBonus)
    );
    var newPassives = pickRandom(passiveCandidates, passiveTargetCount).map(
      function (id) {
        var base = getShopPrice(passivePrices, id);
        return {
          id: id,
          price: getScaledPrice(base, passivePriceScale),
          purchased: false,
        };
      }
    );
    var upgradeCandidates = game.passives
      .map(function (passive) {
        if (!passivePoolSet.has(passive.id)) {
          return null;
        }
        var bounds = getPassiveLevelBounds(passive.id);
        if (passive.level >= bounds.max) {
          return null;
        }
        var nextLevel = passive.level + 1;
        var price = getPassiveUpgradePrice(
          passivePrices,
          upgradePrices,
          passive.id,
          nextLevel,
          passivePriceScale
        );
        if (price === null) {
          return null;
        }
        return {
          id: passive.id,
          level: nextLevel,
          price: price,
          purchased: false,
          upgrade: true,
        };
      })
      .filter(Boolean);
    var upgradeTargetCount = Math.max(0, shopConfig.upgradeCount);
    var upgrades = pickRandom(upgradeCandidates, upgradeTargetCount);
    passives = upgrades.concat(newPassives);
  }
  game.shop = { hints: hints, passives: passives, type: resolvedType };
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
    if (type === "passive" && item.upgrade) {
      var baseTooltip = def.tooltip ? def.tooltip + " " : "";
      row.title = baseTooltip + "Upgrade to L" + (item.level || 1) + ".";
    } else {
      row.title = def.tooltip || "";
    }
    var info = document.createElement("div");
    info.className = "shop-item__info";
    var name = document.createElement("div");
    name.className = "shop-item__name";
    var nameText = def.label;
    if (type === "passive" && item.upgrade) {
      nameText = "Upgrade: " + def.label;
      if (item.level) {
        nameText += " (L" + item.level + ")";
      }
    }
    name.textContent = nameText;
    var priceRow = document.createElement("div");
    priceRow.className = "shop-item__price";
    var priceIcon = document.createElement("span");
    priceIcon.className = type === "passive" ? "bank-icon" : "coin-icon";
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
    var isSoldOut = item.purchased;
    var currentBalance =
      type === "passive" ? state.bankedCoins || 0 : state.coins || 0;
    var canAfford = item.price <= currentBalance;
    if (isSoldOut) {
      row.classList.add("is-owned");
      button.textContent = "Sold out";
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
      if (isSoldOut) {
        return;
      }
      var activeBalance =
        type === "passive" ? state.bankedCoins || 0 : state.coins || 0;
      if (item.price > activeBalance) {
        row.classList.remove("is-warn");
        void row.offsetWidth;
        row.classList.add("is-warn");
        return;
      }
      if (type === "passive") {
        state.bankedCoins = Math.max(
          0,
          Math.round(state.bankedCoins || 0) - item.price
        );
        persistBankedCoins();
      } else {
        state.coins = (state.coins || 0) - item.price;
      }
      if (type === "hint") {
        game.hints.push(createHintItem(item.id));
        renderHints();
        item.purchased = true;
      } else if (type === "passive") {
        if (item.upgrade) {
          var nextLevel = item.level || 1;
          ensurePassiveLevel(item.id, nextLevel);
          persistPassives();
          renderStartPassives();
          applyPassives();
          renderPassives();
          flashUpgradedItem("passive", item.id);
        } else {
          ensurePassiveLevel(item.id, 1);
          persistPassives();
          renderStartPassives();
          applyPassives();
          renderPassives();
        }
        item.purchased = true;
      }
      if (app.board && app.board.playShopSound) {
        app.board.playShopSound();
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
  var isPassiveShop = game.shop && game.shop.type === "passiveShop";
  if (shopHintSection) {
    shopHintSection.classList.toggle("is-hidden", isPassiveShop);
  }
  if (shopPassiveSection) {
    shopPassiveSection.classList.toggle("is-hidden", !isPassiveShop);
  }
  if (shopHintLabel) {
    shopHintLabel.textContent = "Hints";
  }
  if (shopPassiveLabel) {
    shopPassiveLabel.textContent = isPassiveShop
      ? "Passives & Upgrades"
      : "Passives";
  }
  if (!isPassiveShop) {
    renderShopList(shopHintList, game.shop.hints, HINT_DEFS, "hint");
    if (shopPassiveList) {
      shopPassiveList.textContent = "";
    }
    return;
  }
  renderShopList(shopPassiveList, game.shop.passives, PASSIVE_DEFS, "passive");
  if (shopHintList) {
    shopHintList.textContent = "";
  }
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
  addBankedCoins(amount);
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
  setHintTypeLevel(id, level);
  game.hints.push({ id: id, used: false, level: getHintTypeLevel(id) });
  renderHints();
}

function ensurePassiveLevel(id, level) {
  if (!id || !PASSIVE_DEFS[id]) {
    return null;
  }
  var bounds = getPassiveLevelBounds(id);
  var safeLevel = clampNumber(level, bounds.min, bounds.max);
  var existing = game.passives.find(function (passive) {
    return passive.id === id;
  });
  if (existing) {
    if (safeLevel > existing.level) {
      existing.level = safeLevel;
    }
    return existing;
  }
  var entry = { id: id, level: safeLevel };
  game.passives.push(entry);
  return entry;
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
  ensurePassiveLevel(id, level);
  persistPassives();
  renderStartPassives();
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
    game.challenges = [];
    applyChallenges();
    return;
  }
  if (!CHALLENGE_DEFS[id]) {
    return;
  }
  var level = clampChallengeLevel(
    id,
    adminChallengeLevel ? adminChallengeLevel.value : 1
  );
  game.challenges = [{ id: id, level: level }];
  applyChallenges();
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
    } else if (passive.id === "bigMoney") {
      app.passives.setBigMoneyLevel(passive.level);
      app.passives.setBigMoneyActive(true);
    } else if (passive.id === "shopaholic") {
      app.passives.setShopaholicLevel(passive.level);
      app.passives.setShopaholicActive(true);
    }
  });
}

function applyChallenges() {
  app.challenges.resetChallenges();
  if (!game.challenges || !game.challenges.length) {
    renderChallenges();
    return;
  }
  game.challenges.forEach(function (challenge) {
    var def = CHALLENGE_DEFS[challenge.id];
    if (!def) {
      return;
    }
    if (def.setLevel) {
      def.setLevel(challenge.level);
    }
    def.enable();
  });
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
  var pool = config.passivePool.filter(function (id) {
    return PASSIVE_DEFS[id];
  });
  if (!pool.length) {
    pool = Object.keys(PASSIVE_DEFS);
  }
  game.passives = normalizePassives(game.passives);
  if (!game.passives.length) {
    var passiveIds = pickRandom(pool, Math.max(1, config.passivesPerRun));
    passiveIds.forEach(function (id) {
      ensurePassiveLevel(id, 1);
    });
  }
  persistPassives();
  renderPassives();
  renderStartPassives();
  applyPassives();
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
  if (challengeId === "flip") {
    return "flip";
  }
  if (challengeId === "spotlight") {
    return "spotlight";
  }
  if (challengeId === "spyglass") {
    return "spyglass";
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

function loadProblem(problem, difficultyLabelText) {
  game.blockClicksUntil = Date.now() + 500;
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
  state.lastMistakeEndId = null;
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
  applyChallenges();
  if (state.challengeMystery) {
    state.mysteryStoneKeys = [];
    state.mysteryRevealed = false;
  }
  if (state.challengeEnigma) {
    state.enigmaPoints = [];
    state.enigmaRevealed = false;
  }

  app.board.autoPlayOpponent();
  app.board.updateBoard();
  app.ui.updateHud();
  app.board.evaluatePosition();

  if (difficultyLabel) {
    difficultyLabel.textContent = difficultyLabelText;
  }
  setDifficultyVisible(true);
}

function advanceAfterSolve() {
  game.levelNumber += 1;
  game.currentProblem = null;
  game.isBoss = false;
  game.challenges = [];
  renderChallenges();
  if (
    game.currentNode &&
    (game.currentNode.type === "boss" || game.currentNode.type === "levelBoss")
  ) {
    var bossIndex = game.currentNode.bossIndex || game.bossCount + 1;
    if (bossIndex > game.bossCount) {
      game.bossCount = bossIndex;
    }
  }
}

function getChallengePool(config) {
  return config.challengePool.filter(function (id) {
    return CHALLENGE_DEFS[id];
  });
}

function isComboAllowed(primary, candidate, combos) {
  if (!combos || typeof combos !== "object") {
    return true;
  }
  var listA = combos[primary];
  if (Array.isArray(listA)) {
    if (listA.indexOf("*") !== -1 || listA.indexOf(candidate) !== -1) {
      return false;
    }
  }
  var listB = combos[candidate];
  if (Array.isArray(listB)) {
    if (listB.indexOf("*") !== -1 || listB.indexOf(primary) !== -1) {
      return false;
    }
  }
  return true;
}

function buildBossChallenges(config, mapLevel, count) {
  var pool = getChallengePool(config);
  if (!pool.length || count <= 0) {
    return [];
  }
  var ramp = toNumber(config.challengeLevelRamp, 1);
  if (!Number.isFinite(ramp) || ramp < 0) {
    ramp = 1;
  }
  var start = toNumber(config.challengeLevelStart, 1);
  if (!Number.isFinite(start)) {
    start = 1;
  }
  var levelBase = Math.max(
    1,
    Math.round(start + Math.max(0, toNumber(mapLevel, 1) - 1) * ramp)
  );
  var primary = pool[Math.floor(Math.random() * pool.length)];
  var challenges = [
    { id: primary, level: clampChallengeLevel(primary, levelBase) },
  ];
  if (count === 1) {
    return challenges;
  }
  var combos = config.challengeCombos;
  var secondPool = pool.filter(function (id) {
    return id !== primary && isComboAllowed(primary, id, combos);
  });
  if (!secondPool.length && !combos) {
    secondPool = pool.filter(function (id) {
      return id !== primary;
    });
  }
  if (!secondPool.length) {
    return challenges;
  }
  var secondary = secondPool[Math.floor(Math.random() * secondPool.length)];
  challenges.push({
    id: secondary,
    level: clampChallengeLevel(secondary, levelBase),
  });
  return challenges;
}

function assignBossChallenges(map, config) {
  map.nodes.forEach(function (node) {
    node.challenges = [];
  });
  var bossNodes = map.nodes.filter(function (node) {
    return node.type === "boss" || node.type === "levelBoss";
  });
  bossNodes.sort(function (a, b) {
    if (a.r === b.r) {
      return a.q - b.q;
    }
    return a.r - b.r;
  });
  bossNodes.forEach(function (node, index) {
    var bossIndex = game.bossCount + index + 1;
    node.bossIndex = bossIndex;
    node.challenges = buildBossChallenges(
      config,
      Math.max(1, game.mapIndex || 1),
      node.type === "levelBoss" ? 2 : 1
    );
  });
  logEvent("Boss challenges assigned.", {
    count: bossNodes.length,
    mapIndex: game.mapIndex,
  });
}

function buildMap(config) {
  if (!playMap) {
    return null;
  }
  var mapConfig = config.map;
  var mapLevel = Math.max(1, game.mapIndex || 1);
  var passiveShopMinLevel = Math.max(
    1,
    toNumber(mapConfig.passiveShopMinLevel, 1)
  );
  if (
    mapLevel < passiveShopMinLevel &&
    mapConfig.weights &&
    mapConfig.weights.passiveShop > 0
  ) {
    mapConfig = Object.assign({}, mapConfig, {
      weights: Object.assign({}, mapConfig.weights, { passiveShop: 0 }),
    });
  }
  var map = playMap.createMap(mapConfig, {
    maxAttempts: mapConfig.maxAttempts,
  });
  if (!map) {
    map = playMap.createFallbackMap(config.map.height);
  }
  if (!map) {
    return null;
  }
  assignBossChallenges(map, config);
  logEvent("Map generated.", {
    height: config.map.height,
    maxWidth: config.map.maxWidth,
    allowVoid: config.map.allowVoid,
  });
  return map;
}

function startNewMap() {
  var config = getPlayConfig();
  if (!playMap) {
    return;
  }
  game.mapIndex += 1;
  updateBestRunLevel(game.mapIndex);
  game.map = buildMap(config);
  game.currentNode = null;
  if (!game.map) {
    return;
  }
  playMap.setMap(game.map);
  logEvent("Map ready.", { mapIndex: game.mapIndex });
  showMapOverlay();
}

function showMapOverlay() {
  if (!mapOverlay) {
    return;
  }
  game.levelActive = false;
  setDifficultyVisible(false);
  mapOverlay.classList.remove("is-hidden");
  if (mapLevelLabel) {
    mapLevelLabel.textContent = "Level " + Math.max(1, game.mapIndex || 1);
  }
  hideRetryOverlay();
  hideShopOverlay();
  hideTreasureOverlay();
  hideAdminOverlay();
  if (playMap) {
    if (playMap.setStatus) {
      playMap.setStatus("Choose your next node.");
    }
    playMap.render();
  }
}

function hideMapOverlay() {
  if (mapOverlay) {
    mapOverlay.classList.add("is-hidden");
  }
}

function showCongratsOverlay() {
  if (!levelCongratsOverlay) {
    return;
  }
  if (levelCongratsTitle) {
    levelCongratsTitle.textContent =
      "Level " + Math.max(1, game.mapIndex || 1) + " Unlocked";
  }
  setDifficultyVisible(false);
  levelCongratsOverlay.classList.remove("is-hidden");
  hideMapOverlay();
}

function hideCongratsOverlay() {
  if (levelCongratsOverlay) {
    levelCongratsOverlay.classList.add("is-hidden");
  }
}

function showShopOverlay(shopType) {
  if (!shopOverlay || !shopContinueBtn) {
    showMapOverlay();
    return;
  }
  game.levelActive = false;
  setDifficultyVisible(false);
  var config = getPlayConfig();
  var isPassiveShop = shopType === "passiveShop";
  if (shopTitle) {
    shopTitle.textContent = isPassiveShop ? "Passive Shop" : "Shop";
  }
  if (shopSubtitle) {
    shopSubtitle.textContent = isPassiveShop
      ? "Spend banked coins on passives or upgrades."
      : "Pick an item, then return to the map.";
  }
  shopContinueBtn.textContent = "Back to Map";
  buildShopInventory(config, shopType);
  renderShop();
  shopOverlay.classList.remove("is-hidden");
  hideRetryOverlay();
  hideAdminOverlay();
  hideMapOverlay();
  hideTreasureOverlay();
  logEvent("Shop opened.");
}

function hideShopOverlay() {
  if (shopOverlay) {
    shopOverlay.classList.add("is-hidden");
  }
}

function showTreasureOverlay() {
  if (!treasureOverlay || !treasureList) {
    showMapOverlay();
    return;
  }
  game.levelActive = false;
  setDifficultyVisible(false);
  var options = buildTreasureOptions(getPlayConfig());
  renderTreasureOptions(options);
  treasureOverlay.classList.remove("is-hidden");
  hideRetryOverlay();
  hideAdminOverlay();
  hideShopOverlay();
  hideMapOverlay();
  logEvent("Treasure opened.");
}

function hideTreasureOverlay() {
  if (treasureOverlay) {
    treasureOverlay.classList.add("is-hidden");
  }
}

function randomInt(min, max) {
  var low = Math.min(min, max);
  var high = Math.max(min, max);
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

function buildTreasureHintOption(config) {
  var pool = config.treasure.hintPool.filter(function (id) {
    return HINT_DEFS[id];
  });
  if (!pool.length) {
    pool = Object.keys(HINT_DEFS);
  }
  var hintId = pool[Math.floor(Math.random() * pool.length)];
  var hintDef = HINT_DEFS[hintId];
  var hintItem = createHintItem(hintId);
  var label = hintDef ? hintDef.label : "New Hint";
  return {
    title: label,
    desc: "Gain a random hint.",
    apply: function () {
      game.hints.push(hintItem);
      renderHints();
      logEvent("Treasure claimed: hint.", { hint: hintId, level: hintItem.level });
    },
  };
}

function pickUpgradableHint() {
  if (!Array.isArray(game.hints) || !game.hints.length) {
    return null;
  }
  var seen = new Set();
  var candidates = [];
  game.hints.forEach(function (hint) {
    if (!hint || seen.has(hint.id)) {
      return;
    }
    seen.add(hint.id);
    if (getHintTypeLevel(hint.id) < getHintMaxLevel(hint.id)) {
      candidates.push({ id: hint.id });
    }
  });
  if (!candidates.length) {
    return null;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function buildTreasureUpgradeOption(config) {
  return {
    title: "Upgrade",
    desc: "Level up a hint.",
    apply: function () {
      var hintTarget = pickUpgradableHint();
      if (!hintTarget) {
        buildTreasureHintOption(config).apply();
        return;
      }
      var updatedLevel = setHintTypeLevel(
        hintTarget.id,
        getHintTypeLevel(hintTarget.id) + 1
      );
      renderHints();
      flashUpgradedItem("hint", hintTarget.id);
      logEvent("Treasure claimed: hint upgrade.", {
        hint: hintTarget.id,
        level: updatedLevel,
      });
    },
  };
}

function buildTreasureOptions(config) {
  var coinMin = config.treasure.coinMin;
  var coinMax = config.treasure.coinMax;
  var mapLevel = Math.max(1, game.mapIndex || 1);
  var coinAmount = randomInt(coinMin, coinMax) * mapLevel;
  var coinOption = {
    title: coinAmount + " Coins",
    desc: "Pocket a stash of extra coins.",
    apply: function () {
      state.coins = (state.coins || 0) + coinAmount;
      addBankedCoins(coinAmount);
      app.ui.updateHud();
      updateShopCoins();
      flashCoinAward(coinAmount);
      logEvent("Treasure claimed: coins.", { amount: coinAmount });
    },
  };
  return [
    coinOption,
    buildTreasureHintOption(config),
    buildTreasureUpgradeOption(config),
  ];
}

function renderTreasureOptions(options) {
  if (!treasureList) {
    return;
  }
  treasureList.textContent = "";
  options.forEach(function (option) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "treasure-card";
    var title = document.createElement("div");
    title.className = "treasure-card__title";
    title.textContent = option.title || "Treasure";
    var desc = document.createElement("div");
    desc.className = "treasure-card__desc";
    desc.textContent = option.desc || "";
    button.appendChild(title);
    button.appendChild(desc);
    button.addEventListener("click", function () {
      if (app.board && app.board.playTreasureSound) {
        app.board.playTreasureSound();
      }
      option.apply();
      hideTreasureOverlay();
      showMapOverlay();
    });
    treasureList.appendChild(button);
  });
}

function startEncounterForNode(node) {
  if (!node) {
    return;
  }
  var config = getPlayConfig();
  var pick = pickProblemForNode(node, config);
  if (!pick) {
    showMapOverlay();
    return;
  }
  game.currentNode = node;
  game.currentProblem = pick.problem;
  game.difficulty = pick.difficulty || null;
  game.difficultyLabel = pick.label || "";
  game.levelActive = true;
  game.isBoss = node.type === "boss" || node.type === "levelBoss";
  game.challenges = Array.isArray(node.challenges)
    ? node.challenges.map(function (challenge) {
        return { id: challenge.id, level: challenge.level };
      })
    : [];
  hideMapOverlay();
  hideShopOverlay();
  hideTreasureOverlay();
  hideRetryOverlay();
  clearCoinBurst();
  pruneUsedHints();
  renderHints();
  loadProblem(pick.problem, pick.label);
  logEvent("Encounter started.", {
    type: node.type,
    difficulty: pick.label,
    challenges: game.challenges.map(function (challenge) {
      return challenge.id + " L" + challenge.level;
    }),
  });
}

function handleMapMove(node) {
  if (!node) {
    return;
  }
  game.currentNode = node;
  logEvent("Map move selected.", { type: node.type });
  if (node.type === "shop" || node.type === "passiveShop") {
    showShopOverlay(node.type);
    return;
  }
  if (node.type === "treasure") {
    showTreasureOverlay();
    return;
  }
  if (
    node.type === "problem" ||
    node.type === "boss" ||
    node.type === "levelBoss"
  ) {
    startEncounterForNode(node);
    return;
  }
  showMapOverlay();
  if (playMap && playMap.setStatus) {
    playMap.setStatus("Path is clear. Choose the next hex.");
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
  setDifficultyVisible(false);
  renderStartPassives();
  renderStartBestRun();
  hideMapOverlay();
  hideTreasureOverlay();
  hideShopOverlay();
  hideCongratsOverlay();
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
  setDifficultyVisible(false);
  hideMapOverlay();
  hideTreasureOverlay();
  hideShopOverlay();
  hideCongratsOverlay();
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

function endGame() {
  if (app.board && app.board.playRunFailSound) {
    app.board.playRunFailSound();
  }
  game.started = false;
  game.levelActive = false;
  game.levelNumber = 0;
  game.bossCount = 0;
  game.mapIndex = 0;
  game.difficulty = null;
  game.difficultyLabel = "";
  game.currentProblem = null;
  game.currentNode = null;
  game.map = null;
  game.hints = [];
  game.hintLevels = {};
  game.challenges = [];
  game.shop = { hints: [], passives: [] };
  game.isBoss = false;
  state.coins = 0;
  app.passives.resetPassives();
  app.challenges.resetChallenges();
  app.hints.clearHints();
  renderHints();
  renderPassives();
  renderChallenges();
  app.ui.setStatus("Game over. Start a new run.", "error");
  app.ui.updateHud();
  setDifficultyVisible(false);
  hideRetryOverlay();
  hideMapOverlay();
  hideTreasureOverlay();
  hideShopOverlay();
  hideCongratsOverlay();
  hideAdminOverlay();
  clearCoinBurst();
  showStartOverlay();
  logEvent("Game over.");
}

function startGame() {
  var config = getPlayConfig();
  game.started = true;
  game.levelActive = false;
  game.levelNumber = 1;
  game.bossCount = 0;
  game.mapIndex = 0;
  game.isBoss = false;
  game.shop = { hints: [], passives: [] };
  game.challenges = [];
  game.map = null;
  game.currentNode = null;
  game.difficulty = null;
  game.difficultyLabel = "";
  game.hintLevels = {};
  state.lives = 3;
  state.coins = 0;
  game.maxLives = state.lives;
  app.ui.updateHud();
  setDifficultyVisible(false);
  setupPassives(config);
  setupHints(config);
  hideStartOverlay();
  hideRetryOverlay();
  hideShopOverlay();
  hideTreasureOverlay();
  hideCongratsOverlay();
  hideAdminOverlay();
  clearCoinBurst();
  startNewMap();
  logEvent("Game started.", {
    difficultyRange: formatDifficultyRange(
      getDifficultyRangeForLevel(config, 1)
    ),
  });
}

if (startGameBtn) {
  startGameBtn.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    startGame();
  });
}

if (resetStateBtn) {
  resetStateBtn.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    var confirmMessage =
      "Reset state? This clears all saved passives, banked coins, and your " +
      "best run. Starting a new game will grant one random passive again.";
    if (!window.confirm(confirmMessage)) {
      return;
    }
    game.passives = [];
    persistPassives();
    state.bankedCoins = 0;
    persistBankedCoins();
    game.bestRunLevel = 0;
    persistBestRunLevel();
    if (app.passives && app.passives.resetPassives) {
      app.passives.resetPassives();
    }
    renderPassives();
    renderStartPassives();
    renderStartBestRun();
    app.ui.updateHud();
    logEvent("State reset.");
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

if (levelCongratsBtn) {
  levelCongratsBtn.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    hideCongratsOverlay();
    showMapOverlay();
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
    showMapOverlay();
  });
}

if (shopContinueBtn) {
  shopContinueBtn.addEventListener("click", function (event) {
    if (event) {
      event.stopPropagation();
    }
    hideShopOverlay();
    showMapOverlay();
    logEvent("Shop closed.");
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
    setDifficultyVisible(true);
    game.blockClicksUntil = Date.now() + 500;
    app.board.resetPuzzle();
    applyPassives();
    applyChallenges();
    renderHints();
    app.board.updateBoard();
    app.board.evaluatePosition();
    logEvent("Retry puzzle.");
  });
}

if (app.elements.mount) {
  app.elements.mount.addEventListener("click", function (event) {
    if (!game.started || !game.levelActive) {
      return;
    }
    if (
      (mapOverlay && !mapOverlay.classList.contains("is-hidden")) ||
      (shopOverlay && !shopOverlay.classList.contains("is-hidden")) ||
      (treasureOverlay && !treasureOverlay.classList.contains("is-hidden")) ||
      (startOverlay && !startOverlay.classList.contains("is-hidden")) ||
      (retryOverlay && !retryOverlay.classList.contains("is-hidden")) ||
      (levelCongratsOverlay &&
        !levelCongratsOverlay.classList.contains("is-hidden")) ||
      (adminOverlay && !adminOverlay.classList.contains("is-hidden"))
    ) {
      return;
    }
    if (Date.now() < (game.blockClicksUntil || 0)) {
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

document.addEventListener(
  "pointerdown",
  function () {
    dismissCoinBurst();
  },
  true
);

document.addEventListener("keydown", function (event) {
  dismissCoinBurst();
  if (event.target && event.target.tagName === "SELECT") {
    return;
  }
  var shopVisible = shopOverlay && !shopOverlay.classList.contains("is-hidden");
  if (!shopVisible) {
    return;
  }
  var key = event.key;
  if (key === " " || key === "Enter" || key === "n" || key === "N") {
    event.preventDefault();
    if (shopContinueBtn) {
      shopContinueBtn.click();
    }
  }
});

if (playMapCanvas) {
  playMap = createPlayMap({
    canvas: playMapCanvas,
    status: mapStatus,
    infoTitle: playMapInfoTitle,
    infoDesc: playMapInfoDesc,
    infoHint: playMapInfoHint,
    overlay: mapOverlay,
    onMove: handleMapMove,
  });
}

initAdminPanel();
app.ui.updateHud();
renderPassives();
renderStartPassives();
renderStartBestRun();

function getCoinAwardBreakdown() {
  var config = getPlayConfig();
  var steps = Math.max(0, game.levelNumber - 1) * config.difficultyStep;
  var base = config.coins.base + steps * config.coins.perDifficulty;
  if (!Number.isFinite(base)) {
    base = 0;
  }
  base = Math.max(0, base);
  var bonus = 0;
  if (game.isBoss) {
    bonus = config.coins.bossBonus;
    if (game.currentNode && game.currentNode.type === "levelBoss") {
      bonus *= config.coins.levelBossBonusMultiplier;
    }
  }
  if (!Number.isFinite(bonus)) {
    bonus = 0;
  }
  var challengeMultiplier = 1;
  if (base > 0) {
    challengeMultiplier = (base + bonus) / base;
    if (!Number.isFinite(challengeMultiplier) || challengeMultiplier <= 0) {
      challengeMultiplier = 1;
    }
  }
  var bigMoneyMultiplier =
    app.passives && app.passives.getBigMoneyMultiplier
      ? app.passives.getBigMoneyMultiplier()
      : 1;
  var bigMoneyActive = !!state.passiveBigMoney;
  if (!Number.isFinite(bigMoneyMultiplier) || bigMoneyMultiplier <= 0) {
    bigMoneyMultiplier = 1;
  }
  var speedMark =
    app.board && app.board.getSpeedSolveMark
      ? app.board.getSpeedSolveMark()
      : null;
  var speedMultiplier = 1;
  var speedLabel = "";
  if (speedMark === "speed-play") {
    speedMultiplier = config.coins.speedPlayMultiplier;
    speedLabel = "Speed Play";
  } else if (speedMark === "speed-solve") {
    speedMultiplier = config.coins.speedSolveMultiplier;
    speedLabel = "Speed Solve";
  }
  if (!Number.isFinite(speedMultiplier) || speedMultiplier <= 0) {
    speedMultiplier = 1;
  }
  var speedActive = !!speedLabel && speedMultiplier > 1;
  var total = base * challengeMultiplier * bigMoneyMultiplier * speedMultiplier;
  if (!Number.isFinite(total)) {
    total = base;
  }
  total = Math.max(0, total);
  return {
    base: base,
    total: total,
    challengeMultiplier: challengeMultiplier,
    bigMoneyMultiplier: bigMoneyMultiplier,
    bigMoneyActive: bigMoneyActive,
    speedMultiplier: speedMultiplier,
    speedLabel: speedLabel,
    speedActive: speedActive,
  };
}

function formatMultiplier(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "1x";
  }
  var rounded = Math.round(value * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 0.01) {
    return Math.round(rounded) + "x";
  }
  if (Math.abs(rounded * 10 - Math.round(rounded * 10)) < 0.01) {
    return rounded.toFixed(1) + "x";
  }
  return rounded.toFixed(2) + "x";
}

function formatMultiplierTenths(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "1x";
  }
  var truncated = Math.floor(value * 10) / 10;
  if (Math.abs(truncated - Math.round(truncated)) < 0.01) {
    return Math.round(truncated) + "x";
  }
  return truncated.toFixed(1) + "x";
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
  var challengeText = formatMultiplierTenths(breakdown.challengeMultiplier);
  var bigMoneyText = formatMultiplier(breakdown.bigMoneyMultiplier);
  var bigMoneyActive = !!breakdown.bigMoneyActive;
  var speedText = formatMultiplier(breakdown.speedMultiplier);
  var speedLabel = breakdown.speedLabel || "";
  var speedActive = !!breakdown.speedActive;

  var grid = document.createElement("div");
  grid.className = "coin-burst__grid";

  function addSlot(value, label, type, placeholder, extraClass) {
    var slot = document.createElement("div");
    slot.className = "coin-burst__slot";
    if (type) {
      slot.classList.add("coin-burst__slot--" + type);
    }
    if (extraClass) {
      slot.classList.add(extraClass);
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
  addSlot(challengeText, "Challenge", "multiplier");
  if (bigMoneyActive) {
    addSlot(bigMoneyText, "Big Money", "multiplier");
  } else {
    addSlot("", "", "multiplier", true);
  }
  if (speedActive) {
    var speedClass =
      speedLabel === "Speed Solve" ? "coin-burst__slot--speed-solve" : "";
    addSlot(speedText, speedLabel, "multiplier", false, speedClass);
  } else {
    addSlot("", "", "multiplier", true);
  }
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

function dismissCoinBurst() {
  if (!coinBurst || !coinBurst.classList.contains("is-active")) {
    return false;
  }
  clearCoinBurst();
  logEvent("Coin panel dismissed.");
  return true;
}

function flashCoinAward(amount) {
  var value = Math.round(amount || 0);
  if (value <= 0) {
    return;
  }
  renderCoinBurst({
    base: value,
    total: value,
    challengeMultiplier: 1,
    bigMoneyMultiplier: 1,
    bigMoneyActive: false,
    speedMultiplier: 1,
    speedLabel: "",
    speedActive: false,
  });
}

function awardCoins() {
  var breakdown = getCoinAwardBreakdown();
  var award = Math.round(breakdown.total);
  if (award <= 0) {
    return;
  }
  state.coins = (state.coins || 0) + award;
  addBankedCoins(award);
  app.ui.updateHud();
  updateShopCoins();
  if (shopOverlay && !shopOverlay.classList.contains("is-hidden")) {
    renderShop();
  }
  renderCoinBurst(breakdown);
  logEvent("Coins awarded.", {
    amount: award,
    total: Math.round(state.coins || 0),
  });
}
