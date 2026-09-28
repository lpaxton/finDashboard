# Design decisions log

**For Luke.** Every design request that arrives from the designer gets an entry here: what was
asked for, what was built, what was not and why, and anything it implies for the product beyond
the styling.

The point is that a design request which widens scope, adds a field to the contract, or bumps
into one of the product's regulatory rules is visible to you rather than quietly absorbed into
a commit. Nothing here needs your approval to have happened — it has already been built — but
anything marked **Needs a decision** is waiting on you.

---

## How to read an entry

Each one records:

- **Asked for** — in the designer's words, as close to verbatim as possible.
- **Built** — what actually landed, and where.
- **Not built** — what could not be done now, and the real reason.
- **Implications** — a contract change, a new token, a cost that will land later, or a rule it
  ran into. Empty when it is purely visual.

Entries are newest first.

---

## Log

### 28 September 2026 · UX-008 to UX-011, the IA pass, and the contract run

Everything left in `ux/`: the four fields the design needed, Today rebuilt around the four
roles, the navigation spine and role homes from `ux/UX_IA.md`, the activity log, Systems, and
Ask as a side panel. Built against the specs rather than a wireframe, because the UX-008
wireframe has not arrived — every place that decided something a wireframe would have decided
is named under *Calls made without the drawing* below.

**The contract run** — four fields and two operations, added once rather than four times:

| Added | For |
| --- | --- |
| `Meeting.preparedAt` | UX-007. The receipt now reads "Prepared by the platform at 7:40 from custodian records, your CRM and your calendar" |
| `ProspectSummary.stageChangedAt` · `lastContactAt` | UX-009. "26 days" is now days in the proposal stage, which is what the sentence claims |
| `Signal.source` | The UI was asserting "custodian records"; now it is told |
| `AlertStatus.snoozed` · `Alert.snoozedUntil` | UX-001. *Not now* survives a change of browser and lands in the log |
| `GET /activity` | UX-010, X-05 |
| `GET /systems` · `PATCH /systems/{systemId}` | `UX_IA.md` §5 |

**Built**

- **UX-008 · Today by the four roles.** Four cards, fixed order in the spine and a daily order
  on Today, one action each, the top three behind one disclosure, one card leading on its
  role's deep gradient. The order pill says why it changed and the order can be pinned (ST-03,
  ST-09). *Next best action* is gone as a section: every suggestion now arrives inside the role
  card it belongs to (FO-11). The number strip has moved to **Book at a glance**, so
  `GET /summary` kept a home rather than losing one.
- **UX-009 · what is slipping**, in `dashboard/js/roles.js`, with CS-09's thresholds written
  out as a table rather than scattered. All three of the designer's examples now reach Today
  for Marcus: the Halloran Trust proposal at 26 days, Devon Pryce's lead with no reply at 6
  days, and the Guerrero household at 30 days — the last of which arrives through the platform's
  own ranking rather than the contact rule.
- **UX-010 · the activity log.** Top right on every advisor screen, opening beside the page.
  Seeded with the platform's own morning — ranked, prepared, checked, read — then every advisor
  action appended by the operation that did it. It doubles as history: an entry that can still
  be stepped back carries the operation that reverses it, and *Undo* in the panel re-renders
  whatever screen is showing.
- **UX-011 · a suggested next step on every signal.** Signals lead with what they mean
  ("2 households have losses worth harvesting. About $14,500 in unrealized losses.") and open
  in place.
- **The spine and role homes** (`UX_IA.md` §2–§4). Today · Inbox · Calendar, then the four roles
  with their marks, then Pinned when the advisor has pinned something, then Book at a glance and
  Systems. Communications and Follow-ups merged into one Inbox; Prospects, Onboarding, Reports
  and Playbooks moved inside role homes as tabs. Twelve tabs, all working against real data.
- **Systems**, showing what is connected, who set it up, when it last synced, and one sentence
  per gap saying what the platform cannot see. Read-only for an advisor who does not administer
  the firm, because knowing what the platform cannot see is not an administrator's privilege.
- **Ask as a side panel**, beside the page and never over it (FO-06). The page shifts rather
  than being covered wherever there is room to; below 860px there is none and the panel takes
  the screen. Its conversation survives moving between screens.

**Not built**

- **Outreach & content · Practice · Learning.** Named as role-home tabs in `UX_IA.md` §3 and
  §4, and there is no feature behind any of them: no operation, no data, nothing to draw. They
  are left out rather than built as three screens that say "nothing here yet" — which is what
  UX-004 asked us to stop doing. Development therefore has two tabs, not four. **This is a [PO]
  question for Leila**, not a build decision: they are new features, and they need specs before
  they need screens.
- **The referral window after a strong review** (CS-09). Referrals are built from each
  prospect's own origin, which is all the contract holds — there is no record of *who* made a
  referral, so the thank-you half of the rule cannot be built. Proposed as a contract change.
- **A drafted next step for growth work.** CS-03 asks for the suggested action to arrive already
  drafted where automation exists. For Prospecting it does not exist: the contract has no
  operation that creates a communication at all. Those actions open the record instead, and the
  labels say so rather than promising a draft nobody can produce.

**Calls made without the drawing** — each of these is a wireframe's job, decided here so the
build could continue, and each is one edit to change:

1. **Two cards across, reflowing to one.** Not a breakpoint: the cards reflow on the space left
   beside an open Ask panel, so opening Ask does not squash them.
2. **The lead card is the deep gradient and the other three are white with a band.** That is
   the design system's rule (§1.3); what the wireframe would settle is whether the lead card is
   also *larger*. It is not, here.
3. **Top three behind one disclosure per card**, labelled "Show the next two" — FO-02 says the
   card opens to its top three on demand, and does not say how.
4. **The order pill is a button that reveals the reason**, rather than the reason always being
   on screen. ST-03 requires the reason, not its permanent display.
5. **Pinning.** Two different pins exist: a star on each role card pins that role into the
   spine's Pinned group, and a separate control pins the day's order (ST-09). `UX_IA.md` §6.1 is
   still open on whether the platform may suggest a pin; it does not, and never adds one.
6. **Inbox tabs** are Drafts to approve · Follow-ups · Everything sent. §4 says the Inbox holds
   "messages to answer, drafts to approve and follow-ups due" and does not divide them.

**Implications**

1. **The role taxonomy lives in the front end.** The contract does not say which role a piece of
   work belongs to, and `roles.js` decides. That is defensible — a role is how a day is
   organised, not a property of an alert — but it means the platform cannot rank across roles,
   which is what UX-009 flagged as possible plumbing. If it should, `role` becomes a field on
   NextAction and that file gets much smaller.
2. **Development is nearly empty, and that is the finding.** Its card shows one thing: whichever
   scorecard metric moved most, phrased as movement and never as a shortfall (CS-08). The
   research's point was that growth work has no place on Today; the same is now visibly true of
   the advisor's own practice, and it is a product gap rather than a layout one.
3. **"Not this" teaches nothing yet.** CS-05 says the optional reason teaches the ranking. There
   is nowhere in the contract to put a preference about a suggestion, so *Not this* hides the
   item in this browser and no reason is collected. Worth a contract change if the ranking is
   ever to learn — and worth *not* pretending in the meantime.
4. **An alert-backed item and an ordinary one behave differently underneath.** Setting aside an
   alert goes through the contract, survives a change of browser and lands in the activity log.
   Setting aside anything else is view state. The difference is invisible to the advisor, and it
   is the honest one to make rather than faking durability.
5. **Two tests were updated deliberately, as the build plan said they would be.** The advisor
   sub-nav assertion now names the spine and the role tabs; the operation count moved from 72 to
   75. `no contract operation is left without a UI` stayed green throughout except once, when it
   correctly caught that the rebuilt Today had left `PATCH /alerts/{alertId}` with no caller —
   a real regression, fixed by answering alert-backed items through the contract.
6. **Dark-mode role bands hold.** Leila's open check. The deep gradients are not redefined for
   dark and do not need to be; the bands and the lead card read correctly on the dark ground.
   Still worth her eye.

---

### 28 September 2026 · Batch 1 — UX-001 to UX-006

Six of the seven quick wins in `ux/UX_REQUESTS.md`. UX-007 is held for the contract run; it
needs a time a meeting does not carry. All six land on the same three panels, so they were
built as one pass. `docs/ux-build-plan.md` §4.

**Asked for, and built**

- **UX-004 · placeholder copy.** The "…is not built yet" toasts are gone: an action the
  platform cannot perform is not offered at all. "0 days ago" is gone. So are the two
  developer-facing sentences — the note under Next best action that named `suggestedTask` and
  `/tasks`, and the ISO date in a prep reason ("…on 2026-09-28 has no prep").
- **UX-003 · one word, one meaning.** "Review" meant three things. It now means none of them.
  Alert actions are named for what pressing them does (*Open the household*, *Open the approval
  queue*); the signal expander is *Show the households* / *Hide the households*; the prep brief
  is *Show the prep brief* / *Hide the prep brief*. Every expander in the advisor view now takes
  the same Show/Hide shape.
- **UX-002 · sources in plain language.** One `sourceLine()` used by the alert list, the prep
  brief, the portfolio signals, Next best action and the Ask panel's citations. No system name
  appears anywhere in the advisor view — checked by walking all ten sections and scanning the
  rendered text. The prospect's own origin (`referral`, `website`, `event`) was a second raw
  enum on screen and is now words too.
- **UX-005 · what the advisor opens, stays open.** Open cards are written to view state and put
  back on render, without the opening motion. Verified against the request's own test: open a
  brief, go to Clients, come back — still open, still loaded.
- **UX-006 · motion on open and close.** The new disclosure, with the root-level reduced-motion
  override from the scaffolding entry below.
- **UX-001 · undo on dismiss, and Not now.** Dismiss toasts an *Undo* that patches the alert
  back to `open` — a real round trip, verified. *Not now* offers three times in place of the
  row's actions (later today · tomorrow morning · next week), and its toast also undoes. A line
  under the list says how many are set aside and brings them back, so nothing vanishes quietly
  (ST-08).

**Not built**

- **UX-007**, deliberately. See implication 2.
- **Two alert actions have no button.** `draft_email` and `send_reminder` are in the contract's
  `AlertAction` enum and have no operation behind them — there is no way to create a
  communication in the API at all. Rather than a button that apologises, they are absent. The
  alert still has *Not now* and *Dismiss*, so it is always answerable (CS-05).
- **UX-011's meaning-first signal copy** is phase 4 and untouched here; only the signal's button
  was renamed.

**Implications**

1. **The contract's `action.label` is now unused in the advisor view.** The screen names actions
   itself, because the contract's labels are named from the system's side — the same "Review"
   arrives on a margin call, a cash balance and a restricted account. Either the contract's
   labels should change, or the field is presentational and should be dropped. A question for
   the designer and the contract, not a bug.
2. **A prep brief shows its sources without an age.** `sourceLine()` takes an optional time and
   the brief passes none: a meeting carries `briefSources` but nothing saying when the brief was
   prepared, and the meeting's own start time is not that. Implying a freshness the platform
   cannot vouch for would break TR-06 and TR-08 more than omitting it does. This is UX-007's
   `preparedAt`, and it is now the only source line in the advisor view with no recency.
3. **A portfolio signal asserts a source the contract does not give it.** `Signal` carries
   `dataAsOf` but no `source`. The signals are computed from holdings, so "custodian records" is
   true, but the UI is stating it rather than being told — exactly what TR-10 is about. Added to
   the contract proposals.
4. **`platform` is a fifth kind of source.** The design system names five — custodian records,
   your CRM, your calendar, your notes, market data — and the contract's fourth enum value is
   `platform`, for something the platform worked out itself. It renders as "the platform's own
   checks". Worth confirming. Notes and market data have no contract value yet.
5. **Three answers is the most an alert row will hold.** With an action, *Not now* and *Dismiss*,
   the row's text column collapsed; it now has a width floor and the buttons wrap beneath. Worth
   watching in the UX-008 wireframe, where the same three answers sit inside a role card.
6. **One change reached the mock, not just the dashboard.** The "0 days ago" and the
   `suggestedTask` note are composed server-side in `src/mock-core.js`, so UX-004 was not purely
   Paint. Nothing in the contract changed — only the strings a real backend would also be
   returning.

---

### 28 September 2026 · Front-end scaffolding for Batch 1

Not a designer request. Four shared pieces built first because four of the seven Batch 1
requests are cheap only if they exist, and everything in UX-008 needs all four. Recorded here
because one of them carries a decision the designer needs to know about. See
`docs/ux-build-plan.md` §3.

**Built**

- `dashboard/js/viewstate.js` — one place for what the advisor set by hand: open cards,
  expanded rows, snoozed alerts, and the pinned role order when it arrives. Persisted to
  `localStorage`, keyed by persona so the sign-in-as switcher cannot leak Dana's state into
  Marcus's. This is UX_RULES ST-07 kept in one place rather than in seven closures.
- `format.js` — `sourceLine()` and `ageBrief()`. The contract's four-value `Source` enum mapped
  to the advisor's words (custodian records · your CRM · your calendar · the platform), with a
  fallback for anything unrecognised. Nothing renders through it yet; UX-002 is the sweep.
- `ui.js` — `disclosure()` / `wireDisclosures()`. A button-and-region pair replacing
  `<details>`, which can neither be transitioned nor remember that it was open. Serves UX-005
  and UX-006 together, and the role cards' top-three later.
- `styles.css` — motion tokens wired to the transitions that exist, and one root-level
  `prefers-reduced-motion` block that zeroes every duration. Done as a token override rather
  than per-rule so a component added later cannot forget it.

**Not built** — nothing renders through any of it yet. That is phase 2, deliberately: the
scaffolding landed on its own so the seven requests are small.

**Implications**

1. **View state is this browser only.** It is the advisor's own choices, not data, and there is
   nowhere in the contract to put it. Fine for open cards. Not fine for UX-001's *Not now*,
   where a snooze that vanishes when the advisor opens a laptop instead of a desktop is a
   broken promise, not a lost convenience. Raised as a contract proposal — see the build plan §8.
2. **An unnamed source is a rule problem, not a wording one.** `sourceKind()` degrades an
   unrecognised value to "another connected system" and warns once in the console. If that ever
   fires in real use, TR-10 is the thing to fix, not the mapping table.
3. **The disclosure's motion is unverified.** The component's behaviour is verified — open and
   closed state, `aria-expanded`, the label swap, focus correctly withheld from closed content,
   lazy loading on first open, and the open state surviving a redraw. The easing itself is not:
   a hidden browser tab does not run CSS transitions, so it could not be measured. Worth two
   seconds of somebody's eyes when UX-005 lands. The technique (`grid-template-rows` `0fr` to
   `1fr`) needs Chrome/Edge 107, Safari 16 or Firefox 127; older engines snap rather than break.

---

### 28 September 2026 · UX_TOKENS.css v0.5 — the ground, the type and the firm's accent

**Asked for** — *(`ux/UX_TOKENS.css`, header)* "Replace the three `:root` blocks at the top of
`dashboard/styles.css` … Every variable name you use today is kept, so no other line of
styles.css has to change to pick up the new ground, type and status colours." Plus the font
link in `index.html`.

**Built**

- The three `:root` blocks replaced wholesale. Our `box-sizing` and safe-area padding stay in
  `:root`; they are not part of the palette and are commented as ours.
- Fonts swapped to Plus Jakarta Sans · Newsreader · JetBrains Mono.
- Three rules moved with the palette, because the design system changes what they *mean* rather
  than only their colour: `.btn.primary` from `--brand` fill to `--ink` fill, and every
  `:focus-visible` ring from `--brand` to `--accent`, the coral ring. Checked in both themes on
  Today, Clients, Communications, the household dialog and Firm billing.

**Not built**

- **Charts are still `--brand`.** The design system says charts use `--chart-1..4` and never a
  role or brand colour, but it also lists the data-visualisation palette under "not yet
  designed". The sparkline, the meters and the allocation bars are left as they are rather than
  half-moved. One edit when that palette arrives.
- **Two selected-state treatments still coexist.** The view tabs fill with `--brand`; the
  section rail uses `--brand-soft` with `--brand` text. ST-06 says the same thing takes the same
  shape. Left alone here because the token swap was meant to change no other line; folded into
  UX-003, which is the same kind of problem.
- **Dark-mode role bands unchecked.** The dark blocks in the tokens file redefine the solid
  role colours but not the gradients, which is the designer's own note. Nothing on screen uses
  a band yet, so this waits for UX-008 and is flagged there.

**Implications**

1. **The firm's accent no longer drives the interface.** `state.js` set `--brand` from the
   firm's `accentColor` at runtime, which would have let a red or orange firm colour collide
   with the Prospecting role, with `--crit`, and with the coral focus ring — ST-04 says a colour
   means one thing everywhere. `applyBranding()` now sets `--firm-mark`, used by the avatar,
   and `--brand` stays moss. **This follows the designer's own recorded leaning**
   (`ux/UX_DESIGN_SYSTEM.md` §6) on a question she has parked as a [PO] call, so it is a
   decision made in her direction, not for her — it reverses in one line if she lands elsewhere.
2. **The dark-mode accent problem is retired with it.** The two-stored-colours contract change
   the handoff anticipated is moot while the accent only paints the mark: `forTheme()` still
   lifts it, and the mark's text colour already flips with the theme.
3. **`--on-brand` now has one user.** Only the avatar and the view tabs use it. It is not dead,
   but it is no longer the pair to every `--brand` fill, and it is worth watching.
4. **`npm run typecheck` does not run** — `tsc` is not installed in this checkout. Not a
   regression and not caused by this change, but the JSDoc types went unchecked for it.

---

## Standing notes

Things worth knowing before reading entries, so the same context is not repeated in each one.

**The five product rules the designer has been given** (section 4 of the handoff) are the ones
most likely to generate an entry, because they are where a reasonable design request meets a
constraint that is not obvious from looking at the screen:

1. A draft must never look like a sent message.
2. An AI output must show what produced it and what it read.
3. Uncertain data must not be presented as fact.
4. The client sees only what an adviser has approved.
5. Anything showing a rise must know whether a rise is good.

**Requests that are cheap:** anything expressible as a colour token, spacing, type, or a
variant of an existing component. The tokens are defined once, so a palette change is one edit.

**Requests that are not cheap, and why:** anything needing information the API does not
currently return. "Colour AI-generated content differently" is an example that sounds like CSS
and is not entirely — the platform already marks AI output with provenance, so the data is
there for drafts and query answers, but content that was AI-assisted earlier in its life and
then edited by an adviser carries no such marker today. Making that distinction visible would
need a field adding to the contract and the mock. Worth knowing that shape of request exists.

**The one thing that cannot be traded away:** the client-safe boundary. It is currently
structural — a `/me` endpoint physically cannot return another household's data, and a test
walks every client response looking for internal fields. A design that needs a client to see
something adviser-side is not a styling change; it is a change to what the product is, and it
comes to you.
