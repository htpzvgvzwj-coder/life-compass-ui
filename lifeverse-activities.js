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
      id: "cook-at-home",
      title: "Cook a meal at home",
      category: "Health",
      location: "home",
      durationMinutes: 75,
      effects: {
        finance: { money: -5 },
        needs: { hunger: 24, energy: -6, stress: -1 },
        health: { nutrition: 5, physical: 1 },
        skills: { lifeManagement: 2 },
        habits: { budgeting: 1 },
        capability: { responsibility: 1 }
      },
      consequence: "Cheaper than eating out, but it cost real time and effort instead of money.",
      reflection: "Which is actually scarcer for you right now - money or time?"
    },
    {
      id: "do-laundry-and-chores",
      title: "Do laundry and chores",
      category: "Living",
      location: "home",
      durationMinutes: 60,
      effects: {
        needs: { energy: -8, hygiene: 12, stress: -3, purpose: 2 },
        housing: { comfort: 3 },
        capability: { responsibility: 2 },
        habits: { reflection: 1 }
      },
      consequence: "Nobody notices chores when they're done - only when they aren't.",
      reflection: "What would this place look like after a month of skipping this?"
    },
    {
      id: "take-a-shower",
      title: "Take a shower",
      category: "Health",
      location: "home",
      durationMinutes: 20,
      effects: {
        needs: { hygiene: 20, stress: -3, energy: 2 },
        health: { physical: 1 }
      },
      consequence: "Ten minutes, and everything after it feels a little more manageable.",
      reflection: "How different does the rest of the day feel after this?"
    },
    {
      id: "personal-care-routine",
      title: "Proper personal care routine",
      category: "Health",
      location: "home",
      durationMinutes: 40,
      effects: {
        finance: { money: -6 },
        needs: { hygiene: 16, stress: -4, purpose: 2 },
        mentalWellbeing: { motivation: 2 },
        health: { physical: 1 }
      },
      consequence: "A small, unglamorous investment in feeling like yourself.",
      reflection: "How does taking care of yourself change how the rest of the day goes?"
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
      id: "call-family",
      title: "Call your family",
      category: "Relationship",
      location: "home",
      durationMinutes: 30,
      effects: {
        needs: { social: 8, stress: -3, purpose: 3 },
        relationships: { family: 8, support: 2 },
        capability: { communication: 1 }
      },
      consequence: "A short call costs almost nothing and keeps a real relationship from quietly going cold.",
      reflection: "How long had it actually been since the last one?"
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
    // Everyday boundary-crossing choices (lifeverse-legal.js): probabilistic,
    // accumulating consequences rather than a guaranteed catch every time -
    // scoped to relatable, minor temptations, not serious/violent crime.
    // Every one of these has a real, safer alternative activity right next
    // to it, and both branches are narrated through the same dynamic
    // consequence pipeline as every other activity, so the choice is never
    // a silent stat change either way.
    {
      id: "pocket-something",
      title: "Pocket something instead of paying",
      category: "Risk",
      location: "mall",
      durationMinutes: 15,
      effects: {
        needs: { stress: 4 }
      },
      after(state) {
        game.resolveRiskyChoice(state, {
          id: "shoplifting",
          title: "Pocket something instead of paying",
          heatGain: 12,
          baseCatchChance: 0.15,
          seedSalt: 11
        });
      },
      consequence: "A quick decision, made in seconds, that isn't actually free.",
      reflection: "What made this feel worth the risk right now?"
    },
    {
      id: "tap-in-properly",
      title: "Tap in and ride the MRT",
      category: "Living",
      location: "train",
      durationMinutes: 30,
      effects: {
        finance: { money: -2 },
        needs: { energy: -2, purpose: 1 }
      },
      consequence: "A small, ordinary cost of getting around the city.",
      reflection: "How much does this add up to over a month?"
    },
    {
      id: "walk-or-cycle-commute",
      title: "Walk or cycle instead",
      category: "Living",
      location: "train",
      durationMinutes: 55,
      effects: {
        needs: { energy: -10, stress: -2, purpose: 2 },
        health: { physical: 2, activity: 4 },
        transportation: { monthlyCost: -5 }
      },
      consequence: "Free, and it cost time and energy instead of money.",
      reflection: "Is this a trade you'd make every day, or only sometimes?"
    },
    {
      id: "jump-fare-gate",
      title: "Jump the fare gate",
      category: "Risk",
      location: "train",
      durationMinutes: 10,
      effects: {
        needs: { stress: 3 }
      },
      after(state) {
        game.resolveRiskyChoice(state, {
          id: "fare-dodge",
          title: "Jump the fare gate",
          heatGain: 8,
          baseCatchChance: 0.1,
          seedSalt: 23
        });
      },
      consequence: "Saved a couple of dollars, if nobody was watching.",
      reflection: "Is this actually about the money, or something else?"
    },
    {
      id: "call-a-ride-home",
      title: "Call a ride home",
      category: "Living",
      location: "clarke-quay",
      durationMinutes: 30,
      effects: {
        finance: { money: -18 },
        needs: { energy: 4, stress: -4 }
      },
      consequence: "Cost more than driving yourself, but everyone got home the same way they left.",
      reflection: "Was this an easy call to make, or did it take convincing yourself?"
    },
    {
      id: "drive-home-after-drinking",
      title: "Drive home after drinking",
      category: "Risk",
      location: "clarke-quay",
      durationMinutes: 20,
      effects: {
        needs: { stress: 2 }
      },
      after(state) {
        game.resolveRiskyChoice(state, {
          id: "drink-driving",
          title: "Drive home after drinking",
          heatGain: 22,
          baseCatchChance: 0.2,
          seedSalt: 37
        });
      },
      consequence: "Faster and free - as long as nothing went wrong on the way.",
      reflection: "What would you tell a friend who was about to do this?"
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
    },
    {
      id: "creative-hobby-time",
      title: "Spend time on a hobby",
      category: "Living",
      location: "home",
      durationMinutes: 60,
      effects: {
        needs: { stress: -6, purpose: 5, energy: -2 },
        mentalWellbeing: { motivation: 4, resilience: 2 },
        habits: { reflection: 1 }
      },
      consequence: "Nothing productive happened, and that was the point.",
      reflection: "When was the last time you did something just because you wanted to?"
    },
    // HDB Hub (new zone, life-sim.js/app.js): the unglamorous "adulting
    // paperwork" side of independence that the rest of the activity list
    // doesn't cover - none of these are fun, all of them are real, and none
    // has a wrong answer to game toward (same "small real tradeoff" shape
    // as every other activity here, not a puzzle with an optimal choice).
    {
      id: "file-taxes",
      title: "File your taxes",
      category: "Life Admin",
      location: "hdb-hub",
      durationMinutes: 90,
      effects: {
        finance: { money: -15, confidence: 4 },
        needs: { stress: 8, purpose: 4 },
        skills: { finance: 3 },
        capability: { responsibility: 2 },
        habits: { budgeting: 2 }
      },
      consequence: "Taxes got filed on time - a small cost now against a bigger problem avoided later.",
      reflection: "What made this easier or harder than you expected?"
    },
    {
      id: "fudge-tax-numbers",
      title: "Fudge the numbers on your taxes",
      category: "Risk",
      location: "hdb-hub",
      durationMinutes: 60,
      effects: {
        finance: { money: 20 },
        needs: { stress: 6 }
      },
      after(state) {
        game.resolveRiskyChoice(state, {
          id: "tax-fudge",
          title: "Fudge the numbers on your taxes",
          heatGain: 18,
          baseCatchChance: 0.08,
          seedSalt: 53
        });
      },
      consequence: "A little more cash today, on paper that might get a second look.",
      reflection: "What is the actual expected value here, once you count the risk?"
    },
    {
      id: "check-cpf-statement",
      title: "Check your CPF statement",
      category: "Life Admin",
      location: "hdb-hub",
      durationMinutes: 20,
      effects: {
        needs: { stress: -4, purpose: 2 },
        finance: { confidence: 3 },
        skills: { finance: 1 }
      },
      consequence: "A quick look at the real numbers replaced vague worry with an actual picture.",
      reflection: "Did checking change how you feel about the future, even a little?"
    },
    {
      id: "apply-bto",
      title: "Apply for a BTO flat",
      category: "Life Admin",
      location: "hdb-hub",
      durationMinutes: 120,
      effects: {
        finance: { money: -50, confidence: 2 },
        needs: { stress: 10, purpose: 12 },
        skills: { finance: 2, career: 1 },
        capability: { decisionMaking: 2, responsibility: 2 },
        habits: { budgeting: 1 }
      },
      consequence: "The application is in - a real step toward an independent home, with a real wait ahead.",
      reflection: "What does having your own place actually mean to you?"
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
    if (game.isInDetention && game.isInDetention(state)) {
      return { error: `You're in detention until day ${state.legal.detentionUntilDay}. Fast forward to serve the time.` };
    }
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

    let event = game.addEvent(state, {
      type: "activity",
      title: activity.title,
      summary: activity.consequence,
      systems: affectedSystems(activity),
      consequences: buildConsequences({ ...activity, effects: { ...effects, finance: financeEffects } }),
      reflection: activity.reflection,
      occurredAt: after.stamp
    });
    // Risky-choice activities (lifeverse-legal.js's resolveRiskyChoice) fire
    // their own follow-up event from this hook - when one does, it becomes
    // the primary result event (what the toast shows) since "did you get
    // caught" is the moment that actually matters, not the generic activity
    // flavour text above.
    if (typeof activity.after === "function") {
      const eventsBefore = state.events.length;
      activity.after(state, activity);
      if (state.events.length > eventsBefore) event = state.events[state.events.length - 1];
    }
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
