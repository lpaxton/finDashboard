# UX requests

*Live · started 26 September 2026 · Owner: Leila Mitchell · Read `UX_README.md` first*

> **Build notes added 28 September 2026 from the build side.** Statuses and the `Build notes:`
> lines below were filled in by Luke's build, per `UX_README.md` §3 step 3. Nothing else in
> this file was touched: the asks, the reasons and the *Done looks like* lines are as Leila
> wrote them. What was built, what was not and why is in `advisor-platform-mock/docs/design.md`;
> the order it was built in is in `advisor-platform-mock/docs/ux-build-plan.md`.
>
> **Two requests were raised from the build** (Batch 3, UX-012 and UX-013), out of reading
> `UX_RESEARCH.md` against what was built. **Three more things need a [PO] call before they can
> be built** — see the bottom of this file.

The log of what design asks build for, and what comes back. One entry per request. Luke's
`docs/design.md` records what was built; this file records what was asked for and why, so the
two can be read side by side.

**Every request says what it touches first**, so the size of a change is clear before the
detail:

| Touches | Means | Risk to the build |
| --- | --- | --- |
| **Paint** | Words, labels, colour, motion. Presentation only | None |
| **Furniture** | Small front-end behaviour the contract already supports | Very low |
| **Room** | Reworks how one section is drawn. Contract and data unchanged | Moderate, contained to one section |
| **Plumbing** | Needs the contract, the backend or the data model to change | Real work. Luke's read first |

## Statuses

| Status | Meaning |
| --- | --- |
| **Drafting** | Still being designed. Not for building yet |
| **Ready** | Designed, and ready for Luke to pick up |
| **Built** | Done. Links to the `docs/design.md` entry |
| **Partly built** | Some of it landed; the rest is explained in `docs/design.md` |
| **Needs a decision** | Blocked on a [PO] call, a contract change, or a product rule |
| **Returned** | The build taught us something; the spec in `ux/` needs updating first |

## Entry template

```
### UX-000 · Short name
Touches: Paint / Furniture / Room / Plumbing
Status: Drafting · Tag: [UX] or [PO] · Views: Firm / Advisor / Client
Asked for: what should happen, in plain words.
Why: the rule, research finding or decision behind it.
Done looks like: how we will know it's right.
Spec: link to the rule in UX_RULES.md, a wireframe, or both.
Build notes: (Luke) what landed, what didn't, link to docs/design.md.
```

---

## A note for Luke before the list

These came from testing your advisor **Today** screen against `UX_RULES.md`, rule by rule.
The foundations held up: sources are always shown, empty states are plain sentences, depth
opens in place, and alerts describe the situation rather than the advisor. The rules build on
your five product rules rather than replacing them.

The list is split so it can be taken a slice at a time: **seven quick wins** that need no
drawing (paint and furniture), then **four structural changes** that each wait for a
wireframe. Nothing here needs doing at once, and anything that turns out harder than it looks
is exactly what the *Returned* status is for.

**One thing to watch:** your test that every contract operation has a UI. UX-008 moves *Next
best action* into the role cards and the number strip off Today, so `GET /next-actions` and
`GET /summary` need to stay reachable somewhere in the dashboard.

---

## Batch 1 — quick wins (no wireframe needed)

### UX-001 · Undo on dismiss, and "Not now"
Touches: **Furniture**
Status: Built · Tag: [UX] · Views: Advisor
Asked for: When an alert is dismissed, the toast offers *Undo*. Next to *Dismiss*, add *Not
now*, which lets the advisor pick when the alert comes back.
Why: TR-07 (undo wherever possible) · CS-05 (always answerable). Today a dismissed alert
disappears for good.
Done looks like: dismiss, then undo, and the alert is back where it was. *Not now* hides it
until the chosen time. The contract already allows `open` as an alert status.
Spec: UX_RULES.md TR-07, CS-05.
Build notes: (Luke) Undo sits in the toast on dismiss and on *Not now*, and the alert comes back where it was. *Not now* offers later today / tomorrow morning / next week. Snooze needed the contract — `AlertStatus` had no `snoozed` and nowhere to keep a time — so `snoozed` and `snoozedUntil` were added and it now survives a change of browser and lands in the activity log. `docs/design.md`, 28 Sept.

### UX-002 · Sources in plain language, with recency
Touches: **Paint**
Status: Built · Tag: [UX] · Views: Advisor
Asked for: Show sources as the kind of source and how fresh it is — "From custodian records ·
updated 2 hrs ago" — instead of system names like "greenmeadows" or "crm, calendar".
Why: TR-06 (sources present but quiet) · TR-10 (insight names the kind of source).
Done looks like: no system names on any advisor screen; every source line reads as a kind
(custodian records · your CRM · your calendar · your notes · market data) plus an age.
Spec: UX_RULES.md TR-06, TR-10.
Build notes: (Luke) One `sourceLine()` across alerts, prep briefs, signals, suggestions and Ask. No system name appears anywhere in the advisor view. Two things for you: `platform` is a fifth kind of source and renders as "the platform's own checks" — your five kinds do not cover it; and `Signal` had no `source` at all, so the UI was asserting "custodian records" rather than being told. `Signal.source` was added to the contract. `docs/design.md`, 28 Sept.

### UX-003 · One word, one meaning
Touches: **Paint**
Status: Built · Tag: [UX] · Views: Advisor
Asked for: Stop using "Review" for three different things. On Today it's an unbuilt alert
action and a button that expands a list (then becomes "Hide"), and the same margin call offers
"Add as follow-up" on *Next best action*. Name each action for what it does.
Why: ST-06 (same thing, same word, same shape).
Done looks like: every action label says what will happen, and the same action has the same
name on every screen.
Spec: UX_RULES.md ST-06.
Build notes: (Luke) "Review" is gone. Alert actions are named for what pressing them does; every expander in the advisor view is now Show…/Hide…. Two findings: the contract's `AlertAction.label` is no longer used by the advisor view, and `draft_email` and `send_reminder` are in its enum with no operation behind them, so they render as no button. `docs/design.md`, 28 Sept.

### UX-004 · Clean up placeholder copy
Touches: **Paint**
Status: Built · Tag: [UX] · Views: Advisor
Asked for: Remove developer-facing text from the advisor view: "0 days ago" (should read
"today"), "Drafts. Nothing here has been created; post a suggestedTask to /tasks to accept
one.", and the "…is not built yet" toasts (hide an action until it's built instead).
Why: ST-06 · FO-10 (explain in one sentence, in the advisor's language).
Done looks like: nothing on an advisor screen mentions an endpoint, a field name or an unbuilt
feature.
Spec: UX_RULES.md ST-06, FO-10.
Build notes: (Luke) Unbuilt actions are hidden rather than apologised for. "0 days ago", the `suggestedTask` note and an ISO date in a prep reason were composed server-side, so this was not purely Paint — the strings changed in the mock. No contract change. `docs/design.md`, 28 Sept.

### UX-005 · What the advisor opens, stays open
Touches: **Furniture**
Status: Built · Tag: [UX] · Views: Advisor
Asked for: An opened prep brief or signal list stays open when the advisor leaves Today and
comes back. Today the whole section redraws and everything closes.
Why: ST-07 (what the advisor sets, stays).
Done looks like: open a brief, go to Clients, come back: the brief is still open.
Spec: UX_RULES.md ST-07.
Build notes: (Luke) Open cards are kept per persona and restored without the opening motion. Tested as written: open a brief, go to Clients, come back — still open. `docs/design.md`, 28 Sept.

### UX-006 · Motion on open and close
Touches: **Paint**
Status: Built · Tag: [UX] · Views: Advisor
Asked for: Briefs and signal details open and close with a short motion, so the advisor sees
where the content came from and went. Reduced-motion settings switch it off.
Why: FO-08 (motion explains where things went).
Done looks like: nothing snaps open; nothing moves for decoration; reduced motion = no motion.
Spec: UX_RULES.md FO-08.
Build notes: (Luke) `<details>` cannot be transitioned, so it was replaced with one disclosure component used by every expander. Reduced motion is set once on the duration tokens, so nothing built later can miss it. `docs/design.md`, 28 Sept.

### UX-007 · A receipt on every prepared brief
Touches: **Furniture** *(Plumbing if "prepared at" isn't already stored)*
Status: Built · Tag: [UX] · Views: Advisor
Asked for: Each prep brief says what the platform did and when: "Prepared by the platform at
7:40 from custodian records, your CRM and calendar."
Why: TR-04 (every prepared item carries a one-line receipt). Today, "Prep ready" is a status,
not a receipt.
Done looks like: every AI-prepared item on Today carries one line saying what was done, from
what, and when.
Spec: UX_RULES.md TR-04.
Build notes: (Luke) You were right that it was Plumbing: a meeting carried `briefSources` but nothing saying when the brief was prepared, and its start time is not that. `Meeting.preparedAt` added. It now reads "Prepared by the platform at 7:40 from custodian records, your CRM and your calendar." `docs/design.md`, 28 Sept.

---

## Batch 2 — structural (wireframe first)

### UX-008 · Today by the four roles
Touches: **Room**
Status: Built · Tag: [UX] · Views: Advisor
Asked for: Rebuild Today around four role cards — prospecting and business development ·
client advisor · business operations · professional development — one action each, top three
on demand, one card leading. The order changes daily with a one-line reason, and the advisor
can pin it. *Next best action* folds into the cards. The four-number strip moves off Today.
Why: FO-01 to FO-04, FO-11, ST-02, ST-03, ST-09, CS-01. Testing found Today is a client-work
screen: growth work, the research's #1 constraint, has no place on it.
Done looks like: the wireframe (to follow).
Spec: UX_RULES.md §1, §3, §4.
Build notes: (Luke) Built against the rules and the design system rather than the wireframe, which has not arrived. Six calls a wireframe would have made are listed under *Calls made without the drawing* in `docs/design.md` — cards two across reflowing to one, the lead card deep but not larger, the top three behind one disclosure, the order pill as a button, two separate pins, and the Inbox's three tabs. Each is one edit. *Next best action* is gone as a section and the number strip is now Book at a glance, so `GET /summary` and `GET /next-actions` both kept a home. `docs/design.md`, 28 Sept.

### UX-009 · Surface what's slipping
Touches: **Room** *(Plumbing if ranking across roles needs a new operation)*
Status: Built · Tag: [UX] · Views: Advisor
Asked for: Feed the role cards from data the platform already holds: proposals waiting too
long, new leads with no reply, clients without contact. For Marcus today that's the Halloran
Trust proposal (26 days), Devon Pryce's lead (6 days), and the Guerrero household (30 days
since contact). None of them reach Today now.
Why: CS-09 (what counts as slipping) · CS-03 (a signal arrives with its next step).
Done looks like: each of those three appears in the right role card, with a suggested action.
Spec: UX_RULES.md CS-03, CS-09.
Build notes: (Luke) All three of your examples now reach Today for Marcus. The numbers needed the contract: `stageChangedAt` and `lastContactAt` on a prospect, because "26 days" is days in the proposal stage and the record's age is a different number. CS-09's thresholds are written out in one place in `dashboard/js/roles.js`. One part could not be built: the referral window after a strong review, because the contract holds no record of who made a referral. `docs/design.md`, 28 Sept.

### UX-010 · Activity log
Touches: **Plumbing**
Status: Built · Tag: [UX] · Views: Advisor
Asked for: One place, always in the same spot, recording everything the platform did —
drafted, ranked, flagged, reordered, sent on the advisor's yes — that also works as history,
so the advisor can step back through recent changes.
Why: TR-03 · TR-07 · ST-01. There is no activity log in the advisor view today.
Done looks like: the wireframe (to follow). Luke's handoff already notes that approvals "have
nowhere durable to live" until the audit trail (X-05) exists, so this probably rides on that
work.
Spec: UX_RULES.md TR-03, TR-07, ST-01.
Build notes: (Luke) `GET /activity` added. Top right on every advisor screen, opening beside the page. Seeded with the platform's own morning, then appended by the operation that did each thing. It doubles as history: an entry carries the operation that reverses it, and Undo re-renders whatever screen is showing. Anything that left the firm is recorded and not undoable. `docs/design.md`, 28 Sept.

### UX-011 · A suggested next step on every signal
Touches: **Room**
Status: Built · Tag: [UX] · Views: Advisor
Asked for: Every signal leads with its meaning and one suggested action, drafted where
automation exists. Today, portfolio signals list households with only "Review".
Why: FO-09 (meaning first, then a suggested action) · CS-03.
Done looks like: the wireframe (to follow).
Spec: UX_RULES.md FO-09, CS-03.
Build notes: (Luke) Signals lead with their meaning and open in place. The suggested action is *Show which households* rather than a drafted step, because portfolio signals have no automation behind them in the contract. `docs/design.md`, 28 Sept.


---

## Batch 3 — raised by the build, from the research (28 September 2026)

*These two run the other way down the log: the build asking design, which is the return path in
`UX_README.md` §3 step 4. They came out of reading `UX_RESEARCH.md` against what was built —
the full check is in `advisor-platform-mock/docs/ux-research-check.md`. Numbers are taken from
the next free ones; renumber or reject them freely, they are yours.*

### UX-012 · Life events have nowhere to live
Touches: **Plumbing**
Status: Needs a decision · Tag: [PO] · Views: Advisor (Client later)
Asked for: A way for the platform to surface a change in a client's life — and a rule for when
it must not. F4 lists what S1's advisors named: job changes, relocations, new family members,
divorce, inheritance, large transactions, birthdays and anniversaries, retirement horizon,
children reaching college age, overspending and pay swings. The same finding asks for the
opposite as well: sensitive events never enter a draft, and a client going through a divorce
gets a full automation clamp, inspectable and with reasons.
Why: F4, and it is **HEARD** — one of the three clearest asks in the only primary research we
have. CS-09 already names "life events" as something that counts as slipping, and TR-08 and
product rule 3 govern what may be said about them.
Done looks like: a life event reaches the right role card with what happened, how the platform
knows and one suggested action (CS-03) — and a named class of event that the platform notices
and deliberately says nothing about, where the advisor can see that it is holding back and why.
Spec: UX_RULES.md CS-09, CS-03, TR-08 · UX_RESEARCH.md F4.
Build notes: (Luke) **Nothing exists to build on.** No endpoint, no field, no data source, and
no feature among the 75 — `UX_RESEARCH.md` §7 already says so: *"life-event detection is not a
named feature."* The phrase appears once in the code, in a comment in `dashboard/js/roles.js`
quoting the rule it cannot implement. The restraint half has no precedent anywhere in the build:
every rule implemented so far governs what to show, and this one governs what to withhold.
§5 of the research notes that restraint rules are the row no competitor ships.
This needs a feature and a data source before it can be designed, so it is a [PO] call first.

### UX-013 · The four roles are untested, and they are the frame
Touches: **Room** *(potentially everything on Today)*
Status: Needs a decision · Tag: [PO] · Views: Advisor
Asked for: Put FO-01's four roles in front of advisors before anything more is built into them —
and settle what Development is for, or whether it is a role at all.
Why: `UX_RESEARCH.md` F9 says the advisor is **planner, relationship manager and small-business
owner** — three, tagged OURS. FO-01 says **prospecting · client advisor · business operations ·
professional development** — four. They do not map: planner and relationship manager both fold
into client advisor, small-business owner splits across prospecting and operations, and
**professional development has no root in F9 at all.** So the organising principle of the whole
advisor view is the team's framing of the team's framing, and no advisor has been asked.
§9 question 9 already has the question written down.
Done looks like: advisors recognise their week in the four roles, or they tell us the shape it
really has. Either answer is worth having before more is built on it.
Spec: UX_RULES.md FO-01, FO-02, CS-01 · UX_RESEARCH.md F9, §9.9 · UX_IA.md §2, §3.
Build notes: (Luke) Built as specified, and it works — but the roles are now the frame of
everything: the spine, Today's cards, the role homes and the ranking in `dashboard/js/roles.js`.
Two observations from building it. **Development is the emptiest card because it is the role
with no evidence behind it**, not because its endpoints are thin — it shows one scorecard metric
because that is all there is, and I would not build Practice or Learning into it until this is
answered. And the navigation A/B test parked in `UX_IA.md` §7 is worth more now, not less:
the build committed to Option B and the other board still exists.


---

## Waiting on a [PO] call, 28 September 2026 (from the build)

Three things in `UX_IA.md` §3 and §4 were named as places in a role home, and there is no
feature behind any of them — no operation, no data, nothing to draw:

| Place | What exists |
| --- | --- |
| **Outreach & content** (Prospecting) | Nothing. Branded content and materials are GP-04 to GP-10, and five of those are on the regulatory list |
| **Practice** (Development) | Nothing. AX-05 and AX-06, simulated client conversations |
| **Learning** (Development) | Nothing |

They were left out rather than built as three screens saying "nothing here yet", which is what
UX-004 asked us to stop doing. Development therefore has two tabs, not four. These are new
features rather than a layout question, so they need a spec before they need a screen.

**Two more, smaller:**

- **CS-09's referral window** ("the referral window after a strong review") cannot be built: the
  contract records that a prospect came from a referral, but not who made it. A contract change,
  if the rule is to stand as written.
- **CS-05's optional reason on *Not this*** collects nothing, because there is nowhere in the
  contract to keep a preference about a suggestion. The item is hidden in that browser and the
  ranking learns nothing. Worth a contract change if it is ever to.
