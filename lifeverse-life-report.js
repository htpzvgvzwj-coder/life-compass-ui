(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  function average(values) {
    return Math.round(values.reduce((sum, value) => sum + Number(value || 0), 0) / Math.max(1, values.length));
  }

  function generateLifeReport(state, context = {}) {
    const recentEvents = (state.events || []).slice(-12);
    const reportTraces = game.selectReportTraces ? game.selectReportTraces(state, context) : (state.traces || []).slice(-20);
    const trackedTypes = ["career", "education", "finance", "housing", "transportation", "relationships", "health", "mentalWellbeing", "economy", "npcSimulation"];
    const choiceEvents = recentEvents.filter((event) => event.type === "activity" || trackedTypes.includes(event.type));
    const lowestNeed = game.NEED_KEYS
      .map((key) => ({ key, value: state.needs[key] }))
      .sort((a, b) => a.value - b.value)[0];
    const report = {
      id: `report-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: context.type || "reflection",
      title: context.days ? `${context.days}-day Life Report` : "Life Report",
      createdAt: game.getTimeSnapshot ? game.getTimeSnapshot(state).stamp : "",
      traceSummary: buildTraceSummary(reportTraces),
      overview: buildOverview(state, context),
      behaviourPatterns: buildPatterns(state, choiceEvents),
      causeAndEffect: buildCauseAndEffect(state, context, reportTraces),
      worldExplanations: buildWorldExplanations(state, context),
      systemExplanations: buildSystemExplanations(state),
      progressionExplanations: buildProgressionExplanations(state, context),
      consequences: buildConsequences(state, context, lowestNeed),
      recommendations: buildRecommendations(state, lowestNeed),
      reflectionQuestions: [
        "Which choice helped your future self the most?",
        "Which trade-off surprised you?",
        "What is one small adjustment for tomorrow?"
      ]
    };
    const lifeReportAi = game.getServiceRegistry ? game.getServiceRegistry().get("lifeReportAi") : null;
    if (lifeReportAi && typeof lifeReportAi.generateInsights === "function") {
      report.aiInsights = lifeReportAi.generateInsights(state, reportTraces);
    }
    state.reports = [...(state.reports || []), report].slice(-20);
    state.progression.reflectionCount = Math.max(0, Number(state.progression.reflectionCount || 0) + 1);
    return report;
  }

  function buildOverview(state, context) {
    if (context.type === "fast-forward") {
      const horizon = context.days >= 1825 ? "five-year" : context.days >= 365 ? "one-year" : context.days >= 180 ? "six-month" : context.days >= 30 ? "monthly" : "weekly";
      return `Fast Forward advanced a ${horizon} life period. Money, career, education, housing, transport, relationships, health, mental wellbeing, economy, NPC routines, and needs changed because repeated habits met world conditions.`;
    }
    return `You have lived ${state.time.day} in-game days. Your current independence index is ${state.progression.independenceIndex}/100.`;
  }

  function buildTraceSummary(traces = []) {
    return traces.slice(-10).map((trace) => ({
      id: trace.id,
      cause: trace.cause,
      affectedSystems: trace.affectedSystems,
      immediateEffects: trace.immediateEffects,
      longTermEffects: trace.longTermEffects,
      reflectionPrompt: trace.reflectionPrompt
    }));
  }

  function buildCauseAndEffect(state, context, traces = []) {
    const items = [];
    traces.slice(-6).forEach((trace) => {
      const systems = (trace.affectedSystems || []).join(", ") || "LifeVerse";
      const immediate = (trace.immediateEffects || [trace.summary]).filter(Boolean)[0] || "A meaningful consequence was recorded.";
      items.push(`${trace.cause} affected ${systems}: ${immediate}`);
    });
    if (context.type === "fast-forward") {
      items.push(`Time advanced ${context.days} days, so repeated costs, commute pressure, recovery habits, relationship attention, and world conditions compounded.`);
      if (context.worldEvent) items.push(`${context.worldEvent.title} affected the simulation because world events change job, housing, transport, health, opportunity, or social trust conditions.`);
      if (context.livingCost) items.push(`Money changed because daily living cost, housing cost, transport cost, debt interest, inflation, and budgeting all interacted.`);
      if (context.xpGained) items.push(`Progression increased because long-term simulation produces learning from consequences, not only from single-day actions.`);
    } else {
      items.push("Recent choices are explained through the systems they touched: time, needs, money, relationships, health, work, learning, world, and progression.");
    }
    items.push(`Stress affects outcomes because high stress reduces health, wellbeing, learning, relationships, and career sustainability.`);
    items.push(`Support affects outcomes because stronger relationships reduce loneliness and improve resilience when pressure rises.`);
    return items;
  }

  function buildWorldExplanations(state, context) {
    const world = state.worldSimulation;
    const items = [
      `Economy climate is ${world.economyClimate} because inflation ${world.inflationLevel}/100, job pressure ${world.jobMarketPressure}/100, and housing pressure ${world.housingMarketPressure}/100 interact.`,
      `Cost of living affects finance because inflation and housing pressure increase daily costs before the player makes any personal choice.`,
      `Job market pressure affects career because a competitive market requires stronger portfolio evidence, interview preparation, and learning consistency.`,
      `Education opportunity affects education because a stronger learning environment makes study and portfolio work more valuable.`,
      `Public health condition affects health because poor conditions increase illness risk unless recovery and medical access are strong.`,
      `Social trust affects relationships, mental wellbeing, and NPC support because community reliability changes how much support exists around the player.`
    ];
    if ((state.worldSimulation.randomEvents || []).length) {
      const event = state.worldSimulation.randomEvents[0];
      items.unshift(`Latest world event: ${event.title}. ${event.summary}`);
    }
    if (context.days >= 365) items.push("Long horizons make small world pressures more visible because inflation, rent pressure, career competition, and health habits compound over many months.");
    return items;
  }

  function buildSystemExplanations(state) {
    return [
      `Finance: cash ${state.finance.money}, savings ${state.finance.savings}, and debt ${state.finance.debt} reflect spending, budgeting, living costs, interest, and income decisions.`,
      `Career: readiness ${state.career.readiness}/100 reflects preparation, reputation, burnout risk, world job pressure, and education evidence.`,
      `Education: progress ${state.education.qualificationProgress}/100 reflects study consistency, learning efficiency, opportunity level, and portfolio work.`,
      `Housing: stability ${state.housing.stability}/100 and affordability ${state.housing.affordability}/100 reflect rent pressure, maintenance, comfort, commute, and money confidence.`,
      `Transportation: reliability ${state.transportation.reliability}/100 and commute stress ${state.transportation.commuteStress}/100 reflect transport mode, commute distance, world reliability, and planning.`,
      `Relationships: support ${state.relationships.support}/100 reflects attention, communication, community trust, network building, and neglect risk.`,
      `Health: physical health ${state.health.physical}/100 reflects sleep, food, activity, illness risk, public health, recovery, and stress.`,
      `Mental wellbeing: index ${state.mentalWellbeing.index}/100 reflects motivation, confidence, happiness, resilience, loneliness, burnout, and purpose.`,
      `NPC/community: community trust ${state.npcSimulation.communityTrust}/100 reflects NPC routines, social opportunities, district activity, and the player's community choices.`
    ];
  }

  function buildProgressionExplanations(state, context) {
    const progression = state.progression;
    const explanations = [
      `Life XP is ${progression.lifeXp} and level is ${progression.lifeLevel}; XP grows from meaningful decisions, reflection, and Fast Forward learning.`,
      `Personal growth ${progression.personalGrowthScore}/100 comes from capability, habits, skills, and purpose clarity.`,
      `Stability ${progression.stabilityScore}/100 comes from finance, housing, transportation, and health reliability.`,
      `Resilience ${progression.resilienceScore}/100 comes from recovery, stress handling, support, reflection, and reduced burnout.`,
      `Opportunity ${progression.opportunityScore}/100 comes from career readiness, education progress, portfolio, network, and world opportunity.`,
      `Legacy ${progression.legacyScore}/100 comes from trust, community contribution, milestones, achievements, and growth that affects others.`
    ];
    if ((progression.achievements || []).length) explanations.push(`Latest achievement: ${progression.achievements[0].title} - ${progression.achievements[0].description}`);
    if ((progression.milestones || []).length) explanations.push(`Latest milestone: ${progression.milestones[0].title} - ${progression.milestones[0].description}`);
    if (context.xpGained) explanations.push(`This report added ${context.xpGained} XP because longer-term consequence review is part of growth.`);
    return explanations;
  }

  function buildPatterns(state, activityEvents) {
    const categories = {};
    activityEvents.forEach((event) => {
      (event.systems || []).forEach((system) => {
        categories[system] = (categories[system] || 0) + 1;
      });
    });
    const top = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const patterns = top.map(([system, count]) => `${system} appeared in ${count} recent choice${count === 1 ? "" : "s"}.`);
    if (!patterns.length) patterns.push("No repeated behaviour pattern has formed yet. Make a few choices first.");
    patterns.push(`Average player capability is ${average(Object.values(state.player.capability))}/100.`);
    return patterns;
  }

  function buildConsequences(state, context, lowestNeed) {
    const consequences = [];
    consequences.push(`Current money: $${state.finance.money}. Savings: $${state.finance.savings}. Debt: $${state.finance.debt}.`);
    consequences.push(`Main need to watch: ${game.needLabel ? game.needLabel(lowestNeed.key) : lowestNeed.key} (${lowestNeed.value}/100).`);
    if (state.needs.stress > 70) consequences.push("Stress is high enough to affect learning, work, and relationships.");
    if (state.finance.money < 100) consequences.push("Low cash reduces flexibility for food, transport, housing decisions, and emergencies.");
    consequences.push(`Career readiness is ${state.career.readiness}/100 while burnout risk is ${state.career.burnoutRisk}/100.`);
    consequences.push(`Education progress is ${state.education.qualificationProgress}/100 with study consistency at ${state.education.studyConsistency}/100.`);
    consequences.push(`Housing comfort is ${state.housing.comfort}/100 and affordability is ${state.housing.affordability}/100.`);
    consequences.push(`Transportation reliability is ${state.transportation.reliability}/100 and commute stress is ${state.transportation.commuteStress}/100.`);
    consequences.push(`Relationship support is ${state.relationships.support}/100 and neglect risk is ${state.relationships.neglectRisk}/100.`);
    consequences.push(`Health is ${state.health.physical}/100, sleep quality is ${state.health.sleepQuality}/100, and illness risk is ${state.health.illnessRisk}/100.`);
    consequences.push(`Mental wellbeing is ${state.mentalWellbeing.index}/100 with confidence at ${state.mentalWellbeing.confidence}/100 and burnout at ${state.mentalWellbeing.burnoutRisk}/100.`);
    consequences.push(`Economy: cost of living ${state.economy.costOfLivingIndex}/100, job market ${state.economy.jobMarket}/100, inflation ${state.economy.inflation}/100.`);
    consequences.push(`World simulation: ${state.worldSimulation.economyClimate}, transport reliability ${state.worldSimulation.transportationReliability}/100, public health ${state.worldSimulation.publicHealthCondition}/100.`);
    consequences.push(`Progression: level ${state.progression.lifeLevel}, XP ${state.progression.lifeXp}, growth ${state.progression.personalGrowthScore}/100, stability ${state.progression.stabilityScore}/100, resilience ${state.progression.resilienceScore}/100.`);
    if ((state.npcs || []).length) {
      const npc = [...state.npcs].sort((a, b) => b.relationship - a.relationship)[0];
      consequences.push(`NPC world: ${npc.name} is at ${npc.location} and last chose: ${npc.lastDecision}.`);
    }
    if (context.livingCost) consequences.push(`Fast Forward living costs reduced money by about $${context.livingCost}.`);
    return consequences;
  }

  function buildRecommendations(state, lowestNeed) {
    const recommendations = [];
    if (lowestNeed.key === "hunger") recommendations.push("Plan one affordable proper meal before taking another demanding activity.");
    if (lowestNeed.key === "energy" || lowestNeed.key === "sleep") recommendations.push("Use rest or a lighter activity before stacking work or study.");
    if (lowestNeed.key === "social") recommendations.push("Schedule one low-cost connection with a trusted person.");
    if (state.needs.stress > 65) recommendations.push("Choose recovery, reflection, or exercise before pressure becomes the default.");
    if (state.finance.money < 150) recommendations.push("Review budget or choose income carefully, while watching stress.");
    if (state.career.burnoutRisk > 65) recommendations.push("Protect recovery before accepting more work pressure; burnout lowers future performance.");
    if (state.education.studyConsistency < 35) recommendations.push("Use one short learning block to rebuild study consistency before chasing bigger goals.");
    if (state.housing.affordability < 45) recommendations.push("Compare housing costs before making a move; rent can quietly reduce freedom.");
    if (state.transportation.commuteStress > 60) recommendations.push("Plan commute or reconsider transport choices because repeated travel stress affects energy.");
    if (state.relationships.neglectRisk > 55) recommendations.push("Choose one relationship action; neglect slowly removes support before a crisis appears.");
    if (state.health.illnessRisk > 55) recommendations.push("Prioritize sleep, food, or medical care before illness blocks work and study.");
    if (state.mentalWellbeing.burnoutRisk > 60) recommendations.push("Lower pressure before adding new goals; burnout turns useful ambition into avoidance.");
    if (state.economy.costOfLivingIndex > 65) recommendations.push("Adjust budget and transport choices because the economy is raising daily-life pressure.");
    if (state.npcSimulation.communityTrust < 40) recommendations.push("Interact with the district; NPC support grows when community trust is maintained.");
    if (!recommendations.length) recommendations.push("Keep balancing useful effort with recovery. Stable routines create future freedom.");
    return recommendations.slice(0, 3);
  }

  function latestReport(state) {
    return (state.reports || [])[state.reports.length - 1] || null;
  }

  game.generateLifeReport = generateLifeReport;
  game.latestReport = latestReport;
})();
