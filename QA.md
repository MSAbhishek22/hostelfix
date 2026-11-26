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

## Not covered
- Real-browser check in the user's own Chrome (the fleet rule: headless is not the final verdict for 3D). The tint-based state colours were chosen so the 3D state reads even where emissive rendering differs, but the live check still belongs to deploy time — and this build is deliberately not deployed.
- HackOdisha itself is UNVERIFIED as an event (official Devfolio page not yet opened). This QA says the product works; it says nothing about the event.
