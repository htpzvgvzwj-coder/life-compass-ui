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

  const POST_PROCESSING_SCRIPTS = [
    [
      "https://cdn.jsdelivr.net/npm/three@0.146.0/examples/js/postprocessing/EffectComposer.js",
      "https://unpkg.com/three@0.146.0/examples/js/postprocessing/EffectComposer.js"
    ],
    [
      "https://cdn.jsdelivr.net/npm/three@0.146.0/examples/js/postprocessing/RenderPass.js",
      "https://unpkg.com/three@0.146.0/examples/js/postprocessing/RenderPass.js"
    ],
    [
      "https://cdn.jsdelivr.net/npm/three@0.146.0/examples/js/postprocessing/ShaderPass.js",
      "https://unpkg.com/three@0.146.0/examples/js/postprocessing/ShaderPass.js"
    ],
    [
      "https://cdn.jsdelivr.net/npm/three@0.146.0/examples/js/shaders/CopyShader.js",
      "https://unpkg.com/three@0.146.0/examples/js/shaders/CopyShader.js"
    ]
  ];

  // Cel outline via post-processing (depth + normal edge detection), not inverted-hull duplication.
  // Reference approach: https://github.com/mayacoda/toon-shader and https://github.com/manbust/three-js-toon-shader
  const OutlineEdgeShader = {
    uniforms: {
      tDiffuse: { value: null },
      tDepth: { value: null },
      tNormal: { value: null },
      resolution: { value: null },
      cameraNear: { value: 0.1 },
      cameraFar: { value: 180 },
      outlineColor: { value: null },
      depthThreshold: { value: 0.35 },
      normalThreshold: { value: 0.6 },
      outlineThickness: { value: 1.4 },
      fadeDistance: { value: 70 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform sampler2D tDepth;
      uniform sampler2D tNormal;
      uniform vec2 resolution;
      uniform float cameraNear;
      uniform float cameraFar;
      uniform vec3 outlineColor;
      uniform float depthThreshold;
      uniform float normalThreshold;
      uniform float outlineThickness;
      uniform float fadeDistance;
      varying vec2 vUv;

      float linearizeDepth(float depth) {
        float z = depth * 2.0 - 1.0;
        return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
      }

      void main() {
        vec2 texel = outlineThickness / resolution;
        vec2 offsets[4];
        offsets[0] = vec2(texel.x, 0.0);
        offsets[1] = vec2(-texel.x, 0.0);
        offsets[2] = vec2(0.0, texel.y);
        offsets[3] = vec2(0.0, -texel.y);

        float centerDepth = linearizeDepth(texture2D(tDepth, vUv).x);
        vec3 centerNormal = normalize(texture2D(tNormal, vUv).rgb * 2.0 - 1.0);

        float depthEdge = 0.0;
        float normalEdge = 0.0;
        for (int i = 0; i < 4; i++) {
          vec2 uv2 = vUv + offsets[i];
          float sampleDepth = linearizeDepth(texture2D(tDepth, uv2).x);
          vec3 sampleNormal = normalize(texture2D(tNormal, uv2).rgb * 2.0 - 1.0);
          depthEdge += abs(centerDepth - sampleDepth);
          normalEdge += (1.0 - dot(centerNormal, sampleNormal));
        }

        float depthFactor = step(depthThreshold, depthEdge);
        float normalFactor = step(normalThreshold, normalEdge);
        float edge = clamp(max(depthFactor, normalFactor), 0.0, 1.0);

        float fade = clamp(1.0 - (centerDepth / fadeDistance), 0.0, 1.0);
        edge *= mix(0.35, 1.0, fade);

        vec4 base = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(mix(base.rgb, outlineColor, edge), base.a);
      }
    `
  };

  function injectPostProcessingScript(src) {
    return new Promise((resolve, reject) => {
      if (typeof document === "undefined") return reject(new Error("Document is unavailable."));
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  async function loadFirstAvailable(urls) {
    let lastError = null;
    for (const url of urls) {
      try {
        await injectPostProcessingScript(url);
        return true;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Script failed to load.");
  }

  let postProcessingPromise = null;
  function ensurePostProcessing(THREE) {
    if (THREE.EffectComposer && THREE.RenderPass && THREE.ShaderPass && THREE.CopyShader) {
      return Promise.resolve(true);
    }
    if (!postProcessingPromise) {
      postProcessingPromise = (async () => {
        for (const urls of POST_PROCESSING_SCRIPTS) {
          await loadFirstAvailable(urls);
        }
        if (!(THREE.EffectComposer && THREE.RenderPass && THREE.ShaderPass && THREE.CopyShader)) {
          throw new Error("Post-processing classes did not register on THREE.");
        }
        return true;
      })().catch((error) => {
        postProcessingPromise = null;
        throw error;
      });
    }
    return postProcessingPromise;
  }

  function createOutlinePipeline(THREE, renderer, scene, camera, options = {}) {
    return ensurePostProcessing(THREE).then(() => {
      const pixelRatio = renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
      let width = Math.max(2, Math.round((options.width || 1) * pixelRatio));
      let height = Math.max(2, Math.round((options.height || 1) * pixelRatio));

      const depthTexture = new THREE.DepthTexture(width, height);
      depthTexture.type = THREE.UnsignedShortType;
      const normalTarget = new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthTexture
      });
      const normalMaterial = new THREE.MeshNormalMaterial();

      const composer = new THREE.EffectComposer(renderer);
      composer.setSize(width, height);
      composer.addPass(new THREE.RenderPass(scene, camera));

      const uniforms = THREE.UniformsUtils.clone(OutlineEdgeShader.uniforms);
      const outlinePass = new THREE.ShaderPass({
        uniforms,
        vertexShader: OutlineEdgeShader.vertexShader,
        fragmentShader: OutlineEdgeShader.fragmentShader
      });
      outlinePass.renderToScreen = true;
      outlinePass.uniforms.tNormal.value = normalTarget.texture;
      outlinePass.uniforms.tDepth.value = normalTarget.depthTexture;
      outlinePass.uniforms.resolution.value = new THREE.Vector2(width, height);
      outlinePass.uniforms.cameraNear.value = camera.near;
      outlinePass.uniforms.cameraFar.value = camera.far;
      outlinePass.uniforms.outlineColor.value = new THREE.Color(typeof options.outlineColor === "number" ? options.outlineColor : 0x171310);
      if (typeof options.depthThreshold === "number") outlinePass.uniforms.depthThreshold.value = options.depthThreshold;
      if (typeof options.normalThreshold === "number") outlinePass.uniforms.normalThreshold.value = options.normalThreshold;
      if (typeof options.outlineThickness === "number") outlinePass.uniforms.outlineThickness.value = options.outlineThickness;
      if (typeof options.fadeDistance === "number") outlinePass.uniforms.fadeDistance.value = options.fadeDistance;
      composer.addPass(outlinePass);

      let enabled = true;
      // Three.js resets renderer.info.render.calls at the start of every single
      // renderer.render() call. This pipeline issues several per visual frame
      // (the normal/depth pre-pass, then the composer's beauty pass, then its
      // ShaderPass screen quad) - left on auto-reset, the debug panel only ever
      // saw the count from that last full-screen quad (always ~1), never the
      // real per-frame total. Take over resetting manually, once per frame.
      renderer.info.autoReset = false;

      function renderNormalDepth() {
        const previousTarget = renderer.getRenderTarget();
        const previousOverride = scene.overrideMaterial;
        const previousBackground = scene.background;
        scene.overrideMaterial = normalMaterial;
        scene.background = null;
        renderer.setRenderTarget(normalTarget);
        renderer.clear();
        renderer.render(scene, camera);
        renderer.setRenderTarget(previousTarget);
        scene.overrideMaterial = previousOverride;
        scene.background = previousBackground;
      }

      function render() {
        renderer.info.reset();
        if (!enabled) {
          renderer.render(scene, camera);
          return;
        }
        renderNormalDepth();
        composer.render();
      }

      function setSize(cssWidth, cssHeight) {
        const ratio = renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
        width = Math.max(2, Math.round(cssWidth * ratio));
        height = Math.max(2, Math.round(cssHeight * ratio));
        normalTarget.setSize(width, height);
        composer.setSize(width, height);
        outlinePass.uniforms.resolution.value.set(width, height);
      }

      function setEnabled(value) {
        enabled = Boolean(value);
      }

      function dispose() {
        renderer.info.autoReset = true;
        normalTarget.dispose();
        normalMaterial.dispose();
        if (composer.dispose) composer.dispose();
      }

      return { render, setSize, setEnabled, isEnabled: () => enabled, dispose, composer, outlinePass };
    });
  }

  pipeline.configureRenderer = configureRenderer;
  pipeline.createLightingRig = createLightingRig;
  pipeline.configureAtmosphere = configureAtmosphere;
  pipeline.getRendererDebugSnapshot = getRendererDebugSnapshot;
  pipeline.ensurePostProcessing = ensurePostProcessing;
  pipeline.createOutlinePipeline = createOutlinePipeline;
})();
