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
