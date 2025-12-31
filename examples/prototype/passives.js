import { app } from "./context.js";

var state = app.state;
var elements = app.elements;

function updateTimeExtendLevelUI() {
  if (elements.timeExtendLevelInput) {
    elements.timeExtendLevelInput.value = String(state.timeExtendLevel);
  }
  if (elements.timeExtendLevelValue) {
    elements.timeExtendLevelValue.textContent = String(state.timeExtendLevel);
  }
  if (app.timers && app.timers.updateMysteryButtonLabel) {
    app.timers.updateMysteryButtonLabel();
  }
  if (app.timers && app.timers.updateEnigmaButtonLabel) {
    app.timers.updateEnigmaButtonLabel();
  }
}

function setTimeExtendLevel(level) {
  var nextLevel = Math.max(1, Math.min(10, Number(level) || 1));
  state.timeExtendLevel = nextLevel;
  updateTimeExtendLevelUI();
}

function getTimeExtendMultiplier() {
  if (!state.passiveTimeExtend) {
    return 1;
  }
  var safeLevel = Math.max(1, Number(state.timeExtendLevel) || 1);
  return 1 + safeLevel * 0.1;
}

function updatePassiveControls() {
  if (elements.passiveTimeExtendBtn) {
    if (state.passiveTimeExtend) {
      elements.passiveTimeExtendBtn.classList.add("active");
      elements.passiveTimeExtendBtn.disabled = true;
    } else {
      elements.passiveTimeExtendBtn.classList.remove("active");
      elements.passiveTimeExtendBtn.disabled = false;
    }
  }
}

function setTimeExtendActive(active) {
  state.passiveTimeExtend = active;
  updatePassiveControls();
  updateTimeExtendLevelUI();
}

function resetPassives() {
  state.passiveTimeExtend = false;
  updatePassiveControls();
  updateTimeExtendLevelUI();
}

app.passives.updateTimeExtendLevelUI = updateTimeExtendLevelUI;
app.passives.setTimeExtendLevel = setTimeExtendLevel;
app.passives.getTimeExtendMultiplier = getTimeExtendMultiplier;
app.passives.updatePassiveControls = updatePassiveControls;
app.passives.setTimeExtendActive = setTimeExtendActive;
app.passives.resetPassives = resetPassives;
