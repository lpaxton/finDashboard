# Click map — the Firm view

Every control a principal can press, what it does, and what comes back.
Mapped 12 October 2026 from `dashboard/js/firm.js`, `ui.js` and `app.js` at contract v0.7.0-draft.
Shareable version: https://claude.ai/code/artifact/1e0fdbec-72f1-4e4a-a53d-a59386ea978b

**First of three.** `docs/click-map-advisor.md` is written. The client portal is still to map.

**Who sees this view.** Only a session whose `views` include `firm` — Dana (`principal`,
`advisor`). Marcus has no firm tab at all; the tab strip is hidden entirely when a person has
fewer than two views. Several controls below are additionally gated on the `principal` role by
the API, not just by the screen, and those are marked **API-gated**.

Legend: **→** navigates or opens · **⊞** renders in place · **✎** writes · **◱** opens beside the
page · **▣** opens a modal over the page.

---

## 0. The frame — present on every firm section

| Section | Control | | What happens |
| --- | --- | --- | --- |
| Demo bar | `Dana` / `Marcus` / `Grace` | → | Re-boots the app as that persona. Changes which views exist, so leaving the firm view entirely if you pick Marcus or Grace. Harness only — not a product feature |
| Header | View tabs `Firm` \| `Advisor` | → | Switches view. Closes Ask, Activity, Settings, SimGPT and aRCHi first, and clears the section nav so the next view cannot inherit this one's spine |
| Header | Avatar | — | Not interactive. Initials from the session name |
| Header | `Activity` | — | **Hidden on this view.** It is a record of an advisor's own work (`actBtn.hidden = view !== 'advisor'`) |
| Nav rail | 8 section buttons | ⊞ | Replaces `#section` only. The strip above and the nav itself stay put |
| Nav rail | Hamburger toggle *(below 860px)* | ⊞ | Opens the section list. Names the section you are in while closed. Escape or an outside click closes it |
| Nav foot | `Settings` | ◱ | Opens the Settings panel beside the page. Not a section — you stay exactly where you were |
| Bottom right | `Ask` | ◱ | Opens the Ask panel, scoped to **the whole firm** by default on this view. Pressing it again closes it |
| Strip | 4 figures | — | Not interactive. Firm AUM with month-to-date change and a 12-month sparkline, advisors, households, open compliance items with the overdue count. `GET /firm/summary`, loaded once per view |

### Ask panel (◱)

| Control | | What happens |
| --- | --- | --- |
| `What do you want to know?` | ✎ | Free text. Enter submits |
| `Ask across the whole firm` | ⊞ | Checkbox, **principal only**. It disappears when Ask is opened from inside a household record. **On this view it is a no-op** — `setAskContext` already set scope to `firm`, so ticking it resolves to the scope the panel was going to use anyway. It earns its place in the Advisor view, where the default is your own book. Worth tidying: either hide it when the scope is already `firm`, or label it as the state rather than an action |
| `Ask` | ✎ | `POST /queries`. Returns the answer, then **Not covered by this answer** (what it could not reach, with reasons), then **Drawn from** (every citation with its source tag and as-of time), then the model line. A query only reads — nothing it returns changes anything |
| Past questions | ⊞ | `GET /queries`, your own only. An answer is a record, not something that vanishes on close |
| `Close` | ⊞ | Panel closes, focus returns to the Ask button. The last answer is kept and is still there when you reopen |

### Settings panel (◱)

| Control | | What happens |
| --- | --- | --- |
| `Language` | ✎ | `PATCH /settings`, then the whole view re-renders in place. Ask and Activity are closed first — they were rendered in the old language. Settings itself stays open. A failed write reverts the select, so the screen and the preference never disagree |
| `Appearance` | ✎ | Light / dark / system. No server call — the page repaints from CSS custom properties. Kept on this browser, scoped per persona |
| `Close` | ⊞ | Returns you where you were |

---

## 1. Overview

> `firmOverview()` — what needs answering first, then how the firm is going.

| Panel | Control | | What happens / what is shown |
| --- | --- | --- | --- |
| **Needs you** | — | — | **Read-only list.** `GET /next-actions?scope=firm&size=8`. Per row: a severity mark (high/medium/low), the title, the reason it was raised, and `household · sources`. Header says "top 8 of 23" when there are more. Footer carries the platform's own note |
| | | | *No buttons by design.* Acting on an advisor's item is theirs to do — the same list inside an advisor's book (§2) repeats that in words |
| **Also open** | — | — | **Read-only list.** `GET /alerts?scope=firm`, minus anything already named on the left. De-duplicated two ways: by citation id, and by household for a `draft_email` alert where a contact item already covers it. Shows "Every open alert is already named on the left" when nothing survives |
| **Households across the firm** | Column header `Household` | ⊞ | Sorts A→Z, then Z→A. Refetches; resets to page 1 |
| | `Assets` / `30-day change` / `Last contact` / `Status` | ⊞ | Sorts high→low first, then low→high. Refetches; resets to page 1 |
| | Household **name** | ▣ | Opens the household record. `GET /households/{id}` |
| | `Previous` / `Next` | ⊞ | Pages. Disabled at each end. "Page 2 of 4" between them |

### Household record, opened from Overview (▣)

Opened at **firm scope**, which means `canShare: false` — and that removes four controls that an
advisor has on the same dialog.

| Control | | What happens |
| --- | --- | --- |
| *(shown)* | — | Status badge; Assets, 30-day change, Last contact; **Allocation** — target vs current per asset class as paired bars, the largest drift against the model's own threshold, and unclassified holdings as a percentage; **Accounts** — masked number, type, balance, today's gain or loss, opening status |
| `Ask about this household` | ◱ | Sets the Ask scope to this household and opens the panel. The firm-wide checkbox disappears while that scope is set |
| `Close` | ⊞ | Closes the dialog |
| ~~`Share with a colleague`~~ | — | **Absent at firm scope.** Sharing a household is the owning advisor's act |
| ~~`Change fee`~~ | — | **Absent.** The reason is recorded against the household by whoever owns it |
| ~~`Compare models`~~ | — | **Absent** |
| ~~`Share with client`~~ | — | **Absent.** The one door to the client portal is only ever opened by an advisor |

*Allocation has three outcomes and says which:* the bars; "no model portfolio on file, so there
is no target to compare against"; or the server's own `unavailableReason` when holdings are
unpriced. It never falls back to an invented number.

---

## 2. Advisors

> `firmAdvisors()` — the roster, one advisor against the firm, and supervision.

| Panel | Control | | What happens / what is shown |
| --- | --- | --- | --- |
| **Advisors** | Header `Advisor` | ⊞ | Sorts A→Z first |
| | Header `Households` / `Assets` / `Overdue follow-ups` / `Open alerts` | ⊞ | Sorts high→low first. `GET /firm/advisors?sort=` |
| | `30-day change`, `Meetings this week` | — | **Not sortable.** Marked `nosort` — the API has no sort key for them, so no header button is drawn rather than one that fails |
| | Advisor **name** | ⊞ | Loads their scorecard into the panel below, and **closes any book you had open**. Hint under the heading says so: "Select a name for their scorecard" |
| | *(on load)* | ⊞ | The first advisor's scorecard opens automatically. Their **book does not** — reading a row and reading someone's book are different acts |
| **{Advisor name}** | — | — | Two calls, made not to overlap. `GET /firm/advisors/{id}` gives 30-day change, meetings this week, open alerts — the three the scorecard has no period for. `GET …/scorecard` gives the period line and the metric rows: value, previous value, change, **firm median**, and **a rank badge (#3 of 7)** |
| | | | Hint, always: *"Rank is shown to a principal only. An advisor reading their own scorecard sees the firm median and no placing."* **API-gated** (AX-08) |
| | `Open {first}'s book` | ⊞ | Opens the supervision region below. Hint beside it first: *"Read-only, and {first} is told: it appears in their activity log."* |
| | *(your own row)* | — | No button. Hint instead: *"This is your own book. It is the Advisor view, where you can act in it."* |

### Supervision region (⊞, below the scorecard)

Opens behind a notice stating three things: what this is, what it is not, and that the advisor
knows. Not dashed — dashed means *draft* in this design system, and this is a record.

| Panel | Control | | What happens / what is shown |
| --- | --- | --- | --- |
| Notice | `Close {first}'s book` | ⊞ | Removes the region and scrolls the scorecard back into view |
| **{first}'s households** | Headers, name, pager | ⊞ / ▣ | Same table as Overview, narrowed by `advisorId`. Opens the same read-only household record |
| **Needs {first}** | — | — | **Read-only.** `GET /next-actions?scope=firm&advisorId=…&size=6`. Hint: *"Drafts, as they are for {first}. Adding one to their follow-ups is theirs to do, not yours."* |
| **Waiting on {first}** | — | — | **Read-only.** Their unapproved drafts: subject, household, age, and a `flagged` badge where compliance has flagged it. Hint: *"Approving a message stays with the advisor who wrote it (X-03)."* |

**What supervision deliberately does not reach:** their calendar, their prospects, their activity
log, or any ability to act. The contract enforces it by not offering `advisorId` on those
operations — it is not a screen-level choice.

---

## 3. Tethys

> `tethysFirm()` — every model in the practice, and the power to publish one.

| Panel | Control | | What happens / what is shown |
| --- | --- | --- | --- |
| **Model library** | — | — | `GET /models?scope=firm`, **ordered by assets, not by name** — this screen is for telling you which models matter. Columns: Model (+ a `Firm model` or `{owner}'s own` badge), Risk, Households, **Advisors**, Assets, Average drift, Out of tolerance. Heading totals: "6 models · 48 households · $412M" |
| | | | Out of tolerance reads three ways: `Not in use` · `All within` · a warn/crit badge "3 of 9" |
| | Model **name** | ⊞ | Loads the detail panel beside it |
| | `Publish a new model` | ⊞ | Replaces the detail panel with the form |
| **{Model name}** | — | — | Scope badge and who built it · description · **How it is run**: drift measured as (with a worked example of what that method means), looked at past, acted on past, rebalanced, left alone for · **What it holds**: ticker, instrument, asset class, weight, with a total that turns red if it is not 100 · **Who is on it**: household, advisor, assets, drift, state · **By advisor**: households and assets each |
| | | | Drift is printed with its unit attached — `4.2 points` on an absolute model, `12.5%` on a relative one — because a bare 6 means different things on each |
| | ~~`Put a household on this model`~~ | — | **Absent at firm scope.** Assigning is an advisor's act against their own households |

### Publish a new model (⊞, replaces the detail panel)

| Control | | What happens |
| --- | --- | --- |
| `Name`, `Description` | ✎ | Text |
| `Risk level` | ✎ | Conservative / Moderate / Aggressive |
| `Drift method` | ✎ | Percentage points / Share of the target / Whole portfolio. **The hint under it rewrites itself on change** with a worked example of the method you just picked |
| `Drift threshold (%)`, `Max drift (%)` | ✎ | Numbers. The server refuses a maximum below a threshold |
| `Rebalance frequency` | ✎ | Monthly / Quarterly / Twice a year / Yearly / Only when it drifts |
| `Cooldown (days)` | ✎ | Number |
| Instrument select, Weight per row | ✎ | Instruments come from `GET /instruments` — the firm's approved list, not free text |
| `Remove` | ⊞ | Drops that holding. Never goes below one row |
| `Add a holding` | ⊞ | Appends a row. Everything typed above is read back into state first, so redrawing the table loses nothing |
| **Total** | — | Recomputed on every keystroke and shown against 100 at all times, green or red. This is why it is a table and not three fields |
| `Publish to every advisor` | ✎ | **Disabled until the total is exactly 100**, with a tooltip saying why. `POST /models`. On success: toast "Published. Every advisor can use it.", the library refreshes, and the new model's detail opens. On refusal the server's message is shown **verbatim and in place** — it knows things the form does not, like which tickers the firm has approved |
| `Cancel` | ⊞ | Detail panel returns to "Choose a model to see what it holds and who is on it." |

*No scope field on this form, deliberately:* it follows from who is filling it in. An advisor
filling the same form creates a model only they can see, and is never offered a control that
would fail on submit.

---

## 4. Compliance

| Panel | Control | | What happens / what is shown |
| --- | --- | --- | --- |
| **Obligations** | `Show` | ⊞ | All / Overdue / Open / Done. Refetches `GET /firm/compliance?status=…&sort=status,desc&size=12`. The order is **asked for rather than inherited** — the list is paged, and reordering here would order a page rather than the obligations |
| | — | — | Per row: title, `category · advisor · due {date}`, and a status badge (crit / ok / plain). "Nothing matches." when the filter empties it |
| **Waiting for review** | — | — | **Read-only.** `GET /communications?scope=firm&status=draft`, filtered to those flagged for compliance: subject, household, advisor, age, `flagged` badge. Hint: *"Approving a message stays with the advisor who wrote it. This is the firm's view of what is waiting."* |

This queue was previously only reachable from an advisor's own Inbox, which is the wrong door
for the person who has to sign it off (COMM-03, PO-08).

---

## 5. Reports

| Panel | Control | | What happens / what is shown |
| --- | --- | --- | --- |
| **The firm** | `Last` | ⊞ | 30 days / 90 days. Refetches `GET /reports/practice?scope=firm&from=…` |
| | — | — | Period line: "1 Sep to 30 Sep, against 2 Aug to 31 Aug". Then metric rows — label, previous value, current, change — and breakdowns: **Meetings by type**, **Messages by status**, **Compliance by status**. An empty breakdown is omitted rather than shown as a heading with nothing under it |

Same `metricRows()` renderer as the advisor's own report and as the scorecard, so a firm number
and a book number can never disagree on form.

---

## 6. Billing & fees

> Two unrelated concerns, held together on purpose: what the firm **pays**, and what the firm
> **charges**.

| Panel | Control | | What happens / what is shown |
| --- | --- | --- | --- |
| **Platform subscription** | — | — | Plan name in the heading. Seats used of purchased · renewal date · masked payment method with expiry · this invoice, amount and status and due date. Then **Usage this period** as meters — label, "1,840 of 3,000 drafts", and a bar that turns hot at 90% |
| | — | — | Last line is the **AI status** (`GET /ai/status`): *"Drafting is live, on {model}"* or *"Drafting is offline, so nothing here is consuming the AI allowance"* plus the reason. Placed here deliberately — beside the usage meter a principal is already reading |
| **Invoices** | `Breakdown` | ▣ | `GET /firm/billing/invoices/{id}`. Modal: number, issued and due dates, then a line table — item, quantity, each, amount — with a total row |
| | `Close` | ⊞ | Closes the modal |
| **Fee schedule** | Rate input per tier | ✎ | Number, 0–5, step 0.05. **Principal only** — everyone else sees the rate as text and the heading says "Set by the principal" (`canEditSchedule`) |
| | `Save schedule` | ✎ | `PATCH /billing/fee-plan` with the whole schedule. Toast "Schedule saved.", then the panel reloads. The API refuses a gap between tiers, and the hint says so before you try: *"Tiers must meet exactly, so no household is left without a rate."* |
| | — | — | Below: who changed it last and when, then **Overrides** — household, reason, who set it, rate |
| **Client fees** | — | — | **Schedule**: each asset band and its annual rate. **This quarter**: household, billable assets, rate, fee, with a total. Heading carries the next run date. Hint: *"Clients see their own fee from this same schedule in the portal."* |

*Note:* `GET /billing/fees` has no firm scope — it resolves to the caller's own book. Dana is
also an advisor, so "Client fees" here is **her** households, not the firm's. Worth knowing
before anyone reads it as a firm-wide total.

---

## 7. Ownership

| Panel | Control | | What happens / what is shown |
| --- | --- | --- | --- |
| **Ownership** | — | — | **Read-only, no controls.** `GET /firm/cap-table`. Heading: "1,000,000 shares as at 30 Sep 2026". Columns: Holder (with their role beneath), Class, Shares, Vested (an em dash where nothing is unvested), Ownership %, Vesting ends |
| | — | — | Hint: *"The firm's own ownership, not a client's. Visible to a principal only."* **API-gated** (PO-12) |

---

## 8. Branding

| Panel | Control | | What happens / what is shown |
| --- | --- | --- | --- |
| **Branding** | `Firm name` | ✎ | Text |
| | `Advisor name and credential` | ✎ | Text |
| | `Mark letter` | ✎ | Single character, `maxlength="1"`. Falls back to `W` if emptied |
| | `Accent colour` | ✎ | Native colour picker |
| | `Save branding` | ✎ | `PATCH /firm/branding`, then **`applyBranding()` repaints the running app immediately** — this view, the advisor view and the client portal all take it from the same place. Toast "Branding saved." Button re-enables on failure |
| | — | — | Hint: *"Last changed by {who} {when}. Only a principal can change this; every advisor and client sees the result."* |

Subhead text: *"Applies to every view, including the client portal."* This is the one firm
control whose effect is visible to a client.

---

## What a principal cannot do from here

Worth stating, because each absence is a decision rather than a gap:

| | Why |
| --- | --- |
| Approve or send any message | Approval stays with the advisor who wrote it (X-03). The firm sees the queue (§4) and nothing more |
| Act on an advisor's next action | The item is theirs; the screen says so in words rather than disabling a button |
| Share anything with a client | The one door is advisor-side only. There is no firm-scope share |
| Open an advisor's calendar, prospects or activity | Supervision is the firm's own records narrowed to one advisor, not that advisor's screen |
| Assign a household to a model | An advisor's act, against their own households |
| Snooze or dismiss an alert | `alertsList` is called without `dismiss` at firm scope, so the Not now / Dismiss buttons are never drawn |
| Undo anything | Undo hangs off the activity log, and Activity is advisor-only on purpose |

---

## Still to map

- `docs/click-map-advisor.md` — ten spine entries, four role homes, four panels beside the page
- `docs/click-map-client.md` — one screen, six panels
