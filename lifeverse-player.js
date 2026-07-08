(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  function addToMap(map, delta = {}) {
    Object.entries(delta).forEach(([key, value]) => {
      if (typeof map[key] === "number") {
        map[key] = game.clamp(map[key] + Number(value || 0));
      }
    });
  }

  function applyPlayerEffects(state, activity) {
    const effects = activity.effects || {};
    addToMap(state.player.skills, effects.skills || {});
    addToMap(state.player.habits, effects.habits || {});
    addToMap(state.player.capability, effects.capability || {});

    const capabilityValues = Object.values(state.player.capability);
    const habitValues = Object.values(state.player.habits);
    state.progression.independenceIndex = game.clamp(Math.round(
      capabilityValues.reduce((sum, value) => sum + value, 0) / capabilityValues.length * 0.7 +
      habitValues.reduce((sum, value) => sum + value, 0) / habitValues.length * 0.3
    ));

    const stress = state.needs.stress;
    const energy = state.needs.energy;
    state.player.emotionalState = stress > 75 ? "Overloaded" : energy < 35 ? "Drained" : state.mentalWellbeing.motivation > 68 ? "Motivated" : "Steady";
    state.player.memory = [
      ...(state.player.memory || []),
      {
        title: activity.title,
        note: activity.memory || activity.consequence || "A daily choice shaped your routine.",
        at: game.getTimeSnapshot ? game.getTimeSnapshot(state).stamp : ""
      }
    ].slice(-40);
  }

  function playerSummary(state) {
    return {
      name: state.player.name,
      status: state.player.status,
      emotionalState: state.player.emotionalState,
      independence: state.progression.independenceIndex,
      strongestSkill: Object.entries(state.player.skills).sort((a, b) => b[1] - a[1])[0],
      strongestHabit: Object.entries(state.player.habits).sort((a, b) => b[1] - a[1])[0]
    };
  }

  game.applyPlayerEffects = applyPlayerEffects;
  game.playerSummary = playerSummary;
})();
