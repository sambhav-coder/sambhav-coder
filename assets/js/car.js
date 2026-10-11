/* ==========================================================================
   Interactive 3D supercar — vanilla Three.js (r160 UMD, vendored)
   No external network calls. Degrades gracefully without WebGL.
   ========================================================================== */
(function () {
  "use strict";

  var sceneEl = document.getElementById("scene");
  var canvas = document.getElementById("car-canvas");
  var labelEl = document.getElementById("hotlabel");
  var resetBtn = document.getElementById("reset");
  if (!sceneEl || !canvas || !window.THREE) {
    if (sceneEl) sceneEl.classList.add("no-webgl");
    return;
  }

  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (err) {
    sceneEl.classList.add("no-webgl");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);

  var target = new THREE.Vector3(0, 0.62, 0);
  var camYaw = 0.92, camPitch = 0.30, camDist = 8.4;
  var camDistMin = 5.6, camDistMax = 11.5;

  function placeCamera() {
    camera.position.set(
      target.x + camDist * Math.cos(camPitch) * Math.sin(camYaw),
      target.y + camDist * Math.sin(camPitch),
      target.z + camDist * Math.cos(camPitch) * Math.cos(camYaw)
    );
    camera.lookAt(target);
  }
  placeCamera();

  /* ---------- lighting (studio, fixed while the car rotates) ---------- */
  scene.add(new THREE.HemisphereLight(0x2f56b0, 0x05070f, 0.62));

  var key = new THREE.DirectionalLight(0xd6e4ff, 1.7);
  key.position.set(6, 9, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 40;
  key.shadow.camera.left = -7; key.shadow.camera.right = 7;
  key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
  key.shadow.bias = -0.0006;
  scene.add(key);

  var rim = new THREE.DirectionalLight(0xff6a7e, 1.15);
  rim.position.set(-7, 4, -6);
  scene.add(rim);

  var fill = new THREE.DirectionalLight(0x247bff, 0.85);
  fill.position.set(-5, 3.5, 7);
  scene.add(fill);

  var under = new THREE.PointLight(0x247bff, 0.7, 12, 2);
  under.position.set(0, 0.35, 0);
  scene.add(under);

  /* ---------- ground ---------- */
  var ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x060a14, roughness: 0.92, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ---------- car ---------- */
  var car = new THREE.Group();
  scene.add(car);

  var paint = new THREE.MeshStandardMaterial({ color: 0x12224a, metalness: 0.88, roughness: 0.26 });
  var paintDark = new THREE.MeshStandardMaterial({ color: 0x0a1430, metalness: 0.8, roughness: 0.35 });
  var glassMat = new THREE.MeshStandardMaterial({ color: 0x0b1f3a, metalness: 0.72, roughness: 0.12, transparent: true, opacity: 0.58 });
  var tireMat = new THREE.MeshStandardMaterial({ color: 0x0a0d16, metalness: 0.25, roughness: 0.95 });
  var rimMat = new THREE.MeshStandardMaterial({ color: 0xc9d6f0, metalness: 0.95, roughness: 0.22 });
  var blueGlow = new THREE.MeshStandardMaterial({ color: 0x0a1a3a, emissive: 0x7fc1ff, emissiveIntensity: 2.4, roughness: 0.4 });
  var redGlow = new THREE.MeshStandardMaterial({ color: 0x2a0810, emissive: 0xff354f, emissiveIntensity: 2.6, roughness: 0.4 });
  var accentBlue = new THREE.MeshStandardMaterial({ color: 0x0a1a3a, emissive: 0x247bff, emissiveIntensity: 1.4, roughness: 0.5 });

  // side profile silhouette (front at +X), extruded across Z
  function profile(pts) {
    var s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    return s;
  }

  var bodyPts = [
    [2.02, 0.17], [2.26, 0.30], [2.02, 0.50], [1.05, 0.58], [0.35, 0.66],
    [-0.02, 1.02], [-0.55, 1.08], [-1.20, 0.86], [-1.72, 0.74], [-2.12, 0.60],
    [-2.22, 0.32], [-2.16, 0.17]
  ];
  var bodyGeo = new THREE.ExtrudeGeometry(profile(bodyPts), {
    depth: 1.82, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, steps: 1
  });
  bodyGeo.translate(0, 0, -0.91);
  var body = new THREE.Mesh(bodyGeo, paint);
  body.castShadow = true;
  car.add(body);

  // greenhouse / glass band
  var glassPts = [
    [0.30, 0.68], [-0.02, 1.00], [-0.55, 1.04], [-1.14, 0.84], [-1.14, 0.70], [0.30, 0.70]
  ];
  var glassGeo = new THREE.ExtrudeGeometry(profile(glassPts), {
    depth: 1.60, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, steps: 1
  });
  glassGeo.translate(0, 0, -0.80);
  car.add(new THREE.Mesh(glassGeo, glassMat));

  // side accent light line
  [1, -1].forEach(function (sz) {
    var line = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.035, 0.02), accentBlue);
    line.position.set(-0.15, 0.30, sz * 0.93);
    line.castShadow = false;
    car.add(line);
  });

  // headlights (front, +X)
  [1, -1].forEach(function (sz) {
    var hl = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.34), blueGlow);
    hl.position.set(2.14, 0.44, sz * 0.60);
    car.add(hl);
  });
  var frontGlow = new THREE.PointLight(0x7fc1ff, 1.1, 9, 2);
  frontGlow.position.set(2.6, 0.5, 0);
  car.add(frontGlow);

  // taillight strip (rear, -X)
  var tail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, 1.55), redGlow);
  tail.position.set(-2.18, 0.52, 0);
  car.add(tail);
  var rearGlow = new THREE.PointLight(0xff354f, 1.2, 9, 2);
  rearGlow.position.set(-2.7, 0.55, 0);
  car.add(rearGlow);

  // rear wing
  var wing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 1.5), paintDark);
  wing.position.set(-1.85, 0.86, 0);
  wing.castShadow = true;
  car.add(wing);
  [1, -1].forEach(function (sz) {
    var strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.20, 0.06), paintDark);
    strut.position.set(-1.85, 0.76, sz * 0.55);
    car.add(strut);
  });

  // wheels
  var wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 26);
  var rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.36, 20);
  var hubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.38, 12);
  [[1.36, 0.42, 0.98], [1.36, 0.42, -0.98], [-1.34, 0.42, 0.98], [-1.34, 0.42, -0.98]].forEach(function (p) {
    var w = new THREE.Group();
    var tire = new THREE.Mesh(wheelGeo, tireMat); tire.castShadow = true;
    var rim = new THREE.Mesh(rimGeo, rimMat);
    var hub = new THREE.Mesh(hubGeo, blueGlow);
    w.add(tire, rim, hub);
    w.rotation.z = Math.PI / 2;
    w.position.set(p[0], p[1], p[2]);
    car.add(w);
  });

  /* ---------- hotspots (children of car => rotate with it) ---------- */
  var hotMat = { base: new THREE.MeshBasicMaterial({ color: 0x247bff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }) };
  var hotspots = [];

  function addHot(w, h, pos, rotY, data) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), hotMat.base.clone());
    m.position.set(pos[0], pos[1], pos[2]);
    m.rotation.y = rotY;
    m.userData = data;
    car.add(m);
    hotspots.push(m);
    return m;
  }

  var HZ = 0.94; // side plane offset
  // driver-side (left / +Z) windows -> LinkedIn
  addHot(0.72, 0.30, [0.62, 0.84, HZ], 0, { label: "LinkedIn", sub: "Sambhav Yadav", url: "https://www.linkedin.com/in/sambhav-yadav-b61001323/" });
  addHot(0.62, 0.26, [-0.60, 0.84, HZ], 0, { label: "LinkedIn", sub: "Campus Ninja", url: "https://www.linkedin.com/company/campusninja/" });
  // passenger-side (right / -Z) windows -> YouTube
  addHot(0.72, 0.30, [0.62, 0.84, -HZ], Math.PI, { label: "YouTube", sub: "IPU Help", url: "https://www.youtube.com/@IpuHelp-p4y" });
  addHot(0.62, 0.26, [-0.60, 0.84, -HZ], Math.PI, { label: "YouTube", sub: "Campus Ninja", url: "https://youtube.com/@campusninja-official" });
  // rear (faces -X) -> email + github
  addHot(0.7, 0.36, [-2.06, 0.44, 0.42], -Math.PI / 2, { label: "Email", sub: "ry526270@gmail.com", url: "mailto:ry526270@gmail.com" });
  addHot(0.7, 0.36, [-2.06, 0.44, -0.42], -Math.PI / 2, { label: "GitHub", sub: "@sambhav-coder", url: "https://github.com/sambhav-coder" });

  /* ---------- interaction ---------- */
  var raycaster = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  var hovered = null;
  var dragging = false, moved = 0, lastX = 0, lastY = 0, pointed = false;
  var targetYaw = -0.32, yaw = targetYaw;
  var lastInteraction = performance.now();
  car.rotation.y = yaw;

  function pointerNDC(ev) {
    var r = canvas.getBoundingClientRect();
    ndc.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  }
  function pick() {
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObjects(hotspots, false);
    return hits.length ? hits[0].object : null;
  }
  function setHover(h) {
    if (hovered === h) return;
    if (hovered) hovered.material.opacity = 0;
    hovered = h;
    if (hovered) hovered.material.opacity = 0.26;
  }
  function updateLabel() {
    if (!hovered) { labelEl.classList.remove("on"); return; }
    var v = new THREE.Vector3();
    hovered.getWorldPosition(v);
    v.project(camera);
    var r = canvas.getBoundingClientRect();
    labelEl.style.left = ((v.x * 0.5 + 0.5) * r.width) + "px";
    labelEl.style.top = ((-v.y * 0.5 + 0.5) * r.height) + "px";
    labelEl.innerHTML = "<b>" + hovered.userData.label + "</b> · " + hovered.userData.sub;
    labelEl.classList.add("on");
  }
  function openHovered() {
    if (hovered && hovered.userData.url) {
      window.open(hovered.userData.url, hovered.userData.url.indexOf("mailto:") === 0 ? "_self" : "_blank", "noopener,noreferrer");
    }
  }

  sceneEl.addEventListener("pointerdown", function (ev) {
    dragging = true; moved = 0; lastX = ev.clientX; lastY = ev.clientY;
    lastInteraction = performance.now();
    sceneEl.classList.add("dragging");
    try { sceneEl.setPointerCapture(ev.pointerId); } catch (e) {}
  });
  sceneEl.addEventListener("pointermove", function (ev) {
    pointerNDC(ev);
    setHover(pick());
    if (dragging) {
      var dx = ev.clientX - lastX;
      moved += Math.abs(dx);
      targetYaw += dx * 0.0085;
      lastX = ev.clientX; lastY = ev.clientY;
      lastInteraction = performance.now();
    }
  });
  function endDrag(ev) {
    if (!dragging) return;
    dragging = false;
    sceneEl.classList.remove("dragging");
    if (ev) { pointerNDC(ev); setHover(pick()); }
    if (moved < 6) openHovered();
    lastInteraction = performance.now();
  }
  sceneEl.addEventListener("pointerup", endDrag);
  sceneEl.addEventListener("pointercancel", function () { dragging = false; sceneEl.classList.remove("dragging"); });
  sceneEl.addEventListener("pointerleave", function () { setHover(null); });
  sceneEl.addEventListener("wheel", function (ev) {
    ev.preventDefault();
    camDist = Math.max(camDistMin, Math.min(camDistMax, camDist + ev.deltaY * 0.0028));
    placeCamera();
    lastInteraction = performance.now();
  }, { passive: false });

  sceneEl.addEventListener("keydown", function (ev) {
    if (ev.key === "ArrowLeft") { targetYaw -= 0.3; lastInteraction = performance.now(); ev.preventDefault(); }
    else if (ev.key === "ArrowRight") { targetYaw += 0.3; lastInteraction = performance.now(); ev.preventDefault(); }
    else if (ev.key === "Enter" || ev.key === " ") { openHovered(); ev.preventDefault(); }
  });

  resetBtn.addEventListener("click", function () {
    targetYaw = -0.32; camDist = 8.4; camPitch = 0.30;
    placeCamera(); lastInteraction = performance.now();
    resetBtn.blur();
  });

  /* ---------- sizing ---------- */
  function resize() {
    var w = sceneEl.clientWidth || 640;
    var h = sceneEl.clientHeight || 380;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(sceneEl);
  else window.addEventListener("resize", resize);

  /* ---------- loop ---------- */
  var running = true;
  document.addEventListener("visibilitychange", function () {
    running = !document.hidden;
    if (running) { lastInteraction = performance.now(); requestAnimationFrame(tick); }
  });

  function tick() {
    if (!running) return;
    var now = performance.now();
    if (!reduce && !dragging && now - lastInteraction > 3500) targetYaw += 0.0032; // gentle idle spin
    yaw += (targetYaw - yaw) * 0.12;
    car.rotation.y = yaw;
    if (pointed) updateLabel();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  // only pay for label projection when something is hovered
  sceneEl.addEventListener("pointermove", function () { pointed = true; });
  requestAnimationFrame(tick);
})();
