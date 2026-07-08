(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  function applyDelta(target, delta = {}) {
    Object.entries(delta).forEach(([key, value]) => {
      if (typeof target[key] === "number") {
        target[key] = game.clamp(target[key] + Number(value || 0));
      }
    });
  }

  function decayNeeds(state, minutes) {
    const hours = Math.max(0, Number(minutes || 0) / 60);
    applyDelta(state.needs, {
      energy: -hours * 2.1,
      hunger: -hours * 2.8,
      sleep: -hours * 1.5,
      hygiene: -hours * 0.9,
      stress: hours * 0.55
    });
    if (state.needs.energy < 35) state.needs.stress = game.clamp(state.needs.stress + 2);
    if (state.needs.hunger < 30) state.needs.energy = game.clamp(state.needs.energy - 2);
    return state.needs;
  }

  function applyNeedEffects(state, effects = {}) {
    applyDelta(state.needs, effects.needs || {});
    applyDelta(state.health, effects.health || {});
    applyDelta(state.mentalWellbeing, effects.mentalWellbeing || {});
    applyDelta(state.relationships, effects.relationships || {});
    state.mentalWellbeing.index = game.clamp(
      Math.round((state.needs.purpose + state.mentalWellbeing.motivation + state.mentalWellbeing.resilience + (100 - state.needs.stress)) / 4)
    );
    state.mentalWellbeing.burnoutRisk = game.clamp(Math.round((state.needs.stress + state.career.burnoutRisk + (100 - state.needs.energy)) / 3));
  }

  function lowestNeed(state) {
    return game.NEED_KEYS
      .map((key) => ({ key, value: Number(state.needs[key] || 0) }))
      .sort((a, b) => a.value - b.value)[0];
  }

  function needLabel(key) {
    return String(key || "").replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
  }

  function needsSummary(state) {
    const low = lowestNeed(state);
    if (!low) return "Needs are stable.";
    if (low.key === "stress") {
      return state.needs.stress > 70 ? "Stress is becoming the main pressure today." : "Stress is manageable for now.";
    }
    if (low.value < 35) return `${needLabel(low.key)} needs attention before the day gets harder.`;
    return `${needLabel(low.key)} is the next need to watch.`;
  }

  game.decayNeeds = decayNeeds;
  game.applyNeedEffects = applyNeedEffects;
  game.needsSummary = needsSummary;
  game.needLabel = needLabel;
})();
