# UX rules — advisor view

*v0.3 · 26 September 2026 · Owner: Leila Mitchell · v0.1 drafted by Claude from Leila's
decisions and notes; v0.2 carries Leila's review (keep / change / cut, and her answers to the
open decisions). v0.3: every rule and all five promises confirmed by Leila, 26 Sept.*

**Scope.** This file covers the **Advisor** view (Dana and Marcus as advisors). Many of these
rules will reach the Client view later, and the Firm view needs its own pass. Neither is
covered here yet.

**The floor.** The five product rules in `DESIGNER-HANDOFF.md` §4 sit underneath everything
here, and nothing in this file loosens them: a draft never looks sent · AI output shows its
sources · uncertain data is marked as an estimate · the client sees only what an advisor
approved · a rise knows whether it is good. So does the accessibility floor (WCAG 2.1 AA,
visible focus, reduced motion respected).

## How to read a rule

`FO-03` · the rule · **Status** · [PO] or [UX] · Evidence

| Status | Means |
| --- | --- |
| **Decided** | Leila made this call, or kept it in her review (26 Sept) |
| **Decided, changed** | Leila kept it with a change; the wording now follows her edit |
| **Research** | Follows directly from `UX_RESEARCH.md` |

Rule numbers are permanent. A cut or merged rule keeps its number in the *Retired* list at the
end so references never point at the wrong rule.

---

## 1 · Focused

> **Promise** *(confirmed 26 Sept)*: You see what matters right now, and nothing that
> doesn't, so you have room to be thoughtful and intentional.

| # | Rule | Status | Tag | Evidence |
| --- | --- | --- | --- | --- |
| FO-01 | **Today is organised by the four roles the advisor plays:** prospecting and business development · client advisor · business operations · professional development. Each role is a card that is always there. | Decided | [UX] | F1, F9 |
| FO-02 | **One action per role card by default**, so four things at once. Each card opens to its top three on demand. Nothing else competes for attention on Today. | Decided | [UX] | F6 |
| FO-03 | **Something earns a place on the screen only if it is time-bound, has just changed, or was asked for.** Everything else waits in its work area until it does. | Decided | [UX] | F6 |
| FO-04 | **One lead at a time.** The card that is most time-critical today leads visually; the others are clearly secondary. **Time-critical means:** activity that has gone dormant and is about to cost something, or anything that could affect the business itself. | Decided | [UX] | F6, F1 |
| FO-05 | **An empty role says so in one sentence.** When a role has nothing pressing, its card says so and may offer one optional thing to read, never an invented task. | Decided | [UX] | F6, F4 |
| FO-06 | **Depth opens in place, and you always come back to where you were.** Going deeper is one deliberate step; returning is one step. | Decided | [UX] | F7 |
| FO-07 | **No more than one level of sub-menu below the main navigation, and only if it's needed.** No stacked accordions; the platform doesn't show everything under the hood. | Decided, changed | [UX] | F6 |
| FO-08 | **Motion explains where things went.** When something opens, closes, arrives or recedes, it moves so the advisor can see where it came from and where it went. No decorative motion; reduced-motion settings are always respected. | Decided | [UX] | F7 |
| FO-09 | **Meaning first, then a suggested action.** Lead with the sentence ("The Lindqvist Family Trust drifted 3% this month") and one suggested action; taking the action, and the chart or detail behind it, is one step away. | Decided, changed | [UX] | F6, F4 |
| FO-10 | **Explain in one sentence.** A reason is one line; more detail is one step away, never a paragraph up front. *(Moved from Trust, TR-05.)* | Decided | [UX] | F7 |
| FO-11 | **Next best action lives inside the role cards,** not as a separate section. Each card's action *is* the next best action for that role. | Decided | [UX] | F4 |

**Test — ask of any advisor screen:**
- [ ] Could the advisor say what this screen wants from them within five seconds?
- [ ] Is there only one thing leading?
- [ ] Is anything here that could have waited without cost?

---

## 2 · Trust

> **Promise** *(confirmed 26 Sept)*: It works the way you
> would, only better informed and always accurate; it shows you what it did and where its
> insight came from, and nothing leaves your hands without your yes.

*Leila's note on the promise:* trust isn't only about the actions the platform takes, but
about whether its suggested actions and insights come from a trusted source.

| # | Rule | Status | Tag | Evidence |
| --- | --- | --- | --- | --- |
| TR-01 | **The line is internal vs. external.** The platform may prepare anything for the advisor. Anything that leaves the firm — a client message, a trade, an account change, advice, a compliance decision — needs the advisor's explicit yes. | Decided | [UX] | F3 |
| TR-02 | **What you edit is what they get.** A draft is shown exactly as it will arrive, so there is no separate preview. Anything leaving the firm gets one confirmation: who it goes to, from whom, what's attached, and whether it can be recalled. A separate "as they'll see it" view is added only where the recipient sees something different from what the advisor edits (a report in the client's portal, one message to many people, attachments). *(Revised 26 Sept, from Leila's review of the draft wireframe.)* | Decided, changed | [UX] | F3, F7 |
| TR-03 | **One activity log, always in the same place.** Everything the platform did — drafted, ranked, flagged, reordered, sent on the advisor's yes — is recorded there, including what can't be reversed. | Decided | [UX] | F3, F7 |
| TR-04 | **Every prepared item carries a one-line receipt** saying what the platform did ("Drafted the reply from Tuesday's notes"). Show, don't tell. | Decided | [UX] | F7 |
| TR-06 | **Sources are present but quiet.** Every AI output shows where it came from and how recent it is at a glance ("from Tuesday's meeting · 2 days ago"). The full source list is one step away. Never removed, never behind a click on a screen where the advisor could act without seeing it. | Decided | [UX] | F3, product rule 2 |
| TR-07 | **Undo wherever undo is possible — several steps back, not just one.** Dismissals, snoozes, reorders and drafts not yet sent can be reversed where they happened. The activity log doubles as a history: the advisor can step back through recent changes. | Decided, changed | [UX] | F7 |
| TR-08 | **Uncertainty is said plainly.** When the platform isn't sure, it says so in words ("Two addresses on file — which one?"). Uncertain information never goes into a client draft unmarked. | Decided | [UX] | F7, product rule 3 |
| TR-10 | **Insight names the kind of source it stands on.** Suggestions and insights say whether they come from the custodian's records, the advisor's own notes and meetings, or outside market information, and the platform never presents something from an unknown or unverified source as insight. | Decided *(from Leila's promise note)* | [UX] | F3, product rule 2 |

*On TR-08 — you asked whether it belongs under "member of your team."* I'd keep it in Trust. A
colleague who says "I'm not sure" is being trustworthy, not stylish, and the rule's real job is
the second sentence: uncertain information never reaches a client unmarked. That's a trust
guarantee. *(Leila agreed.)*

**Test:**
- [ ] Could the advisor say what the platform did today without asking anyone?
- [ ] Can anything on this screen leave the firm without a preview and a yes?
- [ ] Does every AI output show, at a glance, where it came from?

---

## 3 · Steady

> **Promise** *(confirmed 26 Sept)*: The room
> stays the same every time you walk in, so it always feels familiar; only what's on the table
> changes, and you'll always know why.

| # | Rule | Status | Tag | Evidence |
| --- | --- | --- | --- | --- |
| ST-01 | **The frame never moves:** where the navigation spine sits · what each design element means · where the activity log is found. | Decided | [UX] | F7 |
| ST-02 | **The four roles are part of the frame.** Always present on Today, always with the same label and the same colour, wherever they sit. | Decided | [UX] | F7 |
| ST-04 | **Every design element carries meaning, and it means the same thing everywhere.** Colour, hierarchy, layout and form each signal something, consistently; nothing is there for decoration alone. | Decided, changed | [UX] | F7, product rule 5 |
| ST-05 | **Nothing the advisor needs is hidden.** Nothing has to be hunted for; depth is always one deliberate step from where they are. | Decided | [UX] | F7 |
| ST-06 | **Same thing, same word, same shape.** An action is always named the same ("Send" is never "Confirm" on one screen and "Submit" on another), and the same kind of content always takes the same form. | Decided | [UX] | F7 |

### Steady but adaptive

*Leila's concept, 26 Sept: the platform can change what it shows, and still feel steady,
because of two guarantees — what the advisor sets stays put, and what the platform changes, it
announces.*

| # | Rule | Status | Tag | Evidence |
| --- | --- | --- | --- | --- |
| ST-03 | **Today's card order can change daily, and always says why** in one line ("Clients first today: two reviews and a market move"). Nothing outside Today reorders itself. | Decided | [UX] | F7 |
| ST-07 | **What the advisor sets, stays.** An opened card, a pinned item, a sorted list stays that way until they change it. | Decided | [UX] | F7 |
| ST-08 | **Nothing re-ranks silently.** When the order inside a card changes, it says so, the same way ST-03 does for Today. | Decided | [UX] | F7 |
| ST-09 | **The advisor can pin the role order.** A pinned order overrides the daily reorder until they unpin it. | Decided | [UX] | F7 |

**Test:**
- [ ] If the advisor came back tomorrow, would the frame be exactly where they left it — and if
      anything did change, is the change and the reason for it visible?
- [ ] Does every colour, weight and position on this screen mean what it means everywhere else?
- [ ] Is anything the advisor set by hand now different, without them having changed it?

---

## 4 · Catch what slips

> **Promise** *(confirmed 26 Sept)*: It keeps watch over your
> business and your clients, and brings you what's slipping as help, never as pressure — a
> check-in you can rely on.

| # | Rule | Status | Tag | Evidence |
| --- | --- | --- | --- | --- |
| CS-01 | **Pay yourself first.** Growth work always has its own place: the prospecting and business development card is always on Today, so a busy client day never pushes it off. | Decided | [PO] | F1 |
| CS-02 | **About the situation, never the advisor.** "Nadia Constantin's proposal has been with her accountant for two weeks," never "you haven't prospected this week." | Decided | [UX] | F4 |
| CS-03 | **A signal arrives with its next step.** Every signal says what happened, how the platform knows, and one suggested action. If automation is available for that task, the next step comes already drafted. *(TR-09 merged in — see note.)* | Decided, changed | [UX] | F4 |
| CS-04 | **Say it once.** A suggestion waits in its place and comes back only when something changes (a new signal, a real deadline), not because a day passed. | Decided | [UX] | F6 |
| CS-05 | **Always answerable:** Do it · Not now (the advisor picks when) · Not this (optional reason, which teaches the ranking). **The advisor decides how their tasks and to-do list are organised.** | Decided, changed | [UX] | F7 |
| CS-06 | **Planning moments by default.** Suggestions surface in the morning and between meetings — never mid-task, never during a client meeting. **Two exceptions, both chosen by the advisor:** practice sessions (simulated client conversations), and live suggestions while writing, when switched on. | Decided, changed | [UX] | F6 |
| CS-07 | **Quiet.** No red badges, no piling-up counts, no streaks, no guilt words. Red is only for the truly time-critical. | Decided | [UX] | F6, product rule 5 |
| CS-08 | **The advisor's goals, and the firm goals they connect to, rank the list.** The advisor states what matters ("four new clients this quarter"); a suggestion may cite that goal as its reason, and never reports a shortfall. | Decided, changed | [PO] | F1 |
| CS-09 | **What counts as slipping** (starting list, and it grows as research comes in): unanswered prospect replies · prospects quiet 45+ days · the referral window after a strong review · clients quiet 60+ days · life events · stalled onboarding. | Decided | [PO] | F1, F4 |

*On TR-09 — you asked whether it belongs under Focused.* I'd put it here, merged into CS-03.
"A signal arrives with its next step" and "it arrives half-done" were the same rule written
twice, and both are about how things that slip get surfaced. Focused already covers the
screen-level version in FO-09 (meaning first, then a suggested action). *(Leila agreed.)*

**Test:**
- [ ] Is every suggestion about a person or a thing, with its next step attached?
- [ ] Can every suggestion be answered in one step?
- [ ] Has anything appeared twice without something having changed?

---

## 5 · A member of your team

> **Promise** *(confirmed 26 Sept)*: It learns how your firm speaks, looks and what it
> stands for, and works like a colleague who knows the house style, but never signs for you.

| # | Rule | Status | Tag | Evidence |
| --- | --- | --- | --- | --- |
| TM-01 | **Drafts sound like the advisor who will send them — a colleague, never a signatory.** It never sends, signs or speaks for the advisor unasked. *(TM-05 merged in.)* | Decided, changed | [UX] | F5, F3 |
| TM-02 | **The platform is where the firm sets its brand.** Brand standards and branded templates are built and kept here, and client-facing materials carry them. Marketing materials go through compliance review before they're built (GP-06 to GP-10). | Decided, changed | [UX] | — |
| TM-03 | **It learns in the open.** When it adjusts to how the advisor writes or works, it says so once ("You shorten my sign-offs, so I've started doing that"), and the change can be undone. | Decided | [UX] | F7 |
| TM-07 | **Firm brand, personal voice.** Brand, values and templates are set once for the whole firm; personal communication is written in the individual advisor's own voice, inside that brand. | Decided | [PO] | — |

**Test:**
- [ ] Would a client reading this message believe the advisor wrote it, and would the advisor
      be comfortable that they believe it?
- [ ] Is there anything here the platform said or sent on the advisor's behalf without their yes?

**Evidence status:** voice and brand never came up in the directional study, so this is
untested with advisors. It has, though, drawn strong enthusiasm from stakeholders whenever it
was presented. That's worth recording, and it's worth being clear that it is a stakeholder
signal, not user evidence. **Leila: bring this back when the next round of user testing and interviews is planned.**

---

## Open decisions

| # | Question | Tag | Status |
| --- | --- | --- | --- |
| 1 | Confirm or rewrite the five promises | [UX] | **Confirmed**
| 2 | Can the advisor pin the role order? | [UX] | **Yes** → ST-09 |
| 3 | What counts as time-critical? | [UX] | **Answered** → FO-04 |
| 4 | Whose voice in a multi-advisor firm? | [PO] | **Firm brand, personal voice** → TM-07 |
| 5 | The mirror: in this POC or later? | [PO] | **Later** (parked) |
| 6 | Does the Firm view show Dana her own four role cards, or the firm's operations? | [UX] | **The firm's operations** — built 29 Sept. See `UX_IA.md` §1 |
| 7 | Where does *Next best action* go? | [UX] | **Inside the role cards** → FO-11 |
| 8 | TR-10 (insight names its source) — keep? | [UX] | **Kept** |

## Retired rule numbers

| # | What happened |
| --- | --- |
| TR-05 | Moved to Focused as FO-10 |
| TR-09 | Merged into CS-03 |
| TM-04 | Cut (goals are covered by CS-08) |
| TM-05 | Merged into TM-01 |
| TM-06 | Cut from this POC — the mirror is parked for later |

## Parked for later

- **The mirror** — comparing how the firm presents itself with what it actually does for
  clients. Leila: later. If it returns: principal only, private, quarterly, phrased as a
  question, never a score.

## Next

1. ~~Leila confirms the five promises and TR-10.~~ Done.
2. ~~Test the rules against Luke's current advisor **Today** screen. Each failure becomes an
   entry in `UX_REQUESTS.md`.~~ Done — see `UX_Today_test_v0-1.md`.
3. Wireframe Today by the four roles (UX-008), then the IA pass (`UX_IA.md`): the navigation spine, the four roles, and the three views.
