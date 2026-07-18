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

    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 180);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    if (window.LifeVerseRenderPipeline && window.LifeVerseRenderPipeline.configureRenderer) {
      window.LifeVerseRenderPipeline.configureRenderer(THREE, renderer, { exposure: 0.86, shadows: true, maxPixelRatio: 2 });
    } else {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
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
      pitch: 0.6,
      smoothMove: { x: 0, y: 0 },
      moveSpeed: 0,
      walkPhase: 0,
      footstepTimer: 0,
      isMoving: false,
      mixers: [],
      productionAssetsLoaded: false,
      assetManager: null,
      assetDebug: null,
      cameraPosition: new THREE.Vector3(-19, 8, 0),
      cameraLookAt: new THREE.Vector3(-19, 1.55, -10),
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
    if (options.initialLocationId) {
      const targetZone = locationZones.find((zone) => zone.id === options.initialLocationId);
      if (targetZone) {
        player.group.position.set(targetZone.x, 0, targetZone.z);
        state.cameraPosition.set(targetZone.x, 8, targetZone.z - 12);
        state.cameraLookAt.set(targetZone.x, 1.55, targetZone.z);
      }
    }
    const debugParams = new URLSearchParams(location.search);
    const spawnOverride = debugParams.get("spawn");
    if (spawnOverride) {
      const [sx, sy, sz] = spawnOverride.split(",").map(Number);
      if (Number.isFinite(sx) && Number.isFinite(sz)) {
        player.group.position.set(sx, Number.isFinite(sy) ? sy : 0, sz);
        state.cameraPosition.set(sx, 8, sz - 12);
        state.cameraLookAt.set(sx, 1.55, sz);
      }
      const yawOverride = Number(debugParams.get("yaw"));
      if (Number.isFinite(yawOverride)) state.yaw = yawOverride;
    }
    scene.add(player.group);
    loadProductionAssets(THREE, scene, materials, player, state, root, state.assetManager).then((loaded) => {
      if (state.destroyed) return;
      state.productionAssetsLoaded = loaded;
      if (!loaded) {
        createDistrict(THREE, scene, materials);
        setAssetStatus(root, "Stylized remastered district active.", "success");
        window.setTimeout(() => clearAssetStatus(root), 2600);
        loadDistrictAssetSamples(THREE, scene, state.assetManager, state);
      }
      registerPresentationObjects(scene, state.presentation);
    });

    const clock = new THREE.Clock();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    resize();

    // The Volume 5 anime cel-shading pass (docs/volume5-asset-pipeline.md) was
    // superseded by a semi-realistic "Stylized Low Poly City" PBR direction -
    // the outline pipeline stays intact below (?cel=1 still re-enables it for
    // comparison) but is now opt-in rather than the default.
    const celOutlineEnabled = new URLSearchParams(location.search).get("cel") === "1";
    if (celOutlineEnabled && window.LifeVerseRenderPipeline && window.LifeVerseRenderPipeline.createOutlinePipeline) {
      window.LifeVerseRenderPipeline.createOutlinePipeline(THREE, renderer, scene, camera, {
        width: Math.max(320, root.clientWidth || window.innerWidth || 320),
        height: Math.max(240, root.clientHeight || window.innerHeight || 240)
      }).then((outline) => {
        if (state.destroyed) {
          outline.dispose();
          return;
        }
        state.outline = outline;
      }).catch((error) => {
        console.warn("[LifeVerse] Cel outline pipeline unavailable, falling back to plain render.", error);
      });
    }

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
        state.pitch = clamp(state.pitch + dy * 0.0045, 0.28, 0.95);
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
      if (state.outline) state.outline.setSize(width, height);
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
      if (state.outline) state.outline.render();
      else renderer.render(scene, camera);
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
      const distance = 9.4 - state.moveSpeed * 0.52;
      const height = 3.75 + state.pitch * 3.05;
      const offset = new THREE.Vector3(
        Math.sin(state.yaw + Math.PI) * distance,
        height,
        Math.cos(state.yaw + Math.PI) * distance
      );
      const desiredPosition = target.clone().add(offset);
      const lookTarget = new THREE.Vector3(target.x, target.y + 1.48 + state.moveSpeed * 0.12, target.z);
      state.cameraPosition.lerp(desiredPosition, Math.min(1, delta * 5.8));
      state.cameraLookAt.lerp(lookTarget, Math.min(1, delta * 7.2));
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

    return {
      destroy() {
        state.destroyed = true;
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
        if (state.outline) state.outline.dispose();
        renderer.dispose();
        root.innerHTML = "";
      }
    };
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
    const make = (color, emissive = 0x000000, roughness = 0.7, metalness = 0.03) => new THREE.MeshStandardMaterial({ color, emissive, roughness, metalness });
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
      grass: shared("grass", () => make(0x5f8f52)),
      ground: make(0xb6ad97),
      warmGround: make(0xcbb290),
      road: shared("road", () => standard(0x2b2e33)),
      roadLine: make(0xd9d4c4, 0x0a0906, 0.55),
      sidewalk: shared("concrete", () => make(0xb2a98f)),
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
    canvas.width = 32;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#4f8fc7");
    gradient.addColorStop(0.55, "#a8cfe0");
    gradient.addColorStop(1, "#dcd8c8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
        shadowSize: 2048,
        shadowCameraSize: 38
      })
      : null;
    const hemi = rig ? rig.hemi : new THREE.HemisphereLight(0xffffff, 0x91ad82, 0.95);
    const sun = rig ? rig.sun : new THREE.DirectionalLight(0xffffff, 1.08);
    if (!rig) {
      scene.add(hemi);
      sun.position.set(-12, 24, 12);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -38;
      sun.shadow.camera.right = 38;
      sun.shadow.camera.top = 38;
      sun.shadow.camera.bottom = -38;
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

  async function loadProductionAssets(THREE, scene, mat, player, state, root, assetManager) {
    if (!assetManager) return false;
    try {
      const manifest = await assetManager.loadManifest("assets/life-sim/asset-manifest.json");
      if (!manifest || !manifest.enabled) return false;
      const loaderReady = await assetManager.ensureGltfLoader();
      if (!loaderReady) {
        setAssetStatus(root, "Production assets are enabled, but GLTFLoader did not load. Check the GLTFLoader script in index.html.", "error");
        return false;
      }

      setAssetStatus(root, "Loading production 3D assets...", "loading");

      let loadedCount = 0;
      if (manifest.environment && manifest.environment.url) {
        const environment = await assetManager.instantiatePrefab("environment:main", scene, manifest.environment);
        if (environment && !environment.fallback) loadedCount += 1;
      }

      const locations = Array.isArray(manifest.locationModels) ? manifest.locationModels : [];
      for (const location of locations) {
        if (!location || !location.url) continue;
        const loaded = await assetManager.instantiatePrefab(`location:${location.id || location.label || location.url}`, scene, location);
        if (loaded && !loaded.fallback) loadedCount += 1;
      }

      if (manifest.character && manifest.character.url) {
        const character = await assetManager.loadModel(manifest.character.url, manifest.character);
        if (character && !character.fallback) {
          await installCharacterAsset(THREE, assetManager, player, character, manifest.character, state, mat);
          loadedCount += 1;
        }
      }

      addZones(THREE, scene, mat);
      if (loadedCount > 0) {
        setAssetStatus(root, "Production asset mode active", "success");
        window.setTimeout(() => clearAssetStatus(root), 2600);
        return true;
      }
      return false;
    } catch (error) {
      console.warn("[Life Sim] Production asset loading failed:", error);
      setAssetStatus(root, "Production assets could not load. Check file paths in assets/life-sim/asset-manifest.json.", "error");
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
    ["body", "head", "hair", "leftArm", "rightArm", "leftLeg", "rightLeg"].forEach((key) => {
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
    addPlane(THREE, scene, "Campus Green", [-80, -0.015, -5], [26, 26], mat.grass);
    addPlane(THREE, scene, "Park Green", [13, -0.01, 23], [24, 20], mat.park);
    addPlane(THREE, scene, "Beach Sand", [75, 0, -82], [26, 11], mat.sand);
    addPlane(THREE, scene, "Shallow Anime Sea", [75, 0.015, -90], [28, 9], mat.water);

    addRoadNetwork(THREE, scene, mat);
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

  async function loadDistrictAssetSamples(THREE, scene, assetManager, state) {
    if (!assetManager) return;
    const ready = await assetManager.ensureGltfLoader();
    if (!ready || (state && state.destroyed)) return;

    const swaps = [
      {
        url: "assets/environment/hdb-block.glb",
        hideNamePrefixes: ["HDB Home Block A", "HDB Home Block B"],
        position: [-30, 0, 42.2],
        scale: [5.5, 5.5, 5.5]
      },
      {
        url: "assets/environment/office-tower.glb",
        hideNamePrefixes: ["Office Tower"],
        position: [-25, 0, -83],
        scale: [5.5, 5.5, 5.5]
      },
      {
        url: "assets/environment/library.glb",
        hideNames: ["Library Reading Hall", "Library Roof", "Library Quiet Glass"],
        position: [41, 0, 12],
        scale: [2.5, 2.5, 2.5]
      },
      {
        url: "assets/environment/city-kit-commercial/mall-building.glb",
        hideNames: ["Mall Main Atrium", "Mall Glass Front", "Mall Round Atrium"],
        position: [0, 0, -35],
        scale: [6, 6, 6]
      },
      {
        url: "assets/environment/tree-oak.glb",
        hideNames: ["Tree Trunk", "Tree Crown"],
        positions: TREE_POSITIONS,
        scale: [2.4, 2.4, 2.4]
      },
      // Orchard Road's dense rain-tree canopy - purely additive, denser than
      // the city-wide tree scatter above.
      {
        url: "assets/environment/tree-oak.glb",
        positions: ORCHARD_STREET_TREE_POSITIONS,
        scale: [2.2, 2.2, 2.2]
      },
      // Orchard Road: extends the Mall zone with two more shopfronts along the
      // same street instead of replacing anything, so the existing shop
      // fronts/signage/plants stay exactly where they were.
      {
        url: "assets/environment/city-kit-commercial/orchard-shop-a.glb",
        position: [-8, 0, -35],
        scale: [6.5, 6.5, 6.5]
      },
      {
        url: "assets/environment/city-kit-commercial/orchard-shop-b.glb",
        position: [8, 0, -35],
        scale: [4.2, 4.2, 4.2]
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
        scale: [3.5, 3.5, 3.5]
      },
      {
        url: "assets/environment/university-hostel.glb",
        position: [-80, 0, -12],
        scale: [3.2, 3.2, 3.2]
      },
      // Marina Bay / CBD: three City Kit Commercial skyscrapers cluster around
      // the hand-built Marina-Bay-Sands-style landmark (addMarinaBayLandmark),
      // which uses the same primitive-box style as every other district
      // building rather than a downloaded model - there's no free CC0 model
      // of that specific silhouette.
      {
        url: "assets/environment/city-kit-commercial/marina-skyscraper-a.glb",
        position: [30, 0, -67],
        scale: [4.9, 4.9, 4.9]
      },
      {
        url: "assets/environment/city-kit-commercial/marina-skyscraper-c.glb",
        position: [40, 0, -59],
        scale: [4.4, 4.4, 4.4]
      },
      {
        url: "assets/environment/city-kit-commercial/marina-skyscraper-e.glb",
        position: [50, 0, -67],
        scale: [3.9, 3.9, 3.9]
      },
      // Sentosa: purely additive palm trees around the existing Beach zone.
      {
        url: "assets/environment/tree-palm.glb",
        positions: SENTOSA_PALM_POSITIONS,
        scale: [3.0, 3.0, 3.0]
      },
      {
        url: "assets/environment/tree-palm-bend.glb",
        positions: SENTOSA_PALM_BEND_POSITIONS,
        scale: [3.0, 3.0, 3.0]
      },
      // Woodlands pilot: real modeled+textured buildings (Quaternius's free
      // CC0 "Downtown City MegaKit") replacing the primitive-box HDB blocks
      // and mall, per the art-direction reassessment in this session. Spread
      // further apart than the boxes they replace since these models are
      // larger and more detailed than a plain box footprint.
      {
        url: "assets/environment/city-kit-quaternius/Building_Medium_2_001.gltf",
        hideNamePrefixes: ["Woodlands HDB Block A"],
        position: [-11, 0, 53],
        scale: [1, 1, 1]
      },
      {
        url: "assets/environment/city-kit-quaternius/Building_Small_1.gltf",
        hideNamePrefixes: ["Woodlands HDB Block B"],
        position: [-27, 0, 47],
        scale: [1, 1, 1]
      },
      {
        url: "assets/environment/city-kit-quaternius/Building_Large_2.gltf",
        hideNames: ["Causeway Point Mall", "Causeway Point Glass Front", "Causeway Point Roof"],
        position: [22, 0, 48],
        scale: [1, 1, 1]
      },
      // Woodlands estate expansion: 12 more blocks cycling through the same
      // 3 Quaternius files as the mall/original 2 blocks above, grouped by
      // file into 3 "positions" (plural, clone-based) entries - safe to
      // reuse a url already used by a singular entry above (see the
      // Punggol/Raffles Place comment for why singular+singular is the
      // unsafe combination, not singular+plural).
      {
        url: "assets/environment/city-kit-quaternius/Building_Large_2.gltf",
        hideNamePrefixes: ["Woodlands Estate Block C", "Woodlands Estate Block F", "Woodlands Estate Block I", "Woodlands Estate Block L"],
        positions: [[-16, 30], [5, 30], [-2, 37], [-9, 44]],
        scale: [1, 1, 1]
      },
      {
        url: "assets/environment/city-kit-quaternius/Building_Medium_2_001.gltf",
        hideNamePrefixes: ["Woodlands Estate Block D", "Woodlands Estate Block G", "Woodlands Estate Block J", "Woodlands Estate Block M"],
        positions: [[-9, 30], [-16, 37], [5, 37], [-2, 44]],
        scale: [1, 1, 1]
      },
      {
        url: "assets/environment/city-kit-quaternius/Building_Small_1.gltf",
        hideNamePrefixes: ["Woodlands Estate Block E", "Woodlands Estate Block H", "Woodlands Estate Block K", "Woodlands Estate Block N"],
        positions: [[-2, 30], [-9, 37], [-16, 44], [5, 44]],
        scale: [1, 1, 1]
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
        position: [3.8, 0, -65],
        scale: [5.2, 5.2, 5.2]
      },
      {
        url: "assets/environment/city-kit-commercial/chinatown-shophouse-b.glb",
        hideNamePrefixes: ["Chinatown Shophouse Ochre"],
        position: [7.8, 0, -65],
        scale: [5.2, 5.2, 5.2]
      },
      {
        url: "assets/environment/city-kit-commercial/chinatown-shophouse-c.glb",
        hideNamePrefixes: ["Chinatown Shophouse Teal"],
        position: [11.8, 0, -65],
        scale: [5.2, 5.2, 5.2]
      },
      {
        url: "assets/environment/city-kit-commercial/chinatown-shophouse-d.glb",
        hideNamePrefixes: ["Chinatown Shophouse Cream"],
        position: [15.8, 0, -65],
        scale: [5.2, 5.2, 5.2]
      },
      {
        url: "assets/environment/city-kit-commercial/little-india-shophouse-a.glb",
        hideNamePrefixes: ["Little India Shophouse Blue"],
        position: [18.8, 0, -19],
        scale: [4.0, 4.0, 4.0]
      },
      {
        url: "assets/environment/city-kit-commercial/little-india-shophouse-b.glb",
        hideNamePrefixes: ["Little India Shophouse Saffron"],
        position: [22.8, 0, -19],
        scale: [3.5, 3.5, 3.5]
      },
      {
        url: "assets/environment/city-kit-commercial/little-india-shophouse-c.glb",
        hideNamePrefixes: ["Little India Shophouse Magenta"],
        position: [26.8, 0, -19],
        scale: [3.2, 3.2, 3.2]
      },
      {
        url: "assets/environment/city-kit-commercial/little-india-shophouse-d.glb",
        hideNamePrefixes: ["Little India Shophouse Cream"],
        position: [30.8, 0, -19],
        scale: [2.2, 3.2, 2.2]
      },
      {
        url: "assets/environment/city-kit-commercial/bugis-shophouse-a.glb",
        hideNamePrefixes: ["Bugis Heritage Shophouse A"],
        position: [44, 0, -37],
        scale: [2.6, 3.4, 2.6]
      },
      {
        url: "assets/environment/city-kit-commercial/bugis-shophouse-b.glb",
        hideNamePrefixes: ["Bugis Heritage Shophouse B"],
        position: [47.6, 0, -37],
        scale: [3.2, 3.2, 3.2]
      },
      {
        url: "assets/environment/city-kit-commercial/hospital-block.glb",
        hideNamePrefixes: ["Hospital Clean Main Wing", "Hospital Ward Tower"],
        position: [80, 0, -52],
        scale: [3.0, 3.0, 3.0]
      },
      {
        url: "assets/environment/city-kit-commercial/airport-terminal.glb",
        hideNames: ["Airport Terminal", "Airport Glass Departures", "Airport Terminal Overhang"],
        hideNamePrefixes: ["Airport Facade Mullion"],
        position: [110, 0, -10],
        scale: [8, 7, 8]
      },
      {
        url: "assets/environment/city-kit-commercial/gym-building.glb",
        hideNames: ["Gym Roof"],
        hideNamePrefixes: ["Gym Fitness Studio"],
        position: [-60, 0, 54],
        scale: [6, 3.2, 6]
      },
      {
        url: "assets/environment/cafe-building.glb",
        hideNames: ["Cafe Roof"],
        hideNamePrefixes: ["Cafe Cozy Shop"],
        position: [-50, 0, -26.5],
        scale: [2.6, 2.6, 2.6]
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
        scale: [4, 2, 3]
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
        scale: [5.2, 5.2, 5.2]
      },
      {
        url: "assets/environment/city-kit-commercial/mall-building.glb",
        hideNames: ["Waterway Point Mall", "Waterway Point Glass Front", "Waterway Point Roof"],
        positions: [[101, 68]],
        scale: [6, 6, 6]
      },
      // Raffles Place: two of Marina Bay's own generic City Kit Commercial
      // skyscrapers reused for background density around the hand-built
      // towers in addRafflesPlace() - purely additive, nothing to hide.
      // "positions" (plural) form even for one position each, since both
      // urls are already used once by Marina Bay's own singular entries
      // below - see the Punggol comment above for why reusing a url via two
      // singular entries is unsafe but two "positions" entries (or one
      // singular + one "positions") are not.
      {
        url: "assets/environment/city-kit-commercial/marina-skyscraper-a.glb",
        positions: [[68, -30]],
        scale: [4.6, 4.6, 4.6]
      },
      {
        url: "assets/environment/city-kit-commercial/marina-skyscraper-e.glb",
        positions: [[88, -28]],
        scale: [4.2, 4.2, 4.2]
      }
    ];

    // Loaded in parallel rather than one-at-a-time: this list grew from ~15
    // entries to ~30 in the real-model pass, and sequential `await` per swap
    // made total load time (each fetch+parse ~1-1.5s) stack up to 40s+ before
    // the last buildings appeared. Each swap is still independently
    // try/caught so one failed/slow model can't block or break the others.
    await Promise.all(swaps.map(async (swap) => {
      try {
        const asset = await assetManager.loadModel(swap.url, {
          toonify: true,
          scale: swap.scale,
          label: swap.url
        });
        if (state && state.destroyed) return;
        if (!asset || asset.fallback || !asset.scene) return;

        if (Array.isArray(swap.positions)) {
          swap.positions.forEach(([x, z]) => {
            const instance = asset.scene.clone(true);
            assetManager.prepareModel(instance, { toonify: true, position: [x, 0, z], scale: swap.scale });
            scene.add(instance);
            // registerPresentationObjects() already ran (synchronously, before this
            // async load resolved) and only found the original procedural "Tree
            // Crown" groups this is about to hide. Register the replacement
            // directly so it keeps the same wind-sway animation instead of going static.
            if (state && state.presentation && Array.isArray(state.presentation.treeCrowns)) {
              state.presentation.treeCrowns.push(instance);
            }
          });
        } else {
          assetManager.prepareModel(asset.scene, { toonify: true, position: swap.position, scale: swap.scale });
          scene.add(asset.scene);
        }

        const hideNames = swap.hideNames || [];
        const hidePrefixes = swap.hideNamePrefixes || [];
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
    }));
  }

  // Rebuilt for the real-asset spacing replan: the old cross-shaped road
  // (two ~70-unit boxes) covered the entire old compact map, but the new
  // zone layout spans roughly 200x157 units. Main Road NS runs along x=0
  // (Mall and Woodlands both sit near that line); Main Road EW runs along
  // z=-32 (the downtown-ring zones - Mall/Bugis - sit on that line), meeting
  // at the Mall zone as a natural central hub. Every other zone gets a
  // direct addPath connector into this spine or into a nearby zone, so the
  // whole 18-zone map is one connected network, not scattered islands.
  function addRoadNetwork(THREE, scene, mat) {
    [
      ["Main Road NS", [0, 0.01, 8], [7, 0.08, 100]],
      ["Main Road EW", [30, 0.02, -32], [162, 0.08, 7]]
    ].forEach(([name, position, scale]) => addBox(THREE, scene, name, position, scale, mat.road, true));

    [
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
    ].forEach(([x1, z1, x2, z2]) => addPath(THREE, scene, [x1, z1], [x2, z2], 1.3, mat.path));

    for (let z = -35; z <= 57; z += 6) addBox(THREE, scene, "Road Center Line NS", [0, 0.13, z], [0.25, 0.04, 2.15], mat.roadLine, true);
    for (let x = -50; x <= 110; x += 6) addBox(THREE, scene, "Road Center Line EW", [x, 0.14, -32], [2.15, 0.04, 0.25], mat.roadLine, true);
    addCrosswalk(THREE, scene, [0, -28], mat, "x");
    addCrosswalk(THREE, scene, [-4, -32], mat, "z");
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
    addPlane(THREE, scene, "Chinatown Street Floor", [-10, 0.02, -14], [15, 10], mat.curbWarm);

    const shophouses = [
      { name: "Chinatown Shophouse Rose", x: -16.2, height: 6.6, color: mat.gym },
      { name: "Chinatown Shophouse Ochre", x: -12.2, height: 7.0, color: mat.signGold },
      { name: "Chinatown Shophouse Teal", x: -8.2, height: 6.4, color: mat.hospitalAccent },
      { name: "Chinatown Shophouse Cream", x: -4.2, height: 6.8, color: mat.hdb }
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
    addPlane(THREE, scene, "Little India Street Floor", [10, 0.02, 14], [15, 10], mat.curbWarm);

    const shophouses = [
      { name: "Little India Shophouse Blue", x: 3.8, height: 6.6, color: mat.hdbAccent },
      { name: "Little India Shophouse Saffron", x: 7.8, height: 7.0, color: mat.signGold },
      { name: "Little India Shophouse Magenta", x: 11.8, height: 6.4, color: mat.mall },
      { name: "Little India Shophouse Cream", x: 15.8, height: 6.8, color: mat.hdb }
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

    addBox(THREE, scene, "Little India Temple Base", [10, 1.1, 17.3], [3.2, 2.2, 3.0], mat.signGold);
    addCylinder(THREE, scene, "Little India Temple Spire", [10, 3.4, 17.3], [1.1, 2.6, 4], mat.mrt);
    addFlowerBed(THREE, scene, [3.4, 9.2], 3.2, mat);
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
    addBuildingCore(THREE, scene, "Bugis Heritage Shophouse B", [21.6, 3.0, -3], [3.6, 6.0, 3.8], mat.signGold, mat, "shophouse");
    addBox(THREE, scene, "Bugis Heritage Shophouse B Roof", [21.6, 6.2, -3], [4.0, 0.4, 4.2], mat.roofDark);
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
    addBuildingCore(THREE, scene, "Woodlands HDB Block B", [baseX - 19, 7.5, baseZ - 3], [5.2, 15, 4.2], mat.hdbAccent, mat, "hdb");
    addFlowerBed(THREE, scene, [baseX - 13, baseZ + 8], 4, mat);

    // Estate expansion: a real multi-block neighbourhood instead of just the
    // 2 blocks above - 12 more, laid out as a 3x4 grid south of the
    // interchange/mall (clear of the separate Home zone's own building
    // footprint further southwest). Swapped for real modelled buildings in
    // loadDistrictAssetSamples(), cycling through the same 3 Quaternius
    // Downtown City MegaKit files as the original 2 blocks/mall above.
    const estateGrid = [
      { name: "Woodlands Estate Block C", x: -16, z: -20, color: mat.hdb },
      { name: "Woodlands Estate Block D", x: -9, z: -20, color: mat.hdbAccent },
      { name: "Woodlands Estate Block E", x: -2, z: -20, color: mat.hdb },
      { name: "Woodlands Estate Block F", x: 5, z: -20, color: mat.hdbAccent },
      { name: "Woodlands Estate Block G", x: -16, z: -13, color: mat.hdbAccent },
      { name: "Woodlands Estate Block H", x: -9, z: -13, color: mat.hdb },
      { name: "Woodlands Estate Block I", x: -2, z: -13, color: mat.hdbAccent },
      { name: "Woodlands Estate Block J", x: 5, z: -13, color: mat.hdb },
      { name: "Woodlands Estate Block K", x: -16, z: -6, color: mat.hdb },
      { name: "Woodlands Estate Block L", x: -9, z: -6, color: mat.hdbAccent },
      { name: "Woodlands Estate Block M", x: -2, z: -6, color: mat.hdb },
      { name: "Woodlands Estate Block N", x: 5, z: -6, color: mat.hdbAccent }
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
    addBox(THREE, scene, "Food Stall Counter", [position[0], 0.9, position[1]], [2.7, 1.2, 0.9], mat.curbWarm);
    addBox(THREE, scene, "Food Stall Menu Board", [position[0], 2.0, position[1] - 0.52], [2.45, 0.86, 0.12], mat.screen);
    addText(THREE, scene, label, [position[0] - 1.08, 2.12, position[1] - 0.72], 0.28, 0xffef84);
    addCylinder(THREE, scene, "Food Stall Hanging Light", [position[0], 2.75, position[1] + 0.15], [0.22, 0.16, 16], mat.lampGlow);
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
    addCylinder(THREE, scene, "Street Light Pole", [position[0], 1.5, position[1]], [0.08, 3, 10], mat.lamp);
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

    parts.body = new THREE.Group();
    group.add(parts.body);

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
    group.add(parts.head);

    parts.hair = new THREE.Group();
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 12), mat.hair);
    hairCap.scale.y = 0.48;
    const fringe = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 5), mat.hair);
    fringe.position.set(0.16, -0.05, -0.25);
    fringe.rotation.x = Math.PI * 0.72;
    parts.hair.add(hairCap, fringe);
    group.add(parts.hair);

    parts.leftArm = makeLimb(THREE, mat.skin, [-0.55, 1.25, 0], 0.12, 0.72);
    parts.rightArm = makeLimb(THREE, mat.skin, [0.55, 1.25, 0], 0.12, 0.72);
    parts.leftLeg = makeLimb(THREE, mat.outfit, [-0.2, 0.52, 0], 0.14, 0.86);
    parts.rightLeg = makeLimb(THREE, mat.outfit, [0.2, 0.52, 0], 0.14, 0.86);
    group.add(parts.leftArm, parts.rightArm, parts.leftLeg, parts.rightLeg);

    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.42), mat.shoes);
    leftShoe.position.set(-0.2, 0.06, -0.06);
    const rightShoe = leftShoe.clone();
    rightShoe.position.x = 0.2;
    group.add(leftShoe, rightShoe);
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
      getWeatherPresentation
    }
  };
})();
