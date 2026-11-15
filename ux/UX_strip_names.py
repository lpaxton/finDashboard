#!/usr/bin/env python3
"""Replace personal names in the ux/ documents with role names.

Dry run by default: prints every line that would change. Add --apply to write.
Names are passed on the command line so none are stored in this file.

  python3 ux/UX_strip_names.py --owner "First Last" --dev "First" [--handle NAME ...] [--apply]

Only files in this folder that start with UX_ and end in .md, .html or .css are touched.
Patch files and anything outside ux/ are left alone. Git history is not changed.
"""
import argparse, pathlib, re, sys

ROLES = r"(product owner|developer)"

def rules(owner, dev, handles):
    first = owner.split()[0]
    out = [
        (re.compile(r"Owner:\s*" + re.escape(owner) + r"(\s*\(@?[\w-]+\))?"), "Owner: product owner / UX"),
        (re.compile(re.escape(owner) + r"'s"), "the product owner's"),
        (re.compile(re.escape(owner)), "the product owner"),
        (re.compile(r"\b" + re.escape(first) + r"'s"), "the product owner's"),
        (re.compile(r"\b" + re.escape(first) + r"\b"), "the product owner"),
        (re.compile(r"\(" + re.escape(dev) + r"\)"), "(developer)"),
        (re.compile(r"\b" + re.escape(dev) + r"'s"), "the developer's"),
        (re.compile(r"\b" + re.escape(dev) + r"\b"), "the developer"),
    ]
    for h in handles:
        out.append((re.compile(r"@?" + re.escape(h)), "[handle removed]"))
    return out

def fix_caps(s):
    s = s.replace("the the ", "the ").replace("The the ", "The ")
    s = re.sub(r"^(\s*(?:[-*>]\s+|\d+\.\s+)?(?:\*\*|~~)?)the " + ROLES, lambda m: m.group(1) + "The " + m.group(2), s)
    s = re.sub(r"([.!?]\s+|\|\s+\**|:\*\*\s+)the " + ROLES, lambda m: m.group(1) + "The " + m.group(2), s)
    s = re.sub(r"(\.\*\*\s+|\*\(|^\s*\*)the " + ROLES, lambda m: m.group(1) + "The " + m.group(2), s)
    return s

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--owner", required=True, help="product owner's full name")
    ap.add_argument("--dev", required=True, help="developer's first name")
    ap.add_argument("--handle", action="append", default=[], help="a username to remove; repeatable")
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    rs = rules(a.owner, a.dev, a.handle)
    here = pathlib.Path(__file__).resolve().parent
    total = 0
    for p in sorted(here.glob("UX_*")):
        if p.suffix not in (".md", ".html", ".css"):
            continue
        lines = p.read_text(encoding="utf-8").split("\n")
        changed = 0
        for i, line in enumerate(lines):
            new = line
            for rx, rep in rs:
                new = rx.sub(rep, new)
            if new != line:
                new = fix_caps(new)
                changed += 1
                if not a.apply:
                    print(f"{p.name}:{i+1}\n  - {line.strip()[:150]}\n  + {new.strip()[:150]}")
                lines[i] = new
        total += changed
        if changed and a.apply:
            p.write_text("\n".join(lines), encoding="utf-8")
        print(f"{p.name}: {changed} line(s) {'changed' if a.apply else 'would change'}")
    print(f"Total: {total}. " + ("Written." if a.apply else "Dry run only; add --apply to write."))

if __name__ == "__main__":
    sys.exit(main())
