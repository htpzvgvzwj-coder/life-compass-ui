(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  // Everyday boundary-crossing behaviour (fare-dodging, shoplifting,
  // drink-driving, fudging taxes) with probabilistic, accumulating
  // consequences - not a guaranteed catch every time, but risk that builds
  // and eventually catches up. Deliberately scoped to minor, relatable
  // "youth might actually be tempted by this" choices, not violent/serious
  // crime, per the app owner's explicit scope call. The whole point of this
  // system is to make reckless choices feel consequential, so every call to
  // resolveRiskyChoice narrates through the same dynamic consequence
  // pipeline the rest of LifeVerse uses (game.addEvent), never a silent
  // stat change.

  const HEAT_DECAY_PER_HOUR = 0.25;

  function decayLegalHeat(state, hours) {
    if (!state.legal) return;
    const safeHours = Math.max(0, Number(hours || 0));
    state.legal.heat = game.clamp(Number(state.legal.heat || 0) - safeHours * HEAT_DECAY_PER_HOUR);
  }

  // Shared resolver every risky-choice activity/action calls from its
  // `after(state)` hook. Catch chance rises with accumulated heat (repeated
  // risky behaviour makes the next one more likely to catch up with you),
  // using the same deterministic seeded-roll style as the stock-growth
  // variance and layoff roll in lifeverse-fast-forward.js.
  function resolveRiskyChoice(state, options = {}) {
    const {
      id = "risky-choice",
      title = "A risky choice",
      heatGain = 12,
      baseCatchChance = 0.12,
      heatToChanceFactor = 0.007,
      seedSalt = 1
    } = options;

    const heatBefore = game.clamp(Number(state.legal.heat || 0));
    const catchChance = Math.min(0.85, baseCatchChance + heatBefore * heatToChanceFactor);
    const seed = Math.sin(state.time.day * 17.31 + seedSalt * 91.7 + heatBefore * 3.3) * 10000;
    const roll = seed - Math.floor(seed);
    const caught = roll < catchChance;

    state.legal.heat = game.clamp(heatBefore + heatGain);

    let tier = "none";
    const consequences = [];
    if (caught) {
      tier = heatBefore >= 65 ? "detention" : heatBefore >= 30 ? "community-service" : "fine";
      if (tier === "fine") {
        const fine = 60 + Math.round(heatBefore * 2);
        state.finance.money = Math.max(0, Math.round(state.finance.money - fine));
        state.legal.finesOwed = Math.max(0, Math.round(Number(state.legal.finesOwed || 0) + fine));
        consequences.push(`Caught. Fined $${fine}.`);
      } else if (tier === "community-service") {
        state.needs.energy = game.clamp(state.needs.energy - 15);
        state.needs.stress = game.clamp(state.needs.stress + 10);
        state.career.readiness = game.clamp(state.career.readiness - 3);
        consequences.push("Caught. Ordered to community service - it cost real time, energy, and some career momentum.");
      } else {
        const detentionDays = 3 + Math.round(heatBefore / 20);
        state.legal.detentionUntilDay = state.time.day + detentionDays;
        state.legal.record = true;
        state.career.readiness = game.clamp(state.career.readiness - 15);
        state.relationships.trust = game.clamp(state.relationships.trust - 10);
        state.relationships.support = game.clamp(state.relationships.support - 6);
        consequences.push(`Caught. Detained for ${detentionDays} days - normal activities are on hold until then, and you now have a record that will make job applications harder.`);
      }
      state.legal.heat = game.clamp(state.legal.heat - 25);
    } else {
      consequences.push("Not caught this time - but the risk didn't go anywhere, and it's higher for the next one.");
    }

    state.legal.incidents = [...(state.legal.incidents || []), {
      id: `legal-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      choiceId: id,
      title,
      day: state.time.day,
      caught,
      tier
    }].slice(-20);

    if (game.addEvent) {
      game.addEvent(state, {
        type: "legal",
        title,
        summary: caught ? "You got caught." : "You got away with it - this time.",
        systems: ["Legal"],
        consequences,
        reflection: caught
          ? "What would you do differently if you could rewind this choice?"
          : "Is getting away with it the same thing as it being okay?"
      });
    }

    return { caught, tier, heatAfter: state.legal.heat };
  }

  // Used by lifeverse-career.js's apply-entry-role formula so a criminal
  // record has a real, felt effect on job prospects - not a separate career
  // system, just one additional term in the existing chance calculation.
  function legalRecordPenalty(state) {
    return state.legal && state.legal.record ? -20 : 0;
  }

  function isInDetention(state) {
    return Boolean(state.legal) && state.time.day < Number(state.legal.detentionUntilDay || 0);
  }

  game.legalSystem = {
    id: "legal",
    title: "Legal",
    chapter: "Chapter 21",
    summary(state) {
      if (state.legal.record) return `You have a record. Risk level ${state.legal.heat}/100.`;
      return `No record. Risk level ${state.legal.heat}/100, $${state.legal.finesOwed} in fines paid so far.`;
    },
    metrics(state) {
      return [
        ["Risk level", state.legal.heat],
        ["Fines paid", state.legal.finesOwed],
        ["Has a record", state.legal.record ? "Yes" : "No"],
        ["Detention ends", state.legal.detentionUntilDay > state.time.day ? `Day ${state.legal.detentionUntilDay}` : "Not detained"]
      ];
    },
    actions: []
  };

  game.resolveRiskyChoice = resolveRiskyChoice;
  game.decayLegalHeat = decayLegalHeat;
  game.legalRecordPenalty = legalRecordPenalty;
  game.isInDetention = isInDetention;
})();
