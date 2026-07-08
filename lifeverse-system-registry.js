(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  function systems() {
    return [
      game.careerSystem,
      game.educationSystem,
      game.financeSystem,
      game.housingSystem,
      game.transportationSystem,
      game.relationshipSystem,
      game.healthSystem,
      game.mentalWellbeingSystem,
      game.economySystem,
      game.npcSimulationSystem,
      game.worldSimulationSystem,
      game.progressionSystem
    ].filter(Boolean);
  }

  function getSystem(systemId) {
    return systems().find((system) => system.id === systemId) || null;
  }

  function getSystemAction(systemId, actionId) {
    const system = getSystem(systemId);
    if (!system) return null;
    return (system.actions || []).find((action) => action.id === actionId) || null;
  }

  function performSystemAction(state, systemId, actionId) {
    const system = getSystem(systemId);
    const action = getSystemAction(systemId, actionId);
    if (!system || !action) return { error: "System action not found." };
    if (typeof action.canPerform === "function") {
      const allowed = action.canPerform(state);
      if (allowed !== true) return { error: typeof allowed === "string" ? allowed : "Action is not available yet." };
    }

    const before = game.getTimeSnapshot ? game.getTimeSnapshot(state) : { stamp: "" };
    if (game.decayNeeds) game.decayNeeds(state, action.durationMinutes || 30);
    if (game.advanceMinutes) game.advanceMinutes(state, action.durationMinutes || 30, action.title);
    if (game.applyEffects) {
      const systemEffects = { ...(action.effects || {}) };
      delete systemEffects.skills;
      delete systemEffects.habits;
      delete systemEffects.capability;
      game.applyEffects(state, systemEffects);
    }
    if (game.applyPlayerEffects) {
      game.applyPlayerEffects(state, {
        title: action.title,
        effects: action.effects || {},
        memory: action.consequence
      });
    }
    if (typeof action.after === "function") action.after(state, action);
    if (game.updateProgressionFromDecision) {
      game.updateProgressionFromDecision(state, action, { systemId: system.id, systemTitle: system.title });
    }

    const after = game.getTimeSnapshot ? game.getTimeSnapshot(state) : { stamp: "" };
    const scheduleEntry = {
      id: `sys-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      activityId: `${system.id}:${action.id}`,
      title: action.title,
      category: system.title,
      location: system.id,
      start: before.stamp,
      end: after.stamp,
      durationMinutes: action.durationMinutes || 30
    };
    state.schedule = [...(state.schedule || []), scheduleEntry].slice(-40);

    const event = game.addEvent(state, {
      type: system.id,
      title: action.title,
      summary: action.consequence,
      systems: action.systems || [
        system.title,
        "Time",
        "Needs",
        "Activities",
        "Career",
        "Education",
        "Finance",
        "Housing",
        "Transportation",
        "Fast Forward",
        "Life Report"
      ],
      consequences: decisionConsequences(state, action),
      reflection: action.reflection,
      occurredAt: after.stamp
    });
    return { state, system, action, event, scheduleEntry };
  }

  function decisionConsequences(state, action) {
    const effects = action.effects || {};
    const items = [`Used ${game.durationLabel ? game.durationLabel(action.durationMinutes || 30) : `${action.durationMinutes || 30} minutes`}.`];
    if (effects.finance && Number(effects.finance.money)) items.push(`Money ${Number(effects.finance.money) > 0 ? "+" : ""}${effects.finance.money}.`);
    if (effects.needs && Number(effects.needs.stress)) items.push(`Stress ${Number(effects.needs.stress) > 0 ? "+" : ""}${effects.needs.stress}.`);
    if (effects.career) items.push(`Career readiness is now ${state.career.readiness}/100.`);
    if (effects.education) items.push(`Education progress is now ${state.education.qualificationProgress}/100.`);
    if (effects.housing) items.push(`Housing comfort is now ${state.housing.comfort}/100.`);
    if (effects.transportation) items.push(`Commute stress is now ${state.transportation.commuteStress}/100.`);
    if (effects.relationships) items.push(`Relationship support is now ${state.relationships.support}/100.`);
    if (effects.health) items.push(`Physical health is now ${state.health.physical}/100.`);
    if (effects.mentalWellbeing) items.push(`Mental wellbeing index is now ${state.mentalWellbeing.index}/100.`);
    if (effects.economy) items.push(`Cost of living pressure is now ${state.economy.costOfLivingIndex}/100.`);
    if (effects.npcSimulation) items.push(`Community trust is now ${state.npcSimulation.communityTrust}/100.`);
    if (effects.worldSimulation) items.push(`World economy climate is ${state.worldSimulation.economyClimate}.`);
    if (effects.progression || game.progressionSystem) items.push(`Life level is ${state.progression.lifeLevel} with ${state.progression.lifeXp} XP.`);
    return items;
  }

  game.systems = systems;
  game.getSystem = getSystem;
  game.getSystemAction = getSystemAction;
  game.performSystemAction = performSystemAction;
})();
