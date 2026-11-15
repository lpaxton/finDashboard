# Prospect to signed — the flow

*Repo copy · 16 November 2026 · Owner: product owner / UX · Drafted from the team's offsite
whiteboard, the product owner's walk-through and review, the requirements document (v0.2, PRO
section) and the October prospecting study. **Not checked against the current build**: the
"In build" column is blank for the developer to fill. Nothing here replaces what is built.*

**What this is.** The floor plan for one journey: a lead arrives, becomes a prospect, meets the
advisor, receives a proposal and signs. Every step says what happens, which data it touches,
and whether it is in the baseline POC or comes later. The requirements slice, the capability
map and the build packet are all drawn from this document.

**What it is not.** A screen spec, and not the life of the client after signing. That begins
at stage 9 and is covered only as far as the handoff.

**Where it sits.** Pillar 1, *Grow the practice* (the advisor as business developer), under the
platform's three promises: every human moment prepared, the advisor is the author, nothing
leaves without a yes.

**What the POC build covers.** This journey. The professional development and business
operations parts of the platform are not being built in the POC. SIMGPT still comes in at step 5.2, as
an option inside prospect meeting prep, connected through its API; that is part of this journey. Firm settings are system settings
that support this journey; they are not the business operations area.

---

## How to read the steps

| Column | Meaning |
| --- | --- |
| **Cut** | The build order. **B** baseline: build first, this is the POC · **N** next: build second, once the baseline works · **L** later: not yet scheduled. A proposal for the product owner to confirm (decision D4) |
| **Capability** | Which of the seven AI capabilities does the work. **Rule** marks a step built without AI: a form, a setting, a button, a stored record. These are still components to design and build |
| **Data** | What the step reads → what it writes. **K** platform knowledge store · **F** firm settings (brand, fees, templates, preferences; part of the platform store) · **X** an outside service (the enrichment service, calendar, e-signature) · **G** the second folder: money management, tax, estate and model information |
| **Req** | The requirement it traces to in the Requirements doc v0.2. **new** means v0.2 has no requirement for it yet |
| **In build** | Blank. To be filled against the developer's build: yes · partly · no |

**The seven capabilities:** Enrich and flag gaps · Draft in the advisor's voice · Prep brief ·
Rehearse · Listen, summarise and file · Assemble from a template · Relevant content.

**Research references.** *S17* is the October prospecting study (four advisors, short
unmoderated interviews). *F10 to F14* are its findings. Both live in the UX research doc,
`ux/UX_RESEARCH.md` §2b, not in the requirements doc. The requirements
doc cites the same codes as its sources.

---

## Decided on 14 November [PO]

| Decision | What it changes |
| --- | --- |
| **Leads land in the platform.** They do not go to an existing outside CRM | The platform is the system of record for leads and prospects. Step 1.3 is a one-time import, not a live connection |
| **Ranking is in.** The enrichment service ranks leads; that is what it brings. The ranking should reflect what the advisor wants in a client | **Supersedes** "prospect scoring on hold" and the "never a score" wording of PRO-03. The evidence in 3.3 stays beside the rank. The enrichment service's criteria must be verified (believed to be potential AUM) |
| **The personal page and the newsletter are the same thing.** Email is always the reach-out and may carry the page's link | Reach-out is a call or an email. Steps 3.4, 3.5 and 4.3 rewritten |
| **The personal page also collects information** in a conversational interface, by voice or text | The pre-meeting form (was 4.6) is folded into 4.3 |
| **Archi bites are already compliance-checked** | Removed from the compliance questions |
| **A second folder is attached at conversion** holding money management, tax, estate and model information | Step 9.3 rewritten. This is the two-store model made concrete |
| **Fees and templates are set by the advisor in system settings** | New stage 0, *Set up* |

---

## The flow at a glance

| # | Stage | The advisor | The platform | Leaves the firm? |
| --- | --- | --- | --- | --- |
| 0 | Set up (once) | Sets brand, fees, templates | Stores them for every later step | No |
| 1 | Intake | Adds or receives a lead | Captures it with its source | No |
| 2 | Enrich | Reads what was found | Adds data, ranks, flags what is missing | No |
| 3 | Sort | Decides: pursue now or park | Lays out the rank and the evidence | No |
| 4 | Reach out | Edits and sends | Drafts the email, builds the personal page | **Yes, on the advisor's send** |
| 5 | Prepare | Reads, rehearses | Builds the brief | Reminder only |
| 6 | Meet | Holds the conversation | Receives the transcript or notes, with consent | No |
| 7 | Follow up | Edits and sends | Files notes, drafts the thank-you | **Yes, on the advisor's send** |
| 8 | Propose | Reviews every page | Assembles the draft | **Yes, on the advisor's send** |
| 9 | Sign and hand off | Welcomes the client | Carries everything across | Signature request only |

**Size of the draft:** 44 steps. **27 baseline · 13 next · 4 later.**

---

## 0 · Set up (once, by the firm)

The whiteboard's "systems set up for RIA to plug in their business brand". Later stages depend
on these: the fee agreement on 0.2, the proposal on 0.3, the ranking on 0.4.

| Step | What happens | Cut | Capability | Data | Req | In build |
| --- | --- | --- | --- | --- | --- | --- |
| 0.1 | The firm sets its brand: name, logo, colours, voice | N | Rule | → F | new | |
| 0.2 | The advisor sets the fee schedule | N | Rule | → F | new | |
| 0.3 | The firm builds its proposal and agreement templates, with locked and open sections (the "template generator") | N | Assemble | → F | new | |
| 0.4 | The firm sets its own criteria for the clients it wants | N | Rule | → F | new | |

**Note:** In the baseline these are seeded, not editable: one brand, one fee schedule, one
template.

**Needed to build:** a real proposal example and a fee agreement example. Without them 0.3,
8.1 and 8.5 are guesses.

## 1 · Intake

A lead reaches the firm and lands in the platform. The source matters: in S17 the source of the
introduction was the one qualifier that worked in every closing story (F10).

| Step | What happens | Cut | Capability | Data | Req | In build |
| --- | --- | --- | --- | --- | --- | --- |
| 1.1 | A lead fills in the firm's web form, which asks who referred them. A referral is recorded with the referrer and their tie to the firm | B | Rule | → K | PRO-01 | |
| 1.2 | The advisor fills in an intake form for a lead they met in person (the "soccer field"), with the referrer if there is one | B | Rule | → K | new | |
| 1.3 | Leads are imported once from an outside list or lead generator, de-duplicated | N | Rule | X → K | PRO-05 | |
| 1.4 | An existing client refers someone through a quick form on the client site, in their own words | B | Rule | → K | new | |

**Note:** Three intake forms are being built: the firm's web form (1.1), the advisor's form
(1.2) and the client referral form (1.4). What the referrer *said* about the lead comes from
1.4; for other referrals the advisor adds it by hand.

## 2 · Enrich

The enrichment service adds what can be found from a name, an address and the basics, and ranks the lead.
The platform shows where each fact came from and names what is still missing.

| Step | What happens | Cut | Capability | Data | Req | In build |
| --- | --- | --- | --- | --- | --- | --- |
| 2.1 | The enrichment service adds data points to the lead | B | Enrich | X → K | new | |
| 2.2 | Every added fact shows its source and date | B | Rule | K | PLT-09 | |
| 2.3 | The platform marks what is still unknown, measured against the minimum needed for a proposal and an agreement | B | Enrich and flag gaps | K → K | PRO-06 | |
| 2.4 | The enrichment service's rank appears on the lead card (today: a percentage and a colour bar), with what it is based on | B | Rule | X → K | PRO-03 | |

**Needed to build:** the minimum-information list. Which items must be known before a proposal
can be assembled, and which before an agreement? Step 2.3 has nothing to measure against until
the domain lead supplies it.

**Open:** What does the enrichment service's ranking code in the POC rank on? The developer has it running; a
plain-language summary is needed for the card. What happens to its data on a lead who never
becomes a client?

## 3 · Sort: lead or prospect

The whiteboard's line: the difference between a lead and a prospect is how warm they are. The
advisor draws that line with the rank and the evidence side by side. S17 found every screening
instinct unreliable, and that people who looked unserious sometimes became good clients (F12,
F13), so a low rank parks a lead; it never hides one.

| Step | What happens | Cut | Capability | Data | Req | In build |
| --- | --- | --- | --- | --- | --- | --- |
| 3.1 | The advisor promotes a lead to a prospect; the move is logged | B | Rule | K → K | PRO-04 | |
| 3.2 | The advisor parks a cold or warm lead with a return date | B | Rule | K → K | PRO-09 | |
| 3.3 | The card shows the evidence beside the rank: who introduced them, replied or not, agreed to meet, time already spent | B | Rule | K | PRO-03 | |
| 3.4 | The platform suggests how to reach out, a call or an email, and whether the email should carry the personal page | N | Draft | K, F | new | |
| 3.5 | Parked leads keep receiving the personal page as a newsletter; a reply or a visit brings them back as warm | L | Relevant content | K, F → X | PRO-08 | |
| 3.6 | The firm's own criteria (0.4) are applied in the sort, beside the enrichment service's rank, and the card shows which criteria a lead meets | N | Rule | K, F | new | |

**Note:** A parked lead returning on new evidence rather than a date belongs with 3.4.

## 4 · Reach out

The first thing that leaves the firm. Email is always the reach-out. S17's warning applies
(F11): anything a prospect sees should show the advisor, not the software.

| Step | What happens | Cut | Capability | Data | Req | In build |
| --- | --- | --- | --- | --- | --- | --- |
| 4.1 | The platform drafts an introduction in the advisor's voice; the advisor edits and sends | B | Draft | K, F → X | PRO-07 | |
| 4.2 | The email carries a link to book time on the advisor's calendar | B | Rule | X | new | |
| 4.3 | The email links to the prospect's personal page: relevant Archi bites, the calendar, and a conversational prompt ("tell me your goals for the meeting") answered by voice or text | B | Relevant content, Enrich | K, F → X → K | new | |
| 4.4 | What the prospect opens on the page is added to the evidence and can move them from warm to hot | L | Rule | X → K | new | |
| 4.5 | When a meeting is booked, the advisor is alerted and the platform drafts the confirmation with what to bring | B | Draft | K → X | new | |

**Note:** The prompt in 4.3 is for the prospect. What they answer goes to the advisor's prep
brief (5.1).

**Open:** Does step 4.4 need a privacy read and a notice on the page?

## 5 · Prepare

| Step | What happens | Cut | Capability | Data | Req | In build |
| --- | --- | --- | --- | --- | --- | --- |
| 5.1 | A prep brief for the advisor: what is known, what is missing, where to focus, questions to ask. An uncertain inference appears only as a question | B | Prep brief | K | PRO-06 | |
| 5.2 | Inside meeting prep, the advisor can choose to rehearse the conversation. The option connects to the SIMGPT API, seeded with what is known about goals and worries | B | Rehearse | K → X | new | |
| 5.3 | A reminder goes to the prospect before the meeting with their meeting prep, approved by the advisor when the meeting was confirmed | N | Draft | K → X | new | |
| 5.4 | Cues for the advisor on how to connect, drawn from the prospect's situation | L | Prep brief | K | new | |

**Open:** Step 5.4 must describe the situation, never rate the person (UX rule CS-02).

## 6 · Meet

The conversation is the advisor's. In S17 it was the one thing every advisor wanted to keep
(F14). The platform does not build its own recorder: it receives the transcript or notes from the
tool that captures the meeting, and does the summarising, filing and drafting itself.

| Step | What happens | Cut | Capability | Data | Req | In build |
| --- | --- | --- | --- | --- | --- | --- |
| 6.1 | The meeting is recorded in the advisor's own meeting tool with the prospect's consent; afterwards the advisor uploads the transcript | B | Listen | → K | new | |
| 6.2 | The platform produces a summary: what was said, what was learned, what is still open | B | Listen, summarise | K → K | new | |
| 6.3 | The transcript or notes arrive automatically from a connected meeting tool (a meeting app such as Zoom, or an advisor notetaker, through its API), with consent on record | N | Listen | X → K | new | |
| 6.4 | Live prompts during the meeting: questions not yet asked, facts still missing. Needs a real-time transcript stream from the meeting tool | L | Listen | X → K | new | |

**Note:** In the baseline the transcript in 6.1 can be seeded; the meeting is synthetic in the
open lane, and a seeded transcript is enough to prove 6.2 and stage 7.

**Capture routes for 6.3 and 6.4:**

| Route | What the platform receives | Covers |
| --- | --- | --- |
| A meeting app's recording API | A transcript after the meeting ends; the advisor must be the host | Virtual meetings in that app |
| A meeting app's real-time stream | A transcript while the meeting runs | 6.4, virtual meetings in that app |
| An advisor notetaker's API | Structured notes; some keep no audio or video | Virtual, phone and in-person meetings |

**Open:** Recording, or notes only? (Decision D6.) Which capture tool? (Decision D7.) How
consent is captured in either case.

## 7 · Follow up

| Step | What happens | Cut | Capability | Data | Req | In build |
| --- | --- | --- | --- | --- | --- | --- |
| 7.1 | Meeting notes are filed to the prospect's record | B | Summarise and file | K → K | new | |
| 7.2 | The platform drafts a thank-you with a summary and next steps; the advisor sends | B | Draft | K → X | PRO-07 | |
| 7.3 | The missing-information list updates from what was said | B | Enrich and flag gaps | K → K | PRO-06 | |

## 8 · Propose

The whiteboard left two questions here: *what else goes in the proposal* and *does a model
plan come before it*. Both wait on the examples named under stage 0.

| Step | What happens | Cut | Capability | Data | Req | In build |
| --- | --- | --- | --- | --- | --- | --- |
| 8.1 | The proposal opens from the firm's template, with its locked sections already in place | B | Assemble | F | PRO-11 | |
| 8.2 | The platform fills the open sections from the meeting, the personal page and the enriched record | B | Assemble | K, F → K | PRO-11 | |
| 8.3 | The X-ray's suggested analysis is placed in the draft, marked as a suggestion with its sources | N | Assemble | K → K | new | |
| 8.4 | The advisor reviews the whole document before anything is sent | B | Rule | K → X | non-negotiable | |
| 8.5 | The fee agreement is filled from the fee schedule in settings | N | Assemble | K, F → K | PRO-12 | |

**Open:** What financial information does the X-ray have for a prospect, before the second
folder exists?

## 9 · Sign and hand off

The "Yes" on the whiteboard, and where the second folder first appears.

| Step | What happens | Cut | Capability | Data | Req | In build |
| --- | --- | --- | --- | --- | --- | --- |
| 9.1 | The document goes out for e-signature | B | Rule | K → X | PRO-12 | |
| 9.2 | The signed copy returns and the advisor is told they have a new client | B | Rule | X → K | new | |
| 9.3 | The prospect becomes a client in one step. Everything known carries over, and a second folder is attached for money management, tax, estate and model information | B | Rule | K → K, G | PRO-13 | |
| 9.4 | The second folder is connected to the client's account in the portfolio platform, and the handoff packet travels with it | N | Rule | K → G | new | |
| 9.5 | The platform drafts a thank-you to the referrer | N | Draft | K → X | PRO-14 | |

**Note:** In the baseline, 9.1 can be a mock signing and the second folder in 9.3 is attached
empty.

---

## The baseline in one line

A lead comes in by the firm's web form, the advisor's form or a client's referral form → the enrichment service enriches and ranks it and
the platform flags the gaps → the advisor promotes or parks it → sends a drafted introduction with a
booking link and the prospect's personal page → is alerted when the meeting is booked → reads a prep brief, with the option to rehearse in SIMGPT → meets, then uploads
the transcript → sends a drafted thank-you → reviews a proposal assembled from a seeded
template → sends it for signature → is told they have a new client, with the second folder
attached.

The whole baseline runs on the platform knowledge store and seeded firm settings. It does not
need a live connection to the portfolio platform.

---

## UI notes [UX]

- **Lead and prospect cards sit in groups by warmth** (hot, warm, cold). Each group is an
  accordion that collapses.
- **Cards shuffle as needed**: the order within a group changes as rank and evidence change.
  Per UX rule on reordering, a card that moves should say why.
- **A card carries**: the rank and what it is based on (2.4), the evidence (3.3), the source of
  the introduction (1.1), and what is still missing (2.3).

---

## Decisions still open [PO]

| # | Decision | Why it matters now |
| --- | --- | --- |
| **D3** | **What gets signed?** The proposal, a fee agreement, or both in sequence. Waits on the examples | Sets step 9.1 and whether 8.5 belongs in the baseline |
| **D4** | **Confirm the baseline cut**: the 27 steps marked B, and whether connected capture (6.3) joins them | It is the scope of the POC |
| **D5** | **What makes a lead a prospect?** The advisor's judgement alone, or a named event such as a reply or a booked meeting? | Defines stage 3 and the pipeline stages in PRO-04 |
| **D6** | **Recording, or notes only?** Does the platform need the audio, or only a transcript or structured notes? | Notes only removes most of the retention question for compliance |
| **D7** | **Which capture tool, and how much of it?** A meeting app's API, or a specialist advisor notetaker. The notetakers are also competitors that already do prep, form filling and follow-up emails. Proposed: take capture only; prep, summary and drafting stay in the platform. Apply the grafting test | A notetaker in the middle of the flow hands a competitor the meeting itself |

## Needed from others

**Domain lead**
- A proposal example and a fee agreement example.
- The minimum-information list for a proposal and for an agreement.
- Does a model plan or an illustrative portfolio come before the proposal?

**Compliance**
- Consent to record a meeting, or to AI note-taking if no recording is kept, and retention of recordings, transcripts and notes.
- Tracking what a prospect opens on the personal page.

**Technology**
- Where the second folder lives: in the portfolio platform, in this platform, or split (tax and estate may not be
  portfolio platform data).
- The shared household ID at step 9.4, and who issues it.
- Whether the platform reads portfolio platform data live or keeps a copy.
- What data goes to the model, and where the model runs.
- Which meeting tools are approved, and where advisors actually meet: Zoom, Teams, phone or in person.

**Developer**
- Fill the "In build" column.
- A plain-language summary of what the enrichment service's ranking code ranks on, and whether a firm's own preferences (0.4) can shape it.
- Which baseline steps are already in place, and which is the largest gap?

---

## After the signature: the platform and the portfolio platform together

The platform does not end at the signature, and the portfolio platform does not begin there. The portfolio platform's capabilities do
the work whenever money management is needed. A layer of the platform stays over the whole
relationship and keeps watch: a client nobody has contacted in a while, a household that looks
short on cash, a review coming due. The platform notices and prepares, the advisor decides, and
the portfolio platform carries out what involves the money.

The same seven capabilities keep working after "Yes". Onboarding is where the first reuse
shows, because the gaps list, the drafts and the personal page are already built.

| Capability | Before signing | Onboarding | Ongoing |
| --- | --- | --- | --- |
| Enrich and flag gaps | Lead card, missing information | The missing-information list becomes the onboarding checklist: documents, accounts, beneficiaries | The household profile, kept current |
| Draft in the advisor's voice | Introduction, confirmation, thank-you | Welcome, document requests, transfer status updates | Check-ins, review invitations |
| Prep brief | First meeting | The planning meeting | Every review and call |
| Rehearse | The first conversation | Explaining fees and transfers | Hard conversations |
| Listen, summarise and file | Discovery meeting | Planning meeting; notes feed the plan | Every meeting |
| Assemble from a template | Proposal, fee agreement | Account forms pre-filled, first plan draft | Review packs and reports |
| Relevant content | Personal page | The personal page becomes the client's window; Archi bites explain what happens during a transfer | Client newsletters |

**Two things worth noticing.** The personal page is the seed of the client portal: same page,
more on it once they sign. And nothing the prospect already told the advisor should be asked
again in onboarding; the gaps list is what guarantees that.

**The packet at 9.4** is what travels with the household when the second folder is connected
to the portfolio platform: the profile, stated goals and
worries, meeting notes, the signed documents, the referrer, and the list of what is still
unknown. Its contents need agreeing with the portfolio platform team.

---

## What this changes in the requirements doc

For the v0.3 "prospect to signed" slice of `Advisor_Platform_Requirements_Full_Build_v0-2.md`.
The steps marked **new** group into eleven requirements to add:

1. Firm settings: brand, fee schedule, templates, firm criteria (0.1 to 0.4), and the criteria applied in the sort (3.6)
2. Hand entry of a lead (1.2)
3. A client's own referral page (1.4)
4. Third-party enrichment and ranking (2.1)
5. A suggested way to reach out (3.4)
6. Booking link (4.2)
7. The personal page: content, conversational capture, engagement as evidence (4.3, 4.4)
8. Meeting confirmation, advisor alert and prospect reminder (4.5, 5.3)
9. Rehearsal and connection cues (5.2, 5.4)
10. Meeting capture through a connected tool: transcript or notes, summary, filing, live prompts (6.1 to 6.4, 7.1)
11. X-ray in the proposal, the new-client alert, and the second folder's connection to the portfolio platform (8.3, 9.2, 9.4)

**To rewrite:** PRO-03, which says "never a score". The 14 Nov decision allows a rank shown
with its basis, beside the evidence.

**To revisit:** PRO-11 and PRO-12 once D3 is decided.

---

## Sources

- The team's offsite whiteboard and pillars, 29–30 Oct 2026
- The product owner's walk-through and review, 14 Nov 2026
- The requirements document v0.2, PRO-01 to PRO-16
- `ux/UX_RESEARCH.md` §2b, findings F10 to F14 (S17)

## Related files

- `UX_CAPABILITY_MAP.html` — the same steps on one page
- `UX_FIRM_SETTINGS.md` — the detail behind stage 0
- `UX_SEED_PROPOSAL_AGREEMENT.md` — a worked example for stages 8 and 9
- `UX_HANDOFF.md` — what this drop is and how to use it with the build
