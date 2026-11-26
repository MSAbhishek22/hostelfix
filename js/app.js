/* HostelFix app — one data.json drives the form, the board and the 3D block.
   Your own complaints and status changes live in localStorage only. */
import { createScene } from "./scene.js";

var LS_USER = "hostelfix.user.v1";
var LS_OVERRIDES = "hostelfix.overrides.v1";
var STATUS_LABEL = {
  "new": "New",
  "assigned": "Given out",
  "in-progress": "Being fixed",
  "done": "Done"
};
var NEXT = { "new": "assigned", "assigned": "in-progress", "in-progress": "done" };

var data = null, places = {}, tradeLabel = {}, tradePerson = {};
var complaints = [];
var filter = "all";
var scene = null;

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch (e) { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
}

function buildState() {
  var overrides = loadJSON(LS_OVERRIDES, {});
  complaints = data.seedComplaints.map(function (c) {
    var o = overrides[c.id];
    return o ? Object.assign({}, c, o) : Object.assign({}, c);
  }).concat(loadJSON(LS_USER, []));
}

function persistStatus(c) {
  if (String(c.id).charAt(0) === "u") {
    var user = loadJSON(LS_USER, []);
    var i = user.findIndex(function (x) { return x.id === c.id; });
    if (i !== -1) { user[i] = c; saveJSON(LS_USER, user); }
  } else {
    var overrides = loadJSON(LS_OVERRIDES, {});
    overrides[c.id] = { status: c.status, lastMove: c.lastMove };
    saveJSON(LS_OVERRIDES, overrides);
  }
}

/* ---------- board ---------- */
function renderCounts() {
  var open = complaints.filter(function (c) { return c.status !== "done"; });
  document.getElementById("count-open").textContent = open.length;
  document.getElementById("count-urgent").textContent =
    open.filter(function (c) { return c.priority === "urgent"; }).length;
  document.getElementById("count-done").textContent =
    complaints.filter(function (c) { return c.status === "done"; }).length;
}

function slipHTML(c, freshId) {
  var place = places[c.placeId];
  var next = NEXT[c.status];
  var person = tradePerson[c.trade] || "the warden";
  var actLabel = c.status === "new" ? "Give to " + person
    : c.status === "assigned" ? "Start work" : "Mark done";
  return '<article class="slip ' + c.status + (c.priority === "urgent" && c.status !== "done" ? " urgent" : "") +
    (c.id === freshId ? " fresh" : "") + '" data-id="' + c.id + '">' +
    '<span class="pin" aria-hidden="true"></span>' +
    '<div class="slip-top"><p class="slip-text">' + escapeHTML(c.text) + '</p>' +
    '<span class="tag ' + c.trade + '">' + (tradeLabel[c.trade] || "Warden desk") + '</span></div>' +
    '<p class="slip-meta">' + (place ? place.label : c.placeId) + ' · filed by ' + escapeHTML(c.by || "You") +
    ' · <span class="stamp ' + c.priority + '">' + c.priority + '</span></p>' +
    '<p class="slip-status">Status: <span class="st ' + c.status + '">' + STATUS_LABEL[c.status] + '</span></p>' +
    '<p class="slip-move">' + escapeHTML(c.lastMove || "") + '</p>' +
    (next ? '<button type="button" class="slip-act" data-advance="' + c.id + '">' + actLabel + '</button>' : '') +
    '</article>';
}

function renderBoard(freshId) {
  var board = document.getElementById("board");
  var list = complaints.filter(function (c) { return filter === "all" || c.status === filter; });
  /* open first, urgent first, newest filing order kept inside groups */
  var rank = { urgent: 0, high: 1, normal: 2, low: 3 };
  list.sort(function (a, b) {
    var da = a.status === "done" ? 1 : 0, db = b.status === "done" ? 1 : 0;
    if (da !== db) return da - db;
    return (rank[a.priority] - rank[b.priority]);
  });
  board.innerHTML = list.length
    ? list.map(function (c) { return slipHTML(c, freshId); }).join("")
    : '<p class="board-empty">Nothing pinned here right now.</p>';
  board.querySelectorAll("[data-advance]").forEach(function (btn) {
    btn.addEventListener("click", function () { advance(btn.getAttribute("data-advance")); });
  });
}

function advance(id) {
  var c = complaints.find(function (x) { return x.id === id; });
  if (!c || !NEXT[c.status]) return;
  c.status = NEXT[c.status];
  var person = tradePerson[c.trade] || "The warden";
  var label = tradeLabel[c.trade] || "warden desk";
  c.lastMove = c.status === "assigned" ? "Given to " + person + ", the " + label.toLowerCase() + " · just now"
    : c.status === "in-progress" ? person + " started work · just now"
    : "Marked done · just now";
  persistStatus(c);
  renderAll();
}

function renderAll(freshId) {
  renderCounts();
  renderBoard(freshId);
  if (scene) scene.refresh(complaints);
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

/* ---------- place detail (from the 3D block) ---------- */
function showPlace(placeId) {
  var place = places[placeId];
  if (!place) return;
  if (scene) scene.highlight(placeId);
  document.getElementById("detail-title").textContent = place.label;
  var list = complaints.filter(function (c) { return c.placeId === placeId; });
  document.getElementById("detail-list").innerHTML = list.length
    ? "<ul>" + list.map(function (c) {
        return "<li>" + escapeHTML(c.text) + " — <strong>" + STATUS_LABEL[c.status] +
          "</strong> (" + c.priority + ")</li>";
      }).join("") + "</ul>"
    : '<p class="hint">No complaints pinned here. This spot is quiet.</p>';
  var sel = document.getElementById("place");
  if (sel.value !== placeId) sel.value = placeId;
}

/* ---------- form ---------- */
function buildPlacePicker() {
  var sel = document.getElementById("place");
  var html = "";
  var ground = data.places.filter(function (p) { return p.floor === 0; });
  html += '<optgroup label="Ground floor">' + ground.map(opt).join("") + "</optgroup>";
  for (var f = 1; f <= data.block.floors; f++) {
    var rooms = data.places.filter(function (p) { return p.floor === f && p.kind === "room"; });
    var shared = data.places.filter(function (p) { return p.floor === f && p.kind === "shared"; });
    html += '<optgroup label="Floor ' + f + '">' + shared.map(opt).join("") + rooms.map(opt).join("") + "</optgroup>";
  }
  sel.innerHTML = html;
  sel.value = "cooler-3";
  function opt(p) { return '<option value="' + p.id + '">' + p.label + "</option>"; }
}

function fileComplaint(placeId, text, by) {
  var place = places[placeId];
  var r = window.HostelRouter.route(text, place);
  var c = {
    id: "u" + Date.now(),
    placeId: placeId,
    text: text,
    trade: r.trade,
    priority: r.priority,
    status: "new",
    by: by || "You",
    lastMove: "Filed · just now"
  };
  var user = loadJSON(LS_USER, []);
  user.push(c);
  saveJSON(LS_USER, user);
  complaints.push(c);

  var slip = document.getElementById("route-slip");
  slip.hidden = false;
  var tag = document.getElementById("slip-trade");
  tag.textContent = tradeLabel[r.trade] || "Warden desk";
  tag.className = "tag " + r.trade;
  var stamp = document.getElementById("slip-priority");
  stamp.textContent = r.priority;
  stamp.className = "stamp " + r.priority;
  document.getElementById("slip-reason").textContent = r.reason;

  filter = "all";
  document.querySelectorAll(".chip").forEach(function (ch) {
    ch.classList.toggle("active", ch.getAttribute("data-filter") === "all");
  });
  renderAll(c.id);
  showPlace(placeId);
  var el = document.querySelector('.slip[data-id="' + c.id + '"]');
  if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  return c;
}

/* ---------- bench ---------- */
function runBench() {
  fetch("bench/cases.json").then(function (res) { return res.json(); }).then(function (cases) {
    var tbody = document.querySelector("#bench-table tbody");
    var tradeOk = 0, bothOk = 0;
    tbody.innerHTML = cases.map(function (c) {
      var r = window.HostelRouter.route(c.text, places[c.placeId]);
      var tOk = r.trade === c.trade, pOk = r.priority === c.priority;
      if (tOk) tradeOk++;
      if (tOk && pOk) bothOk++;
      return "<tr" + (tOk && pOk ? "" : ' class="fail"') + "><td>" + c.id + "</td><td>" +
        escapeHTML(c.text) + "</td><td>" + c.trade + " / " + c.priority + "</td><td>" +
        r.trade + " / " + r.priority + "</td><td>" + (tOk && pOk ? "PASS" : "FAIL") + "</td></tr>";
    }).join("");
    document.getElementById("bench-table").hidden = false;
    var score = document.getElementById("bench-score");
    score.hidden = false;
    score.textContent = "Trade right: " + tradeOk + "/15 · Trade + priority right: " + bothOk + "/15";
  });
}

/* ---------- boot ---------- */
fetch("data.json").then(function (res) { return res.json(); }).then(function (json) {
  data = json;
  data.places.forEach(function (p) { places[p.id] = p; });
  data.trades.forEach(function (t) { tradeLabel[t.id] = t.label; tradePerson[t.id] = t.person; });
  tradeLabel.warden = "Warden desk"; tradePerson.warden = "the warden";
  buildState();
  buildPlacePicker();
  renderAll();

  scene = createScene(document.getElementById("stage"), showPlace);
  scene.build(data.places);
  scene.refresh(complaints);

  document.getElementById("complaint-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var text = document.getElementById("text").value.trim();
    if (!text) return;
    fileComplaint(document.getElementById("place").value, text,
      document.getElementById("by").value.trim());
    document.getElementById("text").value = "";
  });

  document.querySelectorAll(".try-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var parts = btn.getAttribute("data-try").split("|");
      document.getElementById("place").value = parts[0];
      document.getElementById("text").value = parts[1];
      fileComplaint(parts[0], parts[1], "You (sample)");
    });
  });

  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      filter = chip.getAttribute("data-filter");
      document.querySelectorAll(".chip").forEach(function (ch) {
        ch.classList.toggle("active", ch === chip);
      });
      renderBoard();
    });
  });

  document.getElementById("bench-btn").addEventListener("click", runBench);
  document.getElementById("reset-btn").addEventListener("click", function () {
    localStorage.removeItem(LS_USER);
    localStorage.removeItem(LS_OVERRIDES);
    location.reload();
  });

  /* scroll reveal for the below-fold sections — entry motion only */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".how, .bench").forEach(function (el) {
    el.classList.add("reveal");
    io.observe(el);
  });
}).catch(function (err) {
  document.getElementById("board").innerHTML =
    '<p class="board-empty">The board could not load its data (' + escapeHTML(err.message) +
    "). Serve this folder over HTTP — file:// will not do.</p>";
});
