# Advisor Platform — Product Requirements, Full Build v0.2

Oct 26, 2026 · @Leila

This is the requirements document for the whole product: everything an advisor at a small RIA needs to win a client, plan with them, manage their money, serve them over decades, and run the firm around it. The POC is one phase inside it, not a separate product.

## How to read this

Each requirement carries an ID, a proposed phase, an AI lane and its source. The POC requirements doc (v0.1) becomes the POC slice of this one.

- **IDs** are grouped by stage of the relationship: PRO prospecting · ONB onboarding · PLN planning · INV money management · TAX · SVC ongoing service · LIFE life events · REV reviews and reporting · CLI the client's window · PRC running the practice · CMP compliance · DEV development · PLT platform. Where a v0.1 requirement carries over, its old ID is shown in brackets.
- **Phase** is a *proposal* for the product owner and the domain lead to set: **POC** (the demo path) · **v1** (the minimum a small firm could run its client work on) · **v1.x** (fast follows) · **v2** (later).
- **AI lane** follows the gateway: **Mech** (rules, no model) · **Model-L** (drafts or suggests; advisor reviews) · **Model-H** (client-facing, money movement or advice; named case) · **None**.
- **Source** says how well we know it: **F1–F14** heard from advisors or framed in the research · **C1–C9, B1–B7** the team's practice taxonomy · feature IDs (GP-02, PM-05…) from the build's 75-feature inventory as of 12 Oct · **Domain** — standard RIA practice, written from general knowledge and **to be validated by the domain lead**. Most of the money-management and compliance sections are Domain; treat them as a strong draft, not settled fact.

**Requirements describe what must be true, not screens.** Screens, flows and stories come from the journeys and the story map, and every story names its parent ID here.

## The long-term relationship

A client relationship is a loop that runs for decades. Each section of requirements below is one stage of it, and four foundations sit under every stage.

&#91;embedded content: the client relationship · 8 stages in a loop, 4 foundations\]

Serving and monitoring is where most of the advisor's hours go. Each review renews the plan and opens a referral moment, and a life event can send the household back to planning at any point.

## Users, roles and permissions

The advisor is the primary user. Five other roles need their own permissions, and the client side includes more than one person per household.

| Role | Who | Sees | Can do |
| --- | --- | --- | --- |
| **Advisor** | Marcus; Dana as advisor | Their own book, firm-wide content and templates | Everything for their clients; anything leaving the firm needs their yes |
| **Principal / owner** | Dana | Every advisor's book, firm revenue, compliance | Supervise, approve flagged items, set firm brand, fees and systems |
| **Operations / admin staff** | A firm's ops person | Assigned households' service work; no advice tools | Paperwork, transfers, service requests, billing runs — nothing client-facing without an advisor |
| **Compliance officer (CCO)** | Often the principal in a small firm | Communications, marketing, trades, logs, books and records | Review, approve, flag, export for an exam |
| **Client (primary)** | Grace | Their household's window: what the advisor approved | Read, message, request meetings, upload and sign documents, update details |
| **Household member** | A spouse or adult child | What the primary client and advisor grant | As granted, per account |
| **Trusted professional** | The household's CPA or attorney | Specific documents or reports, time-limited | View or upload what's shared; nothing else |

**PLT-01 (v1):** every role is enforced on the server, not just hidden in the interface. **PLT-02 (v1):** a firm of one can hold several roles in one login. **PLT-03 (v1.x):** delegated access for a household member or professional is per item, revocable, and logged.

## Phasing

The phases build the relationship outward from the advisor's day: first the demo, then enough to run real client work, then the full practice.

| Phase | Promise | Must contain | Gate to enter |
| --- | --- | --- | --- |
| **POC** | One advisor's day, end to end, on synthetic data | The demo path (v0.1 doc): Today, prep, approval, referral to meeting, firm look, portal | Continue / pivot / stop at week 8 |
| **v1 — MVP** | A small firm can run its client relationships and growth on it, beside its custodian and existing planning tool | Prospecting, onboarding with transfers, households, monitoring and rebalancing with approval, meetings, reviews, client portal, billing, compliance records | Domain-lead sign-off on workflows; compliance sign-off on records and approvals; live custodian connection |
| **v1.x** | Fewer tools in the stack | Planning built in, tax opportunities, life events, the X-ray, multi-custodian, delegated access | Research shows which tool advisors would drop first |
| **v2** | The whole practice | Practice valuation and succession, community, advanced tax and estate, alternatives | Product-market fit at v1 |

**The cut line that matters most:** v1 depends on a live custodian connection and a compliance-approved records model. Neither exists in the open lane, which is why the closed-lane work is on the critical path from day one.

## Pillars and build path

The requirements are grouped by stage of the relationship; the offsite pillars group the same requirements by advisor outcome. Both views point at the same IDs. The pillars below are the draft going into the offsite and will be updated after it.

| Draft pillar | Requirement groups | Note |
| --- | --- | --- |
| **The canopy layer** (across all pillars) | PLT-07 intelligence layer, PLT-09 receipts and confirm, PLT-05 activity log, LIFE-01/03/04 restraint, SVC-01 Today | What makes the product different: one prioritised day, every moment prepared, restraint |
| **1. Grow the practice** | PRO-01 to PRO-16 | Prospecting through conversion |
| **2. Plan and manage the money** | PLN · INV-01 to INV-06, INV-08 to INV-11, INV-14 · TAX | The advisor's intent on top of the portfolio platform; trades only on the advisor's action |
| **3. Deepen client relationships** | ONB, SVC, LIFE, REV, CLI | Onboarding, service, life events, reviews, the client's window |
| **4. Run the firm** | PRC, CMP · INV-07, INV-12, INV-13 | Back office, billing, supervision, the principal's view |
| **5. Grow the advisor** | DEV | The enhanced-time differentiator |
| **Roots** | PLT (other), NFR, the data model, integrations | The portfolio and custody platform, unified data, security and records |

**Build path.** Each requirement will also carry where it comes from: **Reuse** (the existing portfolio platform), **Third party**, or **Build new**, with **AI** marked separately by the AI lane already in each table. These are filled in from the offsite's jobs-to-be-done matrix, not guessed here. Until then, treat custodian-facing requirements (account opening, transfers, trading, money movement, fee deduction) as *Reuse, to confirm*.

## Non-negotiables

The rules in the POC doc hold for the whole product, at every phase.

- **The internal / external line.** The platform may prepare anything inside the firm. Anything leaving it — a client message, a trade, an account change, advice, a compliance decision — needs the advisor's explicit yes.
- **The five product rules.** A draft never looks sent · AI output shows its sources and timestamp · uncertain data is marked as an estimate · the client sees only what an advisor approved · a rise knows whether it is good.
- **The five UX commitments.** Focused · Trust · Steady · Catch what slips · A member of your team (41 rules).
- **Financial separation.** Recommendations compute only from financial data; life and relationship data set priority and tone, never the recommendation.
- **Restraint is a feature.** Confirmed-only surfacing, sensitivity tiers, per-client clamps, and visible "held" records.
- **No autonomous action in v1 or v2.** Every capability stops at *sense and recommend*. Acting on its own is a future question, decided per capability, with compliance.

## Prospecting and client acquisition

Winning clients is the advisor's binding constraint and gets 8% of the week; the platform prepares the ground and leaves the persuading to the person (F1, F14).

| ID | Requirement | Phase | AI | Source |
| --- | --- | --- | --- | --- |
| PRO-01 | A prospect record carries its referrer — who, their relationship to the firm, what they said | POC | Mech | F10 · GP-02 (v0.1 PRO-01) |
| PRO-02 | Warm items lead growth work: referral in, reply received, then stalled, then cold | POC | Mech | F10 · CS-01 (v0.1 PRO-02) |
| PRO-03 | An evidence ledger on every prospect — agreed to meet, replied within, referred by, outside accounts, time spent — never a score | POC | Mech | F12, F13 (v0.1 PRO-03) |
| PRO-04 | A pipeline with stages the firm can name; moving a stage is logged | v1 | Mech | B4 |
| PRO-05 | Import prospects from a CRM or list, de-duplicated against existing clients and prospects | v1 | Mech | B3 · IP-02 |
| PRO-06 | Prospect brief before a first meeting: referral context, what's known, open questions; a low-confidence inference appears only as a question | v1 | Model-L | B4, moment 01 |
| PRO-07 | Outreach and follow-up drafts in the advisor's voice, sent only on their yes | v1 | Model-L | F14 · COMM-01 |
| PRO-08 | Nurture: newsletter and content to prospects within compliance-approved content; a reply surfaces as warm | v1.x | Model-L | F10, F14 · GP-06–10 |
| PRO-09 | Re-engagement for prospects quiet 45+ days, with a drafted reason to reconnect | v1 | Mech + Model-L | CS-09, moment 12 |
| PRO-10 | Referral partners (CPAs, attorneys) tracked with what each has sent and received | v1.x | Mech | B3 |
| PRO-11 | Proposal: a fee proposal and an illustrative portfolio proposal, reviewed by the advisor before it goes out | v1 | Model-L | GP-03, GP-04 |
| PRO-12 | Fee agreement and engagement letter sent for e-signature from the proposal | v1 | Mech | B4 |
| PRO-13 | Convert to client in one step, carrying everything known into onboarding | v1 | Mech | (v0.1 PRO-04) |
| PRO-14 | Thank the referrer when the new client funds, as a draft | v1 | Model-L | F10 (v0.1 PRO-05) |
| PRO-15 | Signals of money in motion (a liquidity event, an unhappy prior provider) surface only under the restraint rules | v1.x | Mech | F14, F4 |
| PRO-16 | Advisor–prospect fit across advisors in a multi-advisor firm | v1.x | Mech | GP-01 |

## Onboarding and account opening

The goal of onboarding is a client who never feels ignored, and assets that arrive intact with their cost basis. During a transfer the job is visibility, not speed (F8).

| ID | Requirement | Phase | AI | Source |
| --- | --- | --- | --- | --- |
| ONB-01 | One onboarding record per new household, created on conversion, with a checklist the firm can configure | v1 | Mech | AX-02 · C1 |
| ONB-02 | Intake: gather personal, financial and account details once and reuse them everywhere; pre-filled fields are marked as pre-filled | v1 | Mech + Model-L | AX-01 · C2 (T3) |
| ONB-03 | Identity verification and anti-money-laundering checks recorded on the household | v1 | Mech | Domain |
| ONB-04 | Required disclosures delivered and acknowledged before or at signing (Form ADV Part 2, Form CRS where it applies, privacy notice), with dates kept | v1 | Mech | B2 · Domain |
| ONB-05 | Account opening at the custodian for each account type the firm supports (individual, joint, IRA, Roth, trust, entity) | v1 | Mech | C2 · Domain |
| ONB-06 | Beneficiaries and a trusted contact captured per account | v1 | Mech | C2 · Domain |
| ONB-07 | Transfers in (ACAT and non-ACAT) tracked asset by asset, with status in plain words for advisor and client | v1 | Mech | C2 (T4) · F8 |
| ONB-08 | Transfer exceptions diagnosed with a suggested fix | v1.x | Model-L | C2 (T6) |
| ONB-09 | In-kind or sell: a position-by-position view of tax impact before the decision | v1.x | Mech | C2 (T2) |
| ONB-10 | Cost basis captured and checked when assets arrive | v1 | Mech | C2 (T7) |
| ONB-11 | Proactive client updates at each transfer milestone, as drafts the advisor can let run on a schedule they set | v1 | Model-L | F8 · C2 (T5) |
| ONB-12 | Document intake: read uploaded statements and forms, extract fields as *proposed*, flag gaps | v1.x | Model-L | AX-03 · C2 (T1) |
| ONB-13 | Billing set up from the signed fee agreement | v1 | Mech | C2 |
| ONB-14 | A first-90-days plan: welcome, introductions, check-ins, scheduled automatically and visible to the client | v1.x | Mech | C1 |
| ONB-15 | Onboarding completion brief that closes the loop for advisor and client | v1.x | Model-L | C2 (T8) |

## Discovery and financial planning

Discovery is the vulnerability peak: the client wants to feel heard before feeling analysed. The plan turns their story into goals, numbers and an investment policy both sides sign.

| ID | Requirement | Phase | AI | Source |
| --- | --- | --- | --- | --- |
| PLN-01 | Discovery notes captured in the meeting record; the platform proposes goals, concerns, family and timeline from them, the advisor confirms | v1 | Model-L | C1 · moment 03 |
| PLN-02 | A "what I heard" summary to the client, drafted from discovery, sent on the advisor's yes | v1 | Model-L | C1 |
| PLN-03 | Goals as records: what, when, how much, priority, owner in the household | v1 | Mech | C3 |
| PLN-04 | Balance sheet: assets and liabilities, including accounts held elsewhere, with source and as-of date on every figure | v1 | Mech | C3 · C8 |
| PLN-05 | Cash flow: income, spending, savings, with estimates marked as estimates | v1.x | Mech | C3 |
| PLN-06 | Risk profile: questionnaire results (stated) shown beside behaviour and capacity (revealed), with a mismatch flagged for discussion | v1 | Mech | moment 04 · C1 |
| PLN-07 | Investment Policy Statement: drafted from goals, risk and constraints; versioned; signed by advisor and client | v1 | Model-L | C1 |
| PLN-08 | Retirement projection and goal probability — in v1 via the firm's existing planning tool; built in from v1.x | v1 · v1.x | Mech | C3 · PL-01 |
| PLN-09 | Scenarios: retire early, job loss, a large purchase, a death — compared side by side | v1.x | Mech | C3 · RTI-06 |
| PLN-10 | Social Security claiming comparison | v1.x | Mech | C3 |
| PLN-11 | Insurance review: life, disability, long-term care coverage against need | v2 | Mech | C3 |
| PLN-12 | Estate review: will, trust, power of attorney, health-care proxy — what exists, its date, who holds it | v1.x | Mech | C3 |
| PLN-13 | Employer benefits and equity compensation (401(k), RSUs, options, ESPP) captured and scheduled | v1.x | Mech | C3, C5 |
| PLN-14 | The plan as a living record, not a PDF: every change versioned with who changed it and why; a client-ready plan document generated from it | v1 | Mech + Model-L | C4 · RTI-10 |
| PLN-15 | Plan presentation: a client-facing view that tells the story before the numbers | v1.x | Model-L | journey phase 2 |

## Money management

The advisor decides and the platform does the arithmetic. Every trade is a deliberate advisor action. Nothing executes itself, and every recommendation computes only from financial data.

| ID | Requirement | Phase | AI | Source |
| --- | --- | --- | --- | --- |
| INV-01 | Accounts, positions, balances and cash per household, from the custodian, with an as-of time | v1 | Mech | PM-01 · C4 |
| INV-02 | Model portfolios: the firm builds, versions and retires models; each has targets, tolerance bands and a rebalance cadence | v1 | Mech | PM-03 · C4 |
| INV-03 | Assign a model to an account or household; compare current to proposed in points and money; assigning never trades (v0.1 HH-03) | POC | Mech | PM-02 |
| INV-04 | Drift monitoring against each account's model and bands; planned drift (a scheduled transition) is flagged and raises no alert | v1 | Mech | C4 |
| INV-05 | Rebalance proposals generated for drifted or due accounts, tax-aware, respecting restrictions; shown as proposals for review | v1 | Mech | C4 |
| INV-06 | Trading: orders built from an approved proposal, reviewed in one place, placed only on the advisor's explicit action, with a pre-trade check and a record | v1 | Mech | PM-05 · F3 |
| INV-07 | Block trades and fair allocation across accounts | v1.x | Mech | Domain |
| INV-08 | Restrictions per account: securities to avoid, values screens, holdings not to sell | v1 | Mech | C4 |
| INV-09 | Cash management: minimum cash per account, upcoming distributions and fees reserved | v1 | Mech | C4 |
| INV-10 | Concentrated positions identified, with a diversification plan the advisor can schedule | v1.x | Mech | C4 |
| INV-11 | Held-away accounts (401(k)s, outside brokerage) aggregated read-only and counted in allocation | v1.x | Mech | C8 · PO-09 |
| INV-12 | Multiple custodians in one view | v2 | Mech | PO-09 |
| INV-13 | Reconciliation: platform records match the custodian's daily; breaks are listed for ops | v1 | Mech | C4 |
| INV-14 | Market-event triage: after a move, households most affected are ranked and outreach is drafted | v1.x | Mech + Model-L | moment 07 · C7 |
| INV-15 | Alternatives and private investments recorded with manual valuations, clearly marked | v2 | Mech | C4 |
| INV-16 | Research and due-diligence notes on funds and securities in the firm's approved list | v2 | Model-L | C4 |
| INV-17 | Automated portfolio management ("robo") | Held | Model-H | PM-04 — on the regulatory review list |

## Tax planning

Tax work is one of the clearest ways an advisor shows value over free tools. The platform finds the opportunities and does the arithmetic; the advisor and the client's CPA decide.

| ID | Requirement | Phase | AI | Source |
| --- | --- | --- | --- | --- |
| TAX-01 | Tax-loss harvesting candidates with replacement suggestions and wash-sale checks across the household's accounts | v1.x | Mech | RTI-05 · C5 |
| TAX-02 | Required minimum distributions calculated, scheduled and tracked to completion | v1 | Mech | C5, C8 |
| TAX-03 | Roth conversion analysis across several years and brackets | v1.x | Mech | C5 |
| TAX-04 | Capital gains budget per household for the year, respected by rebalancing | v1.x | Mech | C5 |
| TAX-05 | Charitable giving: donor-advised fund, qualified charitable distribution and appreciated-stock options compared | v2 | Mech | C5 |
| TAX-06 | Tax documents read and key figures extracted as *proposed* for the advisor to confirm | v2 | Model-L | IP-10 · RTI-02 |
| TAX-07 | CPA collaboration: share reports and receive returns through the household's documents, with access logged | v1.x | Mech | C5 |
| TAX-08 | Year-round opportunity list per household, each with its estimated value and its source | v1.x | Mech | RTI-04 |
| TAX-09 | Client-facing tax explanations in plain language, approved by the advisor before sharing | v1.x | Model-L | RTI-08 |
| TAX-10 | AI-generated tax strategies | Held | Model-H | RTI-03 — on the regulatory review list |

## Ongoing relationship and service

This is the long middle of the relationship, where most of an advisor's hours go. The aim is to reduce the cost of remembering, not how often the advisor reviews.

| ID | Requirement | Phase | AI | Source |
| --- | --- | --- | --- | --- |
| SVC-01 | Today by four roles, one action each, one lead, a reason when the order changes (v0.1 TOD-01/02) | POC | Mech | F1, F6, F9 |
| SVC-02 | Meeting prep brief assembled from the household, with an honest receipt (v0.1 MTG-01) | POC | Mech + Model-L | F2 · MEET-01 |
| SVC-03 | Agenda drafted per meeting, shared with the client on the advisor's yes | v1 | Model-L | MEET-02 |
| SVC-04 | Meeting record: notes, recording and transcript only with client consent on file; summary drafted | v1 | Model-L | MEET-04–06 |
| SVC-05 | Next steps proposed from the record, added as follow-ups tagged with their origin (v0.1 MTG-03) | POC | Model-L | MEET-07 |
| SVC-06 | One Inbox for messages, drafts to approve and follow-ups; every item also on the person's record (v0.1 INB-01) | v1 | Mech | IA |
| SVC-07 | Drafting in the advisor's voice within the firm's brand; rewrite and tone help (v0.1 INB-03) | POC | Model-L | COMM-01, 02 |
| SVC-08 | One confirmation for anything leaving the firm — to, from, attachments, whether it can be recalled (v0.1 INB-02) | POC | None | F3 |
| SVC-09 | Service requests — address change, distribution, contribution, beneficiary change — tracked from request to done, with who did each step | v1 | Mech | C8 |
| SVC-10 | Money movement out of an account requires verified instructions and a second check above a firm-set threshold | v1 | Mech | Domain |
| SVC-11 | Quiet-client warning: no contact in 60+ days, with a drafted check-in | v1 | Mech + Model-L | CS-09 · moment 06 |
| SVC-12 | Proactive touches: birthdays, anniversaries, milestones, on the advisor's terms | v1.x | Mech | C7 |
| SVC-13 | Firm content library: approved articles the advisor can attach to a message | v1 | Mech | GP-06, 07 |
| SVC-14 | CRM sync, so firms keep their CRM as the record while working here | v1 | Mech | MEET-08 · IP-02 |
| SVC-15 | Client satisfaction pulse after reviews, private to the firm | v2 | Mech | C7 |

## Life events

Advisors want life changes surfaced with the next step attached (F4). Being first to call is what keeps a client, and the restraint rules matter most here.

| ID | Requirement | Phase | AI | Source |
| --- | --- | --- | --- | --- |
| LIFE-01 | Life events as records with a lifecycle: proposed → confirmed → dismissed or suppressed; only confirmed can drive an item or a draft | v1 | Mech | Spine §B5 |
| LIFE-02 | Events extracted from notes and messages are always *proposed*, with quote, source and confidence | v1.x | Model-L | C6 · moment 08 |
| LIFE-03 | Sensitivity tiers on every event: normal, high, highest; highest never enters a client-facing draft | v1 | Mech | Spine §B5 |
| LIFE-04 | Per-client automation clamps (e.g. during a divorce) that override every default, visibly | v1 | Mech | Spine §B5 |
| LIFE-05 | A confirmed event creates a checklist from what it means for the plan (a sale: liquidity, tax, reinvestment; a death: survivor benefits, titling, beneficiaries) | v1.x | Mech + Model-L | C6 |
| LIFE-06 | Rapid plan adjustment: the event's effect on goals and projections shown before the meeting | v1.x | Mech | moment 09 |
| LIFE-07 | Death of a client: estate-administration workflow — account retitling, beneficiary claims, survivor's household continued | v1 | Mech | C8 · Domain |
| LIFE-08 | Divorce: asset division and account split workflow | v1.x | Mech | C6 · Domain |
| LIFE-09 | Diminished capacity or suspected exploitation: a way to record concern, contact the trusted contact and hold disbursements under firm policy | v1 | Mech | Domain |

## Reviews, reporting and performance

The annual review is the loyalty test and the referral moment. Reporting should tell a story the client can follow, with numbers they can trust.

| ID | Requirement | Phase | AI | Source |
| --- | --- | --- | --- | --- |
| REV-01 | Review cadence per household (annual, semi-annual, quarterly) with reviews scheduled and tracked | v1 | Mech | C7 |
| REV-02 | Annual review package: progress against goals, allocation and drift, performance, fees paid, beneficiary and titling check, IPS check, suggested agenda | v1 | Mech + Model-L | moment 10 · C7 |
| REV-03 | Performance: time-weighted and money-weighted returns by account and household, net and gross of fees, against a chosen benchmark | v1 | Mech | C4 · Domain |
| REV-04 | Client reports generated from approved templates, approved by the advisor before release to the portal | v1 | Mech | RTI-10 |
| REV-05 | Suitability re-check at each review: has anything in the profile, goals or IPS changed? Recorded either way | v1 | Mech | Domain |
| REV-06 | Annual beneficiary and account-title review recorded | v1 | Mech | C8 |
| REV-07 | Referral window: after a strong review, a prompt to the advisor (never to the client) | v1.x | Mech | moment 11 · CS-09 |
| REV-08 | A plain-language explanation of performance in a market move, drafted for the advisor to send | v1.x | Model-L | C7 |
| REV-09 | Quantified value of the advice (tax saved, behaviour coaching) | Held | Model-H | RTI-09 — on the regulatory review list |

## The client's window and the household

The client gets a window onto what their advisor does for them, not a second product. Everything in it was approved by the advisor, and it should never leave the client facing silence.

| ID | Requirement | Phase | AI | Source |
| --- | --- | --- | --- | --- |
| CLI-01 | The client sees only what an advisor approved (v0.1 CLI-01) | POC | None | Product rule 4 |
| CLI-02 | Home: what's new, what's next (next meeting, open requests), accounts and balances with an as-of time (v0.1 CLI-02) | POC | Mech | AX-12 |
| CLI-03 | Request a meeting in their own words and offered times; everything typed reaches the advisor (v0.1 CLI-03) | POC | Mech | MEET-03 |
| CLI-04 | Secure messages with the advisor, kept in the firm's records | v1 | Mech | B2 |
| CLI-05 | Document vault: statements, reports, plan, IPS, agreements; upload and e-sign | v1 | Mech | AX-12 · B1 |
| CLI-06 | Goals and plan progress in plain language | v1.x | Mech | C4 |
| CLI-07 | Onboarding and transfer status, asset by asset | v1 | Mech | F8 · ONB-07 |
| CLI-08 | Fees as one clear schedule: what was charged, when, how it was calculated | v1 | Mech | AX-10 |
| CLI-09 | Update personal details and preferences; changes the advisor must verify are marked pending | v1 | Mech | AX-12 |
| CLI-10 | Household access: each member sees their own accounts and what they're granted on joint ones | v1.x | Mech | C9 |
| CLI-11 | Professional access for the household's CPA or attorney, time-limited, per item | v1.x | Mech | C5 |
| CLI-12 | Next-generation: an adult child can be introduced with their own login, without seeing their parents' data unless granted | v2 | Mech | C9 |
| CLI-13 | Firm branding on everything the client sees | v1 | Mech | TM-02 · GP-07 |

## Running the practice

The advisor is also a small-business owner, and most RIAs analyse their clients more carefully than their own firm. This area makes the firm as visible as a client's portfolio.

| ID | Requirement | Phase | AI | Source |
| --- | --- | --- | --- | --- |
| PRC-01 | Fee schedules: asset-based tiers, flat and planning fees, household aggregation for breakpoints, per-household exceptions | v1 | Mech | AX-11 · B6 |
| PRC-02 | Billing runs in advance or arrears, with pro-rating for flows; a review step before fees are deducted or invoiced | v1 | Mech | AX-10 · C8 |
| PRC-03 | Fee deduction at the custodian or invoice, with a fee record per household | v1 | Mech | C8 |
| PRC-04 | Revenue by advisor, tier and household; revenue concentration flagged | v1.x | Mech | B6 · moment 15 |
| PRC-05 | Firm overview by advisor; one advisor's book for the principal (v0.1 OPS-01/02) | POC | Mech | PO-06, PO-11 |
| PRC-06 | The X-ray: one-sentence reads on where value concentrates, where risk hides, where time went | v1.x | Mech + Model-L | PO-07 |
| PRC-07 | Team capacity: households per advisor and workload, and when to hire next | v1.x | Mech | moment 14 · B5 |
| PRC-08 | Tasks assigned across the team, with ownership and handoffs between advisor and ops | v1 | Mech | PO-02, PO-04 |
| PRC-09 | Playbooks: the firm's repeatable processes (onboarding, review, death of a client) as checklists | v1 | Mech | AX-09 |
| PRC-10 | Book transfer when an advisor leaves or retires: households reassigned with history intact | v1.x | Mech | B7 |
| PRC-11 | Continuity plan: who covers the principal's clients if they are incapacitated, recorded and reviewable | v1.x | Mech | B7 |
| PRC-12 | Practice valuation and succession planning | v2 | Mech | B7 |
| PRC-13 | Ownership and cap table | v2 | Mech | PO-12 |

## Compliance and supervision

Compliance has to be built in, not added later: if a record isn't kept at the moment the work happens, it can't be rebuilt for an exam. In a small firm the chief compliance officer is often the principal, so this has to be light to run.

| ID | Requirement | Phase | AI | Source |
| --- | --- | --- | --- | --- |
| CMP-01 | Books and records: every client communication, recommendation, trade, agreement and disclosure kept, unaltered, searchable and exportable for the retention period the firm's policy sets | v1 | Mech | B2 · Domain |
| CMP-02 | Communication review: the CCO reviews a sample or flagged set of outgoing messages, with outcomes logged | v1 | Mech | B2 |
| CMP-03 | Compliance flags on drafts, cleared by an authorised person where the flag lives, logged (v0.1 INB-05) | POC | Mech | F3 |
| CMP-04 | Marketing review: content and materials approved before they can be used with prospects or clients, with the approval kept | v1 | Mech | TM-02 · GP-06–10 |
| CMP-05 | Trade review: exceptions (restricted securities, out-of-model trades, large trades) flagged for supervision after placement | v1 | Mech | B2 |
| CMP-06 | Code of ethics: staff personal-holdings and trading reports, attestations and pre-clearance | v1.x | Mech | B2 |
| CMP-07 | Compliance calendar: annual Form ADV amendment, Form CRS updates, privacy notices, policy reviews, training | v1 | Mech | moment 13 · B2 |
| CMP-08 | Disclosure delivery tracked per client, with the date each version was delivered | v1 | Mech | B2 |
| CMP-09 | Complaints log, from receipt to resolution | v1 | Mech | Domain |
| CMP-10 | AI use disclosed to clients where the firm's policy requires it; every model output in client work kept with its sources | v1 | Mech | X-04 · X-05 |
| CMP-11 | Exam readiness: a pack of requested records produced from the system, not reconstructed | v1.x | Mech | B2 |
| CMP-12 | Continuing-education tracking for advisors' credentials | v1.x | Mech | B2 |
| CMP-13 | Vendor due diligence: which service providers hold client information, and their review dates | v1 | Mech | B2 · Reg S-P |

## Professional development and community

This is the enhanced-time half of the argument, and where no competitor is yet. Practice is private to the advisor.

| ID | Requirement | Phase | AI | Source |
| --- | --- | --- | --- | --- |
| DEV-01 | Rehearse a client conversation privately, beside the meeting, labelled as practice every turn (v0.1 MTG-02) | POC | Model-L | AX-05–07 |
| DEV-02 | Feedback after practice, private to the advisor | v1.x | Model-L | AX-07 |
| DEV-03 | Learning: compliance training and continuing education in one place | v1.x | Mech | CMP-12 |
| DEV-04 | A private scorecard of the advisor's own practice, with an opt-in anonymised peer lens | v2 | Mech | AX-08 |
| DEV-05 | Community: threads and roundtables with other advisors | v2 | None | Doctrine §8 — unspecified |

## Platform foundations

These apply on every screen and in every phase. Most of them are invisible when they work, and they are what makes the AI safe to have.

| ID | Requirement | Phase | AI | Source |
| --- | --- | --- | --- | --- |
| PLT-04 | Navigation: Today · Inbox · Calendar, the four roles in fixed order, Pinned, Systems; one level of depth | POC | None | IA §2 |
| PLT-05 | One activity log recording everything the platform did, including what can't be reversed | POC | Mech | TR-03 |
| PLT-06 | Undo several steps back wherever undo is possible; version history on drafts, plans and IPS | v1 | Mech | TR-07 · F3 |
| PLT-07 | The intelligence layer: ranking, the why-now line, restraint (the POC doc's §7, INT-01 to INT-05) | POC | Mech + Model-L | Spine §B |
| PLT-08 | Ask: a side panel beside any screen that answers from the firm's data, shows sources and says what it couldn't check | v1 | Model-L | IP-01, IP-08 |
| PLT-09 | Every model output carries a receipt, its sources and age, and an advisor confirm before anything leaves | POC | Mech | Product rules 1–2 |
| PLT-10 | Notifications: quiet by default, planning moments only, no badges or streaks; the advisor sets channels | v1 | Mech | CS-06, CS-07 |
| PLT-11 | Search across households, people, documents and messages | v1 | Mech | IP-04, IP-05 |
| PLT-12 | Systems: what's connected, who set it up, last sync, what the platform can't see; firm admin sets connections | v1 | Mech | IA §5 |
| PLT-13 | Firm brand and templates set once; personal voice per advisor | v1 | Mech | TM-02, TM-07 |
| PLT-14 | Learns how the advisor writes in the open, and says so once; can be undone | v1.x | Model-L | TM-03 |

## Core data model

Everything hangs on the household. Financial data and relationship data live in separate stores, so an audit can prove a recommendation was financially driven.

| Entity | Holds | Store | Key rules |
| --- | --- | --- | --- |
| Firm | Brand, fee schedules, models, policies, connections | Platform | One per tenant |
| User | Advisor, principal, ops, CCO; roles and permissions | Platform | A person may hold several roles |
| Household | Members, primary advisor, review cadence, sensitivity settings, clamps | Relationship | Every client has one primary advisor |
| Person | Contact details, relationships to others, trusted contact | Relationship | A person can be in more than one household |
| Prospect | Source, referrer, stage, evidence ledger | Relationship | Becomes a household on conversion, history intact |
| Account | Type, registration, custodian, beneficiaries, model, restrictions | Financial | Belongs to one household |
| Position and transaction | Holdings, cost basis, trades, flows | Financial | Custodian is the source of truth; daily reconciliation |
| Model | Targets, bands, cadence, versions | Financial | Assigning never trades |
| Plan, goal, IPS | Goals, projections, policy; signed versions | Financial | Versioned; signatures kept |
| Life event | Type, status, sensitivity, evidence, provenance | Relationship | Only confirmed events act |
| Interaction | Meetings, messages, calls, notes, records | Relationship | Kept as books and records |
| Task and request | Follow-ups, service requests, owner, origin | Platform | Origin always shown |
| Document | Type, version, who can see it, signatures | Platform | Access logged |
| Fee and invoice | Schedule, calculations, deductions | Financial | Reviewed before deduction |
| Activity record | Every platform and user action | Platform | Append-only |

## Integrations

The platform sits beside an advisor's existing stack for a long time (F5), so it has to connect before it can replace. All are mocked in the open lane; the closed lane readies the real ones.

| Integration | Why | Phase |
| --- | --- | --- |
| Custodian (Green Meadows in the build) | Accounts, positions, transactions, account opening, transfers, trading, fee deduction | v1 (POC mocked) |
| CRM (Salesforce, Redtail, Wealthbox) | Keep the firm's system of record in sync | v1 |
| Email and calendar | Messages, meetings, availability | v1 |
| E-signature | Agreements, account forms, IPS | v1 |
| Document storage | The firm's existing files | v1 |
| Identity verification and AML screening | Onboarding checks | v1 |
| Communications archiving | Books and records for messages | v1 |
| Planning software (eMoney, RightCapital) | Projections until planning is built in | v1 |
| Market data and benchmarks | Performance and pricing | v1 |
| Account aggregation | Held-away accounts | v1.x |
| Additional custodians | Multi-custodian firms | v2 |
| Prospect enrichment and list sources | Leads and signals | v1.x |

## Non-functional requirements

These are table stakes for handling other people's money. A gap here stops v1 regardless of how good the experience is.

| ID | Requirement | Phase |
| --- | --- | --- |
| NFR-01 | Multi-factor sign-in for every user; single sign-on for firms that use it | v1 |
| NFR-02 | Client data encrypted in transit and at rest; least-privilege access for staff and services | v1 |
| NFR-03 | An incident response capability that can detect, contain and support notifying affected clients within regulatory timelines | v1 |
| NFR-04 | Records retained unaltered for the firm's policy period, then disposed of securely and provably | v1 |
| NFR-05 | Every read of sensitive client data and every change logged and reviewable | v1 |
| NFR-06 | Synthetic data only in the open lane; no client data leaves the closed environment | POC onward |
| NFR-07 | WCAG 2.1 AA; visible focus; reduced motion respected | POC onward |
| NFR-08 | Today and a household page load in under two seconds for a book of 150 households *(target, to test)* | v1 |
| NFR-09 | Availability during market hours, with a defined recovery time and backups | v1 |
| NFR-10 | Model use within the firm's approved AI policy; client data never used to train outside models | POC onward |

## Regulatory frame to verify with compliance

The product has to support how an SEC-registered adviser meets its obligations. Below is a starting list for compliance to confirm, not legal advice.

- **Fiduciary duty.** Care and loyalty to the client underpin suitability checks (REV-05), the IPS (PLN-07) and financial separation.
- **Disclosures.** Form ADV Part 2 and Form CRS delivery and updates (ONB-04, CMP-07, CMP-08).
- **Books and records.** Kept for the required periods and producible for an exam (CMP-01, CMP-11).
- **Marketing.** Advertising, content and anything resembling a testimonial or endorsement reviewed before use (CMP-04, PRO-08, PRO-14).
- **Custody.** Fee deduction and any standing authority to move money handled within the custody rule (PRC-03, SVC-10). The SEC withdrew its broader 2023 "Safeguarding" proposal on 12 June 2025, along with its predictive-data-analytics proposal ([Paul Hastings](https://www.paulhastings.com/insights/client-alerts/sec-withdraws-14-pending-rule-proposals)); the existing custody rule is the frame.
- **Privacy and Reg S-P.** The 2024 amendments require a written incident response program, notice to affected individuals within 30 days of a qualifying breach, and oversight of service providers, who must notify the adviser within 72 hours. Compliance dates were 3 Dec 2025 for larger entities and 3 June 2026 for smaller ones (under $1.5B AUM) ([Seward & Kissel](https://www.sewkis.com/publications/90-day-warning-regulation-s-p-amendments-compliance-deadline-approaching-for-smaller-entities/)). This shapes NFR-03 and CMP-13.
- **Code of ethics.** Personal trading reporting (CMP-06).
- **AI.** The SEC's predictive-data-analytics proposal for advisers was withdrawn in the same June 2025 notice, so for now existing duties and the firm's own AI policy govern. Compliance should check for newer guidance before v1.

## Questions for the domain lead and open decisions

These decide v1's shape. The first six need a domain lead; the rest are product-owner calls.

| # | Question | Affects | Owner |
| --- | --- | --- | --- |
| 1 | Which onboarding, review and service workflows are written in the order a practising advisor actually works? | ONB, REV, SVC | Domain lead |
| 2 | What is the minimum money management a small firm would trust here in v1 — monitoring and proposals only, or trading too? | INV-04 to INV-06 | Domain lead + PO |
| 3 | Which planning does v1 build in, and which stays in the firm's existing tool? | PLN-08 to PLN-13 | Domain lead + PO |
| 4 | Billing: which fee structures and calculation conventions are must-haves for the first firms? | PRC-01 to PRC-03 | Domain lead |
| 5 | Can an advisor pre-approve a milestone message (e.g. transfer updates) to send on schedule, or does each need a fresh yes? | ONB-11 | Domain lead + compliance |
| 6 | Can a principal clear a compliance flag on her own work, or is a second person required? | CMP-03 | Domain lead + compliance |
| 7 | Is v1 for advisor-only firms, or must it support ops staff from day one? | Roles, PRC-08 | PO |
| 8 | Replace or connect: which tool in the advisor's stack does the platform aim to replace first? | Integrations, v1.x | PO, with research |
| 9 | Evidence ledger, never a score, for prospects (CS-10) | PRO-03 | PO |
| 10 | When life events enter the build | LIFE | PO |
| 11 | Which held items (robo, AI tax strategies, value quantification, sentiment) to take to regulatory review first, if any | INV-17, TAX-10, REV-09 | PO + AI governance |

## Sources

The project folder as of 14 Oct 2026, the team's practice taxonomy, the build's feature inventory as of 12 Oct, and two regulatory sources checked today.

| Source | Used for |
| --- | --- |
| Product Requirements v0.1 (POC) | POC-phase requirements, non-negotiables, intelligence layer |
| UX research synthesis v0.2 (F1–F14) | Evidence tags |
| UX rules v0.4 and IA v0.1 | Commitments, navigation, Ask, Systems |
| Scenario spine v0.3 §B | Life events, restraint, financial separation |
| Practice taxonomy and journey map (C1–C9, B1–B7, 15 agentic moments) | Lifecycle coverage |
| Build feature inventory, 12 Oct (75 features) | Feature IDs and regulatory-review list |
| [Paul Hastings: SEC withdraws 14 pending rule proposals](https://www.paulhastings.com/insights/client-alerts/sec-withdraws-14-pending-rule-proposals) | Safeguarding and predictive-analytics withdrawals |
| [Seward & Kissel: Reg S-P amendments deadline for smaller entities](https://www.sewkis.com/publications/90-day-warning-regulation-s-p-amendments-compliance-deadline-approaching-for-smaller-entities/) | Reg S-P requirements and dates |

## Change log

| Version | Date | Change |
| --- | --- | --- |
| 0.2 | 27 Oct 2026 | Pillar crosswalk and build-path convention added ahead of the offsite. Ready for product-owner review |
| 0.2 | 26 Oct 2026 | Full-build requirements: lifecycle, roles, phases, about 175 requirements, data model, integrations, non-functional, regulatory frame, open questions |
| 0.1 | 26 Oct 2026 | POC-only requirements (now the POC slice) |
