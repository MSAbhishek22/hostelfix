"""HostelFix fix-round-2 framing shots — python qa/fix2-shots.py
Viewport 1920x911 (the user's Chrome) with the root font forced to 20px
and to 16px, plus a mobile size. For each: screenshot the canvas crop and
check that its outer 8px frame is (nearly) all the renderer's clear
colour #f3ead2 — proof the fitted world sits inside with margin on
every side, not just by eye."""
import sys
from playwright.sync_api import sync_playwright
from PIL import Image
import io

URL = "http://127.0.0.1:8901/index.html"
CLEAR = (243, 234, 210)  # 0xf3ead2

def frame_check(shot_bytes):
    img = Image.open(io.BytesIO(shot_bytes)).convert("RGB")
    w, h = img.size
    px = img.load()
    total = bad = 0
    for x in range(w):
        for y in list(range(8)) + list(range(h - 8, h)):
            total += 1
            r, g, b = px[x, y]
            if abs(r - CLEAR[0]) > 8 or abs(g - CLEAR[1]) > 8 or abs(b - CLEAR[2]) > 8:
                bad += 1
    for y in range(h):
        for x in list(range(8)) + list(range(w - 8, w)):
            total += 1
            r, g, b = px[x, y]
            if abs(r - CLEAR[0]) > 8 or abs(g - CLEAR[1]) > 8 or abs(b - CLEAR[2]) > 8:
                bad += 1
    return bad / total

fails = []
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    for tag, vw, vh, rootpx in [("desktop-20px", 1920, 911, 20),
                                ("desktop-16px", 1920, 911, 16),
                                ("mobile", 390, 844, None)]:
        page = browser.new_page(viewport={"width": vw, "height": vh})
        if rootpx:
            page.add_init_script(
                "document.addEventListener('DOMContentLoaded', () => {"
                f" document.documentElement.style.fontSize = '{rootpx}px'; }});")
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.goto(URL)
        page.wait_for_selector(".slip", timeout=8000)
        page.wait_for_timeout(700)
        box = page.locator("#stage").bounding_box()
        page.locator("#stage").scroll_into_view_if_needed()
        page.wait_for_timeout(400)
        box = page.locator("#stage").bounding_box()
        shot = page.screenshot(clip={"x": box["x"], "y": box["y"],
                                     "width": box["width"], "height": box["height"]})
        path = f"qa/fix2-{tag}.png"
        with open(path, "wb") as fh:
            fh.write(shot)
        frac = frame_check(shot)
        ok = frac < 0.01 and not errs
        print(("PASS " if ok else "FAIL ") + tag +
              f" — canvas {int(box['width'])}x{int(box['height'])}" +
              f", non-clear edge-frame pixels {frac:.2%}, pageerrors {len(errs)} -> {path}")
        if not ok:
            fails.append(tag)
        if tag == "desktop-20px":
            page.screenshot(path="qa/fix2-fullpage-20px.png", full_page=False)
        page.close()
    browser.close()

sys.exit(1 if fails else 0)
