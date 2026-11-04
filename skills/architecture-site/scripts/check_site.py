#!/usr/bin/env python3
"""Check an architecture site built from the skeleton.

usage: python3 check_site.py <site dir> [--repo <repo dir>]

Checks every *.html in <site dir>:
  - each diagram node and edge (data-key) has panel data, and each panel entry is used
  - each lede: at most 3 sentences, 120 characters, 3 numbers; each panel: at most 3 kv items
  - every SVG has <title> and <desc>
  - nav: every page is in PAGES (shared.js) and data-current matches its own entry
  - footer names one 7-char commit, the same on every page
With --repo, also:
  - each "path:line" in src exists and the line is within the file
  - each kv "code": "path:NAME" matches NAME = <value> in the code
  - the footer commit exists in the repo
Warns (does not fail) when the same kv value appears on more than one page.
Exits 1 when a check fails.
"""
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

MAX_CHARS, MAX_SENTENCES, MAX_NUMS, MAX_KV = 120, 3, 3, 3
NUM = re.compile(r"\d[\d,.]*")
SENT = re.compile(r"[。！？!?]|\.(?:\s|$)")
PANEL = re.compile(r'<script type="application/json" id="panel-data">(.*?)</script>', re.S)
SVG = re.compile(r"<svg\b.*?</svg>", re.S)
KEY = re.compile(r'data-key="([^"]+)"')
CURRENT = re.compile(r'id="site-nav"[^>]*data-current="([^"]+)"')
COMMIT = re.compile(r"commit <code>([0-9a-f]{7})</code>")
PAGE = re.compile(r"\{\s*id:\s*'([^']+)',\s*href:\s*'([^']+)'")

errors, warnings = [], []


def err(where, msg):
    errors.append(f"{where}: {msg}")


def check_text(where, text):
    if len(text) > MAX_CHARS:
        err(where, f"{len(text)} chars > {MAX_CHARS}")
    if len(SENT.findall(text)) > MAX_SENTENCES:
        err(where, f"more than {MAX_SENTENCES} sentences")
    if len(NUM.findall(text)) > MAX_NUMS:
        err(where, f"more than {MAX_NUMS} numbers")


def check_src(where, spec, repo):
    path, _, line = spec.rpartition(":")
    f = repo / path
    if not f.is_file():
        err(where, f"{spec}: file not found")
    elif len(f.read_text(encoding="utf-8", errors="replace").splitlines()) < int(line):
        err(where, f"{spec}: line beyond end of file")


def check_const(where, spec, value, repo):
    path, _, name = spec.rpartition(":")
    f = repo / path
    if not f.is_file():
        err(where, f"{spec}: file not found")
        return
    num = NUM.search(value)
    if not num:
        return
    want = num.group(0).replace(",", "")
    m = re.search(rf"\b{re.escape(name)}\b[^=\n]*[=:]\s*[\"']?([\d_.]+)", f.read_text(encoding="utf-8"))
    if not m:
        err(where, f"{spec}: constant not found")
    elif m.group(1).replace("_", "") != want:
        err(where, f"{spec}: code has {m.group(1)}, page has {want}")


def main(argv):
    if not argv or argv[0].startswith("-"):
        sys.exit(__doc__)
    site = Path(argv[0])
    repo = Path(argv[argv.index("--repo") + 1]) if "--repo" in argv else None
    js = (site / "shared.js").read_text(encoding="utf-8")
    pages = dict(PAGE.findall(js))  # id -> href
    hrefs = {v: k for k, v in pages.items()}
    commits, values = set(), defaultdict(set)

    for html in sorted(site.glob("*.html")):
        name, src = html.name, html.read_text(encoding="utf-8")
        if name not in hrefs:
            err(name, "not listed in PAGES (shared.js)")
        cur = CURRENT.search(src)
        if not cur or pages.get(cur.group(1)) != name:
            err(name, "nav data-current does not match PAGES")
        commits.update(COMMIT.findall(src) or ["<none>"])

        svgs = SVG.findall(src)
        keys = set()
        for svg in svgs:
            if "<title" not in svg or "<desc" not in svg:
                err(name, "svg without <title> or <desc>")
            keys.update(KEY.findall(svg))
        block = PANEL.search(src)
        data = json.loads(block.group(1)) if block else {}
        for k in sorted(keys - data.keys()):
            err(name, f"node {k} has no panel data")
        for k in sorted(data.keys() - keys):
            err(name, f"panel data {k} is not on any diagram")
        for k, d in data.items():
            where = f"{name} {k}"
            check_text(where, d.get("lede", ""))
            if len(d.get("kv", [])) > MAX_KV:
                err(where, f"more than {MAX_KV} kv items")
            for kv in d.get("kv", []):
                if NUM.search(kv["v"]):
                    values[kv["v"]].add(name)
                if repo and kv.get("code"):
                    check_const(where, kv["code"], kv["v"], repo)
            if repo:
                for s in d.get("src", []):
                    check_src(where, s, repo)

    for href in sorted(set(hrefs) - {p.name for p in site.glob("*.html")}):
        err("shared.js", f"PAGES lists {href}, file not found")
    if len(commits) != 1 or "<none>" in commits:
        err("footer", f"expected one commit on every page, found {sorted(commits)}")
    elif repo:
        c = commits.pop()
        if subprocess.run(["git", "-C", str(repo), "cat-file", "-e", c + "^{commit}"], capture_output=True).returncode:
            err("footer", f"commit {c} not in repo")
    for v, where in sorted(values.items()):
        if len(where) > 1:
            warnings.append(f"same number on {len(where)} pages: {v} ({', '.join(sorted(where))})")

    for w in warnings:
        print("warn:", w)
    for e in errors:
        print("FAIL:", e)
    print(f"{len(errors)} failed, {len(warnings)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
