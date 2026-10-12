# Click map — the Advisor view

Every control an advisor can press, what it does, and what comes back.
Mapped 12 October 2026 from `dashboard/js/advisor.js`, `ui.js`, `sim.js`, `archi.js`,
`tethys.js`, `roles.js` and `cards.js` at contract v0.7.0-draft.
Shareable version: https://claude.ai/code/artifact/34facd00-9a93-44ee-9300-2b2add1e99e9

**Second of three.** `docs/click-map-firm.md` covers the principal, `docs/click-map-client.md`
the portal — and compares all three views side by side.

**Who sees this view.** Marcus (`advisor`), and Dana — who has both views and reaches this one
for her own book. One tab inside it, Operations → Compliance, appears only for a principal.

**No strip on this view.** Unlike the firm view, there are no standing figures above the
sections. The four numbers were deliberately moved off Today and given their own quiet place
(§9), so nothing competes with the day's work.

Legend: **→** navigates · **⊞** renders in place · **✎** writes · **◱** opens beside the page ·
**▣** opens a modal over the page · **—** not interactive.

---

## 0. The frame

| Section | Control | | What happens |
| --- | --- | --- | --- |
| Header | View tabs `Firm` \| `Advisor` | → | Dana only. Marcus has no tab strip — it is hidden below two views |
| Header | `Activity` | ◱ | Top right, on this view only. Opens the activity log (§11) |
| Header | Avatar | — | Initials from the session name |
| Spine | `Today` · `Inbox` · `Calendar` | ⊞ | Used every day by every role, so they sit at the top |
| Spine | **Your roles**: `Prospecting` `Clients` `Operations` `Development` | ⊞ | Each with its two-letter mark on the role's gradient — BD, CA, OP, PD. **Fixed order that never changes**, whatever Today does |
| Spine | `Tethys` · `Book at a glance` · `Systems` | ⊞ | Standing references. Tethys sits here rather than under a role: an advisor reaches for a model while doing client work, but the library itself is not client work |
| Spine | Hamburger toggle | ⊞ | Below 860px the spine collapses to a toggle naming the section you are in. Escape or an outside click closes it. Below 620px it relocates above the page title |
| Nav foot | `Settings` | ◱ | Language and appearance. You stay where you were |
| Bottom right | `Ask` | ◱ | Scoped to **your book** by default here, or to a household when opened from one (§11) |

**What persists, and where.** Role tab and Inbox tab selections, card order, pins, order mode,
open disclosures, snoozed items and "not this" dismissals all live in `viewstate.js` —
localStorage, **keyed by persona** so Dana's open briefs never appear as Marcus's. The current
section is a module variable, so it survives switching views and back but not a reload.

**Every panel has three states.** `load()` draws a skeleton, then the content, or an error with
a `Try again` button — except a 403, which says "You don't have access to this section." and
offers no retry, because retrying will not help.

---

## 1. Today

> `advToday()` — four role sections and two standing panels, one action each, one card leading.

### The order controls

| Control | | What happens |
| --- | --- | --- |
| `Today's top priority` | ⊞ | A pill that is both a statement and an action: it says what leads today and puts that card first. Pressing again lets the order fall back, so it reads as a state you can leave rather than a thing that happened to you. **Overrides a pin on purpose** — a pin that outranked it would make the button a no-op exactly when it mattered |
| `My pin order` | ⊞ | Restores the arrangement you dragged the cards into. Disabled until you have made one, with a tooltip saying so |
| The reason line | — | Shown only in `Today's top priority` mode: *"Clients first today: the day is client work, and 3 things need an answer."* About the work, never about the advisor |

### Each role section

| Control | | What happens |
| --- | --- | --- |
| The suggestion | — | Inside a violet well, label first: **Suggested**, then what it means in a sentence, then the actions, then the source line with a timestamp. The label leads because it qualifies everything under it |
| Primary action | varies | One of six, depending on the item — see the table below |
| `Not now` | ⊞ | Replaces the row's actions in place with three times: `Later today` · `Tomorrow morning` · `Next week` · `Keep it here`. An item on a real alert is set aside through the API; anything else in view state. Toast carries `Undo` for 9 seconds |
| `Not this` | ✎ | Puts it away until something changes. Toast carries `Undo`. Honest about its limit — the reason is not captured, so it teaches the platform nothing yet |
| `Show the next one` / `Show the next 2` | ⊞ | A disclosure holding two more items, each with its own meaning, source and action. **Stays open between visits** |
| `Open {role}` | ⊞ | Footer link to that role's home |
| Grip (⁙) | ⊞ | Drag to move the card. **Arrow keys do the same move** — a reorder that can only be dragged cannot be done by everyone, and HTML drag events do not fire on a touch screen at all |
| Tack | ✎ | Pins the card to this slot; everything else flows around it. Toast confirms. Pins follow their card through later reorders |
| An empty role | — | One sentence — *"Nothing pressing in prospecting today."* — and never an invented task |

### Where the primary action goes

| Item kind | Button | | Lands on |
| --- | --- | --- | --- |
| `household` | `Open the household` | ▣ | The household record, with its full advisor-side controls (§5) |
| `prospect` | `Open the prospect` / `Open the lead` / `Open the proposal` | ▣ | The prospect record (§4) |
| `communication` | `Open the message` | → | Inbox → Drafts to approve, **opened straight into that message's frame** rather than dropping you at a list to find it again |
| `inbox` | `Open the inbox` | → | Inbox |
| `rehearsal` | `Practice with SimGPT` | ◱ | The rehearsal panel. Closes aRCHi first — they share the strip beside the page |
| `role` | `Open your scorecard` | ⊞ | Development → Scorecard |
| `next-action` | `Add as a follow-up` | ✎ | Creates the task from the platform's suggestion, toasts, redraws Today |

### Today's meetings

| Control | | What happens |
| --- | --- | --- |
| The timeline | — | Time, client, type, a `Next up` badge on the first still ahead, and `Prep ready` or `Needs prep` on each |
| `Show the prep brief` | ⊞ | **Upcoming only.** Fetches on first open, then shows the brief and its receipt: *"Prepared by the platform at 09:14 from the calendar and the custodian."* A failure says to close and reopen to retry |
| `Practice with SimGPT` | ◱ | **Upcoming only** |
| `See meeting notes` | ▣ | **Past only**, and only when `hasRecord` — otherwise the button says `Open the meeting`. A button that had to fetch the record to find out whether it could be offered would lie half the time |

*A meeting that is over never offers a brief or a rehearsal.* A rehearsal after the fact is a
different thing, not a smaller version of itself, and offering it would say the platform had not
noticed what time it is.

### Portfolio signals

| Control | | What happens |
| --- | --- | --- |
| Each signal | — | Leads with meaning: *"5 households have losses worth harvesting. $61,200 unrealised."* Then the source and as-of date |
| `Show which households` | ⊞ | Fetches the households and their accounts with a per-household detail |
| A household name inside it | ▣ | Opens that household's record |
| `Send an article` | ◱ | Opens aRCHi (§11) carrying the signal's topic, the households, and **a version of the sentence with the arithmetic removed** — so a covering note can never tell one household about the other four |

---

## 2. Inbox

> Three tabs. Communications and follow-ups merge because both are "waiting on someone".
> The selected tab persists.

### Drafts to approve · Everything sent

| Control | | What happens |
| --- | --- | --- |
| `Show` | ⊞ | All / Awaiting approval / Approved / Sent. The `Drafts to approve` tab enters pre-filtered to drafts |
| Each row | — | Subject, `household · channel · age`, a compliance-review flag in hot red where one applies, who approved it, a status badge and a CRM sync badge |
| `Read and approve` / `Open` | ⊞ | Opens the message frame in place. Button text follows the status |

### The message frame

| Control | | What happens |
| --- | --- | --- |
| `← All messages` | ⊞ | Back one step, to the list you came from |
| The frame itself | — | To, From, Subject, Message — **the fields you type into are the message**, styled as it will arrive. There is no separate preview. A dashed violet border until it actually leaves; an approved message is still dashed, because it has not been sent either |
| Subject · Message | ✎ | **Saved on blur**, not by a Save button. Toast carries `Undo`. The receipt line beneath updates to *"Drafted by the platform, edited by Marcus Bell · 2 minutes ago"* |
| `Approve` | ✎ | Draft → approved. Toast: *"Approved. It is queued, not sent."* The frame redraws with Send and Back to draft |
| `Back to draft` | ✎ | Approved → draft |
| `Send` | ▣ | Opens the send sheet. **Not the default button** on a draft — approval comes first |
| `Rewrite it for me` + tone | ✎ | Warm and direct / Formal / Brief. The draft arrives below with what it read from, the model and prompt version, and *"Nothing has changed until you use it."* |
| `Use this wording` | ✎ | Goes **into the frame** through the same save your typing uses — so it is undoable and logged. A subject line the model volunteers is moved to the subject field rather than said twice |
| `Keep what I have` | ⊞ | Discards the suggestion |
| A sent message | — | Read-only. Subject and body become `readonly`, every action disappears, and the label reads *"Sent 3 days ago"* in solid rather than dashed |

### The send sheet (▣)

Names four things — To, From, Subject, **Attached: Nothing** — plus any compliance flag, then
*"Once it goes it cannot be recalled."* `Send it` and `Not yet`, with **focus on `Not yet`**.
Escape also means not yet.

### Suggested reading

| Control | | What happens |
| --- | --- | --- |
| The strip | — | Appears only if the library has something. Each row: title, **the reason it was matched**, version and reading time — or *"published in French only"* when it is not in your language |
| Unsendable rows | — | Still listed, greyed, with why: *"the approval ran out on 3 Oct"* · *"it is still with compliance"* · *"it has been withdrawn"* · *"it has not been through review"* |
| `Send this` | ◱ | Opens aRCHi scoped to that article's first topic and this one household. **There is no attach** — a message and an article reach a client by two routes under two approvals |
| `Mention it in the message` | ✎ | Appears on the row *after* a send. Appends one sentence naming the article, through the same save your typing uses. The send sheet still truthfully says "Attached: Nothing" |

### Follow-ups

| Control | | What happens |
| --- | --- | --- |
| Checkbox | ✎ | Completes or reopens. The row dims immediately and reverts if the write fails |
| Each row | — | Title, a `From meeting` tag where it came from a record, a sync badge, `household · due label` — hot when overdue and still open |

---

## 3. Calendar

| Control | | What happens |
| --- | --- | --- |
| `Previous` / `Next` | ⊞ | Moves a month. Weeks start Monday; day names come from your locale |
| A meeting chip | ▣ | Opens the meeting |
| `+` on a day | ▣ | New meeting: what it is, which client (or none, for a prospect), time, minutes |

### The meeting record (▣)

| Control | | What happens |
| --- | --- | --- |
| Shown | — | Prep brief; then notes or transcript if there are any, with **recording consent stated plainly** — on file and how, or **not on file** in bold. A withheld record shows the server's reason as an error rather than an empty box |
| `Suggest next steps` | ✎ | Proposes follow-ups with dates. *"Drafts only. Nothing is created until you add one as a follow-up."* |
| `Add as follow-up` | ✎ | Per item. Records this meeting as the task's origin, which is what puts the `From meeting` tag on it later |
| `Summarise` | ✎ | A summary beside what it was made from, never in place of it, with `Copy` |
| `Draft agenda` | ✎ | **Upcoming only.** Same provenance line and `Copy` |
| `Practice with SimGPT` | ◱ | **Upcoming only.** Closes the dialog first — an advisor practising wants the meeting on screen, not a modal over it |
| `Move meeting` + datetime | ✎ | **Upcoming only** |
| `Cancel meeting` | ✎ | Deletes it and refreshes the figures |

*`Summarise` and `Draft agenda` get `Copy` rather than `Use this wording`* because there is no
frame for them to land in — unlike a message rewrite, which has one.

---

## 4. Prospecting (BD)

> Three tabs: Overview · Pipeline · Referrals.

| Tab | Control | | What happens |
| --- | --- | --- | --- |
| **Overview** | The priority list | — | The same items the Today card draws from, in full, each with its source line |
| | Action button per row | varies | Same six destinations as Today |
| **Pipeline** | A prospect card | ▣ | Opens the record. **Keyboard operable** — Enter or Space |
| | The columns | — | Lead → Contacted → Meeting scheduled → Proposal → Onboarding → Converted, each with a count. Cards show estimated assets, where the lead came from, and `Meeting booked` |
| **Referrals** | `Open` | ▣ | Prospects whose source is a referral, with the pipeline value they represent |

### The prospect record (▣)

| Control | | What happens |
| --- | --- | --- |
| Shown | — | Stage badge, estimated assets, came from, first seen, and the intake notes |
| `Move to {next stage}` | ✎ | Advances one stage, named for where it goes. A converted prospect shows a sentence instead of a button |
| `Which advisor fits?` | ⊞ | A ranked list of advisors with the reasons for each, the current one tagged, and the platform's note on what the ranking does not know |

---

## 5. Clients (CA)

> Four tabs: Overview · Households · Meetings · Onboarding.

| Tab | Control | | What happens |
| --- | --- | --- | --- |
| **Overview** | The priority list | — | Contact gaps, prep, tax and onboarding items, plus households quiet 60+ days and household alerts |
| **Households** | Sort headers, name, pager | ⊞ / ▣ | Book of business. Sorting and paging are the API's |
| | Shared with the team | — | Both directions — shared with you, and shared out — with the reason and a badge |
| **Meetings** | `Open`, practice / notes | ▣ / ◱ | Next 14 days with prep status. For knowing where you stand, not for moving things — the Calendar does that |
| **Onboarding** | Step checkbox | ✎ | Ticks a step and redraws the progress count |
| | A step name | ▣ | Its detail, or *"Not started yet. Nothing has been captured for this step."* |
| | `Convert to client` | ✎ | **Disabled until the platform says ready.** Toast names them, and the figures refresh |
| | `Validate and import` | ✎ | Paste `Name, assets` one per line. Returns read / imported / rejected, and **every rejected row individually with its problems**. Past imports listed below |

### The household record (▣) — advisor scope

Opened with `canShare: true`, which adds four controls the firm view does not get.

| Control | | What happens |
| --- | --- | --- |
| Shown | — | Status badge; assets, 30-day change, last contact; **Allocation** — paired target/current bars per asset class, largest drift against the model's threshold, unclassified percentage; **Accounts** with masked numbers and opening status |
| `Ask about this household` | ◱ | Opens Ask already scoped here |
| `Share with a colleague` | ⊞ | Opens in the dialog: colleague, optional reason, `Share`. Lists who it is shared with, each with `End`. Says plainly when the advisor list is not available to you rather than offering a control that fails |
| `Change fee` | ⊞ | States what the schedule charges at these assets, then rate + **a required reason**, because this changes what a client is billed. `Remove override` where one exists |
| `Compare models` | ⊞ | Pick a model, `Compare`: current vs proposed per asset class, change in points and in money, turnover %. **A comparison, never an instruction** — no trade leaves this screen |
| `Approve and share` | ✎ | **The one door to the client portal.** Six types — plan, tax explanation, report, proposal, message, document — a client-facing title, an optional message. Requires a title. The seventh type, `article`, is absent here on purpose: it arrives only through aRCHi, the only path that records a version and a language |
| The share hint | — | *"Clients see only what an advisor approves here. Briefs, alerts, notes and tasks are never shared."* |

---

## 6. Operations (OP)

> Four tabs — the fourth only for a principal.

| Tab | Control | | What happens |
| --- | --- | --- | --- |
| **Overview** | The priority list | — | What is waiting on your yes: approvals the platform raised, a count of drafts waiting, and practice alerts belonging to no household |
| **Reports** | `Last` | ⊞ | 30 / 90 days against the period before, with breakdowns by meeting type, message status and compliance status |
| **Billing & fees** | The table | — | Per household: assets, rate, annual fee, and `Schedule` or an `Override` badge. Heading carries the annual total across the book |
| | The hint | — | *"Changing what a household is charged is done on the household itself, where the reason is recorded with it."* |
| **Compliance** | The list | — | **Principal only.** The tab is absent for an advisor rather than present and failing |

---

## 7. Development (PD)

> Two tabs. The one role that never shows a shortfall.

| Tab | Control | | What happens |
| --- | --- | --- | --- |
| **Playbooks** | `For` | ✎ | Pick a household, or none |
| | `Run` | ✎ | **Creates real follow-ups, not drafts** — running a playbook is itself the advisor's explicit act. Toast names how many. Dates come from each step's offset: *3 days before* · *on the day* · *5 days after* |
| **Scorecard** | The metrics | — | Each against the **firm median**, and **no rank** — where you sit against named colleagues is shown to a principal only. *"Nothing here is shared with the firm."* |

---

## 8. Tethys

| Control | | What happens |
| --- | --- | --- |
| The library | — | Firm models **and your own**, each badged. Households, assets, average drift and out-of-tolerance counts are over **your book**, not the firm's — the same screen, a different question, and the server decides which |
| A model name | ⊞ | Detail: how it is run, what it holds with a running total, and **your** households on it |
| `Create a model` | ⊞ | The same form a principal publishes with, **minus the scope field** — it follows from who is filling it in, so you are never offered a control that fails on submit. Heading says *"Yours alone. No one else will see it."* |
| Holdings total | — | Against 100 at all times. `Create the model` is disabled until it balances |
| `Put a household on this model` | ⊞ | Your own households only |
| `Assign the model` | ✎ | Toast: *"Assigned. Nothing was traded."* Then a line naming the household, the model and the largest gap that now exists. **The confirmation says what did not happen as well as what did** — an advisor who reads "moved to Growth 70/30" and pictures a trade has been told the wrong thing |

---

## 9. Book at a glance

| Control | | What is shown |
| --- | --- | --- |
| The four-number strip | — | Assets with month-to-date change and a 12-month sparkline · households · meetings this week · open tasks with how many are due today |
| The hint | — | *"A standing picture of the book. Nothing here needs an answer today — what does is on Today."* |

No controls at all. It exists so `GET /summary` keeps a home after the strip came off Today.

---

## 10. Systems

| Control | | What happens |
| --- | --- | --- |
| Each row | — | Custodian / CRM / email / calendar / documents: name, kind, who set it up, last sync, status badge — and **what the platform cannot see because of it**, which is the point of the screen |
| `Connect` / `Disconnect` | ✎ | **Only where `canEdit`.** Toasts and refreshes the list and the activity log |
| Read-only hint | — | *"Connections are set up by whoever administers the firm. You can see what they are, and what the platform cannot see because of them."* |

---

## 11. Beside the page

Four panels sharing one strip to the right of the work. **Opening one closes the others** — two
open together would stack rather than tile. Each is in the same place on every screen.

### Ask (◱)

| Control | | What happens |
| --- | --- | --- |
| Question field | ✎ | Enter submits |
| `Ask across the whole firm` | ⊞ | **Principal only**, and absent when scoped to a household. Unlike the firm view, this one does something: the default here is your own book |
| `Ask` | ✎ | The answer, then **Not covered by this answer** with reasons, then **Drawn from** with every citation's source and as-of time, then the model line. *"A question only reads: nothing here has changed anything."* |
| Past questions | ⊞ | Your own only |
| Scope line | — | *"Answering across your book"* — or the household's name when opened from a record |

### Activity (◱)

| Control | | What happens |
| --- | --- | --- |
| The log | — | Three actors, three marks: **the platform** · **you** · **{name}, reading your book**. The third must not be dressed as your own doing — the whole point of the entry is that somebody else looked |
| `Undo` | ✎ | On entries the contract says can be stepped back. Replays the recorded inverse call, then re-renders whichever screen is showing |

### SimGPT (◱)

| Control | | What happens |
| --- | --- | --- |
| The frame line | — | At the top, every time: *"Practice. The client here is simulated from what is on file — nothing they say is something your client said, and nothing you say is filed anywhere."* |
| The scene | — | `On the record` — composed from the meeting record, and says so |
| Each client turn | — | Labelled **Simulated client** *every time*, not once at the top where it scrolls away, with a `What landed` coaching note and the model and prompt version beneath |
| `Say it` / Enter | ✎ | Sends. **Shift+Enter is a newline**, as in every message box you already use |
| `Start again` | ⊞ | Clears the exchange. Kept per meeting otherwise, so closing the panel to look something up loses nothing |
| The opening turn | — | Sets the scene and carries **no coaching note** — there is nothing yet to observe, and a coach commenting on a turn you have not taken is the tell that nothing is really being read |

### aRCHi (◱)

| Control | | What happens |
| --- | --- | --- |
| The frame line | — | *"The article is the firm's and has been through review. The note you add is yours. Nothing reaches a client until you approve it below."* |
| The article | ⊞ | Radio list: title, summary, and *"Version 3 · approved 2026-09-14 · 4 min read"*, plus when approval runs out |
| `Language` | ✎ | **Only languages the article was actually published in** — the picker cannot offer a translation that does not exist. A single-language article says so instead. *"The platform cannot see which language a client reads, so this is your call"* |
| Who it goes to | ✎ | Checkbox per household, all ticked to start. Toggling one **does not redraw** the panel — that would throw away a note you are half way through writing |
| `Your note` | ✎ | *"The same note goes to everyone on the list, so it says nothing about any one household's holdings."* |
| `Draft a note` + tone | ✎ | Puts a draft **into the box, still editable** — a draft you cannot change is not a draft. Provenance line beneath |
| `Approve and send to N households` | ✎ | **Names the count on the button.** One call per household, because that is what the door takes — each send is its own record and its own line in the log, which is what makes "who was sent this" answerable afterwards |
| The receipt | — | Replaces the panel: which article, which version, in which language, to whom — and failures listed separately with their reasons. Shown instead of a toast, because a toast that says "sent" and disappears is not a receipt for something that cannot be undone |

---

## What an advisor cannot do from here

| | Why |
| --- | --- |
| See a rank on their own scorecard | Placing someone against named colleagues is a management decision. The firm median is shown instead |
| Read Compliance | Principal-only in the contract, so the tab is absent rather than failing |
| Change the fee **schedule** | The schedule is the firm's. A single household's rate is an override, with a required reason |
| Publish a firm model | `Create a model` makes one only they can see. No scope field is offered |
| Edit branding | Principal-only, and it reaches every view including the client portal |
| Read ownership or the platform bill | Firm sections, not advisor ones |
| Approve another advisor's message | Approval stays with whoever wrote it |
| Send an article without choosing a language and a recipient | The send button is disabled with nobody ticked, and the language cannot be one the article lacks |
| Take a share back | *"A share cannot be taken back from here."* The receipt says so before you press |

---

## The other two

`docs/click-map-firm.md` · `docs/click-map-client.md`
