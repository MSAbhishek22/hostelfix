/* Router tests — node --test tests/ */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const router = require(join(here, "..", "js", "router.js"));
const data = JSON.parse(readFileSync(join(here, "..", "data.json"), "utf8"));
const places = Object.fromEntries(data.places.map((p) => [p.id, p]));

test("water cooler phrase beats the bare word cooler", () => {
  const r = router.route("water cooler band hai", places["cooler-1"]);
  assert.equal(r.trade, "plumber");
});

test("safety word spark forces urgent + electrician", () => {
  const r = router.route("switch se spark nikal raha hai", places["washroom-2"]);
  assert.equal(r.trade, "electrician");
  assert.equal(r.priority, "urgent");
});

test("current lag (shock) is urgent", () => {
  const r = router.route("socket me current lag raha hai", places["room-109"]);
  assert.equal(r.priority, "urgent");
});

test("no water is urgent", () => {
  const r = router.route("cooler se paani nahi aa raha", places["cooler-3"]);
  assert.equal(r.priority, "urgent");
});

test("Hinglish fan noise routes to electrician, normal queue", () => {
  const r = router.route("pankha bahut awaz karta hai", places["room-204"]);
  assert.equal(r.trade, "electrician");
  assert.equal(r.priority, "normal");
});

test("door and lock route to carpenter", () => {
  const r = router.route("darwaza ka lock kharab hai", places["room-108"]);
  assert.equal(r.trade, "carpenter");
});

test("safai routes to housekeeping", () => {
  const r = router.route("corridor me kachra hai, safai karo", places["corridor-1"]);
  assert.equal(r.trade, "housekeeping");
});

test("hair in food is mess + high", () => {
  const r = router.route("khane me baal nikla", places["mess"]);
  assert.equal(r.trade, "mess");
  assert.equal(r.priority, "high");
});

test("too much salt is mess + low", () => {
  const r = router.route("daal me namak zyada hai", places["mess"]);
  assert.equal(r.trade, "mess");
  assert.equal(r.priority, "low");
});

test("blocked drain is plumber + high", () => {
  const r = router.route("naali jam hai", places["washroom-1"]);
  assert.equal(r.trade, "plumber");
  assert.equal(r.priority, "high");
});

test("unmatched words fall back to the place's usual trade", () => {
  const r = router.route("kuch gadbad hai yahan", places["washroom-3"]);
  assert.equal(r.fallback, true);
  assert.equal(r.trade, "plumber");
});

test("unmatched words in a room go to the warden desk", () => {
  const r = router.route("kuch gadbad hai yahan", places["room-101"]);
  assert.equal(r.fallback, true);
  assert.equal(r.trade, "warden");
});

test("reason names the matched words", () => {
  const r = router.route("pankha kharab hai", places["room-101"]);
  assert.ok(r.reason.includes("pankha"));
});

test("every seed complaint in data.json routes to its recorded trade", () => {
  for (const c of data.seedComplaints) {
    const r = router.route(c.text, places[c.placeId]);
    assert.equal(r.trade, c.trade, "seed " + c.id + ": " + c.text);
    assert.equal(r.priority, c.priority, "seed " + c.id + ": " + c.text);
  }
});
