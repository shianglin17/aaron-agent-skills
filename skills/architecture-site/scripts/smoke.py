# /// script
# dependencies = ["playwright==1.58.0"]
# ///
"""Open every page at 390 and 1280 px, light and dark, and click every diagram item.

usage: uv run smoke.py <site dir>

Fails on: JS errors or console errors, horizontal page scroll, a click that leaves
the panel empty, relative links to missing files, nav links or summaries under 44px.
Set PLAYWRIGHT_CHROMIUM_EXECUTABLE to use a specific Chromium; otherwise run
`uv run --with playwright==1.58.0 playwright install chromium` once.
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

site = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else sys.exit(__doc__)
pages = sorted(site.glob("*.html"))
fails = []
SMALL = """() => Array.from(document.querySelectorAll('.topnav a, summary, .topics a'))
  .filter(e => e.getClientRects().length)
  .map(e => [e.textContent.trim().slice(0, 12), e.getBoundingClientRect().height])
  .filter(x => x[1] < 44)"""
LINKS = """() => Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href'))
  .filter(h => !/^(https?:|mailto:|tel:|#)/.test(h))"""

with sync_playwright() as p:
    exe = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
    browser = p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()
    for width in (390, 1280):
        for scheme in ("light", "dark"):
            ctx = browser.new_context(viewport={"width": width, "height": 900}, color_scheme=scheme)
            for page in pages:
                tag = f"{page.name} {width}/{scheme}"
                pg = ctx.new_page()
                pg.on("pageerror", lambda e, t=tag: fails.append(f"{t} pageerror: {e}"))
                pg.on("console", lambda m, t=tag: fails.append(f"{t} console {m.type}: {m.text}") if m.type == "error" else None)
                pg.goto(page.as_uri())
                pg.wait_for_timeout(300)
                if pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"):
                    fails.append(f"{tag}: horizontal scroll")
                for small in pg.evaluate(SMALL):
                    fails.append(f"{tag}: target under 44px: {small}")
                for href in pg.evaluate(LINKS):
                    if not (site / href.split("#")[0]).is_file():
                        fails.append(f"{tag}: broken link {href}")
                items = pg.locator("svg [data-key]")
                for i in range(items.count()):
                    item = items.nth(i)
                    key = item.get_attribute("data-key")
                    item.scroll_into_view_if_needed()
                    item.dispatch_event("click")
                    panel = pg.evaluate(f"""() => {{
                      const svg = document.querySelector('[data-key="{key}"]').closest('svg');
                      const h = document.getElementById(svg.dataset.panel).querySelector('h3');
                      return h ? h.textContent.trim() : '';
                    }}""")
                    if not panel:
                        fails.append(f"{tag}: click {key} left the panel empty")
                    item.dispatch_event("click")  # toggle back to the default
                if items.count():
                    items.first.focus()
                    pg.keyboard.press("ArrowRight")
                    pg.keyboard.press("Enter")
                    if pg.evaluate("document.activeElement.getAttribute('aria-pressed')") != "true":
                        fails.append(f"{tag}: keyboard ArrowRight + Enter did not select")
                pg.close()
            ctx.close()
    browser.close()

for f in fails:
    print("FAIL:", f)
print(f"{len(pages)} pages x 4 views, {len(fails)} failed")
sys.exit(1 if fails else 0)
