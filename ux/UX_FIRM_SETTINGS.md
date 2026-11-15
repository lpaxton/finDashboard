# Firm settings — brand and templates

*Repo copy · 16 November 2026 · Owner: product owner / UX · Expands stage 0 of
`UX_PROSPECT_FLOW.md`.*

**What this is.** How a firm sets up the look, the sound and the fixed content of everything
the platform sends on its behalf, so a proposal, an email or the personal page reads as the
firm's own. It is its own function area. It feeds the prospect flow first, and newsletters,
review packs and presentations later.

**What it is not.** A design tool. The firm makes a small number of choices once; it does not
lay out pages.

**Where it sits.** System settings, in support of Pillar 1, *Grow the practice*. It is not the
business operations area, which the POC build does not include. On the
capability map it is the setup half of *Assemble from a template* and expands the *Firm
settings* row.

**The model.** A design system applied to a firm: tokens (brand kit), components (library
blocks), page layouts (templates), finished documents.

---

## Decided on 15 November [PO]

| Decision | What it means |
| --- | --- |
| **Four drawers** in settings: brand kit, voice, library, templates | Each has its own owner and its own risk |
| **Look and legal stay separate** | The platform may propose a look. It never writes approved content |
| **Compliance-approved content enters as a locked section** | It comes from the library, already approved, and cannot be edited inside a document |
| **Five options in the first step:** four starter themes, and a fifth, the brand studio, where the firm adds its logo and its own brand colours | All five are in the baseline. A theme is a colour system and a font pairing. The platform proposing colours from a logo or website comes next |
| **A small studio, not a full one** | The next build layer is one demonstration; see "Baseline and next, in one line each" |
| **One layout, different skins** | The four themes and the brand studio change colour and fonts only. Every document type keeps a single layout |
| **The firm owns the look, not the advisor** | The look is changed only in system settings, and only by approved firm users. An advisor uses it and cannot change it. The advisor still owns their own bio and signature |

---

## The four drawers

| Drawer | Holds | How it is filled | Owner |
| --- | --- | --- | --- |
| **Brand kit** — the look | Logo, colours, type, image style | A starter theme, or the platform proposes a kit from a logo and a website and the firm confirms | Firm admin |
| **Voice** — the sound | How the firm writes: plain or formal, warm or brisk | From samples the firm supplies; the platform describes the voice back and the firm confirms | Firm, with a variation per advisor |
| **Library** — fixed content | About the firm, advisor bios, fee schedule, disclosures, agreement clauses | Entered by a person and approved | Firm admin and compliance |
| **Templates** — the order | Which sections appear, in what order, locked or open, for each document type | Starter templates the firm adjusts | Firm admin |

---

## How a section gets made

Three kinds of section, matching the tags in `UX_SEED_PROPOSAL_AGREEMENT.md`. The look
applies to all three. It changes how a section appears, never what it says.

| Section kind | Words come from | Look comes from | Can be changed in a document? |
| --- | --- | --- | --- |
| **Locked** | The library, approved | Brand kit | No. Only in settings, with re-approval |
| **Filled** | The prospect's record | Brand kit | Yes, by the advisor before sending |
| **Advisor** | The advisor, from a draft in the firm's voice | Brand kit | Yes. It is theirs |

---

## Steps

Same columns as the flow document. **Cut:** **B** baseline, build first · **N** next, build
second · **L** later, not yet scheduled. **AI** marks where a model is used; everything else is
built without one. **Flow** is the stage 0 step it expands. **In build** is blank for the developer.

### Brand kit

| Step | What happens | Cut | AI | Flow | In build |
| --- | --- | --- | --- | --- | --- |
| BK-1 | One brand kit is seeded for the demo firm | B | No | 0.1 | |
| BK-2 | The firm picks one of four starter themes. Each is a colour system and a font pairing | B | No | 0.1 | |
| BK-3 | The fifth option, the brand studio: the firm uploads its logo and sets its own brand colours on top of a theme | B | No | 0.1 | |
| BK-4 | The platform proposes the colours from the logo, a website link or a screenshot. The firm confirms or adjusts | N | Yes | 0.1 | |
| BK-5 | A preview shows the kit on an email, the personal page and a proposal together | N | No | 0.1 | |
| BK-6 | The kit is checked for legibility: text contrast on every colour pairing it will use | B | No | 0.1 | |
| BK-7 | Custom: the firm edits individual values and supplies its own fonts | L | No | 0.1 | |
| BK-8 | Outgoing documents are checked against the kit before sending | L | Yes | 0.1 | |

### Voice

| Step | What happens | Cut | AI | Flow | In build |
| --- | --- | --- | --- | --- | --- |
| VO-1 | One voice is seeded for the demo firm | B | No | 0.1 | |
| VO-2 | The firm pastes samples; the platform describes the voice in plain words; the firm confirms | L | Yes | 0.1 | |
| VO-3 | Each advisor can vary the firm voice for their own drafts | L | Yes | 0.1 | |

### Library

| Step | What happens | Cut | AI | Flow | In build |
| --- | --- | --- | --- | --- | --- |
| LB-1 | Blocks are seeded: about the firm, one bio, fee schedule, disclosures, agreement clauses | B | No | 0.2, 0.3 | |
| LB-2 | The firm enters and edits its fee schedule | N | No | 0.2 | |
| LB-3 | The firm enters and edits the other blocks | L | No | 0.3 | |
| LB-4 | Each block carries an approval status: draft or approved, by whom, when. Only approved blocks appear in anything sent | L | No | 0.3 | |
| LB-5 | Every change to a block makes a new version | L | No | 0.3 | |

### Templates

| Step | What happens | Cut | AI | Flow | In build |
| --- | --- | --- | --- | --- | --- |
| TP-1 | A proposal template and an agreement template are seeded | B | No | 0.3 | |
| TP-2 | Starter templates for each document type in the prospect flow: introduction email, personal page, proposal, agreement | N | No | 0.3 | |
| TP-3 | The firm reorders sections and sets each one locked or open | L | No | 0.3 | |
| TP-4 | Every sent document records the template and block versions it used, so it reopens as sent | L | No | 0.3 | |
| TP-5 | More document types: newsletter, review pack, presentation | L | No | 0.3 | |

**Size:** 21 steps. **7 baseline · 4 next · 10 later.**

**Note on BK-6.** It moved to the baseline with the brand studio: once a firm can set its own
colours, unreadable pairings are the first thing that goes wrong. [UX] proposal, for the
product owner to confirm.

---

## Baseline and next, in one line each

**Baseline:** an approved firm user picks one of four starter themes, or takes the fifth
option and adds the firm's logo and brand colours → the proposal takes on that look.

**Next:** The platform proposes the colours from the logo or website, and a preview shows the
introduction email, the personal page and the proposal restyling together.

That is the whole of the next layer for this area, plus an editable fee schedule (LB-2).
Everything else waits.

---

## Rules for this area

1. **The platform proposes; the firm confirms.** No kit or voice is applied without a yes.
2. **The platform never writes locked content.** Approved text is entered by a person.
3. **Locked content cannot be edited inside a document.** Only in settings, with re-approval.
4. **The look never changes the words.** Restyling a document leaves its content untouched.
5. **A sent document stays as it was sent.** Later changes to settings do not reach back.
6. **Only approved firm users change settings.** Every change is logged with who made it and when.

LB-4 and TP-4 are marked later for the build, but rules 3 and 5 depend on them. They must
exist before any real firm uses this.

---

## Who does what

| Role | Brand kit | Voice | Library | Templates |
| --- | --- | --- | --- | --- |
| Approved firm user (the owner, or the advisor in a firm of one) | Sets | Sets | Enters | Sets |
| Compliance (often the same person in a small firm) | — | — | Approves | Approves locked sections |
| Advisor | Uses, cannot change | Varies their own | Edits their bio and signature | Uses |

---

## Open questions

- Does the firm's accent colour restyle the platform's own interface, or only what clients and
  prospects see? (Already open in the project log.)
- Can the platform read a firm's website from a link in the protected environment, or must it
  be a screenshot?
- Font licensing: which fonts may a firm use in sent documents?
- In a firm of one, the same person enters and approves a block. Is that acceptable, and how is
  it recorded?
- Should BK-8 reuse an existing brand-checking tool, by the grafting test?
- Does voice setup (VO-2) belong in the next layer? Drafted emails are in the baseline and lean
  on the voice.

## What this changes elsewhere

- **Flow document:** stage 0 steps 0.1 to 0.3 now point here for their detail. No step numbers
  change.
- **Capability map:** the *Firm settings* row can show the four drawers in a later version.
- **Requirements:** adds to item 1 of the flow document's list of new requirements.
