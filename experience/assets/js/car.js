/* ==========================================================================
   Interactive 3D supercar — vanilla Three.js (r160 ES modules, vendored)
   Model: "Car Concept" — CC-BY-4.0 (Khronos glTF Sample Assets;
   original CC0 model by Unity Fan). See vendor/models/CarConcept-LICENSE.md.
   No external network calls at runtime. Degrades gracefully without WebGL.
   ========================================================================== */
import * as THREE from "three";
import { GLTFLoader } from "../../vendor/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "../../vendor/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "../../vendor/jsm/libs/meshopt_decoder.module.js";

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
  // fog colour matches the page's horizon tint so the road melts into the sky, not a hard edge
  scene.fog = new THREE.Fog(0x0a1730, 14, 60);
  var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);

  // A fixed *horizontal* field of view keeps the roadside billboards in frame across every
  // aspect ratio (the scene box has no fixed aspect); the vertical fov is derived in resize().
  var H_FOV_TAN = 0.78; // tan(hfov/2) ~ 76deg horizontal

  var target = new THREE.Vector3(0, 0.55, 0);
  // Pulled back + nearly head-on so both sides of the road (and their billboards) are visible.
  var camYaw = 0.20, camPitch = 0.23, camDist = 11.0;
  var camDistMin = 6.5, camDistMax = 20.0;

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
  scene.add(new THREE.HemisphereLight(0x4a6ea8, 0x0a1018, 0.6));

  var key = new THREE.DirectionalLight(0xe6eeff, 1.7);
  key.position.set(6, 9, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 40;
  key.shadow.camera.left = -7; key.shadow.camera.right = 7;
  key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
  key.shadow.bias = -0.0005;
  scene.add(key);

  // cool rim (the old red rim light was washing the whole road surface red)
  var rim = new THREE.DirectionalLight(0x7f92ff, 0.55);
  rim.position.set(-8, 5, -7);
  scene.add(rim);

  var fill = new THREE.DirectionalLight(0x247bff, 0.7);
  fill.position.set(-5, 3.5, 7);
  scene.add(fill);

  var under = new THREE.PointLight(0x247bff, 0.5, 12, 2);
  under.position.set(0, 0.35, 0);
  scene.add(under);

  /* ---------- road (asphalt surface + lane markings) ---------- */
  function makeAsphaltTexture() {
    var c = document.createElement("canvas");
    c.width = c.height = 512;
    var g = c.getContext("2d");
    g.fillStyle = "#262b33";
    g.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 12000; i++) {
      var x = Math.random() * 512, y = Math.random() * 512;
      var s = Math.random() * 1.7 + 0.3;
      g.fillStyle = Math.random() > 0.55
        ? "rgba(150,168,200," + (0.02 + Math.random() * 0.06) + ")"
        : "rgba(0,0,0," + (0.05 + Math.random() * 0.15) + ")";
      g.fillRect(x, y, s, s);
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 8);
    if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
    if (renderer.capabilities && renderer.capabilities.getMaxAnisotropy) {
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
    return t;
  }

  var roadMat = new THREE.MeshStandardMaterial({ map: makeAsphaltTexture(), color: 0xffffff, roughness: 0.72, metalness: 0.08 });
  roadMat.envMapIntensity = 0.3;
  var road = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  scene.add(road);

  // dashed centre line (runs along the car's length, +Z)
  var dashCanvas = document.createElement("canvas");
  dashCanvas.width = 32; dashCanvas.height = 96;
  var dg = dashCanvas.getContext("2d");
  dg.fillStyle = "#eaf1ff";
  dg.fillRect(0, 0, 32, 32);           // dash occupies 1/3 of the tile
  var dashTex = new THREE.CanvasTexture(dashCanvas);
  dashTex.wrapS = dashTex.wrapT = THREE.RepeatWrapping;
  dashTex.repeat.set(1, 15);
  if ("colorSpace" in dashTex) dashTex.colorSpace = THREE.SRGBColorSpace;

  function lane(w, len, x, mat) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.012, 0);
    scene.add(m);
    return m;
  }
  var solidMat = new THREE.MeshBasicMaterial({ color: 0xc6d2ea, transparent: true, opacity: 0.72 });
  var dashMat = new THREE.MeshBasicMaterial({ map: dashTex, transparent: true, opacity: 0.85 });
  var accentMat = new THREE.MeshBasicMaterial({ color: 0x247bff, transparent: true, opacity: 0.5 });

  lane(0.16, 160, 0, dashMat);         // centre dashed line
  lane(0.18, 160, 5.0, solidMat);      // solid lane edges
  lane(0.18, 160, -5.0, solidMat);
  lane(0.05, 160, 5.35, accentMat);    // faint electric-blue kerb glow
  lane(0.05, 160, -5.35, accentMat);

  /* ---------- car (imported model) ---------- */
  var car = new THREE.Group();   // the thing the user rotates; hotspots are its children
  car.rotation.y = 0;
  scene.add(car);

  // Model is authored Y-up, nose at +Z. These offsets centre it and sit it on the floor.
  // Derived from the model's *actual* vertex bounds (centre=(-0.00025,0.5742,0.2385), minY≈0):
  // the glTF accessor min/max are loose, so the previous offset here floated the car ~0.159.
  var MODEL_OFFSET = new THREE.Vector3(0.00025, 0.00024, -0.23846);

  var PAINT_BODY = 0x3b424b;   // graphite / gunmetal — the body panels
  var PAINT_TRIM = 0x181c22;   // darker graphite — roof / secondary panels

  var loader = new GLTFLoader();
  // The model is meshopt-compressed (EXT_meshopt_compression is *required*), so the
  // decoder must be registered — and its wasm must be ready before buffers decode.
  loader.setMeshoptDecoder(MeshoptDecoder);
  var modelURL = new URL("../../vendor/models/CarConcept.glb", import.meta.url).href;

  function loadModel() {
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
        if (m.name && m.name.indexOf("Paint 1") === 0) {
          if (m.color) m.color.setHex(PAINT_BODY);
          if ("metalness" in m) m.metalness = 0.9;
          if ("roughness" in m) m.roughness = 0.28;
          if ("clearcoat" in m) m.clearcoat = 1.0;
          if ("clearcoatRoughness" in m) m.clearcoatRoughness = 0.07;
          m.needsUpdate = true;
        } else if (m.name && m.name.indexOf("Paint 2") === 0) {
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
  }
  // wait for the meshopt wasm to be ready, then load (its 'ready' promise resolves when idle)
  if (MeshoptDecoder && MeshoptDecoder.ready) MeshoptDecoder.ready.then(loadModel, loadModel);
  else loadModel();

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
  addHot(0.52, 0.24, [HS, 1.001, -0.12], Math.PI / 2, { label: "LinkedIn", sub: "Sambhav Yadav", url: "https://www.linkedin.com/in/sambhav-yadav-b61001323/" });
  addHot(0.52, 0.24, [HS, 1.001, -0.55], Math.PI / 2, { label: "LinkedIn", sub: "Campus Ninja", url: "https://www.linkedin.com/company/campusninja/" });
  // passenger-side (-X) windows -> YouTube
  addHot(0.52, 0.24, [-HS, 1.001, -0.12], -Math.PI / 2, { label: "YouTube", sub: "IPU Help", url: "https://www.youtube.com/@IpuHelp-p4y" });
  addHot(0.52, 0.24, [-HS, 1.001, -0.55], -Math.PI / 2, { label: "YouTube", sub: "Campus Ninja", url: "https://youtube.com/@campusninja-official" });
  // rear (faces -Z) -> email + github
  addHot(0.66, 0.44, [0.42, 0.561, -2.20], Math.PI, { label: "Email", sub: "ry526270@gmail.com", url: "mailto:ry526270@gmail.com" });
  addHot(0.66, 0.44, [-0.42, 0.561, -2.20], Math.PI, { label: "GitHub", sub: "@sambhav-coder", url: "https://github.com/sambhav-coder" });

  /* ---------- project billboards (real, clickable, along the road) ---------- */
  // Each board is composed on a 2D canvas (genuine brand colours + vendored logo) and mapped
  // onto a framed, pole-mounted panel. Two per side of the road, at different distances.
  var billboardScreens = [];

  var BB_PROJECTS = [
    { name: "Campus Ninja", tag: "Engineering study hub", host: "campusninja.vercel.app",
      url: "https://campusninja.vercel.app/", logo: "campusninja.png",
      bg0: "#12141a", bg1: "#2a1507", accent: "#f06000",
      x: 5.9, z: -2.2, w: 2.0, h: 1.0, cy: 2.72 },
    { name: "Cyber Sakhi", tag: "AI safety companion", host: "cyber-sakhi-sooty.vercel.app",
      url: "https://cyber-sakhi-sooty.vercel.app/", logo: "cybersakhi.png",
      bg0: "#041634", bg1: "#2a0a16", accent: "#ff4d6a",
      x: 6.6, z: -26, w: 2.6, h: 1.3, cy: 3.0 },
    { name: "IPU Help", tag: "Counselling hub", host: "councelling-delta.vercel.app",
      url: "https://councelling-delta.vercel.app/", logo: "ipuhelp.png",
      bg0: "#0a2350", bg1: "#0e57c8", accent: "#38bdf8",
      x: -5.9, z: -1.0, w: 2.0, h: 1.0, cy: 2.72 },
    { name: "PetroForge", tag: "Physics \u00D7 AI digital twin", host: "petro-forge.vercel.app",
      url: "https://petro-forge.vercel.app/", logo: "petroforge.png",
      bg0: "#08160f", bg1: "#123524", accent: "#d99a3d",
      x: -6.6, z: -17, w: 2.6, h: 1.3, cy: 3.0 }
  ];

  var LOGO_BASE = new URL("../img/projects/", import.meta.url).href;

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function fitRect(iw, ih, bx, by, bw, bh) {
    var s = Math.min(bw / iw, bh / ih);
    return { w: iw * s, h: ih * s, x: bx + (bw - iw * s) / 2, y: by + (bh - ih * s) / 2 };
  }

  function makeBoardTexture(p) {
    var c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    var g = c.getContext("2d");
    var grad = g.createLinearGradient(0, 0, 1024, 512);
    grad.addColorStop(0, p.bg0); grad.addColorStop(1, p.bg1);
    g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
    // faint diagonal sheen
    g.save(); g.globalAlpha = 0.07; g.fillStyle = "#ffffff";
    for (var i = -400; i < 1024; i += 160) { g.save(); g.translate(i, 0); g.rotate(-0.55); g.fillRect(0, -200, 46, 900); g.restore(); }
    g.restore();
    // vignette
    var vg = g.createRadialGradient(512, 256, 120, 512, 256, 660);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.36)");
    g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
    // accent bar + side rails
    g.fillStyle = p.accent; g.fillRect(0, 0, 1024, 16);
    g.fillStyle = "rgba(255,255,255,0.10)"; g.fillRect(0, 0, 6, 512); g.fillRect(1018, 0, 6, 512);
    // logo panel
    g.fillStyle = "rgba(255,255,255,0.07)"; roundRect(g, 58, 92, 348, 348, 36); g.fill();
    // copy
    g.fillStyle = "#ffffff"; g.textBaseline = "alphabetic";
    g.font = "700 78px system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif";
    g.fillText(p.name, 456, 246);
    g.font = "400 42px system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif";
    g.fillStyle = "rgba(255,255,255,0.82)"; g.fillText(p.tag, 458, 314);
    // url pill
    g.font = "600 32px system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif";
    var label = "\u2192 " + p.host;
    var tw = g.measureText(label).width;
    g.fillStyle = "rgba(255,255,255,0.12)"; roundRect(g, 458, 352, tw + 46, 62, 31); g.fill();
    g.fillStyle = p.accent; g.fillText(label, 480, 393);
    // thin bezel
    g.strokeStyle = "rgba(255,255,255,0.16)"; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 1021, 509);

    var tex = new THREE.CanvasTexture(c);
    if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
    if (renderer.capabilities && renderer.capabilities.getMaxAnisotropy) tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // real logo, drawn once loaded (text-only board remains a valid fallback)
    var img = new Image();
    img.onload = function () {
      var r = fitRect(img.width, img.height, 58, 92, 348, 348);
      g.drawImage(img, r.x, r.y, r.w, r.h);
      tex.needsUpdate = true;
    };
    img.src = LOGO_BASE + p.logo;
    return tex;
  }

  function buildBillboard(p) {
    var group = new THREE.Group();
    group.position.set(p.x, 0, p.z);
    // face the viewer (ground-plane heading toward the camera)
    group.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);

    var screen = new THREE.Mesh(
      new THREE.PlaneGeometry(p.w, p.h),
      new THREE.MeshBasicMaterial({ map: makeBoardTexture(p), fog: false, toneMapped: false, side: THREE.DoubleSide })
    );
    screen.position.set(0, p.cy, 0.1);

    var frameMat = new THREE.MeshStandardMaterial({
      color: 0x0d1016, metalness: 0.65, roughness: 0.42,
      emissive: new THREE.Color(p.accent), emissiveIntensity: 0.22
    });
    var frame = new THREE.Mesh(new THREE.BoxGeometry(p.w + 0.22, p.h + 0.22, 0.16), frameMat);
    frame.position.set(0, p.cy, 0);
    frame.castShadow = true; frame.receiveShadow = true;
    group.add(frame, screen);

    var postH = Math.max(0.6, p.cy - p.h / 2 - 0.06);
    var postMat = new THREE.MeshStandardMaterial({ color: 0x0d1016, metalness: 0.5, roughness: 0.55 });
    var postGeo = new THREE.CylinderGeometry(0.06, 0.075, postH, 10);
    var px = Math.min(0.72, p.w * 0.34);
    [-px, px].forEach(function (ox) {
      var post = new THREE.Mesh(postGeo, postMat);
      post.position.set(ox, postH / 2, 0);
      post.castShadow = true;
      group.add(post);
    });
    var base = new THREE.Mesh(new THREE.BoxGeometry(p.w * 0.72, 0.14, 0.5), postMat);
    base.position.set(0, 0.07, 0);
    group.add(base);

    screen.userData = { label: p.name, sub: p.tag, url: p.url, billboard: true, frame: frameMat };
    billboardScreens.push(screen);
    scene.add(group);
  }
  BB_PROJECTS.forEach(buildBillboard);

  /* ---------- interaction ---------- */
  var raycaster = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  var hovered = null;
  var dragging = false, moved = 0, lastX = 0, lastY = 0, pointed = false;
  var targetYaw = 0, yaw = targetYaw;
  var lastInteraction = performance.now();
  // hotspots rotate with the car; billboards are static in the world
  var pickables = hotspots.concat(billboardScreens);

  function pointerNDC(ev) {
    var r = canvas.getBoundingClientRect();
    ndc.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  }
  function pick() {
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObjects(pickables, false);
    return hits.length ? hits[0].object : null;
  }
  function setHover(h) {
    if (hovered === h) return;
    if (hovered) {
      if (hovered.userData.billboard && hovered.userData.frame) hovered.userData.frame.emissiveIntensity = 0.22;
      else if (hovered.material) hovered.material.opacity = 0;
    }
    hovered = h;
    if (hovered) {
      if (hovered.userData.billboard && hovered.userData.frame) hovered.userData.frame.emissiveIntensity = 0.95;
      else if (hovered.material) hovered.material.opacity = 0.26;
    }
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
    targetYaw = 0; camDist = 11.0; camPitch = 0.23;
    placeCamera(); lastInteraction = performance.now();
    resetBtn.blur();
  });

  /* ---------- sizing ---------- */
  function resize() {
    var w = sceneEl.clientWidth || 640;
    var h = sceneEl.clientHeight || 380;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // derive vertical fov so the horizontal fov stays constant (keeps billboards in frame)
    var vfov = 2 * Math.atan(H_FOV_TAN / camera.aspect) * 180 / Math.PI;
    camera.fov = Math.max(30, Math.min(60, vfov));
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
