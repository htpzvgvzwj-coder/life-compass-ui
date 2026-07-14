(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  function fastForward(state, days = 7) {
    const safeDays = Math.max(1, Math.min(1825, Math.round(Number(days) || 7)));
    const beforeMoney = state.finance.money;
    const beforeSavings = state.finance.savings;
    const beforeDebt = state.finance.debt;
    const beforeReadiness = state.career.readiness;
    const beforeEducation = state.education.qualificationProgress;
    const beforeStress = state.needs.stress;
    const beforeRelationships = state.relationships.support;
    const beforeHealth = state.health.physical;
    const beforeWellbeing = state.mentalWellbeing.index;
    const beforeLivingCost = state.economy.costOfLivingIndex;
    const beforeLevel = state.progression.lifeLevel;
    const worldEvent = game.updateWorldConditions ? game.updateWorldConditions(state, safeDays, { record: false }) : null;
    const inflationMultiplier = 1 + (Number(state.economy.inflation || 0) / 100) * (safeDays / 30);
    const livingCost = Math.round(safeDays * Number(state.finance.dailyLivingCost || 18) * inflationMultiplier);
    const rentCost = Math.round((Number(state.housing.monthlyCost || 0) / 30) * safeDays);
    const commuteCost = Math.round(safeDays * 0.65 * Number(state.transportation.costPerCommute || 4));
    const debtCost = Math.round((Number(state.finance.debt || 0) * ((Number(state.economy.interestRate || 0) + 2) / 100) / 30) * safeDays);
    const insurance = state.finance.insurance || {};
    const insuranceCost = Math.round(safeDays * ((insurance.health ? 1.2 : 0) + (insurance.home ? 0.8 : 0) + (insurance.vehicle ? 1.5 : 0)));
    const totalCost = livingCost + rentCost + commuteCost + debtCost + insuranceCost;
    const worldPressure = state.worldSimulation.jobMarketPressure * 0.01 + state.worldSimulation.housingMarketPressure * 0.006 + Math.max(0, 65 - state.worldSimulation.publicHealthCondition) * 0.006;
    const opportunityLift = state.worldSimulation.educationOpportunityLevel * 0.008 + state.economy.opportunityIndex * 0.006;
    const studyGrowth = (state.education.studyConsistency + state.player.habits.studyConsistency) * safeDays * 0.006 + opportunityLift * safeDays * 0.08;
    const careerGrowth = Math.max(0, (state.career.performance + state.career.readiness + state.player.skills.career) * safeDays * 0.004 - worldPressure * safeDays * 0.12);
    const commutePressure = (state.transportation.commuteStress + Math.max(0, state.housing.commuteMinutes - 30)) * safeDays * 0.008;
    const housingRecovery = (state.housing.comfort + state.housing.safety + state.housing.maintenance) * safeDays * 0.003;
    const relationshipDecay = Math.max(0, safeDays * 0.18 - state.relationships.support * 0.01 - state.player.skills.social * 0.02);
    const healthRoutine = state.health.sleepQuality * 0.01 + state.health.nutrition * 0.01 + state.health.activity * 0.008 + state.health.recovery * 0.006;
    const healthPressure = state.needs.stress * 0.008 + state.health.illnessRisk * 0.01 + state.career.burnoutRisk * 0.006;
    const mentalSupport = state.relationships.support * 0.012 + state.mentalWellbeing.resilience * 0.012 + state.needs.purpose * 0.01;
    const mentalPressure = state.needs.stress * 0.012 + state.mentalWellbeing.loneliness * 0.01 + state.career.burnoutRisk * 0.008;

    if (game.advanceDays) game.advanceDays(state, safeDays, "Fast Forward");
    state.finance.money = Math.round(state.finance.money - totalCost);
    const savingsGrowth = Math.round(state.finance.savings * Math.max(0, state.economy.interestRate) / 100 * (safeDays / 365));
    const debtGrowth = Math.round(state.finance.debt * Math.max(0, state.economy.interestRate + 2) / 100 * (safeDays / 365));
    state.finance.savings = Math.max(0, Math.round(state.finance.savings + savingsGrowth));
    state.finance.debt = Math.max(0, Math.round(state.finance.debt + debtGrowth));
    const investments = state.finance.investments || { bonds: 0, stocks: 0, property: 0 };
    const bondsGrowth = Math.round(investments.bonds * 0.045 * (safeDays / 365));
    const propertyGrowth = Math.round(investments.property * 0.06 * (safeDays / 365));
    const stockSeed = Math.sin(state.time.day * 12.9898 + safeDays * 78.233) * 43758.5453;
    const stockVariance = (stockSeed - Math.floor(stockSeed)) * 2 - 1;
    const stockGrowth = Math.round(investments.stocks * (0.03 + stockVariance * 0.14) * (safeDays / 365));
    investments.bonds = Math.max(0, investments.bonds + bondsGrowth);
    investments.property = Math.max(0, investments.property + propertyGrowth);
    investments.stocks = Math.max(0, investments.stocks + stockGrowth);
    state.finance.investments = investments;
    if (state.finance.money < 0) {
      state.finance.debt = Math.max(0, Math.round(state.finance.debt + Math.abs(state.finance.money)));
      state.finance.money = 0;
    } else if (state.finance.money > 1200 && state.player.habits.budgeting > 45) {
      const autoSave = Math.round(Math.min(state.finance.money - 900, state.finance.money * 0.12));
      state.finance.money -= autoSave;
      state.finance.savings += autoSave;
    }
    state.needs.energy = game.clamp(state.needs.energy - safeDays * 0.7);
    state.needs.hunger = game.clamp(state.needs.hunger - safeDays * 0.5);
    state.needs.sleep = game.clamp(state.needs.sleep - safeDays * 0.45);
    state.needs.stress = game.clamp(state.needs.stress + safeDays * 0.35 + state.career.burnoutRisk * 0.03 + commutePressure - housingRecovery * 0.1);
    state.health.physical = game.clamp(state.health.physical - safeDays * 0.12 + state.player.habits.exercise * 0.01);
    state.mentalWellbeing.motivation = game.clamp(state.mentalWellbeing.motivation - safeDays * 0.08 + state.player.habits.reflection * 0.02 + state.needs.purpose * 0.002);
    state.career.readiness = game.clamp(state.career.readiness + careerGrowth + state.player.habits.studyConsistency * 0.02);
    state.career.burnoutRisk = game.clamp(state.career.burnoutRisk + safeDays * 0.08 + state.needs.stress * 0.01 - state.player.habits.sleepRoutine * 0.01);
    state.career.performance = game.clamp(state.career.performance + state.player.capability.discipline * 0.01 - state.career.burnoutRisk * 0.01);
    state.education.qualificationProgress = game.clamp(state.education.qualificationProgress + studyGrowth);
    state.education.studyConsistency = game.clamp(state.education.studyConsistency + state.player.habits.studyConsistency * 0.01 - safeDays * 0.01);
    state.finance.confidence = game.clamp(state.finance.confidence + state.player.habits.budgeting * 0.02 - Math.max(0, state.finance.debt - state.finance.savings) * 0.002);
    state.career.incomePerShift = Math.max(40, Math.round(state.career.incomePerShift + state.economy.wageGrowth * safeDays * 0.01 + Math.max(0, state.economy.jobMarket - 50) * 0.003));
    state.housing.comfort = game.clamp(state.housing.comfort + state.housing.maintenance * 0.01 - safeDays * 0.03);
    state.housing.stability = game.clamp(state.housing.stability - state.worldSimulation.housingMarketPressure * safeDays * 0.004 + state.finance.confidence * 0.01);
    state.housing.affordability = game.clamp(state.housing.affordability - state.worldSimulation.housingMarketPressure * safeDays * 0.004 + state.finance.confidence * 0.012);
    state.housing.maintenance = game.clamp(state.housing.maintenance - safeDays * 0.12);
    state.transportation.commuteStress = game.clamp(state.transportation.commuteStress + Math.max(0, state.housing.commuteMinutes - 35) * 0.03 - state.transportation.reliability * 0.01);
    state.transportation.reliability = game.clamp(state.transportation.reliability - Math.max(0, 55 - state.worldSimulation.transportationReliability) * safeDays * 0.003);
    state.relationships.support = game.clamp(state.relationships.support - relationshipDecay + state.npcSimulation.communityTrust * 0.005);
    state.relationships.friends = game.clamp(state.relationships.friends - relationshipDecay);
    state.relationships.family = game.clamp(state.relationships.family - safeDays * 0.08 + state.housing.comfort * 0.004);
    state.relationships.neglectRisk = game.clamp(state.relationships.neglectRisk + safeDays * 0.16 - state.relationships.communication * 0.02);
    state.health.physical = game.clamp(state.health.physical + healthRoutine - healthPressure - safeDays * 0.04);
    state.health.sleepQuality = game.clamp(state.health.sleepQuality + state.player.habits.sleepRoutine * 0.02 - state.needs.stress * 0.01);
    state.health.nutrition = game.clamp(state.health.nutrition - Math.max(0, state.economy.costOfLivingIndex - 55) * 0.01 + state.finance.confidence * 0.006);
    state.health.illnessRisk = game.clamp(state.health.illnessRisk + safeDays * 0.08 + state.needs.stress * 0.008 - state.health.recovery * 0.02 - state.health.medicalAccess * 0.012);
    state.health.recovery = game.clamp(state.health.recovery + state.health.sleepQuality * 0.01 - state.career.burnoutRisk * 0.01);
    state.mentalWellbeing.burnoutRisk = game.clamp(state.mentalWellbeing.burnoutRisk + state.career.burnoutRisk * 0.04 + state.needs.stress * 0.02 - state.health.recovery * 0.02);
    state.mentalWellbeing.loneliness = game.clamp(state.mentalWellbeing.loneliness + state.relationships.neglectRisk * 0.02 - state.relationships.support * 0.02);
    state.mentalWellbeing.confidence = game.clamp(state.mentalWellbeing.confidence + state.progression.independenceIndex * 0.01 - Math.max(0, state.finance.debt - state.finance.savings) * 0.003);
    state.mentalWellbeing.happiness = game.clamp(state.mentalWellbeing.happiness + mentalSupport * 0.2 - mentalPressure * 0.2);
    state.mentalWellbeing.index = game.clamp(Math.round((state.mentalWellbeing.motivation + state.mentalWellbeing.resilience + state.mentalWellbeing.confidence + state.mentalWellbeing.happiness + (100 - state.mentalWellbeing.burnoutRisk) + (100 - state.mentalWellbeing.loneliness)) / 6));
    state.economy.costOfLivingIndex = game.clamp(state.economy.costOfLivingIndex + state.economy.inflation * safeDays * 0.015 + state.economy.consumerPressure * 0.004);
    state.economy.jobMarket = game.clamp(state.economy.jobMarket + state.economy.opportunityIndex * 0.006 - state.economy.inflation * 0.02);
    state.economy.consumerPressure = game.clamp(state.economy.consumerPressure + state.economy.costOfLivingIndex * 0.006 - state.finance.confidence * 0.01);
    if (game.refreshWorldEconomyLabel) game.refreshWorldEconomyLabel(state);
    if (game.recalculateCreditScore) game.recalculateCreditScore(state);
    const npcSummaries = game.simulateNPCs ? game.simulateNPCs(state, safeDays) : [];
    state.progression.independenceIndex = game.clamp(state.progression.independenceIndex + state.player.habits.budgeting * 0.01 + state.player.habits.reflection * 0.01 + state.career.readiness * 0.002);
    const xpGained = game.updateProgressionFromFastForward ? game.updateProgressionFromFastForward(state, safeDays) : 0;

    const event = game.addEvent(state, {
      type: "fast-forward",
      title: `${safeDays} days later`,
      summary: `Life continued for ${safeDays} days. Costs, work, study, housing, transport, relationships, health, wellbeing, economy, and NPC routines shaped the outcome.`,
      systems: ["Time", "Finance", "Career", "Education", "Housing", "Transportation", "Relationships", "Health", "Mental wellbeing", "Economy", "World Simulation", "NPC Simulation", "Needs", "Progression"],
      consequences: [
        `Money changed from $${beforeMoney} to $${state.finance.money}.`,
        `Savings changed from $${beforeSavings} to $${state.finance.savings}; debt changed from $${beforeDebt} to $${state.finance.debt}.`,
        `Estimated costs: $${totalCost} ($${livingCost} daily life, $${rentCost} housing, $${commuteCost} transport, $${debtCost} debt pressure, $${insuranceCost} insurance premiums).`,
        (investments.bonds || investments.stocks || investments.property)
          ? `Investments: bonds $${investments.bonds}, stocks $${investments.stocks} (${stockGrowth >= 0 ? "+" : ""}${stockGrowth} this period), property $${investments.property}. Credit score is now ${state.finance.creditScore}.`
          : `No active investments yet. Credit score is ${state.finance.creditScore}.`,
        `Career readiness changed from ${beforeReadiness}/100 to ${state.career.readiness}/100.`,
        `Education progress changed from ${beforeEducation}/100 to ${state.education.qualificationProgress}/100.`,
        `Relationship support changed from ${beforeRelationships}/100 to ${state.relationships.support}/100.`,
        `Health changed from ${beforeHealth}/100 to ${state.health.physical}/100.`,
        `Mental wellbeing changed from ${beforeWellbeing}/100 to ${state.mentalWellbeing.index}/100.`,
        `Cost of living changed from ${beforeLivingCost}/100 to ${state.economy.costOfLivingIndex}/100.`,
        worldEvent ? `World event: ${worldEvent.title} - ${worldEvent.summary}` : "World conditions continued without a major event.",
        `Progression moved from level ${beforeLevel} to level ${state.progression.lifeLevel}, gaining ${xpGained} XP.`,
        `Stress changed from ${beforeStress}/100 to ${state.needs.stress}/100.`,
        ...(npcSummaries.length ? npcSummaries.slice(0, 2) : ["NPC routines continued in the district."])
      ],
      reflection: "Which repeated habit created the biggest long-term effect?"
    });

    const report = game.generateLifeReport ? game.generateLifeReport(state, {
      type: "fast-forward",
      days: safeDays,
      livingCost: totalCost,
      worldEvent,
      xpGained
    }) : null;

    return { state, event, report };
  }

  game.fastForward = fastForward;
})();
