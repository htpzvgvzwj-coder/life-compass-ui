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
