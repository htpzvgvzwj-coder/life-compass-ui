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
