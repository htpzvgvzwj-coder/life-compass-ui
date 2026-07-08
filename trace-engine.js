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
