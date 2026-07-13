(function () {
  const locationZones = [
    { id: "home", name: "Home", x: -24, z: 17, radius: 5.4 },
    { id: "gym", name: "Gym", x: -9, z: 20, radius: 4.5 },
    { id: "work", name: "Office", x: 18, z: 18, radius: 5 },
    { id: "food", name: "Food Court", x: -22, z: -13, radius: 5.4 },
    { id: "mall", name: "Shopping Mall", x: 18, z: -12, radius: 5.5 },
    { id: "park", name: "Park", x: 2, z: -22, radius: 6.2 },
    { id: "library", name: "Library", x: -25, z: 2, radius: 4.5 },
    { id: "hospital", name: "Hospital", x: 30, z: 12, radius: 4.8 },
    { id: "cafe", name: "Cafe", x: -9, z: -24, radius: 4 },
    { id: "beach", name: "Beach", x: 24, z: -30, radius: 5 },
    { id: "airport", name: "Airport", x: 35, z: -1, radius: 5.3 },
    { id: "train", name: "Train Station", x: 4, z: -3.5, radius: 4.6 },
    { id: "university", name: "University", x: -34, z: -7, radius: 5 }
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
      window.LifeVerseRenderPipeline.configureAtmosphere(THREE, scene, { fogColor: 0xd9efff, fogNear: 34, fogFar: 92 });
    } else {
      scene.fog = new THREE.Fog(0xd9efff, 34, 92);
    }

    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 180);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    if (window.LifeVerseRenderPipeline && window.LifeVerseRenderPipeline.configureRenderer) {
      window.LifeVerseRenderPipeline.configureRenderer(THREE, renderer, { exposure: 0.72, shadows: true, maxPixelRatio: 2 });
    } else {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace || renderer.outputColorSpace;
      renderer.toneMappingExposure = 0.72;
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

    const celOutlineEnabled = new URLSearchParams(location.search).get("cel") !== "0";
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
        player.group.position.x = clamp(player.group.position.x, -38, 38);
        player.group.position.z = clamp(player.group.position.z, -33, 27);
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
    const library = window.LifeVerseAssets && window.LifeVerseAssets.createMaterialLibrary
      ? window.LifeVerseAssets.createMaterialLibrary(THREE, { pipeline: "toon" })
      : null;
    const shared = (key, fallback) => library && library.get ? library.get(key) : fallback();
    const make = (color, emissive = 0x000000, roughness = 0.7) => new THREE.MeshToonMaterial({ color, emissive });
    const standard = (color, emissive = 0x000000, roughness = 0.68, metalness = 0.02) => new THREE.MeshStandardMaterial({ color, emissive, roughness, metalness });
    const glass = (color) => new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.22,
      metalness: 0.04,
      transparent: true,
      opacity: 0.78,
      transmission: 0.08
    });
    const transparent = (color, opacity = 0.28) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });

    return {
      library,
      grass: shared("grass", () => make(0x92d36f)),
      ground: make(0xead8a8),
      warmGround: make(0xf8dfad),
      road: shared("road", () => standard(0x1c2028)),
      roadLine: make(0xffef84, 0x332a00),
      sidewalk: shared("concrete", () => make(0xcbbf9d)),
      curb: shared("stone", () => make(0xe6dac0)),
      curbWarm: make(0xf3dfad),
      hdb: make(0xbfdfff),
      hdbAccent: make(0xffd0d9),
      hdbBalcony: make(0xf4ead7),
      gym: make(0xff806f),
      work: make(0x6fa3ff),
      food: make(0xffc95b, 0x2c1700),
      mall: make(0xb69cff),
      park: make(0x43bf70),
      library: make(0x93c7ff),
      hospital: make(0xdcecf5),
      hospitalAccent: make(0x7ed9ff),
      cafe: make(0xffb678, 0x311600),
      university: make(0xffe4a3),
      airport: make(0xbcd1e6),
      airportAccent: make(0x3b77d5, 0x03122a),
      sand: make(0xffdc8a),
      water: shared("water", () => standard(0x3bb8ff, 0x00476f, 0.38, 0.02)),
      path: make(0xc9b991),
      flowerPink: make(0xff79b4, 0x2a0012),
      flowerYellow: make(0xffe66d, 0x2f2500),
      flowerPurple: make(0xb28cff, 0x17002e),
      bush: make(0x3f9f5e),
      wood: shared("wood", () => make(0x9b6336)),
      furniture: make(0xd48359),
      bookRed: make(0xe65151),
      bookBlue: make(0x4b85ff),
      bookGreen: make(0x49c482),
      metal: shared("metal", () => standard(0x98a4ad, 0x000000, 0.42, 0.12)),
      equipment: shared("plastic", () => make(0x2f3545)),
      screen: standard(0x171d2e, 0x122462),
      poster: make(0xfff0b0),
      signBlue: make(0x2f6dff, 0x00184b),
      signGreen: make(0x3ac681, 0x002a10),
      signGold: make(0xffc95b, 0x251100),
      roofDark: make(0x404858),
      window: standard(0xfff2a0, 0x8c6f00),
      glass: shared("glass", () => glass(0xbfe9ff)),
      mrt: make(0xe61d33, 0x4b0007),
      rail: standard(0xdde7ef),
      trunk: make(0x8a5227),
      lamp: standard(0x272b31),
      lampGlow: standard(0xfff0a6, 0xffd36a),
      cloud: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78, depthWrite: false }),
      rain: new THREE.PointsMaterial({ color: 0xbfe9ff, size: 0.045, transparent: true, opacity: 0.0, depthWrite: false }),
      dust: new THREE.PointsMaterial({ color: 0xfff0b8, size: 0.055, transparent: true, opacity: 0.22, depthWrite: false }),
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
    gradient.addColorStop(0, "#9ed8ff");
    gradient.addColorStop(0.48, "#dff4ff");
    gradient.addColorStop(1, "#fff2cf");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
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
      skyColor: new THREE.Color(0xbfe7ff),
      fogColor: new THREE.Color(0xd9efff),
      targetSkyColor: new THREE.Color(0xbfe7ff),
      targetFogColor: new THREE.Color(0xd9efff),
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
        sky: 0xbfe7ff,
        fog: 0xd9efff,
        hemi: 0.98,
        sun: 1.02,
        lamp: 0.24,
        exposure: 0.74,
        sunPosition: [-12, 24, 12]
      };
    }
    if (minutes >= 660 && minutes < 1020) {
      return {
        phase: "afternoon",
        sky: 0xa9dfff,
        fog: 0xd1f3ff,
        hemi: 1.02,
        sun: 1.12,
        lamp: 0.18,
        exposure: 0.76,
        sunPosition: [-6, 28, 6]
      };
    }
    if (minutes >= 1020 && minutes < 1170) {
      return {
        phase: "sunset",
        sky: 0xffb980,
        fog: 0xffd4a8,
        hemi: 0.82,
        sun: 0.86,
        lamp: 0.78,
        exposure: 0.72,
        sunPosition: [14, 12, -8]
      };
    }
    return {
      phase: "night",
      sky: 0x1d2b57,
      fog: 0x17223f,
      hemi: 0.5,
      sun: 0.22,
      lamp: 1.9,
      exposure: 0.66,
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

  function createDistrict(THREE, scene, mat) {
    addPlane(THREE, scene, "Soft Anime Town Ground", [0, -0.04, -3], [88, 76], mat.ground);
    addPlane(THREE, scene, "North Residential Green", [-24, -0.02, 14], [23, 25], mat.grass);
    addPlane(THREE, scene, "Campus Green", [-31, -0.015, -8], [18, 18], mat.grass);
    addPlane(THREE, scene, "Park Green", [1, -0.01, -23], [22, 18], mat.park);
    addPlane(THREE, scene, "Beach Sand", [26, 0, -31], [25, 10], mat.sand);
    addPlane(THREE, scene, "Shallow Anime Sea", [26, 0.015, -37], [26, 8], mat.water);

    addRoadNetwork(THREE, scene, mat);
    addHdbHome(THREE, scene, mat);
    addGym(THREE, scene, mat);
    addWorkTower(THREE, scene, mat);
    addFoodCourt(THREE, scene, mat);
    addMall(THREE, scene, mat);
    addPark(THREE, scene, mat);
    addLibrary(THREE, scene, mat);
    addHospital(THREE, scene, mat);
    addCafe(THREE, scene, mat);
    addBeach(THREE, scene, mat);
    addAirport(THREE, scene, mat);
    addTrainStation(THREE, scene, mat);
    addUniversity(THREE, scene, mat);
    addStreetLife(THREE, scene, mat);
    addZones(THREE, scene, mat);
  }

  // Volume 5 Anime World Remaster, step 2: swap a couple of procedural placeholder
  // buildings for real CC0 low-poly GLB models, one location at a time, while the
  // rest of the hand-built district (furniture, stalls, signs) stays untouched.
  async function loadDistrictAssetSamples(THREE, scene, assetManager, state) {
    if (!assetManager) return;
    const ready = await assetManager.ensureGltfLoader();
    if (!ready || (state && state.destroyed)) return;

    const swaps = [
      {
        url: "assets/environment/hdb-block.glb",
        hideNamePrefixes: ["HDB Home Block A", "HDB Home Block B"],
        position: [-24, 0, 19.2],
        scale: [5.5, 5.5, 5.5]
      },
      {
        url: "assets/environment/office-tower.glb",
        hideNamePrefixes: ["Office Tower"],
        position: [18, 0, 20],
        scale: [5.5, 5.5, 5.5]
      }
    ];

    for (const swap of swaps) {
      try {
        const asset = await assetManager.loadModel(swap.url, {
          toonify: true,
          position: swap.position,
          scale: swap.scale,
          label: swap.url
        });
        if (state && state.destroyed) return;
        if (!asset || asset.fallback || !asset.scene) continue;
        scene.add(asset.scene);
        scene.children.forEach((child) => {
          if (swap.hideNamePrefixes.some((prefix) => child.name && child.name.startsWith(prefix))) {
            child.visible = false;
          }
        });
      } catch (error) {
        console.warn(`[Life Sim] Optional district asset swap failed: ${swap.url}`, error);
      }
    }
  }

  function addRoadNetwork(THREE, scene, mat) {
    [
      ["Main Road NS", [0, 0.01, -2], [6.8, 0.08, 65]],
      ["Main Road EW", [0, 0.02, 0], [74, 0.08, 6.8]],
      ["Residential Lane", [-20, 0.025, 8], [5.2, 0.08, 27]],
      ["Airport Access Road", [28, 0.025, 2], [5.2, 0.08, 35]]
    ].forEach(([name, position, scale]) => addBox(THREE, scene, name, position, scale, mat.road, true));

    [
      [0, 7, 72, 1.8],
      [0, -7, 72, 1.8],
      [-7, -2, 1.8, 62],
      [7, -2, 1.8, 62],
      [-26, 8, 1.6, 28],
      [-14, 8, 1.6, 28],
      [22, 2, 1.6, 36],
      [34, 2, 1.6, 36]
    ].forEach(([x, z, sx, sz]) => addBox(THREE, scene, "Anime Sidewalk", [x, 0.08, z], [sx, 0.12, sz], mat.sidewalk, true));

    [
      [-30, -6, -21, -13],
      [-15, -13, -8, -24],
      [7, -20, 17, -13],
      [18, -18, 25, -29],
      [-15, 18, -9, 20],
      [18, 12, 30, 12]
    ].forEach(([x1, z1, x2, z2]) => addPath(THREE, scene, [x1, z1], [x2, z2], 1.15, mat.path));

    for (let z = -29; z <= 28; z += 6) addBox(THREE, scene, "Road Center Line NS", [0, 0.13, z], [0.25, 0.04, 2.15], mat.roadLine, true);
    for (let x = -34; x <= 34; x += 6) addBox(THREE, scene, "Road Center Line EW", [x, 0.14, 0], [2.15, 0.04, 0.25], mat.roadLine, true);
    [-20, 0, 28].forEach((x) => addCrosswalk(THREE, scene, [x, -4.2], mat, "x"));
    [-7, 7].forEach((z) => addCrosswalk(THREE, scene, [-4.2, z], mat, "z"));
  }

  function addHdbHome(THREE, scene, mat) {
    addBuildingCore(THREE, scene, "HDB Home Block A", [-27, 8, 19], [6, 16, 4.5], mat.hdb, mat);
    addBuildingCore(THREE, scene, "HDB Home Block B", [-21, 6.3, 19.4], [5, 12.6, 4], mat.hdbAccent, mat);
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

  function addGym(THREE, scene, mat) {
    addBox(THREE, scene, "Gym Fitness Studio", [-9, 2, 22], [8, 4, 5.4], mat.gym);
    addBox(THREE, scene, "Gym Dark Toon Roof", [-9, 4.35, 22], [8.7, 0.5, 6.1], mat.roofDark);
    addBox(THREE, scene, "Gym Mirror Wall", [-9, 2.25, 19.18], [6.1, 2.4, 0.14], mat.glass);
    addTreadmill(THREE, scene, [-11.3, 19.9], mat);
    addTreadmill(THREE, scene, [-9.1, 19.9], mat);
    addBarbell(THREE, scene, [-6.5, 21.9], mat);
    addBox(THREE, scene, "Gym Yoga Mat", [-10.9, 0.22, 23.8], [1.4, 0.07, 2.0], mat.signGreen, true);
    addBox(THREE, scene, "Gym Locker Row", [-5.4, 1.4, 23.2], [0.7, 2.4, 3.2], mat.metal);
    addSignBoard(THREE, scene, "Gym Sign", "GYM", [-11.3, 3.55, 18.8], mat.signGold, 0x151515);
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

  function addFoodCourt(THREE, scene, mat) {
    addBox(THREE, scene, "Food Court Tile Floor", [-22, 0.22, -15], [12, 0.44, 8.5], mat.food);
    addBox(THREE, scene, "Food Court Warm Roof", [-22, 3.45, -15], [13, 0.45, 9.2], mat.signGold);
    [-26, -23, -20].forEach((x, index) => addFoodStall(THREE, scene, [x, -18.6], ["NOODLES", "RICE", "DRINKS"][index], mat));
    for (let x = -26; x <= -18; x += 4) {
      for (let z = -16.3; z <= -12.8; z += 2.8) addTableSet(THREE, scene, [x, z], mat);
    }
    addTray(THREE, scene, [-24, -13.2], mat);
    addTray(THREE, scene, [-20, -16.3], mat);
    addSignBoard(THREE, scene, "Food Court Sign", "FOOD COURT", [-26.8, 4.08, -19.7], mat.curbWarm, 0x111111);
  }

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

  function addHospital(THREE, scene, mat) {
    addBox(THREE, scene, "Hospital Clean Main Wing", [30, 3.2, 12], [9, 6.4, 6], mat.hospital);
    addBox(THREE, scene, "Hospital Blue Entrance", [30, 1.6, 8.72], [5.8, 3.2, 0.35], mat.hospitalAccent);
    addBox(THREE, scene, "Hospital Reception Desk", [27.6, 0.75, 8.1], [2.4, 0.65, 0.45], mat.furniture);
    addWaitingChairs(THREE, scene, [31.4, 8.4], mat);
    addBox(THREE, scene, "Hospital Doctor Room Door", [33.4, 1.2, 10.2], [0.16, 2.1, 1.0], mat.signBlue);
    addSignBoard(THREE, scene, "Hospital Cross Sign", "+ HOSPITAL", [27.1, 4.6, 8.36], mat.hospitalAccent, 0xffffff);
  }

  function addCafe(THREE, scene, mat) {
    addBox(THREE, scene, "Cafe Cozy Shop", [-9, 1.8, -25.5], [7.2, 3.6, 4.5], mat.cafe);
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
    addSignBoard(THREE, scene, "Beach Sign", "BEACH", [21.2, 0.95, -33.0], mat.curbWarm, 0x111111);
  }

  function addAirport(THREE, scene, mat) {
    addBox(THREE, scene, "Airport Terminal", [35, 2.5, -1], [8.8, 5.0, 7.2], mat.airport);
    addBox(THREE, scene, "Airport Glass Departures", [35, 2.45, -4.78], [7.0, 2.9, 0.18], mat.glass);
    addBoxRotated(THREE, scene, "Airport Runway", [35, 0.05, -9.2], [14.5, 0.08, 3.2], mat.road, 0.1, true);
    for (let x = 30; x <= 40; x += 2.5) addBox(THREE, scene, "Airport Runway Marking", [x, 0.13, -9.2], [1.1, 0.04, 0.18], mat.curb, true);
    addWaitingChairs(THREE, scene, [32.2, -4.9], mat);
    addBox(THREE, scene, "Airport Luggage Cart", [37.5, 0.55, -5.2], [1.1, 0.55, 0.7], mat.metal);
    addBox(THREE, scene, "Airport Control Tower", [40.2, 3.2, 2.6], [1.6, 6.4, 1.6], mat.airportAccent);
    addBox(THREE, scene, "Airport Tower Glass", [40.2, 6.6, 2.6], [2.2, 1.1, 2.2], mat.glass);
    addSignBoard(THREE, scene, "Airport Sign", "AIRPORT", [31.7, 4.4, -5.05], mat.signBlue, 0xffffff);
  }

  function addTrainStation(THREE, scene, mat) {
    addBox(THREE, scene, "Train Station Platform", [4, 0.32, -3.5], [8.8, 0.64, 4.8], mat.mrt);
    addBox(THREE, scene, "Train Station Roof", [4, 2.35, -3.5], [9.8, 0.45, 5.6], mat.roofDark);
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

  function addBuildingCore(THREE, scene, name, position, scale, material, mat) {
    addBox(THREE, scene, name, position, scale, material);
    const floors = Math.max(3, Math.round(scale[1] / 2));
    const columns = Math.max(3, Math.round(scale[0] / 1.4));
    for (let floor = 0; floor < floors; floor++) {
      const y = position[1] - scale[1] * 0.38 + floor * (scale[1] * 0.72 / Math.max(1, floors - 1));
      addBox(THREE, scene, `${name} Balcony`, [position[0], y - 0.42, position[2] - scale[2] * 0.53], [scale[0] * 0.84, 0.16, 0.22], mat.hdbBalcony, true);
      for (let col = 0; col < columns; col++) {
        const x = position[0] - scale[0] * 0.34 + col * (scale[0] * 0.68 / Math.max(1, columns - 1));
        addBox(THREE, scene, `${name} Window`, [x, y, position[2] - scale[2] * 0.535], [0.42, 0.58, 0.06], mat.window, true);
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
