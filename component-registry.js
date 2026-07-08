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
