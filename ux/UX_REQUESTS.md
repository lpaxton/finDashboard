# UX requests

*Live · started 26 September 2026 · Owner: Leila Mitchell · Read `UX_README.md` first*

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
Status: Ready · Tag: [UX] · Views: Advisor
Asked for: When an alert is dismissed, the toast offers *Undo*. Next to *Dismiss*, add *Not
now*, which lets the advisor pick when the alert comes back.
Why: TR-07 (undo wherever possible) · CS-05 (always answerable). Today a dismissed alert
disappears for good.
Done looks like: dismiss, then undo, and the alert is back where it was. *Not now* hides it
until the chosen time. The contract already allows `open` as an alert status.
Spec: UX_RULES.md TR-07, CS-05.
Build notes: —

### UX-002 · Sources in plain language, with recency
Touches: **Paint**
Status: Ready · Tag: [UX] · Views: Advisor
Asked for: Show sources as the kind of source and how fresh it is — "From custodian records ·
updated 2 hrs ago" — instead of system names like "greenmeadows" or "crm, calendar".
Why: TR-06 (sources present but quiet) · TR-10 (insight names the kind of source).
Done looks like: no system names on any advisor screen; every source line reads as a kind
(custodian records · your CRM · your calendar · your notes · market data) plus an age.
Spec: UX_RULES.md TR-06, TR-10.
Build notes: —

### UX-003 · One word, one meaning
Touches: **Paint**
Status: Ready · Tag: [UX] · Views: Advisor
Asked for: Stop using "Review" for three different things. On Today it's an unbuilt alert
action and a button that expands a list (then becomes "Hide"), and the same margin call offers
"Add as follow-up" on *Next best action*. Name each action for what it does.
Why: ST-06 (same thing, same word, same shape).
Done looks like: every action label says what will happen, and the same action has the same
name on every screen.
Spec: UX_RULES.md ST-06.
Build notes: —

### UX-004 · Clean up placeholder copy
Touches: **Paint**
Status: Ready · Tag: [UX] · Views: Advisor
Asked for: Remove developer-facing text from the advisor view: "0 days ago" (should read
"today"), "Drafts. Nothing here has been created; post a suggestedTask to /tasks to accept
one.", and the "…is not built yet" toasts (hide an action until it's built instead).
Why: ST-06 · FO-10 (explain in one sentence, in the advisor's language).
Done looks like: nothing on an advisor screen mentions an endpoint, a field name or an unbuilt
feature.
Spec: UX_RULES.md ST-06, FO-10.
Build notes: —

### UX-005 · What the advisor opens, stays open
Touches: **Furniture**
Status: Ready · Tag: [UX] · Views: Advisor
Asked for: An opened prep brief or signal list stays open when the advisor leaves Today and
comes back. Today the whole section redraws and everything closes.
Why: ST-07 (what the advisor sets, stays).
Done looks like: open a brief, go to Clients, come back: the brief is still open.
Spec: UX_RULES.md ST-07.
Build notes: —

### UX-006 · Motion on open and close
Touches: **Paint**
Status: Ready · Tag: [UX] · Views: Advisor
Asked for: Briefs and signal details open and close with a short motion, so the advisor sees
where the content came from and went. Reduced-motion settings switch it off.
Why: FO-08 (motion explains where things went).
Done looks like: nothing snaps open; nothing moves for decoration; reduced motion = no motion.
Spec: UX_RULES.md FO-08.
Build notes: —

### UX-007 · A receipt on every prepared brief
Touches: **Furniture** *(Plumbing if "prepared at" isn't already stored)*
Status: Ready · Tag: [UX] · Views: Advisor
Asked for: Each prep brief says what the platform did and when: "Prepared by the platform at
7:40 from custodian records, your CRM and calendar."
Why: TR-04 (every prepared item carries a one-line receipt). Today, "Prep ready" is a status,
not a receipt.
Done looks like: every AI-prepared item on Today carries one line saying what was done, from
what, and when.
Spec: UX_RULES.md TR-04.
Build notes: —

---

## Batch 2 — structural (wireframe first)

### UX-008 · Today by the four roles
Touches: **Room**
Status: Drafting (wireframe in progress) · Tag: [UX] · Views: Advisor
Asked for: Rebuild Today around four role cards — prospecting and business development ·
client advisor · business operations · professional development — one action each, top three
on demand, one card leading. The order changes daily with a one-line reason, and the advisor
can pin it. *Next best action* folds into the cards. The four-number strip moves off Today.
Why: FO-01 to FO-04, FO-11, ST-02, ST-03, ST-09, CS-01. Testing found Today is a client-work
screen: growth work, the research's #1 constraint, has no place on it.
Done looks like: the wireframe (to follow).
Spec: UX_RULES.md §1, §3, §4.
Build notes: —

### UX-009 · Surface what's slipping
Touches: **Room** *(Plumbing if ranking across roles needs a new operation)*
Status: Drafting · Tag: [UX] · Views: Advisor
Asked for: Feed the role cards from data the platform already holds: proposals waiting too
long, new leads with no reply, clients without contact. For Marcus today that's the Halloran
Trust proposal (26 days), Devon Pryce's lead (6 days), and the Guerrero household (30 days
since contact). None of them reach Today now.
Why: CS-09 (what counts as slipping) · CS-03 (a signal arrives with its next step).
Done looks like: each of those three appears in the right role card, with a suggested action.
Spec: UX_RULES.md CS-03, CS-09.
Build notes: —

### UX-010 · Activity log
Touches: **Plumbing**
Status: Drafting · Tag: [UX] · Views: Advisor
Asked for: One place, always in the same spot, recording everything the platform did —
drafted, ranked, flagged, reordered, sent on the advisor's yes — that also works as history,
so the advisor can step back through recent changes.
Why: TR-03 · TR-07 · ST-01. There is no activity log in the advisor view today.
Done looks like: the wireframe (to follow). Luke's handoff already notes that approvals "have
nowhere durable to live" until the audit trail (X-05) exists, so this probably rides on that
work.
Spec: UX_RULES.md TR-03, TR-07, ST-01.
Build notes: —

### UX-011 · A suggested next step on every signal
Touches: **Room**
Status: Drafting · Tag: [UX] · Views: Advisor
Asked for: Every signal leads with its meaning and one suggested action, drafted where
automation exists. Today, portfolio signals list households with only "Review".
Why: FO-09 (meaning first, then a suggested action) · CS-03.
Done looks like: the wireframe (to follow).
Spec: UX_RULES.md FO-09, CS-03.
Build notes: —
