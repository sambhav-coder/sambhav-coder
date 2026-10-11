/* ==========================================================================
   Interactive 3D supercar — vanilla Three.js (r160 ES modules, vendored)
   Model: "Car Concept" — CC-BY-4.0 (Khronos glTF Sample Assets;
   original CC0 model by Unity Fan). See vendor/models/CarConcept-LICENSE.md.
   No external network calls at runtime. Degrades gracefully without WebGL.
   ========================================================================== */
import * as THREE from "three";
import { GLTFLoader } from "../../vendor/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "../../vendor/jsm/environments/RoomEnvironment.js";

(function () {
  "use strict";

  var sceneEl = document.getElementById("scene");
  var canvas = document.getElementById("car-canvas");
  var labelEl = document.getElementById("hotlabel");
  var resetBtn = document.getElementById("reset");
  var loaderEl = document.getElementById("loader");
  if (!sceneEl || !canvas || !THREE) {
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
  window.__carInit = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 140);

  var target = new THREE.Vector3(0, 0.55, 0);
  var camYaw = 0.72, camPitch = 0.27, camDist = 8.4;
  var camDistMin = 5.4, camDistMax = 12.6;

  function placeCamera() {
    camera.position.set(
      target.x + camDist * Math.cos(camPitch) * Math.sin(camYaw),
      target.y + camDist * Math.sin(camPitch),
      target.z + camDist * Math.cos(camPitch) * Math.cos(camYaw)
    );
    camera.lookAt(target);
  }
  placeCamera();

  /* ---------- image-based lighting (studio reflections for the PBR paint) ---------- */
  try {
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
    pmrem.dispose();
  } catch (envErr) { /* reflections are a nice-to-have; scene still renders */ }

  /* ---------- lighting (studio, fixed while the car rotates) ---------- */
  scene.add(new THREE.HemisphereLight(0x2f56b0, 0x05070f, 0.42));

  var key = new THREE.DirectionalLight(0xd6e4ff, 1.5);
  key.position.set(6, 9, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 40;
  key.shadow.camera.left = -7; key.shadow.camera.right = 7;
  key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
  key.shadow.bias = -0.0005;
  scene.add(key);

  var rim = new THREE.DirectionalLight(0xff6a7e, 1.0);
  rim.position.set(-7, 4, -6);
  scene.add(rim);

  var fill = new THREE.DirectionalLight(0x247bff, 0.8);
  fill.position.set(-5, 3.5, 7);
  scene.add(fill);

  var under = new THREE.PointLight(0x247bff, 0.6, 12, 2);
  under.position.set(0, 0.35, 0);
  scene.add(under);

  /* ---------- ground ---------- */
  var groundMat = new THREE.MeshStandardMaterial({ color: 0x05080f, roughness: 0.9, metalness: 0.1 });
  groundMat.envMapIntensity = 0.18;
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ---------- car (imported model) ---------- */
  var car = new THREE.Group();   // the thing the user rotates; hotspots are its children
  car.rotation.y = 0;
  scene.add(car);

  // Model is authored Y-up, nose at +Z. These offsets centre it and sit it on the floor
  // (derived from the glTF bounding box: centre=(-0.0052,0.4947,0.2385), minY=-0.1593).
  var MODEL_OFFSET = new THREE.Vector3(0.0052, 0.1593, -0.2385);

  var PAINT_BODY = 0x3b424b;   // graphite / gunmetal — the body panels
  var PAINT_TRIM = 0x181c22;   // darker graphite — roof / secondary panels

  var loader = new GLTFLoader();
  var modelURL = new URL("../../vendor/models/CarConcept.glb", import.meta.url).href;

  loader.load(modelURL, function (gltf) {
    var model = gltf.scene;
    model.position.copy(MODEL_OFFSET);
    model.traverse(function (o) {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      var mats = Array.isArray(o.material) ? o.material : [o.material];
      for (var i = 0; i < mats.length; i++) {
        var m = mats[i];
        if (!m) continue;
        if ("envMapIntensity" in m) m.envMapIntensity = 1.0;
        if (m.name === "Paint 1 Carmine") {
          if (m.color) m.color.setHex(PAINT_BODY);
          if ("metalness" in m) m.metalness = 0.9;
          if ("roughness" in m) m.roughness = 0.28;
          if ("clearcoat" in m) m.clearcoat = 1.0;
          if ("clearcoatRoughness" in m) m.clearcoatRoughness = 0.07;
          m.needsUpdate = true;
        } else if (m.name === "Paint 2 Carmine") {
          if (m.color) m.color.setHex(PAINT_TRIM);
          if ("roughness" in m) m.roughness = 0.34;
          if ("clearcoat" in m) m.clearcoat = 1.0;
          if ("clearcoatRoughness" in m) m.clearcoatRoughness = 0.12;
          m.needsUpdate = true;
        }
      }
    });
    car.add(model);
    if (loaderEl) loaderEl.style.display = "none";
  }, function (xhr) {
    if (loaderEl && xhr && xhr.total) {
      loaderEl.textContent = "Loading car \u00B7 " + Math.round((xhr.loaded / xhr.total) * 100) + "%";
    }
  }, function (err) {
    if (loaderEl) loaderEl.style.display = "none";
    sceneEl.classList.add("no-webgl");
    if (window.console && console.error) console.error("Car model failed to load:", err);
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

  // Anchors derived from the actual model geometry (driver side = +X, front = +Z).
  // The door skin/mirror reach x~1.17, so the side planes sit just outside that, on the
  // rear half of the glass (clear of the door mirror). Rear planes sit just behind the tail.
  var HS = 1.12;   // side-plane offset, just outside the widest part of the door
  // driver-side (+X) windows -> LinkedIn
  addHot(0.52, 0.24, [HS, 1.16, -0.12], Math.PI / 2, { label: "LinkedIn", sub: "Sambhav Yadav", url: "https://www.linkedin.com/in/sambhav-yadav-b61001323/" });
  addHot(0.52, 0.24, [HS, 1.16, -0.55], Math.PI / 2, { label: "LinkedIn", sub: "Campus Ninja", url: "https://www.linkedin.com/company/campusninja/" });
  // passenger-side (-X) windows -> YouTube
  addHot(0.52, 0.24, [-HS, 1.16, -0.12], -Math.PI / 2, { label: "YouTube", sub: "IPU Help", url: "https://www.youtube.com/@IpuHelp-p4y" });
  addHot(0.52, 0.24, [-HS, 1.16, -0.55], -Math.PI / 2, { label: "YouTube", sub: "Campus Ninja", url: "https://youtube.com/@campusninja-official" });
  // rear (faces -Z) -> email + github
  addHot(0.66, 0.44, [0.42, 0.72, -2.20], Math.PI, { label: "Email", sub: "ry526270@gmail.com", url: "mailto:ry526270@gmail.com" });
  addHot(0.66, 0.44, [-0.42, 0.72, -2.20], Math.PI, { label: "GitHub", sub: "@sambhav-coder", url: "https://github.com/sambhav-coder" });

  /* ---------- interaction ---------- */
  var raycaster = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  var hovered = null;
  var dragging = false, moved = 0, lastX = 0, lastY = 0, pointed = false;
  var targetYaw = 0, yaw = targetYaw;
  var lastInteraction = performance.now();

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
    targetYaw = 0; camDist = 8.4; camPitch = 0.27;
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
