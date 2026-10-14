# Demo path — the story map

*v0.2 · 14 October 2026 (v0.1 13 Oct) · Owner: Leila Mitchell · Drafted from Luke's click maps (12 Oct, contract
v0.7.0-draft, branch `archi`), his feature inventory, and the Canopy scenario spine v0.3. Every
"exists" claim below points at a click-map row; every gap is a story in the `UX_REQUESTS.md` shape.*

**Path confirmed by Leila, 14 Oct.** One working day, three beats, walked screen by screen through what is built.
Across the top: the beats and their steps (the backbone). Under each step: what already works, and
what has to be built for the step to play. Each build item is a story, tagged **Copy & style · Front-end · Screen redesign · API & data** by what
it changes, so it can be sized, and marked **demo-critical** or **nice** so it can be cut.

**What it is not.** The backlog for the other seventy-odd features. Nothing off the path is listed.

**Cast — decided 14 Oct: the build's names.** Dana (principal and advisor), Marcus (advisor), Grace Okafor (client), the
Okafor household, Whitfield Wealth Partners. The spine's cast maps onto it as: Alex → Dana in the Advisor view · Jordan → Dana in the Firm view · Eleanor's review →
the Okafors' annual review · John Adams → a seeded referral prospect (story 2.1). Scripts use the build's names from here on.

~~**Cast.** The build's: Dana (principal and advisor), Marcus (advisor), Grace Okafor (client), the
Okafor household, Whitfield Wealth Partners. The spine's cast (Alex, Jordan, Eleanor, John Adams) maps
onto it as: Alex → Dana in the Advisor view · Jordan → Dana in the Firm view · Eleanor's review →
the Okafors' annual review · John Adams → a seeded referral prospect (story 2.1). **Decision needed:**
whether the demo script adopts the build's names or the build adopts the spine's. One cast, before
anyone writes a script.~~

---

## Summary

| | Steps | Already play | Need a story | Demo-critical stories |
| --- | --- | --- | --- | --- |
| Beat 1 · Dana's morning, client work | 8 | 4 | 6 | 3 |
| Beat 2 · Dana's new business | 7 | 3 | 7 | 5 |
| Beat 3 · The firm, and the client | 6 | 2 | 6 | 2 |
| Cross-cutting | — | — | 5 | 3 |
| **Total stories** | | | **24** | **13** |

**The shape of the work:** 13 demo-critical stories, of which **4 are API & data**, **5 Screen redesign**, **3 Front-end**, **1 Copy & style**, plus two decisions that cost nothing to build and
block everything if left open (the cast; what the "rebalance" beat ends on).

**The three that decide the timeline:** 1.2/1.3 the household page (Screen redesign) · 2.1 referrals as data
(API & data: referrer on a prospect, messages addressable to prospects) · 1.6 next steps after a
meeting (API & data: the one model capability on the path that is still a stub).

---

## Beat 1 · Dana's morning — client work (Episodes 1 and 2)

*7:05 AM. Today → the Okafors' 9:30 annual review → approve the Roth draft → rehearse → meet →
outcomes land as follow-ups → the model comparison.*

| Step | In the build today (click map) | To make it play | Story | Touches | Demo |
| --- | --- | --- | --- | --- | --- |
| **1.1** Dana opens Today. Clients leads; the reason line says why | ✔ `Today's top priority`, the reason line, role sections, `Show the next 2` — all built (adv §1) | Delacroix appears three times with three verbs | **S-01 One fact, one item** (= UX-015) | Front-end | critical |
| **1.2** She opens the 9:30 meeting to prepare | ✔ `Show the prep brief` with its receipt; `Practice with SimGPT`; meeting record (adv §1, §3) | The brief is two sentences in a modal with no household around it. Prep means collecting from four places | **S-02 The household page** (= UX-014): header, Needs you, Next with the brief and the doors, the thread, accounts, Shared, Documents | Screen redesign | critical |
| | | The brief itself is a seeded field; the receipt claims the platform wrote it (inventory A11) | **S-03 Prep assembled, honestly**: either a `meeting_prep` capability or a receipt that says "from the calendar and your notes" rather than "prepared by the platform" | API & data *(or Copy & style if the receipt is reworded)* | nice |
| **1.3** From the household she opens the Roth draft | ✔ From Today, `Open the message` lands inside the frame (adv §1) | No door from a household to its draft | **S-04 Every item on the household page opens the job** — the draft, the follow-up, the signal's lots | Front-end | critical *(part of S-02)* |
| **1.4** She reads, edits, approves. It's flagged for compliance | ✔ The frame, save-on-blur, `Approve` ("queued, not sent"), `Rewrite it for me`, the send sheet, "Attached: Nothing" (adv §2) | Who clears the compliance flag, and where? Firm › Compliance is a list; the click map shows no clear/approve control | **S-05 Clearing a compliance flag** — a principal action in Firm › Compliance that unblocks the send, logged | API & data *(verify first: it may exist in the contract and not the screen)* | critical — the beat can't end in "sent" without it |
| **1.5** She rehearses the hard part | ✔ SimGPT beside the page, labelled every turn (adv §11) | Button says the product name | **S-06 Product names out of the frame** (= UX-018): "Rehearse this conversation" | Copy & style | nice |
| **1.6** After the meeting, outcomes wait as proposed tasks | ✔ `Suggest next steps` → drafts → `Add as follow-up` with the `From meeting` tag (adv §3) | `Suggest next steps` returns a seeded list (`mock-suggestion-v0`, inventory A27). And the Okafor meeting has no record, so there's nothing to read | **S-07 Next steps from the record**: `meeting_next_steps` capability + a seeded Okafor record with consent on file | API & data | critical — this is the "Canopy heard the meeting" moment |
| **1.7** She adds two as follow-ups; they show on the household and in Inbox | ✔ Follow-ups tab, origin tag, dims on complete (adv §2) | — | — | — | plays |
| **1.8** The rebalance Eleanor/the Okafors agreed to | ✔ `Compare models` on the household: current vs proposed, points and money, "a comparison, never an instruction" (adv §5). Tethys `Assign the model`: "Assigned. Nothing was traded" | The spine ends with "Tethys hands it to Greens; Greens executes." The build deliberately stops before a trade (PM-05, regulatory list) | **D-02, decided 14 Oct:** the beat ends on *compare and assign*; "Assigned. Nothing was traded." is the closing line. The trade action (PM-05) is for a later demo, after regulatory review | — | decided |

---

## Beat 2 · Dana's new business — a referral to a client (Episode 4)

*Midday. A referral arrives → the prospect's record shows who vouched → Dana drafts the reply,
keeps the conversation → books the meeting → converts. The research beat.*

| Step | In the build today (click map) | To make it play | Story | Touches | Demo |
| --- | --- | --- | --- | --- | --- |
| **2.1** A referral comes in: a message from a prospect, sent by a client | Prospects exist with `came from: a referral`; messages carry only `householdId` (adv §2, §4) | No referrer on the record; no message can be addressed to or from a prospect (Leila's 27 Aug decision: prospects are addressable) | **S-08 Referrals as data** (= UX-022 + the addressing half): `referredBy` (person, relationship to the firm, what they said) on a prospect; `prospectId` on communications; seed one referral prospect with an inbound message | API & data | critical — nothing in this beat plays without it |
| **2.2** The Prospecting card on Today leads with it | ✔ Role card, ranking in `roles.js` (adv §1) | Today's Prospecting card leads with the stalled proposal; warm items have no ranking weight | **S-09 Prospecting leads warm** (= UX-023 part 1): referral in and reply received outrank stalled and cold; CS-09 gains the two additions | Front-end | critical |
| **2.3** She opens the prospect: who referred them, what they said, what's known | ✔ Prospect record: stage, assets, came from, first seen, intake notes, `Which advisor fits?` (adv §4) | Shows a source word, not a person. No evidence of seriousness, only a stage | **S-10 The prospect record shows the vouch and the evidence** (= UX-023 part 2, CS-10 as proposed): referrer block; ledger — agreed to meet · replied within · referred by · outside accounts · time spent | Screen redesign | critical |
| **2.4** She drafts the reply in her voice; the platform offers, she edits | ✔ Message frame, `Rewrite it for me` + tone, provenance, "Nothing has changed until you use it" (adv §2) | No `Draft a message` door on a prospect; the frame only knows households | **S-11 Draft to a prospect** — the door on the prospect record, and the Inbox frame accepting a prospect recipient | Front-end *(after S-08)* | critical |
| **2.5** She sends | ✔ The send sheet: To, From, Subject, Attached, "cannot be recalled", focus on `Not yet` (adv §2) | — | — | — | plays |
| **2.6** She books the first meeting | ✔ Calendar `+` → new meeting, "which client (or none, for a prospect)" (adv §3) | — | — | — | plays |
| **2.7** After the meeting: move the stage; convert; thank the referrer | ✔ `Move to {next stage}`; Onboarding › `Convert to client` once ready (adv §4, §5) | Convert lives in Onboarding, not on the prospect; "Onboarding" stage and an onboarding record are two things. No referral thank-you exists | **S-12 Convert from the record** — `Move to onboarding` creates the onboarding record and says so (Front-end). **S-13 The thank-you** — on first deposit, a drafted note to the referrer (API & data, needs S-08) | Front-end / API & data | S-12 nice · S-13 nice (end the beat at "meeting booked" if time is short) |

*Held back on purpose:* the 0.38 "approaching retirement" hunch kept visibly in the file and barred
from drafts. It's UX-012's class and the right restraint example, but it needs the life-event
decision first. Mention it in the script as what the platform *didn't* say; don't build it for the demo.

---

## Beat 3 · The firm, and the client (Episode 7, lightly; the portal)

*End of day. Dana in the Firm view: the book by advisor, one supervision look, two X-ray reads.
Then Grace opens the portal and sees what Dana shared, and what's next.*

| Step | In the build today (click map) | To make it play | Story | Touches | Demo |
| --- | --- | --- | --- | --- | --- |
| **3.1** Dana switches to Firm. "How is the firm going" | ✔ The strip; Needs you (top 8 of N, read-only by design); Also open; households table (firm §1) | Item-organised where a principal thinks by advisor; Dana's own book repeated (she answered those this morning); raw source names (`platform`, `greenmeadows`) | **S-14 Firm overview by advisor** (= UX-019): group Needs you by advisor; tag or exclude the principal's own; `sourceLine()` applied | Front-end | critical |
| **3.2** She looks at Marcus's book | ✔ Scorecard with rank (principal only), `Open Marcus's book`, the notice, Needs Marcus, Waiting on Marcus, "Marcus is told" (firm §2) | — | — | — | plays — one of the best moments in the build; put it in the script as is |
| **3.3** The X-ray: four reads, one sentence and one picture each | Ingredients exist scattered: Billing & fees per household, Reports with `lowerIsBetter`, compliance counts (firm §5, §6) | The reads don't exist as sentences. Two have data (concentration of revenue; fee schedules vs. cost proxy); two don't (book vs. brand needs a brand statement; time returned needs time data) | **S-15 Two reads on Firm › Overview**: revenue concentration and fee-structure, each a sentence + one bar, Computed bucket, no model | Screen redesign | nice — strong if it fits; cut cleanly if not |
| **3.4** She clears the compliance flag on the Roth draft (closes 1.4) | Firm › Compliance leads with overdue (firm §4) | See S-05 | S-05 | API & data | critical |
| **3.5** Grace opens the portal: what's new, what's next | ✔ Strip, Your accounts, From your advisor (shares, and now articles), Documents, Fees, Preferences; nothing leaks (client §1–6, "What the portal does not have") | No upcoming meeting shown; a shared article has no new/unread state or cover; three identical fee rows read as three charges | **S-16 Next, new, done** (= UX-020): `/me/meetings` (API & data) for the next meeting; new-state and cover on shares (Copy & style); fees as one schedule (Copy & style) | API & data + Copy & style | the meeting is nice; the Copy & style half is critical — it's the last thing the audience sees |
| **3.6** Grace requests a meeting in her own words; it lands in Dana's follow-ups | ✔ Required topic, optional time and note; a task on the advisor due tomorrow (client §4) | The mock discards the proposed time and the note; the advisor never sees the time the client offered (logged by Luke) | **S-17 Keep what the client typed** — store and show `preferredTimes` and `note` on the task | Front-end *(mock)* | critical — it's the one thing a client does, and it must arrive whole |

---

## Cross-cutting

| Story | What | Touches | Demo |
| --- | --- | --- | --- |
| **S-18 Quantity leads** (= UX-016) | Every item leads with its figure in a kind-of-signal glyph; the sentence supports; source lines gain a kind-of-source mark | Copy & style | critical — it's the visible difference between the demo and the September build |
| **S-19 Today layout** (= UX-017) | Role cards two across; meeting timeline carries prep state in the dot; signals as four tiles | Screen redesign | nice |
| **S-20 Product names out of the frame** (= UX-018) | Tethys → Models under Operations and a Firm section; SimGPT and aRCHi become verbs | Copy & style | nice |
| **D-01 One cast** | Spine names or build names, before the script is written | decision | critical |
| **D-03 Merge `archi` to `main`** — agreed 14 Oct, Leila to ask Luke | Click maps, inventory, SimGPT, aRCHi and Tethys are on `archi`; `main` stopped on 30 Sept. The dev lead should read one branch | housekeeping | asked |

---

## Reading this with the dev team

- **The backbone across the top is the demo script.** Steps 1.1 → 3.6, in order, are what the
  audience sees. A step marked *plays* needs no work; a step with a story needs that story first.
- **A story here is a Jira story in all but the template.** Ask → *as Dana, I can…*; Done looks
  like → acceptance criteria; the change tag → the first sizing. The click-map row is the pointer to the
  controls that already exist, so nobody re-specifies them.
- **Epics are the beats.** Three epics, 24 stories, 13 of them critical.
- **What's deliberately not here:** estimates (theirs), acceptance criteria in their format
  (theirs, from Done looks like), and stories for anything off the path (the point).
- **Where AI is on this path:** two places. S-07 (next steps from the meeting record) is the one
  model capability still a stub. Everything else the demo shows as "the platform's voice" is
  computed or seeded — the `Rewrite it for me`, agenda, summary, SimGPT and aRCHi note capabilities
  already run live or offline. Ask is **not** on the path; keep it off until the connectors exist
  (inventory, "Ask is the whole cost").

---

## Vocabulary note

Earlier entries and Luke's build notes in `docs/design.md` use the original words: Paint = Copy &
style · Furniture = Front-end · Room = Screen redesign · Plumbing = API & data. Same four sizes,
renamed 14 Oct so the dev team reads them without a key.

## Cross-reference to `UX_REQUESTS.md`

| Story | Request |
| --- | --- |
| S-01 | UX-015 |
| S-02, S-04 | UX-014 |
| S-06, S-20 | UX-018 |
| S-08 | UX-022 (+ prospect addressing, new) |
| S-09, S-10 | UX-023 |
| S-14 | UX-019 |
| S-16 | UX-020 |
| S-18 | UX-016 |
| S-19 | UX-017 |
| S-03 | UX-025 |
| S-05 | UX-026 |
| S-07 | UX-027 |
| S-11 | UX-028 |
| S-12 | UX-029 |
| S-13 | UX-030 |
| S-15 | UX-031 |
| S-17 | UX-032 |
