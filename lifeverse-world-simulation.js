(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  const worldEvents = [
    {
      id: "rent-pressure",
      title: "Rental demand rises",
      summary: "Housing demand increased rent pressure around the district.",
      effects: { housing: 7, inflation: 2, transport: 0, health: 0, social: -1, opportunity: 0 }
    },
    {
      id: "mrt-delay",
      title: "MRT reliability disruption",
      summary: "Transport delays made commuting less predictable this period.",
      effects: { housing: 0, inflation: 0, transport: -8, health: 0, social: -1, opportunity: -1 }
    },
    {
      id: "hiring-wave",
      title: "Entry-level hiring wave",
      summary: "More entry-level roles opened in nearby industries.",
      effects: { housing: 1, inflation: 0, transport: 0, health: 0, social: 1, opportunity: 8 }
    },
    {
      id: "public-health-alert",
      title: "Public health advisory",
      summary: "A minor health advisory reminded residents to protect recovery and hygiene.",
      effects: { housing: 0, inflation: 0, transport: 0, health: -8, social: -2, opportunity: 0 }
    },
    {
      id: "community-program",
      title: "Community programme expands",
      summary: "Local learning and volunteer activities increased social trust.",
      effects: { housing: 0, inflation: -1, transport: 1, health: 2, social: 8, opportunity: 3 }
    }
  ];

  function pickWorldEvent(state, days = 1) {
    const seed = Math.abs(Math.round((state.time.totalMinutes || 0) / 60 + state.time.day * 7 + days * 3));
    return worldEvents[seed % worldEvents.length];
  }

  // Community Events (bible S17.11): festivals, career fairs, farmers'
  // markets, sports events, cultural celebrations, and charity activities.
  // Distinct from the background worldEvents above - these are discrete,
  // optional opportunities the player can choose to join for a real reward,
  // not passive economic-climate flavour.
  const COMMUNITY_EVENT_TYPES = [
    {
      id: "neighbourhood-festival",
      title: "Neighbourhood festival",
      summary: "Stalls, music, and neighbours out enjoying the district together.",
      effects(state) {
        state.finance.money = Math.max(0, Math.round(state.finance.money - 15));
        state.needs.social = game.clamp(state.needs.social + 12);
        state.mentalWellbeing.happiness = game.clamp(state.mentalWellbeing.happiness + 6);
        state.npcSimulation.communityTrust = game.clamp(state.npcSimulation.communityTrust + 4);
      }
    },
    {
      id: "career-fair",
      title: "Community career fair",
      summary: "Local employers and training programmes set up booths for the day.",
      effects(state) {
        state.career.readiness = game.clamp(state.career.readiness + 5);
        state.career.reputation = game.clamp(state.career.reputation + 3);
        state.relationships.network = game.clamp(state.relationships.network + 4);
        state.economy.opportunityIndex = game.clamp(state.economy.opportunityIndex + 2);
      }
    },
    {
      id: "farmers-market",
      title: "Farmers' market",
      summary: "Fresh produce and local vendors fill the square this weekend.",
      effects(state) {
        state.finance.money = Math.max(0, Math.round(state.finance.money - 20));
        state.health.nutrition = game.clamp(state.health.nutrition + 8);
        state.relationships.support = game.clamp(state.relationships.support + 2);
      }
    },
    {
      id: "sports-event",
      title: "District sports event",
      summary: "A casual community sports day - open to anyone who wants to join in.",
      effects(state) {
        state.health.physical = game.clamp(state.health.physical + 6);
        state.health.activity = game.clamp(state.health.activity + 8);
        state.relationships.friends = game.clamp(state.relationships.friends + 5);
        state.mentalWellbeing.resilience = game.clamp(state.mentalWellbeing.resilience + 3);
      }
    },
    {
      id: "cultural-celebration",
      title: "Cultural celebration",
      summary: "A shared cultural celebration draws the whole neighbourhood out.",
      effects(state) {
        state.relationships.trust = game.clamp(state.relationships.trust + 5);
        state.npcSimulation.communityTrust = game.clamp(state.npcSimulation.communityTrust + 6);
        state.mentalWellbeing.happiness = game.clamp(state.mentalWellbeing.happiness + 5);
        state.mentalWellbeing.loneliness = game.clamp(state.mentalWellbeing.loneliness - 4);
      }
    },
    {
      id: "charity-drive",
      title: "Community charity drive",
      summary: "A local charity drive is collecting donations and volunteer time.",
      effects(state) {
        state.finance.money = Math.max(0, Math.round(state.finance.money - 30));
        state.mentalWellbeing.purposeClarity = game.clamp(state.mentalWellbeing.purposeClarity + 8);
        state.career.reputation = game.clamp(state.career.reputation + 2);
        state.npcSimulation.communityTrust = game.clamp(state.npcSimulation.communityTrust + 5);
      }
    }
  ];

  function pickCommunityEventType(state) {
    const seed = Math.abs(Math.round(state.time.day * 11 + (state.time.totalMinutes || 0) / 30));
    return COMMUNITY_EVENT_TYPES[seed % COMMUNITY_EVENT_TYPES.length];
  }

  function updateWorldConditions(state, days = 1, options = {}) {
    const safeDays = Math.max(1, Math.min(1825, Math.round(Number(days) || 1)));
    const event = options.event || pickWorldEvent(state, safeDays);
    const eventEffects = event.effects || {};
    const periodScale = Math.min(12, Math.max(1, safeDays / 30));
    const world = state.worldSimulation;

    world.inflationLevel = game.clamp(world.inflationLevel + state.economy.inflation * 0.6 * periodScale + eventEffects.inflation);
    world.jobMarketPressure = game.clamp(world.jobMarketPressure + Math.max(0, 55 - state.economy.jobMarket) * 0.06 * periodScale - eventEffects.opportunity);
    world.housingMarketPressure = game.clamp(world.housingMarketPressure + state.economy.costOfLivingIndex * 0.035 * periodScale + eventEffects.housing);
    world.transportationReliability = game.clamp(world.transportationReliability + eventEffects.transport - state.transportation.commuteStress * 0.02 * periodScale);
    world.educationOpportunityLevel = game.clamp(world.educationOpportunityLevel + eventEffects.opportunity + state.npcSimulation.studyCulture * 0.02 * periodScale);
    world.publicHealthCondition = game.clamp(world.publicHealthCondition + eventEffects.health - state.health.illnessRisk * 0.02 * periodScale);
    world.socialTrustLevel = game.clamp(world.socialTrustLevel + eventEffects.social + state.relationships.support * 0.02 * periodScale - state.relationships.neglectRisk * 0.03 * periodScale);
    world.districtActivityLevel = game.clamp(world.districtActivityLevel + state.npcSimulation.socialOpportunities * 0.02 * periodScale + eventEffects.opportunity * 0.3);
    world.economyClimate = world.inflationLevel > 70 || world.housingMarketPressure > 70 ? "High pressure" : world.jobMarketPressure > 65 ? "Competitive" : world.educationOpportunityLevel > 62 ? "Opportunity-rich" : "Stable";

    state.economy.inflation = game.clamp(Math.round(2 + world.inflationLevel / 10));
    state.economy.jobMarket = game.clamp(72 - world.jobMarketPressure * 0.55 + world.educationOpportunityLevel * 0.16);
    state.economy.costOfLivingIndex = game.clamp(state.economy.costOfLivingIndex + world.inflationLevel * 0.01 * periodScale + world.housingMarketPressure * 0.008 * periodScale);
    state.economy.opportunityIndex = game.clamp(state.economy.opportunityIndex + world.educationOpportunityLevel * 0.03 - world.jobMarketPressure * 0.02);
    state.finance.dailyLivingCost = Math.max(8, Math.round(state.finance.dailyLivingCost + world.inflationLevel * 0.003 * periodScale));
    state.career.readiness = game.clamp(state.career.readiness + Math.max(0, world.educationOpportunityLevel - world.jobMarketPressure) * 0.01 * periodScale);
    state.education.learningEfficiency = game.clamp(state.education.learningEfficiency + world.educationOpportunityLevel * 0.01 * periodScale);
    state.housing.affordability = game.clamp(state.housing.affordability - world.housingMarketPressure * 0.01 * periodScale);
    state.transportation.reliability = game.clamp(state.transportation.reliability * 0.82 + world.transportationReliability * 0.18);
    state.relationships.trust = game.clamp(state.relationships.trust + world.socialTrustLevel * 0.01 * periodScale - state.relationships.neglectRisk * 0.01);
    state.health.illnessRisk = game.clamp(state.health.illnessRisk + Math.max(0, 65 - world.publicHealthCondition) * 0.02 * periodScale);
    state.mentalWellbeing.confidence = game.clamp(state.mentalWellbeing.confidence + Math.max(0, world.socialTrustLevel - 50) * 0.01 * periodScale - world.jobMarketPressure * 0.004);
    state.npcSimulation.communityTrust = game.clamp(state.npcSimulation.communityTrust + world.socialTrustLevel * 0.02 - state.npcSimulation.labourCompetition * 0.01);
    state.npcSimulation.labourCompetition = game.clamp(state.npcSimulation.labourCompetition + world.jobMarketPressure * 0.015);
    state.npcSimulation.socialOpportunities = game.clamp(state.npcSimulation.socialOpportunities + world.districtActivityLevel * 0.01);
    state.world.economy = world.economyClimate;
    state.world.costOfLiving = state.economy.costOfLivingIndex;
    state.world.transportLoad = world.transportationReliability < 45 ? "Disrupted" : world.districtActivityLevel > 70 ? "Crowded" : "Moderate";
    state.world.communityMood = world.socialTrustLevel > 65 ? "Connected" : world.socialTrustLevel < 40 ? "Disconnected" : "Busy but calm";

    const worldEvent = {
      id: `world-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      eventId: event.id,
      title: event.title,
      summary: event.summary,
      day: state.time.day,
      daysSimulated: safeDays
    };
    state.worldSimulation.randomEvents = [worldEvent, ...(state.worldSimulation.randomEvents || [])].slice(0, 20);
    if (options.record && game.addEvent) {
      game.addEvent(state, {
        type: "worldSimulation",
        title: event.title,
        summary: event.summary,
        systems: ["World Simulation", "Economy", "Finance", "Career", "Education", "Housing", "Transportation", "Relationships", "Health", "Mental wellbeing", "NPC Simulation", "Fast Forward", "Life Report"],
        consequences: [
          `Economy climate is now ${world.economyClimate}.`,
          `Inflation level is ${world.inflationLevel}/100.`,
          `Job market pressure is ${world.jobMarketPressure}/100.`,
          `Housing pressure is ${world.housingMarketPressure}/100.`,
          `Public health condition is ${world.publicHealthCondition}/100.`
        ],
        reflection: "Which world pressure should you prepare for instead of ignoring?"
      });
    }
    return worldEvent;
  }

  game.worldSimulationSystem = {
    id: "worldSimulation",
    title: "World Simulation",
    chapter: "Chapter 17",
    summary(state) {
      return `${state.worldSimulation.economyClimate} world - inflation ${state.worldSimulation.inflationLevel}/100, job pressure ${state.worldSimulation.jobMarketPressure}/100.`;
    },
    metrics(state) {
      return [
        ["Inflation", state.worldSimulation.inflationLevel],
        ["Job pressure", state.worldSimulation.jobMarketPressure],
        ["Housing", state.worldSimulation.housingMarketPressure],
        ["Social trust", state.worldSimulation.socialTrustLevel],
        ["Community event", state.worldSimulation.activeCommunityEvent ? state.worldSimulation.activeCommunityEvent.title : "None scheduled"]
      ];
    },
    actions: [
      {
        id: "monitor-world-conditions",
        title: "Monitor world conditions",
        description: "Read the district climate before making big adult decisions.",
        durationMinutes: 35,
        effects: {
          needs: { stress: 2, purpose: 5 },
          skills: { lifeManagement: 3, finance: 1 },
          capability: { decisionMaking: 2 }
        },
        after(state) {
          updateWorldConditions(state, 7, { record: true });
        },
        consequence: "World conditions became visible, helping you prepare instead of reacting late.",
        reflection: "Which outside pressure could quietly shape your next decision?"
      },
      {
        id: "plan-for-inflation",
        title: "Plan for inflation",
        description: "Adjust food, transport, and saving habits before costs compound.",
        durationMinutes: 50,
        effects: {
          needs: { stress: -3, purpose: 7 },
          finance: { confidence: 8, dailyLivingCost: -1 },
          economy: { consumerPressure: -4 },
          worldSimulation: { inflationLevel: -2 },
          habits: { budgeting: 6 },
          capability: { responsibility: 2 }
        },
        consequence: "Inflation planning reduced daily cost pressure and strengthened financial control.",
        reflection: "What cost can you control before it controls you?"
      },
      {
        id: "research-future-industries",
        title: "Research future industries",
        description: "Connect learning and career preparation to where opportunities are growing.",
        durationMinutes: 75,
        effects: {
          needs: { energy: -4, stress: 3, purpose: 8 },
          career: { readiness: 4, interviewPrep: 2 },
          education: { learningEfficiency: 4, portfolio: 2 },
          economy: { opportunityIndex: 4 },
          worldSimulation: { educationOpportunityLevel: 3, jobMarketPressure: -2 },
          skills: { career: 3, learning: 3 },
          capability: { decisionMaking: 2 }
        },
        consequence: "Future-industry research made education choices more connected to real opportunity.",
        reflection: "Which skill is useful because the world is changing?"
      },
      {
        id: "strengthen-community-ties",
        title: "Strengthen community ties",
        description: "Invest in local trust so the district becomes a support system, not just scenery.",
        durationMinutes: 90,
        effects: {
          needs: { energy: -5, social: 10, stress: -5 },
          relationships: { support: 6, trust: 6, network: 4, neglectRisk: -4 },
          npcSimulation: { communityTrust: 7, socialOpportunities: 5 },
          worldSimulation: { socialTrustLevel: 5, districtActivityLevel: 2 },
          mentalWellbeing: { loneliness: -5, happiness: 4 },
          capability: { communication: 2 }
        },
        consequence: "Community ties improved relationships, NPC trust, and mental wellbeing resilience.",
        reflection: "Who in your environment could become part of a healthier routine?"
      },
      {
        id: "prepare-job-market-pressure",
        title: "Prepare for job market pressure",
        description: "Build evidence before competition becomes the reason you freeze.",
        durationMinutes: 120,
        effects: {
          needs: { energy: -8, stress: 5, purpose: 9 },
          career: { readiness: 6, reputation: 2 },
          education: { portfolio: 5, studyConsistency: 2 },
          worldSimulation: { jobMarketPressure: -2 },
          skills: { career: 4, learning: 2 },
          capability: { discipline: 2, decisionMaking: 2 }
        },
        consequence: "Preparation lowered the personal impact of a competitive job market.",
        reflection: "What proof of skill can you create before you need it?"
      },
      {
        id: "check-community-calendar",
        title: "Check the community calendar",
        description: "See what's happening in the district this week - festivals, fairs, markets, and more.",
        durationMinutes: 15,
        effects: {
          needs: { purpose: 2 }
        },
        after(state) {
          if (!state.worldSimulation.activeCommunityEvent) {
            const canSchedule = !state.worldSimulation.lastCommunityEventDay || (state.time.day - state.worldSimulation.lastCommunityEventDay) >= 10;
            if (canSchedule) {
              const eventType = pickCommunityEventType(state);
              state.worldSimulation.activeCommunityEvent = {
                id: eventType.id,
                title: eventType.title,
                summary: eventType.summary,
                scheduledDay: state.time.day
              };
              state.worldSimulation.lastCommunityEventDay = state.time.day;
            }
          }
        },
        consequence: "Checking the calendar surfaces what's on, without committing you to anything yet.",
        reflection: "Is there a community event you keep meaning to check out but never do?"
      },
      {
        id: "join-community-event",
        title: "Join the community event",
        description: "Show up and take part instead of just reading about it.",
        durationMinutes: 150,
        canPerform(state) {
          return Boolean(state.worldSimulation.activeCommunityEvent) || "Check the community calendar first - there is nothing scheduled right now.";
        },
        effects: {
          needs: { energy: -6 }
        },
        after(state) {
          const active = state.worldSimulation.activeCommunityEvent;
          const eventType = COMMUNITY_EVENT_TYPES.find((entry) => entry.id === active.id) || COMMUNITY_EVENT_TYPES[0];
          eventType.effects(state);
          state.worldSimulation.activeCommunityEvent = null;
        },
        consequence: "Participation is optional, but showing up is usually where the actual value was.",
        reflection: "What made today's event worth attending, or not?"
      }
    ]
  };

  game.updateWorldConditions = updateWorldConditions;
})();
