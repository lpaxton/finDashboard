# From Leila, 14 October 2026 — drop the `ux/` folder over the repo's `ux/`

Four files replace the ones you have; one is new; one folder is a patch.

| File | What changed |
| --- | --- |
| `ux/UX_RESEARCH.md` | v0.2 — the second user study (S17, prospecting) as its own section §2b, F10–F14. The first study is untouched |
| `ux/UX_RULES.md` | v0.4 — evidence column updated from S17; one rule **proposed** (CS-10, evidence not a score), not decided |
| `ux/UX_REQUESTS.md` | Batch 4 (UX-022 to 024, from the research) and Batch 5 (UX-025 to 032, from the demo-path walk). The Touches words are renamed: Copy & style · Front-end · Screen redesign · API & data |
| `ux/UX_DEMO_PATH.md` | **new** — the demo path as a story map: three beats, 24 stories, which already play and which need a story. Decisions taken 14 Oct: the build's cast; the rebalance beat ends on compare-and-assign; path confirmed |
| `ux/patches/UX-016/` | a patch against `archi` @ 4ef91c1: `git am 0001-*.patch`. README inside says what it does and what it fudges. 177 tests pass |

Two asks: merge `archi` to `main` before the dev lead reads the repo, and have a look at the
`lead`-on-NextAction note in the UX-016 README before deciding whether it's a contract change
now or later.
