"""HostelFix headless QA — python qa/qa.py
Checks: first screen, end-to-end filing, status advance, bench, 3D canvas
(non-blank, right proportions, click-to-pick), 0 console errors."""
import sys
from playwright.sync_api import sync_playwright
from PIL import Image
import io

URL = "http://127.0.0.1:8901/index.html"
results = []

def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + (" — " + detail if detail else ""))

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_selector(".slip", timeout=8000)

    slips = page.locator(".slip").count()
    check("board renders the 15 seed complaints", slips == 15, f"slips={slips}")

    # first screen: form + board + canvas all visible without scrolling
    for sel, name in [("#complaint-form", "form"), ("#board", "board"), ("#stage", "3D canvas")]:
        box = page.locator(sel).bounding_box()
        check(f"first screen shows {name} without scrolling",
              box is not None and box["y"] + 40 < 900 and box["y"] >= 0,
              f"y={box['y'] if box else 'none'}")
    strip = page.locator(".strip").inner_text()
    check("problem / solution / outcome strip present",
          "problem" in strip.lower() and "HostelFix does" in strip and "What changes" in strip)

    # canvas proportions: drawing buffer aspect must match the element box
    prop = page.evaluate("""() => {
      const c = document.querySelector('#stage');
      return { bw: c.width, bh: c.height, cw: c.clientWidth, ch: c.clientHeight };
    }""")
    ratio_buf = prop["bw"] / prop["bh"]
    ratio_css = prop["cw"] / prop["ch"]
    check("canvas buffer matches canvas box proportions",
          abs(ratio_buf - ratio_css) < 0.02,
          f"buffer {prop['bw']}x{prop['bh']} vs box {prop['cw']}x{prop['ch']}")

    # canvas non-blank: screenshot the canvas region, count colour variety
    box = page.locator("#stage").bounding_box()
    shot = page.screenshot(clip={"x": box["x"], "y": box["y"],
                                 "width": box["width"], "height": box["height"]})
    img = Image.open(io.BytesIO(shot)).convert("RGB")
    colours = img.getcolors(maxcolors=1 << 24)
    n_colours = len(colours) if colours else 99999
    amberish = sum(n for n, rgb in (colours or [])
                   if rgb[0] > 180 and 100 < rgb[1] < 200 and rgb[2] < 90)
    total = img.width * img.height
    check("3D canvas is non-blank with varied colours", n_colours > 40, f"colours={n_colours}")
    check("open complaints glow amber in the 3D block", amberish / total > 0.002,
          f"amber pixels={amberish/total:.3%}")

    page.screenshot(path="qa/first-screen.png")

    # file a complaint end-to-end
    page.select_option("#place", "room-305")
    page.fill("#text", "Room 305 ki light band hai, andhera ho gaya hai")
    page.fill("#by", "QA Tester")
    page.click(".file-btn")
    page.wait_for_selector("#route-slip:not([hidden])", timeout=5000)
    slip = page.locator("#route-slip").inner_text()
    check("routed slip shows the trade and the matched words",
          "electrician" in slip.lower() and "light" in slip, slip.replace("\n", " | ")[:120])
    slips = page.locator(".slip").count()
    check("new complaint appears on the board", slips == 16, f"slips={slips}")
    fresh = page.locator(".slip.fresh")
    check("new slip is highlighted on the board", fresh.count() == 1)
    detail = page.locator("#detail-title").inner_text()
    check("3D detail panel follows the filing", "Room 305" in detail, detail)

    # advance its status (the fresh highlight is momentary, so track by id)
    fresh_id = page.locator(".slip.fresh").get_attribute("data-id")
    page.locator(f'.slip[data-id="{fresh_id}"] [data-advance]').click()
    page.wait_for_timeout(300)
    status = page.locator(f'.slip[data-id="{fresh_id}"] .slip-status').inner_text()
    check("status advances on the board", "Given out" in status, status)

    # persistence: reload keeps the user's complaint
    page.reload()
    page.wait_for_selector(".slip", timeout=8000)
    slips = page.locator(".slip").count()
    check("user complaint persists after reload (localStorage)", slips == 16, f"slips={slips}")

    page.screenshot(path="qa/after-filing.png")

    # bench from the page
    page.click("#bench-btn")
    page.wait_for_selector("#bench-score:not([hidden])", timeout=5000)
    score = page.locator("#bench-score").inner_text()
    check("bench runs on the page", "/15" in score, score)

    # click the 3D block to pick a place
    box = page.locator("#stage").bounding_box()
    picked = None
    for fx, fy in [(0.5, 0.42), (0.42, 0.5), (0.58, 0.55), (0.5, 0.62), (0.35, 0.45)]:
        page.mouse.click(box["x"] + box["width"] * fx, box["y"] + box["height"] * fy)
        page.wait_for_timeout(250)
        title = page.locator("#detail-title").inner_text()
        if title != "Nothing picked yet":
            picked = title
            break
    check("clicking the 3D block picks a place", picked is not None, str(picked))

    # reset clears user data
    page.click("#reset-btn")
    page.wait_for_selector(".slip", timeout=8000)
    slips = page.locator(".slip").count()
    check("reset restores the seed board", slips == 15, f"slips={slips}")

    check("0 console errors", len(errors) == 0, "; ".join(errors[:3]))

    # mobile width renders
    mob = browser.new_page(viewport={"width": 390, "height": 844})
    merr = []
    mob.on("pageerror", lambda e: merr.append(str(e)))
    mob.goto(URL)
    mob.wait_for_selector(".slip", timeout=8000)
    mob.screenshot(path="qa/mobile.png")
    check("mobile width renders with no page errors", len(merr) == 0, "; ".join(merr[:2]))

    # reduced motion still works
    ctx = browser.new_context(reduced_motion="reduce", viewport={"width": 1440, "height": 900})
    rm = ctx.new_page()
    rm.goto(URL)
    rm.wait_for_selector(".slip", timeout=8000)
    check("reduced-motion context loads the board", rm.locator(".slip").count() == 15)

    browser.close()

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
