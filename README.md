# HostelFix

A hostel complaint goes into a paper register at the warden's desk, and nobody reads it back. HostelFix is the noticeboard that register should have been: a student writes one complaint in plain words — Hindi, English, mixed — and the board routes it to the right trade, pins it where everyone can see it, and keeps it there till it is marked done.

Built as the foundation project for HackOdisha 6.0 (36-hour online hack, 11–13 Dec 2026). Local build only so far — not deployed, not registered.

## The one action
File one complaint in about twenty seconds: pick the place, write what is wrong ("3rd floor ka water cooler band hai, paani nahi aa raha"), pin it. The slip lands on the board with a trade, a priority, and the words that decided both.

## How routing works — honestly
No AI model and no server. The router (`js/router.js`) is keyword and synonym matching, in the browser:

- Phrases beat single words, so "water cooler" goes to the plumber, not the electrician.
- Hinglish words count: pankha, nal, bijli, safai, naali, darwaza, kachra.
- Safety words jump the queue: spark, shock, current lag, short circuit. No water and overflow are urgent too. A blocked drain and broken glass are high. A taste complaint about the mess is low, and says so.
- Every routed slip shows its working: "Words matched: 'switch', 'spark'. Priority urgent — safety word 'spark'."
- If no words match, the slip goes to the place's usual trade, or to the warden desk if the place has none. It never silently picks a trade.

## The block in 3D
The middle of the page is Block C itself — 4 floors, 40 rooms, water coolers, washrooms and corridors, plus the mess hall, common room and entrance on the ground floor (Three.js, vendored in `vendor/`). It runs off the same `data.json` as the board: a place with an open complaint glows amber, an urgent one red, a place whose work is all done sits in quiet green. Filing a complaint lights its spot. Clicking a room or a marker lists what is pinned there. Drag to turn the block, scroll to zoom.

## The board
Every complaint is a pinned slip: the words, the place, the trade tag, the priority stamp, the status (New → Given out → Being fixed → Done) and the last move ("Given to Ramesh, the plumber · 40 min ago"). Buttons move a slip along — give it out, start work, mark done. Your own filings and every status change are kept in your browser's localStorage; the Reset button in the footer wipes them.

## HostelFixBench-15
Fifteen written complaints with the trade and priority a warden would expect — `bench/cases.json`. Run them in Node (`node bench/run.mjs`, output written to `bench/RESULTS.md`) or from the page's "Run the bench" button. Current score: **trade 15/15, trade + priority 15/15.**

## Run it
Static site, no build step — but it must be served over HTTP because it loads `data.json`:

```
python3 -m http.server 8901
# open http://127.0.0.1:8901/
```

## Tests
```
node --test tests/router.test.mjs   # 14 router tests
node bench/run.mjs                  # bench, writes bench/RESULTS.md
python3 qa/qa.py                    # headless browser QA (needs the server running)
```
QA record: QA.md. Design references: REFERENCES.md.

## Files
- `index.html`, `style.css` — the page (noticeboard identity: paper, ink blue, marker red)
- `data.json` — the one source of truth: block, trades, 55 places, 15 seed complaints
- `js/router.js` — the router (browser + Node)
- `js/app.js` — board, form, bench, persistence
- `js/scene.js` — the 3D block
- `bench/` — the 15 cases, the runner, the results
- `tests/`, `qa/` — router tests, browser QA and screenshots

Block C is made up. No real hostel, college or person is named.
