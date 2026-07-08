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
