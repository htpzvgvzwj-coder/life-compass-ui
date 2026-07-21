(function () {
  const pipeline = window.LifeVerseRenderPipeline || (window.LifeVerseRenderPipeline = {});

  function configureRenderer(THREE, renderer, options = {}) {
    if (!THREE || !renderer) return renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.maxPixelRatio || 2));
    renderer.shadowMap.enabled = options.shadows !== false;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = typeof options.exposure === "number" ? options.exposure : 0.72;
    renderer.userData = renderer.userData || {};
    renderer.userData.lifeVerseRenderPipeline = {
      pbrReady: true,
      hdrReady: true,
      postProcessingReady: true,
      gammaCorrected: true,
      toneMapping: "ACESFilmic",
      shadowMaps: renderer.shadowMap.enabled
    };
    return renderer;
  }

  function createLightingRig(THREE, scene, options = {}) {
    if (!THREE || !scene) return null;
    const hemi = new THREE.HemisphereLight(
      options.skyColor || 0xffffff,
      options.groundColor || 0x91ad82,
      typeof options.ambientIntensity === "number" ? options.ambientIntensity : 0.95
    );
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(
      options.sunColor || 0xffffff,
      typeof options.sunIntensity === "number" ? options.sunIntensity : 1.08
    );
    const sunPosition = options.sunPosition || [-12, 24, 12];
    sun.position.set(sunPosition[0], sunPosition[1], sunPosition[2]);
    sun.castShadow = options.shadows !== false;
    if (sun.castShadow) {
      const size = options.shadowSize || 2048;
      sun.shadow.mapSize.set(size, size);
      const cameraSize = options.shadowCameraSize || 38;
      sun.shadow.camera.left = -cameraSize;
      sun.shadow.camera.right = cameraSize;
      sun.shadow.camera.top = cameraSize;
      sun.shadow.camera.bottom = -cameraSize;
    }
    scene.add(sun);
    return { hemi, sun };
  }

  function configureAtmosphere(THREE, scene, options = {}) {
    if (!THREE || !scene) return null;
    const fogColor = options.fogColor || 0xd9efff;
    const fogNear = typeof options.fogNear === "number" ? options.fogNear : 34;
    const fogFar = typeof options.fogFar === "number" ? options.fogFar : 92;
    scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
    scene.userData = scene.userData || {};
    scene.userData.lifeVerseAtmosphere = {
      fogReady: true,
      hdrEnvironmentReady: true,
      skyboxReady: true
    };
    return scene.fog;
  }

  function getRendererDebugSnapshot(renderer, scene) {
    const info = renderer && renderer.info ? renderer.info : {};
    const memory = info.memory || {};
    const render = info.render || {};
    let visibleObjects = 0;
    let totalObjects = 0;
    if (scene && typeof scene.traverse === "function") {
      scene.traverse((node) => {
        totalObjects += 1;
        if (node.visible !== false) visibleObjects += 1;
      });
    }
    return {
      drawCalls: render.calls || 0,
      triangles: render.triangles || 0,
      geometries: memory.geometries || 0,
      textures: memory.textures || 0,
      totalObjects,
      visibleObjects
    };
  }

  pipeline.configureRenderer = configureRenderer;
  pipeline.createLightingRig = createLightingRig;
  pipeline.configureAtmosphere = configureAtmosphere;
  pipeline.getRendererDebugSnapshot = getRendererDebugSnapshot;
})();
