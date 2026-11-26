# Design references — HostelFix

Opened and read on 26 Nov 2026, before any HostelFix code was written. Sources are from the Blueprint Appendix H list. Nothing here was copied — no images, no layouts lifted whole, no text reused. Each entry says what was looked at, what idea was taken, and what was left behind.

## 1. Linear — linear.app (found via dark.design)
- **Inspected:** the homepage's product shots — an issue board with status columns, small colour labels on each issue, and an activity feed where every change ("moved from Todo to In Progress · just now") is written in plain words with a time.
- **Adapted:** the board idea — a complaint should always show where it stands (New / Assigned / In progress / Done) and what changed last, in one line. HostelFix complaint cards carry a status pin and a "last move" line for this reason.
- **Not copied:** the dark theme, the dense keyboard-first density, the whole SaaS look. A hostel noticeboard is the opposite setting — paper, ink, daylight.

## 2. Raycast — raycast.com (found via dark.design)
- **Inspected:** the homepage and its "shortcut to everything" framing — one input, one action, result straight away, nothing else on screen competing.
- **Adapted:** the complaint form is one box and one button. Type the problem in your own words, press File, get the answer. No category dropdowns to study first — the routing is the product's job, not the student's.
- **Not copied:** the dark glass look, the macOS-app framing, the extension-store sprawl.

## 3. Furniture Connect — furnitureconnect.com (found via minimal.gallery)
- **Inspected:** the landing structure — a plain problem statement up top ("supplier files keep catalogues from going live"), then "How it works", then proof and questions. The first screen says the problem and the outcome before any feature list.
- **Adapted:** HostelFix's first screen runs problem → solution → outcome in that order: the register nobody reads, one complaint filed in 20 seconds, the same complaint watched till it is done.
- **Not copied:** the corporate catalogue content, the testimonial blocks, the sales tone.

## 4. Land-book gallery — land-book.com
- **Inspected:** the gallery grid itself and the landing pages it lists (Pylon, HuHealth, Munch and others) — strong single headline, one clear action, cards with a small category tag in the corner.
- **Adapted:** the corner-tag habit. Every complaint card gets a small trade tag (Plumber, Electrician…) in the corner, readable at a glance from across the board — the way a paper slip on a real noticeboard is tagged.
- **Not copied:** any listed site's layout, imagery or wording.

## 5. One Page Love — onepagelove.com
- **Inspected:** the latest one-page sites and templates, and their piece on narrow layouts — one page that has to carry the whole story, so nothing on it is decoration.
- **Adapted:** HostelFix is one page and the whole product is on the first screen — form, board and the 3D block together, no scroll needed on a desktop to file a complaint and see it land.
- **Not copied:** template layouts and their stock-photo look.

## 6. Godly — godly.website
- **Inspected:** the recent-designs feed — big confident type, one strong colour field per site, very little on screen at once.
- **Adapted:** confidence in the masthead. "HostelFix" is set large like a painted sign over a noticeboard, and the page commits to one colour field (off-white paper) instead of hedging with gradients.
- **Not copied:** the avant-garde layouts — a warden and a first-year student both have to read this page in five seconds.

## Background study
The references split into two camps: dark glass (Linear, Raycast) and flat single-colour fields (the godly.website picks, Furniture Connect's pale ground). HostelFix takes the second camp and grounds it in its own world: a real hostel noticeboard is sun-bleached paper pinned on a wall. So the page background is off-white paper (#f6f1e3) with a faint ruled-line pattern and a soft cork-brown edge at the top — built with CSS gradients from the project's own colours, no image files. The dark camp was rejected for a plain reason: complaints are read in daylight, often on a phone in a corridor, and ink on paper is the most readable thing there is. The 3D block sits on the same paper as a model pinned to the board, lit warm, so the page reads as one board, not a dashboard with a chart dropped in.

## Identity decisions that came out of this
- Noticeboard, not dashboard: paper cards, pin dots, marker-red for urgent, ink blue for structure, amber for waiting.
- Two of the standing palette styles: **Neo-Brutalism** (hard ink borders, flat offset shadows on cards and buttons) and **Hand-drawn** touches (slightly rotated pinned cards, tape strips, marker underlines), plus scroll-reveal on the sections below the fold.
- Motion is purposeful only: a new card pins in, the 3D marker pulses only while a complaint is open, and `prefers-reduced-motion` turns all of it off.
