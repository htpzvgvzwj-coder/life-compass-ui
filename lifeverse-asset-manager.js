(function () {
  const namespace = window.LifeVerseAssets || (window.LifeVerseAssets = {});

  const DEFAULT_MANIFEST_URL = "assets/life-sim/asset-manifest.json";

  function createAssetManager(options = {}) {
    const THREE = options.THREE;
    if (!THREE) throw new Error("THREE is required for LifeVerse Asset Manager.");

    const materialLibrary = options.materialLibrary || (namespace.createMaterialLibrary && namespace.createMaterialLibrary(THREE));
    const logger = options.logger || console;
    const cache = new Map();
    const textures = new Map();
    const prefabs = new Map();
    const loadedAssets = new Map();
    const missingAssets = new Map();
    const fallbackAssets = new Map();
    const lazyLoaders = new Map();
    const manifestUrl = options.manifestUrl || DEFAULT_MANIFEST_URL;
    let dracoLoaderPromise = null;

    async function loadManifest(url = manifestUrl) {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Asset manifest failed: ${response.status}`);
      const manifest = await response.json();
      registerManifestPrefabs(manifest);
      return manifest;
    }

    function registerManifestPrefabs(manifest = {}) {
      if (manifest.environment) registerPrefab("environment:main", manifest.environment);
      if (manifest.character) registerPrefab("character:player", manifest.character);
      (manifest.locationModels || []).forEach((entry) => registerPrefab(`location:${entry.id || entry.label || entry.url}`, entry));
      (manifest.prefabs || []).forEach((entry) => registerPrefab(entry.id, entry));
    }

    async function ensureGltfLoader() {
      if (THREE.GLTFLoader) return true;
      const urls = [
        "https://cdn.jsdelivr.net/npm/three@0.146.0/examples/js/loaders/GLTFLoader.js",
        "https://unpkg.com/three@0.146.0/examples/js/loaders/GLTFLoader.js"
      ];
      for (const url of urls) {
        try {
          await injectScript(url);
          if (THREE.GLTFLoader) return true;
        } catch (error) {
          logger.warn && logger.warn(`[LifeVerse Assets] GLTFLoader failed from ${url}`, error);
        }
      }
      return false;
    }

    async function ensureDracoLoader() {
      if (dracoLoaderPromise) return dracoLoaderPromise;
      dracoLoaderPromise = (async () => {
        if (!THREE.DRACOLoader) {
          const urls = [
            "https://cdn.jsdelivr.net/npm/three@0.146.0/examples/js/loaders/DRACOLoader.js",
            "https://unpkg.com/three@0.146.0/examples/js/loaders/DRACOLoader.js"
          ];
          for (const url of urls) {
            try {
              await injectScript(url);
              if (THREE.DRACOLoader) break;
            } catch (error) {
              logger.warn && logger.warn(`[LifeVerse Assets] DRACOLoader failed from ${url}`, error);
            }
          }
        }
        if (!THREE.DRACOLoader) return null;
        const loader = new THREE.DRACOLoader();
        if (typeof loader.setDecoderPath === "function") loader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
        if (typeof loader.setDecoderConfig === "function") loader.setDecoderConfig({ type: "js" });
        return loader;
      })();
      return dracoLoaderPromise;
    }

    async function loadModel(url, config = {}) {
      if (!url) return createMissingAsset("missing-url", config);
      const type = String(config.type || url.split(".").pop() || "gltf").toLowerCase();
      const cacheKey = `model:${url}`;
      if (cache.has(cacheKey)) return cache.get(cacheKey);
      try {
        let result;
        if (type === "glb" || type === "gltf") result = await loadGltf(url, config);
        else if (type === "fbx") result = await loadFbx(url, config);
        else throw new Error(`Unsupported model type: ${type}`);
        cache.set(cacheKey, result);
        loadedAssets.set(url, { url, type, label: config.label || config.id || url, loadedAt: Date.now() });
        return result;
      } catch (error) {
        logger.warn && logger.warn(`[LifeVerse Assets] Model load failed: ${url}`, error);
        const fallback = createMissingAsset(url, config, error);
        cache.set(cacheKey, fallback);
        return fallback;
      }
    }

    async function loadGltf(url, config = {}) {
      const ready = await ensureGltfLoader();
      if (!ready || !THREE.GLTFLoader) throw new Error("GLTFLoader unavailable.");
      const loader = new THREE.GLTFLoader();
      if (config.draco !== false && typeof loader.setDRACOLoader === "function") {
        const dracoLoader = await ensureDracoLoader();
        if (dracoLoader) loader.setDRACOLoader(dracoLoader);
      }
      return new Promise((resolve, reject) => {
        loader.load(url, (gltf) => {
          if (gltf.scene) prepareModel(gltf.scene, config);
          resolve({ kind: "gltf", url, scene: gltf.scene, animations: gltf.animations || [], raw: gltf, fallback: false });
        }, undefined, reject);
      });
    }

    async function loadFbx(url, config = {}) {
      if (!THREE.FBXLoader) {
        throw new Error("FBX support is future-ready; FBXLoader is not bundled yet.");
      }
      const loader = new THREE.FBXLoader();
      return new Promise((resolve, reject) => {
        loader.load(url, (model) => {
          prepareModel(model, config);
          resolve({ kind: "fbx", url, scene: model, animations: model.animations || [], raw: model, fallback: false });
        }, undefined, reject);
      });
    }

    async function loadTexture(url, options = {}) {
      if (!url) return null;
      const cacheKey = `texture:${url}`;
      if (textures.has(cacheKey)) return textures.get(cacheKey);
      const loader = new THREE.TextureLoader();
      return new Promise((resolve) => {
        loader.load(url, (texture) => {
          texture.name = options.name || url;
          if (THREE.SRGBColorSpace && options.colorSpace !== "linear") texture.colorSpace = THREE.SRGBColorSpace;
          textures.set(cacheKey, texture);
          loadedAssets.set(url, { url, type: "texture", label: options.name || url, loadedAt: Date.now() });
          resolve(texture);
        }, undefined, (error) => {
          logger.warn && logger.warn(`[LifeVerse Assets] Texture load failed: ${url}`, error);
          missingAssets.set(url, { url, type: "texture", error: String(error && error.message || error || "Texture failed") });
          resolve(null);
        });
      });
    }

    async function loadMaterial(id, descriptor = {}) {
      if (!materialLibrary) return null;
      const material = materialLibrary.register ? materialLibrary.get(id, descriptor) : null;
      if (descriptor.textures) {
        for (const [slot, url] of Object.entries(descriptor.textures)) {
          const texture = await loadTexture(url, { name: `${id}:${slot}` });
          if (texture && materialLibrary.applyTexture) materialLibrary.applyTexture(id, slot, texture);
        }
      }
      return material;
    }

    function registerPrefab(id, descriptor = {}) {
      if (!id) throw new Error("Prefab id is required.");
      const normalized = { ...descriptor, id };
      prefabs.set(id, normalized);
      return normalized;
    }

    async function instantiatePrefab(id, scene, overrides = {}) {
      const descriptor = prefabs.get(id);
      if (!descriptor) return createMissingAsset(id, { label: id, ...overrides });
      const asset = await loadModel(descriptor.url, { ...descriptor, ...overrides });
      const instance = cloneAssetScene(asset.scene);
      if (instance) {
        prepareModel(instance, { ...descriptor, ...overrides });
        if (scene && typeof scene.add === "function") scene.add(instance);
      }
      return { ...asset, scene: instance || asset.scene, prefabId: id };
    }

    function registerLazy(id, loader) {
      lazyLoaders.set(id, loader);
      return id;
    }

    async function loadLazy(id) {
      if (cache.has(`lazy:${id}`)) return cache.get(`lazy:${id}`);
      const loader = lazyLoaders.get(id);
      if (!loader) return createMissingAsset(id, { label: id });
      const promise = Promise.resolve().then(loader);
      cache.set(`lazy:${id}`, promise);
      return promise;
    }

    // Realistic-style pivot: Objaverse scans arrive at wildly inconsistent
    // native scales (unlike a single hand-modeled kit, where one eyeballed
    // multiplier could cover ~30 buildings). Given a real-world target height
    // in meters, measure the model's actual bounding-box height post-rotation
    // and derive the uniform scale factor that hits it exactly - replaces the
    // "type in a scale multiplier and squint at it" pattern used for every
    // existing city-kit swap in life-sim.js's loadDistrictAssetSamples().
    function normalizeToHeight(model, targetMeters) {
      if (!model || typeof model.traverse !== "function" || typeof targetMeters !== "number" || !(targetMeters > 0)) return model;
      if (typeof model.updateMatrixWorld === "function") model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      if (!(size.y > 0) || !Number.isFinite(size.y)) return model;
      const factor = targetMeters / size.y;
      if (Number.isFinite(factor) && factor > 0) model.scale.multiplyScalar(factor);
      return model;
    }

    function alignBottomToGround(model, groundY = 0) {
      if (!model || typeof model.traverse !== "function") return model;
      if (typeof model.updateMatrixWorld === "function") model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      if (!Number.isFinite(box.min.y)) return model;
      const offsetY = groundY - box.min.y;
      if (Number.isFinite(offsetY) && Math.abs(offsetY) > 0.0001) model.position.y += offsetY;
      return model;
    }

    function resolveGroundY(config = {}) {
      if (typeof config.groundY === "number" && Number.isFinite(config.groundY)) return config.groundY;
      if (Array.isArray(config.position) && Number.isFinite(Number(config.position[1]))) return Number(config.position[1]);
      return 0;
    }

    function prepareModel(model, config = {}) {
      applyTransform(model, config);
      if (!model || typeof model.traverse !== "function") return model;
      if (typeof config.targetHeightMeters === "number") normalizeToHeight(model, config.targetHeightMeters);
      if (typeof config.targetHeightMeters === "number" && config.alignToGround !== false) alignBottomToGround(model, resolveGroundY(config));
      model.traverse((node) => {
        if (!node || !node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;
        node.frustumCulled = config.frustumCulled !== false;
        node.userData.lifeVerseAsset = {
          source: config.url || config.id || config.label || "registered-asset",
          lodReady: true,
          collisionReady: Boolean(config.collision)
        };
        if (config.toonify) node.material = toonifyMaterial(node.material);
      });
      return model;
    }

    function createMissingAsset(url, config = {}, error = null) {
      const label = config.label || config.id || url || "Missing asset";
      missingAssets.set(url || label, {
        url: url || "",
        label,
        type: config.type || "model",
        error: String(error && error.message || error || "Missing asset")
      });
      const fallback = createFallbackMarker(label);
      const result = { kind: "fallback", url, scene: fallback, animations: [], raw: null, fallback: true };
      fallbackAssets.set(url || label, result);
      return result;
    }

    function createFallbackMarker(label) {
      const group = new THREE.Group();
      group.name = `Missing Asset: ${label}`;
      group.userData.lifeVerseFallback = {
        label,
        debugOnly: true,
        replaceWithPrefab: true
      };
      const material = materialLibrary && materialLibrary.get ? materialLibrary.get("debugFallback") : new THREE.MeshBasicMaterial({ color: 0xff4f8b });
      const marker = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
      marker.name = "Debug Missing Asset Marker";
      marker.position.y = 0.5;
      group.add(marker);
      return group;
    }

    function applyTransform(model, config = {}) {
      if (!model || !model.position || !model.rotation || !model.scale) return;
      const position = config.position || [0, 0, 0];
      const rotation = config.rotation || [0, 0, 0];
      const scale = config.scale || [1, 1, 1];
      model.position.set(Number(position[0] || 0), Number(position[1] || 0), Number(position[2] || 0));
      model.rotation.set(Number(rotation[0] || 0), Number(rotation[1] || 0), Number(rotation[2] || 0));
      model.scale.set(Number(scale[0] || 1), Number(scale[1] || 1), Number(scale[2] || 1));
    }

    // Historically converted imported GLTF materials to MeshToonMaterial for
    // the Volume 5 anime cel-shading pass (docs/volume5-asset-pipeline.md).
    // That direction was dropped for a semi-realistic "Stylized Low Poly
    // City" PBR look, so this now normalizes into consistent PBR roughness/
    // metalness ranges instead - keeping the imported albedo/normal/etc maps
    // intact rather than discarding them the way the toon conversion did.
    function toonifyMaterial(sourceMaterial) {
      if (Array.isArray(sourceMaterial)) return sourceMaterial.map((material) => toonifyMaterial(material));
      if (!sourceMaterial) return materialLibrary && materialLibrary.get ? materialLibrary.get("debugFallback") : null;
      if (sourceMaterial.isMeshStandardMaterial || sourceMaterial.isMeshPhysicalMaterial) {
        sourceMaterial.roughness = Math.min(0.92, Math.max(0.35, typeof sourceMaterial.roughness === "number" ? sourceMaterial.roughness : 0.7));
        sourceMaterial.metalness = Math.min(0.35, typeof sourceMaterial.metalness === "number" ? sourceMaterial.metalness : 0.05);
        return sourceMaterial;
      }
      const pbr = new THREE.MeshStandardMaterial({
        color: sourceMaterial.color ? sourceMaterial.color.clone() : new THREE.Color(0xffffff),
        map: sourceMaterial.map || null,
        roughness: 0.7,
        metalness: 0.05,
        transparent: Boolean(sourceMaterial.transparent),
        opacity: typeof sourceMaterial.opacity === "number" ? sourceMaterial.opacity : 1
      });
      pbr.name = `${sourceMaterial.name || "asset"} PBR`;
      pbr.userData.lifeVerseMaterial = {
        source: sourceMaterial.name || "asset",
        generatedBy: "LifeVerseAssetManager"
      };
      return pbr;
    }

    function cloneAssetScene(scene) {
      if (!scene) return null;
      if (typeof scene.clone === "function") return scene.clone(true);
      return scene;
    }

    function getDebugSnapshot(renderer = null, scene = null) {
      const renderStats = window.LifeVerseRenderPipeline && window.LifeVerseRenderPipeline.getRendererDebugSnapshot
        ? window.LifeVerseRenderPipeline.getRendererDebugSnapshot(renderer, scene)
        : {};
      return {
        loadedAssets: Array.from(loadedAssets.values()),
        missingAssets: Array.from(missingAssets.values()),
        fallbackCount: fallbackAssets.size,
        prefabCount: prefabs.size,
        cacheSize: cache.size,
        textureCount: textures.size,
        loadedMaterials: materialLibrary && materialLibrary.snapshot ? materialLibrary.snapshot() : null,
        textureMemory: renderStats.textures || 0,
        drawCalls: renderStats.drawCalls || 0,
        fps: getFpsEstimate(),
        renderStats
      };
    }

    let frames = 0;
    let fps = 0;
    let lastFpsTime = Date.now();
    function tickDebugFrame() {
      frames += 1;
      const now = Date.now();
      const delta = now - lastFpsTime;
      if (delta >= 1000) {
        fps = Math.round((frames * 1000) / delta);
        frames = 0;
        lastFpsTime = now;
      }
      return fps;
    }

    function getFpsEstimate() {
      return fps;
    }

    function createDebugPanel(host, renderer, scene) {
      if (!host || typeof document === "undefined") return null;
      const storageEnabled = typeof localStorage !== "undefined" && localStorage.getItem("lifeverseAssetDebug") === "1";
      const queryEnabled = typeof location !== "undefined" && new URLSearchParams(location.search).get("assetDebug") === "1";
      const enabled = storageEnabled || queryEnabled;
      const panel = document.createElement("aside");
      panel.className = "lifeverse-asset-debug";
      panel.hidden = !enabled;
      panel.setAttribute("aria-label", "LifeVerse asset debug");
      host.appendChild(panel);
      function update() {
        tickDebugFrame();
        if (panel.hidden) return;
        const snapshot = getDebugSnapshot(renderer, scene);
        panel.innerHTML = `
          <strong>Asset Pipeline</strong>
          <span>FPS ${snapshot.fps || "--"}</span>
          <span>Draw ${snapshot.drawCalls}</span>
          <span>Textures ${snapshot.textureMemory}</span>
          <span>Assets ${snapshot.loadedAssets.length}</span>
          <span>Missing ${snapshot.missingAssets.length}</span>
          <span>Materials ${snapshot.loadedMaterials ? snapshot.loadedMaterials.materialCount : 0}</span>
        `;
      }
      return { update, panel };
    }

    function dispose() {
      cache.clear();
      textures.forEach((texture) => texture && texture.dispose && texture.dispose());
      textures.clear();
      prefabs.clear();
      lazyLoaders.clear();
    }

    return {
      loadManifest,
      registerManifestPrefabs,
      ensureGltfLoader,
      ensureDracoLoader,
      loadModel,
      loadTexture,
      loadMaterial,
      registerPrefab,
      instantiatePrefab,
      registerLazy,
      loadLazy,
      prepareModel,
      normalizeToHeight,
      alignBottomToGround,
      createMissingAsset,
      createDebugPanel,
      tickDebugFrame,
      getDebugSnapshot,
      dispose,
      cache,
      prefabs,
      loadedAssets,
      missingAssets
    };
  }

  function injectScript(src) {
    return new Promise((resolve, reject) => {
      if (typeof document === "undefined") return reject(new Error("Document is unavailable."));
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) existing.remove();
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  namespace.createAssetManager = createAssetManager;
})();
