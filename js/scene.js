/* HostelFix 3D — Block C as a model pinned to the board.
   Same data.json as the board and the router. Open complaints glow amber,
   urgent ones red, places with only finished work sit in a quiet green.
   The drawing buffer is sized from the canvas element itself. */
import * as THREE from "../vendor/three.module.js";

var INK = 0x23201a, PAPER = 0xfffdf4, AMBER = 0xe8a020, RED = 0xd43a2f,
    GREEN = 0x9db98a, GROUND = 0xe7dcc0;

export function createScene(canvas, onSelect) {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setClearColor(0xf3ead2, 1);

  var scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff6dd, 0x8a7a5a, 0.95));
  var sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(8, 14, 9);
  scene.add(sun);

  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(11, 9.5, 18);
  camera.lookAt(0, 3.4, 0);

  var world = new THREE.Group();
  world.rotation.y = -0.35;
  scene.add(world);

  var ground = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 30),
    new THREE.MeshStandardMaterial({ color: GROUND, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  world.add(ground);

  var meshes = {};   // placeId -> { mesh, marker, baseColor }
  var clickable = [];

  function addEdges(mesh) {
    var edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color: INK })
    );
    mesh.add(edges);
  }

  function register(placeId, mesh, markerY) {
    addEdges(mesh);
    world.add(mesh);
    var marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 14, 12),
      new THREE.MeshBasicMaterial({ color: AMBER })
    );
    marker.position.copy(mesh.position);
    marker.position.y += markerY;
    marker.visible = false;
    marker.userData.placeId = placeId;
    world.add(marker);
    mesh.userData.placeId = placeId;
    meshes[placeId] = { mesh: mesh, marker: marker, baseColor: mesh.material.color.getHex() };
    clickable.push(mesh, marker);
  }

  function build(places) {
    places.forEach(function (p) {
      var y = p.floor === 0 ? 0.5 : 0.95 + (p.floor - 1) * 1.85;
      var mesh;
      if (p.kind === "room") {
        var num = parseInt(p.label.replace(/\D/g, ""), 10);
        var idx = (num % 100) - 1;
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 1.35, 1.15),
          new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.9 })
        );
        mesh.position.set((idx - 4.5) * 1.72, y, 0);
        register(p.id, mesh, 1.05);
      } else if (p.id.indexOf("cooler-") === 0) {
        mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.42, 1.15, 14),
          new THREE.MeshStandardMaterial({ color: 0xdfe9f5, roughness: 0.7 })
        );
        mesh.position.set(-10.1, y, 0);
        register(p.id, mesh, 1.0);
      } else if (p.id.indexOf("washroom-") === 0) {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.35, 1.35, 1.15),
          new THREE.MeshStandardMaterial({ color: 0xe8f0e4, roughness: 0.9 })
        );
        mesh.position.set(10.1, y, 0);
        register(p.id, mesh, 1.05);
      } else if (p.id.indexOf("corridor-") === 0) {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(17.6, 0.45, 0.8),
          new THREE.MeshStandardMaterial({ color: 0xf0e6cc, roughness: 1 })
        );
        mesh.position.set(0, y - 0.45, -1.75);
        register(p.id, mesh, 0.75);
      } else {
        /* ground-floor shared points, in front of the block */
        var gx = p.id === "mess" ? -6.4 : p.id === "common-room" ? 0 : 6.4;
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(2.7, 0.95, 1.7),
          new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.9 })
        );
        mesh.position.set(gx, 0.48, 4.6);
        register(p.id, mesh, 0.95);
      }
    });
    /* floor slabs + a roof line, so the block reads as one building */
    for (var f = 1; f <= 4; f++) {
      var slab = new THREE.Mesh(
        new THREE.BoxGeometry(21.6, 0.16, 3.6),
        new THREE.MeshStandardMaterial({ color: 0xefe3c2, roughness: 1 })
      );
      slab.position.set(0, 0.95 + (f - 1) * 1.85 - 0.76, -0.5);
      world.add(slab);
    }
    var roof = new THREE.Mesh(
      new THREE.BoxGeometry(21.9, 0.3, 3.9),
      new THREE.MeshStandardMaterial({ color: 0x22409a, roughness: 0.8 })
    );
    roof.position.set(0, 0.95 + 3 * 1.85 + 0.85, -0.5);
    world.add(roof);
  }

  function refresh(complaints) {
    var byPlace = {};
    complaints.forEach(function (c) {
      (byPlace[c.placeId] = byPlace[c.placeId] || []).push(c);
    });
    Object.keys(meshes).forEach(function (id) {
      var entry = meshes[id], list = byPlace[id] || [];
      var open = list.filter(function (c) { return c.status !== "done"; });
      var urgent = open.some(function (c) { return c.priority === "urgent"; });
      var mat = entry.mesh.material;
      if (urgent) {
        mat.color.setHex(0xe2685c);
        mat.emissive.setHex(RED); mat.emissiveIntensity = 0.55;
        entry.marker.material.color.setHex(RED);
      } else if (open.length) {
        mat.color.setHex(0xf2b544);
        mat.emissive.setHex(AMBER); mat.emissiveIntensity = 0.5;
        entry.marker.material.color.setHex(AMBER);
      } else if (list.length) {
        /* only finished work here — quiet green, fading back to plain */
        mat.emissive.setHex(0x000000); mat.emissiveIntensity = 0;
        mat.color.setHex(GREEN);
      } else {
        mat.emissive.setHex(0x000000); mat.emissiveIntensity = 0;
        mat.color.setHex(entry.baseColor);
      }
      entry.marker.visible = open.length > 0;
      entry.marker.userData.urgent = urgent;
    });
    renderOnce();
  }

  /* selection outline */
  var helper = null;
  function highlight(placeId) {
    if (helper) { scene.remove(helper); helper = null; }
    if (placeId && meshes[placeId]) {
      helper = new THREE.BoxHelper(meshes[placeId].mesh, 0x22409a);
      scene.add(helper);
      renderOnce();
    }
  }

  /* --- sizing: from the canvas element itself, never a wrapper --- */
  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  var ro = new ResizeObserver(function () { resize(); renderOnce(); });
  ro.observe(canvas);
  resize();

  /* --- interaction: drag to turn, wheel to zoom, tap to pick --- */
  var dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0;
  canvas.addEventListener("pointerdown", function (e) {
    dragging = true; lastX = downX = e.clientX; lastY = downY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    world.rotation.y = THREE.MathUtils.clamp(
      world.rotation.y + (e.clientX - lastX) * 0.005, -1.15, 0.55);
    lastX = e.clientX; lastY = e.clientY;
    renderOnce();
  });
  canvas.addEventListener("pointerup", function (e) {
    dragging = false;
    var moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (moved < 6) pick(e);
  });
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    camera.position.z = THREE.MathUtils.clamp(camera.position.z + e.deltaY * 0.02, 12, 30);
    renderOnce();
  }, { passive: false });

  var raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  function pick(e) {
    var rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(clickable, false);
    if (hits.length && onSelect) onSelect(hits[0].object.userData.placeId);
  }

  /* --- render loop: paused off-screen, still under reduced motion --- */
  var visible = true, raf = 0, t = 0;
  var io = new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (visible) { resize(); loop(); }
  }, { threshold: 0.05 });
  io.observe(canvas);

  function renderOnce() { renderer.render(scene, camera); }
  function loop() {
    if (!visible || document.hidden) { raf = 0; return; }
    t += 0.05;
    if (!reduced) {
      Object.keys(meshes).forEach(function (id) {
        var m = meshes[id].marker;
        if (m.visible) {
          var s = m.userData.urgent ? 1 + Math.sin(t * 3) * 0.25 : 1 + Math.sin(t * 1.6) * 0.12;
          m.scale.setScalar(s);
        }
      });
    }
    renderOnce();
    raf = requestAnimationFrame(loop);
  }
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && visible && !raf) loop();
  });
  loop();

  return {
    build: build,
    refresh: refresh,
    highlight: highlight,
    dispose: function () {
      cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect();
      renderer.dispose();
    }
  };
}
