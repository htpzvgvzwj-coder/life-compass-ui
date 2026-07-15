(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  const activities = [
    {
      id: "morning-routine",
      title: "Morning routine",
      category: "Living",
      location: "home",
      durationMinutes: 45,
      effects: {
        needs: { energy: 4, hygiene: 18, stress: -4, purpose: 2 },
        capability: { responsibility: 1 },
        habits: { sleepRoutine: 1, reflection: 1 }
      },
      consequence: "A prepared morning made the rest of the day easier to manage.",
      reflection: "How did preparation change your next choice?"
    },
    {
      id: "rest",
      title: "Rest properly",
      category: "Health",
      location: "home",
      durationMinutes: 480,
      effects: {
        needs: { energy: 22, sleep: 24, stress: -12 },
        health: { sleepQuality: 6, physical: 2 },
        mentalWellbeing: { resilience: 3, motivation: 2 },
        habits: { sleepRoutine: 3 }
      },
      consequence: "Recovery improved energy, but it used a large block of time.",
      reflection: "Was rest avoidance or genuine recovery today?"
    },
    {
      id: "study-block",
      title: "Focused study block",
      category: "Education",
      location: "home",
      durationMinutes: 120,
      effects: {
        needs: { energy: -6, stress: 3, purpose: 8 },
        skills: { learning: 4, career: 1 },
        capability: { discipline: 2, decisionMaking: 1 },
        habits: { studyConsistency: 4 }
      },
      consequence: "Study increased long-term options while costing energy now.",
      reflection: "What helped you protect focus?"
    },
    {
      id: "work-shift",
      title: "Work shift",
      category: "Career",
      location: "work",
      durationMinutes: 480,
      effects: {
        finance: {},
        needs: { energy: -18, hunger: -12, stress: 12, social: -4 },
        career: { performance: 3, readiness: 2, burnoutRisk: 4 },
        skills: { career: 3, social: 1 },
        capability: { responsibility: 2 }
      },
      consequence: "Work improved income and experience, but pressure and fatigue increased.",
      reflection: "What did work give you, and what did it cost?"
    },
    {
      id: "eat-meal",
      title: "Eat a proper meal",
      category: "Health",
      location: "food",
      durationMinutes: 45,
      effects: {
        finance: { money: -12 },
        needs: { hunger: 26, energy: 5, stress: -2 },
        health: { nutrition: 4, physical: 1 }
      },
      consequence: "A meal cost money but protected energy and health.",
      reflection: "Was this spending aligned with your needs?"
    },
    {
      id: "exercise",
      title: "Exercise",
      category: "Health",
      location: "gym",
      durationMinutes: 90,
      effects: {
        finance: { money: -10 },
        needs: { energy: -8, stress: -8, purpose: 4, hygiene: -8 },
        health: { physical: 7, activity: 8 },
        mentalWellbeing: { motivation: 4, resilience: 3 },
        habits: { exercise: 5 },
        capability: { discipline: 1 }
      },
      consequence: "Exercise reduced stress and built health, but it required time, money and energy.",
      reflection: "What made movement worth the cost today?"
    },
    {
      id: "budget-review",
      title: "Review budget",
      category: "Finance",
      location: "home",
      durationMinutes: 45,
      effects: {
        needs: { stress: -4, purpose: 5 },
        finance: { confidence: 6 },
        skills: { finance: 5 },
        habits: { budgeting: 5 },
        capability: { decisionMaking: 2, responsibility: 1 }
      },
      consequence: "Budgeting did not create money immediately, but it improved financial awareness.",
      reflection: "What spending pattern became clearer?"
    },
    {
      id: "meet-friend",
      title: "Meet a trusted friend",
      category: "Relationship",
      location: "park",
      durationMinutes: 120,
      effects: {
        finance: { money: -8 },
        needs: { social: 20, stress: -8, purpose: 3, energy: -4 },
        relationships: { friends: 8, support: 4, trust: 3 },
        mentalWellbeing: { loneliness: -7, resilience: 3 },
        skills: { social: 2 },
        capability: { communication: 2 }
      },
      consequence: "Social support improved wellbeing, while time and a little money were spent.",
      reflection: "Did this connection support the person you want to become?"
    },
    {
      id: "shopping",
      title: "Buy something you want",
      category: "Lifestyle",
      location: "mall",
      durationMinutes: 90,
      effects: {
        finance: { money: -50 },
        needs: { stress: -3, purpose: -1 },
        mentalWellbeing: { motivation: 1 }
      },
      consequence: "Shopping gave short-term relief, but reduced financial flexibility.",
      reflection: "Was this a need, a reward, or pressure?"
    },
    {
      id: "journal-reflection",
      title: "Journal reflection",
      category: "Reflection",
      location: "home",
      durationMinutes: 30,
      effects: {
        needs: { stress: -5, purpose: 7 },
        mentalWellbeing: { resilience: 5, motivation: 2 },
        habits: { reflection: 6 },
        capability: { decisionMaking: 2 }
      },
      consequence: "Reflection helped turn experience into learning.",
      reflection: "What pattern should you notice before it becomes a problem?"
    }
  ];

  function findActivity(id) {
    return activities.find((activity) => activity.id === id) || null;
  }

  function getAvailableActivities(state, options = {}) {
    const location = options.locationId || "";
    if (location) {
      return activities.filter((activity) => activity.location === location || activity.location === "any");
    }
    return activities;
  }

  function addFinance(state, delta = {}) {
    if (Number(delta.money)) state.finance.money = Math.round(state.finance.money + Number(delta.money));
    if (Number(delta.savings)) state.finance.savings = Math.max(0, Math.round(state.finance.savings + Number(delta.savings)));
    if (Number(delta.debt)) state.finance.debt = Math.max(0, Math.round(state.finance.debt + Number(delta.debt)));
    if (Number(delta.confidence)) state.finance.confidence = game.clamp(state.finance.confidence + Number(delta.confidence));
  }

  function addCareer(state, delta = {}) {
    Object.entries(delta).forEach(([key, value]) => {
      if (typeof state.career[key] === "number") state.career[key] = game.clamp(state.career[key] + Number(value || 0));
    });
  }

  function performActivity(state, activityId, options = {}) {
    const activity = findActivity(activityId);
    if (!activity) return { error: "Activity not found." };
    if (activity.id === "work-shift" && !state.career.employed) {
      return { error: "You do not currently have a job - search for work before you can take a shift." };
    }

    const before = game.getTimeSnapshot(state);
    if (game.decayNeeds) game.decayNeeds(state, activity.durationMinutes);
    if (game.advanceMinutes) game.advanceMinutes(state, activity.durationMinutes, activity.title);

    const effects = activity.effects || {};
    // Work-shift pay tracks the player's actual career.incomePerShift (raised by
    // promotions/category choice) instead of a flat number, so those systems
    // have a real, felt consequence rather than only moving an abstract stat.
    const financeEffects = activity.id === "work-shift"
      ? { ...effects.finance, money: Math.round(state.career.incomePerShift) }
      : (effects.finance || {});
    if (game.applyNeedEffects) game.applyNeedEffects(state, effects);
    addFinance(state, financeEffects);
    addCareer(state, effects.career || {});
    if (game.applyPlayerEffects) game.applyPlayerEffects(state, activity);

    const after = game.getTimeSnapshot(state);
    const scheduleEntry = {
      id: `act-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      activityId: activity.id,
      title: activity.title,
      category: activity.category,
      location: options.locationId || activity.location,
      start: before.stamp,
      end: after.stamp,
      durationMinutes: activity.durationMinutes
    };
    state.schedule = [...(state.schedule || []), scheduleEntry].slice(-40);

    const event = game.addEvent(state, {
      type: "activity",
      title: activity.title,
      summary: activity.consequence,
      systems: affectedSystems(activity),
      consequences: buildConsequences({ ...activity, effects: { ...effects, finance: financeEffects } }),
      reflection: activity.reflection,
      occurredAt: after.stamp
    });
    if (game.updateProgressionFromDecision) {
      game.updateProgressionFromDecision(state, activity, { systemId: "activity", systemTitle: activity.category || "Activity" });
    }
    return { state, activity, event, scheduleEntry };
  }

  function affectedSystems(activity) {
    const effects = activity.effects || {};
    const map = {
      needs: "Needs",
      finance: "Finance",
      career: "Career",
      health: "Health",
      mentalWellbeing: "Mental wellbeing",
      relationships: "Relationships",
      skills: "Player skills",
      habits: "Habits",
      capability: "Capability"
    };
    return Object.keys(effects).map((key) => map[key]).filter(Boolean);
  }

  function buildConsequences(activity) {
    const effects = activity.effects || {};
    const items = [`Used ${game.durationLabel ? game.durationLabel(activity.durationMinutes) : `${activity.durationMinutes} minutes`} of the day.`];
    if (effects.finance && Number(effects.finance.money)) items.push(`Money ${Number(effects.finance.money) > 0 ? "+" : ""}${effects.finance.money}.`);
    if (effects.needs && Number(effects.needs.stress)) items.push(`Stress ${Number(effects.needs.stress) > 0 ? "+" : ""}${effects.needs.stress}.`);
    if (effects.health && Number(effects.health.physical)) items.push(`Physical health ${Number(effects.health.physical) > 0 ? "+" : ""}${effects.health.physical}.`);
    return items;
  }

  game.activities = activities;
  game.findActivity = findActivity;
  game.getAvailableActivities = getAvailableActivities;
  game.performActivity = performActivity;
})();
