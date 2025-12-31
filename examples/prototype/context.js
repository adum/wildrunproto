export const GB = window.ghostban;

export const sgfSources = {
  "27k":
    "(;AB[ca]AB[cb]AB[db]AB[ec]AB[fc]AB[gb]AB[hb]AB[ha]AW[bb]AW[bc]AW[cc]AW[dc]AW[ed]AW[fd]AW[gc]AW[hc]AW[ic]AW[ib]AW[ea]AP[goproblems](;B[fa];W[eb];B[fb]C[RIGHT])(;B[eb];W[fa]C[])(;B[fb](;W[fa]C[CHOICE])(;W[eb];B[fa];W[ba];B[da])))",
  "23k":
    "(;FF[4]GM[1]CA[UTF-8]AP[goproblems:0.1.0]SZ[19]ST[0]AW[fs][fr][hr][ir][jr][is][ls][lr][mr][nr]AB[or][oq][nq][mq][lq][ks][jq][iq][hq][fq][eq][er][gs][ds][ko][go](;W[kr](;B[ns];W[gr]C[RIGHT])(;B[gr];W[ns]C[RIGHT]))(;W[ns];B[kr])(;W[gr];B[kr])(;W[kq];B[gr]))",
  "17k":
    "(;FF[4]GM[1]CA[UTF-8]AP[goproblems:0.1.0]SZ[19]ST[0]AB[jr][jq][iq][hq][gq][fq][ko][lp][lq]AW[fr][gr][hr][ir][eq][ep][jp][kp][lo][mp][mq][nq][oq][hl][gl][fl][en][eo][ik][jk]TR[jp]TR[kp](;B[jo];W[ip](;B[ho];W[kq](;B[lr];W[io](;B[in];W[jn];B[kn];W[hn];B[im];W[hp];B[go]C[RIGHT])(;B[kr];W[in]))(;B[kr];W[lr]))(;B[io];W[hp](;B[go];W[kq](;B[lr];W[ho];B[hn];W[in](;B[gp]C[RIGHT])(;B[kr]C[RIGHT])(;B[jn];W[gn];B[im];W[gp]))(;B[kr];W[lr]))(;B[ho];W[gp])(;B[gp];W[ho])))(;B[kq];W[jo])(;B[io];W[jo])(;B[lr];W[jo])(;B[ip];W[jo])(;B[ho];W[jo]))",
  "4k":
    "(;FF[4]GM[1]CA[UTF-8]AP[goproblems:0.1.0]SZ[19]ST[0]AB[bs][cr][dr][er][eq][ep][do][co][cn][bn][bl][fq]AW[br][ar][bp][bo][cp][dp][dq][eo][fo][fp][gp][gq][gr]LB[ar:1](;B[bq];W[cq](;B[ao];W[aq](;B[an];W[ap](;B[cs]C[RIGHT])(;B[fr];W[cs];B[ds];W[fs]))(;B[cs];W[fr];B[an]C[RIGHT]))(;B[an];W[aq];B[ao]C[RIGHT])(;B[aq];W[ap]))(;B[cq];W[bq];B[cs];W[es])(;B[ao];W[ap](;B[bq];W[an])(;B[an];W[bq]))(;B[aq];W[bq])(;B[ap];W[bq];B[ao];W[fr])(;B[cs];W[bq](;B[ao];W[ap])(;B[ap];W[ao])))",
};

export const elements = {
  mount: document.getElementById("board"),
  statusEl: document.getElementById("status"),
  logEl: document.getElementById("log"),
  livesEl: document.getElementById("lives"),
  livesBoxEl: document.getElementById("livesBox"),
  comboEl: document.getElementById("combo"),
  sgfSelect: document.getElementById("sgfSelect"),
  hintOneBtn: document.getElementById("hintOne"),
  hintTwoBtn: document.getElementById("hintTwo"),
  hintNeighborBtn: document.getElementById("hintNeighbor"),
  hintRowBtn: document.getElementById("hintRow"),
  hintColBtn: document.getElementById("hintCol"),
  hintDiagBtn: document.getElementById("hintDiag"),
  hintRowLevelInput: document.getElementById("hintRowLevel"),
  hintRowLevelValue: document.getElementById("hintRowLevelValue"),
  hintColLevelInput: document.getElementById("hintColLevel"),
  hintColLevelValue: document.getElementById("hintColLevelValue"),
  hintDiagLevelInput: document.getElementById("hintDiagLevel"),
  hintDiagLevelValue: document.getElementById("hintDiagLevelValue"),
  challengeGrayBtn: document.getElementById("challengeGray"),
  challengeGhostBtn: document.getElementById("challengeGhost"),
  challengeMysteryBtn: document.getElementById("challengeMystery"),
  challengeEnigmaBtn: document.getElementById("challengeEnigma"),
  challengeInfectionBtn: document.getElementById("challengeInfection"),
  challengeSpeedBtn: document.getElementById("challengeSpeed"),
  ghostLevelInput: document.getElementById("ghostLevel"),
  ghostLevelValue: document.getElementById("ghostLevelValue"),
  mysteryLevelInput: document.getElementById("mysteryLevel"),
  mysteryLevelValue: document.getElementById("mysteryLevelValue"),
  enigmaLevelInput: document.getElementById("enigmaLevel"),
  enigmaLevelValue: document.getElementById("enigmaLevelValue"),
  infectionLevelInput: document.getElementById("infectionLevel"),
  infectionLevelValue: document.getElementById("infectionLevelValue"),
  speedLevelInput: document.getElementById("speedLevel"),
  speedLevelValue: document.getElementById("speedLevelValue"),
  elimRandomBtn: document.getElementById("elimRandom"),
  elimRandomLevelInput: document.getElementById("elimRandomLevel"),
  elimRandomLevelValue: document.getElementById("elimRandomLevelValue"),
  clearHintsBtn: document.getElementById("clearHints"),
  resetPuzzleBtn: document.getElementById("resetPuzzle"),
  resetLivesBtn: document.getElementById("resetLives"),
};

export const refs = {
  board: null,
  rowHintEl: null,
  colHintEl: null,
  diagHintEl: null,
  grayCanvas: null,
  ghostCanvas: null,
  enigmaCanvas: null,
  mysteryBtn: null,
  mysteryTimerEl: null,
  enigmaBtn: null,
  enigmaTimerEl: null,
  speedTimerEl: null,
  ghostAnimId: null,
};

export const state = {
  sgfKey: "27k",
  rootNode: null,
  currentNode: null,
  playerColor: GB ? GB.Ki.Black : 1,
  lives: 3,
  combo: 0,
  lastLives: null,
  blockedMoves: new Set(),
  hintMoves: { correct: [], wrong: [] },
  hintNeighborStones: [],
  hintRow: null,
  hintCol: null,
  hintDiag: null,
  hintRowLevel: 1,
  hintColLevel: 1,
  hintDiagLevel: 1,
  elimRandomLevel: 1,
  challengeGray: false,
  grayStones: new Set(),
  challengeGhost: false,
  ghostStones: new Set(),
  ghostFlashes: [],
  ghostLevel: 1,
  ghostRevealUntil: 0,
  challengeMystery: false,
  mysteryStoneKeys: [],
  mysteryRevealed: false,
  mysteryTimerActive: false,
  mysteryTimerEndsAt: 0,
  mysteryTimerId: null,
  mysteryLevel: 1,
  challengeEnigma: false,
  enigmaPoints: [],
  enigmaRevealed: false,
  enigmaTimerActive: false,
  enigmaTimerEndsAt: 0,
  enigmaTimerId: null,
  enigmaLevel: 1,
  challengeInfection: false,
  infectionPoints: new Set(),
  infectionLevel: 1,
  challengeSpeed: false,
  speedLevel: 1,
  speedMoveCount: 0,
  speedTimerActive: false,
  speedTimerEndsAt: 0,
  speedTimerId: null,
  currentMat: null,
  hintMode: "none",
  extraAllowedMoves: new Set(),
  lastNodeId: null,
  childMoves: [],
  childMoveMap: new Map(),
};

export const handlers = {
  onTimerExpired: null,
};

export function logMessage(message) {
  var logEl = elements.logEl;
  if (!logEl) {
    return;
  }
  var item = document.createElement("div");
  item.className = "log-item";
  item.textContent = message;
  logEl.prepend(item);
  while (logEl.childNodes.length > 12) {
    logEl.removeChild(logEl.lastChild);
  }
}

export function setStatus(text, tone) {
  var statusEl = elements.statusEl;
  if (!statusEl) {
    return;
  }
  statusEl.textContent = text;
  statusEl.classList.remove("success", "error");
  if (tone === "success") {
    statusEl.classList.add("success");
  } else if (tone === "error") {
    statusEl.classList.add("error");
  }
}

export function flashLivesBox() {
  var livesBoxEl = elements.livesBoxEl;
  if (!livesBoxEl) {
    return;
  }
  livesBoxEl.classList.remove("is-flashing");
  void livesBoxEl.offsetWidth;
  livesBoxEl.classList.add("is-flashing");
}

export function renderLivesHearts() {
  var livesEl = elements.livesEl;
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

export function updateHud() {
  var comboEl = elements.comboEl;
  var shouldFlash = state.lastLives !== null && state.lives < state.lastLives;
  renderLivesHearts();
  if (comboEl) {
    comboEl.textContent = String(state.combo);
  }
  state.lastLives = state.lives;
  if (shouldFlash) {
    flashLivesBox();
  }
}

export function sgfToIndex(coord) {
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

export function sgfToA1(coord) {
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

export function getTurn(node, firstTurn) {
  if (!node || node.model.moveProps.length === 0) {
    return firstTurn;
  }
  var lastColor = GB.getMoveColor(node, firstTurn);
  return lastColor === GB.Ki.Black ? GB.Ki.White : GB.Ki.Black;
}

export function colorName(ki) {
  return ki === GB.Ki.Black ? "Black" : "White";
}

export const app = {
  GB: GB,
  sgfSources: sgfSources,
  elements: elements,
  refs: refs,
  state: state,
  handlers: handlers,
  ui: {
    logMessage: logMessage,
    setStatus: setStatus,
    flashLivesBox: flashLivesBox,
    renderLivesHearts: renderLivesHearts,
    updateHud: updateHud,
  },
  utils: {
    sgfToIndex: sgfToIndex,
    sgfToA1: sgfToA1,
    getTurn: getTurn,
    colorName: colorName,
  },
  ghost: {},
  overlays: {},
  timers: {},
  challenges: {},
  hints: {},
  board: {},
};
