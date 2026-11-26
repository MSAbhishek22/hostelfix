/* HostelFix router — plain-words complaint in, trade + priority out.
   Keyword and synonym matching only. No model, no network.
   Works in the browser (window.HostelRouter) and in Node (module.exports). */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.HostelRouter = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  /* Phrases are checked on the whole text and weigh more than single words,
     so "water cooler" (plumber) beats the bare word "cooler" (electrician). */
  var PHRASES = [
    { text: "water cooler", trade: "plumber", weight: 3 },
    { text: "short circuit", trade: "electrician", weight: 3 },
    { text: "burning smell", trade: "electrician", weight: 3 },
    { text: "tube light", trade: "electrician", weight: 2 }
  ];

  var WORDS = {
    electrician: {
      pankha: 2, fan: 2, light: 2, bulb: 2, switch: 2, socket: 2, bijli: 2,
      current: 2, spark: 2, sparking: 2, shock: 2, jhatka: 2, wiring: 2,
      mcb: 2, geyser: 2, plug: 1, inverter: 1, charging: 1, cooler: 1
    },
    plumber: {
      nal: 2, tap: 2, pipe: 2, leak: 2, tapak: 2, paani: 2, pani: 2,
      water: 2, flush: 2, tanki: 2, drain: 2, naali: 2, sink: 2,
      overflow: 2, shower: 1, jam: 1, washroom: 1, bathroom: 1, toilet: 1
    },
    carpenter: {
      darwaza: 2, door: 2, lock: 2, tala: 2, handle: 2, almari: 2,
      cupboard: 2, bed: 2, table: 2, kursi: 2, chair: 2, khidki: 2,
      window: 2, kaanch: 2, glass: 2, hinge: 2, wood: 1, pair: 1
    },
    housekeeping: {
      safai: 2, kachra: 2, garbage: 2, gandagi: 2, dirty: 2, cleaning: 2,
      dustbin: 2, jhadu: 2, cockroach: 1, smell: 1, mop: 1, sweep: 1
    },
    mess: {
      khana: 2, food: 2, daal: 2, roti: 2, mess: 2, baal: 1, namak: 1,
      taste: 1, swaad: 1, breakfast: 1, lunch: 1, dinner: 1
    }
  };

  var SAFETY_WORDS = ["spark", "sparking", "shock", "short circuit",
    "current lag", "jhatka", "smoke", "dhuan", "burning smell"];
  var NO_WATER = ["paani nahi", "pani nahi", "no water"];

  function tokenise(text) {
    return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  }

  function route(text, place) {
    var raw = " " + String(text || "").toLowerCase() + " ";
    var tokens = tokenise(text || "");
    var scores = {}, matched = {};
    Object.keys(WORDS).forEach(function (t) { scores[t] = 0; matched[t] = []; });

    PHRASES.forEach(function (p) {
      if (raw.indexOf(p.text) !== -1) {
        scores[p.trade] += p.weight;
        matched[p.trade].push(p.text);
      }
    });
    tokens.forEach(function (tok) {
      Object.keys(WORDS).forEach(function (trade) {
        if (Object.prototype.hasOwnProperty.call(WORDS[trade], tok)) {
          scores[trade] += WORDS[trade][tok];
          if (matched[trade].indexOf(tok) === -1) matched[trade].push(tok);
        }
      });
    });

    var best = null, bestScore = 0;
    Object.keys(scores).forEach(function (t) {
      if (scores[t] > bestScore) { bestScore = scores[t]; best = t; }
    });
    /* On a tie, the place's own trade wins — a washroom slip with one
       plumbing word and one electrical word stays with the washroom's trade
       unless the other side clearly outweighs it. */
    var placeTrade = place && place.defaultTrade ? place.defaultTrade : null;
    if (placeTrade && best !== placeTrade && scores[placeTrade] === bestScore && bestScore > 0) {
      best = placeTrade;
    }

    var fallback = false;
    if (!best || bestScore === 0) {
      fallback = true;
      best = placeTrade || "warden";
    }

    /* Priority. Safety first, then things that get worse if left,
       then taste-and-cosmetic slips, then the normal queue. */
    var priority = "normal", priorityWhy = "";
    var safetyHit = SAFETY_WORDS.filter(function (w) { return raw.indexOf(w) !== -1; })[0];
    var noWaterHit = NO_WATER.filter(function (w) { return raw.indexOf(w) !== -1; })[0];
    if (safetyHit) {
      priority = "urgent"; priorityWhy = "safety word '" + safetyHit + "'";
    } else if (noWaterHit) {
      priority = "urgent"; priorityWhy = "'" + noWaterHit + "' — water is out";
    } else if (raw.indexOf("overflow") !== -1) {
      priority = "urgent"; priorityWhy = "overflow — water spreads fast";
    } else if (raw.indexOf("naali jam") !== -1 || raw.indexOf("drain block") !== -1) {
      priority = "high"; priorityWhy = "blocked drain — it backs up";
    } else if (raw.indexOf("kaanch toot") !== -1 || raw.indexOf("glass toot") !== -1 ||
               raw.indexOf("kaanch tut") !== -1) {
      priority = "high"; priorityWhy = "broken glass";
    } else if ((raw.indexOf("baal") !== -1 || raw.indexOf("cockroach") !== -1) &&
               (best === "mess")) {
      priority = "high"; priorityWhy = "hygiene — found in food";
    } else if (raw.indexOf("light") !== -1 && raw.indexOf("band") !== -1) {
      priority = "high"; priorityWhy = "light is out";
    } else if (raw.indexOf("andhera") !== -1) {
      priority = "high"; priorityWhy = "left in the dark";
    } else if (best === "mess" &&
               ["namak", "taste", "swaad", "mirch"].some(function (w) { return raw.indexOf(w) !== -1; })) {
      priority = "low"; priorityWhy = "taste complaint — noted for the mess in-charge";
    } else if (["paint", "scratch"].some(function (w) { return raw.indexOf(w) !== -1; })) {
      priority = "low"; priorityWhy = "cosmetic — done when the trade is nearby";
    }

    var reason;
    if (fallback) {
      reason = placeTrade
        ? "No clear words matched — sent to this place's usual trade."
        : "No clear words matched — the warden desk reads it first.";
    } else {
      reason = "Words matched: " + matched[best].map(function (w) { return "'" + w + "'"; }).join(", ") + ".";
    }
    if (priorityWhy) reason += " Priority " + priority + " — " + priorityWhy + ".";

    return {
      trade: best,
      priority: priority,
      matched: fallback ? [] : matched[best],
      scores: scores,
      fallback: fallback,
      reason: reason
    };
  }

  return { route: route, WORDS: WORDS, PHRASES: PHRASES };
});
