# UX workspace — Advisor Platform

*Draft v0.1 · 26 September 2026 · Owner: Leila Mitchell (@LLMBos) · Not yet reviewed with Luke*

This folder is where the platform's experience is designed before it is built: how it behaves,
how it is organised, and how it looks. Everything else in this repository is Luke's.

Think of it as the **drawing set** for a building that is already going up. The code is the
building. This folder is the drawings. `UX_REQUESTS.md` is the log of questions and requests
that pass between the architect and the builder, so nothing gets decided in a hallway and lost.

---

## 1. Who does what

| Who | Role | Owns |
| --- | --- | --- |
| **Leila** | Product owner **and** UX designer, two hats (see §2) | Everything in `ux/`. What the product does, how it behaves, how it looks |
| **Luke** | Developer, open lane | Everything outside `ux/`: the dashboard, the mock, the contract, the backend, the tests, and his own docs |
| **Claude** | Works for either of them | Follows the rules in §4 and §5, whoever is asking |

## 2. Two hats, tagged

Leila wears both the product-owner hat and the designer hat. To keep them from blurring, every
decision recorded in this folder carries a tag:

- **[PO]** — scope and priority. What is in, what is out, what comes first.
- **[UX]** — behaviour and form. How something works, where it lives, how it looks.

The tag matters most when a design idea quietly adds a feature. That is a [PO] decision
wearing a [UX] coat, and it should be named as one before anything is built.

## 3. How work moves

1. **Design.** Leila works out a behaviour, a structure or a screen in `ux/`.
2. **Request.** When something is ready to build, it gets an entry in `UX_REQUESTS.md`,
   marked *Ready*, saying which view it touches and what "done" looks like.
3. **Build.** Luke builds what he can and logs it in `docs/design.md` the way his
   designer handoff already describes. He updates the request's status and links the entry.
4. **Return path.** Whatever the build teaches — a constraint, a missing field, a better
   idea — comes back into the spec in `ux/`. The drawings change to match what the ground
   told us. This step is not optional.

## 4. Rules for everyone working in this repository

1. **Write only inside `ux/`.** Never edit, rename, move, reformat or delete anything outside
   it. That includes `HANDOFF.md`, `DESIGNER-HANDOFF.md`, everything under `docs/`,
   `styles.css`, the contract, the mock, the backend and the tests.
2. **Feature branches only.** UX work goes on a `feature/ux-…` branch. Nothing is committed to
   `main`. Luke merges.
3. **No backend or contract changes from design work.** If a design needs a new field, an
   operation or a role change, it is written as a request, not made in `openapi.yaml`.
4. **Every file here starts with `UX_`.** Two documents in this project share names with
   Leila's own working files, and the prefix makes the owner obvious from the name alone.
5. **Open-lane hygiene.** Synthetic data only. Use the build's own names — Advisor Platform,
   Dana, Marcus, Grace, Green Meadows. No internal product names or codenames, no real client
   or account data, no research participants' identities. Research arrives here only as
   anonymised findings.
6. **The five product rules are a floor, not a taste.** `DESIGNER-HANDOFF.md` §4 (drafts never
   look sent · AI output shows its sources · uncertain data is marked as an estimate · the
   client sees only what an advisor approved · a rise knows whether it is good). UX rules may
   extend them. Nothing here loosens them.
7. **Three views, always.** Firm, Advisor and Client. Every rule, flow and wireframe says which
   views it applies to, and how a change in one appears (or deliberately does not appear) in
   the others.
8. **The current look is a placeholder, by agreement.** The tokens and type in `styles.css`
   stand until `UX_DESIGN_SYSTEM.md` replaces them. Until then Luke keeps building on them,
   and nobody polishes them.

## 5. For Claude, specifically

- Read this file first, then `UX_REQUESTS.md`, then `DESIGNER-HANDOFF.md` for the product rules.
- Tag every decision you record [PO] or [UX]. When a [UX] idea would add a feature, say so
  plainly and ask for the [PO] call before designing further.
- Push back. If a request conflicts with the research, the product rules, or an earlier
  decision, say which and why, and offer a version that gets the same effect within the rules.
- Leila is the author. Claude drafts, fills gaps and suggests; she decides and edits. Anything
  Claude wrote that she has not reviewed carries *Draft — not yet reviewed by Leila* at the top.
- Wireframes stay in wireframe mode — greyscale, no brand colour, real content from the mock —
  until the structure in `UX_IA.md` is settled.
- If you are working for Luke and a change would land inside `ux/`, don't make it: add a note
  to the relevant request in `UX_REQUESTS.md` instead.

## 6. What is in this folder

| File | What it is | Status |
| --- | --- | --- |
| `UX_README.md` | This file: the working agreement | Draft |
| `UX_REQUESTS.md` | The request log between design and build | Live, empty |

**Planned, roughly in this order:**

| File | What it will hold |
| --- | --- |
| `UX_RESEARCH.md` | The anonymised advisor findings the design is built on |
| `UX_RULES.md` | Behaviours and rules: how things rank, when the platform speaks and when it stays quiet, how the interface behaves as it fills up |
| `UX_IA.md` | How everything is organised and reached across the three views |
| `UX_WIREFRAMES/` | Greyscale screens, built against the rules and the IA |
| `UX_DESIGN_SYSTEM.md` | The visual system that replaces the placeholder tokens |

## 7. What does not live here

Leila's working material — research notes, drafts, decks, planning — lives outside this
repository. Only specs that are ready to build from are brought in.
