# UX build plan

**For Luke.** How the eleven requests in `ux/UX_REQUESTS.md`, the design system in
`ux/UX_DESIGN_SYSTEM.md` and the information architecture in `ux/UX_IA.md` get built, in what
order, and what each one costs.

The three logs do different jobs and none of them replaces another:

| File | Holds |
| --- | --- |
| `ux/UX_REQUESTS.md` | What design asked for, and why. Leila's |
| `docs/design.md` | What was actually built, what wasn't, and what it implied. Yours, written after |
| `docs/ux-build-plan.md` | This file: the order, the sizing, and what blocks what. Written before |

Working rules this plan sits inside: nothing here edits anything in `ux/` · UX work stays on a
`feature/ux-…` branch · no design request changes `openapi.yaml` directly — a needed field
becomes a proposal in section 8 below and goes back to Leila before it is cut in.

---

## 1. The shape of the work

Six phases. The first two are almost entirely invisible and make everything after them cheap.

| Phase | What | Requests | State |
| --- | --- | --- | --- |
| **0** | Tokens, type and the ground | — | **Done**, 28 Sept |
| **1** | Front-end scaffolding: view state, source lines, disclosure, motion | — | **Done**, 28 Sept |
| **2** | Batch 1 — the quick wins | UX-001 → UX-006 | **Done**, 28 Sept |
| **3** | One contract run: every field the design needs, added once | UX-007, UX-009, UX-001, UX-002 | **Done**, 28 Sept |
| **4** | Today by the four roles, and what feeds it | UX-008, UX-009, UX-011 | **Done**, 28 Sept — built without the wireframe; see `docs/design.md` |
| **5** | Activity log | UX-010 | **Done**, 28 Sept |
| **6** | The navigation spine, role homes and Systems | *Still has no request* — see §9 | **Done**, 28 Sept |

> **All eleven requests are built.** What each one cost, what could not be built and why, and
> the six calls made in the absence of the UX-008 wireframe are in `docs/design.md`. Three
> places named in `UX_IA.md` were not built because nothing exists behind them — they are
> listed at the bottom of `ux/UX_REQUESTS.md` and need a [PO] call.

**What was added to the contract** (phase 3, one run): `Meeting.preparedAt` ·
`ProspectSummary.stageChangedAt` and `lastContactAt` · `Signal.source` · `AlertStatus.snoozed`
with `Alert.snoozedUntil` · `GET /activity` · `GET /systems` and `PATCH /systems/{systemId}`.
The operation count moved from 72 to 75 and the tripwire in `test/server.test.js` moved with it.

Phases 0–2 can ship on their own and are worth shipping on their own: they are the whole of
Batch 1, they need no wireframe, and they leave the build looking like the design system.

---

## 2. Phase 0 — tokens, type and the ground

`UX_TOKENS.css` is a drop-in for the three `:root` blocks at the top of `dashboard/styles.css`
(lines 1–22). Every variable name you use today is kept, so the ground, type and status colours
change with no other edit. The new variables — roles, the platform's violet, gradients, glass,
radii, elevation, motion — arrive unused and wait for phase 2 and 4.

**Work**

1. Replace `:root`, the `prefers-color-scheme` block and the `[data-theme="dark"]` block in
   `dashboard/styles.css` with the three blocks from `ux/UX_TOKENS.css`. Keep the `box-sizing`
   and `env(safe-area-inset-*)` lines that live in your `:root` and are not in Leila's.
2. Swap the Google Fonts link in `dashboard/index.html` for the one in the tokens file header
   (Plus Jakarta Sans · Newsreader · JetBrains Mono).
3. Three rules move with the palette rather than with the tokens, because the design system
   changes what they *mean*, not just their colour:
   - primary buttons move from `--brand` to `--ink` fill (`.btn.primary`)
   - `:focus-visible` moves from `--brand` to `--accent`, the coral focus ring
   - `.spark` stroke stays `--brand`; charts are supposed to be neutrals (`--chart-1..4`), so
     note it and leave it — the chart palette is on Leila's "not yet designed" list.
4. Resolve the firm-accent collision — see §7.1. This is the only part of phase 0 that is not
   mechanical.

**Size:** S, half a day including the dark-mode pass.
**Verify:** both themes, light and dark, on Today · Clients · Communications · the household
dialog · Firm billing; `npm test`; contrast spot-check on `--muted` on `--surface`, status
words on their tints, and the dark-mode `--brand` on `--bg`.
**Watch:** Leila's own note — dark-mode gradients hold, but the role *bands* have not been
checked in dark. Nothing in phase 0 uses a band, so this can wait for phase 4; don't forget it.

---

## 3. Phase 1 — scaffolding

Four small shared pieces. Four of the seven Batch 1 requests are cheap only if these exist
first, and phase 4 needs all four.

### 1.1 A view-state store — `dashboard/js/viewstate.js` (new)

One module holding what the advisor set by hand: which briefs are open, which signal rows are
expanded, which alerts are snoozed and until when, the pinned role order later. Persisted to
`localStorage`, keyed by persona so the sign-in-as switcher doesn't leak state between Dana and
Marcus.

This is ST-07 ("what the advisor sets, stays") made into one place rather than seven. It serves
UX-005 directly, UX-001's *Not now*, and ST-09's pinned role order in phase 4.

**Size:** S. ~40 lines and a read/write pair.

### 1.2 A source line — `dashboard/js/format.js`

One function: `sourceLine(source, at)` → `"From custodian records · updated 2 hrs ago"`. It maps
the contract's `Source` enum to the advisor's words, and nothing else in the dashboard prints a
system name again.

| Contract | Shown |
| --- | --- |
| `greenmeadows` | custodian records |
| `crm` | your CRM |
| `calendar` | your calendar |
| `platform` | the platform |

`briefSources` on a meeting is a free array of strings, not the enum, so the mapper needs a
fallback: an unrecognised value renders as "another connected system" rather than leaking the
raw string. Flag any value that hits the fallback back to Leila — a source the advisor can't
name is a TR-10 problem, not a formatting one.

Recency comes from `createdAt` on alerts, `dataAsOf` on signals and `dataAsOf` on the household
page. There is no per-alert `dataAsOf`, so alert recency is the age of the alert, which is the
honest number and not quite the one TR-06 asks for. Note it in `design.md`.

**Size:** S.

### 1.3 A disclosure that can be animated — `dashboard/js/ui.js`

`<details>`/`<summary>` cannot be transitioned, and the prep brief and signal rows both use one.
Replace with a button + region pair (`aria-expanded`, `aria-controls`, height transition,
`prefers-reduced-motion` opt-out). One component, used by the prep brief, the signal rows, and
every card that opens to its top three in phase 4.

**Size:** S–M. Small, but it is a keyboard and screen-reader surface — test it as one.

### 1.4 Motion tokens into CSS — `dashboard/styles.css`

`--dur-fast` / `--dur-base` / `--dur-slow` and `--ease` wired to the transitions that exist, plus
one global `@media (prefers-reduced-motion: reduce)` block that sets every duration to `0ms`.
Doing it as a token override rather than per-rule means reduced motion can never be missed on a
later component.

**Size:** S.

---

## 4. Phase 2 — Batch 1, the seven quick wins

Build order below is dependency order, not Leila's numbering.

### UX-004 · Placeholder copy — Paint, **XS**
`advisor.js`, `format.js`. Remove "…is not built yet" toasts by hiding the action rather than
showing a dead one; "0 days ago" → "today" in `daysAgo()`; rewrite the drafts empty state in the
advisor's language. The `suggestedTask`/`/tasks` sentence is developer text on an advisor screen
and goes entirely.

Hiding unbuilt actions has a side effect worth naming: the alert `action.label` comes from the
contract, and today every one of them renders. Hiding the unbuilt ones means the front end needs
a list of the actions it can actually perform. Keep that list in one place next to the alert
list, not scattered.

### UX-003 · One word, one meaning — Paint, **S**
`advisor.js`, `ui.js`. "Review" currently means three things. Propose a table — every action
label, where it appears, what it does — put it in `design.md`, build to it, and let Leila confirm
or rename. Don't wait on the confirmation; renaming a label later is one edit.

The expand control ("Review" → "Hide") becomes the phase-1 disclosure, so 003 and 1.3 land
together.

### UX-002 · Sources in plain language — Paint, **S**
Consumes 1.2. Sweep: the alert list meta line, the prep brief's "Sources: …", the portfolio
signals, the household dialog, and the query/Ask answers. Grep for `a.source`, `briefSources`
and `dataAsOf` and leave none of them printing raw.

### UX-005 + UX-006 · What opens stays open, and moves when it does — Furniture + Paint, **S**
Consume 1.1, 1.3 and 1.4 together. Opened briefs and expanded signal rows are written to view
state on toggle and restored on render. Test the actual acceptance criterion: open a brief, go
to Clients, come back — still open.

### UX-001 · Undo on dismiss, and "Not now" — Furniture, **M**
*Undo* is honest work against the contract: dismiss is `PATCH /alerts/{id} {status:'dismissed'}`,
and undo is the same call back to `open`. Put *Undo* in the toast with a timeout longer than the
current 2.6s — the toast needs an action slot, which is a small change to `toast()`.

*Not now* is not in the contract. `AlertStatus` is `open | dismissed | resolved`, with no
snooze and nowhere to keep a time. Two routes:

- **Now, for the POC:** snooze lives in view state (1.1) and filters the list client-side. Honest
  on screen, and lost if the advisor changes browser.
- **Properly:** `snoozed` on `AlertStatus` and a `snoozedUntil` timestamp — §8, phase 3.

Build the first, log it in `design.md` as knowingly temporary, and raise the second. This is
exactly the *Returned* path Leila describes.

### UX-007 · A receipt on every prepared brief — Furniture **or** Plumbing, **S after phase 3**
Leila called this correctly: the receipt needs *when*, and a meeting carries `prepStatus` and
`briefSources` but no `preparedAt`. Don't fake it from `startsAt`. Hold UX-007 for phase 3, then
it is a one-line render: violet dot, mono line, what was done · from what · when.

**Phase 2 total:** roughly two to three days, UX-007 excepted.
**Verify:** `npm test` (it will still pass — nothing in Batch 1 touches the sub-nav keys or an
endpoint call) · the `?fail=alerts` error state still renders · keyboard path through every
disclosure · reduced-motion on.

---

## 5. Phase 3 — one contract run

Four separate requests each want one field. Adding them one at a time means running
`npm run types`, `npm run feature-map` and the full test suite four times, and asking Leila the
same kind of question four times. Do it once. The proposals are in §8; nothing below gets cut
into `openapi.yaml` before she has seen them.

**Work:** `openapi.yaml` → `src/mock-core.js` fixtures → `npm run types` → `npm run feature-map`
→ `npm test` → then the two held requests (UX-007's receipt, UX-001's real snooze) land as small
front-end edits.

**Size:** M. The contract edit is small; the mock fixtures and the feature-map regeneration are
where the time goes.

---

## 6. Phase 4 — Today by the four roles

**Blocked on the UX-008 wireframe.** Everything below is what the wireframe will need to land
against, and some of it can be built before it arrives.

### Can start now

**The role taxonomy.** Every source of work on Today maps to exactly one of BD · CA · OP · PD.
Write the map, because it is a product decision hiding in a layout change and it is cheaper to
argue about as a table than as a card that shows the wrong thing:

| Feeds | Role | From |
| --- | --- | --- |
| Prospects by stage, leads, referrals | BD | `GET /prospects` |
| Meetings, prep, households, contact gaps, onboarding | CA | `/meetings`, `/households`, `/onboarding` |
| Approvals, billing, compliance, reports | OP | `/communications`, `/billing/fees`, `/firm/compliance`, `/reports/practice` |
| Playbooks, scorecard, practice | PD | `/playbooks`, `/firm/advisors/{id}/scorecard` |

**Two endpoints must keep a home.** Leila flagged this and the test enforces it — see §10.
`GET /summary` becomes the "Book at a glance" link (`UX_IA.md` §4); `GET /next-actions` feeds the
cards themselves (FO-11), so the call moves rather than disappears.

**The card components** from `UX_DESIGN_SYSTEM.md` §5 — role mark, role card, lead card, status
badge, suggestion well, receipt line, source line, order pill. These are drawable from the spec
without the wireframe, and the gradient/glass/elevation rules are precise enough to build to.
This is also where the dark-mode band check from phase 0 gets done.

### Needs the wireframe

The layout, what leads, the daily reorder and its one-line reason (ST-03), the pin (ST-09), what
the top-three-on-demand looks like, and where the number strip goes.

### UX-009 · Surface what's slipping — Room, **M**

The ranking is client-side over data you already return, so it needs no new operation. The
*numbers* are the problem:

- **Guerrero, 30 days since contact** — works today. `HouseholdSummary.lastContactAt` is real.
- **Devon Pryce, lead 6 days** — the fixture's `createdAt` is 6 days old, so the number comes out
  right, but what it measures is the age of the lead, not the silence after a reply. There is no
  reply data in the contract at all.
- **Halloran Trust proposal, 26 days** — `createdAt` is 26 days ago and `updatedAt` is 8. Neither
  is "26 days in the proposal stage". Getting Leila's sentence right needs `stageChangedAt` (§8).

So: build the selector, get two of the three examples right, and be explicit in `design.md` that
proposal ageing is a proxy until phase 3 lands `stageChangedAt`. Don't quietly print 26 from
`createdAt` and call it stage age — CS-09 is a [PO] rule and its definitions have to be true.

### UX-011 · A suggested next step on every signal — Room, **S once the well exists**

`GET /portfolio-signals` already returns `label` + `detail`; the suggestion well and one action
per signal is the same component built for UX-008. FO-09 wants the meaning sentence to lead,
which is a copy change on top of the existing `label`.

**Phase 4 size:** L. The largest piece of work in the plan by some distance.

---

## 7. Decisions needed

### 7.1 Blocking phase 0 — the firm accent [PO]

`state.js` sets `--brand` from the firm's `accentColor` at runtime, so moss is only a default. A
red or orange firm accent collides with Prospecting's terracotta, with `--crit`, and with the
coral focus ring — which breaks ST-04 (a colour means one thing everywhere).

Leila's recorded leaning: the firm's colour belongs on what clients see; the interactive colour
stays fixed. **Recommend adopting it.** It is a three-line change in `applyBranding()` — stop
setting `--brand`, set a separate `--firm-mark` used by the avatar and client-facing materials —
and it retires the dark-mode accent-lifting problem in `forTheme()` along with the contract
change that was going to be needed for it.

If the answer goes the other way, phase 0 needs a constrained-accent rule (hue-bounded, or the
accent only on surfaces the roles never touch) designed before the tokens land.

### 7.2 Not blocking — decide as you go

| # | Question | Who | When |
| --- | --- | --- | --- |
| 2 | The UX-003 action-label table: build the proposal, Leila confirms | [UX] | During phase 2 |
| 3 | *Not now* durations — which options, and does snooze survive a browser change | [UX] then [PO] | Phase 2, then §8 |
| 4 | Whether `preparedAt` is stored or derived at prep time | you | Phase 3 |
| 5 | Pins: advisor-set or suggested from habits (`UX_IA.md` §6.1, open) | [UX] | Before phase 4 ships |

### 7.3 Hard blockers

- **The UX-008 wireframe.** Phase 4's layout cannot be guessed. Everything listed under "can
  start now" is real work that doesn't wait on it.
- **A request for the IA spine.** See §9.

---

## 8. Contract changes to propose

Not cut in. This is the list to put to Leila, and it is deliberately short.

| Field | On | For | Note |
| --- | --- | --- | --- |
| `preparedAt` | `Meeting` | UX-007 | The receipt needs a time. Nothing else will do. Also the only source line in the advisor view with no recency, since Batch 1 |
| `source` | `Signal` | UX-002, TR-10 | A signal carries `dataAsOf` but not what it stands on, so the UI is asserting "custodian records" rather than being told |
| `stageChangedAt` | `ProspectSummary` | UX-009, CS-09 | "26 days in proposal" is otherwise unsayable |
| `lastContactAt` | `ProspectSummary` | UX-009, CS-09 | Households have it; prospects don't. "Quiet 45+ days" needs it |
| `snoozed` + `snoozedUntil` | `AlertStatus`, `Alert` | UX-001, CS-05 | Only if snooze should outlive the browser |
| `GET /activity`, `Activity` | new | UX-010 | Phase 5, and it rides on X-05 |

`preparedAt`, `stageChangedAt` and `lastContactAt` are the same shape of change and are worth
taking together: they are all "the platform knows when something last moved, and the advisor
needs to see it". `Signal.source` is a different shape and smaller — it is a field the contract
simply forgot.

**Two questions for design, not for the contract**, both found while building Batch 1:

- `AlertAction.label` is no longer used in the advisor view. The screen names actions for what
  they do, because the contract's labels are named from the system's side. Either the contract's
  labels change or the field is presentational.
- `draft_email` and `send_reminder` are in `AlertAction`'s enum with no operation behind them:
  there is no way to create a communication through the API at all. They render as no button.
  That is either a gap to fill or two enum values to retire.

---

## 9. What has no request yet

`UX_IA.md` describes a new navigation spine — Today · Inbox · Calendar · four role homes ·
Pinned · Systems — with Communications and Follow-ups merged into one Inbox, and tabs inside each
role home. It is decided ("Option B"), it is the single largest change in the whole of `ux/`, and
there is no UX-xxx entry for it.

It should have one, or several, before it is built: it reworks the advisor sub-nav, merges two
sections, creates five places that have no screen today (Referrals · Outreach & content ·
Scorecard · Practice · Learning), and adds Systems, which needs its own data about connections
that nothing in the contract returns yet.

**Suggested:** ask Leila to raise it as UX-012 (spine and role homes) and UX-013 (Systems), and
treat the Ask side panel — `UX_IA.md` §5, currently a modal in the build — as a third. I have
not added these to `UX_REQUESTS.md`; that file is hers.

---

## 10. Tests that will break, and should

Two tests in `test/server.test.js` encode the shape of the UI as it is today. Both will fail in
phase 4 and phase 6, and both failures are correct — they are the guard doing its job. Update
them deliberately, in the same commit as the change, never by loosening the assertion.

**`the dashboard calls every ported endpoint`** (line 393) asserts the advisor sub-nav contains
`today · clients · communications · prospects · onboarding · calendar · followups`. The IA merges
communications and followups into Inbox and moves prospects inside a role home. When that lands,
the list becomes the new sections and the endpoint assertions above it stay exactly as they are.

**`no contract operation is left without a UI`** (line 494) matches `api('GET', '/summary')` and
`api('GET', '/next-actions')` as strings anywhere in `dashboard/js`. Moving the number strip off
Today and folding next-actions into the role cards keeps both calls in the code, so this test
should stay green throughout — if it goes red in phase 4, an endpoint genuinely lost its home.

---

## 11. Where to start

1. Get the answer to §7.1. It is one question and it gates the token swap.
2. Phase 0 and phase 1 in one sitting — half a day, invisible to anyone but you, and they turn
   Batch 1 from seven jobs into seven small ones.
3. Batch 1, in the order in §4, holding UX-007.
4. Write the §8 proposals up and send them with the UX-003 label table, so Leila has one
   decision-shaped thing to answer rather than four.
5. Then phase 3, and by then the UX-008 wireframe should be in.

Every phase gets its entry in `docs/design.md` when it lands — what was asked, what was built,
what wasn't, and what it implied.
