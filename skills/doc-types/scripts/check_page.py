#!/usr/bin/env python3
"""Check a single-page HTML file without a browser.

usage: python3 check_page.py <page.html> [--links-like <other.html>]

Reads the page and every local stylesheet it links. Fails when:
  - there is no <title> in the first 8 KB, or it is empty
  - no custom property (--name) is defined in a bare :root block
  - a dark mode is missing: needs @media (prefers-color-scheme: dark) with
    :root:not([data-theme="light"]), and :root[data-theme="dark"]
  - body has no background
  - a script loads from a host other than the allowed CDNs, a stylesheet loads
    from a host other than Google Fonts, or an image, font or url() loads from the web
  - the page contains a local absolute path (/Users/, /home/, /private/, /var/folders/, C:\\, file://)
  - the page contains an emoji
  - claude:viewport-fit-sides is set but body lacks both max(16px, env(safe-area-inset-*)) paddings
Prints every link (<a href>). With --links-like, fails when the two pages'
link lists differ, and prints what was added or removed.
Exits 1 when a check fails.
"""
import re
import sys
from collections import Counter
from pathlib import Path

SCRIPT_HOSTS = ("https://cdnjs.cloudflare.com/", "https://cdn.jsdelivr.net/npm/", "https://unpkg.com/",
                "https://cdn.tailwindcss.com", "https://code.jquery.com/")
STYLE_HOSTS = ("https://fonts.googleapis.com/",)
LOCAL_PATH = re.compile(r"(/Users/|/home/|/private/|/var/folders/|[A-Z]:\\\\|file://)")
EMOJI = re.compile("[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B50\u2B55\uFE0F]")
HREF = re.compile(r'<a\b[^>]*\bhref="([^"]*)"', re.I)
LINK_CSS = re.compile(r'<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"', re.I)
SCRIPT_SRC = re.compile(r'<script\b[^>]*\bsrc="([^"]+)"', re.I)
MEDIA_SRC = re.compile(r'<(?:img|source|video|audio|iframe|embed)\b[^>]*\bsrc="(https?:[^"]+)"', re.I)
CSS_URL = re.compile(r'url\(\s*["\']?(https?:[^)"\']+)', re.I)
STYLE = re.compile(r"<style\b[^>]*>(.*?)</style>", re.S | re.I)
TITLE = re.compile(r"<title>(.*?)</title>", re.S | re.I)

fails = []


def css_of(path, html):
    parts = STYLE.findall(html)
    for href in LINK_CSS.findall(html):
        if not href.startswith(("http:", "https:", "//")):
            f = path.parent / href
            if f.is_file():
                parts.append(f.read_text(encoding="utf-8"))
            else:
                fails.append(f"stylesheet not found: {href}")
    return "\n".join(parts)


def links(html):
    return HREF.findall(html)


def main(argv):
    if not argv or argv[0].startswith("-"):
        sys.exit(__doc__)
    path = Path(argv[0])
    html = path.read_text(encoding="utf-8")
    css = css_of(path, html)
    nocomment = re.sub(r"/\*.*?\*/", "", css, flags=re.S)

    t = TITLE.search(html[:8192])
    if not t or not t.group(1).strip():
        fails.append("no <title> in the first 8 KB")
    if not re.search(r"(?:^|\})\s*:root\s*\{[^}]*--[\w-]+\s*:", nocomment):
        fails.append("no custom property defined in a bare :root block")
    if not re.search(r"@media\s*\(\s*prefers-color-scheme:\s*dark\s*\)\s*\{\s*:root:not\(\[data-theme=\"light\"\]\)", nocomment):
        fails.append('no @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) ... }')
    if ':root[data-theme="dark"]' not in nocomment:
        fails.append('no :root[data-theme="dark"] block')
    if not re.search(r"(?:^|[},])\s*body\s*\{[^}]*background", nocomment):
        fails.append("body has no background")

    for src in SCRIPT_SRC.findall(html):
        if src.startswith(("http:", "https:", "//")) and not src.startswith(SCRIPT_HOSTS):
            fails.append(f"script from a host that is not allowed: {src}")
    for href in LINK_CSS.findall(html):
        if href.startswith(("http:", "https:", "//")) and not href.startswith(STYLE_HOSTS):
            fails.append(f"stylesheet from a host that is not allowed: {href}")
    for src in MEDIA_SRC.findall(html) + CSS_URL.findall(nocomment):
        fails.append(f"loads from the web (inline it or use data:): {src}")

    for n, line in enumerate((html + "\n" + css).splitlines(), 1):
        if LOCAL_PATH.search(line):
            fails.append(f"local absolute path: {line.strip()[:100]}")
        if EMOJI.search(line):
            fails.append(f"emoji: {line.strip()[:100]}")

    if 'name="claude:viewport-fit-sides"' in html:
        for side in ("left", "right"):
            if not re.search(rf"padding-{side}:\s*max\(\s*16px,\s*env\(safe-area-inset-{side}", nocomment):
                fails.append(f"viewport-fit-sides is set but body has no padding-{side}: max(16px, env(...))")

    mine = links(html)
    print(f"{len(mine)} links:")
    for href, n in sorted(Counter(mine).items()):
        print(f"  {n} x {href}")
    if "--links-like" in argv:
        other = Path(argv[argv.index("--links-like") + 1])
        theirs = links(other.read_text(encoding="utf-8"))
        added, removed = Counter(mine) - Counter(theirs), Counter(theirs) - Counter(mine)
        for href, n in sorted(added.items()):
            fails.append(f"link added vs {other.name}: {n} x {href}")
        for href, n in sorted(removed.items()):
            fails.append(f"link removed vs {other.name}: {n} x {href}")
        if not added and not removed:
            print(f"links match {other.name} ({len(theirs)} links)")

    for f in fails:
        print("FAIL:", f)
    print(f"{len(fails)} failed")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
