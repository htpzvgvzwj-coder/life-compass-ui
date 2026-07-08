(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  function average(values) {
    return Math.round(values.reduce((sum, value) => sum + Number(value || 0), 0) / Math.max(1, values.length));
  }

  function achievementExists(state, id) {
    return (state.progression.achievements || []).some((achievement) => achievement.id === id);
  }

  function addAchievement(state, id, title, description) {
    if (achievementExists(state, id)) return null;
    const achievement = {
      id,
      title,
      description,
      unlockedAt: game.getTimeSnapshot ? game.getTimeSnapshot(state).stamp : ""
    };
    state.progression.achievements = [achievement, ...(state.progression.achievements || [])].slice(0, 60);
    return achievement;
  }

  function addMilestone(state, title, description) {
    const milestone = {
      id: `milestone-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      description,
      day: state.time.day,
      createdAt: game.getTimeSnapshot ? game.getTimeSnapshot(state).stamp : ""
    };
    state.progression.milestones = [milestone, ...(state.progression.milestones || [])].slice(0, 40);
    return milestone;
  }

  function recalculateProgression(state) {
    const capabilityAverage = average(Object.values(state.player.capability || {}));
    const habitAverage = average(Object.values(state.player.habits || {}));
    const skillAverage = average(Object.values(state.player.skills || {}));
    state.progression.personalGrowthScore = game.clamp(Math.round(capabilityAverage * 0.35 + habitAverage * 0.3 + skillAverage * 0.2 + state.mentalWellbeing.purposeClarity * 0.15));
    state.progression.stabilityScore = game.clamp(Math.round(
      state.finance.confidence * 0.22 +
      Math.min(100, Math.max(0, state.finance.money / 12)) * 0.16 +
      Math.min(100, state.finance.savings / 10) * 0.12 +
      state.housing.stability * 0.18 +
      state.transportation.reliability * 0.14 +
      state.health.physical * 0.18 -
      Math.min(30, state.finance.debt / 20)
    ));
    state.progression.resilienceScore = game.clamp(Math.round(
      state.mentalWellbeing.resilience * 0.26 +
      (100 - state.mentalWellbeing.burnoutRisk) * 0.18 +
      (100 - state.needs.stress) * 0.18 +
      state.health.recovery * 0.16 +
      state.relationships.support * 0.14 +
      state.player.habits.reflection * 0.08
    ));
    state.progression.opportunityScore = game.clamp(Math.round(
      state.career.readiness * 0.24 +
      state.education.qualificationProgress * 0.18 +
      state.education.portfolio * 0.16 +
      state.relationships.network * 0.14 +
      state.economy.opportunityIndex * 0.14 +
      state.worldSimulation.educationOpportunityLevel * 0.14
    ));
    state.progression.legacyScore = game.clamp(Math.round(
      state.relationships.trust * 0.2 +
      state.npcSimulation.communityTrust * 0.2 +
      state.worldSimulation.socialTrustLevel * 0.16 +
      state.progression.personalGrowthScore * 0.14 +
      Math.min(100, (state.progression.milestones || []).length * 10) * 0.16 +
      Math.min(100, (state.progression.achievements || []).length * 8) * 0.14
    ));
    state.progression.independenceIndex = game.clamp(Math.round(
      state.progression.personalGrowthScore * 0.25 +
      state.progression.stabilityScore * 0.24 +
      state.progression.resilienceScore * 0.2 +
      state.progression.opportunityScore * 0.2 +
      state.progression.legacyScore * 0.11
    ));
    return state.progression;
  }

  function addLifeXp(state, amount = 0, reason = "life choice") {
    const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
    state.progression.lifeXp = Math.max(0, Math.round(Number(state.progression.lifeXp || 0) + safeAmount));
    const previousLevel = Math.max(1, Math.round(Number(state.progression.lifeLevel || 1)));
    state.progression.lifeLevel = Math.max(1, Math.floor(state.progression.lifeXp / 120) + 1);
    recalculateProgression(state);
    if (state.progression.lifeLevel > previousLevel) {
      addAchievement(state, `level-${state.progression.lifeLevel}`, `Life Level ${state.progression.lifeLevel}`, `Reached a new life level through ${reason}.`);
    }
    checkProgressionAchievements(state);
    return state.progression.lifeXp;
  }

  function checkProgressionAchievements(state) {
    if (state.progression.stabilityScore >= 60) addAchievement(state, "stable-routine", "Stable Routine", "Built enough stability across money, housing, health, and transport.");
    if (state.progression.resilienceScore >= 60) addAchievement(state, "resilience-builder", "Resilience Builder", "Improved recovery, stress handling, and support.");
    if (state.progression.opportunityScore >= 60) addAchievement(state, "opportunity-ready", "Opportunity Ready", "Connected skills, education, career, and market awareness.");
    if (state.progression.legacyScore >= 50) addAchievement(state, "community-impact", "Community Impact", "Strengthened trust and contribution beyond yourself.");
    if ((state.progression.milestones || []).length >= 1) addAchievement(state, "first-milestone", "First Milestone", "Set a direction that can be revisited later.");
    if (state.time.day >= 365) addAchievement(state, "long-horizon", "Long Horizon Thinker", "Simulated at least one year of consequences.");
  }

  function updateProgressionFromDecision(state, action, context = {}) {
    const duration = Number(action.durationMinutes || 30);
    const systemsTouched = Object.keys(action.effects || {}).length;
    const reflectionBonus = action.reflection ? 4 : 0;
    const xp = 8 + Math.round(duration / 20) + systemsTouched * 2 + reflectionBonus;
    addLifeXp(state, xp, `${context.systemTitle || "life"} decision`);
    return xp;
  }

  function updateProgressionFromFastForward(state, days = 1) {
    const safeDays = Math.max(1, Math.min(1825, Math.round(Number(days) || 1)));
    const longTermBonus = safeDays >= 365 ? 45 : safeDays >= 180 ? 28 : safeDays >= 30 ? 16 : 8;
    const balance = Math.round((state.progression.stabilityScore + state.progression.resilienceScore + state.progression.opportunityScore) / 30);
    const xp = Math.min(420, longTermBonus + balance + Math.round(safeDays / 12));
    addLifeXp(state, xp, `${safeDays}-day Fast Forward`);
    if (safeDays >= 180) {
      addMilestone(state, `${safeDays}-day reflection`, "Reviewed long-term consequences across work, learning, money, health, and relationships.");
    }
    return xp;
  }

  game.progressionSystem = {
    id: "progression",
    title: "Progression",
    chapter: "Chapter 20",
    summary(state) {
      return `Level ${state.progression.lifeLevel} - XP ${state.progression.lifeXp}, growth ${state.progression.personalGrowthScore}/100.`;
    },
    metrics(state) {
      return [
        ["Level", state.progression.lifeLevel],
        ["Growth", state.progression.personalGrowthScore],
        ["Stability", state.progression.stabilityScore],
        ["Resilience", state.progression.resilienceScore]
      ];
    },
    actions: [
      {
        id: "review-life-progress",
        title: "Review life progress",
        description: "Look at patterns before repeating them blindly.",
        durationMinutes: 45,
        effects: {
          needs: { stress: -4, purpose: 8 },
          mentalWellbeing: { purposeClarity: 6, confidence: 3 },
          progression: { lifeXp: 20, personalGrowthScore: 2 },
          habits: { reflection: 5 },
          capability: { decisionMaking: 2 }
        },
        consequence: "Reviewing progress turned experience into visible personal growth.",
        reflection: "Which pattern should continue, and which pattern should change?"
      },
      {
        id: "set-life-milestone",
        title: "Set a life milestone",
        description: "Choose a concrete adult-life direction to revisit later.",
        durationMinutes: 35,
        effects: {
          needs: { purpose: 9, stress: -2 },
          mentalWellbeing: { purposeClarity: 8, motivation: 4 },
          progression: { lifeXp: 25, opportunityScore: 2 },
          capability: { responsibility: 2, decisionMaking: 2 }
        },
        after(state) {
          addMilestone(state, state.progression.milestoneIntent || "Adult-life milestone", "A personal direction was named so future choices can be compared against it.");
        },
        consequence: "A milestone gave future decisions a clearer reference point.",
        reflection: "What would make this milestone meaningful, not just impressive?"
      },
      {
        id: "evaluate-long-term-direction",
        title: "Evaluate long-term direction",
        description: "Compare money, career, study, health, and relationships against the life you want.",
        durationMinutes: 70,
        effects: {
          needs: { energy: -4, stress: -3, purpose: 10 },
          career: { readiness: 2 },
          education: { learningEfficiency: 2 },
          finance: { confidence: 2 },
          mentalWellbeing: { purposeClarity: 7, confidence: 3 },
          progression: { lifeXp: 30, personalGrowthScore: 3, opportunityScore: 2 },
          skills: { lifeManagement: 3 },
          capability: { decisionMaking: 3 }
        },
        consequence: "Long-term direction connected separate life systems into one adult-life strategy.",
        reflection: "Which system is quietly pulling you away from your intended future?"
      },
      {
        id: "build-resilience",
        title: "Build resilience plan",
        description: "Prepare support and recovery before pressure becomes an emergency.",
        durationMinutes: 60,
        effects: {
          needs: { stress: -6, purpose: 5 },
          relationships: { support: 3, trust: 2 },
          health: { recovery: 5, illnessRisk: -2 },
          mentalWellbeing: { resilience: 8, burnoutRisk: -5 },
          progression: { lifeXp: 24, resilienceScore: 3 },
          habits: { reflection: 3 },
          capability: { responsibility: 2 }
        },
        consequence: "Resilience improved because recovery, support, and planning were prepared together.",
        reflection: "What helps you recover before you reach your limit?"
      },
      {
        id: "improve-long-term-health",
        title: "Improve long-term health",
        description: "Set a realistic health routine that protects future study and work capacity.",
        durationMinutes: 80,
        effects: {
          needs: { energy: -6, stress: -4, purpose: 6 },
          health: { physical: 5, recovery: 6, stamina: 5, illnessRisk: -3 },
          mentalWellbeing: { confidence: 3, happiness: 3 },
          progression: { lifeXp: 26, stabilityScore: 2, resilienceScore: 2 },
          habits: { sleepRoutine: 3, exercise: 4 },
          capability: { discipline: 2 }
        },
        consequence: "Health planning improved stability because energy and recovery support every other system.",
        reflection: "What health habit can survive a busy week?"
      }
    ]
  };

  game.recalculateProgression = recalculateProgression;
  game.addLifeXp = addLifeXp;
  game.addMilestone = addMilestone;
  game.addAchievement = addAchievement;
  game.updateProgressionFromDecision = updateProgressionFromDecision;
  game.updateProgressionFromFastForward = updateProgressionFromFastForward;
})();
