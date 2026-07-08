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
