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
