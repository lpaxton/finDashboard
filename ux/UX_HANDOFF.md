# UX handoff — prospect to signed

*16 November 2026 · From the product owner / UX to the developer · Read this first.*

## What this drop is

Four documents that describe one journey, from a lead arriving to a signed client, and the firm
settings that journey depends on. They were written away from the build, from the team's
offsite, the prospecting research and the product owner's review.

**The build stands.** Nothing here replaces what is built. These documents add to it. Where a
document and the build differ, mark the difference; the product owner and the developer decide
together which way it goes.

| File | What it is | Use it for |
| --- | --- | --- |
| `UX_PROSPECT_FLOW.md` | The journey in ten stages and 44 steps. Each step has a build order, the capability that does the work, the data it touches and a requirement ID | The reference. Everything else is drawn from it |
| `UX_CAPABILITY_MAP.html` | The same steps on one page: seven AI capabilities and four foundations across the stages. Open in a browser | Seeing the whole at once; explaining it to the team |
| `UX_FIRM_SETTINGS.md` | The detail behind stage 0: brand kit, voice, library, templates | Building themes, the brand studio and locked sections |
| `UX_SEED_PROPOSAL_AGREEMENT.md` | A synthetic prospect record, a proposal and an advisory agreement, with every section tagged locked, filled or advisor | Seed data and a worked example for stages 8 and 9 |

## How to use it with the build

1. **Fill the "In build" column** in `UX_PROSPECT_FLOW.md` and `UX_FIRM_SETTINGS.md`: yes,
   partly or no. This is the main ask. It turns two separate pictures into one.
2. **Where the build already does something differently**, leave the build as it is and add a
   note beside the step. Do not rework anything to match a document.
3. **For each baseline step that is not built**, say how large it is, using the existing
   words: Copy & style · Front-end · Screen redesign · API & data.
4. **Summarise the enrichment ranking** in plain language: what the ranking code in the build
   ranks on. The lead card needs to show that beside the rank.
5. **Flag anything missing**: steps the build has that the flow does not.

## Staying in sync

These documents and the build were made apart. This drop is the last time that should happen.

1. The developer fills the "In build" columns and notes where the build differs.
2. The product owner and the developer settle each difference.
3. **One updated set of documents is then issued** in `ux/`, replacing this drop. It describes
   the build as it actually is, plus what is agreed to come next.
4. From that point the set is kept current: when the build changes something a document
   describes, the document changes in the same branch. When a document changes what should be
   built, it goes through `UX_REQUESTS.md` first.

The updated set is the shared reference for the whole team. Until it exists, treat this drop as
a proposal.

## What the build covers

The proof-of-concept build covers this journey. It does **not** include the professional
development or business operations parts of the product. SIMGPT still comes in at step 5.2, as
an option inside prospect meeting prep, connected through its API. That is part of this journey
and is in the baseline. Firm settings are system settings that
support the journey, not the business operations area.

## Build order

**B** baseline is the proof of concept: build first. **N** next is built second, once the
baseline works end to end. **L** later is not yet scheduled. The cut is a proposal and is not
final until the product owner confirms it against the "In build" column.

Steps believed to be in the build already: the three intake forms (1.1, 1.2, 1.4), the
enrichment rank on the lead card (2.4), the prospect's personal page (4.3) and the rehearsal
option in meeting prep (5.2).

## Decided [PO]

- Leads land in the platform, not in an outside CRM.
- Ranking is allowed. The enrichment service ranks leads; the evidence stays beside the rank; a
  low rank parks a lead and never hides it. This replaces the earlier "never a score" position.
  `UX_RULES.md` in the repo still carries the earlier proposed wording of rule CS-10. The approved
  wording is: *a rank always comes with its evidence*. The updated rules file comes with the
  synced set.
- The personal page and the newsletter are the same thing. Email is always the reach-out and
  may carry the page's link. The page also collects information conversationally.
- The platform does not record meetings itself. It receives a transcript or notes from a
  connected meeting tool.
- At conversion a second folder is attached for money management, tax, estate and model
  information. Two stores, joined only when a question needs both.
- The platform does not end where the portfolio platform begins. The portfolio platform does
  the money work whenever it is needed. A layer of the platform stays over the whole
  relationship and keeps watch: a client not contacted in a while, a household that looks short
  on cash. It notices and prepares; the advisor decides.
- Fees and templates are set in firm settings.
- The firm owns the look, not the advisor. It is changed only in system settings by approved
  firm users.
- The first step offers five look options: four starter themes and a brand studio, where the
  firm adds its logo and brand colours. One layout, different skins.
- Look and legal stay separate. Approved content enters as a locked section from the library.
  The platform never writes it.

## Still open [PO]

- What gets signed. Recommended: the proposal is not signed; accepting it means signing the
  advisory agreement, sent as a packet with the disclosure documents.
- The baseline cut, once the "In build" column is filled.
- What makes a lead a prospect: the advisor's judgement alone, or a named event.
- Recording or notes only; which capture tool.

## Waiting on others

- **Domain lead:** a real proposal and agreement example; the minimum-information list.
- **Compliance:** consent to record or to AI note-taking; tracking what a prospect opens on the
  personal page.
- **Technology:** where the second folder lives; the shared household ID; what data goes to the
  model and where the model runs.

## Words used

The documents use plain names for some services. *The platform* is this product. *The
enrichment service* is the lead-enrichment and ranking code already in the build. *The
portfolio platform* is the existing portfolio and custody system the second folder connects to.
The cast is the build's: Dana, Marcus, Grace Okafor, Whitfield Wealth Partners, Green Meadows.
One prospect is new: Renata Alvarez, in the seed file.
