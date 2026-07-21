(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  // Player Interventions (bible S18.11): certain mid-Fast-Forward events are
  // significant enough that the simulation should pause and let the player
  // decide, rather than resolving them automatically. Conditions are driven
  // by current state (not pure randomness) - the first eligible entry (in
  // priority order) wins, gated by a cooldown so the same Fast Forward call
  // can't spam the player with back-to-back pauses.
  const INTERVENTION_COOLDOWN_DAYS = 20;
  const MIN_DAYS_FOR_INTERVENTION = 10;

  const INTERVENTIONS = [
    {
      id: "family-emergency",
      title: "A family emergency",
      prompt: "A relative needs urgent help. It will cost you time and money either way - the question is how much of each.",
      condition: (state) => state.relationships.family <= 55 || state.needs.stress >= 65,
      choices: [
        {
          id: "help-in-person",
          label: "Drop everything to help",
          description: "Show up in person. Costs money and career momentum, but the relationship matters more right now.",
          effect: (state) => {
            state.finance.money = Math.max(0, Math.round(state.finance.money - 150));
            state.relationships.family = game.clamp(state.relationships.family + 15);
            state.relationships.support = game.clamp(state.relationships.support + 6);
            state.career.readiness = game.clamp(state.career.readiness - 6);
            state.mentalWellbeing.purposeClarity = game.clamp(state.mentalWellbeing.purposeClarity + 5);
          }
        },
        {
          id: "help-remotely",
          label: "Send support from a distance",
          description: "Help with money and calls, but keep your own routine on track.",
          effect: (state) => {
            state.finance.money = Math.max(0, Math.round(state.finance.money - 60));
            state.relationships.family = game.clamp(state.relationships.family + 6);
            state.career.readiness = game.clamp(state.career.readiness - 1);
          }
        }
      ]
    },
    {
      id: "promotion-opportunity",
      title: "A promotion opportunity",
      prompt: "Your manager offers you a step up - more responsibility and pay, but a heavier workload while you settle in.",
      condition: (state) => state.career.readiness >= 55 && state.career.performance >= 50,
      choices: [
        {
          id: "accept-promotion",
          label: "Accept the promotion",
          description: "Take it. Higher income and reputation, more pressure and burnout risk for a while.",
          effect: (state) => {
            state.career.incomePerShift = Math.round(state.career.incomePerShift * 1.25);
            state.career.performance = game.clamp(state.career.performance - 8);
            state.career.burnoutRisk = game.clamp(state.career.burnoutRisk + 10);
            state.career.readiness = game.clamp(state.career.readiness - 15);
            state.career.reputation = game.clamp(state.career.reputation + 12);
            state.progression.independenceIndex = game.clamp(state.progression.independenceIndex + 4);
          }
        },
        {
          id: "decline-promotion",
          label: "Decline for now",
          description: "Stay steady. Protect your energy and current routine.",
          effect: (state) => {
            state.needs.stress = game.clamp(state.needs.stress - 6);
            state.career.readiness = game.clamp(state.career.readiness + 6);
            state.mentalWellbeing.motivation = game.clamp(state.mentalWellbeing.motivation - 3);
          }
        }
      ]
    },
    {
      id: "out-of-town-job-offer",
      title: "A job offer in another city",
      prompt: "A recruiter offers a role in another city - better pay, but it means leaving your current home and community behind.",
      condition: (state) => state.career.readiness >= 45 && state.economy.opportunityIndex >= 55,
      choices: [
        {
          id: "relocate",
          label: "Take the offer and relocate",
          description: "A bigger paycheck, but you start over somewhere new.",
          effect: (state) => {
            state.career.incomePerShift = Math.round(state.career.incomePerShift * 1.35);
            state.housing.stability = game.clamp(state.housing.stability - 20);
            state.housing.satisfaction = game.clamp(state.housing.satisfaction - 15);
            state.relationships.family = game.clamp(state.relationships.family - 12);
            state.relationships.friends = game.clamp(state.relationships.friends - 10);
            state.npcSimulation.communityTrust = game.clamp(state.npcSimulation.communityTrust - 8);
            state.progression.independenceIndex = game.clamp(state.progression.independenceIndex + 6);
          }
        },
        {
          id: "stay-put",
          label: "Turn it down and stay",
          description: "Keep your community and routine intact.",
          effect: (state) => {
            state.relationships.family = game.clamp(state.relationships.family + 5);
            state.relationships.friends = game.clamp(state.relationships.friends + 4);
            state.housing.stability = game.clamp(state.housing.stability + 3);
            state.career.readiness = game.clamp(state.career.readiness + 3);
          }
        }
      ]
    },
    {
      id: "investment-opportunity",
      title: "A significant investment opportunity",
      prompt: "A friend tells you about a promising investment window. It could pay off, or it could not.",
      condition: (state) => state.finance.savings >= 400 || state.finance.money >= 700,
      choices: [
        {
          id: "invest-portion",
          label: "Invest a portion of your savings",
          description: "Move some savings into stocks for growth potential.",
          effect: (state) => {
            const amount = Math.max(0, Math.round(Math.min(state.finance.savings * 0.35, 600)));
            state.finance.savings = Math.max(0, state.finance.savings - amount);
            const investments = state.finance.investments || { bonds: 0, stocks: 0, property: 0 };
            investments.stocks = Math.max(0, investments.stocks + amount);
            state.finance.investments = investments;
            state.finance.confidence = game.clamp(state.finance.confidence + 4);
          }
        },
        {
          id: "pass-on-it",
          label: "Pass on it",
          description: "Keep your savings steady and liquid.",
          effect: (state) => {
            state.finance.confidence = game.clamp(state.finance.confidence + 2);
            state.needs.stress = game.clamp(state.needs.stress - 2);
          }
        }
      ]
    }
  ];

  function findEligibleIntervention(state) {
    return INTERVENTIONS.find((intervention) => intervention.condition(state)) || null;
  }

  function maybeTriggerIntervention(state, safeDays) {
    if (state.simulation.pendingIntervention) return null;
    if (safeDays < MIN_DAYS_FOR_INTERVENTION) return null;
    const lastDay = Number(state.simulation.lastInterventionDay || 0);
    if (lastDay > 0 && state.time.day - lastDay < INTERVENTION_COOLDOWN_DAYS) return null;
    const intervention = findEligibleIntervention(state);
    if (!intervention) return null;
    const triggerDay = Math.max(3, Math.round(safeDays * 0.4));
    const remainingDays = safeDays - triggerDay;
    if (remainingDays < 3) return null;
    return { intervention, triggerDay, remainingDays };
  }

  function captureBeforeSnapshot(state) {
    return {
      money: state.finance.money,
      savings: state.finance.savings,
      debt: state.finance.debt,
      readiness: state.career.readiness,
      education: state.education.qualificationProgress,
      stress: state.needs.stress,
      relationships: state.relationships.support,
      health: state.health.physical,
      wellbeing: state.mentalWellbeing.index,
      livingCost: state.economy.costOfLivingIndex,
      level: state.progression.lifeLevel
    };
  }

  // All of the actual per-day simulation math, extracted so it can run once
  // (no intervention) or twice (before/after a Player Intervention pause)
  // while advancing a consistent total number of days either way.
  function applyFastForwardChunk(state, chunkDays) {
    const worldEvent = game.updateWorldConditions ? game.updateWorldConditions(state, chunkDays, { record: false }) : null;
    const inflationMultiplier = 1 + (Number(state.economy.inflation || 0) / 100) * (chunkDays / 30);
    const livingCost = Math.round(chunkDays * Number(state.finance.dailyLivingCost || 18) * inflationMultiplier);
    const rentCost = Math.round((Number(state.housing.monthlyCost || 0) / 30) * chunkDays);
    // Lease rent shortfall (bible-consistent with the crime/consequence work
    // this session): before this chunk's lump cost deduction quietly turns
    // an unaffordable rent into more debt, a real, felt housing consequence
    // fires first - missing rent should cost more than money, and a lease
    // that keeps getting missed should eventually risk eviction.
    if (state.housing.lease && state.housing.lease.active) {
      if (state.finance.money < rentCost) {
        state.housing.lease.missedPayments += 1;
        state.housing.lease.landlordRelationship = game.clamp(state.housing.lease.landlordRelationship - 15);
        state.housing.lease.evictionRisk = game.clamp(state.housing.lease.evictionRisk + 25);
        if (game.addEvent) {
          game.addEvent(state, {
            type: "housing",
            title: "Missed a rent payment",
            summary: "You couldn't cover rent this period.",
            systems: ["Housing"],
            consequences: [`Landlord relationship is now ${state.housing.lease.landlordRelationship}/100.`, `Eviction risk is now ${state.housing.lease.evictionRisk}/100.`],
            reflection: "What would need to change before the next payment is due?"
          });
        }
      } else {
        state.housing.lease.landlordRelationship = game.clamp(state.housing.lease.landlordRelationship + 2);
        state.housing.lease.evictionRisk = game.clamp(state.housing.lease.evictionRisk - 5);
      }
    }
    // Vehicle loan payment - same shape as the lease block above, checked
    // against the loan's own monthlyPayment rather than the general
    // transportation.monthlyCost (which nothing in Fast Forward actually
    // charges today - left untouched on purpose). Unlike rent (which was
    // already being deducted via the pre-existing rentCost/totalCost path
    // below), there was no existing mechanism charging the loan payment at
    // all - the "afford" branch must actually deduct it and pay down the
    // balance, or "financing a vehicle" would cost only the down payment
    // and then nothing, ever.
    if (state.transportation.loan && state.transportation.loan.active) {
      const loanPayment = Math.min(state.transportation.loan.monthlyPayment, state.transportation.vehicleLoanBalance);
      if (state.finance.money < loanPayment) {
        state.transportation.loan.missedPayments += 1;
        state.transportation.loan.repossessionRisk = game.clamp(state.transportation.loan.repossessionRisk + 25);
        if (game.addEvent) {
          game.addEvent(state, {
            type: "transportation",
            title: "Missed a vehicle loan payment",
            summary: "You couldn't cover the vehicle payment this period.",
            systems: ["Transportation"],
            consequences: [`Repossession risk is now ${state.transportation.loan.repossessionRisk}/100.`],
            reflection: "What would need to change before the next payment is due?"
          });
        }
      } else {
        state.finance.money = Math.max(0, Math.round(state.finance.money - loanPayment));
        state.finance.debt = Math.max(0, Math.round(state.finance.debt - loanPayment));
        state.transportation.vehicleLoanBalance = Math.max(0, Math.round(state.transportation.vehicleLoanBalance - loanPayment));
        state.transportation.loan.repossessionRisk = game.clamp(state.transportation.loan.repossessionRisk - 5);
        if (state.transportation.vehicleLoanBalance <= 0) {
          state.transportation.loan.active = false;
          state.transportation.monthlyCost = Math.max(0, Math.round(state.transportation.monthlyCost - 90));
          if (game.addAchievement) game.addAchievement(state, "vehicle-loan-paid-off", "Vehicle Loan Paid Off", "Paid off a real car loan, one payment at a time.");
          if (game.addEvent) {
            game.addEvent(state, {
              type: "transportation",
              title: "Vehicle loan paid off",
              summary: "The last payment cleared the balance.",
              systems: ["Transportation"],
              consequences: ["The vehicle is fully yours now - the monthly payment is gone."],
              reflection: "What will you do with the money that used to go to this payment?"
            });
          }
        }
        if (game.recalculateCreditScore) game.recalculateCreditScore(state);
      }
    }
    // Education program dropout risk - unlike the lease/loan, tuition here
    // is paid once in full at enrollment, so the risk driver is neglecting
    // coursework (studyConsistency staying low) rather than a missed
    // payment.
    if (state.education.program && state.education.program.active) {
      if (state.education.studyConsistency < 25) {
        state.education.program.dropoutRisk = game.clamp(state.education.program.dropoutRisk + chunkDays * 3);
      } else {
        state.education.program.dropoutRisk = game.clamp(state.education.program.dropoutRisk - chunkDays * 1.5);
      }
      if (state.education.program.dropoutRisk >= 50 && state.education.program.dropoutRisk - chunkDays * 3 < 50 && game.addEvent) {
        game.addEvent(state, {
          type: "education",
          title: "Falling behind on coursework",
          summary: "Study consistency has been too low for too long.",
          systems: ["Education"],
          consequences: [`Dropout risk is now ${state.education.program.dropoutRisk}/100.`],
          reflection: "What would it take to get back on track before the term ends?"
        });
      }
    }
    // Credit card statement due - a separate obligation layered on top of
    // the existing general debtCost/debtGrowth interest accrual below (not
    // a second interest charge), gated by an explicit 30-day due-date rather
    // than checked every chunk like rent/loan. Counted as elapsed cycles
    // (not a single point-in-time check) so a single long Fast Forward span
    // still processes every statement that would have come due along the
    // way, not just the last one - capped at 6 cycles per call so an
    // extreme multi-year jump can't spam dozens of events at once.
    const creditCard = state.finance.creditCard;
    if (creditCard && state.finance.debt > 0) {
      const dayAfterChunk = state.time.day + chunkDays;
      const cyclesElapsed = Math.min(6, Math.floor((dayAfterChunk - creditCard.lastStatementDay) / 30));
      for (let cycle = 0; cycle < cyclesElapsed; cycle++) {
        const minimumPayment = Math.max(30, Math.round(state.finance.debt * 0.03));
        if (state.finance.money < minimumPayment) {
          creditCard.missedPayments += 1;
          creditCard.collectionsRisk = game.clamp(creditCard.collectionsRisk + 20);
          if (game.addEvent) {
            game.addEvent(state, {
              type: "finance",
              title: "Missed a credit card statement",
              summary: "You couldn't cover the minimum payment this cycle.",
              systems: ["Finance"],
              consequences: [`Collections risk is now ${creditCard.collectionsRisk}/100.`],
              reflection: "What would need to change before the next statement is due?"
            });
          }
        } else {
          state.finance.money = Math.max(0, Math.round(state.finance.money - minimumPayment));
          state.finance.debt = Math.max(0, Math.round(state.finance.debt - minimumPayment));
          creditCard.collectionsRisk = game.clamp(creditCard.collectionsRisk - 10);
        }
        creditCard.lastStatementDay += 30;
      }
      if (cyclesElapsed > 0 && game.recalculateCreditScore) game.recalculateCreditScore(state);
    }
    const commuteCost = Math.round(chunkDays * 0.65 * Number(state.transportation.costPerCommute || 4));
    const debtCost = Math.round((Number(state.finance.debt || 0) * ((Number(state.economy.interestRate || 0) + 2) / 100) / 30) * chunkDays);
    const insurance = state.finance.insurance || {};
    const insuranceCost = Math.round(chunkDays * ((insurance.health ? 1.2 : 0) + (insurance.home ? 0.8 : 0) + (insurance.vehicle ? 1.5 : 0)));
    const totalCost = livingCost + rentCost + commuteCost + debtCost + insuranceCost;
    const worldPressure = state.worldSimulation.jobMarketPressure * 0.01 + state.worldSimulation.housingMarketPressure * 0.006 + Math.max(0, 65 - state.worldSimulation.publicHealthCondition) * 0.006;
    const opportunityLift = state.worldSimulation.educationOpportunityLevel * 0.008 + state.economy.opportunityIndex * 0.006;
    const studyGrowth = (state.education.studyConsistency + state.player.habits.studyConsistency) * chunkDays * 0.006 + opportunityLift * chunkDays * 0.08;
    const careerGrowth = Math.max(0, (state.career.performance + state.career.readiness + state.player.skills.career) * chunkDays * 0.004 - worldPressure * chunkDays * 0.12);
    const commutePressure = (state.transportation.commuteStress + Math.max(0, state.housing.commuteMinutes - 30)) * chunkDays * 0.008;
    const housingRecovery = (state.housing.comfort + state.housing.safety + state.housing.maintenance) * chunkDays * 0.003;
    const relationshipDecay = Math.max(0, chunkDays * 0.18 - state.relationships.support * 0.01 - state.player.skills.social * 0.02);
    const healthRoutine = state.health.sleepQuality * 0.01 + state.health.nutrition * 0.01 + state.health.activity * 0.008 + state.health.recovery * 0.006;
    const healthPressure = state.needs.stress * 0.008 + state.health.illnessRisk * 0.01 + state.career.burnoutRisk * 0.006;
    const mentalSupport = state.relationships.support * 0.012 + state.mentalWellbeing.resilience * 0.012 + state.needs.purpose * 0.01;
    const mentalPressure = state.needs.stress * 0.012 + state.mentalWellbeing.loneliness * 0.01 + state.career.burnoutRisk * 0.008;

    if (game.advanceDays) game.advanceDays(state, chunkDays, "Fast Forward");
    state.finance.money = Math.round(state.finance.money - totalCost);
    const savingsGrowth = Math.round(state.finance.savings * Math.max(0, state.economy.interestRate) / 100 * (chunkDays / 365));
    const debtGrowth = Math.round(state.finance.debt * Math.max(0, state.economy.interestRate + 2) / 100 * (chunkDays / 365));
    state.finance.savings = Math.max(0, Math.round(state.finance.savings + savingsGrowth));
    state.finance.debt = Math.max(0, Math.round(state.finance.debt + debtGrowth));
    const investments = state.finance.investments || { bonds: 0, stocks: 0, property: 0 };
    const bondsGrowth = Math.round(investments.bonds * 0.045 * (chunkDays / 365));
    const propertyGrowth = Math.round(investments.property * 0.06 * (chunkDays / 365));
    const stockSeed = Math.sin(state.time.day * 12.9898 + chunkDays * 78.233) * 43758.5453;
    const stockVariance = (stockSeed - Math.floor(stockSeed)) * 2 - 1;
    const stockGrowth = Math.round(investments.stocks * (0.03 + stockVariance * 0.14) * (chunkDays / 365));
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
    state.needs.energy = game.clamp(state.needs.energy - chunkDays * 0.7);
    state.needs.hunger = game.clamp(state.needs.hunger - chunkDays * 0.5);
    state.needs.sleep = game.clamp(state.needs.sleep - chunkDays * 0.45);
    state.needs.stress = game.clamp(state.needs.stress + chunkDays * 0.35 + state.career.burnoutRisk * 0.03 + commutePressure - housingRecovery * 0.1);
    state.health.physical = game.clamp(state.health.physical - chunkDays * 0.12 + state.player.habits.exercise * 0.01);
    state.mentalWellbeing.motivation = game.clamp(state.mentalWellbeing.motivation - chunkDays * 0.08 + state.player.habits.reflection * 0.02 + state.needs.purpose * 0.002);
    state.career.readiness = game.clamp(state.career.readiness + careerGrowth + state.player.habits.studyConsistency * 0.02);
    state.career.burnoutRisk = game.clamp(state.career.burnoutRisk + chunkDays * 0.08 + state.needs.stress * 0.01 - state.player.habits.sleepRoutine * 0.01);
    state.career.performance = game.clamp(state.career.performance + state.player.capability.discipline * 0.01 - state.career.burnoutRisk * 0.01);
    // Job loss (bible S16.9 "NPCs may... lose employment"): driven by sustained
    // burnout and poor performance, not pure chance - a deterministic seeded
    // roll (like the stock-growth variance above) keeps it reproducible.
    if (state.career.employed && state.career.burnoutRisk > 82 && state.career.performance < 28) {
      const layoffSeed = Math.sin(state.time.day * 45.164 + chunkDays * 3.14159) * 10000;
      const layoffRoll = layoffSeed - Math.floor(layoffSeed);
      if (layoffRoll < 0.35) {
        state.career.employed = false;
        state.career.status = "Unemployed";
        state.career.currentJob = null;
        state.career.burnoutRisk = game.clamp(state.career.burnoutRisk - 15);
      }
    }
    // Eviction (same deterministic seeded-roll shape as the layoff roll
    // above): only becomes possible once eviction risk has genuinely built
    // up from repeated missed payments, not from a single bad chunk. Uses
    // an explicit `evicted` flag rather than if/else-if against the renewal
    // check below - with if/else-if, a chunk where risk was high enough to
    // roll but the roll happened to miss would silently skip the renewal
    // check too (even though nothing actually happened), permanently
    // stalling a lease whose term had already ended.
    let evicted = false;
    if (state.housing.lease && state.housing.lease.active && state.housing.lease.evictionRisk >= 70) {
      const evictionSeed = Math.sin(state.time.day * 63.271 + chunkDays * 2.71828) * 10000;
      const evictionRoll = evictionSeed - Math.floor(evictionSeed);
      if (evictionRoll < 0.3) {
        evicted = true;
        state.housing.lease.active = false;
        state.housing.type = "Emergency temporary housing";
        state.housing.selectedOption = "emergency-temporary";
        state.housing.monthlyCost = 0;
        state.housing.stability = game.clamp(state.housing.stability - 30);
        state.housing.comfort = game.clamp(state.housing.comfort - 25);
        state.housing.satisfaction = game.clamp(state.housing.satisfaction - 25);
        state.housing.affordability = game.clamp(state.housing.affordability - 15);
        if (game.addEvent) {
          game.addEvent(state, {
            type: "housing",
            title: "Evicted",
            summary: "Missed rent finally caught up with you.",
            systems: ["Housing"],
            consequences: ["The lease is over. You're back to emergency temporary housing.", `Housing stability is now ${state.housing.stability}/100.`],
            reflection: "Looking back, when was the moment this became unavoidable?"
          });
        }
      }
    }
    if (!evicted && state.housing.lease && state.housing.lease.active && state.time.day >= state.housing.lease.endsDay) {
      // Term expiry auto-renews for now (no explicit renew/move-out choice
      // yet) but rent tracks the real local housing market pressure instead
      // of staying frozen, and it's narrated rather than a silent change.
      const marketAdjustment = Math.round(state.housing.monthlyCost * (state.worldSimulation.housingMarketPressure - 50) * 0.002);
      state.housing.monthlyCost = Math.max(150, state.housing.monthlyCost + marketAdjustment);
      state.housing.lease.termDays = 180;
      state.housing.lease.startedDay = state.time.day;
      state.housing.lease.endsDay = state.time.day + 180;
      if (game.addEvent) {
        game.addEvent(state, {
          type: "housing",
          title: "Lease renewed",
          summary: "Your lease term ended and renewed automatically.",
          systems: ["Housing"],
          consequences: [`Rent is now $${state.housing.monthlyCost}/month.`],
          reflection: marketAdjustment > 0 ? "The market pushed your rent up - does the budget still work?" : "Rent eased slightly - what will you do with the difference?"
        });
      }
    }
    // Repossession - same deterministic seeded-roll shape as eviction, with
    // its own unused multiplier pair, only possible once missed vehicle
    // payments have genuinely built up real risk.
    if (state.transportation.loan && state.transportation.loan.active && state.transportation.loan.repossessionRisk >= 70) {
      const repoSeed = Math.sin(state.time.day * 81.443 + chunkDays * 1.61803) * 10000;
      const repoRoll = repoSeed - Math.floor(repoSeed);
      if (repoRoll < 0.3) {
        state.transportation.loan.active = false;
        state.transportation.ownsVehicle = false;
        state.transportation.vehicleLoanBalance = 0;
        state.transportation.monthlyCost = Math.max(0, Math.round(state.transportation.monthlyCost - 90));
        state.transportation.mode = "MRT and bus";
        state.transportation.selectedMode = "public-transport";
        if (game.recalculateCreditScore) game.recalculateCreditScore(state);
        if (game.addEvent) {
          game.addEvent(state, {
            type: "transportation",
            title: "Vehicle repossessed",
            summary: "Missed payments finally caught up with the loan.",
            systems: ["Transportation"],
            consequences: ["The vehicle is gone, but the debt isn't - you're back on public transport."],
            reflection: "Looking back, when was the moment this became unavoidable?"
          });
        }
      }
    }
    // Dropping out - same deterministic seeded-roll shape, its own unused
    // multiplier pair, only possible once dropout risk has genuinely built
    // up from sustained neglect. Uses an explicit `droppedOut` flag for the
    // same reason as the eviction/renewal pair above - a high-risk chunk
    // whose roll happens to miss must not silently block graduation if the
    // term also ended that same chunk.
    let droppedOut = false;
    if (state.education.program && state.education.program.active && state.education.program.dropoutRisk >= 70) {
      const dropoutSeed = Math.sin(state.time.day * 24.899 + chunkDays * 5.926) * 10000;
      const dropoutRoll = dropoutSeed - Math.floor(dropoutSeed);
      if (dropoutRoll < 0.3) {
        droppedOut = true;
        state.education.program.active = false;
        state.education.qualificationProgress = game.clamp(state.education.qualificationProgress - 20);
        state.education.studyConsistency = game.clamp(state.education.studyConsistency - 10);
        state.education.path = "Dropped out of a formal program";
        if (game.addEvent) {
          game.addEvent(state, {
            type: "education",
            title: "Dropped out",
            summary: "Sustained neglect of coursework finally ended the program.",
            systems: ["Education"],
            consequences: ["The program is over without a qualification.", `Qualification progress is now ${state.education.qualificationProgress}/100.`],
            reflection: "Looking back, when was the moment this became unavoidable?"
          });
        }
      }
    }
    if (!droppedOut && state.education.program && state.education.program.active && state.time.day >= state.education.program.endsDay) {
      // Graduation - the term ended while the program was still active
      // (never dropped out), a real completed milestone.
      state.education.program.active = false;
      state.education.program.completedCount = (state.education.program.completedCount || 0) + 1;
      state.education.qualificationProgress = game.clamp(state.education.qualificationProgress + 30);
      state.education.path = "Graduated from a formal program";
      if (game.addAchievement) game.addAchievement(state, "graduated-program", "Graduated", "Completed a real qualification program, tuition and term and all.");
      if (game.addMilestone) game.addMilestone(state, "Graduated a program", "Finished what was started - a real qualification, not just progress.");
      if (game.addEvent) {
        game.addEvent(state, {
          type: "education",
          title: "Graduated",
          summary: "The program term ended and you finished it.",
          systems: ["Education"],
          consequences: [`Qualification progress is now ${state.education.qualificationProgress}/100.`],
          reflection: "What did finishing this actually change about what's possible next?"
        });
      }
    }
    // Sent to collections - same deterministic seeded-roll shape, its own
    // unused multiplier pair, only possible once missed statements have
    // genuinely built up real risk.
    if (state.finance.creditCard && state.finance.creditCard.collectionsRisk >= 70) {
      const collectionsSeed = Math.sin(state.time.day * 38.017 + chunkDays * 9.42477) * 10000;
      const collectionsRoll = collectionsSeed - Math.floor(collectionsSeed);
      if (collectionsRoll < 0.3) {
        const collectionsFee = 120;
        state.finance.debt = Math.max(0, Math.round(state.finance.debt + collectionsFee));
        state.finance.confidence = game.clamp(state.finance.confidence - 15);
        state.finance.creditCard.collectionsRisk = game.clamp(state.finance.creditCard.collectionsRisk - 30);
        if (game.recalculateCreditScore) game.recalculateCreditScore(state);
        if (game.addEvent) {
          game.addEvent(state, {
            type: "finance",
            title: "Sent to collections",
            summary: "Missed statements finally caught up with the account.",
            systems: ["Finance"],
            consequences: [`A $${collectionsFee} collections fee was added to the debt.`, `Debt is now $${state.finance.debt}.`],
            reflection: "Looking back, when was the moment this became unavoidable?"
          });
        }
      }
    }
    if (game.decayLegalHeat) game.decayLegalHeat(state, chunkDays * 24);
    // Detention is served passively during Fast Forward (there's no "do
    // nothing" activity to click through it with) - career and relationships
    // quietly erode in the background for its duration, the same way
    // burnout-triggered layoffs above resolve automatically rather than
    // needing a player action.
    if (game.isInDetention && game.isInDetention(state)) {
      state.career.readiness = game.clamp(state.career.readiness - chunkDays * 0.5);
      state.relationships.support = game.clamp(state.relationships.support - chunkDays * 0.3);
    }
    state.education.qualificationProgress = game.clamp(state.education.qualificationProgress + studyGrowth);
    state.education.studyConsistency = game.clamp(state.education.studyConsistency + state.player.habits.studyConsistency * 0.01 - chunkDays * 0.01);
    state.finance.confidence = game.clamp(state.finance.confidence + state.player.habits.budgeting * 0.02 - Math.max(0, state.finance.debt - state.finance.savings) * 0.002);
    state.career.incomePerShift = Math.max(40, Math.round(state.career.incomePerShift + state.economy.wageGrowth * chunkDays * 0.01 + Math.max(0, state.economy.jobMarket - 50) * 0.003));
    state.housing.comfort = game.clamp(state.housing.comfort + state.housing.maintenance * 0.01 - chunkDays * 0.03);
    state.housing.stability = game.clamp(state.housing.stability - state.worldSimulation.housingMarketPressure * chunkDays * 0.004 + state.finance.confidence * 0.01);
    state.housing.affordability = game.clamp(state.housing.affordability - state.worldSimulation.housingMarketPressure * chunkDays * 0.004 + state.finance.confidence * 0.012);
    state.housing.maintenance = game.clamp(state.housing.maintenance - chunkDays * 0.12);
    const utilitiesOverdueDays = Math.max(0, state.time.day - state.housing.lastUtilityPaidDay - 45);
    if (utilitiesOverdueDays > 0) {
      state.housing.comfort = game.clamp(state.housing.comfort - Math.min(chunkDays, utilitiesOverdueDays) * 0.15);
      state.needs.hygiene = game.clamp(state.needs.hygiene - Math.min(chunkDays, utilitiesOverdueDays) * 0.2);
    }
    state.transportation.commuteStress = game.clamp(state.transportation.commuteStress + Math.max(0, state.housing.commuteMinutes - 35) * 0.03 - state.transportation.reliability * 0.01);
    state.transportation.reliability = game.clamp(state.transportation.reliability - Math.max(0, 55 - state.worldSimulation.transportationReliability) * chunkDays * 0.003);
    let vehicleRepairCost = 0;
    if (state.transportation.ownsVehicle) {
      state.transportation.vehicleMaintenance = game.clamp(state.transportation.vehicleMaintenance - chunkDays * 0.2);
      if (state.transportation.vehicleMaintenance < 30) {
        vehicleRepairCost = Math.round(60 + (30 - state.transportation.vehicleMaintenance) * 3);
        state.finance.money = Math.max(0, Math.round(state.finance.money - vehicleRepairCost));
        state.transportation.vehicleMaintenance = game.clamp(state.transportation.vehicleMaintenance + 35);
        state.transportation.reliability = game.clamp(state.transportation.reliability - 8);
      }
    }
    state.relationships.support = game.clamp(state.relationships.support - relationshipDecay + state.npcSimulation.communityTrust * 0.005);
    state.relationships.friends = game.clamp(state.relationships.friends - relationshipDecay);
    state.relationships.family = game.clamp(state.relationships.family - chunkDays * 0.08 + state.housing.comfort * 0.004);
    state.relationships.neglectRisk = game.clamp(state.relationships.neglectRisk + chunkDays * 0.16 - state.relationships.communication * 0.02);
    state.health.physical = game.clamp(state.health.physical + healthRoutine - healthPressure - chunkDays * 0.04);
    state.health.sleepQuality = game.clamp(state.health.sleepQuality + state.player.habits.sleepRoutine * 0.02 - state.needs.stress * 0.01);
    state.health.nutrition = game.clamp(state.health.nutrition - Math.max(0, state.economy.costOfLivingIndex - 55) * 0.01 + state.finance.confidence * 0.006);
    state.health.illnessRisk = game.clamp(state.health.illnessRisk + chunkDays * 0.08 + state.needs.stress * 0.008 - state.health.recovery * 0.02 - state.health.medicalAccess * 0.012);
    state.health.recovery = game.clamp(state.health.recovery + state.health.sleepQuality * 0.01 - state.career.burnoutRisk * 0.01);
    state.mentalWellbeing.burnoutRisk = game.clamp(state.mentalWellbeing.burnoutRisk + state.career.burnoutRisk * 0.04 + state.needs.stress * 0.02 - state.health.recovery * 0.02);
    state.mentalWellbeing.loneliness = game.clamp(state.mentalWellbeing.loneliness + state.relationships.neglectRisk * 0.02 - state.relationships.support * 0.02);
    state.mentalWellbeing.confidence = game.clamp(state.mentalWellbeing.confidence + state.progression.independenceIndex * 0.01 - Math.max(0, state.finance.debt - state.finance.savings) * 0.003);
    state.mentalWellbeing.happiness = game.clamp(state.mentalWellbeing.happiness + mentalSupport * 0.2 - mentalPressure * 0.2);
    state.mentalWellbeing.index = game.clamp(Math.round((state.mentalWellbeing.motivation + state.mentalWellbeing.resilience + state.mentalWellbeing.confidence + state.mentalWellbeing.happiness + (100 - state.mentalWellbeing.burnoutRisk) + (100 - state.mentalWellbeing.loneliness)) / 6));
    state.economy.costOfLivingIndex = game.clamp(state.economy.costOfLivingIndex + state.economy.inflation * chunkDays * 0.015 + state.economy.consumerPressure * 0.004);
    state.economy.jobMarket = game.clamp(state.economy.jobMarket + state.economy.opportunityIndex * 0.006 - state.economy.inflation * 0.02);
    state.economy.consumerPressure = game.clamp(state.economy.consumerPressure + state.economy.costOfLivingIndex * 0.006 - state.finance.confidence * 0.01);
    if (game.refreshWorldEconomyLabel) game.refreshWorldEconomyLabel(state);
    if (game.recalculateCreditScore) game.recalculateCreditScore(state);
    const npcSummaries = game.simulateNPCs ? game.simulateNPCs(state, chunkDays) : [];
    state.progression.independenceIndex = game.clamp(state.progression.independenceIndex + state.player.habits.budgeting * 0.01 + state.player.habits.reflection * 0.01 + state.career.readiness * 0.002);
    const xpGained = game.updateProgressionFromFastForward ? game.updateProgressionFromFastForward(state, chunkDays) : 0;

    return { worldEvent, totalCost, livingCost, rentCost, commuteCost, debtCost, insuranceCost, investments, stockGrowth, npcSummaries, xpGained };
  }

  function mergeChunkMetrics(chunks) {
    return chunks.reduce((merged, chunk) => ({
      worldEvent: chunk.worldEvent || merged.worldEvent,
      totalCost: merged.totalCost + chunk.totalCost,
      livingCost: merged.livingCost + chunk.livingCost,
      rentCost: merged.rentCost + chunk.rentCost,
      commuteCost: merged.commuteCost + chunk.commuteCost,
      debtCost: merged.debtCost + chunk.debtCost,
      insuranceCost: merged.insuranceCost + chunk.insuranceCost,
      investments: chunk.investments || merged.investments,
      stockGrowth: merged.stockGrowth + chunk.stockGrowth,
      npcSummaries: [...merged.npcSummaries, ...chunk.npcSummaries],
      xpGained: merged.xpGained + chunk.xpGained
    }), { worldEvent: null, totalCost: 0, livingCost: 0, rentCost: 0, commuteCost: 0, debtCost: 0, insuranceCost: 0, investments: null, stockGrowth: 0, npcSummaries: [], xpGained: 0 });
  }

  function buildFastForwardResult(state, safeDays, before, chunks, interventionNote) {
    const metrics = mergeChunkMetrics(chunks);
    const { worldEvent, totalCost, livingCost, rentCost, commuteCost, debtCost, insuranceCost, investments, stockGrowth, npcSummaries, xpGained } = metrics;

    const consequences = [
      `Money changed from $${before.money} to $${state.finance.money}.`,
      `Savings changed from $${before.savings} to $${state.finance.savings}; debt changed from $${before.debt} to $${state.finance.debt}.`,
      `Estimated costs: $${totalCost} ($${livingCost} daily life, $${rentCost} housing, $${commuteCost} transport, $${debtCost} debt pressure, $${insuranceCost} insurance premiums).`,
      (investments && (investments.bonds || investments.stocks || investments.property))
        ? `Investments: bonds $${investments.bonds}, stocks $${investments.stocks} (${stockGrowth >= 0 ? "+" : ""}${stockGrowth} this period), property $${investments.property}. Credit score is now ${state.finance.creditScore}.`
        : `No active investments yet. Credit score is ${state.finance.creditScore}.`,
      `Career readiness changed from ${before.readiness}/100 to ${state.career.readiness}/100.`,
      `Education progress changed from ${before.education}/100 to ${state.education.qualificationProgress}/100.`,
      `Relationship support changed from ${before.relationships}/100 to ${state.relationships.support}/100.`,
      `Health changed from ${before.health}/100 to ${state.health.physical}/100.`,
      `Mental wellbeing changed from ${before.wellbeing}/100 to ${state.mentalWellbeing.index}/100.`,
      `Cost of living changed from ${before.livingCost}/100 to ${state.economy.costOfLivingIndex}/100.`,
      worldEvent ? `World event: ${worldEvent.title} - ${worldEvent.summary}` : "World conditions continued without a major event.",
      `Progression moved from level ${before.level} to level ${state.progression.lifeLevel}, gaining ${xpGained} XP.`,
      `Stress changed from ${before.stress}/100 to ${state.needs.stress}/100.`,
      ...(interventionNote ? [interventionNote] : []),
      ...(npcSummaries.length ? npcSummaries.slice(0, 2) : ["NPC routines continued in the district."])
    ];

    const event = game.addEvent(state, {
      type: "fast-forward",
      title: `${safeDays} days later`,
      summary: `Life continued for ${safeDays} days. Costs, work, study, housing, transport, relationships, health, wellbeing, economy, and NPC routines shaped the outcome.`,
      systems: ["Time", "Finance", "Career", "Education", "Housing", "Transportation", "Relationships", "Health", "Mental wellbeing", "Economy", "World Simulation", "NPC Simulation", "Needs", "Progression"],
      consequences,
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

  function fastForward(state, days = 7) {
    const safeDays = Math.max(1, Math.min(1825, Math.round(Number(days) || 7)));
    const before = captureBeforeSnapshot(state);

    const trigger = maybeTriggerIntervention(state, safeDays);
    if (trigger) {
      const chunkResult = applyFastForwardChunk(state, trigger.triggerDay);
      state.simulation.lastInterventionDay = state.time.day;
      state.simulation.pendingIntervention = {
        id: trigger.intervention.id,
        title: trigger.intervention.title,
        prompt: trigger.intervention.prompt,
        choices: trigger.intervention.choices.map((choice) => ({ id: choice.id, label: choice.label, description: choice.description })),
        originalDays: safeDays,
        remainingDays: trigger.remainingDays,
        before,
        chunkMetrics: [chunkResult]
      };
      if (state.persistence) {
        state.persistence.dirty = true;
        state.persistence.dirtyDomains = [...new Set([...(state.persistence.dirtyDomains || []), "fastForward", "simulation"])];
      }
      return { state, pendingIntervention: state.simulation.pendingIntervention, event: null, report: null };
    }

    const chunkResult = applyFastForwardChunk(state, safeDays);
    return buildFastForwardResult(state, safeDays, before, [chunkResult]);
  }

  function resolveFastForwardIntervention(state, choiceId) {
    const pending = state.simulation.pendingIntervention;
    if (!pending) return { error: "There is no decision waiting to be resolved." };
    const intervention = INTERVENTIONS.find((entry) => entry.id === pending.id);
    const choice = intervention && intervention.choices.find((entry) => entry.id === choiceId);
    if (!choice) return { error: "That choice is not available." };

    choice.effect(state);
    const secondChunk = applyFastForwardChunk(state, pending.remainingDays);
    const interventionNote = `${pending.title}: you chose "${choice.label}".`;
    const result = buildFastForwardResult(state, pending.originalDays, pending.before, [...pending.chunkMetrics, secondChunk], interventionNote);
    state.simulation.pendingIntervention = null;
    return result;
  }

  game.fastForward = fastForward;
  game.resolveFastForwardIntervention = resolveFastForwardIntervention;
})();
