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
