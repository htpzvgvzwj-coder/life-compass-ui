(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  const NEED_KEYS = ["energy", "hunger", "sleep", "social", "stress", "purpose", "hygiene"];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min = 0, max = 100) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function mergeObject(fallback, value) {
    return { ...fallback, ...(value && typeof value === "object" ? value : {}) };
  }

  const PERSONALITY_KEYS = ["responsibility", "sociability", "optimism", "patience", "riskTolerance", "discipline", "curiosity"];

  // Bible S16.5 Personality Model: NPCs without an explicit personality (new
  // NPCs added later, or state saved before this system existed) still get a
  // distinct, stable personality instead of a bland flat 50 - derived
  // deterministically from their id so the same NPC always lands on the same
  // profile rather than reshuffling every normalize pass.
  function defaultPersonalityFor(id) {
    const seed = String(id || "npc").split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
    const values = {};
    PERSONALITY_KEYS.forEach((key, index) => {
      const wobble = ((seed >> (index * 3)) & 15) - 7.5;
      values[key] = clamp(50 + wobble * 4);
    });
    return values;
  }

  // Character creation choices (Volume 04 Ch8) shift starting resources and a
  // few early stats rather than unlocking different content - keeps every
  // path playable while still making the choice feel real. Difficulty only
  // affects starting resources here, not ongoing decay/growth rates - a
  // deliberate scope cut for this pass, not an oversight.
  function applyCharacterCreationProfile(state, profile) {
    const ageGroup = profile.ageGroup || "";
    const background = profile.background || "";
    const trait = profile.startingTrait || "";
    const difficulty = profile.difficulty || "standard";

    if (ageGroup === "late-teens") {
      state.player.capability.independence = clamp(state.player.capability.independence - 6);
      state.education.path = "Full-time student";
    } else if (ageGroup === "adult") {
      state.player.capability.independence = clamp(state.player.capability.independence + 8);
      state.career.readiness = clamp(state.career.readiness + 6);
      state.finance.savings = Math.max(0, Math.round(state.finance.savings + 300));
    }

    if (background === "fresh-graduate") {
      state.education.qualificationProgress = clamp(state.education.qualificationProgress + 20);
      state.career.readiness = clamp(state.career.readiness + 5);
      state.finance.money = Math.max(0, Math.round(state.finance.money - 150));
    } else if (background === "already-working") {
      state.career.status = "Entry role";
      state.career.experience = clamp(state.career.experience + 15);
      state.finance.money = Math.round(state.finance.money + 200);
    } else if (background === "studying-part-time") {
      state.education.studyConsistency = clamp(state.education.studyConsistency + 10);
      state.career.performance = clamp(state.career.performance + 5);
      state.needs.energy = clamp(state.needs.energy - 8);
    }

    if (trait === "disciplined") {
      state.player.habits.studyConsistency = clamp(state.player.habits.studyConsistency + 15);
      state.player.capability.discipline = clamp(state.player.capability.discipline + 10);
    } else if (trait === "sociable") {
      state.relationships.support = clamp(state.relationships.support + 12);
      state.relationships.friends = clamp(state.relationships.friends + 12);
    } else if (trait === "ambitious") {
      state.career.readiness = clamp(state.career.readiness + 12);
      state.career.reputation = clamp(state.career.reputation + 8);
    } else if (trait === "careful-with-money") {
      state.finance.confidence = clamp(state.finance.confidence + 12);
      state.player.habits.budgeting = clamp(state.player.habits.budgeting + 15);
    }

    if (difficulty === "relaxed") {
      state.finance.money = Math.round(state.finance.money + 300);
      state.needs.stress = clamp(state.needs.stress - 10);
    } else if (difficulty === "challenging") {
      state.finance.money = Math.max(0, Math.round(state.finance.money - 200));
      state.needs.stress = clamp(state.needs.stress + 10);
    }

    state.player.ageGroup = ageGroup;
    state.player.background = background;
    state.player.startingTrait = trait;
    state.difficulty = difficulty;
  }

  function createInitialState(options = {}) {
    const profile = options.profile || {};
    const state = buildBaseState(profile);
    if (options.applyCharacterCreation) applyCharacterCreationProfile(state, profile);
    return state;
  }

  function buildBaseState(profile) {
    return {
      version: 1,
      architectureVersion: game.ARCHITECTURE_VERSION || "volume03.1",
      saveVersion: game.SAVE_VERSION || 3,
      activeView: "today",
      time: {
        year: 2026,
        month: 1,
        day: 1,
        weekday: 0,
        hour: 7,
        minute: 30,
        totalMinutes: 450
      },
      player: {
        name: profile.username || profile.name || "Player",
        lifeStage: "Emerging adult",
        status: "Preparing for independence",
        emotionalState: "Steady",
        capability: {
          independence: 36,
          responsibility: 42,
          decisionMaking: 40,
          discipline: 34,
          communication: 38
        },
        skills: {
          career: 10,
          learning: 12,
          finance: 8,
          lifeManagement: 14,
          social: 10
        },
        habits: {
          sleepRoutine: 45,
          studyConsistency: 30,
          budgeting: 24,
          exercise: 22,
          reflection: 28
        },
        memory: []
      },
      needs: {
        energy: 72,
        hunger: 68,
        sleep: 65,
        social: 55,
        stress: 30,
        purpose: 58,
        hygiene: 70
      },
      finance: {
        money: 500,
        savings: 0,
        debt: 0,
        dailyLivingCost: 18,
        monthlyRent: 0,
        confidence: 36,
        creditScore: 620,
        investments: {
          bonds: 0,
          stocks: 0,
          property: 0
        },
        insurance: {
          health: false,
          home: false,
          vehicle: false
        },
        taxAwareness: 20,
        lastTaxFiledDay: 0,
        totalTaxPaid: 0,
        lastTaxOwed: 0,
        creditCard: {
          lastStatementDay: 0,
          missedPayments: 0,
          collectionsRisk: 0
        }
      },
      career: {
        status: "Entry preparation",
        role: "Part-time / starter role",
        performance: 50,
        burnoutRisk: 28,
        readiness: 22,
        incomePerShift: 80,
        experience: 0,
        reputation: 30,
        interviewPrep: 20,
        interviewPracticeSessions: 0,
        applications: [],
        currentJob: null,
        employed: true,
        category: null,
        lastUnemploymentClaimDay: 0
      },
      education: {
        path: "Self-directed learning",
        enrolledProgram: null,
        studyConsistency: 30,
        learningEfficiency: 42,
        credits: 0,
        qualificationProgress: 0,
        tuitionPressure: 0,
        portfolio: 12,
        program: {
          active: false,
          termDays: 270,
          startedDay: 0,
          endsDay: 0,
          tuitionPaid: 0,
          dropoutRisk: 0,
          completedCount: 0
        }
      },
      housing: {
        type: "Family home / HDB room",
        stability: 68,
        comfort: 62,
        commuteMinutes: 35,
        affordability: 78,
        maintenance: 64,
        safety: 72,
        satisfaction: 62,
        monthlyCost: 0,
        selectedOption: "family-home",
        furnitureLevel: 35,
        internetConnected: false,
        hasRoommate: false,
        roommateRelationship: 0,
        communityTies: 30,
        lastUtilityPaidDay: 0,
        lease: {
          active: false,
          termDays: 0,
          startedDay: 0,
          endsDay: 0,
          depositAmount: 0,
          landlordRelationship: 60,
          missedPayments: 0,
          evictionRisk: 0
        }
      },
      transportation: {
        mode: "MRT and bus",
        reliability: 78,
        costPerCommute: 4,
        activeMinutes: 8,
        monthlyCost: 96,
        commuteStress: 32,
        timeFlexibility: 54,
        environmentalImpact: 28,
        selectedMode: "public-transport",
        ownsVehicle: false,
        vehicleMaintenance: 70,
        parkingSecured: false,
        vehicleLoanBalance: 0,
        loan: {
          active: false,
          termDays: 0,
          startedDay: 0,
          endsDay: 0,
          downPayment: 0,
          monthlyPayment: 0,
          missedPayments: 0,
          repossessionRisk: 0
        }
      },
      relationships: {
        support: 55,
        family: 60,
        friends: 48,
        trust: 52,
        communication: 38,
        network: 22,
        valuesClarity: 34,
        neglectRisk: 28
      },
      health: {
        physical: 70,
        sleepQuality: 64,
        nutrition: 58,
        activity: 28,
        illnessRisk: 18,
        recovery: 54,
        medicalAccess: 42,
        stamina: 56
      },
      mentalWellbeing: {
        index: 64,
        motivation: 58,
        resilience: 54,
        burnoutRisk: 28,
        loneliness: 34,
        confidence: 46,
        happiness: 56,
        purposeClarity: 42
      },
      economy: {
        cycle: "Stable",
        inflation: 3,
        jobMarket: 55,
        wageGrowth: 2,
        interestRate: 4,
        costOfLivingIndex: 50,
        opportunityIndex: 46,
        consumerPressure: 42
      },
      npcSimulation: {
        communityTrust: 48,
        socialOpportunities: 44,
        labourCompetition: 38,
        studyCulture: 46,
        activeDistrict: "Tampines-style neighbourhood",
        lastSimulatedDay: 1
      },
      worldSimulation: {
        economyClimate: "Stable",
        inflationLevel: 28,
        jobMarketPressure: 42,
        housingMarketPressure: 36,
        transportationReliability: 76,
        educationOpportunityLevel: 50,
        publicHealthCondition: 72,
        socialTrustLevel: 52,
        districtActivityLevel: 58,
        randomEvents: [],
        activeCommunityEvent: null,
        lastCommunityEventDay: 0
      },
      npcs: [
        {
          id: "npc-maya",
          name: "Maya",
          role: "Polytechnic student",
          location: "MRT station",
          careerStatus: "Part-time retail",
          relationship: 42,
          wellbeing: 58,
          money: 320,
          scheduleFocus: "study",
          lifeProgress: 24,
          lastDecision: "Preparing for class",
          personality: { responsibility: 58, sociability: 48, optimism: 60, patience: 52, riskTolerance: 34, discipline: 74, curiosity: 78 }
        },
        {
          id: "npc-daniel",
          name: "Daniel",
          role: "Junior designer",
          location: "Food Court",
          careerStatus: "Entry role",
          relationship: 36,
          wellbeing: 52,
          money: 780,
          scheduleFocus: "career",
          lifeProgress: 31,
          lastDecision: "Balancing overtime and recovery",
          personality: { responsibility: 68, sociability: 46, optimism: 54, patience: 36, riskTolerance: 62, discipline: 64, curiosity: 50 }
        },
        {
          id: "npc-auntie-lim",
          name: "Auntie Lim",
          role: "Neighbour",
          location: "HDB void deck",
          careerStatus: "Community volunteer",
          relationship: 50,
          wellbeing: 66,
          money: 540,
          scheduleFocus: "community",
          lifeProgress: 45,
          lastDecision: "Checking on neighbours",
          personality: { responsibility: 70, sociability: 88, optimism: 76, patience: 80, riskTolerance: 24, discipline: 58, curiosity: 46 }
        }
      ],
      legal: {
        heat: 0,
        record: false,
        finesOwed: 0,
        detentionUntilDay: 0,
        incidents: []
      },
      world: {
        district: "Singapore-inspired neighbourhood",
        weather: "Clear morning",
        economy: "Stable",
        costOfLiving: 50,
        transportLoad: "Moderate",
        communityMood: "Busy but calm"
      },
      schedule: [],
      events: [],
      eventHistory: [],
      commandHistory: [],
      traces: [],
      snapshots: [],
      reports: [],
      simulation: {
        currentTick: 0,
        speed: 1,
        paused: false,
        fastForwardActive: false,
        commandQueue: [],
        pendingEvents: [],
        currentSnapshot: null,
        diagnostics: {},
        nextCommandId: 1,
        nextEventId: 1,
        nextTraceId: 1,
        pendingIntervention: null,
        lastInterventionDay: 0
      },
      persistence: {
        gameVersion: "1.0.0",
        saveVersion: game.SAVE_VERSION || 3,
        configVersion: "1.0.0",
        dirty: false,
        dirtyDomains: [],
        lastSavedAt: ""
      },
      progression: {
        independenceIndex: 36,
        lifeXp: 0,
        lifeLevel: 1,
        personalGrowthScore: 36,
        stabilityScore: 42,
        resilienceScore: 38,
        opportunityScore: 32,
        legacyScore: 20,
        achievements: [],
        milestones: [],
        reflectionCount: 0,
        milestoneIntent: "Build a stable adult routine"
      }
    };
  }

  function normalizeState(state, options = {}) {
    const fallback = createInitialState(options);
    const source = state && typeof state === "object" ? state : {};
    const merged = {
      ...fallback,
      ...source,
      time: mergeObject(fallback.time, source.time),
      player: {
        ...fallback.player,
        ...(source.player || {}),
        capability: mergeObject(fallback.player.capability, source.player && source.player.capability),
        skills: mergeObject(fallback.player.skills, source.player && source.player.skills),
        habits: mergeObject(fallback.player.habits, source.player && source.player.habits),
        memory: Array.isArray(source.player && source.player.memory) ? source.player.memory.slice(-40) : fallback.player.memory
      },
      needs: mergeObject(fallback.needs, source.needs),
      finance: {
        ...mergeObject(fallback.finance, source.finance),
        investments: mergeObject(fallback.finance.investments, source.finance && source.finance.investments),
        insurance: mergeObject(fallback.finance.insurance, source.finance && source.finance.insurance),
        creditCard: mergeObject(fallback.finance.creditCard, source.finance && source.finance.creditCard)
      },
      career: mergeObject(fallback.career, source.career),
      education: {
        ...mergeObject(fallback.education, source.education),
        program: mergeObject(fallback.education.program, source.education && source.education.program)
      },
      housing: {
        ...mergeObject(fallback.housing, source.housing),
        lease: mergeObject(fallback.housing.lease, source.housing && source.housing.lease)
      },
      transportation: {
        ...mergeObject(fallback.transportation, source.transportation),
        loan: mergeObject(fallback.transportation.loan, source.transportation && source.transportation.loan)
      },
      relationships: mergeObject(fallback.relationships, source.relationships),
      health: mergeObject(fallback.health, source.health),
      mentalWellbeing: mergeObject(fallback.mentalWellbeing, source.mentalWellbeing),
      economy: mergeObject(fallback.economy, source.economy),
      npcSimulation: mergeObject(fallback.npcSimulation, source.npcSimulation),
      worldSimulation: mergeObject(fallback.worldSimulation, source.worldSimulation),
      npcs: Array.isArray(source.npcs) ? source.npcs.slice(-24).map((npc) => ({ ...npc })) : fallback.npcs,
      legal: {
        ...mergeObject(fallback.legal, source.legal),
        incidents: Array.isArray(source.legal && source.legal.incidents) ? source.legal.incidents.slice(-20) : fallback.legal.incidents
      },
      world: mergeObject(fallback.world, source.world),
      progression: {
        ...fallback.progression,
        ...(source.progression || {}),
        achievements: Array.isArray(source.progression && source.progression.achievements) ? source.progression.achievements.slice(-60) : fallback.progression.achievements,
        milestones: Array.isArray(source.progression && source.progression.milestones) ? source.progression.milestones.slice(-40) : fallback.progression.milestones
      },
      schedule: Array.isArray(source.schedule) ? source.schedule.slice(-40) : fallback.schedule,
      events: Array.isArray(source.events) ? source.events.slice(-120) : fallback.events,
      eventHistory: Array.isArray(source.eventHistory) ? source.eventHistory.slice(-500) : fallback.eventHistory,
      commandHistory: Array.isArray(source.commandHistory) ? source.commandHistory.slice(-300) : fallback.commandHistory,
      traces: Array.isArray(source.traces) ? source.traces.slice(-1000) : fallback.traces,
      snapshots: Array.isArray(source.snapshots) ? source.snapshots.slice(-12) : fallback.snapshots,
      reports: Array.isArray(source.reports) ? source.reports.slice(-20) : fallback.reports,
      simulation: mergeObject(fallback.simulation, source.simulation),
      persistence: mergeObject(fallback.persistence, source.persistence),
      architectureVersion: source.architectureVersion || fallback.architectureVersion,
      saveVersion: Math.max(Number(source.saveVersion || 0), fallback.saveVersion),
      activeView: source.activeView || fallback.activeView
    };

    NEED_KEYS.forEach((key) => {
      merged.needs[key] = clamp(merged.needs[key]);
    });
    Object.keys(merged.player.capability).forEach((key) => {
      merged.player.capability[key] = clamp(merged.player.capability[key]);
    });
    Object.keys(merged.player.skills).forEach((key) => {
      merged.player.skills[key] = clamp(merged.player.skills[key]);
    });
    Object.keys(merged.player.habits).forEach((key) => {
      merged.player.habits[key] = clamp(merged.player.habits[key]);
    });
    ["performance", "burnoutRisk", "readiness"].forEach((key) => {
      merged.career[key] = clamp(merged.career[key]);
    });
    ["experience", "reputation", "interviewPrep"].forEach((key) => {
      merged.career[key] = clamp(merged.career[key]);
    });
    merged.career.applications = Array.isArray(merged.career.applications) ? merged.career.applications.slice(-20) : [];
    merged.career.employed = merged.career.employed !== false;
    merged.career.category = merged.career.category || null;
    merged.career.lastUnemploymentClaimDay = Math.max(0, Math.round(Number(merged.career.lastUnemploymentClaimDay) || 0));
    merged.career.interviewPracticeSessions = Math.max(0, Math.round(Number(merged.career.interviewPracticeSessions) || 0));
    ["studyConsistency", "learningEfficiency", "credits", "qualificationProgress", "tuitionPressure", "portfolio"].forEach((key) => {
      merged.education[key] = clamp(merged.education[key]);
    });
    ["stability", "comfort", "affordability", "maintenance", "safety", "satisfaction", "furnitureLevel", "roommateRelationship", "communityTies"].forEach((key) => {
      merged.housing[key] = clamp(merged.housing[key]);
    });
    ["commuteMinutes", "monthlyCost", "lastUtilityPaidDay"].forEach((key) => {
      const value = Number(merged.housing[key]);
      merged.housing[key] = Math.max(0, Math.round(Number.isFinite(value) ? value : fallback.housing[key]));
    });
    merged.housing.internetConnected = Boolean(merged.housing.internetConnected);
    merged.housing.hasRoommate = Boolean(merged.housing.hasRoommate);
    ["reliability", "commuteStress", "timeFlexibility", "environmentalImpact", "vehicleMaintenance"].forEach((key) => {
      merged.transportation[key] = clamp(merged.transportation[key]);
    });
    ["costPerCommute", "activeMinutes", "monthlyCost", "vehicleLoanBalance"].forEach((key) => {
      const value = Number(merged.transportation[key]);
      merged.transportation[key] = Math.max(0, Math.round(Number.isFinite(value) ? value : fallback.transportation[key]));
    });
    merged.transportation.ownsVehicle = Boolean(merged.transportation.ownsVehicle);
    merged.transportation.parkingSecured = Boolean(merged.transportation.parkingSecured);
    ["support", "family", "friends", "trust", "communication", "network", "valuesClarity", "neglectRisk"].forEach((key) => {
      merged.relationships[key] = clamp(merged.relationships[key]);
    });
    ["physical", "sleepQuality", "nutrition", "activity", "illnessRisk", "recovery", "medicalAccess", "stamina"].forEach((key) => {
      merged.health[key] = clamp(merged.health[key]);
    });
    ["index", "motivation", "resilience", "burnoutRisk", "loneliness", "confidence", "happiness", "purposeClarity"].forEach((key) => {
      merged.mentalWellbeing[key] = clamp(merged.mentalWellbeing[key]);
    });
    ["inflation", "jobMarket", "wageGrowth", "interestRate", "costOfLivingIndex", "opportunityIndex", "consumerPressure"].forEach((key) => {
      merged.economy[key] = clamp(merged.economy[key]);
    });
    ["communityTrust", "socialOpportunities", "labourCompetition", "studyCulture"].forEach((key) => {
      merged.npcSimulation[key] = clamp(merged.npcSimulation[key]);
    });
    ["inflationLevel", "jobMarketPressure", "housingMarketPressure", "transportationReliability", "educationOpportunityLevel", "publicHealthCondition", "socialTrustLevel", "districtActivityLevel"].forEach((key) => {
      merged.worldSimulation[key] = clamp(merged.worldSimulation[key]);
    });
    merged.worldSimulation.randomEvents = Array.isArray(merged.worldSimulation.randomEvents) ? merged.worldSimulation.randomEvents.slice(-20) : [];
    merged.worldSimulation.lastCommunityEventDay = Math.max(0, Math.round(Number(merged.worldSimulation.lastCommunityEventDay) || 0));
    merged.worldSimulation.activeCommunityEvent = merged.worldSimulation.activeCommunityEvent && typeof merged.worldSimulation.activeCommunityEvent === "object"
      ? merged.worldSimulation.activeCommunityEvent
      : null;
    merged.npcs = merged.npcs.map((npc, index) => {
      const id = npc.id || `npc-${index}`;
      const personality = mergeObject(defaultPersonalityFor(id), npc.personality);
      PERSONALITY_KEYS.forEach((key) => { personality[key] = clamp(personality[key]); });
      return {
        id,
        name: npc.name || "Neighbour",
        role: npc.role || "Resident",
        location: npc.location || "Neighbourhood",
        careerStatus: npc.careerStatus || "Exploring options",
        relationship: clamp(npc.relationship),
        wellbeing: clamp(npc.wellbeing),
        money: Math.max(0, Math.round(Number(npc.money) || 0)),
        scheduleFocus: npc.scheduleFocus || "routine",
        lifeProgress: clamp(npc.lifeProgress),
        lastDecision: npc.lastDecision || "Following a normal routine",
        personality
      };
    }).slice(-24);
    merged.finance.money = Math.round(Number(merged.finance.money) || 0);
    merged.finance.savings = Math.max(0, Math.round(Number(merged.finance.savings) || 0));
    merged.finance.debt = Math.max(0, Math.round(Number(merged.finance.debt) || 0));
    merged.finance.creditScore = Math.max(300, Math.min(850, Math.round(Number(merged.finance.creditScore) || 620)));
    merged.finance.taxAwareness = clamp(merged.finance.taxAwareness);
    merged.finance.lastTaxFiledDay = Math.max(0, Math.round(Number(merged.finance.lastTaxFiledDay) || 0));
    merged.finance.totalTaxPaid = Math.max(0, Math.round(Number(merged.finance.totalTaxPaid) || 0));
    merged.finance.lastTaxOwed = Math.max(0, Math.round(Number(merged.finance.lastTaxOwed) || 0));
    ["bonds", "stocks", "property"].forEach((key) => {
      merged.finance.investments[key] = Math.max(0, Math.round(Number(merged.finance.investments[key]) || 0));
    });
    ["health", "home", "vehicle"].forEach((key) => {
      merged.finance.insurance[key] = Boolean(merged.finance.insurance[key]);
    });
    merged.progression.independenceIndex = clamp(merged.progression.independenceIndex);
    ["personalGrowthScore", "stabilityScore", "resilienceScore", "opportunityScore", "legacyScore"].forEach((key) => {
      merged.progression[key] = clamp(merged.progression[key]);
    });
    merged.progression.lifeXp = Math.max(0, Math.round(Number(merged.progression.lifeXp) || 0));
    merged.progression.lifeLevel = Math.max(1, Math.round(Number(merged.progression.lifeLevel) || 1));
    merged.time.totalMinutes = Math.max(0, Math.round(Number(merged.time.totalMinutes) || 0));
    if (game.ensureArchitectureState) game.ensureArchitectureState(merged);
    return merged;
  }

  function addEvent(state, event) {
    const safeEvent = {
      id: event.id || `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: event.type || "life",
      title: event.title || "Life event",
      summary: event.summary || "",
      systems: Array.isArray(event.systems) ? event.systems : [],
      consequences: Array.isArray(event.consequences) ? event.consequences : [],
      reflection: event.reflection || "What can you learn from this choice?",
      occurredAt: event.occurredAt || (game.getTimeSnapshot ? game.getTimeSnapshot(state).stamp : "")
    };
    state.events = [...(state.events || []), safeEvent].slice(-120);
    if (game.recordDomainEvent) game.recordDomainEvent(state, safeEvent, { source: event.source || "domain-system" });
    if (state.persistence) {
      state.persistence.dirty = true;
      state.persistence.dirtyDomains = [...new Set([...(state.persistence.dirtyDomains || []), "events", "traces"])];
    }
    return safeEvent;
  }

  function applyNumericMap(target, delta = {}, clampValues = true) {
    Object.entries(delta || {}).forEach(([key, value]) => {
      if (typeof target[key] === "number") {
        const next = Number(target[key] || 0) + Number(value || 0);
        target[key] = clampValues ? clamp(next) : Math.round(next);
      }
    });
  }

  function applyMixedNumericMap(target, delta = {}, unboundedKeys = []) {
    Object.entries(delta || {}).forEach(([key, value]) => {
      if (typeof target[key] === "number") {
        const next = Number(target[key] || 0) + Number(value || 0);
        target[key] = unboundedKeys.includes(key) ? Math.max(0, Math.round(next)) : clamp(next);
      }
    });
  }

  function applyEffects(state, effects = {}) {
    applyNumericMap(state.needs, effects.needs);
    applyNumericMap(state.player.skills, effects.skills);
    applyNumericMap(state.player.habits, effects.habits);
    applyNumericMap(state.player.capability, effects.capability);
    applyNumericMap(state.career, effects.career);
    applyNumericMap(state.education, effects.education);
    applyMixedNumericMap(state.housing, effects.housing, ["commuteMinutes", "monthlyCost"]);
    applyMixedNumericMap(state.transportation, effects.transportation, ["costPerCommute", "activeMinutes", "monthlyCost"]);
    applyNumericMap(state.relationships, effects.relationships);
    applyNumericMap(state.health, effects.health);
    applyNumericMap(state.mentalWellbeing, effects.mentalWellbeing);
    applyNumericMap(state.economy, effects.economy);
    applyNumericMap(state.npcSimulation, effects.npcSimulation);
    applyNumericMap(state.worldSimulation, effects.worldSimulation);
    applyMixedNumericMap(state.progression, effects.progression, ["lifeXp", "lifeLevel", "reflectionCount"]);
    state.progression.lifeXp = Math.max(0, Math.round(Number(state.progression.lifeXp) || 0));
    state.progression.lifeLevel = Math.max(1, Math.round(Number(state.progression.lifeLevel) || 1));
    applyNumericMap(state.world, effects.world);
    applyNumericMap(state.finance, effects.finance, false);
    state.finance.savings = Math.max(0, Math.round(Number(state.finance.savings) || 0));
    state.finance.debt = Math.max(0, Math.round(Number(state.finance.debt) || 0));
    state.finance.confidence = clamp(state.finance.confidence);
    if (effects.set) {
      Object.entries(effects.set).forEach(([path, value]) => {
        const parts = path.split(".");
        let target = state;
        while (parts.length > 1) {
          target = target[parts.shift()];
          if (!target) return;
        }
        target[parts[0]] = value;
      });
    }
  }

  game.clone = clone;
  game.clamp = clamp;
  game.createInitialState = createInitialState;
  game.normalizeState = normalizeState;
  game.addEvent = addEvent;
  game.applyEffects = applyEffects;
  game.NEED_KEYS = NEED_KEYS;
})();
