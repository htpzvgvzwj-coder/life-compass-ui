(function () {
  // Coordinates below are a compact, correctly-relative approximation of real
  // Singapore geography (+x = east, -x = west, +z = north, -z = south) - not
  // to-scale GPS, but Marina Bay sits on the south coast, Sentosa is further
  // south across the strait, Orchard Road is just north of downtown, NUS/
  // University Town is far west, Changi/Airport is far east, and the
  // Chinatown/Little India/Bugis trio sits where they really do relative to
  // the rest: south, north-central, and central.
  // Urban-planning replan (Volume 7 real-asset pass): the original compact
  // coordinates below packed every zone within 12-20 units of its neighbors,
  // which was fine for tiny primitive-box buildings but causes real modeled
  // buildings (12-20 unit footprints) to overlap. Every zone was replotted
  // with a verified minimum of ~28 world units of center-to-center clearance
  // from every OTHER zone (not just its nearest neighbor), while preserving
  // the existing compass geography (university stays far west, airport/
  // Changi far east, Woodlands the northmost point, the downtown ring -
  // marina-bay/chinatown/little-india/bugis/mall - kept as a recognizable
  // cluster around the CBD). This roughly tripled the map's area.
  const locationZones = [
    { id: "home", name: "Home", x: -30, z: 40, radius: 5.4 },
    { id: "gym", name: "Gym", x: -60, z: 52, radius: 4.5 },
    { id: "work", name: "Office", x: -25, z: -85, radius: 5 },
    { id: "food", name: "Food Court", x: 20, z: -95, radius: 5.4 },
    { id: "mall", name: "Shopping Mall", x: 0, z: -32, radius: 5.5 },
    { id: "park", name: "Park", x: 13, z: 23, radius: 6.2 },
    { id: "library", name: "Library", x: 41, z: 12, radius: 4.5 },
    { id: "hospital", name: "Hospital", x: 80, z: -53, radius: 4.8 },
    { id: "cafe", name: "Cafe", x: -50, z: -25, radius: 4 },
    { id: "beach", name: "Beach", x: 75, z: -82, radius: 5 },
    { id: "airport", name: "Airport", x: 110, z: -10, radius: 5.3 },
    { id: "train", name: "Train Station", x: -13, z: 8, radius: 4.6 },
    { id: "university", name: "University", x: -80, z: -5, radius: 5 },
    { id: "marina-bay", name: "Marina Bay", x: 40, z: -61, radius: 6 },
    { id: "chinatown", name: "Chinatown", x: 10, z: -61, radius: 5 },
    { id: "little-india", name: "Little India", x: 25, z: -14, radius: 5 },
    { id: "bugis", name: "Bugis", x: 50, z: -32, radius: 4.8 },
    // Raffles Place (CBD): the downtown ring (marina-bay/chinatown/
    // little-india/bugis/mall) already sits at the ~28-unit clearance
    // minimum from itself, so there was no legal slot for a 6th zone at the
    // ring's center. This is the closest position to Marina Bay found by a
    // verified grid search that still keeps >=28 units from every other
    // zone (margin here is ~29 units, to both Bugis and Hospital).
    { id: "raffles-place", name: "Raffles Place", x: 78, z: -24, radius: 5.5 },
    // Clarke Quay/Boat Quay: real-world geography has this riverside F&B
    // strip a short walk from Raffles Place along the Singapore River -
    // placed directly north of it (verified >=28 units from every zone,
    // margin 29 to Raffles Place itself, the nearest).
    { id: "clarke-quay", name: "Clarke Quay", x: 78, z: 5, radius: 5.2 },
    // Punggol: real Singapore's northeast waterfront new town. Placed far
    // northeast, well clear of everything (verified minimum clearance here
    // is 63+ units, the loosest of any zone - there was ample open space in
    // this direction, unlike the packed downtown ring).
    { id: "punggol", name: "Punggol", x: 90, z: 70, radius: 6.5 },
    // HDB Hub: government/adulting-services building, placed north of the
    // Park/Library cluster (verified >=28 units from every zone, margin
    // ~30 to Park, the nearest).
    { id: "hdb-hub", name: "HDB Hub", x: 32, z: 46, radius: 5 },
    // Woodlands sits at the true far north of real Singapore (by the
    // Causeway to Malaysia) - kept at its existing position (already built),
    // still the northmost point of the new, much larger map.
    { id: "woodlands", name: "Woodlands", x: 0, z: 50, radius: 7.5 }
  ];

  const LOCATION_SAFE_SPAWN_POINTS = {
    // Spawn outside the hawker/food-court shell. Spawning at the exact zone
    // center puts the camera under the roof or inside a wall on some saved
    // states, which reads as an instant black screen.
    food: [8, 0, -82],
    mall: [0, 0, -42],
    work: [-25, 0, -74],
    home: [-30, 0, 32],
    train: [-13, 0, 15],
    airport: [104, 0, -4],
    hospital: [75, 0, -48],
    university: [-76, 0, 2],
    gym: [-56, 0, 48],
    cafe: [-47, 0, -31]
  };

  const LOCATION_SAFE_SPAWN_YAWS = {
    food: Math.PI / 2,
    mall: Math.PI / 2,
    home: Math.PI * 0.78,
    train: Math.PI * 0.62
  };

  const OVER_SHOULDER_CAMERA = {
    // PUBG-style life-sim view: close, low, and slightly over the right
    // shoulder so the player sits on the left third while the street opens up.
    fov: 68,
    distance: 4.25,
    movingDistance: 3.9,
    height: 1.82,
    pitchHeight: 0.58,
    shoulderOffset: 0.9,
    lookAhead: 6.15,
    lookHeight: 1.44,
    movingLookAhead: 1.15,
    movingLookHeight: 0.12,
    minPitch: 0.18,
    maxPitch: 0.82,
    defaultPitch: 0.38,
    positionDamping: 8.6,
    lookDamping: 10.4
  };

  const PLAYER_VISUAL_REFERENCE = {
    heightMeters: 1.72,
    fallbackScale: 0.56
  };

  const LIFE_SIM_SCALE_BUDGETS = {
    playerHeightMeters: PLAYER_VISUAL_REFERENCE.heightMeters,
    hawkerPavilionHeightMeters: 6.2,
    hawkerShopHeightMeters: 5.6,
    shophouseHeightMeters: 11.5,
    hdbBlockHeightMeters: 24,
    roadLaneWidthMeters: 3.5,
    sidewalkMinWidthMeters: 1.6
  };

  const LIFE_SIM_PERFORMANCE = {
    // Mobile browser first: 2x rendering + 2048 shadows made the simulator
    // feel stuck on entry while shaders, textures, and models all uploaded.
    maxPixelRatio: 1,
    shadowSize: 512,
    shadowCameraSize: 34,
    shadowsEnabled: false,
    nearAssetConcurrency: 1,
    farAssetConcurrency: 1,
    farAssetDelayMs: 6200,
    roadPropsDelayMs: 4200,
    plazaPropsDelayMs: 7200,
    urbanReplacementPropsDelayMs: 9800,
    farPropsDelayMs: 3000,
    remoteCharacterDelayMs: 2600,
    remoteCharacterTimeoutMs: 5500,
    propYieldEvery: 2
  };

  function mount(root, options = {}) {
    if (!root) return null;
    root.innerHTML = "";

    if (!window.THREE) {
      root.innerHTML = `
        <div class="sim-canvas-fallback">
          <strong>3D engine is loading</strong>
          <span>Refresh once if the simulator does not appear. The public app needs internet access to load the lightweight 3D engine.</span>
        </div>
      `;
      return { destroy() {} };
    }

    const THREE = window.THREE;
    const host = root.closest("[data-life-sim-game]") || root;
    const scene = new THREE.Scene();
    scene.background = createSkyTexture(THREE);
    if (window.LifeVerseRenderPipeline && window.LifeVerseRenderPipeline.configureAtmosphere) {
      window.LifeVerseRenderPipeline.configureAtmosphere(THREE, scene, { fogColor: 0xcdd2c2, fogNear: 38, fogFar: 104 });
    } else {
      scene.fog = new THREE.Fog(0xcdd2c2, 38, 104);
    }

    const camera = new THREE.PerspectiveCamera(OVER_SHOULDER_CAMERA.fov, 1, 0.1, 180);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    if (window.LifeVerseRenderPipeline && window.LifeVerseRenderPipeline.configureRenderer) {
      window.LifeVerseRenderPipeline.configureRenderer(THREE, renderer, { exposure: 0.86, shadows: LIFE_SIM_PERFORMANCE.shadowsEnabled, maxPixelRatio: LIFE_SIM_PERFORMANCE.maxPixelRatio });
    } else {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LIFE_SIM_PERFORMANCE.maxPixelRatio));
      renderer.shadowMap.enabled = LIFE_SIM_PERFORMANCE.shadowsEnabled;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace || renderer.outputColorSpace;
      renderer.toneMappingExposure = 0.86;
    }
    root.appendChild(renderer.domElement);

    const state = {
      destroyed: false,
      currentZone: null,
      keys: new Set(),
      moveTouchId: null,
      lookTouchId: null,
      moveStart: null,
      lookStart: null,
      moveVector: { x: 0, y: 0 },
      yaw: Math.PI,
      pitch: OVER_SHOULDER_CAMERA.defaultPitch,
      smoothMove: { x: 0, y: 0 },
      moveSpeed: 0,
      walkPhase: 0,
      footstepTimer: 0,
      isMoving: false,
      mixers: [],
      realCharacterLoaded: false,
      assetManager: null,
      assetDebug: null,
      cameraPosition: new THREE.Vector3(),
      cameraLookAt: new THREE.Vector3(),
      cameraShake: 0,
      presentation: null,
      outline: null
    };

    const ui = {
      joystick: host.querySelector("[data-sim-joystick]"),
      knob: host.querySelector("[data-sim-joystick-knob]"),
      lookPad: host.querySelector("[data-sim-look-pad]")
    };

    const materials = createMaterials(THREE);
    state.assetManager = window.LifeVerseAssets && window.LifeVerseAssets.createAssetManager
      ? window.LifeVerseAssets.createAssetManager({
        THREE,
        materialLibrary: materials.library,
        manifestUrl: "assets/life-sim/asset-manifest.json"
      })
      : null;
    const lighting = createLighting(THREE, scene);
    state.presentation = createPresentationState(THREE, scene, renderer, lighting, materials, host);
    if (state.assetManager) state.assetDebug = state.assetManager.createDebugPanel(host, renderer, scene);

    const player = createPlayer(THREE, materials);
    player.group.position.set(-19, 0, -10);
    resetOverShoulderCamera(THREE, state, player.group.position);
    if (options.initialLocationId) {
      const targetZone = locationZones.find((zone) => zone.id === options.initialLocationId);
      if (targetZone) {
        const safeSpawn = safeSpawnPointForZone(targetZone);
        state.yaw = safeSpawnYawForZone(targetZone);
        player.group.position.set(safeSpawn[0], safeSpawn[1], safeSpawn[2]);
        resetOverShoulderCamera(THREE, state, player.group.position);
      }
    }
    const debugParams = new URLSearchParams(location.search);
    const spawnOverride = debugParams.get("spawn");
    if (spawnOverride) {
      const [sx, sy, sz] = spawnOverride.split(",").map(Number);
      if (Number.isFinite(sx) && Number.isFinite(sz)) {
        player.group.position.set(sx, Number.isFinite(sy) ? sy : 0, sz);
        resetOverShoulderCamera(THREE, state, player.group.position);
      }
      const yawOverride = Number(debugParams.get("yaw"));
      if (Number.isFinite(yawOverride)) {
        state.yaw = yawOverride;
        resetOverShoulderCamera(THREE, state, player.group.position);
      }
    }
    const spawnX = player.group.position.x;
    const spawnZ = player.group.position.z;
    scene.add(player.group);
    activeStaticColliders = state.staticColliders = [];
    createDistrict(THREE, scene, materials);
    warnOnColliderOverlaps(activeStaticColliders);
    setDistrictLoadingHint(root, "Loading nearby area…");
    const objaverseIndexReady = loadObjaverseManifestAssets(state.assetManager, state);
    const districtSamplesReady = loadDistrictAssetSamples(THREE, scene, state.assetManager, state, spawnX, spawnZ);
    const roadPropsReady = deferWorldLoad(() => addRoadDetailProps(THREE, scene, state.assetManager, state, spawnX, spawnZ, objaverseIndexReady), LIFE_SIM_PERFORMANCE.roadPropsDelayMs);
    const plazaPropsReady = deferWorldLoad(() => addDistrictPlazaProps(THREE, scene, state.assetManager, state, spawnX, spawnZ, objaverseIndexReady), LIFE_SIM_PERFORMANCE.plazaPropsDelayMs);
    const singaporeObjaversePropsReady = deferWorldLoad(() => addSingaporeObjaverseReplacementProps(THREE, scene, state.assetManager, state, spawnX, spawnZ, objaverseIndexReady), LIFE_SIM_PERFORMANCE.urbanReplacementPropsDelayMs);
    let districtLoadingSafetyTimeout = window.setTimeout(() => {
      if (state.destroyed) return;
      clearDistrictLoadingHint(root);
    }, 6500);
    districtSamplesReady.then(() => {
      window.clearTimeout(districtLoadingSafetyTimeout);
      if (state.destroyed) return;
      clearDistrictLoadingHint(root);
      if (isLayoutAuditEnabled()) {
        auditSceneLayout(THREE, scene);
      }
    });
    Promise.all([roadPropsReady, plazaPropsReady, singaporeObjaversePropsReady]).catch((error) => {
      console.warn("[Life Sim] Background prop streaming failed:", error);
    });
    deferWorldLoad(() => loadCharacterAsset(THREE, state.assetManager, player, state, root), LIFE_SIM_PERFORMANCE.remoteCharacterDelayMs).then((loaded) => {
      if (state.destroyed) return;
      state.realCharacterLoaded = loaded;
    });
    registerPresentationObjects(scene, state.presentation);

    const clock = new THREE.Clock();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    resize();

    // The Volume 5 anime cel-shading outline pass (docs/volume5-asset-pipeline.md)
    // is retired for good as of the realistic-style pivot - it's no longer even
    // an opt-in ?cel=1 toggle, since state.outline is always undefined now and
    // the guarded `if (state.outline)` call sites below (resize/render/destroy)
    // are simply permanent no-ops.

    const keydown = (event) => {
      if (isTyping(event.target)) return;
      state.keys.add(event.key.toLowerCase());
    };
    const keyup = (event) => state.keys.delete(event.key.toLowerCase());
    const pointerDown = (event) => {
      if (event.target.closest("button, input, textarea, select, a")) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      state.presentation.audio.ensure();

      const rect = host.getBoundingClientRect();
      const normalizedX = (event.clientX - rect.left) / rect.width;
      if (normalizedX < 0.44 && state.moveTouchId === null) {
        state.moveTouchId = event.pointerId;
        state.moveStart = { x: event.clientX, y: event.clientY };
        host.setPointerCapture(event.pointerId);
        updateJoystickVisual(0, 0);
      } else if (state.lookTouchId === null) {
        state.lookTouchId = event.pointerId;
        state.lookStart = { x: event.clientX, y: event.clientY };
        host.setPointerCapture(event.pointerId);
      }
    };
    const pointerMove = (event) => {
      if (event.pointerId === state.moveTouchId && state.moveStart) {
        const dx = event.clientX - state.moveStart.x;
        const dy = event.clientY - state.moveStart.y;
        const max = 58;
        state.moveVector.x = clamp(dx / max, -1, 1);
        state.moveVector.y = clamp(-dy / max, -1, 1);
        const length = Math.hypot(state.moveVector.x, state.moveVector.y);
        if (length > 1) {
          state.moveVector.x /= length;
          state.moveVector.y /= length;
        }
        updateJoystickVisual(state.moveVector.x, state.moveVector.y);
      }

      if (event.pointerId === state.lookTouchId && state.lookStart) {
        const dx = event.clientX - state.lookStart.x;
        const dy = event.clientY - state.lookStart.y;
        state.lookStart = { x: event.clientX, y: event.clientY };
        state.yaw -= dx * 0.0065;
        state.pitch = clamp(state.pitch + dy * 0.0045, OVER_SHOULDER_CAMERA.minPitch, OVER_SHOULDER_CAMERA.maxPitch);
      }
    };
    const pointerUp = (event) => {
      if (event.pointerId === state.moveTouchId) {
        state.moveTouchId = null;
        state.moveStart = null;
        state.moveVector.x = 0;
        state.moveVector.y = 0;
        updateJoystickVisual(0, 0);
      }
      if (event.pointerId === state.lookTouchId) {
        state.lookTouchId = null;
        state.lookStart = null;
      }
    };
    const clickFeedback = (event) => {
      const control = event.target.closest("button, [data-lifeverse-tab], [data-lifeverse-activity], [data-lifeverse-system-action], [data-lifeverse-fast-forward], [data-lifeverse-report-now]");
      if (!control) return;
      triggerInteractionFeedback(host, control);
      state.cameraShake = Math.max(state.cameraShake, control.matches("[data-lifeverse-fast-forward]") ? 0.18 : 0.06);
      if (control.matches("[data-lifeverse-fast-forward]")) state.presentation.audio.play("fastForward");
      else if (control.matches("[data-lifeverse-report-now], [data-lifeverse-tab='report']")) state.presentation.audio.play("report");
      else if (control.matches("[data-lifeverse-tab='phone']")) state.presentation.audio.play("phone");
      else if (control.matches("[data-lifeverse-activity], [data-lifeverse-system-action]")) state.presentation.audio.play("interaction");
      else state.presentation.audio.play("ui");
    };

    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    host.addEventListener("pointerdown", pointerDown);
    host.addEventListener("pointermove", pointerMove);
    host.addEventListener("pointerup", pointerUp);
    host.addEventListener("pointercancel", pointerUp);
    host.addEventListener("click", clickFeedback);

    function resize() {
      const width = Math.max(320, root.clientWidth || window.innerWidth || 320);
      const height = Math.max(240, root.clientHeight || window.innerHeight || 240);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function animate() {
      if (state.destroyed) return;
      const delta = Math.min(clock.getDelta(), 0.034);
      const elapsed = clock.elapsedTime;
      state.mixers.forEach((mixer) => mixer.update(delta));
      updateMovement(delta);
      updateCharacter(delta, player);
      updateWorldPresentation(delta, elapsed, state, scene, renderer, options.getLifeVerseState);
      if (state.assetDebug) state.assetDebug.update();
      updateCamera(player.group.position, delta, elapsed);
      updateZone(player.group.position);
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    function updateMovement(delta) {
      let x = 0;
      let y = 0;
      if (state.keys.has("a") || state.keys.has("arrowleft")) x -= 1;
      if (state.keys.has("d") || state.keys.has("arrowright")) x += 1;
      if (state.keys.has("w") || state.keys.has("arrowup")) y += 1;
      if (state.keys.has("s") || state.keys.has("arrowdown")) y -= 1;

      if (Math.abs(state.moveVector.x) + Math.abs(state.moveVector.y) > Math.abs(x) + Math.abs(y)) {
        x = state.moveVector.x;
        y = state.moveVector.y;
      }

      const inputLength = Math.hypot(x, y);
      state.smoothMove.x += (x - state.smoothMove.x) * Math.min(1, delta * 12);
      state.smoothMove.y += (y - state.smoothMove.y) * Math.min(1, delta * 12);
      x = Math.abs(state.smoothMove.x) < 0.02 ? 0 : state.smoothMove.x;
      y = Math.abs(state.smoothMove.y) < 0.02 ? 0 : state.smoothMove.y;

      const length = Math.hypot(x, y);
      if (length > 1) {
        x /= length;
        y /= length;
      }

      const forward = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
      const right = new THREE.Vector3(Math.sin(state.yaw + Math.PI / 2), 0, Math.cos(state.yaw + Math.PI / 2));
      const direction = new THREE.Vector3().addScaledVector(forward, y).addScaledVector(right, x);
      state.isMoving = direction.lengthSq() > 0.001 || inputLength > 0.05;
      const targetSpeed = state.isMoving ? Math.min(1, Math.max(0.18, length)) : 0;
      state.moveSpeed += (targetSpeed - state.moveSpeed) * Math.min(1, delta * (state.isMoving ? 9 : 7));

      if (state.isMoving) {
        direction.normalize();
        const speed = 7.8 + state.moveSpeed * 1.25;
        player.group.position.addScaledVector(direction, speed * state.moveSpeed * delta);
        // Bounds must cover every built zone's full extent, not just its
        // trigger-radius center. Re-expanded for the real-asset spacing
        // replan (locationZones/ZONE_DELTA above) - the map's usable area
        // roughly tripled (new zone bounding box is x:[-85,115], z:[-100,57])
        // to give real modeled buildings enough clearance from each other.
        player.group.position.x = clamp(player.group.position.x, -88, 118);
        player.group.position.z = clamp(player.group.position.z, -103, 60);
        if (state.staticColliders && state.staticColliders.length) {
          const [resolvedX, resolvedZ] = resolveStaticCollision(state.staticColliders, player.group.position.x, player.group.position.z, 0.42);
          player.group.position.x = resolvedX;
          player.group.position.z = resolvedZ;
        }
        const targetAngle = Math.atan2(direction.x, direction.z);
        player.group.rotation.y = lerpAngle(player.group.rotation.y, targetAngle, Math.min(1, delta * 8.5));
        state.footstepTimer -= delta * state.moveSpeed;
        if (state.footstepTimer <= 0) {
          state.footstepTimer = 0.34;
          state.presentation.audio.play("footstep");
        }
      }
    }

    function updateCharacter(delta, playerParts) {
      if (playerParts.realModel) {
        playCharacterAction(playerParts, state.isMoving ? "walk" : "idle");
        return;
      }
      const bobSpeed = state.isMoving ? 8.2 : 1.75;
      state.walkPhase += delta * bobSpeed;
      const swing = state.isMoving ? Math.sin(state.walkPhase) * (0.42 + state.moveSpeed * 0.18) : Math.sin(state.walkPhase) * 0.035;
      const bob = state.isMoving ? Math.abs(Math.sin(state.walkPhase)) * 0.055 * state.moveSpeed : Math.sin(state.walkPhase) * 0.018;
      const breathe = Math.sin(state.walkPhase * 0.5) * 0.018;
      playerParts.body.position.y = 1.15 + bob;
      playerParts.body.rotation.z = Math.sin(state.walkPhase * 0.5) * (state.isMoving ? 0.025 : 0.012);
      playerParts.head.position.y = 2.28 + bob + breathe;
      playerParts.head.rotation.z = Math.sin(state.walkPhase * 0.45) * 0.014;
      playerParts.hair.position.y = 2.48 + bob + breathe;
      playerParts.leftArm.rotation.x = swing;
      playerParts.rightArm.rotation.x = -swing;
      playerParts.leftLeg.rotation.x = -swing;
      playerParts.rightLeg.rotation.x = swing;
    }

    function updateCamera(target, delta, elapsed) {
      const rig = getOverShoulderCameraVectors(THREE, target, state.yaw, state.pitch, state.moveSpeed);
      const cameraTarget = resolveCameraOcclusion(THREE, state.staticColliders, target, rig.position);
      state.cameraPosition.lerp(cameraTarget, Math.min(1, delta * OVER_SHOULDER_CAMERA.positionDamping));
      state.cameraLookAt.lerp(rig.lookAt, Math.min(1, delta * OVER_SHOULDER_CAMERA.lookDamping));
      if (state.cameraShake > 0.002) {
        const shake = state.cameraShake;
        state.cameraPosition.x += Math.sin(elapsed * 42) * shake;
        state.cameraPosition.y += Math.cos(elapsed * 37) * shake * 0.42;
        state.cameraShake *= Math.pow(0.06, delta);
      } else {
        state.cameraShake = 0;
      }
      camera.position.copy(state.cameraPosition);
      camera.lookAt(state.cameraLookAt);
    }

    function updateZone(position) {
      let nextZone = null;
      for (const zone of locationZones) {
        const distance = Math.hypot(position.x - zone.x, position.z - zone.z);
        if (distance <= zone.radius) {
          nextZone = zone;
          break;
        }
      }

      if ((nextZone && nextZone.id) !== (state.currentZone && state.currentZone.id)) {
        state.currentZone = nextZone;
        state.presentation.focusZoneId = nextZone ? nextZone.id : "";
        state.presentation.focusPulse = nextZone ? 1 : 0;
        if (nextZone) state.presentation.audio.play("interaction");
        if (typeof options.onLocationChange === "function") options.onLocationChange(nextZone);
      }
    }

    function updateJoystickVisual(x, y) {
      if (!ui.knob) return;
      ui.knob.style.transform = `translate(${x * 34}px, ${-y * 34}px)`;
      if (ui.joystick) ui.joystick.classList.toggle("is-active", Math.hypot(x, y) > 0.05);
    }

    animate();

    function readDebugState() {
      return {
          realCharacterLoaded: Boolean(state.realCharacterLoaded),
          currentZoneId: state.currentZone ? state.currentZone.id : "",
          playerChildren: player.group.children.map((child) => ({
            name: child.name || child.type || "Object3D",
            visible: child.visible !== false,
            type: child.type || ""
          })),
          playerPosition: {
            x: Number(player.group.position.x.toFixed(2)),
            y: Number(player.group.position.y.toFixed(2)),
            z: Number(player.group.position.z.toFixed(2))
          },
          cameraPosition: {
            x: Number(state.cameraPosition.x.toFixed(2)),
            y: Number(state.cameraPosition.y.toFixed(2)),
            z: Number(state.cameraPosition.z.toFixed(2))
          },
          cameraLookAt: {
            x: Number(state.cameraLookAt.x.toFixed(2)),
            y: Number(state.cameraLookAt.y.toFixed(2)),
            z: Number(state.cameraLookAt.z.toFixed(2))
          },
          assetDebug: state.assetManager && state.assetManager.getDebugSnapshot
            ? state.assetManager.getDebugSnapshot(renderer, scene)
            : null
      };
    }

    window.CompassLifeSim.__lastDebugState = readDebugState;

    return {
      getDebugState: readDebugState,
      destroy() {
        if (window.CompassLifeSim.__lastDebugState === readDebugState) window.CompassLifeSim.__lastDebugState = null;
        state.destroyed = true;
        window.clearTimeout(districtLoadingSafetyTimeout);
        resizeObserver.disconnect();
        window.removeEventListener("keydown", keydown);
        window.removeEventListener("keyup", keyup);
        host.removeEventListener("pointerdown", pointerDown);
        host.removeEventListener("pointermove", pointerMove);
        host.removeEventListener("pointerup", pointerUp);
        host.removeEventListener("pointercancel", pointerUp);
        host.removeEventListener("click", clickFeedback);
        if (state.presentation) state.presentation.audio.destroy();
        if (state.assetManager) state.assetManager.dispose();
        renderer.dispose();
        root.innerHTML = "";
      }
    };
  }

  function getOverShoulderCameraVectors(THREE, target, yaw, pitch, moveSpeed = 0) {
    const speedBlend = clamp(moveSpeed, 0, 1);
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    const right = new THREE.Vector3(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2)).normalize();
    const distance = OVER_SHOULDER_CAMERA.distance - (OVER_SHOULDER_CAMERA.distance - OVER_SHOULDER_CAMERA.movingDistance) * speedBlend;
    const height = OVER_SHOULDER_CAMERA.height + pitch * OVER_SHOULDER_CAMERA.pitchHeight - speedBlend * 0.08;
    const shoulder = OVER_SHOULDER_CAMERA.shoulderOffset + speedBlend * 0.18;
    const lookAhead = OVER_SHOULDER_CAMERA.lookAhead + speedBlend * OVER_SHOULDER_CAMERA.movingLookAhead;
    const position = target.clone()
      .addScaledVector(forward, -distance)
      .addScaledVector(right, shoulder);
    position.y += height;

    const lookAt = target.clone()
      .addScaledVector(forward, lookAhead)
      .addScaledVector(right, OVER_SHOULDER_CAMERA.shoulderOffset * 0.2);
    lookAt.y += OVER_SHOULDER_CAMERA.lookHeight + speedBlend * OVER_SHOULDER_CAMERA.movingLookHeight;

    return {
      mode: "over-shoulder",
      position,
      lookAt,
      forward,
      right
    };
  }

  function safeSpawnPointForZone(zone) {
    if (!zone || !zone.id) return [-19, 0, -10];
    const override = LOCATION_SAFE_SPAWN_POINTS[zone.id];
    if (override) return override;
    return [zone.x, 0, zone.z];
  }

  function safeSpawnYawForZone(zone) {
    if (!zone || !zone.id) return Math.PI;
    return LOCATION_SAFE_SPAWN_YAWS[zone.id] || Math.PI;
  }

  function resetOverShoulderCamera(THREE, state, target) {
    const rig = getOverShoulderCameraVectors(THREE, target, state.yaw, state.pitch, state.moveSpeed || 0);
    state.cameraPosition.copy(rig.position);
    state.cameraLookAt.copy(rig.lookAt);
  }

  // Realistic-style pivot: flat MeshStandardMaterial colors (however correct
  // the PBR roughness/metalness numbers) read as "flat plastic toy," not
  // real - a surface needs actual photographic micro-detail (bump/grain/
  // roughness variation) to read as real, which a solid color literally
  // cannot provide regardless of lighting quality. These are real CC0
  // photogrammetry PBR texture sets from ambientCG (no login required to
  // download - see assets/textures/ambientcg/ for the ones fetched so far),
  // 1K JPG resolution, Color/NormalGL/Roughness maps only (skipping
  // Displacement/preview/source files ambientCG bundles, to stay light).
  const pbrTextureCache = new Map();
  function loadPbrTexture(THREE, assetId, suffix, repeatX, repeatY) {
    const cacheKey = `${assetId}:${suffix}:${repeatX}:${repeatY}`;
    if (pbrTextureCache.has(cacheKey)) return pbrTextureCache.get(cacheKey);
    const texture = new THREE.TextureLoader().load(`assets/textures/ambientcg/${assetId}_1K-JPG_${suffix}.jpg`);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    if (suffix === "Color" && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    pbrTextureCache.set(cacheKey, texture);
    return texture;
  }

  // Full photographic material (color + normal + roughness) for large,
  // continuously-visible ground-plane surfaces where the photographed base
  // tone IS the desired look, not just a tint carrier.
  function pbrGroundMaterial(THREE, assetId, repeatX, repeatY, options = {}) {
    return new THREE.MeshStandardMaterial({
      map: loadPbrTexture(THREE, assetId, "Color", repeatX, repeatY),
      normalMap: loadPbrTexture(THREE, assetId, "NormalGL", repeatX, repeatY),
      roughnessMap: loadPbrTexture(THREE, assetId, "Roughness", repeatX, repeatY),
      roughness: 1,
      ...options
    });
  }

  function createMaterials(THREE) {
    // Modern-realistic Singapore direction (supersedes the earlier anime
    // cel-shading and "Stylized Low Poly City" pastel-PBR passes, per an
    // explicit user call overriding the Volume 05 art bible's "avoid pure
    // photorealism" guidance for THIS map-styling pass): desaturated,
    // real-world-plausible material colors - muted HDB paint tones, true
    // asphalt roads, tropical (not candy) greens, marina teal water,
    // curtain-wall glass - still nothing more expensive than Three.js's
    // standard PBR lighting model (no ray tracing/path tracing/reflections).
    const library = window.LifeVerseAssets && window.LifeVerseAssets.createMaterialLibrary
      ? window.LifeVerseAssets.createMaterialLibrary(THREE, { pipeline: "pbr" })
      : null;
    const shared = (key, fallback) => library && library.get ? library.get(key) : fallback();
    // Realistic-style pivot, Phase 5: every "make()" material (every building
    // wall/structure color in the game) now carries real photographic
    // PaintedPlaster017 Color+NormalGL+Roughness maps - not just normal/
    // roughness bump-under-flat-color like the first material pass, actual
    // photographed painted-concrete albedo tinted by `color` - since Objaverse
    // (and every free/loginless CC0 kit checked) has nothing building-shaped
    // to source real geometry from, this is the achievable version of "make
    // buildings look real": real material, not new geometry. addBuildingCore()
    // only ever put a texture on a building's front face via its canvas-drawn
    // window facade, so this is what fixes the other 5 flat faces on every
    // single building at once instead of one texture assignment per type.
    const wallColorMap = loadPbrTexture(THREE, "PaintedPlaster017", "Color", 2.4, 2.4);
    const wallNormal = loadPbrTexture(THREE, "PaintedPlaster017", "NormalGL", 2.4, 2.4);
    const wallRoughness = loadPbrTexture(THREE, "PaintedPlaster017", "Roughness", 2.4, 2.4);
    const make = (color, emissive = 0x000000, roughness = 0.7, metalness = 0.03) => new THREE.MeshStandardMaterial({ color, emissive, roughness, metalness, map: wallColorMap, normalMap: wallNormal, roughnessMap: wallRoughness, normalScale: new THREE.Vector2(0.4, 0.4) });
    const standard = (color, emissive = 0x000000, roughness = 0.68, metalness = 0.02) => new THREE.MeshStandardMaterial({ color, emissive, roughness, metalness });
    const glass = (color) => new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.2,
      metalness: 0.06,
      transparent: true,
      opacity: 0.74,
      transmission: 0.12
    });
    const transparent = (color, opacity = 0.28) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });

    return {
      library,
      grass: pbrGroundMaterial(THREE, "Grass005", 60, 60, { color: 0xc7d9bd }),
      ground: pbrGroundMaterial(THREE, "Concrete034", 70, 55, { color: 0xd8d2c2 }),
      warmGround: make(0xcbb290),
      road: pbrGroundMaterial(THREE, "Asphalt031", 34, 6, { color: 0x4f5655 }),
      roadLine: make(0xf0ead6, 0x0a0906, 0.55),
      sidewalk: pbrGroundMaterial(THREE, "Concrete034", 6, 6, { color: 0xd8d1bd }),
      curb: shared("stone", () => make(0xa89d87)),
      curbWarm: make(0xc9bfa2),
      hdb: make(0xe1dccd),
      hdbAccent: make(0x7f97a3),
      hdbBalcony: make(0xc7c0ac),
      gym: make(0xb85a44),
      work: make(0x5c7a94),
      food: make(0xc99248, 0x150c02),
      mall: make(0xa89a83),
      park: make(0x3f7a52),
      library: make(0x7488a0),
      hospital: make(0xdfe6e4),
      hospitalAccent: make(0x4f8f96, 0x000000, 0.24, 0.06),
      cafe: make(0xb17849, 0x180d02),
      university: make(0xc9b587),
      airport: make(0xa4b3bd),
      airportAccent: make(0x3d6188, 0x020e1c, 0.3, 0.2),
      sand: make(0xd8c184),
      water: shared("water", () => standard(0x1f6f7a, 0x02282e, 0.34, 0.02)),
      path: make(0xb3a682),
      flowerPink: make(0xd97e93, 0x140006),
      flowerYellow: make(0xd0ab4f, 0x180f00),
      flowerPurple: make(0x8d76ab, 0x0c0016),
      bush: make(0x3d6e45),
      wood: shared("wood", () => make(0x8a5a34)),
      furniture: make(0xa9724f),
      bookRed: make(0xb84343),
      bookBlue: make(0x3f699c),
      bookGreen: make(0x3f9469),
      metal: shared("metal", () => standard(0x8f98a1, 0x000000, 0.42, 0.14)),
      equipment: shared("plastic", () => make(0x3a3f47)),
      screen: standard(0x171d2e, 0x122462),
      poster: make(0xe4dcc4),
      signBlue: make(0x2f5fa8, 0x00102e),
      signGreen: make(0x2f8a5e, 0x001c10),
      signGold: make(0xc99a3f, 0x1c1200),
      // Little India temple gopuram - dedicated, deliberately muted versions
      // of the bright sign/flower/MRT colors it used to borrow. Reusing
      // those shared materials directly (emissive glow included) made the
      // temple read as a saturated, glowing "layer cake" with nothing
      // visually bridging it to the muted city around it - found via an
      // actual recorded playthrough, not a screenshot at a flattering angle.
      // These keep the same warm-toned identity (a real Little India temple
      // should still visibly be the most colorful thing on the block) but
      // toned down and with no emissive glow, so it reads as sun-worn stone
      // architecture instead of a lit-up prop.
      templeBase: make(0xb8814a, 0x000000, 0.85, 0.02),
      templeAccent: make(0xc07d84, 0x000000, 0.85, 0.02),
      templeSpire: make(0x9c4a3e, 0x000000, 0.82, 0.02),
      roofDark: make(0x3a3f47, 0x000000, 0.55, 0.15),
      window: standard(0xf2dfa0, 0x6b5400),
      glass: shared("glass", () => glass(0x9fc4d1)),
      mrt: make(0xcf2030, 0x330005, 0.5, 0.24),
      rail: standard(0xc7ccd1),
      trunk: make(0x6b4023),
      lamp: standard(0x272b31),
      lampGlow: standard(0xfbe6a0, 0xe0a94f),
      cloud: new THREE.MeshBasicMaterial({ color: 0xfaf6ec, transparent: true, opacity: 0.78, depthWrite: false }),
      rain: new THREE.PointsMaterial({ color: 0xbfe9ff, size: 0.045, transparent: true, opacity: 0.0, depthWrite: false }),
      dust: new THREE.PointsMaterial({ color: 0xe8dcb8, size: 0.055, transparent: true, opacity: 0.18, depthWrite: false }),
      commuter: make(0x2b315c),
      skin: make(0xffc49d),
      hair: make(0x16141a),
      outfit: make(0x18203a),
      shirt: make(0xb7e36b, 0x1c3d00),
      shoes: make(0xffffff),
      zone: transparent(0x8ff4ff, 0.26)
    };
  }

  function createSkyTexture(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#3f82bf");
    gradient.addColorStop(0.42, "#8fc5df");
    gradient.addColorStop(0.72, "#d9d5be");
    gradient.addColorStop(1, "#f1dcc0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sunGlow = ctx.createRadialGradient(760, 145, 8, 760, 145, 190);
    sunGlow.addColorStop(0, "rgba(255, 244, 194, 0.84)");
    sunGlow.addColorStop(0.28, "rgba(255, 214, 143, 0.28)");
    sunGlow.addColorStop(1, "rgba(255, 214, 143, 0)");
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255, 255, 246, 0.78)";
    [
      [130, 118, 78, 20], [192, 108, 92, 25], [254, 124, 70, 18],
      [470, 84, 82, 22], [540, 96, 110, 28], [620, 82, 74, 18],
      [820, 218, 105, 26], [905, 205, 82, 20]
    ].forEach(([x, y, w, h]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "rgba(255, 244, 218, 0.32)";
    for (let i = 0; i < 9; i += 1) {
      const y = 300 + i * 14;
      ctx.fillRect(0, y, canvas.width, 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
  }

  // Real-Singapore-detail facade texture, drawn on a 2D canvas rather than
  // built from geometry - researched from real HDB/shophouse references
  // (see chat), not a generic "Asian building" guess:
  // - "shophouse": five-foot-way arcade, Peranakan ceramic-tile skirting,
  //   decorative pilasters between window bays.
  // - "hdb": old-style split-unit AC compressor boxes under alternating
  //   windows, a collapsible laundry pole angled out near the corridor edge.
  // - "modern": plain glass-curtain-wall grid, no ornamentation - office/
  //   mall/hospital-scale commercial buildings.
  // Realistic-style pivot, Phase 4: static collision registry. There was
  // zero collision detection anywhere in this file before this - retrofitting
  // one onto every addBox call across ~20 zone-builder functions wasn't
  // practical in scope, but every real building shell (HDB blocks, gym, work
  // tower, hospital, library, university, mall, shophouses, etc.) already
  // funnels through the single addBuildingCore() function below, so
  // registering colliders there covers the walls a player would actually
  // notice walking through, with exact precision (no scene-traversal
  // heuristics needed). Reset per mount() - a stale collider list from a
  // previous mount/remount must never block the new scene.
  let activeStaticColliders = [];
  function registerStaticCollider(name, centerX, centerZ, sizeX, sizeZ) {
    activeStaticColliders.push({
      name,
      minX: centerX - sizeX / 2,
      maxX: centerX + sizeX / 2,
      minZ: centerZ - sizeZ / 2,
      maxZ: centerZ + sizeZ / 2
    });
  }

  // Authoring-time diagnostic (the automated version of the one clipping bug
  // already found and hand-fixed in this file - a GLB lecture hall and a
  // leftover primitive box rendering as two overlapping buildings, life-
  // sim.js history) - logs instead of silently tolerating overlaps.
  function warnOnColliderOverlaps(colliders) {
    for (let i = 0; i < colliders.length; i += 1) {
      for (let j = i + 1; j < colliders.length; j += 1) {
        const a = colliders[i];
        const b = colliders[j];
        const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
        const overlapZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
        if (overlapX > 0.15 && overlapZ > 0.15) {
          console.warn(`[Life Sim] Static colliders overlap: "${a.name}" and "${b.name}" (${overlapX.toFixed(2)}x${overlapZ.toFixed(2)} units)`);
        }
      }
    }
  }

  // Whole-map layout audit (broader than warnOnColliderOverlaps, which only
  // covers addBuildingCore() shells). Walks scene.children - top-level
  // objects only, not a deep traverse - so a GLB swap's dozens of internal
  // submeshes (window frames overlapping their own wall, etc.) don't produce
  // false positives; every addBox/addBuildingCore call and every swapped-in
  // GLB group is already a direct scene child. Runs once, after district
  // samples + road props both finish loading, logging real coordinates so
  // findings are directly actionable, not just names.
  const LAYOUT_AUDIT_EXCLUDE_NAME_PATTERN = /ground|road|path|line|crosswalk|zone.*ring|sidewalk|sand|^water|grass|green|flower|bed$|dust|cloud|rain|balcony/i;
  function isLayoutAuditEnabled() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("lifeSimAudit") === "1" || window.localStorage?.getItem("lifeSimLayoutAudit") === "1";
    } catch (error) {
      return false;
    }
  }
  function pushLayoutAuditCandidate(THREE, candidates, node, labelPrefix) {
    const box = new THREE.Box3().setFromObject(node);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y < 0.8 || size.x * size.z < 1.5) return;
    const center = new THREE.Vector3();
    box.getCenter(center);
    const label = labelPrefix ? `${labelPrefix} > ${node.name || "(unnamed)"}` : (node.name || "(unnamed)");
    candidates.push({ name: label, box, center, size });
  }
  function auditSceneLayout(THREE, scene) {
    const candidates = [];
    scene.children.forEach((node) => {
      if (!node.visible) return;
      // "Zone Offset Group: x" wrapper groups (addZoneAt()) are containers,
      // not real obstacles - their bounding box is the union of everything
      // inside them, so every building inside its own zone trivially
      // "overlaps" the wrapper. Recurse into them one level instead of
      // treating the wrapper itself as a candidate, tagging each child with
      // its zone so an ambiguous swapped-GLB name like "Scene" is still
      // traceable back to a specific place on the map.
      if (node.name && node.name.startsWith("Zone Offset Group")) {
        const zoneLabel = node.name.replace("Zone Offset Group: ", "");
        node.children.forEach((child) => {
          if (!child.visible) return;
          if (child.name && LAYOUT_AUDIT_EXCLUDE_NAME_PATTERN.test(child.name)) return;
          pushLayoutAuditCandidate(THREE, candidates, child, zoneLabel);
        });
        return;
      }
      if (node.name && LAYOUT_AUDIT_EXCLUDE_NAME_PATTERN.test(node.name)) return;
      pushLayoutAuditCandidate(THREE, candidates, node);
    });
    console.info(`[Life Sim] Layout audit: ${candidates.length} significant top-level objects scanned.`);
    let overlapCount = 0;
    for (let i = 0; i < candidates.length; i += 1) {
      for (let j = i + 1; j < candidates.length; j += 1) {
        const a = candidates[i];
        const b = candidates[j];
        const overlapX = Math.min(a.box.max.x, b.box.max.x) - Math.max(a.box.min.x, b.box.min.x);
        const overlapZ = Math.min(a.box.max.z, b.box.max.z) - Math.max(a.box.min.z, b.box.min.z);
        if (overlapX > 0.3 && overlapZ > 0.3) {
          overlapCount += 1;
          console.warn(`[Layout Audit] OVERLAP "${a.name}" @(${a.center.x.toFixed(1)},${a.center.z.toFixed(1)}) size ${a.size.x.toFixed(1)}x${a.size.z.toFixed(1)} vs "${b.name}" @(${b.center.x.toFixed(1)},${b.center.z.toFixed(1)}) size ${b.size.x.toFixed(1)}x${b.size.z.toFixed(1)} - overlap ${overlapX.toFixed(1)}x${overlapZ.toFixed(1)}`);
        }
      }
    }
    console.info(`[Life Sim] Layout audit: ${overlapCount} overlapping pair(s) found.`);
  }

  // Cheap axis-aligned circle-vs-rect push-out, run once per axis so the
  // player slides along a wall instead of stopping dead on any contact.
  function resolveStaticCollision(colliders, x, z, radius) {
    let resolvedX = x;
    let resolvedZ = z;
    for (const box of colliders) {
      const closestX = Math.max(box.minX, Math.min(resolvedX, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(resolvedZ, box.maxZ));
      const dx = resolvedX - closestX;
      const dz = resolvedZ - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq >= radius * radius || distSq === 0) continue;
      const dist = Math.sqrt(distSq) || 0.0001;
      const push = radius - dist;
      resolvedX += (dx / dist) * push;
      resolvedZ += (dz / dist) * push;
    }
    return [resolvedX, resolvedZ];
  }

  function resolveCameraOcclusion(THREE, colliders, target, desiredPosition) {
    if (!colliders || !colliders.length) return desiredPosition;
    const eye = target.clone();
    eye.y += 1.35;
    const dirX = desiredPosition.x - eye.x;
    const dirZ = desiredPosition.z - eye.z;
    let nearestT = 1;
    const margin = 0.62;

    for (const box of colliders) {
      const minX = box.minX - margin;
      const maxX = box.maxX + margin;
      const minZ = box.minZ - margin;
      const maxZ = box.maxZ + margin;
      let tMin = 0;
      let tMax = 1;
      const axes = [
        [eye.x, dirX, minX, maxX],
        [eye.z, dirZ, minZ, maxZ]
      ];
      let hit = true;

      for (const [origin, direction, min, max] of axes) {
        if (Math.abs(direction) < 0.0001) {
          if (origin < min || origin > max) hit = false;
          continue;
        }
        const inv = 1 / direction;
        let t1 = (min - origin) * inv;
        let t2 = (max - origin) * inv;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) {
          hit = false;
          break;
        }
      }

      if (hit && tMax >= 0 && tMin <= 1) {
        nearestT = Math.min(nearestT, Math.max(0.28, tMin - 0.08));
      }
    }

    if (nearestT >= 1) return desiredPosition;
    return new THREE.Vector3(
      eye.x + dirX * nearestT,
      eye.y + (desiredPosition.y - eye.y) * nearestT,
      eye.z + dirZ * nearestT
    );
  }

  // Cached by its own parameters so repeated calls with the same
  // color/floors/columns/style reuse one canvas instead of redrawing.
  const facadeTextureCache = new Map();
  function createFacadeTexture(THREE, options) {
    const { wallColor, floors, columns, style } = options;
    const cacheKey = `${wallColor}:${floors}:${columns}:${style}`;
    if (facadeTextureCache.has(cacheKey)) return facadeTextureCache.get(cacheKey);

    const wall = new THREE.Color(wallColor);
    const trim = wall.clone().multiplyScalar(0.5);
    const trimHex = `#${trim.getHexString()}`;
    const wallHex = `#${wall.getHexString()}`;
    const hasArcade = style === "shophouse";
    const isHdb = style === "hdb";

    const w = 512, h = 768;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = wallHex;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#000000" : "#ffffff";
      ctx.fillRect(Math.random() * w, 0, 1 + Math.random() * 2, h);
    }
    ctx.globalAlpha = 1;

    const floorH = (hasArcade ? h * 0.78 : h) / floors;
    const startY = hasArcade ? h * 0.22 : 0;
    const colW = w / columns;
    const glassColors = style === "modern" ? ["#8fb3c2", "#7096a8"] : ["#bcd9e6", "#6f97a8"];

    for (let f = 0; f < floors; f++) {
      const y = startY + f * floorH;
      ctx.fillStyle = style === "modern" ? "rgba(255,255,255,0.14)" : trimHex;
      ctx.fillRect(0, y, w, h * 0.014);

      for (let c = 0; c < columns; c++) {
        const x = c * colW + colW * (style === "modern" ? 0.08 : 0.18);
        const winW = colW * (style === "modern" ? 0.84 : 0.64);
        const winH = floorH * (style === "modern" ? 0.7 : 0.5);
        const winY = y + floorH * (style === "modern" ? 0.18 : 0.28);
        ctx.fillStyle = "#2b2f38";
        ctx.fillRect(x - 4, winY - 4, winW + 8, winH + 8);
        const grad = ctx.createLinearGradient(x, winY, x, winY + winH);
        grad.addColorStop(0, glassColors[0]);
        grad.addColorStop(1, glassColors[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(x, winY, winW, winH);
        if (style !== "modern") {
          ctx.strokeStyle = "#2b2f38";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x + winW / 2, winY); ctx.lineTo(x + winW / 2, winY + winH);
          ctx.moveTo(x, winY + winH / 2); ctx.lineTo(x + winW, winY + winH / 2);
          ctx.stroke();
          ctx.fillStyle = trimHex;
          ctx.fillRect(x - 12, winY, 7, winH);
          ctx.fillRect(x + winW + 5, winY, 7, winH);
        }
        if (isHdb && (f + c) % 2 === 0) {
          const acY = y + floorH * 0.82;
          ctx.fillStyle = "#8a9199";
          ctx.fillRect(x + colW * 0.06, acY, colW * 0.42, floorH * 0.13);
        }
      }
      if (isHdb) {
        const poleX = w * 0.92, poleY = y + floorH * 0.35;
        ctx.strokeStyle = "#6b4023";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(poleX, poleY);
        ctx.lineTo(poleX + w * 0.09, poleY - floorH * 0.22);
        ctx.stroke();
        ctx.fillStyle = "#d9d4c4";
        ctx.fillRect(poleX + w * 0.02, poleY - floorH * 0.1, w * 0.03, floorH * 0.08);
      }
    }

    if (hasArcade) {
      ctx.fillStyle = "#1c1f26";
      ctx.fillRect(0, h * 0.78, w, h * 0.22);
      for (let c = 0; c <= columns; c++) {
        const x = c * colW;
        ctx.fillStyle = "#e7e2d3";
        ctx.fillRect(x - w * 0.012, h * 0.78, w * 0.024, h * 0.22);
      }
      for (let c = 0; c < columns; c++) {
        const x = c * colW + colW * 0.5;
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.arc(x, h * 0.78, colW * 0.42, Math.PI, 0);
        ctx.fill();
      }
      const tileColors = ["#c9564a", "#3f7a52", "#d9a94a", "#4a6fa5"];
      const tileW = w / 24;
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = tileColors[i % tileColors.length];
        ctx.fillRect(i * tileW, h * 0.975, tileW - 1, h * 0.025);
      }
      for (let c = 0; c <= columns; c++) {
        const x = c * colW;
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(x - w * 0.01, startY, w * 0.02, h * 0.78 - startY);
      }
    }

    ctx.fillStyle = "#efe6d0";
    ctx.fillRect(0, 0, w, h * 0.012);

    const texture = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    facadeTextureCache.set(cacheKey, texture);
    return texture;
  }

  function createLighting(THREE, scene) {
    const rig = window.LifeVerseRenderPipeline && window.LifeVerseRenderPipeline.createLightingRig
      ? window.LifeVerseRenderPipeline.createLightingRig(THREE, scene, {
        ambientIntensity: 0.95,
        sunIntensity: 1.08,
        sunPosition: [-12, 24, 12],
        shadows: LIFE_SIM_PERFORMANCE.shadowsEnabled,
        shadowSize: LIFE_SIM_PERFORMANCE.shadowSize,
        shadowCameraSize: LIFE_SIM_PERFORMANCE.shadowCameraSize
      })
      : null;
    const hemi = rig ? rig.hemi : new THREE.HemisphereLight(0xffffff, 0x91ad82, 0.95);
    const sun = rig ? rig.sun : new THREE.DirectionalLight(0xffffff, 1.08);
    if (!rig) {
      scene.add(hemi);
      sun.position.set(-12, 24, 12);
      sun.castShadow = LIFE_SIM_PERFORMANCE.shadowsEnabled;
      sun.shadow.mapSize.set(LIFE_SIM_PERFORMANCE.shadowSize, LIFE_SIM_PERFORMANCE.shadowSize);
      sun.shadow.camera.left = -LIFE_SIM_PERFORMANCE.shadowCameraSize;
      sun.shadow.camera.right = LIFE_SIM_PERFORMANCE.shadowCameraSize;
      sun.shadow.camera.top = LIFE_SIM_PERFORMANCE.shadowCameraSize;
      sun.shadow.camera.bottom = -LIFE_SIM_PERFORMANCE.shadowCameraSize;
      scene.add(sun);
    }

    const streetLights = [];
    [
      [-17, 4.2, -12, 0xffb75d, 1.8],
      [5, 3.8, -3.5, 0xff4055, 1.9],
      [16, 5.2, -12, 0xbca0ff, 1.45],
      [0, 4, -21, 0xa6ffb1, 1.2]
    ].forEach(([x, y, z, color, intensity]) => {
      const light = new THREE.PointLight(color, intensity, 16);
      light.position.set(x, y, z);
      scene.add(light);
      streetLights.push(light);
    });

    return { hemi, sun, streetLights };
  }

  function createPresentationState(THREE, scene, renderer, lighting, mat, host) {
    const ambience = createAmbience(THREE, scene, mat);
    return {
      ambience,
      audio: createAudioPolish(),
      lighting,
      host,
      zoneRings: [],
      treeCrowns: [],
      streetGlowMeshes: [],
      focusZoneId: "",
      focusPulse: 0,
      timeOfDay: "morning",
      weather: "sunny",
      skyColor: new THREE.Color(0xa9c9dc),
      fogColor: new THREE.Color(0xcdd2c2),
      targetSkyColor: new THREE.Color(0xa9c9dc),
      targetFogColor: new THREE.Color(0xcdd2c2),
      exposure: Number(renderer.toneMappingExposure || 1.08)
    };
  }

  function createAmbience(THREE, scene, mat) {
    const clouds = new THREE.Group();
    clouds.name = "Presentation Moving Clouds";
    for (let i = 0; i < 8; i++) {
      clouds.add(createCloud(THREE, mat.cloud, -28 + i * 8, 12 + (i % 3) * 1.2, -27 + (i % 4) * 15, 1.15 + (i % 2) * 0.32));
    }
    [
      [-22, 17.5, -82, 1.5],
      [-4, 18.6, -94, 1.85],
      [16, 17.2, -78, 1.35],
      [30, 19.0, -88, 1.7]
    ].forEach(([x, y, z, scale]) => {
      const cloud = createCloud(THREE, mat.cloud, x, y, z, scale);
      cloud.name = "Food Court Horizon Cloud";
      clouds.add(cloud);
    });
    scene.add(clouds);

    const dust = createParticleField(THREE, mat.dust, 56, 32, 7.5, "Presentation Floating Dust");
    scene.add(dust);

    const rain = createParticleField(THREE, mat.rain, 110, 52, 12, "Presentation Rain");
    rain.visible = false;
    scene.add(rain);

    const commuters = new THREE.Group();
    commuters.name = "Presentation Ambient Commuters";
    [
      [-8, -3, 0.8, 0],
      [8, 4, 1.1, Math.PI],
      [-2, 9, 0.9, Math.PI / 2],
      [18, -7, 0.7, -Math.PI / 2]
    ].forEach(([x, z, speed, heading], index) => {
      const commuter = createCommuter(THREE, mat, index);
      commuter.position.set(x, 0, z);
      commuter.rotation.y = heading;
      commuter.userData.base = { x, z, speed, heading, phase: index * 1.7 };
      commuters.add(commuter);
    });
    scene.add(commuters);

    return { clouds, dust, rain, commuters };
  }

  function createCloud(THREE, material, x, y, z, scale) {
    const group = new THREE.Group();
    group.name = "Presentation Cloud";
    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.8 + i * 0.08, 12, 8), material);
      puff.position.set((i - 1.5) * 0.9, Math.sin(i) * 0.18, i % 2 ? 0.22 : -0.12);
      group.add(puff);
    }
    group.userData.baseX = x;
    group.userData.drift = 0.45 + Math.abs(x) * 0.008;
    return group;
  }

  function createParticleField(THREE, material, count, span, height, name) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const seeds = [];
    for (let i = 0; i < count; i++) {
      const seed = (i * 16807) % 97;
      seeds.push(seed / 97);
      positions[i * 3] = (seeds[i] - 0.5) * span;
      positions[i * 3 + 1] = 1.4 + ((i * 37) % 100) / 100 * height;
      positions[i * 3 + 2] = ((((i * 53) % 100) / 100) - 0.5) * span;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geometry, material);
    points.name = name;
    points.userData.seeds = seeds;
    points.userData.span = span;
    points.userData.height = height;
    return points;
  }

  function createCommuter(THREE, mat, index) {
    const group = new THREE.Group();
    group.name = `Presentation Commuter ${index + 1}`;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.55, 5, 8), mat.commuter);
    body.position.y = 0.72;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat.skin);
    head.position.y = 1.15;
    group.add(body, head);
    return group;
  }

  function registerPresentationObjects(scene, presentation) {
    if (!presentation) return;
    presentation.zoneRings = [];
    presentation.treeCrowns = [];
    presentation.streetGlowMeshes = [];
    scene.traverse((node) => {
      if (!node || !node.name) return;
      if (node.userData && node.userData.zoneId) presentation.zoneRings.push(node);
      if (node.name === "Tree Crown") presentation.treeCrowns.push(node);
      if (node.name === "Street Light Glow") presentation.streetGlowMeshes.push(node);
    });
  }

  function updateWorldPresentation(delta, elapsed, state, scene, renderer, getLifeVerseState) {
    const presentation = state.presentation;
    if (!presentation) return;
    const lifeState = typeof getLifeVerseState === "function" ? getLifeVerseState() : null;
    const time = getTimeOfDayPresentation(lifeState);
    const weather = getWeatherPresentation(lifeState);
    presentation.timeOfDay = time.phase;
    presentation.weather = weather.type;
    applyPresentationTheme(scene, renderer, presentation, time, weather, delta);
    updateAmbience(delta, elapsed, presentation, weather);
    updateInteractiveFocus(delta, elapsed, presentation);
    presentation.audio.setWeather(weather.type);
  }

  function getTimeOfDayPresentation(lifeState) {
    const totalMinutes = Number(lifeState && lifeState.time && lifeState.time.totalMinutes);
    const minutes = Number.isFinite(totalMinutes) ? ((totalMinutes % 1440) + 1440) % 1440 : 450;
    if (minutes >= 300 && minutes < 660) {
      return {
        phase: "morning",
        sky: 0xa9c9dc,
        fog: 0xcdd2c2,
        hemi: 0.98,
        sun: 1.02,
        lamp: 0.24,
        exposure: 0.82,
        sunPosition: [-12, 24, 12]
      };
    }
    if (minutes >= 660 && minutes < 1020) {
      return {
        phase: "afternoon",
        sky: 0x8fb8d4,
        fog: 0xc7cfc0,
        hemi: 1.02,
        sun: 1.12,
        lamp: 0.18,
        exposure: 0.86,
        sunPosition: [-6, 28, 6]
      };
    }
    if (minutes >= 1020 && minutes < 1170) {
      return {
        phase: "sunset",
        sky: 0xd9925f,
        fog: 0xd9b98a,
        hemi: 0.82,
        sun: 0.86,
        lamp: 0.78,
        exposure: 0.78,
        sunPosition: [14, 12, -8]
      };
    }
    return {
      phase: "night",
      sky: 0x141c33,
      fog: 0x11182c,
      hemi: 0.5,
      sun: 0.22,
      lamp: 1.9,
      exposure: 0.62,
      sunPosition: [8, 8, -12]
    };
  }

  function getWeatherPresentation(lifeState) {
    const raw = String(lifeState && lifeState.world && lifeState.world.weather ? lifeState.world.weather : "").toLowerCase();
    const day = Number(lifeState && lifeState.time && lifeState.time.day) || 1;
    let type = "sunny";
    if (raw.includes("rain")) type = "rain";
    else if (raw.includes("fog") || raw.includes("haze")) type = "fog";
    else if (raw.includes("cloud")) type = "cloudy";
    else if (day % 9 === 0) type = "fog";
    else if (day % 6 === 0) type = "rain";
    else if (day % 4 === 0) type = "cloudy";
    const settings = {
      sunny: { cloud: 0.55, rain: 0, fogBoost: 0, light: 1 },
      cloudy: { cloud: 0.9, rain: 0, fogBoost: 0.12, light: 0.86 },
      rain: { cloud: 0.96, rain: 0.95, fogBoost: 0.24, light: 0.72 },
      fog: { cloud: 0.76, rain: 0, fogBoost: 0.46, light: 0.68 }
    };
    return { type, ...(settings[type] || settings.sunny) };
  }

  function applyPresentationTheme(scene, renderer, presentation, time, weather, delta) {
    const mix = Math.min(1, delta * 2.2);
    presentation.targetSkyColor.setHex(time.sky);
    presentation.targetFogColor.setHex(time.fog);
    presentation.skyColor.lerp(presentation.targetSkyColor, mix);
    presentation.fogColor.lerp(presentation.targetFogColor, mix);
    scene.background = presentation.skyColor;
    if (scene.fog) {
      scene.fog.color.copy(presentation.fogColor);
      scene.fog.near = 26 - weather.fogBoost * 12;
      scene.fog.far = 88 - weather.fogBoost * 28;
    }
    const lights = presentation.lighting;
    if (lights && lights.hemi) lights.hemi.intensity += ((time.hemi * weather.light) - lights.hemi.intensity) * mix;
    if (lights && lights.sun) {
      lights.sun.intensity += ((time.sun * weather.light) - lights.sun.intensity) * mix;
      lights.sun.position.x += (time.sunPosition[0] - lights.sun.position.x) * mix;
      lights.sun.position.y += (time.sunPosition[1] - lights.sun.position.y) * mix;
      lights.sun.position.z += (time.sunPosition[2] - lights.sun.position.z) * mix;
    }
    (lights && lights.streetLights || []).forEach((light, index) => {
      const pulse = 1 + Math.sin(Date.now() * 0.0015 + index) * 0.04;
      light.intensity += ((time.lamp * pulse) - light.intensity) * mix;
    });
    presentation.streetGlowMeshes.forEach((mesh, index) => {
      mesh.scale.setScalar(1 + time.lamp * 0.18 + Math.sin(Date.now() * 0.002 + index) * 0.025);
      if (mesh.material && mesh.material.emissive) mesh.material.emissiveIntensity = 0.55 + time.lamp * 0.32;
    });
    renderer.toneMappingExposure += ((time.exposure * weather.light) - renderer.toneMappingExposure) * mix;
  }

  function updateAmbience(delta, elapsed, presentation, weather) {
    const { clouds, dust, rain, commuters } = presentation.ambience;
    clouds.children.forEach((cloud, index) => {
      cloud.position.x = wrap(cloud.userData.baseX + elapsed * cloud.userData.drift, -34, 34);
      cloud.position.y += Math.sin(elapsed * 0.55 + index) * 0.002;
      cloud.scale.setScalar((cloud.scale.x * 0.98) + (0.82 + weather.cloud * 0.46) * 0.02);
    });
    clouds.children.forEach((cloud) => {
      cloud.visible = weather.cloud > 0.35;
      cloud.children.forEach((puff) => {
        if (puff.material) puff.material.opacity = 0.36 + weather.cloud * 0.42;
      });
    });
    updateParticleField(dust, delta, elapsed, 0.36, weather.type === "rain" ? 0.08 : 0.24);
    if (dust.material) dust.material.opacity += ((weather.type === "rain" ? 0.06 : 0.22) - dust.material.opacity) * Math.min(1, delta * 3);
    rain.visible = weather.rain > 0.02;
    if (rain.material) rain.material.opacity += (weather.rain * 0.72 - rain.material.opacity) * Math.min(1, delta * 4);
    if (rain.visible) updateParticleField(rain, delta, elapsed, 4.8, rain.material.opacity);
    commuters.children.forEach((commuter, index) => {
      const base = commuter.userData.base || {};
      const offset = Math.sin(elapsed * base.speed + base.phase) * 5.5;
      commuter.position.x = base.x + Math.cos(base.heading) * offset;
      commuter.position.z = base.z + Math.sin(base.heading) * offset;
      commuter.position.y = Math.abs(Math.sin(elapsed * 5 + index)) * 0.035;
      commuter.rotation.y = base.heading + Math.sin(elapsed * base.speed + base.phase) * 0.12;
    });
    presentation.treeCrowns.forEach((tree, index) => {
      tree.rotation.z = Math.sin(elapsed * 0.9 + index) * 0.035;
      tree.rotation.x = Math.cos(elapsed * 0.7 + index) * 0.02;
    });
  }

  function updateParticleField(points, delta, elapsed, fallSpeed, opacity) {
    if (!points || !points.geometry) return;
    const positions = points.geometry.getAttribute("position");
    const span = points.userData.span || 40;
    const height = points.userData.height || 8;
    for (let i = 0; i < positions.count; i++) {
      const seed = points.userData.seeds[i] || 0.5;
      let x = positions.getX(i) + Math.sin(elapsed * 0.35 + seed * 12) * delta * 0.18;
      let y = positions.getY(i) - fallSpeed * delta * (0.42 + seed);
      let z = positions.getZ(i) + Math.cos(elapsed * 0.28 + seed * 8) * delta * 0.12;
      if (y < 0.35) y = height + seed * 4;
      if (x < -span / 2) x += span;
      if (x > span / 2) x -= span;
      if (z < -span / 2) z += span;
      if (z > span / 2) z -= span;
      positions.setXYZ(i, x, y, z);
    }
    positions.needsUpdate = opacity > 0.02;
  }

  function updateInteractiveFocus(delta, elapsed, presentation) {
    presentation.focusPulse = Math.max(0, presentation.focusPulse - delta * 1.8);
    presentation.zoneRings.forEach((ring, index) => {
      const active = ring.userData.zoneId === presentation.focusZoneId;
      const pulse = active ? 1 + presentation.focusPulse * 0.26 + Math.sin(elapsed * 4 + index) * 0.035 : 1 + Math.sin(elapsed * 1.2 + index) * 0.012;
      ring.scale.set(pulse, 1, pulse);
      if (ring.material) ring.material.opacity = active ? 0.42 : 0.18;
    });
  }

  function createAudioPolish() {
    let context = null;
    let ambientGain = null;
    let rainGain = null;

    function ensure() {
      if (context) {
        if (context.state === "suspended") context.resume().catch(() => {});
        return context;
      }
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      ambientGain = context.createGain();
      ambientGain.gain.value = 0.018;
      ambientGain.connect(context.destination);
      const wind = context.createOscillator();
      wind.type = "sine";
      wind.frequency.value = 96;
      wind.connect(ambientGain);
      wind.start();

      rainGain = context.createGain();
      rainGain.gain.value = 0;
      rainGain.connect(context.destination);
      const rain = context.createOscillator();
      rain.type = "triangle";
      rain.frequency.value = 670;
      rain.connect(rainGain);
      rain.start();
      return context;
    }

    function play(kind = "ui") {
      const ctx = ensure();
      if (!ctx) return;
      const gain = ctx.createGain();
      const osc = ctx.createOscillator();
      const settings = {
        ui: [520, 0.035, 0.018],
        phone: [720, 0.07, 0.026],
        report: [330, 0.12, 0.032],
        interaction: [440, 0.06, 0.022],
        fastForward: [180, 0.22, 0.04],
        footstep: [120, 0.035, 0.012]
      }[kind] || [420, 0.05, 0.018];
      osc.type = kind === "footstep" ? "square" : "sine";
      osc.frequency.setValueAtTime(settings[0], ctx.currentTime);
      if (kind === "fastForward") osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + settings[1]);
      gain.gain.setValueAtTime(settings[2], ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + settings[1]);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + settings[1] + 0.02);
    }

    function setWeather(type) {
      const ctx = context;
      if (!ctx || !rainGain || !ambientGain) return;
      const rainTarget = type === "rain" ? 0.015 : 0.0001;
      const windTarget = type === "fog" || type === "cloudy" ? 0.024 : 0.016;
      rainGain.gain.setTargetAtTime(rainTarget, ctx.currentTime, 0.8);
      ambientGain.gain.setTargetAtTime(windTarget, ctx.currentTime, 0.9);
    }

    function destroy() {
      if (context && context.state !== "closed") context.close().catch(() => {});
      context = null;
    }

    return { ensure, play, setWeather, destroy };
  }

  function triggerInteractionFeedback(host, control) {
    if (!host || !control) return;
    control.classList.remove("is-pressed-feedback");
    void control.offsetWidth;
    control.classList.add("is-pressed-feedback");
    window.setTimeout(() => control.classList.remove("is-pressed-feedback"), 280);
    host.classList.remove("is-lifeverse-action-feedback");
    void host.offsetWidth;
    host.classList.add("is-lifeverse-action-feedback");
    window.setTimeout(() => host.classList.remove("is-lifeverse-action-feedback"), 520);
  }

  // Realistic-style pivot, Phase 2: this used to be loadProductionAssets(),
  // which gated character AND environment/locationModels loading behind the
  // same manifest.enabled flag, and the call site only ran createDistrict()/
  // loadDistrictAssetSamples() (the world's roads/buildings/ground) when this
  // returned false - meaning a real character with nothing else populated
  // would have loaded into a completely empty scene. environment/
  // locationModels pointed at files that never existed and aren't the live
  // asset-swap mechanism anyway (loadDistrictAssetSamples() is), so that path
  // is dropped entirely: this now only ever handles the character, and the
  // call site always builds the district regardless of whether a real
  // character was available.
  async function loadCharacterAsset(THREE, assetManager, player, state, root) {
    if (!assetManager) return false;
    try {
      const manifest = await assetManager.loadManifest("assets/life-sim/asset-manifest.json");
      if (!manifest || !manifest.enabled || !manifest.character || !manifest.character.url) return false;
      const loaderReady = await assetManager.ensureGltfLoader();
      if (!loaderReady) {
        setAssetStatus(root, "Realistic character is enabled, but GLTFLoader did not load. Check the GLTFLoader script in index.html.", "error");
        return false;
      }
      setAssetStatus(root, "Loading realistic character...", "loading");
      const character = await withTimeout(
        assetManager.loadModel(manifest.character.url, manifest.character),
        LIFE_SIM_PERFORMANCE.remoteCharacterTimeoutMs,
        "remote character load timed out"
      );
      if (!character || character.fallback) {
        setAssetStatus(root, "Realistic character could not load. Using the fallback rig.", "error");
        return false;
      }
      await installCharacterAsset(THREE, assetManager, player, character, manifest.character, state);
      setAssetStatus(root, "Realistic character active.", "success");
      window.setTimeout(() => clearAssetStatus(root), 2600);
      return true;
    } catch (error) {
      console.warn("[Life Sim] Character asset loading failed:", error);
      setAssetStatus(root, "Realistic character could not load. Using the fallback rig.", "error");
      return false;
    }
  }

  async function installCharacterAsset(THREE, assetManager, player, characterAsset, config = {}, state) {
    hideFallbackCharacter(player);
    const model = characterAsset.scene;
    if (assetManager && assetManager.prepareModel) assetManager.prepareModel(model, config);
    player.group.add(model);
    player.realModel = model;
    player.actions = {};

    const clips = [...(characterAsset.animations || [])];
    const extraFiles = config.extraAnimationFiles || {};
    for (const [name, url] of Object.entries(extraFiles)) {
      if (!url) continue;
      try {
        const animationAsset = await assetManager.loadModel(url, { id: `animation:${name}`, label: `${name} animation`, type: "glb" });
        const clip = animationAsset.animations && animationAsset.animations[0];
        if (clip) {
          clip.name = name;
          clips.push(clip);
        }
      } catch (error) {
        console.warn(`[Life Sim] Optional animation "${name}" could not load:`, error);
      }
    }

    if (clips.length) {
      player.mixer = new THREE.AnimationMixer(model);
      state.mixers.push(player.mixer);
      const map = config.animationMap || {};
      ["idle", "walk", "run", "jump", "eat", "sit", "exercise"].forEach((key) => {
        const clip = findClip(clips, map[key] || [key]);
        if (clip) player.actions[key] = player.mixer.clipAction(clip);
      });
      playCharacterAction(player, "idle", true);
    }
  }

  function findClip(clips, names) {
    const targets = names.map((name) => String(name).toLowerCase());
    return clips.find((clip) => targets.some((name) => clip.name.toLowerCase().includes(name))) || clips[0] || null;
  }

  function hideFallbackCharacter(player) {
    ["fallbackRoot", "body", "head", "hair", "leftArm", "rightArm", "leftLeg", "rightLeg"].forEach((key) => {
      if (player[key]) player[key].visible = false;
    });
    player.group.children.forEach((child) => {
      if (!child.isObject3D || child === player.realModel) return;
      child.visible = false;
    });
  }

  function playCharacterAction(player, actionName, immediate = false) {
    if (!player.actions || !player.actions[actionName] || player.activeActionName === actionName) return;
    const next = player.actions[actionName];
    const previous = player.activeActionName ? player.actions[player.activeActionName] : null;
    next.enabled = true;
    next.reset();
    next.play();
    if (previous && previous !== next) {
      previous.fadeOut(immediate ? 0 : 0.16);
      next.fadeIn(immediate ? 0 : 0.16);
    }
    player.activeActionName = actionName;
  }

  function setAssetStatus(root, message, tone = "loading") {
    if (!root) return;
    let status = root.querySelector("[data-life-sim-asset-status]");
    if (!status) {
      status = document.createElement("div");
      status.dataset.lifeSimAssetStatus = "";
      status.className = "life-sim-asset-status";
      root.appendChild(status);
    }
    status.dataset.tone = tone;
    status.textContent = message;
  }

  function clearAssetStatus(root) {
    const status = root && root.querySelector("[data-life-sim-asset-status]");
    if (status) status.remove();
  }

  // Distance-tiered load pass: a separate, dedicated status element (not a
  // reuse of setAssetStatus/clearAssetStatus above) since that one is a
  // singleton already claimed by the character-loading path - even though
  // that path is dormant today (manifest.character is null), reusing it
  // here would silently collide the moment a real character is wired up.
  function setDistrictLoadingHint(root, message) {
    if (!root) return;
    let hint = root.querySelector("[data-life-sim-district-status]");
    if (!hint) {
      hint = document.createElement("div");
      hint.dataset.lifeSimDistrictStatus = "";
      hint.className = "life-sim-district-loading";
      root.appendChild(hint);
    }
    hint.textContent = message;
  }

  function clearDistrictLoadingHint(root) {
    const hint = root && root.querySelector("[data-life-sim-district-status]");
    if (hint) hint.remove();
  }

  // Urban planning pass: each zone's building function still uses the
  // ABSOLUTE literal coordinates it always had (its own implicit "home"
  // origin) - addZoneAt() builds it into a throwaway THREE.Group instead of
  // straight into `scene`, then repositions that whole group by a delta, so
  // every prop inside moves together without touching a single literal.
  // Deltas below are (new real-Singapore-aligned center) - (old center).
  //
  // Re-replan (real-asset spacing pass): recomputed as
  // NEW_DELTA = OLD_DELTA + (NEW_ZONE_POS - OLD_ZONE_POS) for every existing
  // entry, since OLD_DELTA already encodes (old zone pos - each function's
  // own implicit origin) - this moves every building with its zone without
  // needing to touch a single literal coordinate inside the build functions.
  // chinatown/little-india/bugis are new entries here: those three functions
  // previously used literal coordinates that WERE their real zone center (no
  // delta needed), so their delta is simply (new zone pos - old zone pos).
  const ZONE_DELTA = {
    home: [-6, 23],
    gym: [-51, 32],
    work: [-43, -103],
    food: [42, -82],
    mall: [-18, -20],
    park: [11, 45],
    library: [66, 10],
    hospital: [50, -65],
    cafe: [-41, -1],
    beach: [51, -52],
    airport: [75, -9],
    train: [-17, 11.5],
    university: [-46, 2],
    "marina-bay": [15, -93],
    chinatown: [20, -47],
    "little-india": [15, -28],
    bugis: [26, -34]
  };

  function addZoneAt(buildFn, THREE, scene, mat, deltaKey) {
    const [dx, dz] = ZONE_DELTA[deltaKey] || [0, 0];
    const group = new THREE.Group();
    group.name = `Zone Offset Group: ${deltaKey}`;
    buildFn(THREE, group, mat);
    group.position.set(dx, 0, dz);
    scene.add(group);
    return group;
  }

  function createDistrict(THREE, scene, mat) {
    // Ground + themed patches resized/repositioned for the real-asset
    // spacing replan - new bounds are x:[-85,115], z:[-100,57] (roughly
    // tripled from the original compact map).
    addPlane(THREE, scene, "Soft Anime Town Ground", [15, -0.04, -21.5], [210, 165], mat.ground);
    addPlane(THREE, scene, "North Residential Green", [-45, -0.02, 46], [55, 35], mat.grass);
    addSoftEdgeGroundPatch(THREE, scene, "North Residential Green", [-45, -0.02, 46], [55, 35], 0xcfe0c6);
    addPlane(THREE, scene, "Campus Green", [-80, -0.015, -5], [26, 26], mat.grass);
    addSoftEdgeGroundPatch(THREE, scene, "Campus Green", [-80, -0.015, -5], [26, 26], 0xcfe0c6);
    addPlane(THREE, scene, "Park Green", [13, -0.01, 23], [24, 20], mat.park);
    addSoftEdgeGroundPatch(THREE, scene, "Park Green", [13, -0.01, 23], [24, 20], 0x3f7a52);
    addPlane(THREE, scene, "Beach Sand", [75, 0, -82], [26, 11], mat.sand);
    addSoftEdgeGroundPatch(THREE, scene, "Beach Sand", [75, 0, -82], [26, 11], 0xd8c184);
    addPlane(THREE, scene, "Shallow Anime Sea", [75, 0.015, -90], [28, 9], mat.water);

    addRoadNetwork(THREE, scene, mat);
    addStreetCompositionLayer(THREE, scene, mat);
    addSingaporeOfficialPlanningRebase(THREE, scene, mat);
    addZoneAt(addHdbHome, THREE, scene, mat, "home");
    addZoneAt(addGym, THREE, scene, mat, "gym");
    addZoneAt(addWorkTower, THREE, scene, mat, "work");
    addZoneAt(addFoodCourt, THREE, scene, mat, "food");
    addZoneAt(addMall, THREE, scene, mat, "mall");
    addZoneAt(addPark, THREE, scene, mat, "park");
    addZoneAt(addLibrary, THREE, scene, mat, "library");
    addZoneAt(addHospital, THREE, scene, mat, "hospital");
    addZoneAt(addCafe, THREE, scene, mat, "cafe");
    addZoneAt(addBeach, THREE, scene, mat, "beach");
    addZoneAt(addAirport, THREE, scene, mat, "airport");
    addZoneAt(addTrainStation, THREE, scene, mat, "train");
    addZoneAt(addUniversity, THREE, scene, mat, "university");
    addZoneAt(addMarinaBayLandmark, THREE, scene, mat, "marina-bay");
    addZoneAt(addChinatown, THREE, scene, mat, "chinatown");
    addZoneAt(addLittleIndia, THREE, scene, mat, "little-india");
    addZoneAt(addBugis, THREE, scene, mat, "bugis");
    addZoneAt(addRafflesPlace, THREE, scene, mat, "raffles-place");
    addZoneAt(addClarkeQuay, THREE, scene, mat, "clarke-quay");
    addZoneAt(addHdbHub, THREE, scene, mat, "hdb-hub");
    addStreetLife(THREE, scene, mat);
    addSingaporeUrbanPlanningInfill(THREE, scene, mat);
    addWoodlands(THREE, scene, mat);
    addPunggol(THREE, scene, mat);
    addBox(THREE, scene, "Woodlands Access Road", [0, 0.025, 34], [5.2, 0.08, 32], mat.road, true);
    for (let z = 20; z <= 56; z += 6) addBox(THREE, scene, "Road Center Line NS", [0, 0.13, z], [0.25, 0.04, 2.15], mat.roadLine, true);
    addZones(THREE, scene, mat);
  }

  // Modelled by hand from publicly available photos/descriptions of the real
  // building (Wikipedia, Safdie Architects, Arup) - no Google map data or 3D
  // mesh involved. Real MBS: 3 towers leaning outward at an angle, topped by
  // a single ~340m SkyPark deck that cantilevers ~65m past one tower like a
  // boat hull, not a symmetric flat slab.
  function addMarinaBayLandmark(THREE, scene, mat) {
    const baseX = 25;
    const baseZ = 30;
    const towerHeight = 22;
    const towerLean = [-0.16, 0.03, 0.18];
    [-5, 0, 5].forEach((offsetX, index) => {
      const pivot = new THREE.Group();
      pivot.name = `Marina Bay Tower ${index + 1} Pivot`;
      pivot.position.set(baseX + offsetX, 0, baseZ);
      pivot.rotation.z = towerLean[index];
      // Glass curtain-wall facade texture on all 4 sides (a skyscraper is
      // seen from every angle, unlike a street-front shophouse) instead of
      // a single flat color.
      const wallColor = `#${mat.work.color.getHexString()}`;
      const towerTexture = createFacadeTexture(THREE, { wallColor, floors: 9, columns: 3, style: "modern" });
      const towerMaterial = new THREE.MeshStandardMaterial({ map: towerTexture, roughness: 0.3, metalness: 0.15 });
      const towerMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [towerMaterial, towerMaterial, mat.roofDark, mat.work, towerMaterial, towerMaterial]);
      towerMesh.name = `Marina Bay Tower ${index + 1}`;
      towerMesh.position.set(0, towerHeight / 2, 0);
      towerMesh.scale.set(3.2, towerHeight, 3.2);
      towerMesh.castShadow = true;
      towerMesh.receiveShadow = true;
      pivot.add(towerMesh);
      scene.add(pivot);
    });

    const deckY = towerHeight + 1.2;
    const deckStartX = -8;
    const deckEndX = 16;
    const deckLength = deckEndX - deckStartX;
    const deckCenterX = (deckStartX + deckEndX) / 2;
    const skypark = addBox(THREE, scene, "Marina Bay Skypark Deck", [baseX + deckCenterX, deckY, baseZ], [deckLength, 1.6, 6.2], mat.glass);
    skypark.rotation.z = 0.02;
    addBox(THREE, scene, "Marina Bay Skypark End Rise", [baseX + deckStartX - 0.8, deckY + 0.5, baseZ], [1.8, 0.9, 5.6], mat.glass);
    addBox(THREE, scene, "Marina Bay Skypark Cantilever Tip", [baseX + deckEndX + 0.9, deckY + 0.9, baseZ], [2.2, 1.7, 5.6], mat.glass);

    addBox(THREE, scene, "Marina Bay Plaza", [baseX, 0.1, baseZ - 6], [16, 0.2, 6], mat.sidewalk, true);
    addSignBoard(THREE, scene, "Marina Bay Sign", "MARINA BAY", [baseX - 9, 3.2, baseZ + 4], mat.signBlue, 0xffffff);

    addArtScienceMuseum(THREE, scene, [baseX - 16, baseZ - 3], mat);
  }

  // A simplified low-poly nod to the ArtScience Museum's lotus/fanned-fingers
  // silhouette near the real Marina Bay - not a precise replica, just enough
  // shape language to read as a second Marina Bay landmark rather than an
  // isolated tower.
  function addArtScienceMuseum(THREE, scene, position, mat) {
    const [px, pz] = position;
    addCylinder(THREE, scene, "ArtScience Museum Base", [px, 0.5, pz], [4.2, 1.0, 20], mat.hospital);
    const petalCount = 10;
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petal = addBox(THREE, scene, "ArtScience Museum Petal", [px + Math.sin(angle) * 3.2, 2.6, pz + Math.cos(angle) * 3.2], [1.6, 4.4, 0.35], mat.hospital);
      petal.rotation.y = angle;
      petal.rotation.x = -0.35;
    }
    addSignBoard(THREE, scene, "ArtScience Museum Sign", "ARTSCIENCE", [px - 4.5, 1.6, pz + 5], mat.signBlue, 0xffffff);
  }

  // Volume 5 Anime World Remaster, step 2: swap procedural placeholder buildings
  // (and, for trees, every scattered instance of one) for real CC0 low-poly GLB
  // models, while the rest of the hand-built district (furniture, stalls, signs)
  // stays untouched. Each swap hides only exact node names it owns - several
  // helpers (addBookshelf, addShopFront) reuse their parent location's name as a
  // prefix for their own props ("Library Bookshelf Frame", "Mall Shop Front"),
  // so prefix-based hiding would take those out too. Only HDB/Office Tower's own
  // per-floor window/balcony loop is safe to match by prefix, since nothing else
  // in the scene shares that exact prefix.
  const TREE_POSITIONS = [
    [-35, 18], [-18, 24], [-32, 4], [-35, -12], [-23, -23], [-4, -29], [8, -26],
    [12, -17], [3, -17], [27, -18], [31, 21], [22, 23], [38, 6],
    [69, -18], [86, -17], [66, 1.5], [89, 1.5], [80, 75], [100, 75], [25, 43], [39, 43],
    [-18, 34], [8, 34], [-18, 47]
  ];

  // Orchard Road's famous dense rain-tree canopy - noticeably denser than the
  // generic city-wide TREE_POSITIONS scatter, lining the pedestrian mall walk
  // added in addMall(). World coordinates already account for the "mall"
  // zone's urban-planning delta of (-24, +10).
  // Shifted by the same (+6,-30) delta as the "mall" zone in the real-asset
  // spacing replan.
  const ORCHARD_STREET_TREE_POSITIONS = [[-10, -42], [-6, -42], [-2, -42], [2, -42], [6, -42], [10, -42]];

  // Sentosa: palm trees ring the existing Beach zone (boardwalk/umbrellas/
  // bench/rock stay untouched) - upright palms mark the open sand, bent
  // palms lean in near the shoreline for variety.
  // Shifted by the same (+47,-52) delta as the "beach" zone in the real-asset
  // spacing replan (these are absolute world coordinates, not delta-adjusted
  // by addZoneAt, since they're consumed directly by the asset-swap
  // positions list rather than built inside addBeach()).
  const SENTOSA_PALM_POSITIONS = [[65, -84], [67, -77.5], [74, -77], [82, -80.5]];
  const SENTOSA_PALM_BEND_POSITIONS = [[71, -86.5], [79, -85]];

  // Layout pass: swapped-in GLBs get positioned by their own origin/pivot,
  // not their visible bounding-box center - the whole-map overlap audit
  // (auditSceneLayout()) traced a whole cluster of overlaps to exactly this,
  // most visibly the 4 "Building_Large_2.gltf" clones (reused for both
  // Causeway Point Mall and part of the Woodlands estate grid) landing with
  // their real footprint's center offset by several units from the slot
  // they were placed at, because that file's geometry isn't centered on its
  // own local origin. Re-centering the XZ bounding-box onto the intended
  // slot after positioning fixes every current and future use of an
  // off-center source file at once, instead of hand-tuning coordinates per
  // symptom. Y is left alone - these are all ground-level placements and
  // the existing position[1]=0 convention already gets that right.
  function recenterOnGroundSlot(THREE, instance, targetX, targetZ) {
    const box = new THREE.Box3().setFromObject(instance);
    const center = new THREE.Vector3();
    box.getCenter(center);
    instance.position.x += targetX - center.x;
    instance.position.z += targetZ - center.z;
  }

  // Whole-map load reliability pass: everything the district/road/plaza
  // loaders fetch used to fire in one giant parallel batch regardless of
  // distance from the player, so a fresh spawn competed for the same
  // limited browser connection pool as districts on the far side of the
  // 200x157-unit map (Woodlands, Airport, Sentosa) - nothing rendered fast,
  // everything rendered slowly together (confirmed via a live-production
  // timing check: the asset-debug panel's count was still climbing 45+
  // seconds after load). Splitting into a near tier (loaded first, gates
  // nothing but itself) and a far tier (streamed in afterward, in the
  // background, blocking nothing) fixes "time to a populated-looking
  // world" without touching total payload size. A fixed radius is used
  // instead of "N nearest zones" because zone density is uneven - the
  // downtown ring packs 5 zones within the map's own ~28-unit minimum
  // clearance, while Punggol/Woodlands/Airport sit 60-135 units out; "N
  // nearest" would still pull in a distant zone from a sparse area. 40
  // units comfortably covers the spawn zone's own footprint plus the 1-2
  // truly adjacent zones (verified against the default spawn at (-19,-10):
  // train is 19.0 units out, mall 29.1, cafe 34.4, then a real gap to
  // little-india at 44.2 - a 40-unit radius cleanly captures that first
  // cluster and excludes the rest).
  const NEAR_TIER_RADIUS = 40;

  function delayMs(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function withTimeout(promise, ms, label = "operation timed out") {
    if (!(ms > 0)) return promise;
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error(label)), ms);
      Promise.resolve(promise)
        .then((value) => {
          window.clearTimeout(timeout);
          resolve(value);
        })
        .catch((error) => {
          window.clearTimeout(timeout);
          reject(error);
        });
    });
  }

  function yieldToBrowser() {
    return new Promise((resolve) => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => resolve(), { timeout: 80 });
        return;
      }
      window.requestAnimationFrame ? window.requestAnimationFrame(() => resolve()) : window.setTimeout(resolve, 0);
    });
  }

  async function deferWorldLoad(task, delay) {
    await delayMs(delay);
    await yieldToBrowser();
    return task();
  }

  async function runLimitedBatch(items, limit, worker) {
    const queue = [...items];
    const workers = Array.from({ length: Math.max(1, limit) }, async () => {
      while (queue.length) {
        const item = queue.shift();
        await worker(item);
        await yieldToBrowser();
      }
    });
    await Promise.all(workers);
  }

  function classifyByDistance(entries, spawnX, spawnZ, getAnchorPoint, nearRadius) {
    const near = [];
    const far = [];
    entries.forEach((entry) => {
      const anchor = getAnchorPoint(entry);
      if (!anchor) {
        far.push(entry);
        return;
      }
      const dist = Math.hypot(anchor[0] - spawnX, anchor[1] - spawnZ);
      (dist <= nearRadius ? near : far).push(entry);
    });
    return { near, far };
  }

  // For a "positions" (plural, clone-based) swap entry, use the CLOSEST
  // instance as the tiering anchor rather than the first one. Every
  // instance clones one already-fetched GLB, so tiering only decides WHEN
  // that single shared fetch is scheduled, not how many fetches happen -
  // being generous here (near tier if ANY instance is close) means, e.g., a
  // tree right next to spawn renders immediately even though most of
  // TREE_POSITIONS is scattered across the whole map, at zero extra cost.
  function swapAnchorPoint(swap, spawnX, spawnZ) {
    if (Array.isArray(swap.position)) return [swap.position[0], swap.position[2]];
    if (Array.isArray(swap.positions) && swap.positions.length) {
      let closest = swap.positions[0];
      let closestDist = Infinity;
      swap.positions.forEach(([x, z]) => {
        const dist = Math.hypot(x - spawnX, z - spawnZ);
        if (dist < closestDist) {
          closestDist = dist;
          closest = [x, z];
        }
      });
      return closest;
    }
    return null;
  }

  // Shared by addRoadDetailProps() and addDistrictPlazaProps(): both used to
  // independently fetch+parse asset-manifest.json and preload the same
  // shared Objaverse prop GLBs, risking duplicate concurrent fetches for the
  // same URL since both loaders kick off back-to-back from mount() before
  // either's internal cache is populated. One shared load, called once.
  async function loadObjaverseManifestAssets(assetManager, state) {
    if (!assetManager) return { byCategory: {}, loadedByUrl: new Map(), loadEntry: async () => null };
    let manifest;
    try {
      const response = await fetch("assets/life-sim/asset-manifest.json", { cache: "no-store" });
      manifest = await response.json();
    } catch (error) {
      console.warn("[Life Sim] Could not load asset manifest for props:", error);
      return { byCategory: {}, loadedByUrl: new Map(), loadEntry: async () => null };
    }
    const byCategory = {};
    (manifest.objaverseAssets || []).forEach((entry) => {
      (byCategory[entry.category] = byCategory[entry.category] || []).push(entry);
    });
    const loadedByUrl = new Map();
    const loadingByUrl = new Map();
    async function loadEntry(entry) {
      if (!entry || (state && state.destroyed)) return null;
      if (loadedByUrl.has(entry.url)) return loadedByUrl.get(entry.url);
      if (!loadingByUrl.has(entry.url)) {
        loadingByUrl.set(entry.url, assetManager.loadModel(entry.url, {
          id: entry.id,
          label: entry.label,
          targetHeightMeters: entry.targetHeightMeters
        }).then((asset) => {
          loadedByUrl.set(entry.url, asset);
          loadingByUrl.delete(entry.url);
          return asset;
        }).catch((error) => {
          loadingByUrl.delete(entry.url);
          console.warn(`[Life Sim] Optional prop asset failed: ${entry.url}`, error);
          return null;
        }));
      }
      return loadingByUrl.get(entry.url);
    }
    if (state && state.destroyed) return { byCategory, loadedByUrl, loadEntry };
    return { byCategory, loadedByUrl, loadEntry };
  }

  async function loadDistrictAssetSamples(THREE, scene, assetManager, state, spawnX, spawnZ) {
    if (!assetManager) return;
    const ready = await assetManager.ensureGltfLoader();
    if (!ready || (state && state.destroyed)) return;

    const swaps = [
      {
        url: "assets/environment/hdb-block.glb",
        hideNamePrefixes: ["HDB Home Block A", "HDB Home Block B"],
        position: [-30, 0, 42.2],
        scale: [5.5, 5.5, 5.5],
        targetHeightMeters: LIFE_SIM_SCALE_BUDGETS.hdbBlockHeightMeters
      },
      {
        url: "assets/environment/office-tower.glb",
        hideNamePrefixes: ["Office Tower"],
        position: [-25, 0, -83],
        scale: [5.5, 5.5, 5.5],
        targetHeightMeters: 38
      },
      {
        url: "assets/environment/library.glb",
        hideNames: ["Library Reading Hall", "Library Roof", "Library Quiet Glass"],
        position: [41, 0, 12],
        scale: [2.5, 2.5, 2.5],
        targetHeightMeters: 9
      },
      {
        url: "assets/environment/city-kit-commercial/mall-building.glb",
        hideNames: ["Mall Main Atrium", "Mall Glass Front", "Mall Round Atrium"],
        position: [0, 0, -35],
        scale: [6, 6, 6],
        targetHeightMeters: 15
      },
      {
        url: "assets/environment/tree-oak.glb",
        hideNames: ["Tree Trunk", "Tree Crown"],
        positions: TREE_POSITIONS,
        scale: [2.4, 2.4, 2.4],
        animateAsTree: true,
        isBuilding: false
      },
      // Orchard Road's dense rain-tree canopy - purely additive, denser than
      // the city-wide tree scatter above.
      {
        url: "assets/environment/tree-oak.glb",
        positions: ORCHARD_STREET_TREE_POSITIONS,
        scale: [2.2, 2.2, 2.2],
        animateAsTree: true,
        isBuilding: false
      },
      // Orchard Road: extends the Mall zone with two more shopfronts along the
      // same street instead of replacing anything, so the existing shop
      // fronts/signage/plants stay exactly where they were.
      {
        url: "assets/environment/city-kit-commercial/orchard-shop-a.glb",
        position: [-8, 0, -35],
        scale: [6.5, 6.5, 6.5],
        targetHeightMeters: 13
      },
      {
        url: "assets/environment/city-kit-commercial/orchard-shop-b.glb",
        position: [8, 0, -35],
        scale: [4.2, 4.2, 4.2],
        targetHeightMeters: 12
      },
      // University Town: adds a lecture hall and a hostel block near the
      // existing University zone, purely additive like Orchard Road above.
      {
        url: "assets/environment/university-lecture-hall.glb",
        // Realism pass: this GLB and the primitive "University Main Hall" box
        // sit only ~6 units apart and were rendering as two overlapping
        // buildings ("purely additive" per the original Volume 5 note) - hide
        // the primitive shell now that a real modeled lecture hall covers the
        // same role, matching the HDB/Office/Library/Mall swap pattern. The
        // freestanding entrance columns/lecture seats/cafe counter/bookshelf
        // stay as an outdoor campus plaza in front of it.
        hideNames: ["University Main Hall", "University Lecture Roof"],
        position: [-86, 0, -5],
        scale: [3.5, 3.5, 3.5],
        targetHeightMeters: 13
      },
      {
        url: "assets/environment/university-hostel.glb",
        position: [-80, 0, -12],
        scale: [3.2, 3.2, 3.2],
        targetHeightMeters: 20
      },
      // Marina Bay / CBD: three City Kit Commercial skyscrapers cluster around
      // the hand-built Marina-Bay-Sands-style landmark (addMarinaBayLandmark),
      // which uses the same primitive-box style as every other district
      // building rather than a downloaded model - there's no free CC0 model
      // of that specific silhouette.
      // Layout pass: nudged away from the hand-built Marina Bay Sands towers
      // (33-47,-66..-60) and ArtScience Museum (19.8-28.2,-70.2..-61.8) - the
      // layout audit found all three overlapping one or both landmarks at
      // their original positions. Still clustered nearby for background
      // density, just pushed clear of the landmarks' actual footprints.
      {
        url: "assets/environment/city-kit-commercial/marina-skyscraper-a.glb",
        // This used to sit at [30,-76] with a 48m target height, which loaded
        // inside the Food Court first camera cone as a giant black wall. Keep
        // the CBD tower, but move it back into the Marina/CBD cluster and
        // lower its first-screen pressure.
        position: [46, 0, -62],
        scale: [3.7, 3.7, 3.7],
        targetHeightMeters: 28
      },
      {
        url: "assets/environment/city-kit-commercial/marina-skyscraper-c.glb",
        position: [64, 0, -51],
        scale: [3.6, 3.6, 3.6],
        targetHeightMeters: 30
      },
      {
        url: "assets/environment/city-kit-commercial/marina-skyscraper-e.glb",
        position: [66, 0, -66],
        scale: [3.2, 3.2, 3.2],
        targetHeightMeters: 28
      },
      // Sentosa: purely additive palm trees around the existing Beach zone.
      {
        url: "assets/environment/tree-palm.glb",
        positions: SENTOSA_PALM_POSITIONS,
        scale: [3.0, 3.0, 3.0],
        animateAsTree: true,
        isBuilding: false
      },
      {
        url: "assets/environment/tree-palm-bend.glb",
        positions: SENTOSA_PALM_BEND_POSITIONS,
        scale: [3.0, 3.0, 3.0],
        animateAsTree: true,
        isBuilding: false
      },
      // Woodlands pilot: real modeled+textured buildings (Quaternius's free
      // CC0 "Downtown City MegaKit") replacing the primitive-box HDB blocks
      // and mall, per the art-direction reassessment in this session. Spread
      // further apart than the boxes they replace since these models are
      // larger and more detailed than a plain box footprint.
      {
        url: "assets/environment/city-kit-quaternius/Building_Medium_2_001.glb",
        hideNamePrefixes: ["Woodlands HDB Block A"],
        position: [-11, 0, 53],
        scale: [1, 1, 1],
        targetHeightMeters: 20
      },
      {
        url: "assets/environment/city-kit-quaternius/Building_Small_1.glb",
        hideNamePrefixes: ["Woodlands HDB Block B"],
        position: [-27, 0, 47],
        scale: [1, 1, 1],
        targetHeightMeters: 17
      },
      {
        url: "assets/environment/city-kit-quaternius/Building_Large_2.glb",
        hideNames: ["Causeway Point Mall", "Causeway Point Glass Front", "Causeway Point Roof"],
        position: [22, 0, 48],
        scale: [1, 1, 1],
        targetHeightMeters: 18
      },
      // Woodlands estate expansion: 12 more blocks cycling through the same
      // 3 Quaternius files as the mall/original 2 blocks above, grouped by
      // file into 3 "positions" (plural, clone-based) entries - safe to
      // reuse a url already used by a singular entry above (see the
      // Punggol/Raffles Place comment for why singular+singular is the
      // unsafe combination, not singular+plural).
      // targetHeightMeters (not scale: [1,1,1]) on all three of these -
      // the layout audit measured Building_Large_2.gltf's native/unscaled
      // footprint at 20.6x16.6 units, comfortably wider than any grid slot
      // regardless of spacing. normalizeToHeight() (lifeverse-asset-
      // manager.js) scales uniformly from real height instead of leaving
      // native GLB scale untouched, which is what every other real-asset
      // swap on the map should probably be doing too, not just this one -
      // flagged here since fixing all of them is out of scope for one pass.
      {
        url: "assets/environment/city-kit-quaternius/Building_Large_2.glb",
        hideNamePrefixes: ["Woodlands Estate Block C", "Woodlands Estate Block F", "Woodlands Estate Block I", "Woodlands Estate Block L"],
        positions: [[-21, 14], [18, 14], [5, 27], [-8, 36]],
        targetHeightMeters: 16
      },
      {
        url: "assets/environment/city-kit-quaternius/Building_Medium_2_001.glb",
        hideNamePrefixes: ["Woodlands Estate Block D", "Woodlands Estate Block G", "Woodlands Estate Block J", "Woodlands Estate Block M"],
        positions: [[-8, 14], [-21, 27], [18, 27], [5, 36]],
        targetHeightMeters: 16
      },
      {
        url: "assets/environment/city-kit-quaternius/Building_Small_1.glb",
        hideNamePrefixes: ["Woodlands Estate Block E", "Woodlands Estate Block H", "Woodlands Estate Block K", "Woodlands Estate Block N"],
        positions: [[5, 14], [-8, 27], [-21, 36], [18, 36]],
        targetHeightMeters: 16
      },
      // Real-model pass: swapping the remaining hand-built primitive-box
      // shophouses/buildings for real CC0 modeled buildings (Kenney "City Kit
      // Commercial" / "Modular Buildings" packs, kept in
      // assets/environment/city-kit-commercial/ per the existing texture-
      // collision-avoidance convention) - the muted-color box pass alone did
      // not read as "realistic", only as a less garish box city. Ground-floor
      // shopfront/canopy/signage props that AREN'T part of the hidden
      // primitive's name prefix stay in place as added detail around the
      // real building.
      {
        url: "assets/environment/city-kit-commercial/chinatown-shophouse-a.glb",
        hideNamePrefixes: ["Chinatown Shophouse Rose"],
        position: [0, 0, -65],
        scale: [5.2, 5.2, 5.2],
        targetHeightMeters: LIFE_SIM_SCALE_BUDGETS.shophouseHeightMeters
      },
      {
        url: "assets/environment/city-kit-commercial/chinatown-shophouse-b.glb",
        hideNamePrefixes: ["Chinatown Shophouse Ochre"],
        position: [5.5, 0, -65],
        scale: [5.2, 5.2, 5.2],
        targetHeightMeters: LIFE_SIM_SCALE_BUDGETS.shophouseHeightMeters
      },
      {
        url: "assets/environment/city-kit-commercial/chinatown-shophouse-c.glb",
        hideNamePrefixes: ["Chinatown Shophouse Teal"],
        position: [11, 0, -65],
        scale: [5.2, 5.2, 5.2],
        targetHeightMeters: LIFE_SIM_SCALE_BUDGETS.shophouseHeightMeters
      },
      {
        url: "assets/environment/city-kit-commercial/chinatown-shophouse-d.glb",
        hideNamePrefixes: ["Chinatown Shophouse Cream"],
        position: [16.5, 0, -65],
        scale: [5.2, 5.2, 5.2],
        targetHeightMeters: LIFE_SIM_SCALE_BUDGETS.shophouseHeightMeters
      },
      {
        url: "assets/environment/city-kit-commercial/little-india-shophouse-a.glb",
        hideNamePrefixes: ["Little India Shophouse Blue"],
        position: [17, 0, -19],
        scale: [4.0, 4.0, 4.0],
        targetHeightMeters: 12
      },
      {
        url: "assets/environment/city-kit-commercial/little-india-shophouse-b.glb",
        hideNamePrefixes: ["Little India Shophouse Saffron"],
        position: [22.5, 0, -19],
        scale: [3.5, 3.5, 3.5],
        targetHeightMeters: 11
      },
      {
        url: "assets/environment/city-kit-commercial/little-india-shophouse-c.glb",
        hideNamePrefixes: ["Little India Shophouse Magenta"],
        position: [28, 0, -19],
        scale: [3.2, 3.2, 3.2],
        targetHeightMeters: 11
      },
      {
        url: "assets/environment/city-kit-commercial/little-india-shophouse-d.glb",
        hideNamePrefixes: ["Little India Shophouse Cream"],
        position: [33.5, 0, -19],
        scale: [2.2, 3.2, 2.2],
        targetHeightMeters: 10
      },
      {
        url: "assets/environment/city-kit-commercial/bugis-shophouse-a.glb",
        hideNamePrefixes: ["Bugis Heritage Shophouse A"],
        position: [44, 0, -37],
        scale: [2.6, 3.4, 2.6],
        targetHeightMeters: 11
      },
      {
        url: "assets/environment/city-kit-commercial/bugis-shophouse-b.glb",
        hideNamePrefixes: ["Bugis Heritage Shophouse B"],
        position: [49.2, 0, -37],
        scale: [3.2, 3.2, 3.2],
        targetHeightMeters: 11
      },
      {
        url: "assets/environment/city-kit-commercial/hospital-block.glb",
        hideNamePrefixes: ["Hospital Clean Main Wing", "Hospital Ward Tower"],
        position: [80, 0, -52],
        scale: [3.0, 3.0, 3.0],
        targetHeightMeters: 16
      },
      {
        url: "assets/environment/city-kit-commercial/airport-terminal.glb",
        hideNames: ["Airport Terminal", "Airport Glass Departures", "Airport Terminal Overhang"],
        hideNamePrefixes: ["Airport Facade Mullion"],
        position: [110, 0, -10],
        scale: [8, 7, 8],
        targetHeightMeters: 12
      },
      {
        url: "assets/environment/city-kit-commercial/gym-building.glb",
        hideNames: ["Gym Roof"],
        hideNamePrefixes: ["Gym Fitness Studio"],
        position: [-60, 0, 54],
        scale: [6, 3.2, 6],
        targetHeightMeters: 8
      },
      {
        url: "assets/environment/cafe-building.glb",
        hideNames: ["Cafe Roof"],
        hideNamePrefixes: ["Cafe Cozy Shop"],
        position: [-50, 0, -26.5],
        scale: [2.6, 2.6, 2.6],
        targetHeightMeters: 7
      },
      // Real park bench (Kenney "Furniture Kit") city-wide, replacing every
      // primitive "Bench Seat"/"Bench Back" pair (Park x2, Beach x1,
      // Woodlands x2, Raffles Place x2) - same city-wide-swap pattern as the
      // tree replacement above rather than a per-zone entry, since
      // addBench() is one shared helper called from multiple zones.
      {
        url: "assets/environment/park-bench.glb",
        hideNames: ["Bench Seat", "Bench Back"],
        positions: [[8, 20.2], [18, 25.8], [72.3, -80.1], [0, 40.5], [5, 43], [82, -18], [70, -20], [68, 2], [87, 2], [84, 74.5], [96, 74.5], [27, 44], [37, 44], [-5, 33.5], [1, 40.5]],
        scale: [4, 2, 3],
        isBuilding: false
      },
      // Punggol: reuses the same real HDB block model as Home, and the same
      // mall model as Orchard Road. Both use the "positions" (plural, clone-
      // based) form even for a single position - the singular "position"
      // form directly repositions the ONE cached, shared scene object for a
      // url, so two singular entries sharing a url (this reuses hdb-block.glb
      // and mall-building.glb, each already used elsewhere via a singular
      // entry) race to reposition the same object and only the
      // last-resolved one actually ends up in the right place. "positions"
      // always clones first, so it's safe to reuse a url this way no matter
      // what order entries resolve in.
      {
        url: "assets/environment/hdb-block.glb",
        hideNamePrefixes: ["Punggol HDB Block A", "Punggol HDB Block B"],
        positions: [[78, 67], [70, 71]],
        scale: [5.2, 5.2, 5.2],
        targetHeightMeters: 24
      },
      {
        url: "assets/environment/city-kit-commercial/mall-building.glb",
        hideNames: ["Waterway Point Mall", "Waterway Point Glass Front", "Waterway Point Roof"],
        positions: [[101, 68]],
        scale: [6, 6, 6],
        targetHeightMeters: 15
      },
      // Raffles Place: two of Marina Bay's own generic City Kit Commercial
      // skyscrapers reused for background density around the hand-built
      // towers in addRafflesPlace() - purely additive, nothing to hide.
      // "positions" (plural) form even for one position each, since both
      // urls are already used once by Marina Bay's own singular entries
      // below - see the Punggol comment above for why reusing a url via two
      // singular entries is unsafe but two "positions" entries (or one
      // singular + one "positions") are not.
      // Layout pass: nudged away from Raffles Place's own hand-built towers
      // (addRafflesPlace()) - the audit found Tower A/C overlapping these.
      {
        url: "assets/environment/city-kit-commercial/marina-skyscraper-a.glb",
        positions: [[61, -35]],
        scale: [4.6, 4.6, 4.6],
        targetHeightMeters: 42
      },
      {
        url: "assets/environment/city-kit-commercial/marina-skyscraper-e.glb",
        positions: [[95, -23]],
        scale: [4.2, 4.2, 4.2],
        targetHeightMeters: 38
      },
      // Realistic replacement pass: the Singapore infill rows below were the
      // most visible remaining primitive-box buildings in the over-shoulder
      // camera. Replace their visual shells with reusable GLB buildings while
      // keeping the procedural shells as safe fallbacks if a model fails.
      {
        url: "assets/environment/city-kit-quaternius/Building_Small_1.glb",
        hideNamePrefixes: ["Main Street Mixed-Use Block"],
        positions: [[-46, -25], [-37, -25], [-28, -25], [-18, -25], [3, -25], [12, -25], [23, -25], [34, -25], [46, -25], [58, -25]],
        scale: [1, 1, 1],
        targetHeightMeters: 12
      },
      {
        url: "assets/environment/city-kit-quaternius/Building_Medium_2_001.glb",
        hideNamePrefixes: ["South Main Street Block"],
        positions: [[-42, -40], [-31, -40], [-20, -40], [-9, -40], [12, -40], [25, -40], [38, -40], [52, -40], [66, -40], [80, -40]],
        scale: [1, 1, 1],
        targetHeightMeters: 12
      },
      {
        url: "assets/environment/city-kit-quaternius/Building_Medium_2_001.glb",
        hideNamePrefixes: ["Heartland HDB Precinct Block"],
        positions: [[-46, 38], [-38, 34], [-28, 49.5], [-15, 41]],
        scale: [1, 1, 1],
        targetHeightMeters: 19
      },
      {
        url: "assets/environment/city-kit-quaternius/Building_Large_2.glb",
        hideNamePrefixes: ["CBD Infill Tower"],
        positions: [[66, -16], [88, -17], [72, -47], [88, -46], [51, -43.2]],
        scale: [1, 1, 1],
        targetHeightMeters: 34
      },
      {
        url: "assets/environment/city-kit-quaternius/Building_Small_1.glb",
        hideNamePrefixes: ["Town Centre Medical Block", "Town Centre Tuition Block", "Town Centre Kopitiam Block", "Campus Student Services Block", "Social Shophouse Infill", "Social Night Market Infill", "Airport Budget Travel Block", "Park Wellness Kiosk"],
        positions: [[-22, -3], [-4, -3], [-20, -14], [-63, -26], [24, -62], [40, -62], [104, -59], [39, 24]],
        scale: [1, 1, 1],
        targetHeightMeters: 8
      }
    ];

    // Loaded in parallel rather than one-at-a-time: this list grew from ~15
    // entries to ~30 in the real-model pass, and sequential `await` per swap
    // made total load time (each fetch+parse ~1-1.5s) stack up to 40s+ before
    // the last buildings appeared. Each swap is still independently
    // try/caught so one failed/slow model can't block or break the others.
    // Distance-tiered load pass: run the near-tier batch (swaps close to the
    // player's spawn point) to completion first, THEN start the far-tier
    // batch - splits ~30 simultaneous fetches into two smaller waves so the
    // handful nearest the player aren't competing for connections with
    // distant districts like Woodlands.
    async function runSwapBatch(list, concurrency) {
      await runLimitedBatch(list, concurrency, async (swap) => {
        try {
          const asset = await assetManager.loadModel(swap.url, {
            toonify: true,
            scale: swap.scale,
            label: swap.url
          });
          if (state && state.destroyed) return;
          if (!asset || asset.fallback || !asset.scene) return;

          // Collision-fix pass: found via an actual recorded playthrough (the
          // static layout audit and warnOnColliderOverlaps only ever check
          // bounding-box overlap between OBJECTS - neither ever verified
          // player-vs-collider correctness). registerStaticCollider() is only
          // called from addBuildingCore(), which builds the primitive-box
          // placeholders - once a swap here hides that primitive (or, for a
          // purely-additive swap, never had one to begin with), the real GLB
          // on screen had NO matching collider, so the player could walk
          // straight through every "realistic" building this session added.
          // isBuilding defaults to true (most swaps are buildings); only
          // trees/benches opt out with isBuilding: false.
          const isBuilding = swap.isBuilding !== false;

          if (Array.isArray(swap.positions)) {
            swap.positions.forEach(([x, z], index) => {
              const instance = asset.scene.clone(true);
              assetManager.prepareModel(instance, { toonify: true, position: [x, 0, z], scale: swap.scale, targetHeightMeters: swap.targetHeightMeters });
              recenterOnGroundSlot(THREE, instance, x, z);
              scene.add(instance);
              if (isBuilding) {
                const box = new THREE.Box3().setFromObject(instance);
                const size = new THREE.Vector3();
                box.getSize(size);
                registerStaticCollider(`${swap.url} #${index}`, x, z, size.x, size.z);
              }
              // registerPresentationObjects() already ran (synchronously, before this
              // async load resolved) and only found the original procedural "Tree
              // Crown" groups this is about to hide. Register the replacement
              // directly so it keeps the same wind-sway animation instead of going static.
              if (swap.animateAsTree && state && state.presentation && Array.isArray(state.presentation.treeCrowns)) {
                state.presentation.treeCrowns.push(instance);
              }
            });
          } else {
            assetManager.prepareModel(asset.scene, { toonify: true, position: swap.position, scale: swap.scale, targetHeightMeters: swap.targetHeightMeters });
            recenterOnGroundSlot(THREE, asset.scene, swap.position[0], swap.position[2]);
            scene.add(asset.scene);
            if (isBuilding) {
              const box = new THREE.Box3().setFromObject(asset.scene);
              const size = new THREE.Vector3();
              box.getSize(size);
              registerStaticCollider(swap.url, swap.position[0], swap.position[2], size.x, size.z);
            }
          }

          const hideNames = swap.hideNames || [];
          const hidePrefixes = swap.hideNamePrefixes || [];
          if (isBuilding) {
            // The primitive(s) being hidden below already have a collider
            // registered at their OWN position/size - stale the moment the
            // real GLB (registered above, at ITS real measured footprint)
            // takes over the visuals. Remove by name match, same matching
            // rule as the visibility hide right below.
            for (let i = activeStaticColliders.length - 1; i >= 0; i -= 1) {
              const colliderName = activeStaticColliders[i].name;
              if (hideNames.includes(colliderName) || hidePrefixes.some((prefix) => colliderName.startsWith(prefix))) {
                activeStaticColliders.splice(i, 1);
              }
            }
          }
          // Zones now build into a per-zone offset Group (see addZoneAt) rather
          // than straight into `scene`, so the procedural placeholders this is
          // hiding sit one level deeper than they used to - traverse() finds
          // them at any depth instead of only scene's direct children.
          scene.traverse((child) => {
            if (!child.name) return;
            if (hideNames.includes(child.name) || hidePrefixes.some((prefix) => child.name.startsWith(prefix))) {
              child.visible = false;
            }
          });
        } catch (error) {
          console.warn(`[Life Sim] Optional district asset swap failed: ${swap.url}`, error);
        }
      });
    }

    const { near, far } = classifyByDistance(swaps, spawnX, spawnZ, (swap) => swapAnchorPoint(swap, spawnX, spawnZ), NEAR_TIER_RADIUS);
    await runSwapBatch(near, LIFE_SIM_PERFORMANCE.nearAssetConcurrency);
    if (state && state.destroyed) return;
    await delayMs(LIFE_SIM_PERFORMANCE.farAssetDelayMs);
    await runSwapBatch(far, LIFE_SIM_PERFORMANCE.farAssetConcurrency);
  }

  // Rebuilt for the real-asset spacing replan: the old cross-shaped road
  // (two ~70-unit boxes) covered the entire old compact map, but the new
  // zone layout spans roughly 200x157 units. Main Road NS runs along x=0
  // (Mall and Woodlands both sit near that line); Main Road EW runs along
  // z=-32 (the downtown-ring zones - Mall/Bugis - sit on that line), meeting
  // at the Mall zone as a natural central hub. Every other zone gets a
  // direct addPath connector into this spine or into a nearby zone, so the
  // whole 18-zone map is one connected network, not scattered islands.
  // Shared with addRoadDetailProps() (realistic-style pivot, Phase 3) so
  // Objaverse street-furniture props line up with the actual rendered road
  // geometry instead of a second, hand-copied coordinate list drifting out
  // of sync with this one.
  const ROAD_MAIN_SEGMENTS = [
    { x1: 0, z1: -42, x2: 0, z2: 58, width: 7 },
    { x1: -51, z1: -32, x2: 111, z2: -32, width: 7 }
  ];
  const ROAD_CONNECTOR_PATHS = [
    // North residential branch
    [-30, 40, 0, 40],
    [-60, 52, -30, 40],
    // Central spine spurs
    [-13, 8, 0, 8],
    [13, 23, 0, 23],
    [41, 12, 0, 12],
    [25, -14, 0, -14],
    // Downtown ring, hanging off Main Road EW
    [10, -61, 10, -32],
    [40, -61, 40, -32],
    // East/southeast coastal chain
    [80, -53, 80, -32],
    [75, -82, 80, -53],
    [110, -10, 110, -32],
    // West cluster
    [-80, -5, -50, -25],
    [-50, -25, -50, -32],
    // South cluster
    [-25, -85, 0, -32],
    [20, -95, -25, -85]
  ];

  function addRoadNetwork(THREE, scene, mat) {
    [
      ["Main Road NS", [0, 0.01, 8], [7, 0.08, 100]],
      ["Main Road EW", [30, 0.02, -32], [162, 0.08, 7]]
    ].forEach(([name, position, scale]) => addBox(THREE, scene, name, position, scale, mat.road, true));

    ROAD_CONNECTOR_PATHS.forEach(([x1, z1, x2, z2]) => addPath(THREE, scene, [x1, z1], [x2, z2], 1.3, mat.path));

    for (let z = -35; z <= 57; z += 6) addBox(THREE, scene, "Road Center Line NS", [0, 0.13, z], [0.25, 0.04, 2.15], mat.roadLine, true);
    for (let x = -50; x <= 110; x += 6) addBox(THREE, scene, "Road Center Line EW", [x, 0.14, -32], [2.15, 0.04, 0.25], mat.roadLine, true);
    addCrosswalk(THREE, scene, [0, -28], mat, "x");
    addCrosswalk(THREE, scene, [-4, -32], mat, "z");
  }

  function addStreetCompositionLayer(THREE, scene, mat) {
    ROAD_MAIN_SEGMENTS.forEach((segment) => addRoadEdgesAndStreetRhythm(THREE, scene, segment, mat, "main"));
    ROAD_CONNECTOR_PATHS.forEach(([x1, z1, x2, z2]) => {
      addRoadEdgesAndStreetRhythm(THREE, scene, { x1, z1, x2, z2, width: 2.2 }, mat, "connector");
    });
    addFoodCourtStreetComposition(THREE, scene, mat);
  }

  function addRoadEdgesAndStreetRhythm(THREE, scene, segment, mat, density = "main") {
    const { x1, z1, x2, z2, width } = segment;
    const edgeOffset = width / 2 + 0.18;
    [-edgeOffset, edgeOffset].forEach((offset) => {
      const startOffset = segmentPerpendicularOffset(x1, z1, x2, z2, offset);
      addPath(
        THREE,
        scene,
        [x1 + startOffset[0], z1 + startOffset[1]],
        [x2 + startOffset[0], z2 + startOffset[1]],
        density === "main" ? 0.24 : 0.15,
        mat.curbWarm
      );
    });

    const spacing = density === "main" ? 12 : 20;
    const points = sampleSegmentPoints(x1, z1, x2, z2, spacing);
    points.forEach((point, index) => {
      const side = index % 2 === 0 ? 1 : -1;
      const offset = segmentPerpendicularOffset(x1, z1, x2, z2, side * (width / 2 + 1.65));
      const px = point[0] + offset[0];
      const pz = point[1] + offset[1];
      if (density === "main" && index % 3 === 0) addStreetLight(THREE, scene, [px, pz], mat);
      else if (index % 3 === 1) addTree(THREE, scene, [px, pz], mat);
      else addPlanterRow(THREE, scene, [px - 0.65, pz], 2, mat);
    });
  }

  function addFoodCourtStreetComposition(THREE, scene, mat) {
    // First-impression repair: the food-court spawn used to open onto a wide,
    // empty concrete slab. This frames it as a Singapore street edge instead:
    // darker road, kerb, shop row, planters, lights, and crosswalk rhythm.
    addBox(THREE, scene, "Hawker Street Road Surface", [15, 0.055, -84.5], [48, 0.07, 4.6], mat.road, true);
    addBox(THREE, scene, "Hawker Street North Kerb", [15, 0.18, -81.95], [48, 0.18, 0.28], mat.curbWarm, true);
    addBox(THREE, scene, "Hawker Street South Kerb", [15, 0.18, -87.05], [48, 0.18, 0.28], mat.curbWarm, true);
    for (let x = -5; x <= 34; x += 7) addBox(THREE, scene, "Hawker Street Lane Dash", [x, 0.17, -84.5], [2.2, 0.035, 0.18], mat.roadLine, true);
    addCrosswalk(THREE, scene, [2, -84.5], mat, "z");
    addCrosswalk(THREE, scene, [31, -84.5], mat, "z");
    for (let x = -8; x <= 39; x += 4) addBox(THREE, scene, "Hawker Apron Tile Seam X", [x, 0.255, -77.2], [0.025, 0.025, 8.2], mat.curbWarm, true);
    for (let z = -81; z <= -73; z += 2) addBox(THREE, scene, "Hawker Apron Tile Seam Z", [15, 0.26, z], [48, 0.025, 0.025], mat.curbWarm, true);

    [
      [-6, -91.4, "VALUE"], [2, -91.4, "KOPI"], [10, -91.4, "NASI"], [18, -91.4, "FRUIT"], [26, -91.4, "MART"], [34, -91.4, "ATM"]
    ].forEach(([x, z, label], index) => {
      addBuildingCore(THREE, scene, `Hawker Street Shop ${label}`, [x, 1.75, z], [4.9, 3.5, 2.1], index % 2 ? mat.cafe : mat.hdbAccent, mat, "shophouse");
      addShopFront(THREE, scene, [x, z + 1.18], label, index % 2 ? mat.signGold : mat.signBlue, mat);
      addBox(THREE, scene, `Hawker Street ${label} Awning`, [x, 2.55, z + 1.35], [4.8, 0.16, 0.75], index % 2 ? mat.signGold : mat.signGreen, true);
      addBox(THREE, scene, `Hawker Street ${label} Sign Band`, [x, 3.05, z + 1.28], [3.8, 0.36, 0.1], index % 2 ? mat.signBlue : mat.signGold);
    });

    [-8, 12, 32, 42].forEach((x, index) => {
      addStreetLight(THREE, scene, [x, -77.4], mat);
      addPlanterRow(THREE, scene, [x - 0.8, -78.9], 2, mat);
      if (index % 2 === 0) addBench(THREE, scene, [x + 1.7, -79.6], mat);
    });
    [[-2, -76], [8, -76], [18, -76], [28, -76]].forEach(([x, z]) => addTree(THREE, scene, [x, z], mat));
    addSignBoard(THREE, scene, "Hawker Street Direction Sign", "FOOD COURT  MRT  MALL", [-8, 2.4, -79.2], mat.signGreen, 0xffffff);
  }

  function segmentPoint(x1, z1, x2, z2, t) {
    return [x1 + (x2 - x1) * t, z1 + (z2 - z1) * t];
  }

  function segmentPerpendicularOffset(x1, z1, x2, z2, distance) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz) || 1;
    return [(-dz / length) * distance, (dx / length) * distance];
  }

  function sampleSegmentPoints(x1, z1, x2, z2, spacing) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const count = Math.max(1, Math.floor(length / spacing));
    const points = [];
    for (let i = 1; i < count; i += 1) points.push(segmentPoint(x1, z1, x2, z2, i / count));
    return points;
  }

  // Realistic-style pivot, Phase 3: places real Objaverse street-furniture
  // along the same road topology addRoadNetwork() renders (ROAD_MAIN_SEGMENTS
  // + ROAD_CONNECTOR_PATHS above), using each manifest entry's
  // targetHeightMeters (via assetManager's normalizeToHeight) for correct
  // real-world scale. The drivable road SURFACE itself stays the existing
  // primitive PBR-textured geometry - Objaverse's LVIS index has no road/
  // pavement/asphalt/tile category at all (checked all 1156 categories), so
  // there is nothing to swap the surface itself to. This is deliberately
  // props-only, per the plan's flagged fallback for that gap.
  async function addRoadDetailProps(THREE, scene, assetManager, state, spawnX, spawnZ, objaverseIndexReady) {
    if (!assetManager) return;
    const ready = await assetManager.ensureGltfLoader();
    if (!ready || (state && state.destroyed)) return;

    // Manifest fetch + shared-prop preload now lives in
    // loadObjaverseManifestAssets() (called once from mount()) rather than
    // duplicated here and in addDistrictPlazaProps() - both loaders used to
    // independently fetch the same manifest and preload the same ~13 shared
    // GLBs, risking duplicate concurrent fetches for the same URL.
    const { byCategory, loadedByUrl, loadEntry } = await objaverseIndexReady;
    if (state && state.destroyed) return;

    let placementCount = 0;
    async function place(entry, position, rotationY = 0) {
      if (!entry) return;
      const asset = loadedByUrl.get(entry.url) || (typeof loadEntry === "function" ? await loadEntry(entry) : null);
      if (!asset || asset.fallback || !asset.scene) return;
      const instance = asset.scene.clone(true);
      instance.position.set(position[0], position[1] || 0, position[2]);
      instance.rotation.y = rotationY;
      scene.add(instance);
      placementCount += 1;
      if (placementCount % LIFE_SIM_PERFORMANCE.propYieldEvery === 0) await yieldToBrowser();
    }

    const roundRobin = {};
    function nextEntry(...categories) {
      for (const category of categories) {
        const list = byCategory[category];
        if (list && list.length) {
          roundRobin[category] = (roundRobin[category] || 0) + 1;
          return list[(roundRobin[category] - 1) % list.length];
        }
      }
      return null;
    }

    const allSegments = [
      ...ROAD_MAIN_SEGMENTS,
      ...ROAD_CONNECTOR_PATHS.map(([x1, z1, x2, z2]) => ({ x1, z1, x2, z2, width: 1.3 }))
    ];

    function segmentMidpoint(segment) {
      return [(segment.x1 + segment.x2) / 2, (segment.z1 + segment.z2) / 2];
    }

    async function placeStreetFurniture(segment) {
      const sidewalkDistance = segment.width / 2 + 1.4;
      const [lightDx, lightDz] = segmentPerpendicularOffset(segment.x1, segment.z1, segment.x2, segment.z2, sidewalkDistance);
      const [poleDx, poleDz] = segmentPerpendicularOffset(segment.x1, segment.z1, segment.x2, segment.z2, -sidewalkDistance);
      const lightPoints = sampleSegmentPoints(segment.x1, segment.z1, segment.x2, segment.z2, 20);
      for (const [px, pz] of lightPoints) {
        await place(nextEntry("lamppost", "streetlight"), [px + lightDx, 0, pz + lightDz]);
      }
      const polePoints = sampleSegmentPoints(segment.x1, segment.z1, segment.x2, segment.z2, 30);
      for (const [px, pz] of polePoints) {
        await place(nextEntry("telephone_pole"), [px + poleDx, 0, pz + poleDz]);
      }
    }

    async function placeMainSpineFurniture(segment) {
      const sidewalkDistance = segment.width / 2 + 2.4;
      const [sideDx, sideDz] = segmentPerpendicularOffset(segment.x1, segment.z1, segment.x2, segment.z2, sidewalkDistance);
      const benchPoints = sampleSegmentPoints(segment.x1, segment.z1, segment.x2, segment.z2, 40);
      for (const [px, pz] of benchPoints) {
        await place(nextEntry("bench"), [px + sideDx, 0, pz + sideDz]);
        await place(nextEntry("trash_can"), [px + sideDx * 1.4, 0, pz + sideDz * 1.4]);
      }
      const manholePoints = sampleSegmentPoints(segment.x1, segment.z1, segment.x2, segment.z2, 25);
      for (const [px, pz] of manholePoints) {
        await place(nextEntry("manhole"), [px, 0.02, pz], Math.random() * Math.PI * 2);
      }
    }

    // Streetlights and telephone poles down opposite sidewalks of every
    // segment - real streets have both, and alternating sides reads as a
    // planned street rather than one row of identical clutter. Near-tier
    // segments (closest to spawn) are placed first, far-tier afterward -
    // same distance-tiered pattern as loadDistrictAssetSamples().
    const segmentTiers = classifyByDistance(allSegments, spawnX, spawnZ, segmentMidpoint, NEAR_TIER_RADIUS);
    for (const segment of segmentTiers.near) {
      if (state && state.destroyed) return;
      await placeStreetFurniture(segment);
    }
    await delayMs(LIFE_SIM_PERFORMANCE.farPropsDelayMs);
    for (const segment of segmentTiers.far) {
      if (state && state.destroyed) return;
      await placeStreetFurniture(segment);
    }

    // Benches, trash cans, and manholes only along the two main spine roads -
    // keeps the busiest, most-walked stretch feeling detailed without
    // scattering the same handful of props across all 17 segments.
    const mainSpineTiers = classifyByDistance(ROAD_MAIN_SEGMENTS, spawnX, spawnZ, segmentMidpoint, NEAR_TIER_RADIUS);
    for (const segment of mainSpineTiers.near) {
      if (state && state.destroyed) return;
      await placeMainSpineFurniture(segment);
    }
    await delayMs(LIFE_SIM_PERFORMANCE.farPropsDelayMs);
    for (const segment of mainSpineTiers.far) {
      if (state && state.destroyed) return;
      await placeMainSpineFurniture(segment);
    }

    // Stop signs and a couple of traffic cones at the busiest junctions only
    // - one per real-world intersection, not swept across every segment.
    await place(nextEntry("stop_sign"), [0 + 4.5, 0, 8 + 4.5]);
    await place(nextEntry("stop_sign"), [30 - 4.5, 0, -32 - 4.5], Math.PI);
    await place(nextEntry("cone"), [6, 0, -30]);
    await place(nextEntry("cone"), [7.4, 0, -30.6]);
  }

  // Realistic-style pivot: user feedback ("很多空白" - a lot of blank space)
  // after fixing the Little India temple pointed at a wider problem - every
  // district's open plaza ground has nothing scattered on it beyond the
  // buildings themselves. Scatters real Objaverse props (flowerpot, statue,
  // bicycle, mailbox, umbrella) in a ring around each district's center,
  // reusing the same manifest/parallel-preload pattern as
  // addRoadDetailProps() rather than duplicating it. Deliberately placed at
  // 1.3x-1.7x each zone's own interaction radius - inside that ring is where
  // the zone's actual buildings/interaction trigger live, so staying outside
  // it keeps these decorative-only props from sitting on top of a building.
  // "Use more Objaverse resources" pass: instead of the same 5-category
  // rotation on every zone regardless of what it actually is, zones with a
  // distinctive real-world identity get one themed prop layered into their
  // ring (replacing 1 of the 3 generic slots, not adding a 4th - keeps
  // total city-wide placement count unchanged at 3 x 22 = 66, so the only
  // new payload is the themed GLBs themselves, fetched once and shared
  // across every zone using that category). Every category below was
  // confirmed to exist in Objaverse's LVIS taxonomy via
  // `python tools/objaverse_fetch.py --list-categories <keyword>` before
  // being relied on here - Objaverse's category list is quirky (e.g.
  // "picnic"/"luggage"/"fountain"/"planter" all return zero matches), so
  // nothing here is guessed.
  const ZONE_THEME_CATEGORIES = {
    hospital: ["wheelchair"],
    university: ["backpack"],
    gym: ["dumbbell"],
    airport: ["suitcase"],
    chinatown: ["lantern"],
    "little-india": ["lantern"],
    bugis: ["lantern"],
    beach: ["deck_chair"],
    "clarke-quay": ["coffee_table"],
    cafe: ["coffee_table"],
    mall: ["shopping_cart"]
  };

  async function addDistrictPlazaProps(THREE, scene, assetManager, state, spawnX, spawnZ, objaverseIndexReady) {
    if (!assetManager) return;
    const ready = await assetManager.ensureGltfLoader();
    if (!ready || (state && state.destroyed)) return;

    // Manifest fetch + shared-prop preload now lives in
    // loadObjaverseManifestAssets() (called once from mount()) - see the
    // comment in addRoadDetailProps() for why this used to be duplicated.
    const { byCategory, loadedByUrl, loadEntry } = await objaverseIndexReady;
    if (state && state.destroyed) return;

    let placementCount = 0;
    async function place(entry, position, rotationY = 0) {
      if (!entry) return;
      const asset = loadedByUrl.get(entry.url) || (typeof loadEntry === "function" ? await loadEntry(entry) : null);
      if (!asset || asset.fallback || !asset.scene) return;
      const instance = asset.scene.clone(true);
      instance.position.set(position[0], position[1] || 0, position[2]);
      instance.rotation.y = rotationY;
      scene.add(instance);
      placementCount += 1;
      if (placementCount % LIFE_SIM_PERFORMANCE.propYieldEvery === 0) await yieldToBrowser();
    }

    const plazaCategories = ["flowerpot", "statue", "bicycle", "mailbox", "umbrella"];
    const roundRobin = {};
    function nextEntry(category) {
      const list = byCategory[category];
      if (!list || !list.length) return null;
      roundRobin[category] = (roundRobin[category] || 0) + 1;
      return list[(roundRobin[category] - 1) % list.length];
    }

    function categoryForSlot(zone, slotIndex, genericCategory) {
      const themes = ZONE_THEME_CATEGORIES[zone.id];
      if (slotIndex === 0 && themes && themes.length && byCategory[themes[0]] && byCategory[themes[0]].length) {
        return themes[0];
      }
      return genericCategory;
    }

    let categoryCursor = 0;
    async function placeZoneProps(zone) {
      const propsPerZone = 3;
      for (let i = 0; i < propsPerZone; i += 1) {
        const genericCategory = plazaCategories[categoryCursor % plazaCategories.length];
        categoryCursor += 1;
        const category = categoryForSlot(zone, i, genericCategory);
        const angle = (i / propsPerZone) * Math.PI * 2 + zone.x * 0.37;
        const ringRadius = zone.radius * (1.3 + (i % 2) * 0.4);
        const px = zone.x + Math.cos(angle) * ringRadius;
        const pz = zone.z + Math.sin(angle) * ringRadius;
        await place(nextEntry(category), [px, 0, pz], angle);
      }
    }

    const zoneTiers = classifyByDistance(locationZones, spawnX, spawnZ, (zone) => [zone.x, zone.z], NEAR_TIER_RADIUS);
    for (const zone of zoneTiers.near) {
      if (state && state.destroyed) return;
      await placeZoneProps(zone);
    }
    await delayMs(LIFE_SIM_PERFORMANCE.farPropsDelayMs);
    for (const zone of zoneTiers.far) {
      if (state && state.destroyed) return;
      await placeZoneProps(zone);
    }
  }

  async function addSingaporeObjaverseReplacementProps(THREE, scene, assetManager, state, spawnX, spawnZ, objaverseIndexReady) {
    if (!assetManager) return;
    const ready = await assetManager.ensureGltfLoader();
    if (!ready || (state && state.destroyed)) return;

    const { byCategory, loadedByUrl, loadEntry } = await objaverseIndexReady;
    if (state && state.destroyed) return;

    const hiddenPlaceholderNames = new Set();
    const placementGroups = [
      {
        id: "town-centre-transit",
        maxFarDistance: 58,
        items: [
          { category: "lamppost", position: [-19.5, 0, 4.2], rotation: 0.1, replace: ["Street Light Pole", "Street Light Glow"] },
          { category: "lamppost", position: [-4.2, 0, 4.4], rotation: -0.2, replace: ["Street Light Pole", "Street Light Glow"] },
          { category: "bench", position: [-17.8, 0, -4.2], rotation: Math.PI / 2, replace: ["Bench Seat", "Bench Back"] },
          { category: "bench", position: [-7.2, 0, -7.6], rotation: Math.PI / 2, replace: ["Bench Seat", "Bench Back"] },
          { category: "trash_can", position: [-15.8, 0, -7.2], replace: ["Street Trash Bin"] },
          { category: "cone", position: [-13.4, 0, 6.4], rotation: 0.2 },
          { category: "cone", position: [-8.2, 0, 6.2], rotation: -0.1 },
          { category: "stop_sign", position: [-19.2, 0, 9.8], rotation: Math.PI * 0.5 }
        ]
      },
      {
        id: "hdb-neighbourhood-centre",
        maxFarDistance: 70,
        items: [
          { category: "mailbox", position: [-35.8, 0, 35.4], rotation: Math.PI * 0.5 },
          { category: "bench", position: [-29.4, 0, 39.4], rotation: Math.PI * 0.5, replace: ["Bench Seat", "Bench Back"] },
          { category: "bench", position: [-22.4, 0, 34.7], rotation: 0, replace: ["Bench Seat", "Bench Back"] },
          { category: "trash_can", position: [-42.8, 0, 30.7], replace: ["Street Trash Bin"] },
          { category: "bicycle", position: [-37.8, 0, 31.5], rotation: Math.PI * 0.7 },
          { category: "flowerpot", position: [-47.5, 0, 31.6] },
          { category: "flowerpot", position: [-33.2, 0, 31.3] }
        ]
      },
      {
        id: "main-street-active-frontage",
        maxFarDistance: 90,
        items: [
          { category: "shopping_cart", position: [12.5, 0, -35.4], rotation: -0.4 },
          { category: "shopping_cart", position: [79.2, 0, -35.9], rotation: 0.35 },
          { category: "trash_can", position: [-8.8, 0, -29.2], replace: ["Street Trash Bin"] },
          { category: "trash_can", position: [36.7, 0, -37.4], replace: ["Street Trash Bin"] },
          { category: "bench", position: [4.5, 0, -28.9], rotation: Math.PI / 2, replace: ["Bench Seat", "Bench Back"] },
          { category: "bench", position: [45.5, 0, -36.3], rotation: Math.PI / 2, replace: ["Bench Seat", "Bench Back"] },
          { category: "coffee_table", position: [-42.5, 0, -37.8], rotation: 0.2 },
          { category: "coffee_table", position: [78.5, 0, -41.8], rotation: -0.3 }
        ]
      },
      {
        id: "food-court-real-props",
        maxFarDistance: 68,
        items: [
          { category: "coffee_table", position: [14.8, 0, -94.5], rotation: 0.08, replace: ["Food Table", "Food Stool"] },
          { category: "coffee_table", position: [19.4, 0, -92.2], rotation: -0.12 },
          { category: "coffee_table", position: [25.6, 0, -95.2], rotation: 0.18 },
          { category: "bench", position: [16.8, 0, -90.5], rotation: Math.PI * 0.5 },
          { category: "bench", position: [27.5, 0, -91.1], rotation: Math.PI * 0.5 },
          { category: "lantern", position: [20.5, 2.35, -99.2], rotation: 0.2 },
          { category: "lantern", position: [25.8, 2.35, -99.2], rotation: -0.1 }
        ]
      },
      {
        id: "park-connector-active-mobility",
        maxFarDistance: 100,
        items: [
          { category: "bicycle", position: [8.2, 0, 36.1], rotation: Math.PI * 0.5 },
          { category: "bicycle", position: [33.7, 0, 38.5], rotation: Math.PI * 0.52 },
          { category: "bicycle", position: [67.2, 0, 37.2], rotation: Math.PI * 0.48 },
          { category: "bench", position: [18.5, 0, 42.8], rotation: Math.PI / 2, replace: ["Bench Seat", "Bench Back"] },
          { category: "bench", position: [54.5, 0, 42.8], rotation: Math.PI / 2, replace: ["Bench Seat", "Bench Back"] },
          { category: "trash_can", position: [31.5, 0, 43.2], replace: ["Street Trash Bin"] }
        ]
      },
      {
        id: "life-service-specific-props",
        maxFarDistance: 120,
        items: [
          { category: "wheelchair", position: [76.2, 0, -49.4], rotation: Math.PI * 0.1 },
          { category: "dumbbell", position: [-59.6, 0, 49.3], rotation: Math.PI * 0.25 },
          { category: "suitcase", position: [105.5, 0, -8.6], rotation: Math.PI * 0.08 },
          { category: "backpack", position: [-78.2, 0, -10.4], rotation: -0.35 },
          { category: "deck_chair", position: [71.8, 0, -84.8], rotation: Math.PI * 0.5 },
          { category: "lantern", position: [12.4, 0, -66.5], rotation: 0.2 },
          { category: "lantern", position: [24.6, 0, -17.5], rotation: -0.1 }
        ]
      }
    ];

    const roundRobin = {};
    function nextEntry(category) {
      const list = byCategory[category];
      if (!list || !list.length) return null;
      roundRobin[category] = (roundRobin[category] || 0) + 1;
      return list[(roundRobin[category] - 1) % list.length];
    }

    function hidePlaceholders(names) {
      if (!Array.isArray(names) || !names.length) return;
      names.forEach((name) => {
        if (hiddenPlaceholderNames.has(name)) return;
        let hidden = 0;
        scene.traverse((node) => {
          if (node && node.name === name) {
            node.visible = false;
            hidden += 1;
          }
        });
        if (hidden) hiddenPlaceholderNames.add(name);
      });
    }

    let placementCount = 0;
    async function place(item) {
      const entry = nextEntry(item.category);
      if (!entry) return false;
      const asset = loadedByUrl.get(entry.url) || (typeof loadEntry === "function" ? await loadEntry(entry) : null);
      if (!asset || asset.fallback || !asset.scene) return false;
      const instance = asset.scene.clone(true);
      instance.name = `Objaverse Singapore Replacement: ${item.category}`;
      instance.userData.lifeVerseObjaverseReplacement = {
        pass: "singapore-urban-props-v1",
        category: item.category,
        sourceUrl: entry.sourceUrl,
        license: entry.license
      };
      instance.position.set(item.position[0], item.position[1] || 0, item.position[2]);
      instance.rotation.y = Number(item.rotation || 0);
      scene.add(instance);
      hidePlaceholders(item.replace);
      placementCount += 1;
      if (placementCount % LIFE_SIM_PERFORMANCE.propYieldEvery === 0) await yieldToBrowser();
      return true;
    }

    const tiers = classifyByDistance(placementGroups, spawnX, spawnZ, (group) => {
      const first = group.items && group.items[0] && group.items[0].position;
      return first ? [first[0], first[2]] : [0, 0];
    }, NEAR_TIER_RADIUS);

    for (const group of tiers.near) {
      if (state && state.destroyed) return;
      for (const item of group.items) await place(item);
    }
    await delayMs(LIFE_SIM_PERFORMANCE.farPropsDelayMs);
    for (const group of tiers.far) {
      if (state && state.destroyed) return;
      const nearestItemDistance = Math.min(...group.items.map((item) => Math.hypot(item.position[0] - spawnX, item.position[2] - spawnZ)));
      if (nearestItemDistance > group.maxFarDistance) continue;
      for (const item of group.items) await place(item);
    }
  }

  function addHdbHome(THREE, scene, mat) {
    addBuildingCore(THREE, scene, "HDB Home Block A", [-27, 8, 19], [6, 16, 4.5], mat.hdb, mat, "hdb");
    addBuildingCore(THREE, scene, "HDB Home Block B", [-21, 6.3, 19.4], [5, 12.6, 4], mat.hdbAccent, mat, "hdb");
    addBox(THREE, scene, "Home Void Deck Community Space", [-24, 1.05, 15.8], [9, 2.1, 3.5], mat.hdbBalcony);
    addBox(THREE, scene, "Home Cozy Bedroom Floor", [-25.8, 0.2, 12.4], [4.4, 0.35, 3.2], mat.warmGround);
    addBox(THREE, scene, "Home Bed", [-27, 0.72, 12.1], [1.7, 0.45, 2.1], mat.curbWarm);
    addBox(THREE, scene, "Home Pillow", [-27, 1.05, 11.25], [1.35, 0.25, 0.42], mat.hdbBalcony);
    addBox(THREE, scene, "Home Study Desk", [-24.2, 0.75, 11.4], [1.4, 0.22, 0.68], mat.wood);
    addBox(THREE, scene, "Home Laptop", [-24.2, 1.02, 11.2], [0.74, 0.08, 0.42], mat.screen);
    addBox(THREE, scene, "Home Wardrobe", [-23.6, 1.3, 13.6], [0.8, 1.9, 0.42], mat.furniture);
    addBox(THREE, scene, "Home Kitchen Counter", [-26.8, 0.75, 13.95], [2.1, 0.55, 0.55], mat.furniture);
    addSignBoard(THREE, scene, "Home Sign", "HOME", [-26.5, 3.15, 14.1], mat.signGreen, 0xffffff);
    addFlowerBed(THREE, scene, [-28.5, 14.1], 4.2, mat);
  }

  // Realism pass: a ground-floor gym unit in a taller shophouse-scale block
  // (addBuildingCore's window grid on the upper floors) instead of a single
  // low candy-colored box, with an entrance canopy over the mirror-wall front.
  function addGym(THREE, scene, mat) {
    addBuildingCore(THREE, scene, "Gym Fitness Studio", [-9, 2.9, 22], [8, 5.8, 5.4], mat.gym, mat);
    addBox(THREE, scene, "Gym Roof", [-9, 6.05, 22], [8.7, 0.4, 6.1], mat.roofDark);
    addBox(THREE, scene, "Gym Mirror Wall", [-9, 2.25, 19.18], [6.1, 2.4, 0.14], mat.glass);
    addBox(THREE, scene, "Gym Entrance Canopy", [-9, 3.55, 19.7], [4.6, 0.14, 1.2], mat.roofDark, true);
    addCylinder(THREE, scene, "Gym Canopy Post", [-11.1, 1.75, 20.1], [0.08, 3.5, 8], mat.metal);
    addCylinder(THREE, scene, "Gym Canopy Post", [-6.9, 1.75, 20.1], [0.08, 3.5, 8], mat.metal);
    addTreadmill(THREE, scene, [-11.3, 19.9], mat);
    addTreadmill(THREE, scene, [-9.1, 19.9], mat);
    addBarbell(THREE, scene, [-6.5, 21.9], mat);
    addBox(THREE, scene, "Gym Yoga Mat", [-10.9, 0.22, 23.8], [1.4, 0.07, 2.0], mat.signGreen, true);
    addBox(THREE, scene, "Gym Locker Row", [-5.4, 1.4, 23.2], [0.7, 2.4, 3.2], mat.metal);
    addSignBoard(THREE, scene, "Gym Sign", "GYM", [-11.3, 3.85, 18.8], mat.signGold, 0x151515);
  }

  function addWorkTower(THREE, scene, mat) {
    addBuildingCore(THREE, scene, "Office Tower", [18, 10, 20], [8, 20, 5], mat.work, mat);
    addBox(THREE, scene, "Office Lobby Glass", [18, 1.8, 16.9], [9, 3.6, 2.2], mat.glass);
    addDeskComputer(THREE, scene, [15.5, 15.9], mat);
    addDeskComputer(THREE, scene, [18.0, 15.9], mat);
    addDeskComputer(THREE, scene, [20.5, 15.9], mat);
    addBox(THREE, scene, "Office Meeting Table", [18, 0.82, 13.8], [3.1, 0.28, 1.2], mat.wood);
    addBox(THREE, scene, "Office Coffee Counter", [21.9, 0.75, 15.0], [0.68, 0.65, 2.2], mat.furniture);
    addSignBoard(THREE, scene, "Office Sign", "OFFICE", [15.6, 4.15, 15.65], mat.signBlue, 0xffffff);
  }

  // Realism pass: a real hawker centre is a single-story, open-air structure
  // under a tall pitched/hip roof on columns (no walls) - not a walled box.
  // Tiled floor + column ring + ridged roof replace the flat colored slab.
  function addFoodCourt(THREE, scene, mat) {
    addBox(THREE, scene, "Food Court Tile Floor", [-21.5, 0.22, -15], [17, 0.44, 8.5], mat.sidewalk);
    addBox(THREE, scene, "Food Court Roof", [-21.5, 3.5, -15], [18, 0.3, 9.2], mat.roofDark);
    addBox(THREE, scene, "Food Court Roof Ridge", [-21.5, 3.9, -15], [4.2, 0.3, 9.4], mat.roofDark);
    [-28.5, -21.5, -14.5].forEach((x) => {
      addCylinder(THREE, scene, "Food Court Column", [x, 1.75, -19.1], [0.14, 3.5, 8], mat.metal);
      addCylinder(THREE, scene, "Food Court Column", [x, 1.75, -10.9], [0.14, 3.5, 8], mat.metal);
    });
    [-26, -23, -20, -17, -14].forEach((x, index) => addFoodStall(THREE, scene, [x, -18.6], ["NOODLES", "RICE", "SATAY", "LAKSA", "DRINKS"][index], mat));
    for (let x = -26; x <= -15; x += 4) {
      for (let z = -16.3; z <= -12.8; z += 2.8) addTableSet(THREE, scene, [x, z], mat);
    }
    addTray(THREE, scene, [-24, -13.2], mat);
    addTray(THREE, scene, [-20, -16.3], mat);
    addTray(THREE, scene, [-16, -14.5], mat);
    addSignBoard(THREE, scene, "Food Court Sign", "HAWKER CENTRE", [-29.3, 4.4, -19.7], mat.curbWarm, 0x111111);
  }

  // Orchard Road reference points (URA urban design guidelines, Wikipedia,
  // Wikivoyage): pedestrian-only sidewalks much wider than the rest of the
  // road network, a dense rain-tree canopy along the whole 2.5km stretch, and
  // a network of covered linkways connecting malls so shoppers barely touch
  // the street - hand-modelled from those descriptions, no map data involved.
  function addMall(THREE, scene, mat) {
    addBox(THREE, scene, "Mall Main Atrium", [18, 3.4, -15], [12, 6.8, 7], mat.mall);
    addBox(THREE, scene, "Mall Glass Front", [18, 3.1, -18.58], [9.5, 4.6, 0.16], mat.glass);
    addCylinder(THREE, scene, "Mall Round Atrium", [22.8, 3.4, -15], [2.1, 6.8, 24], mat.glass);
    addShopFront(THREE, scene, [13.4, -18.7], "FASHION", mat.signPurple || mat.mall, mat);
    addShopFront(THREE, scene, [18.0, -18.7], "CINEMA", mat.signBlue, mat);
    addShopFront(THREE, scene, [22.5, -18.7], "ATM", mat.signGreen, mat);
    addBox(THREE, scene, "Mall Plant Decor", [14.2, 0.5, -12.1], [0.75, 0.6, 0.75], mat.bush);
    addBox(THREE, scene, "Mall Hanging Banner", [18, 4.9, -18.75], [3.6, 1.1, 0.08], mat.poster);
    addSignBoard(THREE, scene, "Mall Sign", "MALL", [15.7, 5.85, -18.85], mat.signBlue, 0xffffff);

    // Pedestrian-only mall walk, deliberately much wider than the standard
    // ~1.6-1.8 unit sidewalks used everywhere else in the road network.
    addBox(THREE, scene, "Orchard Pedestrian Mall Walk", [18, 0.09, -20], [24, 0.14, 4.5], mat.sidewalk, true);

    // Covered linkway between two shopfronts, echoing the underpasses/linkways
    // that let shoppers move mall-to-mall without stepping onto the street.
    // Raised well above the 3rd-person camera's height range (~4.75-7.65
    // above the player) so walking underneath doesn't clip the camera into
    // the roof the way an early pass at y=3.8 did.
    addBox(THREE, scene, "Orchard Covered Linkway Roof", [15.7, 8, -18], [10, 0.3, 2.4], mat.roofDark);
    addCylinder(THREE, scene, "Orchard Linkway Pillar", [11, 4, -18.9], [0.18, 8, 8], mat.metal);
    addCylinder(THREE, scene, "Orchard Linkway Pillar", [20.4, 4, -18.9], [0.18, 8, 8], mat.metal);

    // Large outdoor screen/billboard, larger than the standard addSignBoard
    // size - Orchard Road's malls lean on big illuminated display facades.
    addBox(THREE, scene, "Orchard Giant Screen Frame", [29, 5.6, -18.62], [5.2, 3.7, 0.1], mat.roofDark);
    addBox(THREE, scene, "Orchard Giant Screen", [29, 5.6, -18.5], [4.8, 3.3, 0.14], mat.screen);
  }

  function addPark(THREE, scene, mat) {
    addPlane(THREE, scene, "Park Lawn", [2, 0.02, -23], [18, 13], mat.park);
    addPath(THREE, scene, [-6, -23], [10, -20], 1.05, mat.path);
    addCylinder(THREE, scene, "Park Pond", [3, 0.08, -25.6], [2.2, 0.08, 28], mat.water);
    addBench(THREE, scene, [-3, -24.8], mat);
    addBench(THREE, scene, [7, -19.2], mat);
    addFlowerBed(THREE, scene, [-4, -19.4], 5.1, mat);
    addDecorativeRock(THREE, scene, [6.3, -26.2], mat);
    addBirds(THREE, scene, [0, 4.2, -23], mat);
    // Small tropical-park pavilion (gazebo) - a common real feature that
    // reads better than an open lawn with just a sign and a bench.
    addCylinder(THREE, scene, "Park Pavilion Roof", [9, 2.7, -25], [2.4, 0.2, 6], mat.roofDark);
    [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(([dx, dz]) => {
      addCylinder(THREE, scene, "Park Pavilion Post", [9 + dx, 1.15, -25 + dz], [0.08, 2.3, 8], mat.wood);
    });
    addSignBoard(THREE, scene, "Park Sign", "PARK", [-1.3, 0.85, -29.4], mat.curbWarm, 0x111111);
  }

  function addLibrary(THREE, scene, mat) {
    addBox(THREE, scene, "Library Reading Hall", [-25, 2.1, 2], [8.5, 4.2, 5.8], mat.library);
    addBox(THREE, scene, "Library Roof", [-25, 4.5, 2], [9.2, 0.42, 6.4], mat.roofDark);
    addBox(THREE, scene, "Library Quiet Glass", [-25, 2.25, -1.02], [6.6, 2.4, 0.12], mat.glass);
    [-28, -25, -22].forEach((x) => addBookshelf(THREE, scene, [x, 3.9], mat));
    addDeskComputer(THREE, scene, [-26.7, -0.5], mat);
    addBox(THREE, scene, "Library Study Table", [-23.3, 0.7, -0.45], [2.4, 0.2, 0.9], mat.wood);
    addSignBoard(THREE, scene, "Library Sign", "LIBRARY", [-28.6, 3.55, -1.25], mat.signBlue, 0xffffff);
  }

  // Realism pass: modern Singapore hospitals read as tall white/glass blocks
  // with a covered porte-cochere drop-off at the entrance - added a taller
  // upper wing (addBuildingCore) and a canopy instead of one flat box.
  function addHospital(THREE, scene, mat) {
    addBox(THREE, scene, "Hospital Clean Main Wing", [30, 3.2, 12], [9, 6.4, 6], mat.hospital);
    addBuildingCore(THREE, scene, "Hospital Ward Tower", [30, 9.5, 14], [7, 8, 4.5], mat.hospital, mat);
    addBox(THREE, scene, "Hospital Blue Entrance", [30, 1.6, 8.72], [5.8, 3.2, 0.35], mat.hospitalAccent);
    addBox(THREE, scene, "Hospital Drop Off Canopy", [30, 3.5, 7.4], [7.4, 0.16, 2.4], mat.hospitalAccent, true);
    addCylinder(THREE, scene, "Hospital Canopy Post", [27, 1.75, 6.6], [0.1, 3.5, 8], mat.metal);
    addCylinder(THREE, scene, "Hospital Canopy Post", [33, 1.75, 6.6], [0.1, 3.5, 8], mat.metal);
    addBox(THREE, scene, "Hospital Reception Desk", [27.6, 0.75, 8.1], [2.4, 0.65, 0.45], mat.furniture);
    addWaitingChairs(THREE, scene, [31.4, 8.4], mat);
    addBox(THREE, scene, "Hospital Doctor Room Door", [33.4, 1.2, 10.2], [0.16, 2.1, 1.0], mat.signBlue);
    addSignBoard(THREE, scene, "Hospital Cross Sign", "+ HOSPITAL", [27.1, 4.6, 8.36], mat.hospitalAccent, 0xffffff);
  }

  // Realism pass: ground-floor cafe of a small 2-story shophouse (upper
  // windows via addBuildingCore) instead of a single flat box, with the
  // canvas awning shading an outdoor seating area.
  function addCafe(THREE, scene, mat) {
    addBuildingCore(THREE, scene, "Cafe Cozy Shop", [-9, 2.6, -25.5], [7.2, 5.2, 4.5], mat.cafe, mat, "shophouse");
    addBox(THREE, scene, "Cafe Roof", [-9, 5.35, -25.5], [7.6, 0.3, 4.9], mat.roofDark);
    addBox(THREE, scene, "Cafe Awning", [-9, 3.72, -27.95], [7.9, 0.35, 1.0], mat.signGold);
    addBox(THREE, scene, "Cafe Counter", [-11.2, 0.82, -27.15], [2.5, 0.72, 0.55], mat.wood);
    addTableSet(THREE, scene, [-8.4, -29.2], mat);
    addTableSet(THREE, scene, [-5.7, -26.1], mat);
    addBox(THREE, scene, "Cafe Laptop User Table", [-10.9, 0.72, -24.2], [1.7, 0.18, 0.72], mat.wood);
    addBox(THREE, scene, "Cafe Laptop Screen", [-10.9, 1.0, -24.45], [0.72, 0.08, 0.42], mat.screen);
    addSignBoard(THREE, scene, "Cafe Sign", "CAFE", [-11.25, 3.65, -28.25], mat.curbWarm, 0x111111);
  }

  function addBeach(THREE, scene, mat) {
    addBox(THREE, scene, "Beach Boardwalk", [22, 0.16, -29.2], [12, 0.18, 1.4], mat.wood, true);
    addUmbrella(THREE, scene, [18, -31.4], mat.signGold, mat);
    addUmbrella(THREE, scene, [25, -30.6], mat.signBlue, mat);
    addBench(THREE, scene, [21.3, -28.1], mat);
    addDecorativeRock(THREE, scene, [29.8, -30.4], mat);
    addCylinder(THREE, scene, "Beach Life Ring", [16.9, 1.0, -29.0], [0.45, 0.1, 24], mat.mrt, Math.PI / 2);
    // Small Sentosa-style thatch-roof drinks kiosk beside the boardwalk.
    addBox(THREE, scene, "Beach Kiosk Counter", [27.4, 0.7, -28.5], [1.8, 1.1, 1.0], mat.wood);
    addCylinder(THREE, scene, "Beach Kiosk Roof", [27.4, 1.7, -28.5], [1.4, 0.6, 4], mat.signGold);
    addSignBoard(THREE, scene, "Beach Sign", "BEACH", [21.2, 0.95, -33.0], mat.curbWarm, 0x111111);
  }

  // Realism pass: a modern glass-heavy terminal massing (a low, wide glass
  // curtain wall grid + a floating overhang) closer to Changi's look than a
  // single flat-colored box with one glass strip.
  function addAirport(THREE, scene, mat) {
    addBox(THREE, scene, "Airport Terminal", [35, 2.5, -1], [8.8, 5.0, 7.2], mat.airport);
    addBox(THREE, scene, "Airport Glass Departures", [35, 2.45, -4.78], [7.0, 2.9, 0.18], mat.glass);
    for (let x = 31.5; x <= 38.5; x += 1.75) {
      addBox(THREE, scene, "Airport Facade Mullion", [x, 2.45, -4.7], [0.08, 3.0, 0.1], mat.metal, true);
    }
    addBox(THREE, scene, "Airport Terminal Overhang", [35, 5.15, -4.9], [9.6, 0.18, 2.2], mat.roofDark, true);
    addBoxRotated(THREE, scene, "Airport Runway", [35, 0.05, -9.2], [14.5, 0.08, 3.2], mat.road, 0.1, true);
    for (let x = 30; x <= 40; x += 2.5) addBox(THREE, scene, "Airport Runway Marking", [x, 0.13, -9.2], [1.1, 0.04, 0.18], mat.curb, true);
    addWaitingChairs(THREE, scene, [32.2, -4.9], mat);
    addBox(THREE, scene, "Airport Luggage Cart", [37.5, 0.55, -5.2], [1.1, 0.55, 0.7], mat.metal);
    addBox(THREE, scene, "Airport Control Tower", [40.2, 3.2, 2.6], [1.6, 6.4, 1.6], mat.airportAccent);
    addBox(THREE, scene, "Airport Tower Glass", [40.2, 6.6, 2.6], [2.2, 1.1, 2.2], mat.glass);
    addSignBoard(THREE, scene, "Airport Sign", "AIRPORT", [31.7, 4.4, -5.05], mat.signBlue, 0xffffff);
  }

  // Realism pass: raised platform on support columns (Singapore's elevated
  // MRT stations sit above street level) plus glass windscreens along the
  // platform edge, instead of a slab sitting flush on the ground.
  function addTrainStation(THREE, scene, mat) {
    addBox(THREE, scene, "Train Station Platform", [4, 0.32, -3.5], [8.8, 0.64, 4.8], mat.mrt);
    [-2, 2, 6, 10].forEach((x) => {
      addCylinder(THREE, scene, "Train Station Support", [x, -0.2, -3.5], [0.16, 0.9, 8], mat.metal);
    });
    addBox(THREE, scene, "Train Station Roof", [4, 2.35, -3.5], [9.8, 0.45, 5.6], mat.roofDark);
    addBox(THREE, scene, "Train Platform Windscreen", [4, 1.35, -1.35], [8.6, 1.6, 0.06], mat.glass);
    addBox(THREE, scene, "Train Ticket Gates", [1.4, 0.82, -5.6], [3.2, 0.65, 0.52], mat.metal);
    addBox(THREE, scene, "Train Ticket Machine", [6.8, 1.0, -5.5], [0.8, 1.7, 0.55], mat.signBlue);
    addBox(THREE, scene, "Train Route Board", [4, 2.0, -6.0], [4.4, 1.1, 0.12], mat.screen);
    addCylinder(THREE, scene, "Train Rail Left", [4, 0.2, -1.35], [0.06, 8.6, 12], mat.rail, Math.PI / 2);
    addCylinder(THREE, scene, "Train Rail Right", [4, 0.2, -0.68], [0.06, 8.6, 12], mat.rail, Math.PI / 2);
    addSignBoard(THREE, scene, "Train Station Sign", "MRT", [2.25, 2.7, -6.35], mat.mrt, 0xffffff);
  }

  function addUniversity(THREE, scene, mat) {
    addBox(THREE, scene, "University Main Hall", [-34, 2.9, -7], [9.5, 5.8, 6], mat.university);
    addBox(THREE, scene, "University Lecture Roof", [-34, 6.02, -7], [10.3, 0.42, 6.8], mat.roofDark);
    addBox(THREE, scene, "University Entrance Columns", [-37.8, 1.35, -10.25], [0.4, 2.7, 0.4], mat.curbWarm);
    addBox(THREE, scene, "University Entrance Columns", [-30.2, 1.35, -10.25], [0.4, 2.7, 0.4], mat.curbWarm);
    addBox(THREE, scene, "University Lecture Seats", [-35.6, 0.58, -10.7], [3.8, 0.4, 0.5], mat.furniture);
    addBox(THREE, scene, "University Student Cafe Counter", [-30.6, 0.78, -6.2], [0.65, 0.65, 2.0], mat.cafe);
    addBookshelf(THREE, scene, [-37.4, -4.4], mat);
    addText(THREE, scene, "UNI", [-35.2, 4.6, -10.55], 0.72, 0x111111);
    addSignBoard(THREE, scene, "University Sign", "UNIVERSITY", [-38.2, 3.6, -10.48], mat.curbWarm, 0x111111);
  }

  // Realism pass (proof-of-concept zone): a terrace of conservation-style
  // shophouses in varied real Chinatown restoration colors (dusty rose,
  // ochre, teal, cream) under a shared "five-foot way" colonnade, instead of
  // two isolated candy-colored boxes. Paifang gate keeps its vivid red/gold -
  // that IS the real color of Chinatown's gate, not a stylization to mute.
  function addChinatown(THREE, scene, mat) {
    addPlane(THREE, scene, "Chinatown Street Floor", [-12.5, 0.02, -14], [19, 10], mat.curbWarm);

    // Layout pass: widened from 4-unit to 5.5-unit spacing - the whole-map
    // overlap audit (auditSceneLayout()) found the real swapped-in GLBs
    // (loadDistrictAssetSamples() below) overlapping their immediate
    // neighbors at the old spacing, since those real models are wider than
    // the 3.6-unit primitive placeholders they replace.
    // Shifted 2 more units west (on top of the 5.5-unit widening) - Cream
    // (the east end) sits right against ArtScience Museum's territory in
    // the neighboring marina-bay zone, and pulling Cream back alone just
    // squeezed it into Teal instead. Shifting the whole row preserves the
    // internal 5.5-unit spacing while clearing both neighbors.
    const shophouses = [
      { name: "Chinatown Shophouse Rose", x: -20, height: 6.6, color: mat.gym },
      { name: "Chinatown Shophouse Ochre", x: -14.5, height: 7.0, color: mat.signGold },
      { name: "Chinatown Shophouse Teal", x: -9, height: 6.4, color: mat.hospitalAccent },
      { name: "Chinatown Shophouse Cream", x: -3.5, height: 6.8, color: mat.hdb }
    ];
    shophouses.forEach((house) => {
      // addBuildingCore's window/balcony grid faces -z (the back of this row,
      // away from the street) - the north-facing side visible from the
      // arcade/gate needs its own shopfront glass + signage band, recessed
      // under the five-foot way overhang, since that's the side pedestrians
      // (and the camera) actually see.
      addBuildingCore(THREE, scene, house.name, [house.x, house.height / 2, -18], [3.6, house.height, 4.2], house.color, mat, "shophouse");
      addBox(THREE, scene, `${house.name} Roof`, [house.x, house.height + 0.35, -18], [4.0, 0.5, 4.6], mat.roofDark);
      addBox(THREE, scene, `${house.name} Cornice`, [house.x, house.height + 0.05, -18], [3.9, 0.14, 4.3], mat.hdb);
      addBox(THREE, scene, `${house.name} Shopfront Glass`, [house.x, 1.35, -15.75], [3.0, 2.1, 0.1], mat.glass);
      addBox(THREE, scene, `${house.name} Shopfront Sign`, [house.x, 2.65, -15.75], [3.0, 0.5, 0.12], mat.mrt);
    });

    // Five-foot way: the covered pedestrian arcade running the length of the row.
    addBox(THREE, scene, "Chinatown Five Foot Way Roof", [-10.2, 3.1, -16.1], [15.6, 0.16, 2.0], mat.roofDark, true);
    for (let i = 0; i < 6; i++) {
      addCylinder(THREE, scene, "Chinatown Arcade Column", [-17.6 + i * 3.0, 1.5, -15.2], [0.14, 3.0, 8], mat.hdb);
    }
    for (let i = 0; i < 5; i++) {
      addCylinder(THREE, scene, "Chinatown Lantern", [-17 + i * 3.0, 2.7, -15.6], [0.22, 0.32, 8], mat.mrt);
    }

    addBox(THREE, scene, "Chinatown Gate Pillar", [-12.5, 4, -10.4], [0.5, 8, 0.5], mat.mrt);
    addBox(THREE, scene, "Chinatown Gate Pillar", [-7.5, 4, -10.4], [0.5, 8, 0.5], mat.mrt);
    addBox(THREE, scene, "Chinatown Gate Beam", [-10, 8, -10.4], [5.6, 0.5, 0.5], mat.signGold);
    addBox(THREE, scene, "Chinatown Gate Roof", [-10, 8.4, -10.4], [6.2, 0.28, 0.9], mat.roofDark);
    addFlowerBed(THREE, scene, [-16.6, -12.8], 3.2, mat);
    addSignBoard(THREE, scene, "Chinatown Sign", "CHINATOWN", [-17, 4.2, -19.6], mat.mrt, 0xffffff);
  }

  // Realism pass, matching the Chinatown treatment: a terrace of shophouses
  // under a shared five-foot way arcade (the colorful facades are authentic -
  // Little India's shophouses really are painted in saturated blue/saffron/
  // magenta), plus the Sri Veeramakaliamman-style temple kept at the far end.
  function addLittleIndia(THREE, scene, mat) {
    addPlane(THREE, scene, "Little India Street Floor", [10.25, 0.02, 14], [19, 10], mat.curbWarm);

    // Layout pass: widened from 4-unit to 5.5-unit spacing, same fix and
    // same reason as Chinatown's row above - the audit found the real
    // swapped-in GLBs overlapping their neighbors at the old spacing.
    const shophouses = [
      { name: "Little India Shophouse Blue", x: 2, height: 6.6, color: mat.hdbAccent },
      { name: "Little India Shophouse Saffron", x: 7.5, height: 7.0, color: mat.signGold },
      { name: "Little India Shophouse Magenta", x: 13, height: 6.4, color: mat.mall },
      { name: "Little India Shophouse Cream", x: 18.5, height: 6.8, color: mat.hdb }
    ];
    shophouses.forEach((house) => {
      addBuildingCore(THREE, scene, house.name, [house.x, house.height / 2, 9], [3.6, house.height, 4.2], house.color, mat, "shophouse");
      addBox(THREE, scene, `${house.name} Roof`, [house.x, house.height + 0.35, 9], [4.0, 0.5, 4.6], mat.roofDark);
      addBox(THREE, scene, `${house.name} Cornice`, [house.x, house.height + 0.05, 9], [3.9, 0.14, 4.3], mat.hdbAccent);
      addBox(THREE, scene, `${house.name} Shopfront Glass`, [house.x, 1.35, 11.25], [3.0, 2.1, 0.1], mat.glass);
      addBox(THREE, scene, `${house.name} Shopfront Sign`, [house.x, 2.65, 11.25], [3.0, 0.5, 0.12], mat.signGold);
    });

    addBox(THREE, scene, "Little India Five Foot Way Roof", [9.8, 3.1, 10.9], [15.6, 0.16, 2.0], mat.roofDark, true);
    for (let i = 0; i < 6; i++) {
      addCylinder(THREE, scene, "Little India Arcade Column", [2.4 + i * 3.0, 1.5, 11.8], [0.14, 3.0, 8], mat.hdb);
    }

    // Sri Veeramakaliamman-style temple: was a single gold box + a red
    // cylinder dropped on top, which reads as two random floating primitives,
    // not a temple (user feedback: "what is this"). A gopuram's actual
    // silhouette is a tapering stack of tiers - swapping to 4 narrowing tiers
    // plus a spire and finial reads as a temple tower from primitives alone,
    // no model needed.
    addBox(THREE, scene, "Little India Temple Base", [10, 1.1, 17.3], [3.8, 2.2, 3.6], mat.templeBase);
    addBox(THREE, scene, "Little India Temple Tier 2", [10, 3.05, 17.3], [3.1, 1.7, 2.9], mat.templeAccent);
    addBox(THREE, scene, "Little India Temple Tier 3", [10, 4.55, 17.3], [2.4, 1.3, 2.2], mat.templeBase);
    addBox(THREE, scene, "Little India Temple Tier 4", [10, 5.75, 17.3], [1.7, 0.9, 1.5], mat.templeAccent);
    addCylinder(THREE, scene, "Little India Temple Spire", [10, 6.85, 17.3], [0.55, 1.1, 8], mat.templeSpire);
    addBox(THREE, scene, "Little India Temple Finial", [10, 7.55, 17.3], [0.4, 0.4, 0.4], mat.templeBase);

    // Filled in some of the open plaza in front of the arcade/temple - the
    // layout audit's screenshots (and user feedback: "很多空白", a lot of
    // blank space) showed a lot of bare ground between the shophouse row and
    // the temple with nothing placed on it.
    addFlowerBed(THREE, scene, [3.4, 9.2], 3.2, mat);
    addFlowerBed(THREE, scene, [10, 13.5], 2.6, mat);
    addFlowerBed(THREE, scene, [16, 15], 2.4, mat);
    addBox(THREE, scene, "Little India Market Stall", [5.5, 0.9, 16], [2.2, 1.2, 0.9], mat.curbWarm);
    addBox(THREE, scene, "Little India Market Awning", [5.5, 1.9, 15.4], [2.6, 0.16, 1.4], mat.flowerYellow);
    addBox(THREE, scene, "Little India Market Stall 2", [14.5, 0.9, 16], [2.2, 1.2, 0.9], mat.curbWarm);
    addBox(THREE, scene, "Little India Market Awning 2", [14.5, 1.9, 15.4], [2.6, 0.16, 1.4], mat.flowerPurple);
    addSignBoard(THREE, scene, "Little India Sign", "LITTLE INDIA", [3, 4.6, 8.2], mat.hdbAccent, 0x160018);
  }

  // Realism pass: real Bugis mixes a modern glass mall (Bugis Junction) with
  // a row of restored heritage shophouses (Bugis Street) - added two
  // shophouses beside the market stalls instead of just the one mall block.
  function addBugis(THREE, scene, mat) {
    addPlane(THREE, scene, "Bugis Street Floor", [24, 0.02, 2], [14, 10], mat.sidewalk);
    addBuildingCore(THREE, scene, "Bugis Junction Building", [28, 4.4, -1], [6, 8.8, 5], mat.mall, mat);
    addBox(THREE, scene, "Bugis Junction Glass Front", [28, 3.2, 1.6], [5.4, 4.2, 0.16], mat.glass);
    addBuildingCore(THREE, scene, "Bugis Heritage Shophouse A", [18, 3.4, -3], [4, 6.8, 4], mat.gym, mat, "shophouse");
    addBox(THREE, scene, "Bugis Heritage Shophouse A Roof", [18, 7.0, -3], [4.4, 0.4, 4.4], mat.roofDark);
    addBuildingCore(THREE, scene, "Bugis Heritage Shophouse B", [23.2, 3.0, -3], [3.6, 6.0, 3.8], mat.signGold, mat, "shophouse");
    addBox(THREE, scene, "Bugis Heritage Shophouse B Roof", [23.2, 6.2, -3], [4.0, 0.4, 4.2], mat.roofDark);
    addBox(THREE, scene, "Bugis Market Stall", [19.5, 0.9, 4], [2.4, 1.2, 0.9], mat.curbWarm);
    addBox(THREE, scene, "Bugis Market Stall", [21.5, 0.9, 4], [2.4, 1.2, 0.9], mat.curbWarm);
    addBox(THREE, scene, "Bugis Market Awning", [20.5, 1.9, 3.4], [5.4, 0.16, 1.6], mat.signBlue);
    addSignBoard(THREE, scene, "Bugis Sign", "BUGIS", [30.6, 4.4, 5.2], mat.signBlue, 0xffffff);
  }

  // Raffles Place - Singapore's historic CBD/financial district. No free CC0
  // model matches the real UOB Plaza/OCBC Centre/Republic Plaza silhouettes,
  // so the 4 towers are hand-built with the same curtain-wall facade
  // technique as addMarinaBayLandmark(), just taller - Raffles Place's real
  // towers (Republic Plaza, UOB Plaza) are in fact taller than Marina Bay
  // Sands, which this district's height (up to 32 units, vs. Marina Bay's
  // 22) reflects. Two of Marina Bay's own generic background skyscraper
  // GLBs are reused here for extra density in loadDistrictAssetSamples()
  // (that's the kit's intended reuse, not a placeholder). This function uses
  // absolute world coordinates directly (matching its zone position, no
  // ZONE_DELTA entry) since it's a brand-new district, same as
  // chinatown/little-india/bugis when they were first added.
  function addRafflesPlace(THREE, scene, mat) {
    const baseX = 78;
    const baseZ = -24;

    addPlane(THREE, scene, "Raffles Place Plaza", [baseX, 0.02, baseZ], [22, 18], mat.sidewalk);

    [
      { name: "Raffles Place Tower A", offsetX: -6, offsetZ: -4, width: 5, height: 26, depth: 5 },
      { name: "Raffles Place Tower B", offsetX: 2, offsetZ: -6, width: 4.2, height: 32, depth: 4.2 },
      { name: "Raffles Place Tower C", offsetX: 7, offsetZ: -2, width: 4.6, height: 22, depth: 4.6 },
      { name: "Raffles Place Tower D", offsetX: -1, offsetZ: 3, width: 5.4, height: 18, depth: 5.4 }
    ].forEach((tower) => {
      addBuildingCore(
        THREE, scene, tower.name,
        [baseX + tower.offsetX, tower.height / 2, baseZ + tower.offsetZ],
        [tower.width, tower.height, tower.depth],
        mat.work, mat, "modern"
      );
    });

    addBox(THREE, scene, "Raffles Place MRT Canopy", [baseX - 2, 1.6, baseZ + 7], [6, 0.3, 4], mat.roofDark);
    addCylinder(THREE, scene, "Raffles Place MRT Pillar", [baseX - 4.4, 0.8, baseZ + 5.4], [0.16, 1.6, 8], mat.metal);
    addCylinder(THREE, scene, "Raffles Place MRT Pillar", [baseX + 0.4, 0.8, baseZ + 5.4], [0.16, 1.6, 8], mat.metal);
    addSignBoard(THREE, scene, "Raffles Place MRT Sign", "RAFFLES PLACE MRT", [baseX - 4.6, 1.9, baseZ + 8.6], mat.signBlue, 0xffffff);

    addSignBoard(THREE, scene, "Raffles Place Sign", "RAFFLES PLACE", [baseX - 8, 3.4, baseZ - 8], mat.signGold, 0x151515);

    addBench(THREE, scene, [baseX + 4, baseZ + 6], mat);
    addBench(THREE, scene, [baseX - 8, baseZ + 4], mat);
    addTree(THREE, scene, [baseX - 9, baseZ + 6], mat);
    addTree(THREE, scene, [baseX + 8, baseZ + 7], mat);
  }

  // Clarke Quay/Boat Quay - the historic riverside F&B/nightlife strip, a
  // short walk north of Raffles Place along the Singapore River. No CC0
  // model matches these specific conserved shophouse facades, so this reuses
  // the same shophouse-row treatment as addChinatown()/addLittleIndia()
  // (own building, roof, cornice, shopfront glass, sign), recoloured for a
  // nightlife strip, plus the district's two defining real features: the
  // river itself and the colourful outdoor-dining umbrellas Clarke Quay is
  // known for (Boat Quay's actual bumboats now run dinner cruises here).
  function addClarkeQuay(THREE, scene, mat) {
    const baseX = 78;
    const baseZ = 5;

    addPlane(THREE, scene, "Singapore River", [baseX, 0.01, baseZ + 5], [26, 6], mat.water);
    addPlane(THREE, scene, "Clarke Quay Promenade", [baseX, 0.02, baseZ - 1], [26, 7], mat.sidewalk);

    const shophouses = [
      { name: "Clarke Quay Restaurant Rouge", x: baseX - 9, height: 6.2, color: mat.gym },
      { name: "Clarke Quay Bar Teal", x: baseX - 4.5, height: 6.6, color: mat.hospitalAccent },
      { name: "Clarke Quay Bar Magenta", x: baseX, height: 6.0, color: mat.mall },
      { name: "Clarke Quay Restaurant Amber", x: baseX + 4.5, height: 6.4, color: mat.signGold }
    ];
    shophouses.forEach((house) => {
      addBuildingCore(THREE, scene, house.name, [house.x, house.height / 2, baseZ - 6], [3.6, house.height, 4], house.color, mat, "shophouse");
      addBox(THREE, scene, `${house.name} Roof`, [house.x, house.height + 0.3, baseZ - 6], [4.0, 0.4, 4.4], mat.roofDark);
      addBox(THREE, scene, `${house.name} Shopfront Glass`, [house.x, 1.35, baseZ - 3.8], [3.0, 2.1, 0.1], mat.glass);
    });

    // Outdoor dining umbrellas along the promenade, facing the river.
    [-7, -2, 3, 7.5].forEach((offsetX, index) => {
      const colors = [mat.food, mat.signBlue, mat.gym, mat.hospitalAccent];
      addCylinder(THREE, scene, "Clarke Quay Umbrella Pole", [baseX + offsetX, 1.1, baseZ + 1.5], [0.06, 2.2, 8], mat.metal);
      addCylinder(THREE, scene, "Clarke Quay Umbrella Canopy", [baseX + offsetX, 2.3, baseZ + 1.5], [1.3, 0.2, 10], colors[index]);
    });

    // A colourful bumboat on the river - the traditional Singapore River
    // ferry, now a dinner-cruise/tourist boat.
    addBox(THREE, scene, "Clarke Quay Bumboat Hull", [baseX + 10, 0.32, baseZ + 5], [3.4, 0.55, 1.4], mat.signBlue);
    addBox(THREE, scene, "Clarke Quay Bumboat Cabin", [baseX + 10, 0.85, baseZ + 5], [1.6, 0.5, 1.1], mat.signGold);

    addBench(THREE, scene, [baseX - 10, baseZ - 3], mat);
    addBench(THREE, scene, [baseX + 9, baseZ - 3], mat);
    addTree(THREE, scene, [baseX - 12, baseZ - 3.5], mat);
    addTree(THREE, scene, [baseX + 11, baseZ - 3.5], mat);
    addSignBoard(THREE, scene, "Clarke Quay Sign", "CLARKE QUAY", [baseX - 11, 3.8, baseZ - 8.5], mat.signGold, 0x151515);
  }

  // HDB Hub (Toa Payoh) - Singapore's real public-housing/government-
  // services headquarters, known for its cylindrical drum-shaped tower - a
  // genuinely distinctive silhouette, unlike the rectangular office towers
  // everywhere else on the map. Hand-built the same way as the ArtScience
  // Museum nod (addArtScienceMuseum): no CC0 model matches this specific
  // real building. Unlike every other new district this session, this one
  // comes with its own gameplay, not just scenery - filing taxes, checking
  // CPF, and applying for a BTO flat are real "adulting" tasks with their
  // own lifeSimActivities["hdb-hub"] entries in app.js, the kind of
  // bureaucratic life-admin the rest of the map doesn't cover yet.
  function addHdbHub(THREE, scene, mat) {
    const baseX = 32;
    const baseZ = 46;

    addPlane(THREE, scene, "HDB Hub Plaza", [baseX, 0.02, baseZ - 5], [16, 10], mat.sidewalk);

    addCylinder(THREE, scene, "HDB Hub Podium", [baseX, 2, baseZ], [7, 4, 24], mat.hdb);
    addCylinder(THREE, scene, "HDB Hub Tower", [baseX, 15, baseZ], [4.6, 22, 24], mat.hdbAccent);
    addCylinder(THREE, scene, "HDB Hub Roof Cap", [baseX, 26.2, baseZ], [4.8, 0.4, 24], mat.roofDark);
    // Floor-line banding for visible detail on the drum tower, instead of a
    // flat single-tone cylinder.
    for (let i = 0; i < 6; i++) {
      addCylinder(THREE, scene, "HDB Hub Floor Band", [baseX, 6 + i * 3.4, baseZ], [4.65, 0.2, 24], mat.roofDark);
    }

    addBox(THREE, scene, "HDB Hub Entrance Canopy", [baseX, 4.4, baseZ - 6], [8, 0.3, 3], mat.roofDark);
    addCylinder(THREE, scene, "HDB Hub Flagpole", [baseX - 6, 3, baseZ - 7], [0.08, 6, 8], mat.metal);
    addBox(THREE, scene, "HDB Hub Flag", [baseX - 5.6, 5.4, baseZ - 7], [0.8, 0.5, 0.05], mat.signGold);

    addSignBoard(THREE, scene, "HDB Hub Sign", "HDB HUB", [baseX - 7, 4.6, baseZ - 8.6], mat.signBlue, 0xffffff);
    addBench(THREE, scene, [baseX - 5, baseZ - 2], mat);
    addBench(THREE, scene, [baseX + 5, baseZ - 2], mat);
    addTree(THREE, scene, [baseX - 7, baseZ - 3], mat);
    addTree(THREE, scene, [baseX + 7, baseZ - 3], mat);
  }

  // Woodlands - modelled from public descriptions (Wikipedia, HDB Town
  // Design Guide, URA Woodlands Regional Centre page), not map data: the
  // real town is built around an MRT/bus interchange integrated with
  // Causeway Point (one of Singapore's largest malls), surrounded by the
  // Woodlands/Admiralty/Marsiling HDB estates, with the Woodlands Checkpoint
  // (the land border crossing to Malaysia) at its northern edge.
  function addWoodlands(THREE, scene, mat) {
    const baseX = 0;
    const baseZ = 50;

    // Integrated transport hub (MRT + bus interchange)
    addBox(THREE, scene, "Woodlands Interchange Platform", [baseX, 0.32, baseZ], [10, 0.64, 6], mat.mrt);
    addBox(THREE, scene, "Woodlands Interchange Roof", [baseX, 3.1, baseZ], [11, 0.45, 7], mat.roofDark);
    addCylinder(THREE, scene, "Woodlands Interchange Pillar", [baseX - 4, 1.5, baseZ - 2.5], [0.2, 3, 8], mat.metal);
    addCylinder(THREE, scene, "Woodlands Interchange Pillar", [baseX + 4, 1.5, baseZ - 2.5], [0.2, 3, 8], mat.metal);
    addCylinder(THREE, scene, "Woodlands Interchange Pillar", [baseX - 4, 1.5, baseZ + 2.5], [0.2, 3, 8], mat.metal);
    addCylinder(THREE, scene, "Woodlands Interchange Pillar", [baseX + 4, 1.5, baseZ + 2.5], [0.2, 3, 8], mat.metal);
    addSignBoard(THREE, scene, "Woodlands Interchange Sign", "WOODLANDS", [baseX - 4.5, 4.4, baseZ - 3.6], mat.signBlue, 0xffffff);

    // Causeway Point mall, right next to the interchange (as it is in reality).
    // The visible mall volume itself is swapped for a real modeled building in
    // loadDistrictAssetSamples() (Building_Large_2, positioned at [22,0,48]) -
    // these boxes stay only as the hidden placeholder loadDistrictAssetSamples
    // matches by name before the real asset finishes loading.
    addBox(THREE, scene, "Causeway Point Mall", [baseX + 12, 4.2, baseZ - 1], [10, 8.4, 8], mat.mall);
    addBox(THREE, scene, "Causeway Point Glass Front", [baseX + 12, 3.6, baseZ - 5.1], [8, 5.5, 0.18], mat.glass);
    addBox(THREE, scene, "Causeway Point Roof", [baseX + 12, 8.6, baseZ - 1], [10.8, 0.4, 8.8], mat.roofDark);
    addSignBoard(THREE, scene, "Causeway Point Sign", "CAUSEWAY POINT", [baseX + 11, 6.8, baseZ - 9], mat.signBlue, 0xffffff);

    // Woodlands/Admiralty/Marsiling HDB heartland cluster. Both blocks are
    // swapped for real modeled buildings in loadDistrictAssetSamples() (at
    // [-11,0,53] and [-27,0,47]) - these stay only as hidden placeholders.
    addBuildingCore(THREE, scene, "Woodlands HDB Block A", [baseX - 13, 9, baseZ + 3], [6, 18, 4.6], mat.hdb, mat, "hdb");
    addBuildingCore(THREE, scene, "Woodlands HDB Block B", [baseX - 19, 7.5, baseZ - 1], [5.2, 15, 4.2], mat.hdbAccent, mat, "hdb");
    addFlowerBed(THREE, scene, [baseX - 13, baseZ + 8], 4, mat);

    // Estate expansion: a real multi-block neighbourhood instead of just the
    // 2 blocks above - 12 more, laid out as a 3x4 grid south of the
    // interchange/mall (clear of the separate Home zone's own building
    // footprint further southwest). Swapped for real modelled buildings in
    // loadDistrictAssetSamples(), cycling through the same 3 Quaternius
    // Downtown City MegaKit files as the original 2 blocks/mall above.
    // Realistic-style pivot, layout pass: this grid used 7-unit spacing
    // against 5.4-unit primitive placeholders (a plausible 1.6-unit gap),
    // but the real swapped-in GLB models (loadDistrictAssetSamples() below)
    // are not scale-normalized to that footprint at all (scale: [1,1,1],
    // native GLB size) - the whole-map layout audit (auditSceneLayout())
    // found the real "Scene"-named replacements heavily overlapping each
    // other once swapped in, the single densest cluster of overlaps on the
    // map. Widened to 9-unit spacing and shifted south (away from Causeway
    // Point Mall/the Woodlands interchange, both near baseZ+0..-1) - verified
    // against the audit after this change.
    // Second widening pass: the first pass (9-unit spacing) was based on an
    // assumed model size before normalizeToHeight() was wired in for these
    // swaps - once the swapped GLBs were correctly measured at their real,
    // normalized ~10-12 unit footprint (not the original 20+ unit native
    // scale, but still bigger than 9-unit spacing allows), the audit still
    // showed residual overlap. 13-unit spacing, still shifted south clear of
    // Causeway Point Mall/the Woodlands interchange.
    const estateGrid = [
      { name: "Woodlands Estate Block C", x: -21, z: -36, color: mat.hdb },
      { name: "Woodlands Estate Block D", x: -8, z: -36, color: mat.hdbAccent },
      { name: "Woodlands Estate Block E", x: 5, z: -36, color: mat.hdb },
      { name: "Woodlands Estate Block F", x: 18, z: -36, color: mat.hdbAccent },
      { name: "Woodlands Estate Block G", x: -21, z: -23, color: mat.hdbAccent },
      { name: "Woodlands Estate Block H", x: -8, z: -23, color: mat.hdb },
      { name: "Woodlands Estate Block I", x: 5, z: -23, color: mat.hdbAccent },
      { name: "Woodlands Estate Block J", x: 18, z: -23, color: mat.hdb },
      { name: "Woodlands Estate Block K", x: -21, z: -14, color: mat.hdb },
      { name: "Woodlands Estate Block L", x: -8, z: -14, color: mat.hdbAccent },
      { name: "Woodlands Estate Block M", x: 5, z: -14, color: mat.hdb },
      { name: "Woodlands Estate Block N", x: 18, z: -14, color: mat.hdbAccent }
    ];
    estateGrid.forEach((block, index) => {
      const height = 14 + (index % 3) * 2.5;
      addBuildingCore(THREE, scene, block.name, [baseX + block.x, height / 2, baseZ + block.z], [5.4, height, 4.2], block.color, mat, "hdb");
    });
    addFlowerBed(THREE, scene, [baseX - 9, baseZ - 24], 5, mat);
    addTree(THREE, scene, [baseX - 18, baseZ - 16], mat);
    addTree(THREE, scene, [baseX + 8, baseZ - 16], mat);
    addTree(THREE, scene, [baseX - 18, baseZ - 3], mat);

    // Woodlands Waterfront / Admiralty Park green strip, plus a small
    // neighbourhood playground - the "has a park" half of a real HDB town
    // isn't just a strip of grass.
    addPlane(THREE, scene, "Woodlands Waterfront Park", [baseX + 2, -0.01, baseZ - 8], [16, 7], mat.park);
    addBench(THREE, scene, [baseX, baseZ - 9.5], mat);
    addBench(THREE, scene, [baseX + 5, baseZ - 7], mat);
    addBench(THREE, scene, [baseX - 5, baseZ - 16.5], mat);
    addBench(THREE, scene, [baseX + 1, baseZ - 9.5], mat);
    addDecorativeRock(THREE, scene, [baseX + 8, baseZ - 9], mat);
    addBox(THREE, scene, "Woodlands Playground Platform", [baseX + 8, 1.0, baseZ - 6], [2.2, 0.2, 2.2], mat.signGold);
    addCylinder(THREE, scene, "Woodlands Playground Post", [baseX + 7, 0.5, baseZ - 6.9], [0.1, 1.0, 8], mat.metal);
    addCylinder(THREE, scene, "Woodlands Playground Post", [baseX + 9, 0.5, baseZ - 6.9], [0.1, 1.0, 8], mat.metal);
    addBox(THREE, scene, "Woodlands Playground Roof", [baseX + 8, 1.6, baseZ - 6.9], [2.4, 0.15, 1], mat.signBlue);
    addCylinder(THREE, scene, "Woodlands Playground Slide", [baseX + 9.3, 0.5, baseZ - 5], [0.5, 1.0, 8], mat.signBlue);

    // Woodlands Checkpoint - the land border crossing to Malaysia, placed at
    // the northern edge of the district as a symbolic endpoint rather than a
    // literal depiction of the causeway/Malaysia itself.
    addBox(THREE, scene, "Woodlands Checkpoint Booth", [baseX, 2, baseZ + 9], [7, 4, 3.4], mat.hospital);
    addBox(THREE, scene, "Woodlands Checkpoint Canopy", [baseX, 4.3, baseZ + 9], [9, 0.35, 5], mat.roofDark);
    addBox(THREE, scene, "Woodlands Checkpoint Barrier", [baseX - 3.2, 0.9, baseZ + 11.2], [0.18, 0.18, 4], mat.signGold);
    addSignBoard(THREE, scene, "Woodlands Checkpoint Sign", "CHECKPOINT", [baseX - 4.4, 5.0, baseZ + 9], mat.signGold, 0x151515);
  }

  // Punggol - real Singapore's northeast waterfront new town, built around
  // the Punggol Waterway (a landscaped canal reclaimed from Sungei Punggol)
  // and served by the Punggol LRT rather than an MRT/bus interchange - the
  // two features that make it read as distinct from Woodlands (whose own
  // identity is the border checkpoint) rather than a second copy of the
  // same HDB-town template. Reuses the same real hdb-block.glb/
  // mall-building.glb models as Home/Orchard in loadDistrictAssetSamples()
  // - same shared-low-poly-kit reasoning as Marina Bay's reused
  // skyscrapers. Uses absolute world coordinates directly (matching its
  // zone position, no ZONE_DELTA entry), same as Woodlands.
  function addPunggol(THREE, scene, mat) {
    const baseX = 90;
    const baseZ = 70;

    addPlane(THREE, scene, "Punggol Waterway", [baseX, 0.01, baseZ + 8], [30, 5], mat.water);
    addPlane(THREE, scene, "Punggol Waterway Park", [baseX, -0.005, baseZ + 3], [30, 5], mat.park);
    addBench(THREE, scene, [baseX - 6, baseZ + 4.5], mat);
    addBench(THREE, scene, [baseX + 6, baseZ + 4.5], mat);
    addTree(THREE, scene, [baseX - 10, baseZ + 5], mat);
    addTree(THREE, scene, [baseX + 10, baseZ + 5], mat);

    // HDB heartland cluster - swapped for real modeled buildings in
    // loadDistrictAssetSamples() at [baseX-12,0,baseZ-3] and [baseX-20,0,baseZ+1].
    addBuildingCore(THREE, scene, "Punggol HDB Block A", [baseX - 12, 9, baseZ - 3], [6, 18, 4.6], mat.hdb, mat, "hdb");
    addBuildingCore(THREE, scene, "Punggol HDB Block B", [baseX - 20, 7.5, baseZ + 1], [5.2, 15, 4.2], mat.hdbAccent, mat, "hdb");
    addFlowerBed(THREE, scene, [baseX - 12, baseZ - 8], 4, mat);

    // Waterway Point mall - swapped for a real modeled building in
    // loadDistrictAssetSamples() at [baseX+11,0,baseZ-2].
    addBox(THREE, scene, "Waterway Point Mall", [baseX + 11, 4.2, baseZ - 2], [10, 8.4, 8], mat.mall);
    addBox(THREE, scene, "Waterway Point Glass Front", [baseX + 11, 3.6, baseZ - 6.1], [8, 5.5, 0.18], mat.glass);
    addBox(THREE, scene, "Waterway Point Roof", [baseX + 11, 8.6, baseZ - 2], [10.8, 0.4, 8.8], mat.roofDark);
    addSignBoard(THREE, scene, "Waterway Point Sign", "WATERWAY POINT", [baseX + 10, 6.8, baseZ - 10], mat.signBlue, 0xffffff);

    // Punggol LRT stop - an elevated light-rail platform, distinct from
    // Woodlands' ground-level MRT/bus interchange.
    addBox(THREE, scene, "Punggol LRT Platform", [baseX, 2.6, baseZ - 8], [8, 0.5, 3], mat.mrt);
    addCylinder(THREE, scene, "Punggol LRT Pillar", [baseX - 3, 1.3, baseZ - 8], [0.18, 2.6, 8], mat.metal);
    addCylinder(THREE, scene, "Punggol LRT Pillar", [baseX + 3, 1.3, baseZ - 8], [0.18, 2.6, 8], mat.metal);
    addBox(THREE, scene, "Punggol LRT Canopy", [baseX, 3.3, baseZ - 8], [8.6, 0.3, 3.6], mat.roofDark);
    addSignBoard(THREE, scene, "Punggol Sign", "PUNGGOL", [baseX - 4, 5.0, baseZ - 8], mat.signGold, 0x151515);
  }

  function addStreetLife(THREE, scene, mat) {
    [[-33, 8], [-27, 23], [-15, 23], [-34, -1], [-24, -18], [-9, -29], [4, -29], [14, -25], [28, -24], [34, 6], [28, 18], [13, 23], [7, 8], [-7, 8]].forEach(([x, z]) => addStreetLight(THREE, scene, [x, z], mat));
    [[-35, 18], [-18, 24], [-32, 4], [-35, -12], [-23, -23], [-4, -29], [8, -26], [12, -17], [3, -17], [27, -18], [31, 21], [22, 23], [38, 6]].forEach(([x, z]) => addTree(THREE, scene, [x, z], mat));
    [[-13, 7], [11, 7], [-13, -7], [11, -7], [25, 4], [-23, 7]].forEach(([x, z]) => addTrashBin(THREE, scene, [x, z], mat));
    [[-17, 8], [20, 7], [29, -6], [-29, -17]].forEach(([x, z]) => addPosterBoard(THREE, scene, [x, z], mat));
    addFenceLine(THREE, scene, [-38, -17], [-38, 21], mat);
    addFenceLine(THREE, scene, [13, -33], [36, -33], mat);
    addPlanterRow(THREE, scene, [-3, 7.9], 5, mat);
    addPlanterRow(THREE, scene, [10.5, -7.9], 4, mat);
  }

  // Singapore urban-planning infill pass: the earlier map had recognizable
  // destinations, but far too much plain ground between them. Singapore does
  // not read as isolated POIs in a field - it reads as transit-linked towns,
  // mixed-use street walls, sheltered pedestrian routes, neighbourhood
  // centres, and linear green connectors. These are light procedural
  // planning masses that can be swapped for Objaverse/GLB assets later; game
  // logic still depends on zones/routes, not on these decorative meshes.
  function addSingaporeUrbanPlanningInfill(THREE, scene, mat) {
    addFineGrainUrbanFabric(THREE, scene, mat);
    addTransitOrientedTownCentre(THREE, scene, mat);
    addHeartlandPrecinctDensity(THREE, scene, mat);
    addMixedUseStreetWalls(THREE, scene, mat);
    addParkConnectorAndActiveMobility(THREE, scene, mat);
    addDowntownCommercialDensity(THREE, scene, mat);
  }

  function addSingaporeOfficialPlanningRebase(THREE, scene, mat) {
    // URA Master Plan Rebase: do not treat the map as isolated attractions.
    // This lightweight city-structure layer follows Singapore planning
    // patterns - town centre core, HDB neighbourhood catchment, mixed-use CBD
    // edge, green-blue connector, and walk-cycle-ride links. It deliberately
    // avoids first-screen experimental GLB building swaps until each model
    // passes scale/camera audits.
    addPlane(THREE, scene, "Official Planning Town Centre Envelope", [-6, 0.012, -18], [54, 42], mat.sidewalk);
    addSoftEdgeGroundPatch(THREE, scene, "Official Planning Town Centre Envelope", [-6, -0.006, -18], [54, 42], 0xd8d2c2, 0.18);
    addPlane(THREE, scene, "HDB Neighbourhood Centre Catchment", [-38, 0.014, 39], [50, 36], mat.grass);
    addSoftEdgeGroundPatch(THREE, scene, "HDB Neighbourhood Centre Catchment", [-38, -0.004, 39], [50, 36], 0xc7daba, 0.16);
    addPlane(THREE, scene, "Learning Campus Quiet Quarter", [-70, 0.015, -15], [34, 30], mat.grass);
    addSoftEdgeGroundPatch(THREE, scene, "Learning Campus Quiet Quarter", [-70, -0.003, -15], [34, 30], 0xd5dec6, 0.16);
    addPlane(THREE, scene, "Work Money Mixed Use Spine", [27, 0.016, -40], [126, 28], mat.sidewalk);
    addSoftEdgeGroundPatch(THREE, scene, "Work Money Mixed Use Spine", [27, -0.002, -40], [126, 28], 0xcfc6b7, 0.12);
    addPlane(THREE, scene, "Health Green Blue Recovery Belt", [52, 0.017, 19], [86, 30], mat.park);
    addSoftEdgeGroundPatch(THREE, scene, "Health Green Blue Recovery Belt", [52, 0.0, 19], [86, 30], 0xbdd6af, 0.2);
    addPlane(THREE, scene, "Future Waterfront Gateway District", [76, 0.018, -72], [62, 28], mat.sand);
    addSoftEdgeGroundPatch(THREE, scene, "Future Waterfront Gateway District", [76, 0.002, -72], [62, 28], 0xd6c596, 0.14);

    addBox(THREE, scene, "URA Mixed Use Planning Spine", [14, 0.19, -22], [116, 0.12, 2.4], mat.path, true);
    addBox(THREE, scene, "Walk Cycle Ride North South Connector", [-12, 0.2, 17], [2.2, 0.12, 76], mat.path, true);
    addBox(THREE, scene, "PCN Green-Blue Corridor", [41, 0.18, 31], [94, 0.12, 4.6], mat.signGreen, true);
    addBox(THREE, scene, "ABC Waters Canal Edge", [41, 0.13, 27.8], [94, 0.08, 2.2], mat.water, true);

    [
      [-48, 27, "HOME"],
      [-16, 3, "MRT"],
      [0, -31, "MALL"],
      [20, -82, "FOOD"],
      [45, 11, "LIBRARY"],
      [78, -53, "HEALTH"],
      [78, -32, "CBD"]
    ].forEach(([x, z, label], index) => {
      const markerMat = index % 2 ? mat.signGreen : mat.signGold;
      addBox(THREE, scene, `Planning Wayfinding Plinth ${label}`, [x, 0.42, z], [2.6, 0.28, 1.2], mat.curbWarm, true);
      addSignBoard(THREE, scene, `Planning Wayfinding Sign ${label}`, label, [x - 1.25, 1.3, z - 0.72], markerMat, index % 2 ? 0xffffff : 0x141414);
    });

    addNeighbourhoodMicroBlocks(THREE, scene, mat, "HDB Neighbourhood Micro Block", [
      [-53, 34, 4.2, 6.2, "CARE"],
      [-47, 31, 4.0, 5.6, "MINI"],
      [-41, 29, 4.6, 5.8, "KOPI"],
      [-34, 28, 4.2, 5.0, "BILLS"],
      [-28, 29, 4.6, 5.6, "STUDY"]
    ]);
    addNeighbourhoodMicroBlocks(THREE, scene, mat, "Town Centre Active Frontage", [
      [-23, -12, 4.6, 5.2, "CLINIC"],
      [-15, -12, 4.4, 5.0, "TUITION"],
      [-7, -12, 4.6, 5.2, "SERVICE"],
      [2, -12, 4.8, 5.4, "SKILLS"],
      [11, -12, 4.6, 5.2, "CAFE"]
    ]);

    [
      [-47, 39], [-42, 39], [-37, 39], [-32, 39], [-27, 39],
      [-18, 8], [-12, 8], [-6, 8], [0, 8],
      [3, -25], [12, -25], [23, -25], [34, -25], [46, -25], [58, -25],
      [13, 27], [22, 28], [31, 29], [40, 30], [49, 31], [58, 32]
    ].forEach(([x, z]) => addTree(THREE, scene, [x, z], mat));
    [
      [-45, 25], [-36, 25], [-27, 25], [-17, 1], [-6, 1],
      [6, -29], [19, -29], [32, -29], [45, -29], [58, -29],
      [12, 35], [28, 35], [44, 35], [60, 35]
    ].forEach(([x, z]) => addPlanterRow(THREE, scene, [x, z], 2, mat));
  }

  function addNeighbourhoodMicroBlocks(THREE, scene, mat, prefix, blocks) {
    blocks.forEach(([x, z, width, height, label], index) => {
      const material = index % 3 === 0 ? mat.hdbAccent : (index % 3 === 1 ? mat.cafe : mat.mall);
      addBuildingCore(THREE, scene, `${prefix} ${label}`, [x, height / 2, z], [width, height, 3.6], material, mat, "shophouse");
      addShopFront(THREE, scene, [x - 0.35, z - 1.92], label, index % 2 ? mat.signBlue : mat.signGreen, mat);
    });
  }

  function addFineGrainUrbanFabric(THREE, scene, mat) {
    // Fine-grain Singapore town planning pass. The big map plane used to read
    // as empty ground between POIs; this fills it with secondary streets,
    // block edges, drop-off bays, plazas, and active frontages without adding
    // heavy GLB assets on first entry.
    [
      ["Secondary Street Heartland", [-30, 0.035, 18], [44, 0.06, 3.1]],
      ["Secondary Street Campus Link", [-58, 0.036, -18], [46, 0.06, 3.1]],
      ["Secondary Street Downtown Lane", [69, 0.037, -24], [3.1, 0.06, 42]],
      ["Secondary Street Social Lane", [30, 0.038, -55], [72, 0.06, 3.0]],
      ["Secondary Street Airport Link", [96, 0.039, -53], [3.0, 0.06, 58]],
      ["Secondary Street Punggol Edge", [-19, 0.04, 54], [78, 0.06, 3.0]]
    ].forEach(([name, position, scale]) => addBox(THREE, scene, name, position, scale, mat.road, true));

    [
      [-30, 18, "x"], [-58, -18, "x"], [69, -24, "z"], [30, -55, "x"], [96, -53, "z"], [-19, 54, "x"]
    ].forEach(([x, z, axis]) => {
      if (axis === "x") {
        for (let px = x - 20; px <= x + 20; px += 7) addBox(THREE, scene, "Secondary Road Lane Marking", [px, 0.15, z], [1.6, 0.035, 0.18], mat.roadLine, true);
      } else {
        for (let pz = z - 20; pz <= z + 20; pz += 7) addBox(THREE, scene, "Secondary Road Lane Marking", [x, 0.15, pz], [0.18, 0.035, 1.6], mat.roadLine, true);
      }
    });

    [
      ["Town Centre Plaza Paving", [-12, 0.17, -5], [18, 0.14, 12]],
      ["HDB Precinct Paving", [-38, 0.17, 41], [32, 0.14, 17]],
      ["Campus Forecourt Paving", [-74, 0.17, -15], [18, 0.14, 12]],
      ["Food Court Apron Paving", [20, 0.17, -73], [28, 0.14, 16]],
      ["Airport Kerbside Paving", [96, 0.17, -72], [25, 0.14, 9]],
      ["Riverside Social Promenade", [35, 0.17, -66], [42, 0.14, 7]]
    ].forEach(([name, position, scale]) => addBox(THREE, scene, name, position, scale, mat.sidewalk, true));

    [
      [-53, 38], [-48, 38], [-43, 38], [-38, 38], [-33, 38],
      [76, -57], [82, -57], [88, -57],
      [9, -67], [15, -67], [21, -67]
    ].forEach(([x, z]) => addParkingBay(THREE, scene, [x, z], mat));

    const compactBlocks = [
      ["Town Centre Medical Block", -22, -3, 4.2, 5.0, 4.0, mat.hospital, "CLINIC"],
      ["Town Centre Tuition Block", -4, -3, 4.0, 5.4, 3.8, mat.university, "TUITION"],
      ["Town Centre Kopitiam Block", -20, -14, 4.4, 4.6, 4.0, mat.food, "KOPITIAM"],
      ["Campus Student Services Block", -63, -26, 4.2, 5.2, 3.8, mat.library, "SCHOLARSHIP"],
      ["Social Shophouse Infill", 24, -62, 4.6, 5.2, 4.2, mat.cafe, "MEET"],
      ["Social Night Market Infill", 40, -62, 4.0, 4.6, 4.0, mat.food, "NIGHT FOOD"],
      ["Airport Budget Travel Block", 104, -59, 4.4, 5.4, 4.0, mat.airport, "TRAVEL"],
      ["Park Wellness Kiosk", 39, 24, 3.2, 3.8, 3.0, mat.park, "WELLNESS"]
    ];
    compactBlocks.forEach(([name, x, z, sx, sy, sz, material, label], index) => {
      addBuildingCore(THREE, scene, name, [x, sy / 2, z], [sx, sy, sz], material, mat, index % 2 ? "modern" : "shophouse");
      addShopFront(THREE, scene, [x, z - sz / 2 - 0.12], label, index % 2 ? mat.signBlue : mat.signGold, mat);
    });

    [
      [-28, -8], [-10, -8], [-29, 24], [-17, 24], [-45, 32], [-31, 32],
      [-69, -23], [-59, -10], [51, -26], [71, -40], [88, -25], [103, -43],
      [7, -61], [31, -60], [51, -58], [82, -67]
    ].forEach(([x, z]) => addUrbanPocket(THREE, scene, [x, z], mat));
  }

  function addTransitOrientedTownCentre(THREE, scene, mat) {
    // Central MRT/bus interchange: a compact mobility node where Home,
    // Mall, Park, Library, and Work routes visibly converge.
    addBox(THREE, scene, "Integrated MRT Bus Interchange Deck", [-9, 0.22, 8], [17, 0.3, 8.5], mat.sidewalk, true);
    addBox(THREE, scene, "Integrated Bus Interchange Canopy", [-9, 3.2, 9.4], [18, 0.28, 5.2], mat.roofDark, true);
    [-16, -11, -6, -1].forEach((x, index) => {
      addBox(THREE, scene, "Bus Bay Road Marking", [x, 0.18, 6.0], [3.4, 0.04, 0.28], mat.roadLine, true);
      addBox(THREE, scene, "Bus Stop Queue Rail", [x, 0.72, 11.9], [2.4, 0.12, 0.16], mat.metal);
      addBox(THREE, scene, "Bus Service Panel", [x + 0.6, 1.3, 12.05], [0.6, 1.1, 0.08], index % 2 ? mat.signBlue : mat.signGreen);
    });
    addSignBoard(THREE, scene, "Integrated Transport Hub Sign", "MRT + BUS", [-17, 4.2, 5.5], mat.signGold, 0x111111);

    // Sheltered walkways: the most Singaporean way to make walking routes
    // feel planned and usable in tropical rain/heat.
    addShelteredWalkway(THREE, scene, [-30, 40], [-13, 8], mat, "Home-MRT Sheltered Link");
    addShelteredWalkway(THREE, scene, [-13, 8], [0, -32], mat, "MRT-Mall Sheltered Link");
    addShelteredWalkway(THREE, scene, [-13, 8], [41, 12], mat, "MRT-Library Link");
    addShelteredWalkway(THREE, scene, [0, -32], [20, -95], mat, "Mall-Food Court Link");
  }

  function addHeartlandPrecinctDensity(THREE, scene, mat) {
    // HDB precinct model: several residential slabs around shared court,
    // neighbourhood centre, pavilion, playground, and daily services.
    [
      [-46, 6, 38, 5.2, 12, 4.0, mat.hdb],
      [-38, 7.5, 34, 5.8, 15, 4.2, mat.hdbAccent],
      [-28, 6.8, 49.5, 5.4, 13.6, 4.2, mat.hdb],
      [-15, 5.7, 41, 4.8, 11.4, 3.8, mat.hdbAccent]
    ].forEach(([x, y, z, sx, sy, sz, material], index) => {
      addBuildingCore(THREE, scene, `Heartland HDB Precinct Block ${index + 1}`, [x, y, z], [sx, sy, sz], material, mat, "hdb");
    });
    addBox(THREE, scene, "Heartland Precinct Court", [-31, 0.16, 37.5], [13, 0.16, 8], mat.sidewalk, true);
    addBox(THREE, scene, "Heartland Void Deck Activity Space", [-31, 1.1, 36.2], [8, 2.2, 2.8], mat.hdbBalcony);
    addBox(THREE, scene, "Neighbourhood Centre Shops", [-41, 2.1, 27.5], [11, 4.2, 4.8], mat.mall);
    addShopFront(THREE, scene, [-45, 24.9], "CLINIC", mat.signBlue, mat);
    addShopFront(THREE, scene, [-41, 24.9], "MINIMART", mat.signGreen, mat);
    addShopFront(THREE, scene, [-37, 24.9], "COFFEE", mat.signGold, mat);
    addSignBoard(THREE, scene, "Neighbourhood Centre Sign", "NEIGHBOURHOOD CENTRE", [-45.2, 4.6, 24.6], mat.signGold, 0x111111);
    addBox(THREE, scene, "Precinct Pavilion Roof", [-25, 2.4, 35.6], [5.6, 0.2, 4.2], mat.roofDark, true);
    [[-27.2, 33.8], [-22.8, 33.8], [-27.2, 37.4], [-22.8, 37.4]].forEach(([x, z]) => {
      addCylinder(THREE, scene, "Precinct Pavilion Post", [x, 1.2, z], [0.08, 2.4, 8], mat.metal);
    });
    addBox(THREE, scene, "Precinct Playground Soft Floor", [-19, 0.18, 34], [5, 0.18, 4.2], mat.signGold, true);
    addCylinder(THREE, scene, "Precinct Playground Climber", [-19, 0.85, 34], [1.1, 1.2, 6], mat.signBlue);
    addPlanterRow(THREE, scene, [-36, 31.4], 7, mat);
  }

  function addMixedUseStreetWalls(THREE, scene, mat) {
    // Continuous ground-floor activity along the main east-west spine: shops,
    // clinics, services, offices above. This fills the empty road edges and
    // gives the over-shoulder camera real city depth.
    const northRow = [
      [-46, -25, "TUITION"], [-37, -25, "PHARMACY"], [-28, -25, "BANK"], [-18, -25, "LAUNDRY"],
      [3, -25, "BAKERY"], [12, -25, "RETAIL"], [23, -25, "SKILLS"], [34, -25, "CO-WORK"],
      [46, -25, "DESIGN"], [58, -25, "TECH"]
    ];
    northRow.forEach(([x, z, label], index) => {
      const material = index % 3 === 0 ? mat.hdb : (index % 3 === 1 ? mat.mall : mat.work);
      addBuildingCore(THREE, scene, `Main Street Mixed-Use Block ${label}`, [x, 3.2 + (index % 2) * 0.7, z], [7.5, 6.4 + (index % 2) * 1.4, 5], material, mat, index % 2 ? "modern" : "shophouse");
      addShopFront(THREE, scene, [x - 1.2, z - 2.7], label, index % 2 ? mat.signBlue : mat.signGreen, mat);
    });

    const southRow = [
      [-42, -40, "KOPI"], [-31, -40, "VALUE"], [-20, -40, "DENTAL"], [-9, -40, "PHONE"],
      [12, -40, "MART"], [25, -40, "GYM"], [38, -40, "CAREER"], [52, -40, "STUDY"],
      [66, -40, "CLINIC"], [80, -40, "FOOD"]
    ];
    southRow.forEach(([x, z, label], index) => {
      const material = index % 2 ? mat.cafe : mat.hdbAccent;
      addBuildingCore(THREE, scene, `South Main Street Block ${label}`, [x, 2.8 + (index % 3) * 0.45, z], [7.8, 5.6 + (index % 3) * 0.9, 4.8], material, mat, "shophouse");
      addShopFront(THREE, scene, [x - 1.4, z + 2.6], label, index % 2 ? mat.signGold : mat.signBlue, mat);
    });

    // Five-foot-way / covered arcade strips along the shopfront rows.
    addBox(THREE, scene, "Main Street Five Foot Way North", [4, 0.2, -28.2], [108, 0.16, 2.2], mat.sidewalk, true);
    addBox(THREE, scene, "Main Street Five Foot Way South", [14, 0.21, -36.8], [126, 0.16, 2.2], mat.sidewalk, true);
    for (let x = -48; x <= 82; x += 8) {
      addCylinder(THREE, scene, "Five Foot Way Column", [x, 1.25, -28.2], [0.06, 2.5, 8], mat.metal);
      addCylinder(THREE, scene, "Five Foot Way Column", [x, 1.25, -36.8], [0.06, 2.5, 8], mat.metal);
    }
  }

  function addParkConnectorAndActiveMobility(THREE, scene, mat) {
    // Linear green corridor + cycling/footpath pair linking Heartland,
    // Park, Library, and Punggol direction. This turns blank land into a
    // Singapore-style PCN instead of unused grass.
    addBoxRotated(THREE, scene, "Park Connector Cycling Path", [41, 0.12, 37], [2.2, 0.08, 94], mat.signGreen, Math.PI / 2, true);
    addBoxRotated(THREE, scene, "Park Connector Pedestrian Path", [41, 0.13, 41], [1.4, 0.08, 94], mat.path, Math.PI / 2, true);
    for (let x = -4; x <= 86; x += 9) {
      addTree(THREE, scene, [x, 34], mat);
      addBox(THREE, scene, "PCN Pedestrian Logo Marking", [x + 2.5, 0.2, 41], [1.1, 0.04, 0.22], mat.roadLine, true);
      addBox(THREE, scene, "PCN Cycling Lane Marking", [x + 2.5, 0.21, 37], [1.4, 0.04, 0.18], mat.roadLine, true);
    }
    addSignBoard(THREE, scene, "Park Connector Sign", "PARK CONNECTOR", [18, 1.7, 35.2], mat.signGreen, 0xffffff);
    addBox(THREE, scene, "Canal Drainage Channel", [46, 0.03, 30], [82, 0.08, 2.4], mat.water, true);
    addBox(THREE, scene, "Canal Railing North", [46, 0.75, 31.4], [82, 0.12, 0.14], mat.metal);
    addBox(THREE, scene, "Canal Railing South", [46, 0.75, 28.6], [82, 0.12, 0.14], mat.metal);
  }

  function addDowntownCommercialDensity(THREE, scene, mat) {
    // CBD intensity around Raffles Place/Marina Bay: tighter tower spacing,
    // podiums, plazas, and underpass entries so the southern/eastern map
    // reads as a business district, not isolated landmarks.
    [
      [66, -16, 5.2, 17, 4.4],
      [88, -17, 5.6, 20, 4.6],
      [69, -48, 6.2, 22, 5.0],
      [91, -48, 5.4, 18, 4.4],
      [51, -47, 4.8, 15, 4.0]
    ].forEach(([x, z, sx, sy, sz], index) => {
      addBuildingCore(THREE, scene, `CBD Infill Tower ${index + 1}`, [x, sy / 2, z], [sx, sy, sz], index % 2 ? mat.work : mat.glass, mat, "modern");
      addBox(THREE, scene, `CBD Podium ${index + 1}`, [x, 1.2, z + 3.8], [sx + 2, 2.4, 3], mat.mall);
    });
    addBox(THREE, scene, "CBD Pedestrian Plaza", [78, 0.18, -31], [27, 0.16, 11], mat.sidewalk, true);
    addBox(THREE, scene, "CBD Underpass Entrance", [71, 1.2, -30], [4.5, 2.4, 2.2], mat.mrt);
    addBox(THREE, scene, "CBD Underpass Roof", [71, 2.55, -30], [5.2, 0.24, 2.8], mat.roofDark);
    addSignBoard(THREE, scene, "CBD Wayfinding Sign", "RAFFLES PLACE", [66, 3.2, -30], mat.signBlue, 0xffffff);
    addPlanterRow(THREE, scene, [68, -25.2], 7, mat);
    addPlanterRow(THREE, scene, [82, -25.2], 7, mat);
  }

  function addShelteredWalkway(THREE, scene, start, end, mat, name) {
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = Math.hypot(dx, dz);
    if (length < 1) return;
    const angle = Math.atan2(dx, dz);
    const mid = [(start[0] + end[0]) / 2, 2.35, (start[1] + end[1]) / 2];
    addBoxRotated(THREE, scene, `${name} Roof`, mid, [2.4, 0.22, length], mat.roofDark, angle, true);
    const steps = Math.max(2, Math.floor(length / 5));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = start[0] + dx * t;
      const z = start[1] + dz * t;
      addCylinder(THREE, scene, `${name} Post`, [x - Math.cos(angle) * 0.9, 1.15, z + Math.sin(angle) * 0.9], [0.055, 2.3, 8], mat.metal);
      addCylinder(THREE, scene, `${name} Post`, [x + Math.cos(angle) * 0.9, 1.15, z - Math.sin(angle) * 0.9], [0.055, 2.3, 8], mat.metal);
    }
  }

  function addParkingBay(THREE, scene, position, mat) {
    addBox(THREE, scene, "Singapore Parking Bay", [position[0], 0.18, position[1]], [3.6, 0.04, 1.75], mat.sidewalk, true);
    addBox(THREE, scene, "Parking Bay Front Line", [position[0], 0.22, position[1] - 0.84], [3.6, 0.035, 0.08], mat.roadLine, true);
    addBox(THREE, scene, "Parking Bay Back Line", [position[0], 0.22, position[1] + 0.84], [3.6, 0.035, 0.08], mat.roadLine, true);
    addBox(THREE, scene, "Parking Bay Divider", [position[0] - 1.78, 0.22, position[1]], [0.08, 0.035, 1.75], mat.roadLine, true);
  }

  function addUrbanPocket(THREE, scene, position, mat) {
    addBox(THREE, scene, "Singapore Street Corner Pocket", [position[0], 0.17, position[1]], [4.8, 0.12, 3.2], mat.sidewalk, true);
    addPlanterRow(THREE, scene, [position[0] - 1.25, position[1] + 1.2], 2, mat);
    addBench(THREE, scene, [position[0] + 1.2, position[1] - 0.6], mat);
    addStreetLight(THREE, scene, [position[0] + 2.0, position[1] + 1.2], mat);
  }

  function addPath(THREE, scene, start, end, width, material) {
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = Math.hypot(dx, dz);
    const mid = [(start[0] + end[0]) / 2, 0.115, (start[1] + end[1]) / 2];
    addBoxRotated(THREE, scene, "Curved District Path", mid, [width, 0.08, length], material, Math.atan2(dx, dz), true);
  }

  function addCrosswalk(THREE, scene, position, mat, axis) {
    for (let i = -4; i <= 4; i++) {
      if (axis === "x") addBox(THREE, scene, "Crosswalk Stripe", [position[0] + i * 0.72, 0.16, position[1]], [0.34, 0.04, 1.5], mat.curb, true);
      else addBox(THREE, scene, "Crosswalk Stripe", [position[0], 0.16, position[1] + i * 0.72], [1.5, 0.04, 0.34], mat.curb, true);
    }
  }

  function addSignBoard(THREE, scene, name, text, position, material, textColor) {
    addBox(THREE, scene, name, position, [3.2, 0.88, 0.16], material);
    addText(THREE, scene, text, [position[0] - 1.42, position[1] + 0.08, position[2] - 0.15], 0.44, textColor);
  }

  function addFlowerBed(THREE, scene, position, width, mat) {
    addBox(THREE, scene, "Flower Bed Soil", [position[0], 0.18, position[1]], [width, 0.2, 0.72], mat.trunk, true);
    for (let i = 0; i < 8; i++) {
      const x = position[0] - width * 0.42 + i * (width * 0.84 / 7);
      addCylinder(THREE, scene, "Flower Stem", [x, 0.42, position[1]], [0.03, 0.38, 6], mat.bush);
      addCylinder(THREE, scene, "Flower Bloom", [x, 0.68, position[1] + (i % 2 ? 0.12 : -0.08)], [0.12, 0.08, 8], [mat.flowerPink, mat.flowerYellow, mat.flowerPurple][i % 3]);
    }
  }

  function addTreadmill(THREE, scene, position, mat) {
    addBoxRotated(THREE, scene, "Gym Treadmill Belt", [position[0], 0.42, position[1]], [1.0, 0.18, 1.7], mat.equipment, 0, true);
    addBox(THREE, scene, "Gym Treadmill Console", [position[0], 1.08, position[1] - 0.72], [0.9, 0.45, 0.12], mat.screen);
    addCylinder(THREE, scene, "Gym Treadmill Handle", [position[0] - 0.55, 0.95, position[1] - 0.48], [0.04, 0.92, 8], mat.metal);
    addCylinder(THREE, scene, "Gym Treadmill Handle", [position[0] + 0.55, 0.95, position[1] - 0.48], [0.04, 0.92, 8], mat.metal);
  }

  function addBarbell(THREE, scene, position, mat) {
    addCylinder(THREE, scene, "Gym Barbell Bar", [position[0], 0.62, position[1]], [0.05, 2.4, 12], mat.metal, Math.PI / 2);
    addCylinder(THREE, scene, "Gym Weight Plate", [position[0], 0.62, position[1] - 1.35], [0.32, 0.16, 16], mat.equipment, Math.PI / 2);
    addCylinder(THREE, scene, "Gym Weight Plate", [position[0], 0.62, position[1] + 1.35], [0.32, 0.16, 16], mat.equipment, Math.PI / 2);
  }

  function addDeskComputer(THREE, scene, position, mat) {
    addBox(THREE, scene, "Office Desk", [position[0], 0.72, position[1]], [1.75, 0.22, 0.86], mat.wood);
    addBox(THREE, scene, "Office Computer Screen", [position[0], 1.14, position[1] - 0.28], [0.76, 0.52, 0.08], mat.screen);
    addBox(THREE, scene, "Office Keyboard", [position[0], 0.88, position[1] + 0.16], [0.68, 0.05, 0.18], mat.metal);
    addChair(THREE, scene, [position[0], position[1] + 0.8], mat);
  }

  function addFoodStall(THREE, scene, position, label, mat) {
    addBox(THREE, scene, "Food Stall Counter", [position[0], 0.52, position[1]], [2.35, 0.52, 0.58], mat.wood);
    addBox(THREE, scene, "Food Stall Stainless Front", [position[0], 0.74, position[1] - 0.31], [2.08, 0.34, 0.06], mat.metal);
    addBox(THREE, scene, "Food Stall Menu Board", [position[0], 1.72, position[1] - 0.5], [1.72, 0.48, 0.08], mat.screen);
    addBox(THREE, scene, "Food Stall Awning", [position[0], 2.34, position[1] - 0.12], [2.72, 0.12, 1.05], mat.roofDark, true);
    addText(THREE, scene, label, [position[0] - 0.74, 1.78, position[1] - 0.64], 0.2, 0xffef84);
    addCylinder(THREE, scene, "Food Stall Hanging Light", [position[0], 2.16, position[1] + 0.18], [0.16, 0.12, 16], mat.lampGlow);
  }

  function addTray(THREE, scene, position, mat) {
    addBox(THREE, scene, "Food Tray", [position[0], 0.93, position[1]], [0.72, 0.05, 0.42], mat.mrt);
    addCylinder(THREE, scene, "Food Bowl", [position[0] - 0.18, 1.02, position[1]], [0.16, 0.1, 12], mat.curbWarm);
    addCylinder(THREE, scene, "Food Cup", [position[0] + 0.22, 1.04, position[1] + 0.06], [0.11, 0.24, 12], mat.signGold);
  }

  function addShopFront(THREE, scene, position, label, material, mat) {
    addBox(THREE, scene, "Mall Shop Front", [position[0], 1.5, position[1]], [3.1, 2.5, 0.22], mat.glass);
    addBox(THREE, scene, "Mall Shop Sign", [position[0], 3.0, position[1] - 0.08], [2.8, 0.55, 0.18], material);
    addText(THREE, scene, label, [position[0] - 1.22, 3.08, position[1] - 0.27], 0.28, 0xffffff);
  }

  function addBookshelf(THREE, scene, position, mat) {
    addBox(THREE, scene, "Library Bookshelf Frame", [position[0], 1.25, position[1]], [1.4, 2.25, 0.45], mat.wood);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const bookMat = [mat.bookRed, mat.bookBlue, mat.bookGreen, mat.poster][(row + col) % 4];
        addBox(THREE, scene, "Library Book Spine", [position[0] - 0.48 + col * 0.31, 0.55 + row * 0.55, position[1] - 0.27], [0.22, 0.42, 0.08], bookMat);
      }
    }
  }

  function addWaitingChairs(THREE, scene, position, mat) {
    for (let i = 0; i < 4; i++) {
      addChair(THREE, scene, [position[0] + i * 0.72, position[1]], mat);
    }
  }

  function addChair(THREE, scene, position, mat) {
    addBox(THREE, scene, "Chair Seat", [position[0], 0.52, position[1]], [0.5, 0.14, 0.48], mat.furniture);
    addBox(THREE, scene, "Chair Back", [position[0], 0.86, position[1] + 0.22], [0.5, 0.55, 0.12], mat.furniture);
    addCylinder(THREE, scene, "Chair Leg", [position[0] - 0.18, 0.28, position[1] - 0.15], [0.035, 0.42, 6], mat.metal);
    addCylinder(THREE, scene, "Chair Leg", [position[0] + 0.18, 0.28, position[1] - 0.15], [0.035, 0.42, 6], mat.metal);
  }

  function addUmbrella(THREE, scene, position, canopyMaterial, mat) {
    addCylinder(THREE, scene, "Beach Umbrella Pole", [position[0], 0.9, position[1]], [0.05, 1.8, 10], mat.wood);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.55, 18), canopyMaterial);
    canopy.name = "Beach Umbrella Canopy";
    canopy.position.set(position[0], 1.9, position[1]);
    canopy.rotation.y = Math.PI / 18;
    canopy.castShadow = true;
    scene.add(canopy);
  }

  function addDecorativeRock(THREE, scene, position, mat) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), mat.sidewalk);
    rock.name = "Decorative Rock";
    rock.position.set(position[0], 0.5, position[1]);
    rock.scale.set(1.2, 0.58, 0.85);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }

  function addBirds(THREE, scene, position, mat) {
    const group = new THREE.Group();
    group.name = "Park Bird Silhouettes";
    for (let i = 0; i < 4; i++) {
      const bird = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 3), mat.lamp);
      bird.position.set((i - 1.5) * 0.8, Math.sin(i) * 0.25, i * 0.35);
      bird.rotation.z = Math.PI / 2;
      group.add(bird);
    }
    group.position.set(position[0], position[1], position[2]);
    scene.add(group);
  }

  function addTrashBin(THREE, scene, position, mat) {
    addCylinder(THREE, scene, "Street Trash Bin", [position[0], 0.45, position[1]], [0.28, 0.9, 10], mat.signGreen);
    addBox(THREE, scene, "Street Trash Bin Lid", [position[0], 0.92, position[1]], [0.7, 0.08, 0.5], mat.roofDark);
  }

  function addPosterBoard(THREE, scene, position, mat) {
    addBox(THREE, scene, "Street Poster Board", [position[0], 1.55, position[1]], [1.8, 2.2, 0.16], mat.poster);
    addBox(THREE, scene, "Street Poster Stripe", [position[0], 1.95, position[1] - 0.1], [1.35, 0.32, 0.07], mat.flowerPink);
    addBox(THREE, scene, "Street Poster Stripe", [position[0], 1.45, position[1] - 0.1], [1.1, 0.25, 0.07], mat.signBlue);
  }

  function addFenceLine(THREE, scene, start, end, mat) {
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = Math.hypot(dx, dz);
    const steps = Math.max(2, Math.floor(length / 2.4));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = start[0] + dx * t;
      const z = start[1] + dz * t;
      addCylinder(THREE, scene, "Fence Post", [x, 0.55, z], [0.07, 1.1, 8], mat.wood);
    }
    addPath(THREE, scene, start, end, 0.12, mat.wood);
  }

  function addPlanterRow(THREE, scene, position, count, mat) {
    for (let i = 0; i < count; i++) {
      const x = position[0] + i * 1.5;
      addBox(THREE, scene, "Street Planter Box", [x, 0.32, position[1]], [1.0, 0.38, 0.55], mat.wood);
      addCylinder(THREE, scene, "Street Planter Bush", [x, 0.72, position[1]], [0.42, 0.38, 12], mat.bush);
    }
  }

  // style: "shophouse" (five-foot way + tile skirting + pilasters),
  // "hdb" (AC compressor boxes + laundry pole), or "modern" (plain glass
  // curtain wall, default) - see createFacadeTexture(). The textured face
  // replaces the old per-window box loop; real 3D balcony ledges stay for
  // shophouse/hdb styles since they cast actual shadows a flat texture can't.
  function addBuildingCore(THREE, scene, name, position, scale, material, mat, style = "modern") {
    const THREE_ = THREE;
    const floors = Math.max(3, Math.round(scale[1] / 2));
    const columns = Math.max(3, Math.round(scale[0] / 1.4));
    const wallColor = material && material.color ? `#${material.color.getHexString()}` : "#c9c0a8";
    const facadeTexture = createFacadeTexture(THREE_, { wallColor, floors, columns, style });
    facadeTexture.needsUpdate = true;
    const facadeMaterial = new THREE_.MeshStandardMaterial({ map: facadeTexture, roughness: 0.82, metalness: 0.02 });
    const mesh = new THREE_.Mesh(new THREE_.BoxGeometry(1, 1, 1), [material, material, material, material, material, facadeMaterial]);
    mesh.name = name;
    mesh.position.set(position[0], position[1], position[2]);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    registerStaticCollider(name, position[0], position[2], scale[0], scale[2]);

    if (style !== "modern") {
      for (let floor = 0; floor < floors; floor++) {
        const y = position[1] - scale[1] * 0.38 + floor * (scale[1] * 0.72 / Math.max(1, floors - 1));
        addBox(THREE, scene, `${name} Balcony`, [position[0], y - 0.42, position[2] - scale[2] * 0.53], [scale[0] * 0.84, 0.16, 0.22], mat.hdbBalcony, true);
      }
    }
  }

  function addZones(THREE, scene, mat) {
    locationZones.forEach((zone) => {
      const ring = addCylinder(THREE, scene, `${zone.name} Interaction Ring`, [zone.x, 0.08, zone.z], [zone.radius, 0.06, 48], mat.zone);
      ring.userData.zoneId = zone.id;
      addText(THREE, scene, zone.name.toUpperCase(), [zone.x - 2.1, 0.55, zone.z - zone.radius * 0.65], 0.46, 0x0d0d0d);
    });
  }

  function addStreetLight(THREE, scene, position, mat) {
    addCylinder(THREE, scene, "Street Light Pole", [position[0], 1.5, position[1]], [0.045, 3, 10], mat.metal);
    addCylinder(THREE, scene, "Street Light Glow", [position[0], 3.1, position[1]], [0.34, 0.32, 16], mat.lampGlow);
  }

  function addTree(THREE, scene, position, mat) {
    addCylinder(THREE, scene, "Tree Trunk", [position[0], 0.8, position[1]], [0.24, 1.6, 10], mat.trunk);
    const crown = new THREE.Group();
    crown.name = "Tree Crown";
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.9, 18, 12), mat.park);
      leaf.position.set((i - 1) * 0.55, 1.85 + i * 0.1, i === 1 ? 0.35 : 0);
      leaf.castShadow = true;
      crown.add(leaf);
    }
    crown.position.set(position[0], 0, position[1]);
    scene.add(crown);
  }

  function addBench(THREE, scene, position, mat) {
    addBox(THREE, scene, "Bench Seat", [position[0], 0.48, position[1]], [2.2, 0.18, 0.55], mat.trunk);
    addBox(THREE, scene, "Bench Back", [position[0], 0.85, position[1] - 0.32], [2.2, 0.5, 0.16], mat.trunk);
  }

  function addTableSet(THREE, scene, position, mat) {
    addCylinder(THREE, scene, "Food Table", [position[0], 0.68, position[1]], [0.55, 0.14, 18], mat.curb);
    addCylinder(THREE, scene, "Food Stool", [position[0] + 0.9, 0.42, position[1]], [0.28, 0.22, 12], mat.mrt);
    addCylinder(THREE, scene, "Food Stool", [position[0] - 0.9, 0.42, position[1]], [0.28, 0.22, 12], mat.mrt);
  }

  function createPlayer(THREE, mat) {
    const group = new THREE.Group();
    const parts = { group };
    parts.fallbackRoot = new THREE.Group();
    parts.fallbackRoot.name = `Fallback Player Visual ${PLAYER_VISUAL_REFERENCE.heightMeters}m`;
    parts.fallbackRoot.scale.setScalar(PLAYER_VISUAL_REFERENCE.fallbackScale);
    group.add(parts.fallbackRoot);

    parts.body = new THREE.Group();
    parts.fallbackRoot.add(parts.body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.82, 8, 14), mat.outfit);
    torso.position.y = 1.18;
    torso.castShadow = true;
    parts.body.add(torso);

    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.34, 0.44), mat.shirt);
    shirt.position.y = 1.32;
    shirt.castShadow = true;
    parts.body.add(shirt);

    parts.head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), mat.skin);
    parts.head.castShadow = true;
    parts.fallbackRoot.add(parts.head);

    parts.hair = new THREE.Group();
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 12), mat.hair);
    hairCap.scale.y = 0.48;
    const fringe = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 5), mat.hair);
    fringe.position.set(0.16, -0.05, -0.25);
    fringe.rotation.x = Math.PI * 0.72;
    parts.hair.add(hairCap, fringe);
    parts.fallbackRoot.add(parts.hair);

    parts.leftArm = makeLimb(THREE, mat.skin, [-0.55, 1.25, 0], 0.12, 0.72);
    parts.rightArm = makeLimb(THREE, mat.skin, [0.55, 1.25, 0], 0.12, 0.72);
    parts.leftLeg = makeLimb(THREE, mat.outfit, [-0.2, 0.52, 0], 0.14, 0.86);
    parts.rightLeg = makeLimb(THREE, mat.outfit, [0.2, 0.52, 0], 0.14, 0.86);
    parts.fallbackRoot.add(parts.leftArm, parts.rightArm, parts.leftLeg, parts.rightLeg);

    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.42), mat.shoes);
    leftShoe.position.set(-0.2, 0.06, -0.06);
    const rightShoe = leftShoe.clone();
    rightShoe.position.x = 0.2;
    parts.fallbackRoot.add(leftShoe, rightShoe);
    return parts;
  }

  function makeLimb(THREE, material, position, radius, height) {
    const group = new THREE.Group();
    group.position.set(position[0], position[1], position[2]);
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(radius, height, 6, 10), material);
    limb.position.y = -height * 0.28;
    limb.castShadow = true;
    group.add(limb);
    return group;
  }

  function addPlane(THREE, scene, name, position, scale, material) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(scale[0], scale[1]), material);
    mesh.name = name;
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position[0], position[1], position[2]);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  // Found via the same recorded playthrough as the collision bug: a large
  // grass/park/sand patch (addPlane above) is a flat rectangle laid directly
  // on top of the base ground plane with a completely different material -
  // no transition, so walking near its edge shows a razor-straight color
  // seam that reads as a rendering bug rather than a deliberate boundary.
  // Cheapest real fix that doesn't require a custom shader: draw a "frame"
  // shape on a canvas (solid color band, transparent hole in the middle so
  // it doesn't cover the patch's own photographic texture, transparent
  // outside so the base ground shows through), blur it, and lay that as a
  // transparent overlay slightly larger than the patch. The blur softens
  // both the inner edge (fading into the patch's real texture) and the
  // outer edge (fading into the base ground) in one pass.
  function createGroundBlendTexture(THREE, colorHex, innerRatio, blurPx, canvasSize = 256) {
    const shape = document.createElement("canvas");
    shape.width = canvasSize;
    shape.height = canvasSize;
    const shapeCtx = shape.getContext("2d");
    shapeCtx.fillStyle = `#${colorHex.toString(16).padStart(6, "0")}`;
    shapeCtx.fillRect(0, 0, canvasSize, canvasSize);
    const holeMargin = (canvasSize * (1 - innerRatio)) / 2;
    shapeCtx.globalCompositeOperation = "destination-out";
    shapeCtx.fillRect(holeMargin, holeMargin, canvasSize - holeMargin * 2, canvasSize - holeMargin * 2);

    const blurred = document.createElement("canvas");
    blurred.width = canvasSize;
    blurred.height = canvasSize;
    const blurredCtx = blurred.getContext("2d");
    blurredCtx.filter = `blur(${blurPx}px)`;
    blurredCtx.drawImage(shape, 0, 0);

    const texture = new THREE.CanvasTexture(blurred);
    texture.needsUpdate = true;
    return texture;
  }

  function addSoftEdgeGroundPatch(THREE, scene, name, position, scale, colorHex, marginRatio = 0.3) {
    const overlayWidth = scale[0] * (1 + marginRatio);
    const overlayDepth = scale[1] * (1 + marginRatio);
    const innerRatio = 1 / (1 + marginRatio);
    const texture = createGroundBlendTexture(THREE, colorHex, innerRatio, 22);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      roughness: 1,
      metalness: 0
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(overlayWidth, overlayDepth), material);
    mesh.name = `${name} Soft Edge`;
    mesh.rotation.x = -Math.PI / 2;
    // Just above the patch it's blending, comfortably below anything a
    // player-height object would render at, so it never fights or floats.
    mesh.position.set(position[0], position[1] + 0.006, position[2]);
    scene.add(mesh);
    return mesh;
  }

  function addBox(THREE, scene, name, position, scale, material, receiveOnly = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    mesh.name = name;
    mesh.position.set(position[0], position[1], position[2]);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.castShadow = !receiveOnly;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function addBoxRotated(THREE, scene, name, position, scale, material, rotationY = 0, receiveOnly = false) {
    const mesh = addBox(THREE, scene, name, position, scale, material, receiveOnly);
    mesh.rotation.y = rotationY;
    return mesh;
  }

  function addCylinder(THREE, scene, name, position, settings, material, rotateX = 0) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(settings[0], settings[0], settings[1], settings[2] || 16), material);
    mesh.name = name;
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.x = rotateX;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function addText(THREE, scene, text, position, size, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "900 72px system-ui, sans-serif";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    ctx.strokeText(text, 18, 96);
    ctx.fillText(text, 18, 96);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(position[0], position[1], position[2]);
    sprite.scale.set(size * 4.1, size * 1.25, 1);
    scene.add(sprite);
    return sprite;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerpAngle(a, b, t) {
    const diff = Math.atan2(Math.sin(b - a), Math.cos(b - a));
    return a + diff * t;
  }

  function wrap(value, min, max) {
    const width = max - min;
    return ((((value - min) % width) + width) % width) + min;
  }

  function isTyping(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
  }

  window.CompassLifeSim = {
    mount,
    locations: locationZones,
    presentationTest: {
      getTimeOfDayPresentation,
      getWeatherPresentation,
      getCameraRigPresentation: () => ({ ...OVER_SHOULDER_CAMERA, mode: "over-shoulder" })
    }
  };
})();
