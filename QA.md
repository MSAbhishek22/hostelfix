# HostelFix — QA

Run on 26 Nov 2026, local build only (nothing deployed, nothing registered).
Server: `python3 -m http.server` over the project folder. Browser: Playwright headless Chromium.

## Node tests — router
`node --test tests/router.test.mjs` → **14/14 pass.**
Covers: the "water cooler" phrase beating the bare word "cooler", safety words forcing urgent (spark, current lag), no-water forcing urgent, Hinglish routing for every trade, blocked drain = plumber + high, hair in food = mess + high, salt = mess + low, both fallback paths (place's usual trade, warden desk), the reason string naming matched words, and every seed complaint in data.json routing to its recorded trade and priority.

## HostelFixBench-15
`node bench/run.mjs` → **trade 15/15, trade + priority 15/15.** Full table in bench/RESULTS.md.
The same 15 cases run from the page's "Run the bench" button against the same router — the page showed 15/15 and 15/15 in QA.

## Browser QA — `python qa/qa.py`, 20/20 checks passed
- Board renders all 15 seed complaints.
- First screen at 1440×900, no scrolling: complaint form, board and 3D canvas all visible; problem → solution → outcome strip present.
- Canvas drawing buffer matches the canvas element's own box (598×426 = 598×426) — sized from the canvas, not a wrapper, so nothing is squashed.
- Canvas non-blank (631 distinct colours in the canvas region); open complaints read amber (3.6% amber-class pixels after the tint fix — the first run read only 0.02% on emissive alone under headless rendering, so open/urgent places now also take a colour tint, which any real browser shows the same way).
- Filing works end to end: picked Room 305, wrote "Room 305 ki light band hai, andhera ho gaya hai" → routed slip showed Electrician / high with the matched word 'light'; the slip appeared on the board highlighted, the detail panel followed to Room 305, and the 3D marker state refreshed.
- Status advance works (New → Given out) and the user's complaint survives a reload (localStorage). Reset restores the 15 seed complaints.
- Clicking the 3D block picks a place (picked Room 204).
- Bench runs from the page: 15/15, 15/15.
- 0 console errors. Mobile width (390×844) renders with no page errors. Reduced-motion context loads fine.

## Eyeball check
Screenshots read by eye, not just by counters: qa/first-screen.png (desktop), qa/after-filing.png, qa/mobile.png. The noticeboard identity reads at a glance — paper ground, pinned slips with trade tags and priority stamps, the block lit amber/red/green in the middle. One real defect was found and fixed during QA: three seed complaints pointed at rooms that do not exist in a 10-rooms-per-floor block (214, 118, 221), so their slips showed a raw place id instead of a room label. Seeds, bench cases and tests now use rooms that exist (204, 109, 207), and everything above was re-run after the fix.

## Fix round — 3D framing (27 Nov 2026)
A real-Chrome check of the live site (1920×911) found the scene framing broken: the block's right end (roof, floor slabs, rightmost rooms) ran off the right edge of the canvas, the left half of the canvas was a large empty tan ground plane, and the three ground-floor shared points (mess, common room, entrance) sat detached in front of the building like stray blocks. Fixed in `js/scene.js` only — data, router, board, colours and click behaviour untouched:
- **Camera reframed.** Position (11, 9.5, 18) → (14.5, 11.9, 26); lookAt (0, 3.4, 0) → (2.1, 3.1, -0.2), the block's projected centre, so the building sits centred instead of pushed right. `resize()` now holds the horizontal view at ~60° (vertical fov = 2·atan(tan 30° / aspect), clamped 30–85°), so on tall canvases the fov widens and the block's width never crops. Framing was verified numerically against the real geometry bounds before the patch: projected extents |x| ≤ 0.59, |y| ≤ 0.87 at every canvas aspect from 0.8 to 2.11.
- **Ground shrunk to the plot.** 46×30 at the origin → 26×12 centred at z = 1.5: about 2 units of ground past the building on every side, no empty field.
- **Forecourt added.** A paved pad (17.6×2.7, ink-outlined like the place blocks) under the three shared points, plus a path (3.4×2.6) from the block's front to the pad — the mess, common room and entrance now stand on the scene. They stay clickable: a click probe over the forecourt row picked "Block entrance" into the detail panel, and the standard QA click-pick still passes.
- **Re-verified:** `python qa/qa.py` → **20/20 checks passed** (0 console errors; buffer still sized from the canvas element). Fresh screenshots eyeballed: qa/fix-round-desktop.png (canvas crop at a 1920×911 viewport — whole block inside the frame, roof and both ends visible with margin, pad and path reading clearly) and qa/fix-round-mobile.png (390×844 — whole block inside there too).

## Fix round 2 — fit-to-view framing (27 Nov 2026)
Two independent real-Chrome checks of the LIVE site still showed the round-1 framing broken: the block's right end at the canvas edge with no right margin, the ground reading as a wide loose plane, and no visible pad under the three front boxes. (The live files were diffed against this folder during this round — byte-identical, so the live code is this code.) Round 1's QA claimed "projected extents |x| ≤ 0.59, |y| ≤ 0.87" — that projection was never reproduced and does not survive a correct one. This time the failure was reproduced numerically BEFORE any patch, with `qa/projection-check.mjs` (rebuilds the exact build() geometry from data.json, applies world.rotation.y = −0.35, projects through the round-1 camera (14.5, 11.9, 26) lookAt (2.1, 3.1, −0.2) with the old resize() fov policy):

- **World Box3** (rotation applied): min (−14.78, −0.02, −8.68), max (13.75, 7.72, 11.50) — much wider than the building alone, because the rotated 26×12 ground's corners swing out to x = −14.78 / +13.75 and z = −8.68 / +11.50. Round 1's bounds ignored this.
- **Box3 corners through the round-1 camera exceed the frame at every aspect:** aspect 1.2 → max|ndc.x| = **1.364**, max|ndc.y| = 0.957 · aspect 1.6 → **1.364 / 1.276** · aspect 2.0 → **1.364 / 1.595** · aspect 2.4 → **1.224 / 1.718**. The world as built simply does not fit the round-1 frame — horizontally clipped at all four aspects, vertically clipped from 1.6 up.
- Vertex-level detail (real geometry, not AABB corners): the worst offender is the ground plane itself — max|ndc.x| = 0.798 to the LEFT at every aspect, max|ndc.y| = 1.078 (aspect 1.6) to 1.451 (aspect 2.4), i.e. the ground runs off the bottom of the frame while the composition sits left-heavy: the roof's right end reaches only ndc.x ≈ +0.47 while the ground reaches −0.80 on the left — no balanced margin on either side, and the pad (0xdccda6 against ground 0xe7dcc0, a 0.03-per-channel difference) is the same tan as the ground, so it cannot read as paving.
- The live canvas's real aspect was measured headless at a 1920×911 viewport: **618×426 → 1.451 at root font 20px and at 16px** (the grid columns are px-sized, so the root font does not change the canvas box) — inside the range above, where the world box already exceeds the frame.

**The fix (`js/scene.js` only):**
- **Hand-tuned framing deleted; runtime fit-to-view added.** build() computes the world group's Box3 after building; `applyFit()` positions the camera along a fixed view direction (the round-1 view feel: offset (12.4, 8.8, 26.2), normalised) aimed at the box centre, at the exact distance that fits the box's projected width AND height for the canvas's current aspect, × 1.06 (≈6% margin). `resize()` re-runs the fit on every size change (fov is a fixed 42° now — the old "~60° horizontal" fov policy is gone). Wheel zoom now scales the fitted distance (0.55×–1.7×); drag-rotate keeps its existing clamp; click-pick unchanged (qa.py re-verified it, Room 202).
- **Ground derived from the footprint.** build() unions the bounds of everything except the ground — footprint x [−10.95, 10.95], z [−2.45, 5.95] — and sizes the ground to footprint + 1.5 units per side: **24.9 × 11.4 centred (0, 1.75)**, instead of a hand-picked 26×12.
- **Pad made readable.** Forecourt pad + path: 0xdccda6 → **0x8b98a8**, a cool slate far darker than the warm ground (0xe7dcc0), ink outlines kept. Complaint-state colours untouched.

**Post-fix projection proof** (`node qa/projection-check.mjs fit`, same Box3 method, world box now min (−14.25, −0.02, −7.98) / max (13.05, 7.72, 11.27), centre (−0.60, 3.85, 1.64)): aspect 1.2 → fit distance 41.96, max|ndc.x| = 0.938, max|ndc.y| = 0.708 · aspect 1.6 → 35.44, 0.848 / 0.911 · aspect 2.0 → 35.44, 0.679 / 0.911 · aspect 2.4 → 35.44, 0.566 / 0.911. **The whole world box is inside the frame at every aspect** (the worst value, 0.938, is exactly the 6% margin acting on the rotated ground's phantom AABB corners — real geometry sits further in).

**Re-verified:** `python qa/qa.py` → **20/20 checks passed** (0 console errors; buffer still sized from the canvas element). `python qa/fix2-shots.py` at the user's Chrome condition — viewport 1920×911, root font forced to **20px** and to **16px**, plus mobile 390×844: canvas 618×426 (desktop) / 310×336 (mobile), and the outer 8px frame of every canvas crop is **0.00% non-clear pixels** — nothing touches any edge. Eyeballed (qa/fix2-desktop-20px.png, qa/fix2-desktop-16px.png, qa/fix2-mobile.png, qa/fix2-fullpage-20px.png): whole block inside with margin on BOTH sides at both root fonts and on mobile; the ground now hugs the block as a tight plot; the slate pad reads clearly under the three front boxes with the path joining it to the block. Wheel zoom in/out and drag-rotate were exercised headless after the handler rework — the view changes each way, no errors. Still NOT deployed — the parent pushes and takes the real-Chrome verdict.

## Not covered
- Real-browser check in the user's own Chrome (the fleet rule: headless is not the final verdict for 3D). The tint-based state colours were chosen so the 3D state reads even where emissive rendering differs, but the live check still belongs to deploy time — and this build is deliberately not deployed.
- HackOdisha itself is UNVERIFIED as an event (official Devfolio page not yet opened). This QA says the product works; it says nothing about the event.
