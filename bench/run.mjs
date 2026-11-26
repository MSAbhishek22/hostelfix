/* HostelFixBench-15 — runs the router over bench/cases.json and writes
   the real output to bench/RESULTS.md. Run: node bench/run.mjs
   The same cases run in the browser from the page's "Run the bench" button. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const router = require(join(here, "..", "js", "router.js"));
const data = JSON.parse(readFileSync(join(here, "..", "data.json"), "utf8"));
const cases = JSON.parse(readFileSync(join(here, "cases.json"), "utf8"));
const places = Object.fromEntries(data.places.map((p) => [p.id, p]));

let tradeOk = 0, bothOk = 0;
const rows = cases.map((c) => {
  const r = router.route(c.text, places[c.placeId]);
  const tOk = r.trade === c.trade;
  const pOk = r.priority === c.priority;
  if (tOk) tradeOk++;
  if (tOk && pOk) bothOk++;
  return { c, r, tOk, pOk };
});

const lines = [];
lines.push("# HostelFixBench-15 — results");
lines.push("");
lines.push("15 written complaints, each with the trade and priority a warden would expect.");
lines.push("Run with `node bench/run.mjs` — this file is the real output of that run, not a hand-written score.");
lines.push("");
lines.push("**Trade right: " + tradeOk + "/15 · Trade + priority right: " + bothOk + "/15**");
lines.push("");
lines.push("| # | Complaint | Place | Expected | Got | Trade | Priority |");
lines.push("|---|---|---|---|---|---|---|");
for (const { c, r, tOk, pOk } of rows) {
  lines.push("| " + c.id + " | " + c.text + " | " + c.placeId + " | " +
    c.trade + " / " + c.priority + " | " + r.trade + " / " + r.priority + " | " +
    (tOk ? "PASS" : "FAIL") + " | " + (pOk ? "PASS" : "FAIL") + " |");
}
lines.push("");
for (const { c, r, tOk, pOk } of rows) {
  if (!(tOk && pOk)) {
    lines.push("- Case " + c.id + " missed: expected " + c.trade + "/" + c.priority +
      ", got " + r.trade + "/" + r.priority + ". Router said: " + r.reason);
  }
}
if (bothOk === 15) lines.push("No misses on this run.");
lines.push("");
writeFileSync(join(here, "RESULTS.md"), lines.join("\n"));
console.log("HostelFixBench-15: trade " + tradeOk + "/15, trade+priority " + bothOk + "/15");
