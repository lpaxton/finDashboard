# Feature to API map

Which of the 75 planned features each API operation serves, and what sits behind it.

**Generated from `openapi.yaml`, not maintained by hand.** Every operation in the contract
carries its requirement IDs in its `description`, and this table is the inverse of those tags.
If a feature and an operation disagree here, the contract is the thing to fix.

Written 25 September 2026, against contract v0.3 (72 operations). The tables are regenerated;
the prose below them is updated by hand, most recently for aRCHi at v0.6.0-draft (81 operations).
Shareable version: https://claude.ai/code/artifact/d179b0d4-48da-44e7-bc51-58805d2cd6ac

## The short version

<!-- generated:tables -->

| | Count |
| --- | --- |
| Features with at least one API operation | **48** of 75 |
| Features with no operation yet | **27** |
| Operations carrying a requirement ID | **63** of 86 |

### Intelligence Platform

| Feature | API operation | Source |
| --- | --- | --- |
| **IP-01** Query recorded meetings | `POST /queries` | Model |
| **IP-02** Query CRM | — *No CRM connected* | — |
| **IP-03** Query email | — *No inbox connected* | — |
| **IP-04** Query custodial and financial data | — *Served indirectly; no query operation* | — |
| **IP-05** Query documents | — *Nothing reads a document* | — |
| **IP-06** Query external market and regulatory info | — *No market or regulatory source* | — |
| **IP-07** Deep research and internal information | — *No access to internal research* | — |
| **IP-08** Context-aware answers per client | `GET /households/{householdId}`<br>`POST /queries` | Green Meadows, Model |
| **IP-09** Unified dashboard | `GET /firm/summary`<br>`GET /households`<br>`GET /session`<br>`GET /summary` | Green Meadows, Platform |
| **IP-10** Data fusion for tax intelligence | — *Needs IP-02 and IP-05 first* | — |
| **IP-11** Conversation insights | `POST /queries` | Model |

### Client Engagement — meetings

| Feature | API operation | Source |
| --- | --- | --- |
| **MEET-01** Pre-meeting prep | `GET /meetings`<br>`GET /meetings/{meetingId}` | Calendar |
| **MEET-02** Personalised agenda | `GET /meetings/{meetingId}`<br>`POST /meetings/{meetingId}/agenda` | Calendar, Model |
| **MEET-03** Scheduling | `DELETE /meetings/{meetingId}`<br>`GET /meetings`<br>`PATCH /meetings/{meetingId}`<br>`POST /me/meeting-requests`<br>`POST /meetings` | Calendar, Platform |
| **MEET-04** Recording | `GET /meetings/{meetingId}/record` | Calendar |
| **MEET-05** Live transcription | `GET /meetings/{meetingId}/record` | Calendar |
| **MEET-06** AI summaries | `GET /meetings/{meetingId}/record`<br>`POST /meetings/{meetingId}/record/summary` | Calendar, Model |
| **MEET-07** Action item extraction | `GET /tasks`<br>`POST /meetings/{meetingId}/record/next-steps`<br>`POST /tasks` | Calendar, Platform |
| **MEET-08** CRM auto-update | — *No CRM connected* | — |

### Client Engagement — communications

| Feature | API operation | Source |
| --- | --- | --- |
| **COMM-01** AI email drafting | `GET /communications`<br>`GET /communications/{communicationId}/suggested-articles`<br>`PATCH /communications/{communicationId}`<br>`POST /communications/{communicationId}/redraft` | Model, Platform |
| **COMM-02** Tone personalisation | `GET /communications`<br>`GET /communications/{communicationId}/suggested-articles`<br>`PATCH /communications/{communicationId}`<br>`POST /articles/{articleId}/note`<br>`POST /communications/{communicationId}/redraft` | Model, Platform |
| **COMM-03** Communication tracker | `GET /communications` | Platform |
| **COMM-04** Client monitoring | `GET /alerts` | Green Meadows |
| **COMM-05** Client Sentiment Index | — *Regulatory review* | — |

### Practice Operations

| Feature | API operation | Source |
| --- | --- | --- |
| **PO-01** Daily AI digest | — *Composed in the UI, no single operation* | — |
| **PO-02** Task creation and CRM sync | `GET /tasks`<br>`POST /tasks` | Platform |
| **PO-03** Priority surfacing and alerts | `GET /alerts` | Green Meadows |
| **PO-04** Team share | `POST /team-shares` | Platform |
| **PO-05** Spreadsheet replacement and workflow automation | — *Scope undefined* | — |
| **PO-06** Advisor performance tracking | `GET /firm/advisors`<br>`GET /firm/advisors/{advisorId}`<br>`GET /firm/advisors/{advisorId}/scorecard` | Platform |
| **PO-07** Reporting and analytics | `GET /firm/advisors`<br>`GET /firm/summary`<br>`GET /models`<br>`GET /models/{modelId}`<br>`GET /reports/practice` | Green Meadows, Platform |
| **PO-08** Compliance tracker | `GET /firm/compliance` | Platform |
| **PO-09** Multi-custodian | — *One custodian only* | — |
| **PO-10** Business operations management | `GET /firm/billing/subscription`<br>`GET /firm/summary` | Platform |
| **PO-11** Book of business | `GET /households`<br>`GET /summary` | Green Meadows |
| **PO-12** Cap table and ownership | `GET /firm/cap-table` | Platform |

### Portfolio Management

| Feature | API operation | Source |
| --- | --- | --- |
| **PM-01** Portfolio summaries | `GET /households/{householdId}`<br>`GET /me/household` | Green Meadows |
| **PM-02** Exposure analysis | `GET /households/{householdId}/allocation`<br>`GET /portfolio-signals`<br>`PUT /households/{householdId}/model` | Green Meadows |
| **PM-03** Portfolio modeling | `GET /households/{householdId}/allocation`<br>`GET /instruments`<br>`GET /models`<br>`GET /models/{modelId}`<br>`POST /households/{householdId}/model-comparison`<br>`POST /models`<br>`PUT /households/{householdId}/model` | Green Meadows, Platform |
| **PM-04** Robo portfolio | — *Regulatory review* | — |
| **PM-05** Placing a trade | `POST /households/{householdId}/model-comparison`<br>`POST /models`<br>`PUT /households/{householdId}/model` | Green Meadows |

### Planning

| Feature | API operation | Source |
| --- | --- | --- |
| **PL-01** Financial planning agent | — *Not started* | — |
| **PL-02** Next best action | `GET /next-actions`<br>`POST /meetings/{meetingId}/record/next-steps` | Calendar, Platform |

### Risk and Tax Intelligence

| Feature | API operation | Source |
| --- | --- | --- |
| **RTI-01** Credit risk | — *Regulatory review* | — |
| **RTI-02** Document ingestion | — *Nothing reads a document* | — |
| **RTI-03** AI tax strategies | — *Regulatory review* | — |
| **RTI-04** Tax opportunity identification | — *Not started* | — |
| **RTI-05** Tax loss harvesting | `GET /portfolio-signals` | Green Meadows |
| **RTI-06** Interactive scenario modeling | — *Not started* | — |
| **RTI-07** Projections and tax simulations | — *Not started* | — |
| **RTI-08** Client-facing tax explanations | `GET /me/shared`<br>`POST /households/{householdId}/shares` | Green Meadows, Platform |
| **RTI-09** Quantification of advisor value | — *Regulatory review* | — |
| **RTI-10** Client-ready outputs | `GET /me/shared`<br>`POST /households/{householdId}/shares` | Green Meadows, Platform |

### Growth and Prospecting

| Feature | API operation | Source |
| --- | --- | --- |
| **GP-01** Advisor-client matching | `GET /prospects`<br>`GET /prospects/{prospectId}/matches` | Platform |
| **GP-02** Referral tracking | `GET /prospects` | Platform |
| **GP-03** Proposal generation | — *Not started* | — |
| **GP-04** Portfolio proposals | — *Not started* | — |
| **GP-05** Pitch decks | — *Not started* | — |
| **GP-06** Content for social, blogs, newsletters | `GET /articles`<br>`GET /articles/{articleId}`<br>`GET /communications/{communicationId}/suggested-articles`<br>`POST /articles/{articleId}/note` | Platform |
| **GP-07** Branded content | `GET /articles`<br>`GET /articles/{articleId}`<br>`GET /firm/branding`<br>`PATCH /firm/branding` | Platform |
| **GP-08** Podcasts | — *Regulatory review* | — |
| **GP-09** Presentations | — *Regulatory review* | — |
| **GP-10** Branded materials | `GET /articles`<br>`GET /firm/branding`<br>`PATCH /firm/branding` | Platform |

### Advisor and Client Experience

| Feature | API operation | Source |
| --- | --- | --- |
| **AX-01** AI intake forms | `GET /onboarding`<br>`GET /onboarding/{onboardingId}` | Platform |
| **AX-02** Onboarding tracker | `GET /onboarding`<br>`POST /onboarding/{onboardingId}/convert` | Platform |
| **AX-03** Document intelligence | — *Nothing reads a document* | — |
| **AX-04** Other onboarding assistance | `GET /onboarding`<br>`GET /onboarding/{onboardingId}`<br>`POST /onboarding/{onboardingId}/convert` | Platform |
| **AX-05** Practice client conversations | `POST /meetings/{meetingId}/rehearsal` | Calendar |
| **AX-06** Simulated client conversation | `POST /meetings/{meetingId}/rehearsal` | Calendar |
| **AX-07** Coaching in workflow | `POST /meetings/{meetingId}/rehearsal` | Calendar |
| **AX-08** Scorecards | `GET /firm/advisors/{advisorId}/scorecard` | Platform |
| **AX-09** Playbooks | `POST /playbooks/{playbookId}/runs` | Platform |
| **AX-10** Client billing | `GET /billing/fees`<br>`GET /me/fees` | Green Meadows |
| **AX-11** Fee plan customisation | `GET /billing/fees`<br>`PATCH /billing/fee-plan`<br>`PATCH /billing/fees/{householdId}` | Green Meadows, Platform |
| **AX-12** Client-side experience | `GET /me/documents`<br>`GET /me/household`<br>`GET /me/preferences`<br>`GET /settings`<br>`PATCH /settings`<br>`POST /households/{householdId}/shares` | Green Meadows, Platform |

<!-- /generated:tables -->

---

## What the gaps are actually waiting on

The 27 features without an operation are not 27 separate pieces of work. They cluster:

| Blocked on | Features | Count |
| --- | --- | --- |
| **Compliance review before build** | COMM-05, PM-04, RTI-01, RTI-03, RTI-09, GP-08, GP-09 | 7 |
| **Something that reads a document** | IP-05, RTI-02, AX-03 | 3 |
| **A CRM provider** | IP-02, MEET-08 | 2 |
| **An inbox** | IP-03 | 1 |
| **Market and research sources** | IP-06, IP-07 | 2 |
| **Structurally out of scope for one custodian** | PO-09 | 1 |
| **Scope undefined** | PO-05 | 1 |
| **Buildable now, simply not started** | PL-01, RTI-06, RTI-07, GP-03, GP-04, GP-05 | 6 |
| **Composed in the UI rather than by one operation** | PO-01, IP-04, IP-10 | 3 |

**GP-06 has left the compliance row, and it is the only one that has.** Its review has happened;
the others have not been reviewed and cannot be estimated until they are. AX-05 to AX-07 have
left the bottom row because SimGPT built them.

Two things follow from that shape:

**Document reading is the highest-leverage single capability left.** One piece of work moves
three features from impossible to buildable, and it is the only entry in the table where that
is true.

**Seven features need a conversation, not a sprint.** The compliance set is still larger than any
other blocker, and none of it can be estimated until it has been reviewed.

## Three features where the mapping is worth a second look

**PO-01, daily AI digest.** The Today section composes it from `/meetings`, `/alerts`,
`/portfolio-signals` and `/tasks`. There is no `GET /digest`, and nothing generates it — it is
an arrangement of four endpoints, not a feature the API serves. Whether that counts as built is
a product call.

**IP-04, query custodial and financial data.** The custodial data is read, mapped and displayed
throughout, so the *data* half is done. The *query* half is not: there is no way to ask a
question of it beyond what `POST /queries` matches. It shows as unmapped here deliberately,
because claiming it as served would overstate what exists.

**PM-05, placing a trade.** It appears in the table against
`POST /households/{id}/model-comparison`, which is the one operation that mentions it — and
mentions it to say a trade **cannot** be placed from there. The mapping is real; the direction
is the opposite of the others in this table.

## Keeping this honest

Regenerate rather than edit:

```
npm run feature-map
```

It reads the requirement IDs out of `openapi.yaml` and rewrites the tables above. A feature
that gains an operation gets picked up automatically; one that loses its tag disappears, which
is the point.
