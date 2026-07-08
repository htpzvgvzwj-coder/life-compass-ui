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

  function createInitialState(options = {}) {
    const profile = options.profile || {};
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
        confidence: 36
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
        applications: [],
        currentJob: null
      },
      education: {
        path: "Self-directed learning",
        enrolledProgram: null,
        studyConsistency: 30,
        learningEfficiency: 42,
        credits: 0,
        qualificationProgress: 0,
        tuitionPressure: 0,
        portfolio: 12
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
        selectedOption: "family-home"
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
        selectedMode: "public-transport"
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
        randomEvents: []
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
          lastDecision: "Preparing for class"
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
          lastDecision: "Balancing overtime and recovery"
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
          lastDecision: "Checking on neighbours"
        }
      ],
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
        nextTraceId: 1
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
      finance: mergeObject(fallback.finance, source.finance),
      career: mergeObject(fallback.career, source.career),
      education: mergeObject(fallback.education, source.education),
      housing: mergeObject(fallback.housing, source.housing),
      transportation: mergeObject(fallback.transportation, source.transportation),
      relationships: mergeObject(fallback.relationships, source.relationships),
      health: mergeObject(fallback.health, source.health),
      mentalWellbeing: mergeObject(fallback.mentalWellbeing, source.mentalWellbeing),
      economy: mergeObject(fallback.economy, source.economy),
      npcSimulation: mergeObject(fallback.npcSimulation, source.npcSimulation),
      worldSimulation: mergeObject(fallback.worldSimulation, source.worldSimulation),
      npcs: Array.isArray(source.npcs) ? source.npcs.slice(-24).map((npc) => ({ ...npc })) : fallback.npcs,
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
    ["studyConsistency", "learningEfficiency", "credits", "qualificationProgress", "tuitionPressure", "portfolio"].forEach((key) => {
      merged.education[key] = clamp(merged.education[key]);
    });
    ["stability", "comfort", "affordability", "maintenance", "safety", "satisfaction"].forEach((key) => {
      merged.housing[key] = clamp(merged.housing[key]);
    });
    ["commuteMinutes", "monthlyCost"].forEach((key) => {
      const value = Number(merged.housing[key]);
      merged.housing[key] = Math.max(0, Math.round(Number.isFinite(value) ? value : fallback.housing[key]));
    });
    ["reliability", "commuteStress", "timeFlexibility", "environmentalImpact"].forEach((key) => {
      merged.transportation[key] = clamp(merged.transportation[key]);
    });
    ["costPerCommute", "activeMinutes", "monthlyCost"].forEach((key) => {
      const value = Number(merged.transportation[key]);
      merged.transportation[key] = Math.max(0, Math.round(Number.isFinite(value) ? value : fallback.transportation[key]));
    });
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
    merged.npcs = merged.npcs.map((npc, index) => ({
      id: npc.id || `npc-${index}`,
      name: npc.name || "Neighbour",
      role: npc.role || "Resident",
      location: npc.location || "Neighbourhood",
      careerStatus: npc.careerStatus || "Exploring options",
      relationship: clamp(npc.relationship),
      wellbeing: clamp(npc.wellbeing),
      money: Math.max(0, Math.round(Number(npc.money) || 0)),
      scheduleFocus: npc.scheduleFocus || "routine",
      lifeProgress: clamp(npc.lifeProgress),
      lastDecision: npc.lastDecision || "Following a normal routine"
    })).slice(-24);
    merged.finance.money = Math.round(Number(merged.finance.money) || 0);
    merged.finance.savings = Math.max(0, Math.round(Number(merged.finance.savings) || 0));
    merged.finance.debt = Math.max(0, Math.round(Number(merged.finance.debt) || 0));
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
