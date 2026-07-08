(function () {
  const locationZones = [
    { id: "home", name: "Home", x: -18, z: 12, radius: 5.2 },
    { id: "gym", name: "Gym", x: -4, z: 18, radius: 4.4 },
    { id: "work", name: "Work", x: 16, z: 13, radius: 5 },
    { id: "food", name: "Food Court", x: -17, z: -12, radius: 5.2 },
    { id: "mall", name: "Shopping Mall", x: 16, z: -12, radius: 5.4 },
    { id: "park", name: "Park", x: 1, z: -20, radius: 6.3 }
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
    scene.fog = new THREE.Fog(0xd9efff, 34, 92);

    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 180);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace || renderer.outputColorSpace;
    renderer.toneMappingExposure = 1.08;
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
      pitch: 0.54,
      smoothMove: { x: 0, y: 0 },
      moveSpeed: 0,
      walkPhase: 0,
      footstepTimer: 0,
      isMoving: false,
      mixers: [],
      productionAssetsLoaded: false,
      cameraPosition: new THREE.Vector3(0, 8, -16),
      cameraLookAt: new THREE.Vector3(0, 1.55, -7),
      cameraShake: 0,
      presentation: null
    };

    const ui = {
      joystick: host.querySelector("[data-sim-joystick]"),
      knob: host.querySelector("[data-sim-joystick-knob]"),
      lookPad: host.querySelector("[data-sim-look-pad]")
    };

    const materials = createMaterials(THREE);
    const lighting = createLighting(THREE, scene);
    state.presentation = createPresentationState(THREE, scene, renderer, lighting, materials, host);

    const player = createPlayer(THREE, materials);
    player.group.position.set(0, 0, -7);
    scene.add(player.group);
    loadProductionAssets(THREE, scene, materials, player, state, root).then((loaded) => {
      if (state.destroyed) return;
      state.productionAssetsLoaded = loaded;
      if (!loaded) {
        createDistrict(THREE, scene, materials);
        setAssetStatus(root, "Preview district active. Volume 5 can swap in licensed 3D assets.", "warning");
      }
      registerPresentationObjects(scene, state.presentation);
    });

    const clock = new THREE.Clock();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    resize();

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
    }

    function animate() {
      if (state.destroyed) return;
      const delta = Math.min(clock.getDelta(), 0.034);
      const elapsed = clock.elapsedTime;
      state.mixers.forEach((mixer) => mixer.update(delta));
      updateMovement(delta);
      updateCharacter(delta, player);
      updateWorldPresentation(delta, elapsed, state, scene, renderer, options.getLifeVerseState);
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
        player.group.position.x = clamp(player.group.position.x, -26, 26);
        player.group.position.z = clamp(player.group.position.z, -27, 25);
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
        renderer.dispose();
        root.innerHTML = "";
      }
    };
  }

  function createMaterials(THREE) {
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
      grass: make(0x92d36f),
      ground: make(0xf4eccc),
      road: standard(0x1c2028),
      roadLine: make(0xffef84, 0x332a00),
      sidewalk: make(0xd8d0b4),
      curb: make(0xf9f3df),
      hdb: make(0xbfdfff),
      hdbAccent: make(0xffd0d9),
      hdbBalcony: make(0xffffff),
      gym: make(0xff806f),
      work: make(0x6fa3ff),
      food: make(0xffc95b, 0x2c1700),
      mall: make(0xb69cff),
      park: make(0x43bf70),
      window: standard(0xfff2a0, 0x8c6f00),
      glass: glass(0xbfe9ff),
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
    const hemi = new THREE.HemisphereLight(0xffffff, 0x91ad82, 1.75);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(-12, 24, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -38;
    sun.shadow.camera.right = 38;
    sun.shadow.camera.top = 38;
    sun.shadow.camera.bottom = -38;
    scene.add(sun);

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
        hemi: 1.85,
        sun: 2.2,
        lamp: 0.24,
        exposure: 1.12,
        sunPosition: [-12, 24, 12]
      };
    }
    if (minutes >= 660 && minutes < 1020) {
      return {
        phase: "afternoon",
        sky: 0xa9dfff,
        fog: 0xd1f3ff,
        hemi: 1.78,
        sun: 2.35,
        lamp: 0.18,
        exposure: 1.08,
        sunPosition: [-6, 28, 6]
      };
    }
    if (minutes >= 1020 && minutes < 1170) {
      return {
        phase: "sunset",
        sky: 0xffb980,
        fog: 0xffd4a8,
        hemi: 1.32,
        sun: 1.65,
        lamp: 0.78,
        exposure: 1.02,
        sunPosition: [14, 12, -8]
      };
    }
    return {
      phase: "night",
      sky: 0x1d2b57,
      fog: 0x17223f,
      hemi: 0.62,
      sun: 0.28,
      lamp: 1.9,
      exposure: 0.92,
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

  async function loadProductionAssets(THREE, scene, mat, player, state, root) {
    try {
      const manifest = await loadLifeSimManifest();
      if (!manifest || !manifest.enabled) return false;
      await ensureGltfLoader(THREE);
      if (!THREE.GLTFLoader) {
        setAssetStatus(root, "Production assets are enabled, but GLTFLoader did not load. Check the GLTFLoader script in index.html.", "error");
        return false;
      }

      const loader = new THREE.GLTFLoader();
      setAssetStatus(root, "Loading production 3D assets...", "loading");

      let loadedCount = 0;
      if (manifest.environment && manifest.environment.url) {
        const environment = await loadGltf(loader, manifest.environment.url);
        prepareAssetModel(THREE, environment.scene, manifest.environment, mat);
        scene.add(environment.scene);
        loadedCount += 1;
      }

      const locations = Array.isArray(manifest.locationModels) ? manifest.locationModels : [];
      for (const location of locations) {
        if (!location || !location.url) continue;
        const gltf = await loadGltf(loader, location.url);
        prepareAssetModel(THREE, gltf.scene, location, mat);
        scene.add(gltf.scene);
        loadedCount += 1;
      }

      if (manifest.character && manifest.character.url) {
        const character = await loadGltf(loader, manifest.character.url);
        installCharacterAsset(THREE, loader, player, character, manifest.character, state, mat);
        loadedCount += 1;
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

  async function ensureGltfLoader(THREE) {
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
        console.warn(`[Life Sim] Could not load GLTFLoader from ${url}:`, error);
      }
    }
    return false;
  }

  function injectScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.remove();
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function loadLifeSimManifest() {
    const response = await fetch("assets/life-sim/asset-manifest.json", { cache: "no-store" });
    if (!response.ok) return null;
    return response.json();
  }

  function loadGltf(loader, url) {
    return new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });
  }

  function prepareAssetModel(THREE, model, config = {}, mat) {
    applyTransform(model, config);
    model.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      if (config.toonify) node.material = toonifyMaterial(THREE, node.material, mat);
    });
  }

  function applyTransform(model, config = {}) {
    const position = config.position || [0, 0, 0];
    const rotation = config.rotation || [0, 0, 0];
    const scale = config.scale || [1, 1, 1];
    model.position.set(Number(position[0] || 0), Number(position[1] || 0), Number(position[2] || 0));
    model.rotation.set(Number(rotation[0] || 0), Number(rotation[1] || 0), Number(rotation[2] || 0));
    model.scale.set(Number(scale[0] || 1), Number(scale[1] || 1), Number(scale[2] || 1));
  }

  function toonifyMaterial(THREE, sourceMaterial, mat) {
    if (Array.isArray(sourceMaterial)) return sourceMaterial.map((material) => toonifyMaterial(THREE, material, mat));
    if (!sourceMaterial) return mat.hdb;
    const color = sourceMaterial.color ? sourceMaterial.color.clone() : new THREE.Color(0xffffff);
    const toon = new THREE.MeshToonMaterial({
      color,
      map: sourceMaterial.map || null,
      transparent: Boolean(sourceMaterial.transparent),
      opacity: typeof sourceMaterial.opacity === "number" ? sourceMaterial.opacity : 1
    });
    toon.name = `${sourceMaterial.name || "asset"} Toon`;
    return toon;
  }

  async function installCharacterAsset(THREE, loader, player, characterGltf, config = {}, state, mat) {
    hideFallbackCharacter(player);
    const model = characterGltf.scene;
    prepareAssetModel(THREE, model, config, mat);
    player.group.add(model);
    player.realModel = model;
    player.actions = {};

    const clips = [...(characterGltf.animations || [])];
    const extraFiles = config.extraAnimationFiles || {};
    for (const [name, url] of Object.entries(extraFiles)) {
      if (!url) continue;
      try {
        const animationGltf = await loadGltf(loader, url);
        const clip = animationGltf.animations && animationGltf.animations[0];
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
    addPlane(THREE, scene, "Soft Anime Ground", [0, -0.03, 0], [62, 62], mat.ground);
    addPlane(THREE, scene, "Grass North West", [-22, 0, 0], [10, 54], mat.grass);
    addPlane(THREE, scene, "Grass East", [24, 0, 3], [8, 48], mat.grass);

    addRoad(THREE, scene, mat);
    addHdbHome(THREE, scene, mat);
    addGym(THREE, scene, mat);
    addWorkTower(THREE, scene, mat);
    addFoodCourt(THREE, scene, mat);
    addMall(THREE, scene, mat);
    addPark(THREE, scene, mat);
    addMrtEntrance(THREE, scene, mat);
    addStreetLife(THREE, scene, mat);
    addZones(THREE, scene, mat);
  }

  function addRoad(THREE, scene, mat) {
    addBox(THREE, scene, "Main Road NS", [0, 0.01, 0], [6.6, 0.08, 58], mat.road, true);
    addBox(THREE, scene, "Main Road EW", [0, 0.02, 0], [58, 0.08, 6.6], mat.road, true);
    addBox(THREE, scene, "Sidewalk North", [0, 0.08, 7], [52, 0.12, 1.8], mat.sidewalk, true);
    addBox(THREE, scene, "Sidewalk South", [0, 0.08, -7], [52, 0.12, 1.8], mat.sidewalk, true);
    addBox(THREE, scene, "Sidewalk West", [-7, 0.08, 0], [1.8, 0.12, 52], mat.sidewalk, true);
    addBox(THREE, scene, "Sidewalk East", [7, 0.08, 0], [1.8, 0.12, 52], mat.sidewalk, true);

    for (let z = -24; z <= 24; z += 6) addBox(THREE, scene, "Road Line", [0, 0.13, z], [0.25, 0.04, 2.2], mat.roadLine, true);
    for (let x = -24; x <= 24; x += 6) addBox(THREE, scene, "Road Line", [x, 0.14, 0], [2.2, 0.04, 0.25], mat.roadLine, true);
    for (let i = -5; i <= 5; i++) {
      addBox(THREE, scene, "Crosswalk NS", [i * 0.75, 0.16, -4.2], [0.36, 0.04, 1.55], mat.curb, true);
      addBox(THREE, scene, "Crosswalk EW", [-4.2, 0.17, i * 0.75], [1.55, 0.04, 0.36], mat.curb, true);
    }
  }

  function addHdbHome(THREE, scene, mat) {
    addBuildingCore(THREE, scene, "HDB Home Block A", [-20, 8, 17], [6, 16, 4.5], mat.hdb, mat);
    addBuildingCore(THREE, scene, "HDB Home Block B", [-14, 6.2, 17.5], [5, 12.4, 4], mat.hdbAccent, mat);
    addBox(THREE, scene, "HDB Void Deck", [-17.5, 1.1, 14.8], [8.5, 2.2, 3.2], mat.hdbBalcony);
    addText(THREE, scene, "HOME", [-20.4, 3.3, 12.35], 0.75, 0x111111);
  }

  function addGym(THREE, scene, mat) {
    addBox(THREE, scene, "Gym Rounded Base", [-4, 2, 21], [7, 4, 5], mat.gym);
    addCylinder(THREE, scene, "Gym Roof", [-4, 4.3, 21], [4.3, 0.35, 16], mat.curb, Math.PI / 2);
    addBox(THREE, scene, "Gym Glass", [-4, 2.25, 18.42], [5.3, 2.4, 0.14], mat.glass);
    addText(THREE, scene, "GYM", [-5.6, 3.4, 18.18], 0.72, 0xffffff);
  }

  function addWorkTower(THREE, scene, mat) {
    addBuildingCore(THREE, scene, "Work Tower", [16, 10, 17], [8, 20, 5], mat.work, mat);
    addBox(THREE, scene, "Work Lobby", [16, 1.8, 13.9], [9, 3.6, 2.2], mat.glass);
    addText(THREE, scene, "WORK", [13.8, 4, 12.62], 0.72, 0xffffff);
  }

  function addFoodCourt(THREE, scene, mat) {
    addBox(THREE, scene, "Food Court Floor", [-17, 0.25, -15], [10, 0.5, 7], mat.food);
    addBox(THREE, scene, "Food Court Roof", [-17, 3.4, -15], [11.5, 0.45, 8.2], mat.food);
    for (let x = -21; x <= -13; x += 4) {
      for (let z = -17; z <= -13; z += 3) addTableSet(THREE, scene, [x, z], mat);
    }
    addText(THREE, scene, "FOOD COURT", [-21.2, 4.05, -19.05], 0.58, 0x111111);
  }

  function addMall(THREE, scene, mat) {
    addBox(THREE, scene, "Mall Main", [16, 3.4, -16], [11, 6.8, 7], mat.mall);
    addBox(THREE, scene, "Mall Glass Front", [16, 3.1, -19.58], [8.5, 4.6, 0.16], mat.glass);
    addCylinder(THREE, scene, "Mall Atrium", [20.2, 3.4, -16], [2.2, 6.8, 24], mat.glass);
    addText(THREE, scene, "MALL", [13.9, 5.8, -19.9], 0.75, 0xffffff);
  }

  function addPark(THREE, scene, mat) {
    addPlane(THREE, scene, "Park Lawn", [1, 0.02, -20], [15, 10], mat.park);
    addBox(THREE, scene, "Park Path", [1, 0.11, -20], [12, 0.08, 1.15], mat.sidewalk, true);
    addBench(THREE, scene, [-3, -21.8], mat);
    addBench(THREE, scene, [4, -18.6], mat);
    addText(THREE, scene, "PARK", [-1.2, 0.55, -25.2], 0.8, 0x111111);
  }

  function addMrtEntrance(THREE, scene, mat) {
    addBox(THREE, scene, "MRT Entrance Base", [4.8, 0.35, -4.8], [5, 0.7, 4], mat.mrt);
    addBox(THREE, scene, "MRT Entrance Roof", [4.8, 2.1, -4.8], [5.4, 0.45, 4.4], mat.mrt);
    addBox(THREE, scene, "MRT Glass Side", [3.1, 1.3, -4.8], [0.18, 1.9, 3.3], mat.glass);
    addText(THREE, scene, "MRT", [3.55, 2.45, -7.15], 0.75, 0xffffff);
  }

  function addStreetLife(THREE, scene, mat) {
    [[-24, 7], [-24, -7], [24, 7], [24, -7], [-9, 23], [9, 23], [-9, -25], [9, -25]].forEach(([x, z]) => addStreetLight(THREE, scene, [x, z], mat));
    [[-25, 17], [-10, 23], [25, 18], [25, -20], [-25, -18], [0, -26], [10, -24], [-12, -25]].forEach(([x, z]) => addTree(THREE, scene, [x, z], mat));
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
