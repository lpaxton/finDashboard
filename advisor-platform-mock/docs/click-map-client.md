# Click map — the Client portal

Every control a client can press, what it does, and what comes back.
Mapped 12 October 2026 from `dashboard/js/client.js` and the `/me/*` surface at contract
v0.7.0-draft.
Shareable version: https://claude.ai/code/artifact/2ddc7dfe-9e41-459a-9ba8-f137790ba5b2

**Third of three.** `docs/click-map-firm.md` and `docs/click-map-advisor.md` cover the other two.
The last section compares all three, because the client-safe boundary is only legible as a shape
once you can see the three maps beside each other.

**Who sees this view.** Grace (`client`), and nobody else. Her session carries a `householdId`
rather than an `advisorId`, and every operation below resolves to *her* household from the
session — no id is ever passed from the browser.

**One screen.** No navigation, no sections, no tabs. Six panels in two columns, and a strip of
three figures above them.

Legend: **✎** writes · **◱** opens beside the page · **—** not interactive.

---

## The strip

| | What is shown |
| --- | --- |
| Total value | With a twelve-month sparkline. Drawn only when the backend sends enough history — never a misleading line from two points |
| Change in the last 30 days | Coloured by sign |
| Your advisor | Their name, set large. The only person named anywhere on this screen |

Not interactive. Loaded as part of the accounts panel rather than separately, so the figures and
the account rows can never disagree about when they were read.

---

## 1. Your accounts

| Control | | What is shown |
| --- | --- | --- |
| The list | — | Per account: type, masked number, balance, and today's gain or loss with its sign and colour |

No controls. `GET /me/household` returns a deliberately narrowed household — id, name, assets,
30-day change, trend, the advisor's name, and accounts stripped to five fields each. The
advisor-side record has status, last contact, alerts, allocation and a model; none of that is in
the client's version, and the narrowing happens on the server rather than in the browser.

---

## 2. From your advisor

| Control | | What is shown |
| --- | --- | --- |
| The list | — | Per item: title, `type · shared by {advisor} on {date}`, and the advisor's message where there is one |
| Empty state | — | *"Nothing shared yet. Plans and reports from your advisor will appear here."* — says what will appear, rather than apologising |

**This is the far side of the one door.** Everything here arrived through
`POST /households/{id}/shares` — an advisor pressing *Approve and share* on a household record,
or approving a send in aRCHi. There is no other route by which advisor-side content reaches this
screen, and nothing on this panel can be acted on: a share is a record, not a request.

Seven types can appear: plan, tax explanation, report, proposal, message, document, **article**.
The seventh only ever arrives through aRCHi, which is the only path that also records which
version and which language the client was given.

---

## 3. Documents

| Control | | What happens |
| --- | --- | --- |
| The list | — | Title, date, and the masked account for a statement. Ten at a time, newest first |
| `Download` | ✎ | Fetches the document, then toasts. In the mock this is *"A download of Q3 statement.pdf would start here."* — the operation returns `mockDownload: true` and a filename rather than bytes |

*`GET /me/documents` also accepts `docType`, `from` and `to` filters that this screen never
sends.* Available if the portal ever grows a filter; no gap today.

---

## 4. Request a meeting

| Control | | What happens |
| --- | --- | --- |
| `What would you like to talk about?` | ✎ | **Required.** Empty submits are refused in the browser with *"Tell us what you would like to discuss."* before anything is sent |
| `A time that suits you (optional)` | ✎ | A datetime, sent as a one-item `preferredTimes` array |
| `Anything else we should know (optional)` | ✎ | Free text, sent as `note` |
| `Send request` | ✎ | Posts, toasts *"Request sent. Your advisor will be in touch."*, and clears all three fields |

### What happens on the other side

This is **the only control in the portal that creates work for an advisor**, and it does two
things at once:

1. a `MeetingRequest` is recorded with status `requested`
2. **a task is created on the household's advisor**, due tomorrow, titled
   *"Meeting request from {household}: {topic}"*

That task appears in the advisor's **Inbox → Follow-ups**, and feeds their Operations role card
like any other. So a client pressing this button is visible in the advisor's day within one
render — not through a notification system, but through the task list that already exists.

> **Two of the three fields are discarded.** `MeetingRequestCreate` declares `topic`,
> `preferredTimes` and `note`; the screen collects all three and sends all three; the mock stores
> **only the topic**, and the task title carries only the topic. A client who proposes a time is
> told "your advisor will be in touch", and their advisor never sees the time they proposed.
> The contract is right and the mock is short — logged below.

---

## 5. Fees

| Control | | What is shown |
| --- | --- | --- |
| The list | — | Per row: description, `{period start} to {period end} · {masked account}`, the amount, and a status badge |

Three rows: the prior quarter (`paid`), this quarter (`billed`), and next quarter
(`scheduled`). Every amount comes from `quarterlyFee()` — **the same schedule the firm sets and
the advisor reads**, so the client's fee and the advisor's cannot disagree.

> **One status arrives untranslated.** The screen maps `paid`, `billed` and `accrued`; the
> contract's enum is `[scheduled, billed, paid, waived]`. So `accrued` is mapped but never sent,
> while `scheduled` and `waived` are sent but never mapped — and the fallback prints the raw
> enum. A French reader sees "scheduled" in English, in a sentence about their own money, which
> is exactly the leak the comment above that map warns against. Logged below.

---

## 6. Preferences

| Control | | What happens |
| --- | --- | --- |
| `Send documents electronically only` | ✎ | Paperless, as a checkbox |
| `Tell me about updates by` | ✎ | Email · Text message · This portal, as a checkbox group in a fieldset with its own legend |
| `Save preferences` | ✎ | Sends both at once and toasts. Nothing is saved until pressed |
| `Language and appearance` | ◱ | **The portal's only door to Settings.** It has no navigation, so this link stands where an advisor would have a nav foot |

### Settings, from here (◱)

The same panel an advisor reaches: `Language` writes and re-renders the portal in place, and
`Appearance` is light / dark / system, kept on this browser. Language belongs to the person
reading, and a client reads this portal in their own.

---

## What the portal does not have

Every absence is structural rather than conditional, which is the whole claim:

| | How it is prevented |
| --- | --- |
| **Ask** | Hidden in the shell by view — `ask.hidden = v === 'client'` — not per panel. There is no query surface on the client side at all |
| **Activity** | Same: `actBtn.hidden = v !== 'advisor'`. An activity log is a record of an advisor's own work |
| Briefs, alerts, signals, notes, tasks, next actions | No `/me/*` operation returns any of them |
| Prospects, models, scorecards, compliance, fees across the book | Advisor and firm surfaces; a client session is refused at the API, not hidden at the screen |
| Anything about another household | Every `/me/*` handler resolves `user().householdId` from the session. No household id crosses the wire |
| Navigation of any kind | There is nowhere else to go |

**Why the boundary holds.** The portal reads a separate `/me/*` surface whose handlers all begin
`if (!isRole('client')) return forbid();` and all resolve the household from the session. The
single way advisor-side content arrives is an approved share. That is why adding articles needed
a seventh `ShareType` value rather than a second door — a new path that put content in front of a
client would be the one thing that breaks the claim.

---

## The three views beside each other

| | Firm | Advisor | Client |
| --- | --- | --- | --- |
| Who | Dana (principal) | Marcus, and Dana for her own book | Grace |
| Features | 19 | 69 | 7 |
| Sections | 8 | 10 + four role homes | 1 |
| Standing figures | 4, above every section | none — they live in one section | 3, above the panels |
| Side panels | Ask, Settings | Ask, Activity, SimGPT, aRCHi, Settings | Settings |
| Can write | 6 controls | ~40 controls | 4 controls |
| Can reach a client | **no** | yes — one door | n/a |
| API surface | `/firm/*`, firm-scoped reads | everything advisor-side | `/me/*` only |

Three things this makes visible that no single map does:

- **The firm view cannot act on a client, and the client view cannot act on the firm.** Only the
  middle column touches both, and it touches the client through exactly one operation.
- **Write capability is not proportional to seniority.** A principal has fewer controls that
  write than an advisor does, because supervision is reading and the work is advising.
- **The client portal is the only view with no navigation**, and that is the honest shape: a
  person checking their own accounts is not operating a tool.

---

## Logged from this mapping

Neither is a click-map problem; both were found by walking the controls.

1. **`scheduled` and `waived` print raw on the client's Fees panel.** `FEE_STATUS_EN` in
   `dashboard/js/client.js` maps `paid`, `billed` and `accrued`; the contract's `FeeStatus` enum
   is `[scheduled, billed, paid, waived]`, and the mock returns `scheduled` on every third row.
   `accrued` is not in the contract at all.
2. **`preferredTimes` and `note` are dropped by `POST /me/meeting-requests`.** The contract
   declares them, the portal sends them, the handler in `src/mock-core.js` stores only `topic` —
   so the advisor's task never carries the time the client proposed.
