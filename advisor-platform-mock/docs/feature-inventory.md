# Every feature, across the three views

Counted 12 October 2026 from the front end as built, at contract v0.7.0-draft.
Companion: `docs/click-map-firm.md` — every control a principal can press.
Shareable version: https://claude.ai/code/artifact/02bdfcee-1553-4492-880c-0ea69c4c65a5

**Written by hand, and it has to be.** `docs/feature-api-map.md` is generated from the
requirement tags in `openapi.yaml` and answers "which operation serves which requirement".
This answers a different question — **what can a person actually do on a screen** — and no
tag in the contract knows that. Where the two disagree, neither is wrong; they are counting
different things. See [The two counts](#the-two-counts) at the end.

| | Count |
| --- | --- |
| Shared frame — chrome every view inherits | **5** |
| Firm — Dana Whitfield, principal | **19** |
| Advisor — Marcus Bell, and Dana for her own book | **69** |
| Client — Grace Okafor | **7** |
| **Total** | **100** |

A ◆ marks a feature that is the platform's own voice — something drafted, ranked, matched or
answered. There are 17, and every one of them carries the same furniture: a label saying what
it is before you read it, the sources it read from, the model and prompt version, and a
statement of what has not happened yet.

**◆ is not the same as "needs AI".** Most of the seventeen are deterministic logic wearing the
platform's voice. Which is which is [the next section](#what-needs-a-model-and-what-does-not),
and it is the sharper question for anyone costing the build.

---

## What needs a model, and what does not

Three buckets, each feature in the one that describes its **dominant** nature. The split matters
because it is also a cost, latency and explainability split: a model call is slow, priced per
token and cannot be unit-tested for an exact answer; everything in the other two buckets is
none of those things.

| | Count | What it means |
| --- | --- | --- |
| Needs a language model | **8** | Produces or interprets prose. Cannot be done with a query |
| Computed | **28** | Deterministic logic over the database — arithmetic, thresholds, ranking, set operations. No model, and it should stay that way |
| Plain database | **64** | Reads, writes, lists, forms, state changes. No intelligence of any kind |

### Needs a language model — 8

Five are wired through `src/model/` today and work against a live model or the offline
generator. **Three are not**, and are the honest gap in the build.

| | Feature | Capability | State today |
| --- | --- | --- | --- |
| A20 | Rewrite it for me | `email_draft` | **Live** |
| A28 | Summarise the record | `meeting_summary` | **Live** |
| A29 | Draft an agenda | `meeting_agenda` | **Live** |
| A68 | SimGPT rehearsal | `meeting_rehearsal` | **Live** — two blocks in one completion, split in `service.js` |
| A69 | aRCHi covering note | `article_note` | **Live** — the note only; choosing and sending are the advisor's |
| A11 | Prep brief | — | **Seeded.** `brief`, `preparedAt` and `briefSources` are stored fields. The receipt already claims the platform wrote it, so this is the one place the UI is ahead of the capability layer (MEET-01, MEET-02) |
| A27 | Suggest next steps | — | **Stub.** Returns `model: 'mock-suggestion-v0'` from a seeded list, falling back to one generic task. Needs `meeting_next_steps` (MEET-07) |
| A65 | Ask | — | **Stub.** `runQuery()` is a matcher returning `model: 'mock-matcher-v0'`. Needs a capability *and* retrieval, and it is the single largest piece of unbuilt product — see `docs/query-surface.md` |

Everything in this bucket already has, or needs, the same furniture: a prompt with a version, a
language rule inside the system prompt rather than appended to the user turn, `readFrom`
provenance, a refusal path, and `accepted: false` — a draft becomes real only when an advisor
accepts it (X-03).

### Computed — 28

Deterministic logic. These look intelligent and are often mistaken for AI work, but a model
would make every one of them worse: slower, more expensive, and — the point — unable to cite
the arithmetic that produced them.

| Kind | Features |
| --- | --- |
| **Ranking and prioritisation** | F2 Needs you · F3 Also open (set de-duplication by citation id) · A1 role sections · A2 which role leads · A3 the next one or two · A9 lead ordering · A33 · A39 · A52 · A56 role priorities |
| **Portfolio arithmetic** | A12 portfolio signals · A42 allocation against the model · A46 compare models · A61 drift after assigning · F8 library usage · F9 model drift stats · A59 your shelf |
| **Aggregation over a period** | F6 scorecard and rank · F13 firm report · A53 practice report · A58 your scorecard |
| **Money** | F17 client fees · A54 billing for your book · C5 what a client was charged |
| **Matching** | A21 suggested reading (subject line + the household's open signals) · A37 which advisor fits (scored, with its reasons) |
| **Validation and scheduling** | A51 import validation, row by row · A57 playbook step offsets |

Two of these are worth defending explicitly, because they are the ones most likely to be
"upgraded" to a model later:

- **The ranking (F2, A1, A2)** is rules in `roles.js` with every threshold in one place —
  14 days on a proposal, 3 on an unanswered lead, 45 on a quiet prospect, 60 on a quiet client.
  That is why a card can say *why* it is there and cite the record it came from. A ranked list
  nobody can explain is not usable on a screen an advisor has to act from.
- **The signals (A12)** are computed from holdings. They are financial assertions that end up in
  front of a client via A69, so they have to be reproducible and auditable. This is the clearest
  "must never become a model call" in the product.

### Plain database — 64

Everything else: the shared frame (S1–S5), every list and table, every record drawer, every form,
every state change, the calendar, the kanban, team shares, systems, onboarding, the activity log,
the client portal bar one computed figure. No intelligence, no model, no special infrastructure —
a conventional backend serves all of it.

The two highest-stakes features in the product are in this bucket, and that is deliberate:
**A47 share with the client** and **A69's send half** are plain writes behind an explicit human
approval. The one door to the client portal has no model anywhere near it.

### What this means for the build

- **A real backend serves 92 of 100 features.** Model infrastructure is needed for 8.
- **Of those 8, five already work.** The remaining three — Ask, next steps, prep briefs — are
  one new capability each in `src/model/prompts.js` plus, for Ask alone, a retrieval layer.
- **Ask is the whole cost.** The other two are prompts against data the platform already holds.
  Ask needs IP-01 to IP-07 to have something to read, which means the connectors in A63 first.
- **Nothing in the Computed bucket should move.** If a feature there starts calling a model, the
  citation that makes it trustworthy stops being checkable.

---

## Shared frame

Five things belong to the person at the screen rather than to the view they are in, so they
appear identically on all three.

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| S1 | Language | Switches the interface, and the dates, numbers and amounts with it. Drafts the platform writes come back in the same language. Re-renders in place rather than reloading, so an unsent draft survives | `PATCH /settings` |
| S2 | Appearance | Light, dark or follow the system. Kept on the browser rather than the account, scoped per persona | `state.js` |
| S3 | Toast with Undo | Every change that can be stepped back says so where it happened and offers the step back in the same breath | `ui.js` · TR-07 |
| S4 | Firm branding, applied everywhere | Firm name, advisor display name, mark letter and accent colour, set once by a principal and inherited by every advisor screen and the client portal | `GET /firm/branding` |
| S5 | Navigation that moves on a phone | Below 620px the section nav relocates above the page title. Collapses to a toggle that names the section you are in | `ui.js` · one listener, two mount points |

**Two affordances are deliberately not shared.** **Ask** appears for a principal and an advisor,
never for a client. **Activity** appears for an advisor only — it is a record of an advisor's own
work, and a principal reading someone's book gets no access to it. Both are hidden in the shell
by view rather than per screen, so a new view cannot forget them.

---

## Firm — 19

The Operations role seen across the whole practice, plus the three places that are the firm
itself and have no advisor equivalent: ownership, branding and the platform's own bill. It does
not repeat Dana's four role cards — she has those in the Advisor view for her own book, and
showing them here would answer "how is my book going" twice and "how is the firm going" never.

### Standing figures

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| F1 | The firm strip | Assets with month-to-date change and a twelve-month sparkline, advisor count, household count, open compliance items with how many are overdue | `GET /firm/summary` |

### Overview

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| F2 ◆ | Needs you | The platform's ranked next actions across every advisor, each with the reason it was raised, the household, the sources cited and a severity mark. Says "top 8 of 23" rather than silently truncating | `GET /next-actions` scope=firm |
| F3 | Also open | Firm alerts *not* already named in the ranked list beside them, de-duplicated by citation id rather than by matching titles | `GET /alerts` scope=firm |
| F4 | Households across the firm | Every household in the practice, sorted and paged by the API. Opens the record read-only — no share control at firm scope, because sharing is the advisor's act | `GET /households` scope=firm |

### Advisors

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| F5 | The roster | Every advisor as a sortable table: households, assets, 30-day change, meetings this week, overdue follow-ups, open alerts | `GET /firm/advisors` |
| F6 | One advisor's scorecard, with a rank | Each metric against the firm median **and** a placing. The rank is principal-only — an advisor reading their own scorecard sees the median and no placing | `GET /firm/advisors/{id}/scorecard` · AX-08 |
| F7 | Open an advisor's book | Supervision, not impersonation. A deliberate second press opens three read-only panels — their households, what needs them, their unapproved drafts — behind a notice saying what this is, what it is not, and that the advisor is told. No calendar, prospects or activity, and nothing acts in their name | `advisorId` on firm-scope reads · PO-06 |

### Tethys — the model library

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| F8 | Every model in the practice | Ordered by assets rather than alphabetically: risk, households, advisors using it, assets, average drift, and a badge for how many households are out of tolerance | `GET /models` scope=firm · PM-02 |
| F9 | Model detail | How it is run — drift method, threshold, maximum, rebalance frequency, cooldown — then holdings with a running total, every household on it with drift and state, and a by-advisor breakdown. The drift unit travels with the number, because 6 points and 6% are different facts | `GET /models/{id}` · PM-03 |
| F10 | Publish a model to every advisor | Running total shown against 100 at all times; save disabled until it balances; the server's refusal shown verbatim in place | `POST /models` |

### Compliance

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| F11 | Obligations | The firm's own obligations, overdue first, filterable by status, each with category, advisor and due date | `GET /firm/compliance` · PO-08 |
| F12 | Waiting for review | Every draft across the firm flagged for compliance. Approving stays with the advisor who wrote it — this is a view of what is waiting, not a second approval button | `GET /communications` scope=firm · COMM-03, X-03 |

### Reports

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| F13 | The practice report at firm scale | 30 or 90 days against the same length before it, with breakdowns by meeting type, message status and compliance status. Same renderer as an advisor's own report, so a firm number and a book number cannot disagree on form | `GET /reports/practice` scope=firm · PO-07 |

### Billing & fees

Two unrelated concerns held in one section deliberately: what the firm pays for the platform,
and what the firm charges its clients.

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| F14 | Platform subscription | Plan, seats used of purchased, renewal, masked payment method, current invoice, usage meters that go hot past 90%. The AI drafting status sits here too — live and on which model, or offline and therefore consuming no allowance | `GET /firm/billing/subscription` + `GET /ai/status` · PO-10 |
| F15 | Invoices | Every invoice with number, issue date, amount and status, and a line-item breakdown in a dialog | `GET /firm/billing/invoices/{id}` |
| F16 | Fee schedule | Asset tiers with an annual rate each, editable by a principal only. Tiers must meet exactly so no household is left without a rate, and the screen says so before you try. Last-changed receipt, and every household override with its reason | `PATCH /billing/fee-plan` |
| F17 | Client fees this quarter | Every household's billable assets, rate and quarterly fee with a total and the next run date | `GET /billing/fees` |

### Ownership and branding

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| F18 | Cap table | Holder and role, share class, shares, vested, ownership percentage, vesting end. The firm's own ownership, not a client's — principal only, and the API enforces it rather than the screen | `GET /firm/cap-table` · PO-12 |
| F19 | Branding | Firm name, advisor name and credential, mark letter, accent colour — applied live to every view including the client portal, with a record of who changed it last | `PATCH /firm/branding` · GP-07, GP-10 |

---

## Advisor — 69

The largest of the three by a long way. Ten entries on the spine — Today, Inbox and Calendar at
the top because every role uses them daily; then the four roles an advisor plays, in an order
that never changes; then the standing references. Everything here is internal, and none of it
may reach a client except through one door (A47, A69).

### Today — 13

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| A1 ◆ | Four role sections | Prospecting, Clients, Operations, Development, each showing one suggested item: what it means in a sentence, one action, and the sources with a timestamp. A role with nothing says so and never invents a task | `roles.js` · FO-01 to FO-05 |
| A2 ◆ | Which role leads today, and why | One role carries a "Leading today" chip and one line says what made it lead. The reason is about the work, never about the advisor | `rankRoles()` · ST-03, CS-02 |
| A3 | Show the next one or two | Each role keeps two more items behind a disclosure, with their own meaning, source and action | `disclosure()` |
| A4 | Not now, and you pick when | Later today, tomorrow morning or next week, chosen in place of the row's own actions. An item standing on a real alert is set aside through the API so it survives a change of browser; anything else lives in view state. Undo on both | `PATCH /alerts/{id}` status=snoozed · CS-05 |
| A5 | Not this | Puts a suggestion away until something changes, with Undo. Honest about its limit: the reason is not captured, so it teaches the platform nothing yet | `PATCH /alerts/{id}` status=dismissed · CS-04 |
| A6 | Add as a follow-up | Turns a suggested task into a real one at one press. The exception is "prepare for a meeting", where the button rehearses instead — a follow-up saying "prepare for it" adds nothing | `POST /tasks` · PL-02 |
| A7 | Rearranging the six cards | Drag by the grip, or nudge with the arrow keys so the same move works without a mouse and on a touch screen. Cards move in the DOM rather than re-rendering, so open disclosures and fetched data survive | `cards.js` — pure list arithmetic |
| A8 | Tack a card to a slot | A pin holds one slot while everything else flows around it, and follows the card through later reorders. A pin past the end, or onto a taken slot, shifts rather than silently failing | `arrange()` · ST-07 |
| A9 | Three orders, two buttons | What the platform worked out; the same with today's top priority forced to the front (overriding a pin on purpose); or the arrangement you dragged into place, kept whole. Reads as a state you can leave | auto · lead · mine · ST-08 |
| A10 | Today's meetings | The day as a timeline, with "Next up" on the first one still ahead and prep ready or needs prep on each | `GET /meetings` · MEET-01 |
| A11 ◆ | The prep brief, and its receipt | Opens in place, with a line saying the platform prepared it, at what time, from which sources. A meeting that is over offers its notes instead | `GET /meetings/{id}` · TR-04, MEET-02 |
| A12 ◆ | Portfolio signals | Losses worth harvesting, over the concentration limit, drifted from target, holding more cash than target — each leading with what it means across how many households. A disclosure names them | `GET /portfolio-signals` · RTI-04, RTI-05 |
| A13 | Send an article from a signal | Opens aRCHi carrying the signal's topic and a version of its sentence with the arithmetic removed, so a covering note can never tell one household about the other four | → A69 · GP-06, TM-07 |

### Inbox — 10

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| A14 | Drafts to approve | Messages with household, channel, age, status badge, compliance flag, who approved, and a CRM sync badge with a plain notice when sync is behind | `GET /communications` · COMM-03 |
| A15 | The message frame | No form with a preview beside it: the fields you type into *are* the message, styled as it will arrive, in a dashed frame that stays dashed until it leaves — an approved message has not been sent either | TR-02 |
| A16 | Autosave on blur, with Undo | Saved when you look away rather than when you hunt for a Save button. Recorded, logged and takeable back, which is what makes saving quietly safe | `PATCH /communications/{id}` · TR-07 |
| A17 | The provenance receipt | One line saying which of three things it is: drafted by the platform in a named tone, drafted and then edited by a named person, or written by an advisor | TR-04 |
| A18 | Approve, and return to draft | Approval queues a message; it does not send it, and the confirmation says so. Approved messages can be pushed back | X-03 |
| A19 | The send sheet | A sheet above the page naming who it goes to, who from, the subject, what is attached (nothing), any compliance flag, and that it cannot be recalled. "Not yet" holds the focus; Escape means not yet | `confirmSend()` · TR-01 |
| A20 ◆ | Rewrite it for me | Three tones. The rewrite arrives with what it read from, the model and prompt version, and goes into the frame through the same save an advisor's own typing uses — so it is undoable and logged. A subject line the model volunteers is moved to the subject field rather than said twice | `POST /communications/{id}/redraft` · COMM-01, COMM-02 |
| A21 ◆ | Suggested reading | Library articles matched to the subject line and the household's open signals, each carrying the reason, version and reading time, and a warning when it is published only in a language the interface is not in. Unsendable ones are still listed, with why: approval expired, with compliance, withdrawn, never reviewed | `GET /communications/{id}/suggested-articles` · GP-06, TM-02 |
| A22 | Send one, then mention it | There is no attach: a message and an article reach a client by two routes under two approvals. Afterwards the row says what version went to whom and offers to add a sentence saying so — as an edit the advisor makes. The send sheet still truthfully says "Attached: Nothing" | → A69 · X-03 |
| A23 | Follow-ups | The task list, merged into the Inbox because a follow-up is also something waiting on someone. Open count, due labels that go hot when overdue, a "from meeting" tag, sync badges, tick to complete | `GET /tasks` · PO-02 |

### Calendar — 9

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| A24 | The month grid | Weeks starting Monday with day names from the reader's locale, every meeting on its day, today marked | `GET /meetings` from/to · MEET-03 |
| A25 | Add a meeting | What it is, which client or none, time, duration | `POST /meetings` |
| A26 | The meeting record | Prep brief, then notes or transcript — with recording consent stated plainly as on file and how, or **not on file**, and the server's withheld reason shown as an error rather than quietly empty | `GET /meetings/{id}/record` · MEET-04, MEET-05 |
| A27 ◆ | Suggest next steps | Reads the record and proposes follow-ups with due dates. Drafts only — nothing is created until you add one, each with its meeting recorded as its origin | `POST /meetings/{id}/record/next-steps` · MEET-07 |
| A28 ◆ | Summarise the record | Shown beside what it was made from, never in place of it, labelled with what produced it — including the offline generator | `POST /meetings/{id}/record/summary` · MEET-06 |
| A29 ◆ | Draft an agenda | For a meeting still ahead only. Copy rather than Use, because there is no frame for it to land in | `POST /meetings/{id}/agenda` · MEET-02 |
| A30 | Practice with SimGPT | Offered on every list of meetings still ahead, from one pair of helpers, so a fourth list cannot be the one that forgets | → A68 · AX-07 |
| A31 | Move a meeting | A new date and time, on meetings that have not happened | `PATCH /meetings/{id}` |
| A32 | Cancel a meeting | Removes it and refreshes the standing figures with it | `DELETE /meetings/{id}` |

### Prospecting — 6

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| A33 ◆ | Prospecting priorities | A proposal out 14+ days, a lead with no reply for 3, a prospect quiet for 45. Growth work always has its own place, and the order never changes | `collectRoleWork()` · CS-01, CS-09 |
| A34 | The pipeline | A kanban across six stages with a count per column and, on each card, estimated assets, where the lead came from and whether a meeting is booked. Keyboard operable | `GET /prospects` · GP-02 |
| A35 | The prospect record | Stage, estimated assets, origin, how long since first seen, intake notes | `GET /prospects/{id}` · AX-01 |
| A36 | Move to the next stage | One press, named for the stage it moves them to | `PATCH /prospects/{id}` |
| A37 ◆ | Which advisor fits? | A ranked suggestion with reasons, the current advisor marked, and the platform's own note on what the ranking does not know | `GET /prospects/{id}/matches` · GP-01 |
| A38 | Referrals | Prospects who came by referral and the pipeline value they represent. Honest about its limit: there is no record of *who* made the referral, so the thank-you half of CS-09 cannot be built yet | `GET /prospects` source=referral |

### Clients — 13

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| A39 ◆ | Client priorities | Contact gaps, prep, tax and onboarding items from the platform's ranking, plus every household not contacted in 60 days and every household-level alert | `GET /next-actions` + `GET /alerts` |
| A40 | Book of business | Your households, sorted and paged by the API | `GET /households` · PO-11 |
| A41 | The household record | Assets, 30-day change, last contact, and every account with masked number, type, balance, today's gain or loss and opening status | `GET /households/{id}` · PM-01 |
| A42 | Allocation against the model | Target against current per asset class as paired bars, the largest drift named against the model's own threshold, unclassified holdings stated as a percentage. No model means "no target to compare against" rather than an invented one; unpriced holdings say that instead | `GET /households/{id}/allocation` · PM-02 |
| A43 | Ask about this household | Opens the query panel already scoped to the record you are looking at | → A65 · IP-08 |
| A44 | Share with a colleague | Read access to one household with an optional reason. You stay the owner, it is recorded, either of you can end it. Says plainly when the advisor list is not available to you, rather than offering a control that fails | `POST /team-shares` · PO-04 |
| A45 | Change this household's fee | States what the schedule charges at these assets, then takes an override with a **required** reason, because the change alters what a client is billed | `PATCH /billing/fees/{householdId}` · AX-11 |
| A46 | Compare models | Current against proposed per asset class with the change in points and in money, and the turnover a move would cause. A comparison, never an instruction: no trade leaves this screen | `POST /households/{id}/model-comparison` · PM-03 |
| A47 | Share with the client | **The one door to the client portal.** Six types in the picker — plan, tax explanation, report, proposal, message, document — a title written for the client, an optional message, and an approval recording who approved it and when. States what is never shared: briefs, alerts, notes and tasks. The seventh type, `article`, is deliberately absent here: it arrives only through aRCHi (A69), which is the only path that records a version and a language | `POST /households/{id}/shares` · X-12, X-13, X-14 |
| A48 | Shared with the team | Both directions in one panel: households shared with you and ones you shared out, each with the reason | `GET /team-shares` · PO-04 |
| A49 | Meetings, next 14 days | Not for moving things — the Calendar does that — but for knowing where you stand | `GET /meetings` from/to |
| A50 | Onboarding | Every new client in progress with steps done of total, each step tickable and readable on its own — including "nothing has been captured" rather than a blank. Convert stays disabled until the platform says ready | `GET /onboarding`, `POST /onboarding/{id}/convert` · AX-02 |
| A51 | Import a book | Name the source, paste one household per line. Rows that fail validation are reported individually with their problems and skipped; the rest are imported and flagged for review. Past imports listed with their counts | `POST /migrations` · AX-04 |

### Operations — 4

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| A52 ◆ | Operations priorities | What is waiting on your yes — approvals the platform raised, a count of drafts waiting — plus practice-level alerts belonging to no household | `collectRoleWork()` |
| A53 | Practice report | Your own 30 or 90 days against the period before, with breakdowns by meeting type, message status and compliance status | `GET /reports/practice` · PO-07 |
| A54 | Billing and fees for your book | Per household: assets, rate, annual fee, and whether the rate came from the schedule or an override. Points you to the household itself to change one, where the reason is recorded with it | `GET /billing/fees` · AX-10 |
| A55 | Compliance *(principal only)* | The obligations list, shown as a tab only for someone whose session can read it — absent rather than present and failing | `GET /firm/compliance` · gated on `roles.includes('principal')` |

### Development — 3

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| A56 | Development prompt | The one role that never shows a shortfall. Surfaces the metric that moved most this period, in your favour or against, and is marked optional so it never competes with client work | `roles.js` · CS-08 |
| A57 | Playbooks | Named sequences with each step's offset from the anchor day. Running one against a household creates **real** follow-ups, not drafts, because running it is itself the advisor's explicit act | `POST /playbooks/{id}/runs` · AX-09 |
| A58 | Your scorecard | Each metric against the firm median, and no placing against named colleagues — which a principal sees and you do not. States that nothing here is shared with the firm | `GET /firm/advisors/{self}/scorecard` · AX-08 |

### Standing references — 6

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| A59 | Tethys — your shelf | The firm's models and your own, badged so you know which, with households, assets, drift and out-of-tolerance counts over *your* book rather than the firm's | `GET /models` · PM-02 |
| A60 | Create a model | The same form a principal publishes with, minus the scope field — it follows from who is filling it in, so an advisor is never offered a control that fails on submit | `POST /models` visibility=own |
| A61 | Put a household on a model | Assign from your own households and nobody else's. The confirmation says what did *not* happen as well as what did — it places no trade and moves nothing — then names the largest gap that now exists | `PUT /households/{id}/model` · PM-03 |
| A62 | Book at a glance | The four-number strip given its own quiet place off Today, and it says outright that nothing here needs an answer | `GET /summary` · IP-09 |
| A63 | Systems | Custodian, CRM, email, calendar, documents: status, who set each up, last sync, and — the point of the screen — a plain statement of what the platform **cannot** see because of each one | `GET /systems` · PO-09 |
| A64 | Connect and disconnect | Available to whoever administers the firm; everyone else reads the same screen without the buttons, because knowing what the platform cannot see is not an administrator's privilege | `PATCH /systems/{id}` · `canEdit` |

### Beside the page — 5

Four panels that open next to the work, never over it (UX_IA §5, FO-06), and in the same place
on every screen (ST-01).

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| A65 ◆ | Ask | One query affordance, seeded by wherever it was opened from: a household, your book, or — for a principal — the whole firm. The answer never appears without what it was drawn from, every citation with its source and as-of time, and never without naming what it could *not* reach. Survives moving between screens | `POST /queries` · IP-01, IP-08, IP-11 |
| A66 | Earlier questions | Past queries kept in the panel, so an answer is a record rather than something that vanishes on close | `GET /queries` |
| A67 | Activity | One log, three actors distinguished by a mark: the platform, you, and *a principal reading your book* — which must not be dressed as your own doing, because the whole point of the entry is that somebody else looked. Entries that can still be stepped back say so and offer it | `GET /activity` · TR-03, TR-07, PO-06 |
| A68 ◆ | SimGPT — rehearsal | The platform plays the client for one turn and says one thing about how your turn landed. Three rules hold it: **it is not a record** — nothing is filed against the household; **it is marked** — every client turn is framed as simulated, every time, not once at the top where it scrolls away; **it names its source** — the scene is composed from the record and says so | `POST /meetings/{id}/rehearsal` · AX-05, AX-06, AX-07 |
| A69 ◆ | aRCHi — send an article | Choose from the topic's shelf with version, approval date and expiry; choose a language, but only one it was actually published in; tick who it goes to; add your note or draft one in a tone. Then one approval button that names how many households it is about to reach. The receipt is the record a regulator would ask for: which article, which version, in which language, to whom — with failures listed separately and their reasons given | `POST /households/{id}/shares` type=article, one call per household · GP-06, GP-07, GP-10, TM-02, TM-07 |

---

## Client — 7

One screen, six panels, plain language, factual account data only. Deliberately the smallest of
the three: its shape **is** the product's claim about the client-safe boundary.

| | Feature | What it does | Behind it |
| --- | --- | --- | --- |
| C1 | Your accounts | Total value with a twelve-month sparkline, the change over the last 30 days, your advisor's name — then every account with type, masked number, balance and today's gain or loss | `GET /me/household` |
| C2 | From your advisor | Everything an advisor has approved for you: what it is, who shared it, when, and their message. The only route anything advisor-side takes to reach this screen | `GET /me/shared` — the far side of A47 and A69 |
| C3 | Documents | Statements and documents with date and masked account, each downloadable | `GET /me/documents/{id}` · AX-03 |
| C4 | Request a meeting | What you would like to talk about, a time that suits you, anything else they should know. Lands on the advisor's side as a request rather than a booking | `POST /me/meeting-requests` · MEET-03 |
| C5 | Fees | What you were charged, for which period, against which masked account, and whether it is paid, billed or accrued — from the same schedule the firm sets | `GET /me/fees` · AX-10 |
| C6 | Preferences | Electronic documents only, and how you want to be told about updates — email, text message or this portal | `PATCH /me/preferences` · AX-12 |
| C7 | Language and appearance | The portal has no navigation, so this is the client's door to the same Settings panel an advisor reaches from the foot of theirs | → S1, S2 |

### What is absent, and why that is a feature

No Ask and no Activity. No briefs, alerts, signals, notes, tasks, next actions, prospects,
models, scorecards or compliance. Nothing about another household. Nothing internal at all.

The boundary is **structural rather than conditional**: the portal reads a separate `/me/*`
surface, the Ask and Activity buttons are hidden in the shell by view rather than per screen,
and the single way advisor-side content reaches this page is an approved share. That is why
adding articles needed a seventh `ShareType` enum value rather than a second door — see
`ARCHI-HANDOFF.md` §3.

---

## The two counts

`docs/feature-api-map.md` counts **75 requirements, 48 with at least one operation**. This file
counts **100 features**. Both are right; they are counting different things.

| | `feature-api-map.md` | This file |
| --- | --- | --- |
| Unit | A numbered requirement | A thing a person can do on a screen |
| Source | Generated from requirement tags in `openapi.yaml` | Read by hand from `dashboard/js/` |
| Drifts when | The contract changes | The front end changes |

The two diverge in both directions:

- **One requirement becomes several features.** MEET-03 scheduling is five (A24, A25, A31, A32,
  C4). AX-12 settings is three (S1, S2, C6).
- **Several requirements become one feature.** PL-02 next best action is absorbed entirely into
  the role cards (A1, A6) and has no section of its own. COMM-01 and COMM-02 are the same button.
- **Some features answer no requirement.** The card ordering (A7, A8, A9) comes from UX_RULES
  ST-07 and ST-08, not from the requirements list at all.
- **Some requirements have no feature.** IP-02 to IP-07 need systems nobody has connected; the
  Systems screen (A63) names those gaps rather than hiding them.

**Keep this file by hand when a screen gains or loses something.** It cannot be generated,
because no tag in the contract knows how many buttons a screen has.
