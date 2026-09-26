# UX research — what we know, and how well we know it

*Draft — not yet reviewed by Leila · v0.1 · 26 September 2026 · Owner: Leila Mitchell*

This is the evidence the experience is designed on. It gathers the September advisor study,
the published sources we lean on, and everything the team worked out between April and
August, so none of it is lost when the presentations it lived in go stale. Every finding
carries a tag saying how well we know it, because a hunch and an interview should never
look the same on the page.

Read §1 first. It is short and it changes how you read the rest.

---

## How to read the tags

| Tag | Means | Treat it as |
| --- | --- | --- |
| **HEARD** | Practising RIAs told us this directly (S1) | Evidence. Design on it |
| **SOURCED** | A published source we can cite | Evidence, with the source's limits |
| **UNSOURCED** | A number or claim in circulation with no citation behind it | A hypothesis wearing a statistic's clothes. Don't present it as fact |
| **OURS** | The team's own framing, principle or idea | A hypothesis to test in interviews |
| **MARKET** | What competitors ship or claim | Context, not user evidence |

Source codes (S1, S2…) are listed at the end.

---

## 1. The honest state of the evidence

- **One piece of primary research exists:** the directional study of seven practising RIAs,
  September 2026 (S1). It is small and directional, but it is the only place advisors speak
  for themselves.
- **One industry figure is properly sourced:** Cerulli Associates, 2025, on where an
  advisor's week goes (S2).
- **Everything from April to August is the team's own framing.** Personas, pain clusters,
  the journey map, the 15 agentic moments, the principles, the time-saved figures. Much of it
  is sharp and a lot of it has now been confirmed by S1, but until an advisor says it, it is
  OURS. Several numbers in the old decks read like industry statistics and have no source
  (§8).
- **Research is running now.** Surveys lead into interviews, then customer conversations and
  an in-person event. §9 lists what those should test.

**What this means for the design:** build firmly on HEARD and SOURCED. Treat OURS as the
best current guess, designed so it can be changed cheaply when interviews say otherwise.

---

## 2. Findings

### F1 · Winning clients is the constraint — and it gets the least time

- **HEARD.** "Across almost every interview advisors identified winning new clients and
  growing assets under management as their single biggest blocker. Not client service, not
  technology, not compliance." (S1)
  - *"The only thing that hasn't been automated, and it's the most critical too, is convincing
    potential prospects to become clients… It probably shouldn't be and it's the hardest
    thing."*
  - Given two free hours a day, one advisor would spend them prospecting — something they do
    very little of now because planning work fills the time. An early-stage advisor's barrier
    is "not competence but converting prospects into trusting clients."
- **SOURCED.** Prospecting is **8%** of the advisor's week (Cerulli 2025, S2).
- **OURS, now confirmed.** "Business development loses to client delivery every week — the
  urgent crowds out the important." (S8) The "open time" idea — hours that come back empty
  and get invested in growth (S13) — is exactly what S1's two-free-hours advisor describes.

**The connection:** the thing advisors name as their biggest problem gets 8% of their week.
The platform's clearest job is to move time *toward* prospecting, not just to save it.
Notice also the advisor's warning: prospect conversion "probably shouldn't be" automated.
The platform should free time for it and prepare the ground, and leave the persuading to the
person.

**For design:** growth work needs a place in the structure that matches its importance, and
the time the platform returns should visibly point somewhere — ideally at a prospect.

### F2 · The week is lost in the work around the meeting

- **SOURCED (S2, Cerulli 2025).** Only **22%** of the week is in client meetings. The rest of
  the "57% client-facing": financial planning 10% · preparing for meetings 10% · client
  service problems 9% · prospecting 8%. Administrative 22% (day-to-day operations 11%,
  practice management 6%, compliance 4%, other 1%). Investment management 17% (research 10%,
  trading and rebalancing 8%). Learning and growth 4%.
- **UNSOURCED.** "Meeting prep is often 3+ hours per client per quarter." Same client data
  "entered 3–5 times across tools." "30–60 minutes lost per workflow to switching." (S8, S12)
- **HEARD.** Advisors already use AI for meeting notes and email drafting and find it
  "a good productivity boost" (S1).

**For design:** preparation, follow-up and service problems are the biggest recoverable
blocks. Meeting prep and follow-up are where time comes back first.

### F3 · AI is welcome inside the firm. Anything that leaves it needs a human

- **HEARD, and consistent across every advisor (S1).**
  - AI-acceptable: internal documentation summaries · email drafts · research · reminders ·
    pattern detection · scheduling proposals.
  - Requires human sign-off: trade execution · account changes · client-facing
    communications · financial advice · compliance decisions.
  - *"Anything internal that I'm preparing for myself, I'm comfortable letting AI handle but
    when it comes to clients or when it's important to go externally, that's where I want
    more oversight."*
  - The study's own implication: "the advisor approval step [must be] explicit and easy, not
    an afterthought. Audit trails, version history, and clear source attribution are trust
    prerequisites."
- **OURS, now confirmed.** The earlier "trusted for / not trusted for (yet)" lists (S8) match
  S1 almost line for line. So does the build's first product rule: *a draft must never look
  like a sent message* (`DESIGNER-HANDOFF.md` §4).
- **OURS.** "If the approval UI is clunky, advisors skip it — and the system degrades into
  noise." (S10)

**For design:** the line between *internal* and *external* is the line advisors actually draw.
It is a better organising rule than "AI vs not AI." Approval has to be one easy, deliberate
step — never a formality, never a chore.

### F4 · A signal is only useful if it arrives with the next step

- **HEARD.** Advisors want life changes surfaced — job changes, relocations, new family
  members; divorce, inheritance, large transactions; birthdays, anniversaries, retirement
  horizon, children reaching college age; overspending, pay swings, side-income signals —
  and they want "the flag to come with the recommended action and outreach template (not
  raw data alone)." (S1)
- **OURS.** "'Client hasn't logged in for 67 days' is more actionable than 'Client may be
  disengaged.' Show the data." (S10) · Suggested tasks carry "a one-line rationale… never a
  list of unexplained nudges." (S11) · "One well-timed, precisely-contextual alert is worth
  ten generic nudges." (S10)
- **OURS.** Some true things should never surface: sensitive events never enter a draft, and
  a client going through a divorce gets a full automation clamp — "inspectable, with reasons."
  (S13)

**For design:** every signal is a small package — *what happened, how we know, one suggested
action, already drafted.* A signal without an action is noise. And some signals need a
restraint rule as well as a surfacing rule.

### F5 · Advisors already work with AI and with their own tools

- **HEARD (S1).** In active use: Microsoft Copilot and ChatGPT for summarising and drafting;
  AI-summarised earnings transcripts; built-in automation in planning platforms such as eMoney
  and RightCapital.
- **UNSOURCED.** The typical practice runs on 5–7 tools that don't share data (S9) — other
  documents say 3–5, 4–5, or 10+ (§8).

**For design:** these are not first-time AI users. The bar is set by tools they already like,
and the platform will sit next to their existing stack for a long time. It has to be better
than what they have *and* fit beside it.

### F6 · Attention is the scarce resource

- **SOURCED (internal research on attention, Oct 2025, S4).** "The more we multitask, the
  more we struggle to filter out distraction, identify relevant information, and hold
  information in our mind." Three levers it names: storytelling, streamlined learning,
  self-awareness tools.
- **SOURCED, commentary.** "Dashboards didn't die. They evolved into a conversation." (S5)
- **OURS.** "Honor cognitive load. Show one or two things, beautifully. Hide the rest until
  invited… a quiet room, not a stadium scoreboard." · "Available, not always visible." ·
  "Quiet is the default. If everything is loud, nothing is." (S11)
- **Not yet heard from advisors.** No advisor in S1 talked about overload directly. The build
  is already full (29 of 75 features working) and that is the pressure this finding answers,
  but it still needs testing.

**For design:** the default state is calm. Things earn their way onto the screen.

### F7 · Trust comes from predictability and a way back

- **SOURCED (S3, which cites NN/g State of UX 2026, Salesforce UX 2025 and Frontiers in
  Psychology 2026).**
  - Trust is built from three things: the app **shows** what it's doing, **explains why** in
    human terms, and gives you a way to **undo** it. Consistency is what sustains it.
  - Users need the environment to feel "understandable, predictable, and controllable";
    remove one and comfort turns to unease.
  - "More explanation is usually the wrong fix." Over-explaining reads as suspicion.
  - "Preview before committing, pause mid-flow, and always offer an undo." (Salesforce, via S3)
  - Redesigns cost trust: users "lose their navigational confidence."
  - *"Show what's happening. Explain why in one sentence, not a paragraph. Let people undo
    it. Be the same app tomorrow that you were today."*
- **OURS.** "Every action has a receipt… reprioritisation is visible, never silent." (S13) ·
  "Never silently re-sort the grid." · "Refresh is explicit." · Receipts offer
  "Approve / Edit / Undo." (S11)
- **HEARD, connected.** "Version history" is one of S1's named trust prerequisites — the
  advisors' version of *undo*.

**The tension to design through:** the earlier concept work is built on an **adaptive**
interface that "changes with the person, the time of day, and the mode of work" (S13). S3
says trust depends on being "the same app tomorrow." Both can be true only if the platform
adapts **what is in the rooms** and never **where the rooms are** — and says so whenever
something moves.

### F8 · Onboarding: the silence is the problem

- **OURS.** Account transfers take weeks; "days 10–20 are peak client anxiety and peak
  advisor inactivity." "There is nothing the advisor can legally do to move a transfer
  faster. The client interprets silence as neglect." (S9)
- **SOURCED, weakly.** "41% of advisors flag client onboarding as their #1 ops headache"
  (Betterment Advisor Solutions — year not given, S12/S15).
- **Not raised in S1.**

**For design:** during the transfer window the job is visibility, not speed — for the client
view as much as the advisor's.

### F9 · One person, three roles

- **OURS.** The advisor is planner, relationship manager and small-business owner at once —
  and on a spectrum from junior (wants the work shown) to senior principal (wants insight and
  time back). (S8)
- This maps partly onto the build's three views: the principal's **Firm** view is the
  business-owner role. **We have no research at all from the principal's seat or from
  clients.** Every HEARD finding is advisor-side.

---

## 3. Who we're designing for (all OURS unless marked)

- **The firm.** Small independent RIA, fee-only, often solo or two-to-three people; 80–150
  client households. *UNSOURCED:* ~17,000 independent US firms, median ~$185M AUM, 70%+
  below the service threshold of enterprise platforms.
- **The advisor.** Three roles in one person (F9). Maturity spectrum: junior 0–3 years ·
  mid-career 3–10 · senior/principal 10+. *UNSOURCED:* median age mid-to-late 50s.
- **The client.** Mass-affluent household, $500K–$2M investable; working professional near
  retirement, recent inheritor, or business owner. Financially literate, not specialised.
  "Wants to feel heard before feeling analyzed." Reads silence as abandonment.
- **The build's cast** (use these in all work here): Dana (principal and advisor), Marcus
  (advisor), Grace (client).

## 4. The journey and the moments that matter (OURS, S9–S10)

Six phases, each with the emotional low point the team identified:

| Phase | Where it hurts | Moments (from the agentic moment library) |
| --- | --- | --- |
| Prospecting | Trust is forming — "Am I being sold to?" | 01 Prospect brief · 12 Pipeline re-engagement (45+ days quiet) |
| Onboarding | The silent transfer window | 02 Onboarding friction monitor |
| Discovery and plan | Vulnerability peak; "too many numbers, not enough story" | 03 Discovery call synthesis · 04 Risk-profile mismatch (stated vs revealed) |
| Ongoing relationship | Silent drift | 05 Meeting prep package · 06 Quiet-client warning · 07 Market-event triage · 13 Compliance calendar · 14 Team capacity |
| Life event | Urgency mismatch — "usually learned via client call, not system" | 08 Life-event signal · 09 Rapid plan adjustment |
| Review and growth | Loyalty test; the referral moment at peak satisfaction | 10 Annual review package · 11 Referral spotter · 15 Revenue-concentration monitor |

Every moment was designed at "sense and synthesise" or "sense and recommend." None acts on
its own. That matches F3 exactly.

## 5. The market, as of September 2026 (MARKET)

- The field is compressing the same slice: **meeting intelligence, "ask your book," and
  email AI.** Jump (31K+ advisors; notes, summaries, CRM update), Zocks (5K firms; extracts
  client details from conversations), Altruist's Hazel (custodian-embedded AI), Robinhood
  Cortex (knowledge copilot, 2026). (S13, S14)
- **Vanguard's acquisition of Altruist**, announced 26 August 2026 (~$4B reported, up to $5B
  per Forbes), was read as validation, consolidation and a clock: advisors may get their AI
  from whoever holds custody. (S13)
- **What nobody ships yet** (S13, S14): a prioritised operating day · execution through
  custody · restraint and trust rules.
- Incumbent pattern: "Orion plus an AI assistant. Black Diamond plus chat. Wealthbox plus
  AI." A chat panel on top of a dashboard. (S11)

**The connection:** F3 and F7 say trust is the thing advisors need before they'll let AI near
anything external. "Restraint and trust rules" is the row nobody in the market claims. The
trust commitment is also a market position.

## 6. Principles carried forward from earlier work (OURS)

Kept verbatim so they aren't lost. These fed the commitments; they are not the commitments.

**From the research foundation (S8)** — *the RIA is in control* · *transparency over magic*
· *seamless, not intrusive* · *quality over quantity* · *the human relationship is the
product.* Plus: "Any automation we add must make human moments better, not rarer."

**From the UX concept (S11)** — *intent over exploration* · *adaptive over responsive* ·
*storytelling over data dumps* · *honor cognitive load* · *author, not autopilot.*

**From the earlier design system (S11)** — *intent over information* · *the advisor is always
the author* · *quiet is the default* · *structure, not rigid.* ("Always one tap away" for the
prompt bar and "atmospheric, not functional" belonged to the retired interface.)

**How Might We (S8)**
1. …lose the operational drag so that both open time and enhanced time return to the RIA?
2. …unify the fragmented tool stack into one workflow that is dynamic — "neither too
   overwhelming nor too limited"?
3. …give the RIA X-ray clarity on clients and portfolios, with insight, anticipation and best
   next steps, while keeping the choice of action and the advice in the advisor's hands?
4. …make the RIA's own practice as systematic as the client work it supports?

**Other lines worth keeping** — "Reduce the cost of remembering, not the frequency of review."
· "Speed equals trust — not because the answer has to be immediate, but because the
acknowledgment has to be." · "Accuracy ≠ surfaceability." · "The behavior is the deliverable;
the screen is the by-product." · Every widget must say "when it appears, when it recedes, what
it says if there is nothing to surface, what it does if the model is uncertain."

## 7. Research against the 75 features

A cross-check of what advisors asked for against Luke's requirements (S16). Not a cut list —
a map of where the evidence is strong, thin, or silent.

| Finding | Features that answer it | Read |
| --- | --- | --- |
| F1 Winning clients | GP-01 matching · GP-02 referral tracking · GP-03 proposals · GP-04 portfolio proposals · GP-05–10 content and materials · Prospects section | **Thinnest where it matters most.** 4 of 10 growth features have an API operation; 5 of the content ones are on the regulatory list. No feature is named for *prospect outreach* itself |
| F2 Work around the meeting | MEET-01 to MEET-07 · PO-01 daily digest | Strong — 7 of 8 meeting features have operations. PO-01 digest has none |
| F3 Human sign-off | X-03 human in the loop · X-04 source citation · X-05 audit trail · the drafts rule | Strong. **Gap: nothing names undo or version history,** which S1 lists as a trust prerequisite |
| F4 Signal plus next step | COMM-04 client monitoring · PO-03 priority alerts · PL-02 next best action | **Gap: life-event detection is not a named feature,** though it's one of S1's three clearest asks |
| F5 Their existing tools | IP-02 CRM · IP-03 email · MEET-08 CRM update · PO-09 multi-custodian · PL-01 planning agent | All waiting on a data source. Planning-platform integration (eMoney, RightCapital) isn't in the list |
| F6 Attention | IP-09 unified dashboard · PO-01 digest | Mostly a UX question, not a feature |
| F7 Predictability and undo | X-15 view switcher · audit trail | A UX question. See F3 gap |
| F8 Onboarding | AX-01 intake · AX-02 tracker · AX-04 · AX-03 document intelligence | Tracker exists; AX-03 has no operation |

**Features no finding touches yet** — validate in interviews before investing design time:
PO-12 cap table and ownership · PM-04 robo portfolio · RTI-01 credit risk · RTI-09 advisor
value quantification · GP-08 podcasts · COMM-05 sentiment index · AX-05 to AX-07 practice
conversations and coaching (the earlier "coaches the advisor" idea is OURS, not HEARD).
**PM-05 placing a trade** is squarely in S1's human-sign-off list: allowed only as a
deliberate advisor action, never a suggestion that completes itself.

## 8. Numbers in circulation, and whether to use them

| Figure | Where it came from | Status |
| --- | --- | --- |
| 22% of the week in client meetings (57/22/17/4 split) | Cerulli 2025 | **Use.** Sourced |
| Prospecting 8% of the week | Cerulli 2025 | **Use.** Sourced |
| Vanguard–Altruist, ~$4B, 26 Aug 2026 | Press, Forbes | **Use.** Public |
| Jump 31K+ advisors · Zocks 5K firms | Competitor matrix | Use with the matrix as source |
| 41% say onboarding is #1 ops headache | Betterment Advisor Solutions | Find the year before reusing |
| Advisor stress 23% above national norms | Schwab benchmarking | Year never confirmed. Don't use yet |
| 45% of the week on behind-the-scenes prep | Marked "source needed" in May | **Don't use** |
| ~17,000 firms · ~$185M median · 70%+ underserved | No source | **Don't use** until sourced |
| 3+ hrs prep per client per quarter | No source | Test in interviews |
| Tools per practice: 3–5 / 4–5 / 5–7 / 10+ | Four documents disagree | **Don't use.** Ask advisors |
| Transfer time: 10–30 days vs 5–10 business days | Two documents disagree | Ask advisors |
| "Today 70% admin → 90% enhanced" | May outline, not labelled | **Ambition, not data.** Never present as measured |
| Time-saved per episode (≈80 min/prospect, ≈2 hrs/meeting…) | Projections; two decks disagree | Ambition. Label it so |

## 9. What the interviews should test next

1. **F1.** What does prospecting actually involve for them, week to week? Which part would
   they hand to software, and which must stay theirs?
2. **F3.** Where exactly is the internal/external line — is a drafted client email "internal"
   until sent? What would make approving feel fast *and* safe?
3. **F4.** Which life events do they learn about too late, and from where? What would a good
   suggested next step look like?
4. **F6.** Is overload real for them? Show a busy screen and a calm one.
5. **F7.** When a tool rearranges itself to help, does that feel helpful or unsettling? What
   do they need to be able to undo?
6. **F2 and §8.** Replace the unsourced numbers: prep time per client, tools in the stack,
   transfer times.
7. **Gaps.** Talk to at least one principal (Firm view) and, if approvals allow, one client
   (Client view). We have no evidence from either seat.
8. **Voice and brand (commitment 5).** Do advisors want drafts in their own voice, the firm's, or both? How do they feel about a platform that learns how they write? *(Leila, 26 Sept: bring back when the next round of interviews is planned. Stakeholders responded strongly; advisors haven't been asked.)*
9. **The four roles on Today.** Do advisors recognise their week in prospecting, client work, business operations and professional development? Would they pin the order, or let it change daily?
10. **Navigation A/B test (parked, 26 Sept).** Show advisors both navigation options from the wireframe canvas: A — roles as tabs across the top; B — roles in the spine with tabs inside each role (the one being built). Which one tells them where they are? Which gets them to a prospect fastest?
11. **Pinned items.** Would advisors rather choose what's pinned, or have the platform suggest pins from their habits?

## 10. Retired — don't reuse

- The two-mode interface (a calm default plus an "everything" mode). No longer the product.
- The May timeline: design complete, a Q3 pilot, integrations by version. None happened.
- Hazel described as an independent startup. It is Altruist's.
- The earlier scenario cast. This repo uses Dana, Marcus and Grace.
- "The prompt bar is the most important affordance." Superseded; where the conversation
  lives is open (see Luke's `docs/query-surface.md`).

---

## Sources

| Code | Source | Kind |
| --- | --- | --- |
| S1 | Directional study, September 2026 — interviews with seven practising RIAs | HEARD |
| S2 | Cerulli Associates, 2025 — advisor time allocation | SOURCED |
| S3 | M. Phogat, "Why Users Trust Some Apps Instantly (And Others Never)," Medium, 2026 — https://medium.com/@mohitphogat/why-users-trust-some-apps-instantly-and-others-never-c38dbd868b8c | SOURCED (secondhand for the studies it cites) |
| S4 | Internal research on attention and focus, October 2025 | SOURCED (internal) |
| S5 | M. Malewicz, "The End of Dashboards and Design Systems," Medium, 2025 | Commentary |
| S6 | A. Chornyy, "The New UX Rules: How AI-Powered Recommendations Are Changing Design," Medium | Commentary |
| S7 | Leviathan, Valevski, Natchu, Matias, "Generative UI," Google Research, November 2025 | SOURCED |
| S8 | Team research foundation, April 2026 — personas, pain clusters, HMWs, principles | OURS |
| S9 | Journey map and discovery-process analysis, April 2026 | OURS |
| S10 | Agentic moment library (15 moments), April 2026 | OURS |
| S11 | UX concept and earlier design-system principles, April–May 2026 | OURS |
| S12 | Pitch and leadership presentations, May 2026 | OURS, with some UNSOURCED figures |
| S13 | Stakeholder presentation, September 2026 | OURS and MARKET |
| S14 | Competitor feature matrix, AI-layer tab, August 2026 | MARKET |
| S15 | Onboarding deep dive, May 2026 | OURS |
| S16 | Requirements inventory — `advisor-platform-mock/docs/feature-api-map.md` and `HANDOFF.md` §5 | Build |
