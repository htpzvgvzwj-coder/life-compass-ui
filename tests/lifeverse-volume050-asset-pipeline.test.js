const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

function makeFakeThree() {
  class Color {
    constructor(value = 0xffffff) {
      this.value = value;
    }
    clone() {
      return new Color(this.value);
    }
  }

  class Object3D {
    constructor() {
      this.name = "";
      this.children = [];
      this.userData = {};
      this.visible = true;
      this.isObject3D = true;
      this.position = { set: (x, y, z) => { this._position = [x, y, z]; } };
      this.rotation = { set: (x, y, z) => { this._rotation = [x, y, z]; } };
      this.scale = { set: (x, y, z) => { this._scale = [x, y, z]; } };
    }
    add(child) {
      this.children.push(child);
      return child;
    }
    traverse(callback) {
      callback(this);
      this.children.forEach((child) => child.traverse ? child.traverse(callback) : callback(child));
    }
    clone() {
      const copy = new this.constructor();
      copy.name = this.name;
      copy.userData = { ...this.userData };
      copy.children = this.children.map((child) => child.clone ? child.clone() : child);
      return copy;
    }
  }

  class Group extends Object3D {}
  class Mesh extends Object3D {
    constructor(geometry, material) {
      super();
      this.geometry = geometry;
      this.material = material;
      this.isMesh = true;
    }
  }

  class Material {
    constructor(options = {}) {
      Object.assign(this, options);
      this.userData = {};
    }
  }

  class TextureLoader {
    load(url, onLoad) {
      onLoad({ name: url, dispose() {} });
    }
  }

  class GLTFLoader {
    load(url, onLoad) {
      const scene = new Group();
      const mesh = new Mesh(new BoxGeometry(1, 1, 1), new Material({ color: new Color(0xffffff) }));
      mesh.name = "Loaded Mesh";
      scene.add(mesh);
      onLoad({ scene, animations: [{ name: "idle" }] });
    }
  }

  class BoxGeometry {
    constructor(x, y, z) {
      this.size = [x, y, z];
    }
  }

  return {
    Color,
    Group,
    Mesh,
    BoxGeometry,
    MeshBasicMaterial: Material,
    MeshStandardMaterial: Material,
    MeshToonMaterial: Material,
    TextureLoader,
    GLTFLoader,
    SRGBColorSpace: "srgb",
    ACESFilmicToneMapping: "aces",
    PCFSoftShadowMap: "pcf"
  };
}

const sandbox = {
  window: {},
  console,
  fetch: async () => ({
    ok: true,
    json: async () => ({
      enabled: true,
      environment: { id: "district", url: "assets/environment/test-district.glb" },
      character: { id: "player", url: "assets/characters/test-player.glb" },
      locationModels: [{ id: "food", url: "assets/environment/food-court.glb" }],
      prefabs: [{ id: "prop:bench", url: "assets/props/bench.glb" }]
    })
  })
};
vm.createContext(sandbox);

[
  "lifeverse-material-library.js",
  "lifeverse-render-pipeline.js",
  "lifeverse-asset-manager.js"
].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), sandbox, { filename: file });
});

const requiredFolders = [
  "assets/models",
  "assets/characters",
  "assets/characters/animations",
  "assets/environment",
  "assets/props",
  "assets/textures",
  "assets/materials",
  "assets/icons",
  "assets/audio"
];
requiredFolders.forEach((folder) => {
  assert.ok(fs.existsSync(path.join(root, folder)), `${folder} exists`);
});

const THREE = makeFakeThree();
const materials = sandbox.window.LifeVerseAssets.createMaterialLibrary(THREE, { pipeline: "pbr" });
const road = materials.get("road");
assert.ok(road.userData.lifeVerseMaterial.upgradeReady, "material library creates upgrade-ready materials");
assert.ok(materials.snapshot().definitions.includes("glass"), "material library exposes reusable material definitions");

const manager = sandbox.window.LifeVerseAssets.createAssetManager({ THREE, materialLibrary: materials, logger: { warn() {} } });
assert.ok(manager.registerPrefab("prop:test", { url: "assets/props/test.glb" }), "prefab registration works");

(async () => {
  const manifest = await manager.loadManifest("assets/life-sim/asset-manifest.json");
  assert.ok(manifest.enabled, "manifest loading works");
  assert.ok(manager.prefabs.has("environment:main"), "manifest registers environment prefab");
  assert.ok(manager.prefabs.has("location:food"), "manifest registers location prefab");
  assert.ok(manager.prefabs.has("character:player"), "manifest registers character prefab");

  const model = await manager.loadModel("assets/environment/test-district.glb", { toonify: true });
  assert.strictEqual(model.kind, "gltf", "GLTF/GLB model loading works through Asset Manager");
  assert.ok(manager.loadedAssets.has("assets/environment/test-district.glb"), "loaded model is cached in loaded assets");

  const modelAgain = await manager.loadModel("assets/environment/test-district.glb", { toonify: true });
  assert.strictEqual(modelAgain, model, "model cache returns the same loaded asset");

  const texture = await manager.loadTexture("assets/textures/concrete-albedo.webp", { name: "concrete albedo" });
  assert.ok(texture, "texture loading works");

  const material = await manager.loadMaterial("concrete", { textures: { albedo: "assets/textures/concrete-albedo.webp" } });
  assert.ok(material, "material loading works");

  const missing = await manager.loadModel("assets/models/future-file.fbx", { type: "fbx", label: "Future FBX" });
  assert.ok(missing.fallback, "missing/future FBX creates fallback instead of crashing");
  assert.ok(manager.missingAssets.has("assets/models/future-file.fbx"), "missing asset is recorded");

  const snapshot = manager.getDebugSnapshot({ info: { memory: { textures: 1 }, render: { calls: 2 } } }, new THREE.Group());
  assert.strictEqual(snapshot.drawCalls, 2, "debug snapshot reports draw calls");
  assert.ok(snapshot.loadedMaterials.materialCount >= 1, "debug snapshot reports loaded materials");

  const appSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const simSource = fs.readFileSync(path.join(root, "life-sim.js"), "utf8");
  assert.ok(appSource.includes("lifeverse-asset-manager.js"), "asset manager is loaded before Life Sim");
  assert.ok(appSource.includes("lifeverse-render-pipeline.js"), "render pipeline is loaded before Life Sim");
  assert.ok(simSource.includes("createAssetManager"), "Life Sim creates a centralized asset manager");
  assert.ok(simSource.includes("assetManager.instantiatePrefab"), "Life Sim production prefabs load through Asset Manager");
  assert.ok(!simSource.includes("new THREE.GLTFLoader"), "Life Sim no longer creates GLTF loaders directly");

  console.log("LifeVerse Volume 5.0 asset pipeline tests passed.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
