/* HostelFix framing projection check — node qa/projection-check.mjs [prefix|fit]
   Rebuilds the scene geometry exactly as js/scene.js build() does (same
   sizes/positions, same data.json), applies world.rotation.y = -0.35,
   and projects the world Box3 corners to NDC.
   Mode "prefix": the round-1 camera (14.5, 11.9, 26) lookAt (2.1, 3.1, -0.2)
   with the old resize() fov policy (horizontal ~60 deg).
   Mode "fit": the fix-round-2 fit-to-view (fixed view direction, fov 42,
   distance solved from the Box3 with a 6% margin), ground derived from the
   footprint box, as implemented in js/scene.js after the fix. */
import * as THREE from "../vendor/three.module.js";
import { readFileSync } from "node:fs";

var mode = process.argv[2] || "prefix";
var data = JSON.parse(readFileSync(new URL("../data.json", import.meta.url), "utf8"));

var world = new THREE.Group();
world.rotation.y = -0.35;

var ground; // sized after the footprint is known in fit mode; fixed in prefix mode
if (mode === "prefix") {
  ground = new THREE.Mesh(new THREE.PlaneGeometry(26, 12));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.02, 1.5);
  world.add(ground);
} else {
  ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.02, 0);
  world.add(ground);
}

function box(w, h, d, x, y, z, name) {
  var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
  m.position.set(x, y, z);
  m.name = name || "";
  world.add(m);
  return m;
}

data.places.forEach(function (p) {
  var y = p.floor === 0 ? 0.5 : 0.95 + (p.floor - 1) * 1.85;
  var mesh, markerY;
  if (p.kind === "room") {
    var num = parseInt(p.label.replace(/\D/g, ""), 10);
    var idx = (num % 100) - 1;
    mesh = box(1.5, 1.35, 1.15, (idx - 4.5) * 1.72, y, 0, p.id);
    markerY = 1.05;
  } else if (p.id.indexOf("cooler-") === 0) {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.15, 14));
    mesh.position.set(-10.1, y, 0); mesh.name = p.id; world.add(mesh);
    markerY = 1.0;
  } else if (p.id.indexOf("washroom-") === 0) {
    mesh = box(1.35, 1.35, 1.15, 10.1, y, 0, p.id);
    markerY = 1.05;
  } else if (p.id.indexOf("corridor-") === 0) {
    mesh = box(17.6, 0.45, 0.8, 0, y - 0.45, -1.75, p.id);
    markerY = 0.75;
  } else {
    var gx = p.id === "mess" ? -6.4 : p.id === "common-room" ? 0 : 6.4;
    mesh = box(2.7, 0.95, 1.7, gx, 0.48, 4.6, p.id);
    markerY = 0.95;
  }
  var marker = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12));
  marker.position.copy(mesh.position);
  marker.position.y += markerY;
  world.add(marker);
});
for (var f = 1; f <= 4; f++) {
  box(21.6, 0.16, 3.6, 0, 0.95 + (f - 1) * 1.85 - 0.76, -0.5, "slab-" + f);
}
box(21.9, 0.3, 3.9, 0, 0.95 + 3 * 1.85 + 0.85, -0.5, "roof");
box(17.6, 0.07, 2.7, 0, 0.035, 4.6, "pad");
box(3.4, 0.06, 2.6, 0, 0.03, 2.45, "path");

if (mode === "fit") {
  /* ground from the footprint box (everything except the ground itself) */
  var foot = new THREE.Box3();
  world.children.forEach(function (c) {
    if (c !== ground) foot.union(new THREE.Box3().setFromObject(c));
  });
  var fw = foot.max.x - foot.min.x, fd = foot.max.z - foot.min.z;
  var cx = (foot.min.x + foot.max.x) / 2, cz = (foot.min.z + foot.max.z) / 2;
  ground.geometry.dispose();
  ground.geometry = new THREE.PlaneGeometry(fw + 3, fd + 3);
  ground.position.set(cx, -0.02, cz);
  console.log("footprint box: x [" + foot.min.x.toFixed(2) + ", " + foot.max.x.toFixed(2) +
    "]  z [" + foot.min.z.toFixed(2) + ", " + foot.max.z.toFixed(2) + "]  y [" +
    foot.min.y.toFixed(2) + ", " + foot.max.y.toFixed(2) + "]");
  console.log("ground sized to " + (fw + 3).toFixed(2) + " x " + (fd + 3).toFixed(2) +
    " centred (" + cx.toFixed(2) + ", " + cz.toFixed(2) + ")");
}

world.updateMatrixWorld(true);
var worldBox = new THREE.Box3().setFromObject(world);
console.log("world Box3: min (" + worldBox.min.x.toFixed(2) + ", " + worldBox.min.y.toFixed(2) +
  ", " + worldBox.min.z.toFixed(2) + ")  max (" + worldBox.max.x.toFixed(2) + ", " +
  worldBox.max.y.toFixed(2) + ", " + worldBox.max.z.toFixed(2) + ")");

var corners = [];
for (var xi of [worldBox.min.x, worldBox.max.x])
  for (var yi of [worldBox.min.y, worldBox.max.y])
    for (var zi of [worldBox.min.z, worldBox.max.z])
      corners.push(new THREE.Vector3(xi, yi, zi));

var ASPECTS = [1.2, 1.6, 2.0, 2.4];

function projectExtremes(camera) {
  camera.updateMatrixWorld(true);
  var maxX = 0, maxY = 0, worst = null;
  corners.forEach(function (c) {
    var v = c.clone().project(camera);
    if (Math.abs(v.x) > maxX) { maxX = Math.abs(v.x); worst = v; }
    maxY = Math.max(maxY, Math.abs(v.y));
  });
  return { maxX: maxX, maxY: maxY };
}

if (mode === "prefix") {
  console.log("\nPRE-FIX camera (14.5, 11.9, 26) lookAt (2.1, 3.1, -0.2), old resize() fov policy:");
  ASPECTS.forEach(function (aspect) {
    var fov = THREE.MathUtils.clamp(
      THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(30)) / aspect)), 30, 85);
    var cam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 200);
    cam.position.set(14.5, 11.9, 26);
    cam.lookAt(2.1, 3.1, -0.2);
    var r = projectExtremes(cam);
    console.log("  aspect " + aspect.toFixed(1) + "  fov " + fov.toFixed(1) +
      "  max|ndc.x| = " + r.maxX.toFixed(3) + (r.maxX > 1 ? "  <-- CLIPPED horizontally" : "") +
      "  max|ndc.y| = " + r.maxY.toFixed(3) + (r.maxY > 1 ? "  <-- CLIPPED vertically" : ""));
  });
  /* which named objects poke out at aspect 2.0? */
  var cam2 = new THREE.PerspectiveCamera(
    THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(
      2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(30)) / 2.0)), 30, 85), 2.0, 0.1, 200);
  cam2.position.set(14.5, 11.9, 26);
  cam2.lookAt(2.1, 3.1, -0.2);
  cam2.updateMatrixWorld(true);
  console.log("\n  per-object max|ndc.x| at aspect 2.0 (objects over 0.90):");
  world.children.forEach(function (c) {
    if (!c.name) return;
    var b = new THREE.Box3().setFromObject(c), mx = 0;
    for (var a of [b.min.x, b.max.x]) for (var bb of [b.min.y, b.max.y]) for (var cc of [b.min.z, b.max.z]) {
      var v = new THREE.Vector3(a, bb, cc).project(cam2);
      mx = Math.max(mx, Math.abs(v.x));
    }
    if (mx > 0.90) console.log("    " + c.name + ": " + mx.toFixed(3) + (mx > 1 ? "  CLIPPED" : ""));
  });
} else {
  /* fit-to-view, mirroring js/scene.js after fix round 2 */
  var DIR = new THREE.Vector3(12.4, 8.8, 26.2).normalize();
  var centre = worldBox.getCenter(new THREE.Vector3());
  console.log("\nFIT-TO-VIEW: centre (" + centre.x.toFixed(2) + ", " + centre.y.toFixed(2) +
    ", " + centre.z.toFixed(2) + "), dir (" + DIR.x.toFixed(3) + ", " + DIR.y.toFixed(3) +
    ", " + DIR.z.toFixed(3) + "), fov 42, margin 6%:");
  ASPECTS.forEach(function (aspect) {
    var cam = new THREE.PerspectiveCamera(42, aspect, 0.1, 500);
    cam.position.copy(centre).addScaledVector(DIR, 1);
    cam.lookAt(centre);
    cam.updateMatrixWorld(true);
    var tanV = Math.tan(THREE.MathUtils.degToRad(42 / 2));
    var tanH = tanV * aspect;
    var inv = cam.matrixWorldInverse;
    var d = 0;
    corners.forEach(function (c) {
      var v = c.clone().applyMatrix4(inv); // camera space at d0 = 1
      var along = v.z + 1;                 // corner's offset along the view dir from centre
      d = Math.max(d, along + Math.abs(v.x) / tanH, along + Math.abs(v.y) / tanV);
    });
    d *= 1.06;
    cam.position.copy(centre).addScaledVector(DIR, d);
    cam.lookAt(centre);
    var r = projectExtremes(cam);
    console.log("  aspect " + aspect.toFixed(1) + "  fit distance " + d.toFixed(2) +
      "  max|ndc.x| = " + r.maxX.toFixed(3) + "  max|ndc.y| = " + r.maxY.toFixed(3) +
      (r.maxX <= 1 && r.maxY <= 1 ? "  OK — whole box inside" : "  <-- STILL CLIPPED"));
  });
}
