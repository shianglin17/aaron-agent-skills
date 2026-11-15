#!/usr/bin/env python3
"""Check that the shared CSS block is the same in both page skeletons.

usage: python3 scripts/check_shared_tokens.py

Compares the text between "/* shared:start" and "/* shared:end */" in:
  - skills/doc-types/assets/skeleton/page.css
  - skills/architecture-site/assets/skeleton/shared.css
Each skill is installed on its own, so each keeps its own copy of the block.
Exits 1 when a marker is missing or the two blocks differ, and prints a diff.
"""
import difflib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = [
    ROOT / "skills/doc-types/assets/skeleton/page.css",
    ROOT / "skills/architecture-site/assets/skeleton/shared.css",
]
START, END = "/* shared:start", "/* shared:end */"


def block(path):
    text = path.read_text(encoding="utf-8")
    if text.count(START) != 1 or text.count(END) != 1:
        sys.exit(f"FAIL: {path.relative_to(ROOT)}: needs exactly one {START} and one {END}")
    body = text[text.index(START):text.index(END) + len(END)]
    return [line.rstrip() for line in body.splitlines()]


def main():
    a, b = (block(f) for f in FILES)
    names = [str(f.relative_to(ROOT)) for f in FILES]
    if a != b:
        sys.stdout.writelines(line + "\n" for line in difflib.unified_diff(a, b, *names, lineterm=""))
        print(f"FAIL: shared block differs between {names[0]} and {names[1]}")
        return 1
    print(f"ok: shared block is the same in both files ({len(a)} lines)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
