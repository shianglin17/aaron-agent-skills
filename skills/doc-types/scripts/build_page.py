#!/usr/bin/env python3
"""Build one self-contained HTML file from a page made with the skeleton.

usage: python3 build_page.py <page.html> [-o <out.html>] [--css <page.css>]

<page.html> is a full document that links page.css with
<link rel="stylesheet" href="...css">, like assets/skeleton/page.html.
The output:
  - inlines every local stylesheet into one <style> block, in the same place
  - keeps <title>, meta tags other than charset and viewport, and font <link>s
  - drops <!doctype>, <html>, <head>, <body> and the charset and viewport metas,
    because the claude.ai artifact skeleton adds them when the page is published
--css replaces the linked local stylesheet with this file.
Without -o, writes <name>.artifact.html next to the input.
"""
import re
import sys
from pathlib import Path

LINK = re.compile(r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>\s*\n?', re.I)
DROP = [
    re.compile(r"<!doctype[^>]*>\s*", re.I),
    re.compile(r"</?html\b[^>]*>\s*", re.I),
    re.compile(r"</?head\b[^>]*>\s*", re.I),
    re.compile(r"</?body\b[^>]*>\s*", re.I),
    re.compile(r'<meta\s+charset=[^>]*>\s*', re.I),
    re.compile(r'<meta\s+name="viewport"[^>]*>\s*', re.I),
]


def build(src_path, css_override=None):
    src = src_path.read_text(encoding="utf-8")
    missing = []

    def inline(m):
        href = m.group(1)
        if re.match(r"^(https?:)?//", href):
            return m.group(0)
        css_file = css_override or (src_path.parent / href)
        if not css_file.is_file():
            missing.append(str(css_file))
            return m.group(0)
        css = css_file.read_text(encoding="utf-8").rstrip()
        return f"<style>\n/* inlined from {Path(href).name} */\n{css}\n</style>\n"

    out = LINK.sub(inline, src)
    for pat in DROP:
        out = pat.sub("", out)
    if missing:
        sys.exit("FAIL: stylesheet not found: " + ", ".join(missing))
    if "<title" not in out[:8192]:
        sys.exit("FAIL: no <title> in the first 8 KB")
    return out.strip() + "\n"


def main(argv):
    if not argv or argv[0].startswith("-"):
        sys.exit(__doc__)
    src = Path(argv[0])
    out = Path(argv[argv.index("-o") + 1]) if "-o" in argv else src.with_suffix(".artifact.html")
    css = Path(argv[argv.index("--css") + 1]) if "--css" in argv else None
    out.write_text(build(src, css), encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
