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
