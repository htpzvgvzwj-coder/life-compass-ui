# LifeVerse Volume 03 Architecture Review Export

Generated: 2026-07-08T11:23:17.1291196+08:00

## Changed Files
- index.html
- app.js
- package.json
- lifeverse-core.js
- lifeverse-state.js
- lifeverse-life-report.js
- event-bus.js
- trace-engine.js
- command-bus.js
- state-store.js
- persistence-service.js
- save-service.js
- entity-models.js
- component-registry.js
- service-registry.js
- simulation-engine.js
- tests/lifeverse-phase1.test.js
- tests/lifeverse-phase2.test.js
- tests/lifeverse-phase3.test.js
- tests/lifeverse-phase4.test.js
- tests/lifeverse-volume03-architecture.test.js
- docs/volume03-technical-architecture-extracted.txt

## Architecture Map
- Simulation Engine: simulation-engine.js, exposed as window.LifeVerseGame.getSimulationEngine().
- Event Bus: event-bus.js, exposed as getEventBus(); domain events are also recorded from lifeverse-state.js addEvent().
- Commands: command-bus.js plus handlers installed by simulation-engine.js; app.js calls performActivityCommand, performSystemActionCommand, fastForwardCommand, and generateLifeReportCommand.
- Traces: trace-engine.js stores state.traces; addEvent() records traceable event consequences.
- Save/Load: persistence-service.js and save-service.js; app.js autosaves LifeVerse actions to the autosave slot.
- Fast Forward pipeline: app.js -> fastForwardCommand -> CommandBus -> SimulationEngine.runFastForward -> existing domain simulation -> EventBus/TraceEngine -> Life Report.
- Life Report consequences: lifeverse-life-report.js reads traces through selectReportTraces() and includes traceSummary plus AI placeholder insights.
- Compass AI separation: service-registry.js exposes compassAiBoundary and does not let AI mutate gameplay state.

## npm test result
```
LifeVerse Phase 1 tests passed.
LifeVerse Phase 2 tests passed.
LifeVerse Phase 3 tests passed.
LifeVerse Phase 4 tests passed.
LifeVerse Volume 03 architecture tests passed.
```

## lifeverse-core.js
```js
(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  function getViewModel(state) {
    const time = game.getTimeSnapshot ? game.getTimeSnapshot(state) : {};
    const player = game.playerSummary ? game.playerSummary(state) : {};
    const report = game.latestReport ? game.latestReport(state) : null;
    return {
      time,
      player,
      needsSummary: game.needsSummary ? game.needsSummary(state) : "",
      latestEvent: (state.events || [])[state.events.length - 1] || null,
      latestReport: report,
      traces: game.selectReportTraces ? game.selectReportTraces(state, {}) : (state.traces || []).slice(-10),
      diagnostics: state.simulation && state.simulation.diagnostics ? state.simulation.diagnostics : {},
      todaySchedule: (state.schedule || []).slice(-8).reverse(),
      activities: game.getAvailableActivities ? game.getAvailableActivities(state) : [],
      systems: game.systems ? game.systems().map((system) => ({
        id: system.id,
        title: system.title,
        chapter: system.chapter,
        summary: typeof system.summary === "function" ? system.summary(state) : "",
        metrics: typeof system.metrics === "function" ? system.metrics(state) : [],
        actions: Array.isArray(system.actions) ? system.actions : []
      })) : []
    };
  }

  function reset(options = {}) {
    const state = game.createInitialState ? game.createInitialState(options) : null;
    if (state && game.installLifeVerseArchitecture) game.installLifeVerseArchitecture(state);
    return state;
  }

  function performActivityCommand(state, activityId, options = {}) {
    if (!game.dispatchLifeVerseCommand) return game.performActivity ? game.performActivity(state, activityId, options) : null;
    return game.dispatchLifeVerseCommand(state, {
      type: "StartActivityCommand",
      actor: "player-main",
      payload: {
        activityId,
        options
      }
    });
  }

  function performSystemActionCommand(state, systemId, actionId) {
    if (!game.dispatchLifeVerseCommand) return game.performSystemAction ? game.performSystemAction(state, systemId, actionId) : null;
    return game.dispatchLifeVerseCommand(state, {
      type: "SystemActionCommand",
      actor: "player-main",
      payload: {
        systemId,
        actionId
      }
    });
  }

  function fastForwardCommand(state, days = 7) {
    if (!game.dispatchLifeVerseCommand) return game.fastForward ? game.fastForward(state, days) : null;
    return game.dispatchLifeVerseCommand(state, {
      type: "FastForwardCommand",
      actor: "player-main",
      payload: { days }
    });
  }

  function generateLifeReportCommand(state, context = {}) {
    if (!game.dispatchLifeVerseCommand) return game.generateLifeReport ? game.generateLifeReport(state, context) : null;
    const result = game.dispatchLifeVerseCommand(state, {
      type: "GenerateLifeReportCommand",
      actor: "player-main",
      payload: { context }
    });
    return result && result.report ? result.report : result;
  }

  function saveLifeVerseState(state, options = {}) {
    return game.getSaveService ? game.getSaveService().save(state, options) : { ok: false, error: "Save service unavailable." };
  }

  function loadLifeVerseState(options = {}) {
    return game.getSaveService ? game.getSaveService().load(options) : { ok: false, error: "Save service unavailable." };
  }

  if (game.installLifeVerseArchitecture) game.installLifeVerseArchitecture();

  game.getViewModel = getViewModel;
  game.reset = reset;
  game.performActivityCommand = performActivityCommand;
  game.performSystemActionCommand = performSystemActionCommand;
  game.fastForwardCommand = fastForwardCommand;
  game.generateLifeReportCommand = generateLifeReportCommand;
  game.saveLifeVerseState = saveLifeVerseState;
  game.loadLifeVerseState = loadLifeVerseState;
})();

```

## lifeverse-state.js
```js
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

```

## lifeverse-time.js
```js
(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function syncCalendar(state) {
    const minutes = Math.max(0, Math.round(Number(state.time.totalMinutes) || 0));
    const dayIndex = Math.floor(minutes / 1440);
    const minuteOfDay = minutes % 1440;
    state.time.day = dayIndex + 1;
    state.time.weekday = dayIndex % 7;
    state.time.month = Math.floor(dayIndex / 30) + 1;
    state.time.year = 2026 + Math.floor((state.time.month - 1) / 12);
    state.time.month = ((state.time.month - 1) % 12) + 1;
    state.time.hour = Math.floor(minuteOfDay / 60);
    state.time.minute = minuteOfDay % 60;
  }

  function getTimeSnapshot(state) {
    syncCalendar(state);
    const hour = state.time.hour;
    const period = hour < 5 ? "Late night" : hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : hour < 21 ? "Evening" : "Night";
    return {
      day: state.time.day,
      dayOfWeek: weekdays[state.time.weekday] || "Monday",
      date: `${months[state.time.month - 1] || "Jan"} ${state.time.day}, ${state.time.year}`,
      time: `${pad(hour)}:${pad(state.time.minute)}`,
      period,
      stamp: `Day ${state.time.day}, ${pad(hour)}:${pad(state.time.minute)}`
    };
  }

  function advanceMinutes(state, minutes, reason = "Time passed") {
    const beforeDay = Math.floor((state.time.totalMinutes || 0) / 1440);
    state.time.totalMinutes = Math.max(0, Math.round((state.time.totalMinutes || 0) + Number(minutes || 0)));
    syncCalendar(state);
    const afterDay = Math.floor((state.time.totalMinutes || 0) / 1440);
    const daysChanged = Math.max(0, afterDay - beforeDay);
    return {
      minutes: Number(minutes || 0),
      daysChanged,
      reason,
      snapshot: getTimeSnapshot(state)
    };
  }

  function advanceDays(state, days, reason = "Days passed") {
    return advanceMinutes(state, Number(days || 0) * 1440, reason);
  }

  function durationLabel(minutes) {
    const value = Math.max(0, Math.round(Number(minutes) || 0));
    if (value < 60) return `${value} min`;
    const hours = Math.floor(value / 60);
    const rest = value % 60;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
  }

  game.getTimeSnapshot = getTimeSnapshot;
  game.advanceMinutes = advanceMinutes;
  game.advanceDays = advanceDays;
  game.durationLabel = durationLabel;
})();

```

## lifeverse-fast-forward.js
```js
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
    const totalCost = livingCost + rentCost + commuteCost + debtCost;
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
        `Estimated costs: $${totalCost} ($${livingCost} daily life, $${rentCost} housing, $${commuteCost} transport, $${debtCost} debt pressure).`,
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

```

## lifeverse-life-report.js
```js
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

```

## lifeverse-system-registry.js
```js
(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  function systems() {
    return [
      game.careerSystem,
      game.educationSystem,
      game.financeSystem,
      game.housingSystem,
      game.transportationSystem,
      game.relationshipSystem,
      game.healthSystem,
      game.mentalWellbeingSystem,
      game.economySystem,
      game.npcSimulationSystem,
      game.worldSimulationSystem,
      game.progressionSystem
    ].filter(Boolean);
  }

  function getSystem(systemId) {
    return systems().find((system) => system.id === systemId) || null;
  }

  function getSystemAction(systemId, actionId) {
    const system = getSystem(systemId);
    if (!system) return null;
    return (system.actions || []).find((action) => action.id === actionId) || null;
  }

  function performSystemAction(state, systemId, actionId) {
    const system = getSystem(systemId);
    const action = getSystemAction(systemId, actionId);
    if (!system || !action) return { error: "System action not found." };
    if (typeof action.canPerform === "function") {
      const allowed = action.canPerform(state);
      if (allowed !== true) return { error: typeof allowed === "string" ? allowed : "Action is not available yet." };
    }

    const before = game.getTimeSnapshot ? game.getTimeSnapshot(state) : { stamp: "" };
    if (game.decayNeeds) game.decayNeeds(state, action.durationMinutes || 30);
    if (game.advanceMinutes) game.advanceMinutes(state, action.durationMinutes || 30, action.title);
    if (game.applyEffects) {
      const systemEffects = { ...(action.effects || {}) };
      delete systemEffects.skills;
      delete systemEffects.habits;
      delete systemEffects.capability;
      game.applyEffects(state, systemEffects);
    }
    if (game.applyPlayerEffects) {
      game.applyPlayerEffects(state, {
        title: action.title,
        effects: action.effects || {},
        memory: action.consequence
      });
    }
    if (typeof action.after === "function") action.after(state, action);
    if (game.updateProgressionFromDecision) {
      game.updateProgressionFromDecision(state, action, { systemId: system.id, systemTitle: system.title });
    }

    const after = game.getTimeSnapshot ? game.getTimeSnapshot(state) : { stamp: "" };
    const scheduleEntry = {
      id: `sys-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      activityId: `${system.id}:${action.id}`,
      title: action.title,
      category: system.title,
      location: system.id,
      start: before.stamp,
      end: after.stamp,
      durationMinutes: action.durationMinutes || 30
    };
    state.schedule = [...(state.schedule || []), scheduleEntry].slice(-40);

    const event = game.addEvent(state, {
      type: system.id,
      title: action.title,
      summary: action.consequence,
      systems: action.systems || [
        system.title,
        "Time",
        "Needs",
        "Activities",
        "Career",
        "Education",
        "Finance",
        "Housing",
        "Transportation",
        "Fast Forward",
        "Life Report"
      ],
      consequences: decisionConsequences(state, action),
      reflection: action.reflection,
      occurredAt: after.stamp
    });
    return { state, system, action, event, scheduleEntry };
  }

  function decisionConsequences(state, action) {
    const effects = action.effects || {};
    const items = [`Used ${game.durationLabel ? game.durationLabel(action.durationMinutes || 30) : `${action.durationMinutes || 30} minutes`}.`];
    if (effects.finance && Number(effects.finance.money)) items.push(`Money ${Number(effects.finance.money) > 0 ? "+" : ""}${effects.finance.money}.`);
    if (effects.needs && Number(effects.needs.stress)) items.push(`Stress ${Number(effects.needs.stress) > 0 ? "+" : ""}${effects.needs.stress}.`);
    if (effects.career) items.push(`Career readiness is now ${state.career.readiness}/100.`);
    if (effects.education) items.push(`Education progress is now ${state.education.qualificationProgress}/100.`);
    if (effects.housing) items.push(`Housing comfort is now ${state.housing.comfort}/100.`);
    if (effects.transportation) items.push(`Commute stress is now ${state.transportation.commuteStress}/100.`);
    if (effects.relationships) items.push(`Relationship support is now ${state.relationships.support}/100.`);
    if (effects.health) items.push(`Physical health is now ${state.health.physical}/100.`);
    if (effects.mentalWellbeing) items.push(`Mental wellbeing index is now ${state.mentalWellbeing.index}/100.`);
    if (effects.economy) items.push(`Cost of living pressure is now ${state.economy.costOfLivingIndex}/100.`);
    if (effects.npcSimulation) items.push(`Community trust is now ${state.npcSimulation.communityTrust}/100.`);
    if (effects.worldSimulation) items.push(`World economy climate is ${state.worldSimulation.economyClimate}.`);
    if (effects.progression || game.progressionSystem) items.push(`Life level is ${state.progression.lifeLevel} with ${state.progression.lifeXp} XP.`);
    return items;
  }

  game.systems = systems;
  game.getSystem = getSystem;
  game.getSystemAction = getSystemAction;
  game.performSystemAction = performSystemAction;
})();

```

## simulation-engine.js
```js
(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  const SYSTEM_ORDER = [
    "time",
    "needs",
    "activities",
    "career",
    "education",
    "finance",
    "housing",
    "transportation",
    "relationships",
    "health",
    "mentalWellbeing",
    "economy",
    "npcSimulation",
    "worldSimulation",
    "progression",
    "lifeReportTrace"
  ];

  class SimulationEngine {
    constructor(options = {}) {
      this.eventBus = options.eventBus || (game.getEventBus ? game.getEventBus() : null);
      this.commandBus = options.commandBus || (game.getCommandBus ? game.getCommandBus() : null);
      this.traceEngine = options.traceEngine || (game.getTraceEngine ? game.getTraceEngine() : null);
      this.services = options.services || (game.getServiceRegistry ? game.getServiceRegistry() : null);
      this.systems = new Map();
      this.commandHandlersInstalled = false;
    }

    initialize(state) {
      if (game.ensureArchitectureState) game.ensureArchitectureState(state);
      this.installDefaultCommandHandlers();
      this.registerDefaultSystems();
      this.eventBus?.publish(state, {
        type: "SimulationInitialized",
        source: "simulation-engine",
        payload: { systems: [...this.systems.keys()] },
        traceable: false,
        priority: "critical"
      }, { simulationEngine: this });
      return state;
    }

    registerSystem(system) {
      if (!system || !system.id) return;
      this.systems.set(system.id, system);
    }

    registerDefaultSystems() {
      SYSTEM_ORDER.forEach((id) => {
        if (!this.systems.has(id)) this.registerSystem({ id, priority: SYSTEM_ORDER.indexOf(id) });
      });
    }

    installDefaultCommandHandlers() {
      if (!this.commandBus || this.commandHandlersInstalled) return;
      this.commandHandlersInstalled = true;

      this.commandBus.register("StartActivityCommand", (command, context) => {
        const result = game.performActivity(commandState(context), command.payload.activityId, command.payload.options || {});
        publishCommandFact(context.state, "ActivityCommandCompleted", command, result, context);
        return result;
      });

      this.commandBus.register("SystemActionCommand", (command, context) => {
        const result = game.performSystemAction(commandState(context), command.payload.systemId, command.payload.actionId);
        publishCommandFact(context.state, "SystemActionCompleted", command, result, context);
        return result;
      });

      this.commandBus.register("FastForwardCommand", (command, context) => {
        const days = Math.max(1, Math.min(1825, Math.round(Number(command.payload.days || 7))));
        const result = this.runFastForward(context.state, days, command);
        publishCommandFact(context.state, "FastForwardCompleted", command, result, context, true);
        return result;
      });

      this.commandBus.register("GenerateLifeReportCommand", (command, context) => {
        const report = game.generateLifeReport(context.state, command.payload.context || {});
        const result = { state: context.state, report };
        publishCommandFact(context.state, "LifeReportGenerated", command, result, context, true);
        return result;
      });
    }

    dispatchCommand(state, input = {}) {
      if (game.ensureArchitectureState) game.ensureArchitectureState(state);
      this.initializeIfNeeded(state);
      return this.commandBus.dispatch(state, input, { simulationEngine: this });
    }

    initializeIfNeeded(state) {
      if (!this.commandHandlersInstalled) this.initialize(state);
      if (game.ensureArchitectureState) game.ensureArchitectureState(state);
    }

    tick(state, interval = "minute", options = {}) {
      if (game.ensureArchitectureState) game.ensureArchitectureState(state);
      const snapshot = game.createStateStore ? game.createStateStore(state).snapshot(`${interval}-tick`) : null;
      try {
        state.simulation.currentTick = Number(state.simulation.currentTick || 0) + 1;
        this.eventBus?.publish(state, {
          type: `${interval[0].toUpperCase()}${interval.slice(1)}TickCompleted`,
          source: "simulation-engine",
          payload: { interval, reason: options.reason || "Simulation tick" },
          traceable: false,
          priority: interval === "minute" ? "low" : "medium"
        }, { simulationEngine: this });
        state.simulation.diagnostics = this.diagnostics(state);
        return { state, snapshot };
      } catch (error) {
        if (snapshot && game.createStateStore) {
          const store = game.createStateStore(state);
          store.restore(snapshot);
        }
        return { error: error.message || "Simulation tick failed.", state };
      }
    }

    runFastForward(state, days, command) {
      if (game.ensureArchitectureState) game.ensureArchitectureState(state);
      const store = game.createStateStore ? game.createStateStore(state) : null;
      const snapshot = store ? store.snapshot(`fast-forward-${days}`) : null;
      state.simulation.fastForwardActive = true;
      state.simulation.currentSnapshot = snapshot;
      try {
        const result = game.fastForward(state, days);
        state.simulation.fastForwardActive = false;
        if (result && !result.error) {
          state.persistence.dirty = true;
          state.persistence.dirtyDomains = [...new Set([...(state.persistence.dirtyDomains || []), "fastForward", "lifeReport", "events", "traces"])];
        }
        return { ...result, snapshot, command };
      } catch (error) {
        state.simulation.fastForwardActive = false;
        if (store && snapshot) store.restore(snapshot);
        return { error: error.message || "Fast Forward failed.", state, snapshot };
      }
    }

    diagnostics(state) {
      return {
        currentTick: state.simulation && state.simulation.currentTick || 0,
        eventCount: (state.eventHistory || []).length,
        traceCount: (state.traces || []).length,
        commandCount: (state.commandHistory || []).length,
        systems: [...this.systems.keys()],
        registeredCommands: this.commandBus ? this.commandBus.diagnostics().registeredCommands : []
      };
    }
  }

  function commandState(context) {
    return context.state;
  }

  function publishCommandFact(state, type, command, result = {}, context = {}, traceable = false) {
    if (!context.eventBus || result.error) return null;
    return context.eventBus.publish(state, {
      type,
      source: "command-bus",
      payload: {
        commandId: command.id,
        commandType: command.type,
        title: result.activity?.title || result.action?.title || result.report?.title || type,
        summary: result.event?.summary || result.report?.overview || "",
        systems: result.event?.systems || ["Simulation Engine"],
        consequences: result.event?.consequences || [],
        reflection: result.event?.reflection || ""
      },
      traceable,
      priority: "high"
    }, context);
  }

  let singleton = null;

  function getSimulationEngine() {
    if (!singleton) singleton = new SimulationEngine();
    return singleton;
  }

  function installLifeVerseArchitecture(state) {
    const engine = getSimulationEngine();
    if (state) engine.initialize(state);
    else engine.installDefaultCommandHandlers();
    if (game.getComponentRegistry) game.getComponentRegistry();
    if (game.getServiceRegistry) game.getServiceRegistry();
    return engine;
  }

  game.SimulationEngine = SimulationEngine;
  game.getSimulationEngine = getSimulationEngine;
  game.installLifeVerseArchitecture = installLifeVerseArchitecture;
  game.dispatchLifeVerseCommand = (state, command) => getSimulationEngine().dispatchCommand(state, command);
})();

```

## event-bus.js
```js
(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});
  const PRIORITY = { critical: 0, high: 1, medium: 2, low: 3 };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function ensureEventState(state) {
    if (!state || typeof state !== "object") return state;
    state.eventHistory = Array.isArray(state.eventHistory) ? state.eventHistory : [];
    state.simulation = state.simulation || {};
    state.simulation.nextEventId = Math.max(1, Number(state.simulation.nextEventId || 1));
    return state;
  }

  function timeStamp(state) {
    return game.getTimeSnapshot ? game.getTimeSnapshot(state).stamp : "";
  }

  function createDomainEvent(state, input = {}) {
    ensureEventState(state);
    const id = input.id || `event-${state.simulation.nextEventId++}`;
    const event = {
      id,
      type: input.type || "DomainEvent",
      timestamp: input.timestamp || timeStamp(state),
      source: input.source || input.system || "lifeverse",
      targets: Array.isArray(input.targets) ? input.targets.slice() : [],
      payload: clone(input.payload || {}),
      traceable: input.traceable !== false,
      priority: input.priority || "medium",
      version: Number(input.version || 1)
    };
    return Object.freeze(event);
  }

  class EventBus {
    constructor() {
      this.subscribers = new Map();
      this.published = [];
    }

    subscribe(type, handler, options = {}) {
      if (!type || typeof handler !== "function") return () => {};
      const list = this.subscribers.get(type) || [];
      const subscription = {
        handler,
        priority: options.priority || "medium"
      };
      list.push(subscription);
      list.sort((a, b) => (PRIORITY[a.priority] ?? 2) - (PRIORITY[b.priority] ?? 2));
      this.subscribers.set(type, list);
      return () => {
        const current = this.subscribers.get(type) || [];
        this.subscribers.set(type, current.filter((item) => item !== subscription));
      };
    }

    publish(state, input = {}, context = {}) {
      ensureEventState(state);
      const event = Object.isFrozen(input) && input.id ? input : createDomainEvent(state, input);
      state.eventHistory = [...state.eventHistory, event].slice(-500);
      this.published = [...this.published, event].slice(-500);

      const handlers = [
        ...(this.subscribers.get(event.type) || []),
        ...(this.subscribers.get("*") || [])
      ].sort((a, b) => (PRIORITY[a.priority] ?? 2) - (PRIORITY[b.priority] ?? 2));

      handlers.forEach((subscription) => {
        subscription.handler(event, { state, eventBus: this, ...context });
      });

      if (event.traceable && game.getTraceEngine) {
        game.getTraceEngine().recordFromEvent(state, event);
      }
      return event;
    }

    replay(state, events = [], context = {}) {
      return events.map((event) => this.publish(state, event, { ...context, replay: true }));
    }

    diagnostics() {
      return {
        subscriberTypes: this.subscribers.size,
        published: this.published.length
      };
    }
  }

  let singleton = null;

  function getEventBus() {
    if (!singleton) singleton = new EventBus();
    return singleton;
  }

  function recordDomainEvent(state, legacyEvent = {}, options = {}) {
    const payload = {
      legacyEventId: legacyEvent.id,
      title: legacyEvent.title || legacyEvent.type || "Life event",
      summary: legacyEvent.summary || "",
      systems: Array.isArray(legacyEvent.systems) ? legacyEvent.systems.slice() : [],
      consequences: Array.isArray(legacyEvent.consequences) ? legacyEvent.consequences.slice() : [],
      reflection: legacyEvent.reflection || ""
    };
    const event = getEventBus().publish(state, {
      type: options.type || legacyEvent.type || "LifeEvent",
      source: options.source || "domain-system",
      payload,
      traceable: options.traceable !== false,
      priority: options.priority || "medium"
    }, options);
    legacyEvent.domainEventId = event.id;
    return event;
  }

  game.EventBus = EventBus;
  game.createDomainEvent = createDomainEvent;
  game.getEventBus = getEventBus;
  game.recordDomainEvent = recordDomainEvent;
  game.ensureEventState = ensureEventState;
})();

```

## command-bus.js
```js
(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  function ensureCommandState(state) {
    if (!state || typeof state !== "object") return state;
    state.commandHistory = Array.isArray(state.commandHistory) ? state.commandHistory : [];
    state.simulation = state.simulation || {};
    state.simulation.nextCommandId = Math.max(1, Number(state.simulation.nextCommandId || 1));
    state.simulation.commandQueue = Array.isArray(state.simulation.commandQueue) ? state.simulation.commandQueue : [];
    return state;
  }

  function createCommand(state, input = {}) {
    ensureCommandState(state);
    return Object.freeze({
      id: input.id || `command-${state.simulation.nextCommandId++}`,
      type: input.type || "Command",
      timestamp: input.timestamp || (game.getTimeSnapshot ? game.getTimeSnapshot(state).stamp : ""),
      actor: input.actor || "player",
      payload: { ...(input.payload || {}) },
      version: Number(input.version || 1)
    });
  }

  class CommandBus {
    constructor() {
      this.handlers = new Map();
    }

    register(type, handler) {
      if (!type || typeof handler !== "function") return;
      this.handlers.set(type, handler);
    }

    dispatch(state, input = {}, context = {}) {
      ensureCommandState(state);
      const command = Object.isFrozen(input) && input.id ? input : createCommand(state, input);
      const handler = this.handlers.get(command.type);
      const historyItem = {
        id: command.id,
        type: command.type,
        timestamp: command.timestamp,
        actor: command.actor,
        status: handler ? "handled" : "failed"
      };
      state.commandHistory = [...state.commandHistory, historyItem].slice(-300);
      if (!handler) return { error: `No command handler registered for ${command.type}.`, command };

      const result = handler(command, {
        state,
        commandBus: this,
        eventBus: game.getEventBus ? game.getEventBus() : null,
        traceEngine: game.getTraceEngine ? game.getTraceEngine() : null,
        simulationEngine: context.simulationEngine || null,
        services: game.getServiceRegistry ? game.getServiceRegistry() : null,
        ...context
      }) || {};

      historyItem.status = result.error ? "failed" : "handled";
      historyItem.resultType = result.event ? result.event.type : "";
      return { ...result, command };
    }

    diagnostics() {
      return {
        registeredCommands: [...this.handlers.keys()]
      };
    }
  }

  let singleton = null;

  function getCommandBus() {
    if (!singleton) singleton = new CommandBus();
    return singleton;
  }

  game.CommandBus = CommandBus;
  game.createCommand = createCommand;
  game.getCommandBus = getCommandBus;
  game.ensureCommandState = ensureCommandState;
})();

```

## trace-engine.js
```js
(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function ensureTraceState(state) {
    if (!state || typeof state !== "object") return state;
    state.traces = Array.isArray(state.traces) ? state.traces : [];
    state.simulation = state.simulation || {};
    state.simulation.nextTraceId = Math.max(1, Number(state.simulation.nextTraceId || 1));
    return state;
  }

  function traceFromEvent(state, event) {
    ensureTraceState(state);
    const payload = event.payload || {};
    const systems = Array.isArray(payload.systems) ? payload.systems : [];
    const consequences = Array.isArray(payload.consequences) ? payload.consequences : [];
    return {
      id: `trace-${state.simulation.nextTraceId++}`,
      sourceEventId: event.id,
      eventType: event.type,
      cause: payload.title || event.type,
      summary: payload.summary || "",
      affectedSystems: systems,
      immediateEffects: consequences,
      longTermEffects: buildLongTermEffects(event, systems, consequences),
      reflectionEligible: event.traceable !== false,
      reflectionPrompt: payload.reflection || "What can this decision teach you?",
      createdAt: event.timestamp,
      version: 1
    };
  }

  function buildLongTermEffects(event, systems, consequences) {
    const text = consequences.join(" ").toLowerCase();
    const effects = [];
    if (systems.includes("Finance") || text.includes("money")) effects.push("Financial flexibility may change if this pattern repeats.");
    if (systems.includes("Health") || text.includes("health")) effects.push("Health changes can compound into energy, recovery, and opportunity effects.");
    if (systems.includes("Mental wellbeing") || text.includes("stress")) effects.push("Stress and confidence may influence future choices.");
    if (systems.includes("Relationships")) effects.push("Support networks can strengthen or decay over time.");
    if (systems.includes("Career") || systems.includes("Education")) effects.push("Capability and opportunity can improve through repeated preparation.");
    if (event.type === "fast-forward") effects.push("Fast Forward compressed repeated daily patterns into long-term consequences.");
    if (!effects.length) effects.push("The consequence is small now, but repeated choices can shape future stability.");
    return effects;
  }

  class TraceEngine {
    record(state, trace = {}) {
      ensureTraceState(state);
      const safeTrace = {
        id: trace.id || `trace-${state.simulation.nextTraceId++}`,
        sourceEventId: trace.sourceEventId || "",
        eventType: trace.eventType || "Trace",
        cause: trace.cause || "Life consequence",
        summary: trace.summary || "",
        affectedSystems: Array.isArray(trace.affectedSystems) ? trace.affectedSystems.slice() : [],
        immediateEffects: Array.isArray(trace.immediateEffects) ? trace.immediateEffects.slice() : [],
        longTermEffects: Array.isArray(trace.longTermEffects) ? trace.longTermEffects.slice() : [],
        reflectionEligible: trace.reflectionEligible !== false,
        reflectionPrompt: trace.reflectionPrompt || "What can you learn from this?",
        createdAt: trace.createdAt || (game.getTimeSnapshot ? game.getTimeSnapshot(state).stamp : ""),
        version: Number(trace.version || 1)
      };
      state.traces = [...state.traces, safeTrace].slice(-1000);
      return safeTrace;
    }

    recordFromEvent(state, event) {
      if (!event || event.traceable === false) return null;
      const existing = (state.traces || []).some((trace) => trace.sourceEventId === event.id);
      if (existing) return null;
      return this.record(state, traceFromEvent(state, event));
    }

    selectForReport(state, context = {}) {
      ensureTraceState(state);
      const limit = context.days && context.days >= 365 ? 40 : 20;
      return clone(state.traces.slice(-limit));
    }

    diagnostics(state) {
      ensureTraceState(state);
      return {
        traceCount: state.traces.length,
        reflectionEligible: state.traces.filter((trace) => trace.reflectionEligible).length
      };
    }
  }

  let singleton = null;

  function getTraceEngine() {
    if (!singleton) singleton = new TraceEngine();
    return singleton;
  }

  game.TraceEngine = TraceEngine;
  game.getTraceEngine = getTraceEngine;
  game.ensureTraceState = ensureTraceState;
  game.selectReportTraces = (state, context) => getTraceEngine().selectForReport(state, context);
})();

```

## state-store.js
```js
(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});
  const ARCHITECTURE_VERSION = "volume03.1";
  const SAVE_VERSION = 3;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function ensureArchitectureState(state) {
    if (!state || typeof state !== "object") return state;
    state.architectureVersion = state.architectureVersion || ARCHITECTURE_VERSION;
    state.saveVersion = Math.max(SAVE_VERSION, Number(state.saveVersion || SAVE_VERSION));
    state.eventHistory = Array.isArray(state.eventHistory) ? state.eventHistory : [];
    state.commandHistory = Array.isArray(state.commandHistory) ? state.commandHistory : [];
    state.traces = Array.isArray(state.traces) ? state.traces : [];
    state.snapshots = Array.isArray(state.snapshots) ? state.snapshots : [];
    state.simulation = {
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
      ...(state.simulation || {})
    };
    state.persistence = {
      gameVersion: "1.0.0",
      saveVersion: SAVE_VERSION,
      configVersion: "1.0.0",
      dirty: false,
      dirtyDomains: [],
      lastSavedAt: "",
      ...(state.persistence || {})
    };
    return state;
  }

  function validateState(state) {
    const errors = [];
    if (!state || typeof state !== "object") errors.push("State is missing.");
    if (state && !state.player) errors.push("Player state is missing.");
    if (state && !state.time) errors.push("Time state is missing.");
    if (state && !state.worldSimulation) errors.push("World simulation state is missing.");
    if (state && Array.isArray(state.npcs)) {
      const ids = new Set();
      state.npcs.forEach((npc) => {
        if (!npc.id) errors.push("NPC is missing an id.");
        if (ids.has(npc.id)) errors.push(`Duplicate NPC id: ${npc.id}`);
        ids.add(npc.id);
      });
    }
    return { ok: errors.length === 0, errors };
  }

  function migrateState(state) {
    const migrated = game.normalizeState ? game.normalizeState(state) : clone(state || {});
    ensureArchitectureState(migrated);
    migrated.saveVersion = SAVE_VERSION;
    migrated.persistence.saveVersion = SAVE_VERSION;
    return migrated;
  }

  class StateStore {
    constructor(initialState = {}) {
      this.state = migrateState(initialState);
      this.subscribers = [];
    }

    getState() {
      return this.state;
    }

    setState(nextState, options = {}) {
      this.state = migrateState(nextState);
      this.markDirty(options.domain || "state");
      this.notify(options);
      return this.state;
    }

    update(producer, options = {}) {
      if (typeof producer === "function") producer(this.state);
      ensureArchitectureState(this.state);
      this.markDirty(options.domain || "simulation");
      this.notify(options);
      return this.state;
    }

    markDirty(domain) {
      ensureArchitectureState(this.state);
      this.state.persistence.dirty = true;
      if (domain && !this.state.persistence.dirtyDomains.includes(domain)) {
        this.state.persistence.dirtyDomains.push(domain);
      }
    }

    snapshot(label = "snapshot") {
      ensureArchitectureState(this.state);
      const snapshot = {
        id: `snapshot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        label,
        createdAt: game.getTimeSnapshot ? game.getTimeSnapshot(this.state).stamp : "",
        state: clone(this.state)
      };
      this.state.snapshots = [...this.state.snapshots, { ...snapshot, state: undefined }].slice(-12);
      this.state.simulation.currentSnapshot = snapshot;
      return snapshot;
    }

    restore(snapshot) {
      if (!snapshot || !snapshot.state) return { error: "Snapshot is invalid." };
      this.state = migrateState(clone(snapshot.state));
      this.markDirty("restore");
      this.notify({ restored: true });
      return { state: this.state };
    }

    subscribe(handler) {
      if (typeof handler !== "function") return () => {};
      this.subscribers.push(handler);
      return () => {
        this.subscribers = this.subscribers.filter((item) => item !== handler);
      };
    }

    notify(options = {}) {
      this.subscribers.forEach((handler) => handler(this.state, options));
    }

    validate() {
      return validateState(this.state);
    }
  }

  game.ARCHITECTURE_VERSION = ARCHITECTURE_VERSION;
  game.SAVE_VERSION = SAVE_VERSION;
  game.ensureArchitectureState = ensureArchitectureState;
  game.validateLifeVerseState = validateState;
  game.migrateLifeVerseState = migrateState;
  game.createStateStore = (initialState) => new StateStore(initialState);
  game.StateStore = StateStore;
})();

```

## persistence-service.js
```js
(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});
  const DEFAULT_PREFIX = "lifeverse.save.";

  function memoryStorage() {
    const data = {};
    return {
      getItem: (key) => Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null,
      setItem: (key, value) => {
        data[key] = String(value);
      },
      removeItem: (key) => {
        delete data[key];
      },
      key: (index) => Object.keys(data)[index] || null,
      get length() {
        return Object.keys(data).length;
      }
    };
  }

  function resolveStorage() {
    try {
      if (window.localStorage) return window.localStorage;
    } catch (error) {
      return memoryStorage();
    }
    return memoryStorage();
  }

  function checksum(text) {
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
    }
    return String(hash >>> 0);
  }

  class PersistenceService {
    constructor(options = {}) {
      this.storage = options.storage || resolveStorage();
      this.prefix = options.prefix || DEFAULT_PREFIX;
    }

    key(slot = "autosave") {
      return `${this.prefix}${slot}`;
    }

    write(slot, payload) {
      const body = JSON.stringify(payload);
      const envelope = {
        checksum: checksum(body),
        writtenAt: new Date().toISOString(),
        payload
      };
      this.storage.setItem(this.key(slot), JSON.stringify(envelope));
      return { ok: true, slot, checksum: envelope.checksum };
    }

    read(slot = "autosave") {
      const raw = this.storage.getItem(this.key(slot));
      if (!raw) return { ok: false, error: "Save not found." };
      try {
        const envelope = JSON.parse(raw);
        const body = JSON.stringify(envelope.payload);
        if (envelope.checksum && checksum(body) !== envelope.checksum) {
          return { ok: false, error: "Save checksum failed." };
        }
        return { ok: true, slot, payload: envelope.payload, writtenAt: envelope.writtenAt };
      } catch (error) {
        return { ok: false, error: "Save could not be parsed." };
      }
    }

    remove(slot = "autosave") {
      this.storage.removeItem(this.key(slot));
      return { ok: true, slot };
    }

    list() {
      const slots = [];
      for (let index = 0; index < this.storage.length; index += 1) {
        const key = this.storage.key(index);
        if (key && key.startsWith(this.prefix)) slots.push(key.slice(this.prefix.length));
      }
      return slots;
    }
  }

  let singleton = null;

  function getPersistenceService() {
    if (!singleton) singleton = new PersistenceService();
    return singleton;
  }

  game.PersistenceService = PersistenceService;
  game.getPersistenceService = getPersistenceService;
})();

```

## save-service.js
```js
(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function metadataFor(state, slot) {
    const time = game.getTimeSnapshot ? game.getTimeSnapshot(state) : {};
    return {
      saveId: slot || "autosave",
      playerName: state.player && state.player.name ? state.player.name : "Player",
      createdAt: new Date().toISOString(),
      lastPlayed: new Date().toISOString(),
      gameVersion: "1.0.0",
      saveVersion: game.SAVE_VERSION || 3,
      configVersion: state.persistence && state.persistence.configVersion || "1.0.0",
      inGameDate: time.stamp || ""
    };
  }

  class SaveService {
    constructor(options = {}) {
      this.persistence = options.persistence || (game.getPersistenceService ? game.getPersistenceService() : null);
    }

    serialize(state, slot = "autosave") {
      const normalized = game.migrateLifeVerseState ? game.migrateLifeVerseState(state) : clone(state);
      const validation = game.validateLifeVerseState ? game.validateLifeVerseState(normalized) : { ok: true, errors: [] };
      if (!validation.ok) return { ok: false, errors: validation.errors };
      return {
        ok: true,
        save: {
          metadata: metadataFor(normalized, slot),
          state: normalized,
          version: {
            architecture: game.ARCHITECTURE_VERSION || "volume03.1",
            save: game.SAVE_VERSION || 3,
            migration: 1
          }
        }
      };
    }

    save(state, options = {}) {
      const slot = options.slot || "autosave";
      const serialized = this.serialize(state, slot);
      if (!serialized.ok) return serialized;
      const result = this.persistence.write(slot, serialized.save);
      if (result.ok && state.persistence) {
        state.persistence.dirty = false;
        state.persistence.dirtyDomains = [];
        state.persistence.lastSavedAt = serialized.save.metadata.lastPlayed;
      }
      return { ...result, metadata: serialized.save.metadata };
    }

    load(options = {}) {
      const slot = options.slot || "autosave";
      const result = this.persistence.read(slot);
      if (!result.ok) return result;
      const state = game.migrateLifeVerseState ? game.migrateLifeVerseState(result.payload.state) : result.payload.state;
      const validation = game.validateLifeVerseState ? game.validateLifeVerseState(state) : { ok: true, errors: [] };
      if (!validation.ok) return { ok: false, errors: validation.errors };
      return { ok: true, state, metadata: result.payload.metadata };
    }

    snapshot(state, label = "manual") {
      const store = game.createStateStore ? game.createStateStore(state) : null;
      if (!store) return { error: "State store unavailable." };
      return store.snapshot(label);
    }

    listSaves() {
      return this.persistence.list();
    }
  }

  let singleton = null;

  function getSaveService() {
    if (!singleton) singleton = new SaveService();
    return singleton;
  }

  game.SaveService = SaveService;
  game.getSaveService = getSaveService;
})();

```

## entity-models.js
```js
(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  function entityId(type, seed) {
    return `${type}-${String(seed || Date.now()).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  }

  function baseEntity(type, data = {}) {
    const now = data.createdAt || "";
    return {
      id: data.id || entityId(type, data.name || data.title || Math.random().toString(16).slice(2)),
      type,
      createdAt: now,
      updatedAt: data.updatedAt || now,
      version: Number(data.version || 1),
      isActive: data.isActive !== false
    };
  }

  function createPlayerEntity(state) {
    return {
      ...baseEntity("player", { id: "player-main", name: state.player && state.player.name }),
      identity: {
        name: state.player && state.player.name || "Player",
        lifeStage: state.player && state.player.lifeStage || "Emerging adult",
        status: state.player && state.player.status || ""
      },
      componentRefs: ["identity", "needs", "activity", "career", "education", "finance", "housing", "transportation", "health", "mentalWellbeing", "relationship", "skill", "goal", "progression", "trace"]
    };
  }

  function createNpcEntity(npc) {
    return {
      ...baseEntity("npc", npc),
      identity: {
        name: npc.name,
        role: npc.role
      },
      location: npc.location,
      componentRefs: ["identity", "needs", "activity", "career", "finance", "relationship", "health", "mentalWellbeing", "schedule", "goal", "memory", "trace"]
    };
  }

  function createWorldEntity(state) {
    return {
      ...baseEntity("world", { id: "world-main" }),
      district: state.world && state.world.district,
      componentRefs: ["time", "economy", "world", "event", "trace"]
    };
  }

  function createActivityEntity(activity, state) {
    return {
      ...baseEntity("activity", activity),
      title: activity.title,
      category: activity.category,
      durationMinutes: activity.durationMinutes,
      ownerId: "player-main",
      createdAt: game.getTimeSnapshot ? game.getTimeSnapshot(state).stamp : ""
    };
  }

  function createEventEntity(event) {
    return {
      ...baseEntity("event", event),
      eventType: event.type,
      cause: event.payload && event.payload.title || event.type,
      consequences: event.payload && event.payload.consequences || [],
      traceId: ""
    };
  }

  function createLifeReportModel(report) {
    return {
      ...baseEntity("lifeReport", report),
      reportType: report.type,
      title: report.title,
      createdAt: report.createdAt,
      traceIds: Array.isArray(report.traceSummary) ? report.traceSummary.map((trace) => trace.id) : []
    };
  }

  function buildEntitySnapshot(state) {
    return {
      player: createPlayerEntity(state),
      world: createWorldEntity(state),
      npcs: (state.npcs || []).map(createNpcEntity),
      reports: (state.reports || []).map(createLifeReportModel)
    };
  }

  game.entityModels = {
    baseEntity,
    createPlayerEntity,
    createNpcEntity,
    createWorldEntity,
    createActivityEntity,
    createEventEntity,
    createLifeReportModel,
    buildEntitySnapshot
  };
})();

```

## component-registry.js
```js
(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  class ComponentRegistry {
    constructor() {
      this.components = new Map();
    }

    register(definition) {
      if (!definition || !definition.id) return;
      this.components.set(definition.id, {
        version: 1,
        owner: "LifeVerse",
        serializable: true,
        fastForwardCompatible: true,
        ...definition
      });
    }

    get(id) {
      return this.components.get(id) || null;
    }

    list() {
      return [...this.components.values()];
    }

    snapshotComponent(state, id) {
      const component = this.get(id);
      if (!component || typeof component.select !== "function") return null;
      return JSON.parse(JSON.stringify(component.select(state)));
    }

    diagnostics() {
      return {
        registeredComponents: this.components.size,
        ids: [...this.components.keys()]
      };
    }
  }

  let singleton = null;

  function getComponentRegistry() {
    if (!singleton) {
      singleton = new ComponentRegistry();
      registerDefaults(singleton);
    }
    return singleton;
  }

  function registerDefaults(registry) {
    [
      ["identity", (state) => state.player],
      ["time", (state) => state.time],
      ["needs", (state) => state.needs],
      ["activity", (state) => ({ schedule: state.schedule })],
      ["career", (state) => state.career],
      ["education", (state) => state.education],
      ["finance", (state) => state.finance],
      ["housing", (state) => state.housing],
      ["transportation", (state) => state.transportation],
      ["health", (state) => state.health],
      ["mentalWellbeing", (state) => state.mentalWellbeing],
      ["relationship", (state) => state.relationships],
      ["skill", (state) => state.player && state.player.skills],
      ["goal", (state) => ({ milestoneIntent: state.progression && state.progression.milestoneIntent })],
      ["inventory", () => ({ items: [] })],
      ["progression", (state) => state.progression],
      ["trace", (state) => state.traces],
      ["memory", (state) => state.player && state.player.memory],
      ["economy", (state) => state.economy],
      ["world", (state) => state.worldSimulation],
      ["event", (state) => state.eventHistory]
    ].forEach(([id, select]) => {
      registry.register({ id, select });
    });
  }

  game.ComponentRegistry = ComponentRegistry;
  game.getComponentRegistry = getComponentRegistry;
})();

```

## service-registry.js
```js
(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  class ServiceRegistry {
    constructor() {
      this.services = new Map();
    }

    register(id, service) {
      if (!id || !service) return;
      this.services.set(id, service);
    }

    get(id) {
      return this.services.get(id) || null;
    }

    list() {
      return [...this.services.keys()];
    }
  }

  function createLifeReportAiService() {
    return {
      id: "lifeReportAi",
      mode: "offline-rule-placeholder",
      buildContext(state, traces = []) {
        return {
          player: {
            name: state.player && state.player.name,
            goals: state.progression && state.progression.milestoneIntent
          },
          time: game.getTimeSnapshot ? game.getTimeSnapshot(state) : {},
          traceCount: traces.length,
          recentTraces: traces.slice(-8).map((trace) => ({
            cause: trace.cause,
            affectedSystems: trace.affectedSystems,
            immediateEffects: trace.immediateEffects,
            longTermEffects: trace.longTermEffects
          }))
        };
      },
      generateInsights(state, traces = []) {
        const context = this.buildContext(state, traces);
        return {
          source: this.mode,
          strengths: traces.some((trace) => trace.affectedSystems.includes("Education")) ? ["Learning effort is showing up in your trace history."] : ["You are building a record of choices that can be reflected on."],
          risks: traces.some((trace) => trace.immediateEffects.join(" ").toLowerCase().includes("stress")) ? ["Stress appears in recent consequences, so recovery choices matter."] : [],
          reflectionPrompt: context.recentTraces.length ? "Which repeated trace should you change before it becomes a pattern?" : "What choice do you want LifeVerse to observe next?"
        };
      }
    };
  }

  function createCompassAiBoundaryService() {
    return {
      id: "compassAiBoundary",
      description: "Compass AI remains outside deterministic LifeVerse gameplay.",
      filterContext(state) {
        return {
          playerName: state.player && state.player.name,
          time: game.getTimeSnapshot ? game.getTimeSnapshot(state).stamp : "",
          latestReportTitle: (state.reports || []).slice(-1)[0]?.title || ""
        };
      }
    };
  }

  function createAnalyticsService() {
    return {
      id: "analytics",
      mode: "local-diagnostics-only",
      collectSimulationDiagnostics(state) {
        return {
          events: (state.eventHistory || []).length,
          traces: (state.traces || []).length,
          commands: (state.commandHistory || []).length,
          tick: state.simulation && state.simulation.currentTick || 0
        };
      }
    };
  }

  let singleton = null;

  function getServiceRegistry() {
    if (!singleton) {
      singleton = new ServiceRegistry();
      singleton.register("save", game.getSaveService ? game.getSaveService() : {});
      singleton.register("lifeReportAi", createLifeReportAiService());
      singleton.register("compassAiBoundary", createCompassAiBoundaryService());
      singleton.register("analytics", createAnalyticsService());
      singleton.register("config", { id: "config", mode: "inline-current-build" });
    }
    return singleton;
  }

  game.ServiceRegistry = ServiceRegistry;
  game.getServiceRegistry = getServiceRegistry;
})();

```

## tests/lifeverse-phase1.test.js
```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = {
  window: {},
  console
};
vm.createContext(sandbox);

[
  "event-bus.js",
  "trace-engine.js",
  "command-bus.js",
  "state-store.js",
  "persistence-service.js",
  "save-service.js",
  "entity-models.js",
  "component-registry.js",
  "service-registry.js",
  "simulation-engine.js",
  "lifeverse-state.js",
  "lifeverse-time.js",
  "lifeverse-needs.js",
  "lifeverse-player.js",
  "lifeverse-activities.js",
  "lifeverse-life-report.js",
  "lifeverse-fast-forward.js",
  "lifeverse-core.js"
].forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, sandbox, { filename: file });
});

const game = sandbox.window.LifeVerseGame;
assert.ok(game, "LifeVerseGame namespace exists");

const state = game.createInitialState({ profile: { username: "Aina" } });
assert.strictEqual(state.player.name, "Aina");
assert.strictEqual(game.getTimeSnapshot(state).time, "07:30");

const beforeMoney = state.finance.money;
const beforeMinutes = state.time.totalMinutes;
const work = game.performActivity(state, "work-shift", { locationId: "work" });
assert.ok(!work.error, "work shift completes");
assert.ok(state.time.totalMinutes > beforeMinutes, "activity consumes time");
assert.ok(state.finance.money > beforeMoney, "work changes money");
assert.ok(state.events.length >= 1, "activity records consequences");
assert.ok(state.schedule.length >= 1, "activity records schedule");

const report = game.generateLifeReport(state, { type: "reflection" });
assert.ok(report.overview, "life report has overview");
assert.ok(report.consequences.length, "life report explains consequences");

const beforeDay = state.time.day;
const ff = game.fastForward(state, 7);
assert.ok(!ff.error, "fast forward completes");
assert.ok(state.time.day > beforeDay, "fast forward advances days");
assert.ok(state.reports.length >= 2, "fast forward creates report");

const view = game.getViewModel(state);
assert.ok(view.needsSummary, "view model includes needs summary");
assert.ok(view.latestReport, "view model includes latest report");

console.log("LifeVerse Phase 1 tests passed.");

```

## tests/lifeverse-phase2.test.js
```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = {
  window: {},
  console
};
vm.createContext(sandbox);

[
  "event-bus.js",
  "trace-engine.js",
  "command-bus.js",
  "state-store.js",
  "persistence-service.js",
  "save-service.js",
  "entity-models.js",
  "component-registry.js",
  "service-registry.js",
  "simulation-engine.js",
  "lifeverse-state.js",
  "lifeverse-time.js",
  "lifeverse-needs.js",
  "lifeverse-player.js",
  "lifeverse-activities.js",
  "lifeverse-career.js",
  "lifeverse-education.js",
  "lifeverse-finance.js",
  "lifeverse-housing.js",
  "lifeverse-transportation.js",
  "lifeverse-system-registry.js",
  "lifeverse-life-report.js",
  "lifeverse-fast-forward.js",
  "lifeverse-core.js"
].forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, sandbox, { filename: file });
});

const game = sandbox.window.LifeVerseGame;
assert.ok(game, "LifeVerseGame namespace exists");
["career", "education", "finance", "housing", "transportation"].forEach((systemId) => {
  assert.ok(game.getSystem(systemId), `Phase 2 registers ${systemId}`);
});

const state = game.createInitialState({ profile: { username: "Aina" } });
const startMinutes = state.time.totalMinutes;

const careerStart = state.career.readiness;
const career = game.performSystemAction(state, "career", "prepare-portfolio");
assert.ok(!career.error, "career action completes");
assert.ok(state.career.readiness > careerStart, "career readiness changes");

const creditsStart = state.education.credits;
const education = game.performSystemAction(state, "education", "deep-study-session");
assert.ok(!education.error, "education action completes");
assert.ok(state.education.credits > creditsStart, "education credits change");

const savingsStart = state.finance.savings;
const finance = game.performSystemAction(state, "finance", "save-emergency-money");
assert.ok(!finance.error, "finance action completes");
assert.ok(state.finance.savings > savingsStart, "savings change");

const comfortStart = state.housing.comfort;
const housing = game.performSystemAction(state, "housing", "clean-maintain-home");
assert.ok(!housing.error, "housing action completes");
assert.ok(state.housing.comfort > comfortStart, "housing comfort changes");

const commuteStressStart = state.transportation.commuteStress;
const transport = game.performSystemAction(state, "transportation", "plan-commute");
assert.ok(!transport.error, "transportation action completes");
assert.ok(state.transportation.commuteStress < commuteStressStart, "commute stress changes");

assert.ok(state.time.totalMinutes > startMinutes, "system decisions consume time");
assert.ok(state.schedule.length >= 5, "system decisions record schedule entries");
assert.ok(state.events.some((event) => event.type === "career"), "career event recorded");
assert.ok(state.events.some((event) => event.type === "education"), "education event recorded");
assert.ok(state.events.some((event) => event.type === "finance"), "finance event recorded");
assert.ok(state.events.some((event) => event.type === "housing"), "housing event recorded");
assert.ok(state.events.some((event) => event.type === "transportation"), "transportation event recorded");

const view = game.getViewModel(state);
["career", "education", "finance", "housing", "transportation"].forEach((systemId) => {
  assert.ok(view.systems.some((system) => system.id === systemId), `view model exposes ${systemId}`);
});
assert.ok(view.systems.every((system) => system.actions.length), "each system exposes playable decisions");

const dayBefore = state.time.day;
const moneyBefore = state.finance.money;
const fastForward = game.fastForward(state, 30);
assert.ok(!fastForward.error, "fast forward completes with Phase 2 systems");
assert.ok(state.time.day > dayBefore, "fast forward advances time");
assert.ok(state.finance.money < moneyBefore, "fast forward applies life costs");
assert.ok(state.reports.length >= 1, "fast forward creates a Life Report");
assert.ok(fastForward.event.systems.includes("Education"), "fast forward tracks education");
assert.ok(fastForward.event.systems.includes("Housing"), "fast forward tracks housing");
assert.ok(fastForward.event.systems.includes("Transportation"), "fast forward tracks transportation");
assert.ok(fastForward.report.consequences.some((item) => item.includes("Career readiness")), "Life Report includes career");
assert.ok(fastForward.report.consequences.some((item) => item.includes("Education progress")), "Life Report includes education");

console.log("LifeVerse Phase 2 tests passed.");

```

## tests/lifeverse-phase3.test.js
```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = {
  window: {},
  console
};
vm.createContext(sandbox);

[
  "event-bus.js",
  "trace-engine.js",
  "command-bus.js",
  "state-store.js",
  "persistence-service.js",
  "save-service.js",
  "entity-models.js",
  "component-registry.js",
  "service-registry.js",
  "simulation-engine.js",
  "lifeverse-state.js",
  "lifeverse-time.js",
  "lifeverse-needs.js",
  "lifeverse-player.js",
  "lifeverse-activities.js",
  "lifeverse-career.js",
  "lifeverse-education.js",
  "lifeverse-finance.js",
  "lifeverse-housing.js",
  "lifeverse-transportation.js",
  "lifeverse-relationships.js",
  "lifeverse-health.js",
  "lifeverse-mental-wellbeing.js",
  "lifeverse-economy.js",
  "lifeverse-npc-simulation.js",
  "lifeverse-system-registry.js",
  "lifeverse-life-report.js",
  "lifeverse-fast-forward.js",
  "lifeverse-core.js"
].forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, sandbox, { filename: file });
});

const game = sandbox.window.LifeVerseGame;
assert.ok(game, "LifeVerseGame namespace exists");

[
  "relationships",
  "health",
  "mentalWellbeing",
  "economy",
  "npcSimulation"
].forEach((systemId) => {
  assert.ok(game.getSystem(systemId), `${systemId} system is registered`);
});

const state = game.createInitialState({ profile: { username: "Aina" } });
const startMinutes = state.time.totalMinutes;

const friendsStart = state.relationships.friends;
const relationships = game.performSystemAction(state, "relationships", "meet-friends");
assert.ok(!relationships.error, "relationship action completes");
assert.ok(state.relationships.friends > friendsStart, "friendship value changes");

const sleepStart = state.health.sleepQuality;
const health = game.performSystemAction(state, "health", "sleep-recovery");
assert.ok(!health.error, "health action completes");
assert.ok(state.health.sleepQuality > sleepStart, "sleep quality changes");

const confidenceStart = state.mentalWellbeing.confidence;
const mental = game.performSystemAction(state, "mentalWellbeing", "confidence-action");
assert.ok(!mental.error, "mental wellbeing action completes");
assert.ok(state.mentalWellbeing.confidence > confidenceStart, "confidence changes");

const dailyCostStart = state.finance.dailyLivingCost;
const economy = game.performSystemAction(state, "economy", "adjust-budget-for-inflation");
assert.ok(!economy.error, "economy action completes");
assert.ok(state.finance.dailyLivingCost < dailyCostStart, "budget action changes living cost");

const communityStart = state.npcSimulation.communityTrust;
const auntieStart = state.npcs.find((npc) => npc.id === "npc-auntie-lim").relationship;
const npc = game.performSystemAction(state, "npcSimulation", "greet-neighbour");
assert.ok(!npc.error, "NPC action completes");
assert.ok(state.npcSimulation.communityTrust > communityStart, "community trust changes");
assert.ok(state.npcs.find((item) => item.id === "npc-auntie-lim").relationship > auntieStart, "NPC relationship changes");

assert.ok(state.time.totalMinutes > startMinutes, "new system decisions consume time");
assert.ok(state.events.some((event) => event.type === "relationships"), "relationship event recorded");
assert.ok(state.events.some((event) => event.type === "health"), "health event recorded");
assert.ok(state.events.some((event) => event.type === "mentalWellbeing"), "mental wellbeing event recorded");
assert.ok(state.events.some((event) => event.type === "economy"), "economy event recorded");
assert.ok(state.events.some((event) => event.type === "npcSimulation"), "NPC event recorded");

const view = game.getViewModel(state);
["relationships", "health", "mentalWellbeing", "economy", "npcSimulation"].forEach((systemId) => {
  assert.ok(view.systems.some((system) => system.id === systemId), `view model exposes ${systemId}`);
});

const dayBefore = state.time.day;
const npcLocationsBefore = state.npcs.map((item) => item.location).join(",");
const fastForward = game.fastForward(state, 14);
assert.ok(!fastForward.error, "fast forward completes with Phase 3 systems");
assert.ok(state.time.day > dayBefore, "fast forward advances time");
assert.ok(fastForward.event.systems.includes("Relationships"), "fast forward tracks relationships");
assert.ok(fastForward.event.systems.includes("Health"), "fast forward tracks health");
assert.ok(fastForward.event.systems.includes("Mental wellbeing"), "fast forward tracks mental wellbeing");
assert.ok(fastForward.event.systems.includes("Economy"), "fast forward tracks economy");
assert.ok(fastForward.event.systems.includes("NPC Simulation"), "fast forward tracks NPC simulation");
assert.notStrictEqual(state.npcs.map((item) => item.location).join(","), npcLocationsBefore, "NPC locations progress");
assert.ok(fastForward.report.consequences.some((item) => item.includes("Relationship support")), "Life Report includes relationships");
assert.ok(fastForward.report.consequences.some((item) => item.includes("Health is")), "Life Report includes health");
assert.ok(fastForward.report.consequences.some((item) => item.includes("Mental wellbeing")), "Life Report includes mental wellbeing");
assert.ok(fastForward.report.consequences.some((item) => item.includes("Economy:")), "Life Report includes economy");
assert.ok(fastForward.report.consequences.some((item) => item.includes("NPC world")), "Life Report includes NPC simulation");

console.log("LifeVerse Phase 3 tests passed.");

```

## tests/lifeverse-phase4.test.js
```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = {
  window: {},
  console
};
vm.createContext(sandbox);

[
  "event-bus.js",
  "trace-engine.js",
  "command-bus.js",
  "state-store.js",
  "persistence-service.js",
  "save-service.js",
  "entity-models.js",
  "component-registry.js",
  "service-registry.js",
  "simulation-engine.js",
  "lifeverse-state.js",
  "lifeverse-time.js",
  "lifeverse-needs.js",
  "lifeverse-player.js",
  "lifeverse-activities.js",
  "lifeverse-career.js",
  "lifeverse-education.js",
  "lifeverse-finance.js",
  "lifeverse-housing.js",
  "lifeverse-transportation.js",
  "lifeverse-relationships.js",
  "lifeverse-health.js",
  "lifeverse-mental-wellbeing.js",
  "lifeverse-economy.js",
  "lifeverse-npc-simulation.js",
  "lifeverse-world-simulation.js",
  "lifeverse-progression.js",
  "lifeverse-system-registry.js",
  "lifeverse-life-report.js",
  "lifeverse-fast-forward.js",
  "lifeverse-core.js"
].forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, sandbox, { filename: file });
});

const game = sandbox.window.LifeVerseGame;
assert.ok(game, "LifeVerseGame namespace exists");
assert.ok(game.getSystem("worldSimulation"), "World Simulation system is registered");
assert.ok(game.getSystem("progression"), "Progression system is registered");

const state = game.createInitialState({ profile: { username: "Aina" } });
const systems = game.getViewModel(state).systems.map((system) => system.id);
assert.ok(systems.includes("worldSimulation"), "view model exposes world simulation");
assert.ok(systems.includes("progression"), "view model exposes progression");

const startXp = state.progression.lifeXp;
const world = game.performSystemAction(state, "worldSimulation", "monitor-world-conditions");
assert.ok(!world.error, "world simulation action completes");
assert.ok(state.worldSimulation.randomEvents.length >= 1, "world event is recorded");
assert.ok(state.events.some((event) => event.type === "worldSimulation"), "world simulation event recorded");

const inflationPlan = game.performSystemAction(state, "worldSimulation", "plan-for-inflation");
assert.ok(!inflationPlan.error, "inflation planning action completes");
assert.ok(state.finance.confidence > 36, "inflation planning affects finance");

const progression = game.performSystemAction(state, "progression", "set-life-milestone");
assert.ok(!progression.error, "progression action completes");
assert.ok(state.progression.lifeXp > startXp, "progression XP increases");
assert.ok(state.progression.milestones.length >= 1, "milestone is created");
assert.ok(state.progression.achievements.some((achievement) => achievement.id === "first-milestone"), "achievement is unlocked");

const xpBeforeActivity = state.progression.lifeXp;
const activity = game.performActivity(state, "journal-reflection", { locationId: "home" });
assert.ok(!activity.error, "ordinary activity still completes");
assert.ok(state.progression.lifeXp > xpBeforeActivity, "activities also affect progression");

[7, 30, 180, 365, 1825].forEach((days) => {
  const testState = game.createInitialState({ profile: { username: "Aina" } });
  const beforeDay = testState.time.day;
  const result = game.fastForward(testState, days);
  assert.ok(!result.error, `${days}-day Fast Forward completes`);
  assert.ok(testState.time.day > beforeDay, `${days}-day Fast Forward advances time`);
  assert.ok(result.event.systems.includes("World Simulation"), `${days}-day Fast Forward tracks world simulation`);
  assert.ok(result.event.systems.includes("NPC Simulation"), `${days}-day Fast Forward tracks NPC simulation`);
  assert.ok(testState.worldSimulation.randomEvents.length >= 1, `${days}-day Fast Forward records world events`);
  assert.ok(testState.progression.lifeXp > 0, `${days}-day Fast Forward increases XP`);
  assert.ok(result.report.causeAndEffect.length, `${days}-day report has cause and effect`);
  assert.ok(result.report.worldExplanations.length, `${days}-day report has world explanations`);
  assert.ok(result.report.systemExplanations.length, `${days}-day report has system explanations`);
  assert.ok(result.report.progressionExplanations.length, `${days}-day report has progression explanations`);
});

const longState = game.createInitialState({ profile: { username: "Aina" } });
const fiveYear = game.fastForward(longState, 1825);
assert.ok(fiveYear.report.overview.includes("five-year"), "five-year report labels the horizon");
assert.ok(fiveYear.report.consequences.some((item) => item.includes("World simulation")), "report includes world simulation consequence");
assert.ok(fiveYear.report.consequences.some((item) => item.includes("Progression")), "report includes progression consequence");
assert.ok(fiveYear.report.progressionExplanations.some((item) => item.includes("Life XP")), "progression explanation includes XP");

console.log("LifeVerse Phase 4 tests passed.");

```

## tests/lifeverse-volume03-architecture.test.js
```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = {
  window: {},
  console
};
vm.createContext(sandbox);

[
  "event-bus.js",
  "trace-engine.js",
  "command-bus.js",
  "state-store.js",
  "persistence-service.js",
  "save-service.js",
  "entity-models.js",
  "component-registry.js",
  "service-registry.js",
  "simulation-engine.js",
  "lifeverse-state.js",
  "lifeverse-time.js",
  "lifeverse-needs.js",
  "lifeverse-player.js",
  "lifeverse-activities.js",
  "lifeverse-career.js",
  "lifeverse-education.js",
  "lifeverse-finance.js",
  "lifeverse-housing.js",
  "lifeverse-transportation.js",
  "lifeverse-relationships.js",
  "lifeverse-health.js",
  "lifeverse-mental-wellbeing.js",
  "lifeverse-economy.js",
  "lifeverse-npc-simulation.js",
  "lifeverse-world-simulation.js",
  "lifeverse-progression.js",
  "lifeverse-system-registry.js",
  "lifeverse-life-report.js",
  "lifeverse-fast-forward.js",
  "lifeverse-core.js"
].forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, sandbox, { filename: file });
});

const game = sandbox.window.LifeVerseGame;
assert.ok(game.getSimulationEngine, "Simulation Engine is registered");
assert.ok(game.getCommandBus, "Command Bus is registered");
assert.ok(game.getEventBus, "Event Bus is registered");
assert.ok(game.getTraceEngine, "Trace Engine is registered");
assert.ok(game.createStateStore, "State Store is registered");
assert.ok(game.getSaveService, "Save Service is registered");
assert.ok(game.entityModels, "Entity models are registered");
assert.ok(game.getComponentRegistry, "Component Registry is registered");
assert.ok(game.getServiceRegistry, "Service Registry is registered");

const state = game.createInitialState({ profile: { username: "Architect" } });
const engine = game.installLifeVerseArchitecture(state);
assert.ok(engine.diagnostics(state).registeredCommands.includes("StartActivityCommand"), "activity command handler is installed");

const commandResult = game.performActivityCommand(state, "work-shift", { locationId: "work" });
assert.ok(!commandResult.error, "activity command completes");
assert.ok(state.commandHistory.some((command) => command.type === "StartActivityCommand"), "command history records user intent");
assert.ok(state.eventHistory.some((event) => event.type === "activity"), "event history records completed activity fact");
assert.ok(state.traces.some((trace) => trace.eventType === "activity"), "trace engine records activity consequence");

const store = game.createStateStore(state);
const snapshot = store.snapshot("architecture-test");
assert.ok(snapshot.state, "snapshot stores complete state");
store.update((draft) => {
  draft.finance.money += 25;
}, { domain: "finance" });
assert.strictEqual(store.getState().finance.money, state.finance.money + 25, "state store applies deterministic update");
store.restore(snapshot);
assert.strictEqual(store.getState().finance.money, state.finance.money, "state store restores snapshot");

const save = game.saveLifeVerseState(state, { slot: "architecture-test" });
assert.ok(save.ok, "save service writes state");
const loaded = game.loadLifeVerseState({ slot: "architecture-test" });
assert.ok(loaded.ok, "save service loads state");
assert.strictEqual(loaded.state.player.name, "Architect", "loaded state preserves player");
assert.ok(Array.isArray(loaded.state.traces), "loaded state preserves traces");

const componentRegistry = game.getComponentRegistry();
assert.ok(componentRegistry.get("finance"), "finance component is registered");
assert.ok(componentRegistry.snapshotComponent(state, "finance").money >= 0, "component snapshot reads state only");

const entitySnapshot = game.entityModels.buildEntitySnapshot(state);
assert.strictEqual(entitySnapshot.player.id, "player-main", "player entity has stable identity");
assert.ok(entitySnapshot.npcs.length >= 1, "NPC entities are modelled");

const fastForward = game.fastForwardCommand(state, 30);
assert.ok(!fastForward.error, "Fast Forward command completes");
assert.ok(state.commandHistory.some((command) => command.type === "FastForwardCommand"), "Fast Forward is a command");
assert.ok(state.eventHistory.some((event) => event.type === "fast-forward"), "Fast Forward creates normal domain event");
assert.ok(state.traces.some((trace) => trace.eventType === "fast-forward"), "Fast Forward creates trace");
assert.ok(fastForward.report.traceSummary.length, "Life Report reads traces");
assert.ok(fastForward.snapshot && fastForward.snapshot.state, "Fast Forward keeps a snapshot");

const report = game.generateLifeReportCommand(state, { type: "reflection" });
assert.ok(report.traceSummary.length, "manual report includes trace summary");
assert.ok(report.aiInsights, "Life Report AI placeholder returns explainable insights");

const services = game.getServiceRegistry();
assert.ok(services.get("compassAiBoundary"), "Compass AI separation boundary exists");
assert.ok(services.get("lifeReportAi"), "Life Report AI service placeholder exists");

console.log("LifeVerse Volume 03 architecture tests passed.");

```
