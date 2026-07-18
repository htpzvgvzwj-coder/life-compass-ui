(function () {
  const namespace = window.LifeVerseAssets || (window.LifeVerseAssets = {});

  // Realistic-Singapore material pass: desaturated, real-world-plausible
  // tones (muted asphalt, tropical foliage, marina teal water, curtain-wall
  // glass) replacing the earlier pastel/candy-color anime-toy palette.
  // debugFallback stays hot pink on purpose - it's a missing-asset flag, not
  // a style choice.
  const materialDefinitions = {
    road: { color: 0x2b2e33, roughness: 0.8, metalness: 0.02, textureSlots: ["albedo", "normal", "roughness"] },
    grass: { color: 0x5f8f52, roughness: 0.88, metalness: 0.0, textureSlots: ["albedo", "normal"] },
    concrete: { color: 0xb7ae9a, roughness: 0.84, metalness: 0.0, textureSlots: ["albedo", "normal", "roughness"] },
    wood: { color: 0x8a5a34, roughness: 0.76, metalness: 0.0, textureSlots: ["albedo", "normal"] },
    metal: { color: 0x8f98a1, roughness: 0.42, metalness: 0.18, textureSlots: ["albedo", "normal", "metallic", "roughness"] },
    glass: { color: 0x9fc4d1, roughness: 0.16, metalness: 0.05, transparent: true, opacity: 0.7, textureSlots: ["albedo", "normal"] },
    water: { color: 0x1f6f7a, roughness: 0.34, metalness: 0.0, emissive: 0x02282e, textureSlots: ["albedo", "normal", "flow"] },
    stone: { color: 0x9d9480, roughness: 0.88, metalness: 0.0, textureSlots: ["albedo", "normal", "roughness"] },
    plastic: { color: 0x4a4f58, roughness: 0.55, metalness: 0.0, textureSlots: ["albedo", "normal"] },
    fabric: { color: 0xd8cfc0, roughness: 0.92, metalness: 0.0, textureSlots: ["albedo", "normal"] },
    debugFallback: { color: 0xff4f8b, roughness: 0.62, metalness: 0.0, emissive: 0x320016, textureSlots: [] }
  };

  function createMaterialLibrary(THREE, options = {}) {
    if (!THREE) throw new Error("THREE is required to create LifeVerse materials.");
    const usePbr = options.pipeline !== "toon";
    const shared = new Map();

    function createMaterial(key, overrides = {}) {
      const definition = { ...(materialDefinitions[key] || materialDefinitions.debugFallback), ...overrides };
      const materialOptions = {
        color: definition.color,
        emissive: definition.emissive || 0x000000,
        roughness: typeof definition.roughness === "number" ? definition.roughness : 0.7,
        metalness: typeof definition.metalness === "number" ? definition.metalness : 0.02,
        transparent: Boolean(definition.transparent),
        opacity: typeof definition.opacity === "number" ? definition.opacity : 1
      };
      const material = usePbr || definition.forcePbr
        ? new THREE.MeshStandardMaterial(materialOptions)
        : new THREE.MeshToonMaterial({
          color: materialOptions.color,
          emissive: materialOptions.emissive,
          transparent: materialOptions.transparent,
          opacity: materialOptions.opacity
        });
      material.name = `LifeVerse/${key}`;
      material.userData.lifeVerseMaterial = {
        key,
        textureSlots: definition.textureSlots || [],
        upgradeReady: true
      };
      return material;
    }

    function get(key, overrides = null) {
      const cacheKey = overrides ? `${key}:${JSON.stringify(overrides)}` : key;
      if (!shared.has(cacheKey)) shared.set(cacheKey, createMaterial(key, overrides || {}));
      return shared.get(cacheKey);
    }

    function register(key, descriptor) {
      materialDefinitions[key] = { ...(materialDefinitions[key] || {}), ...(descriptor || {}) };
      shared.delete(key);
      return materialDefinitions[key];
    }

    function applyTexture(key, slot, texture) {
      const material = get(key);
      if (!texture || !material) return material;
      if (slot === "albedo" || slot === "map") material.map = texture;
      if (slot === "normal") material.normalMap = texture;
      if (slot === "roughness") material.roughnessMap = texture;
      if (slot === "metallic" || slot === "metalness") material.metalnessMap = texture;
      material.needsUpdate = true;
      return material;
    }

    function snapshot() {
      return {
        materialCount: shared.size,
        materialKeys: Array.from(shared.keys()),
        definitions: Object.keys(materialDefinitions)
      };
    }

    return {
      get,
      register,
      applyTexture,
      snapshot,
      definitions: materialDefinitions
    };
  }

  namespace.materialDefinitions = materialDefinitions;
  namespace.createMaterialLibrary = createMaterialLibrary;
})();
