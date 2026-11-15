# Seed example — proposal and advisory agreement

*Repo copy · 16 November 2026 · Owner: product owner / UX · For the open-lane build. Everything
here is synthetic: an invented prospect, an invented firm, invented figures.*

**What this is.** One worked example of the two documents at the end of the prospect flow
(stages 8 and 9), with the record they are filled from. It gives the build something concrete
to assemble: which parts are fixed, which the platform fills, and which the advisor writes.

**What it is not.** A legal document or an approved template. The structure follows public
templates and practitioner guides. The domain lead and legal replace the wording before
anything like this is used outside a demo.

**Names.** The build's cast: Dana, advisor and principal at Whitfield Wealth Partners; Grace
Okafor, an existing client; Green Meadows, the custodian. The prospect, Renata Alvarez, is new
and invented for this file.

---

## How to read the tags

Every section of both documents carries one tag. The tag is the build instruction.

| Tag | Meaning | Who can change it |
| --- | --- | --- |
| `[LOCKED]` | Firm template text. The same for every prospect. Set once in firm settings (flow steps 0.1 to 0.3) | The firm, in settings. Not the advisor per document |
| `[FILLED: source]` | The platform fills this from the record. The source names where the fact came from | The advisor can edit any filled value before sending |
| `[ADVISOR]` | The advisor writes or chooses this. The platform may offer a draft | The advisor |

**The rule above all three:** nothing is sent until the advisor has reviewed the whole document
(flow step 8.4).

---

## 1 · The seed record

What is known about the prospect when the proposal is assembled, and where each fact came from.
Sources match the flow: `referral_form` (1.4), `enrichment` (2.1), `personal_page` (4.3),
`meeting` (6.2), `advisor` (entered by hand), `firm_settings` (stage 0).

```yaml
prospect:
  id: PR-0142
  name: Renata Alvarez                    # referral_form
  age: 54                                 # meeting
  location: Quincy, MA                    # enrichment
  occupation: Physical therapist, co-owner of a three-clinic practice   # enrichment
  household: Single; one daughter, 23, starting graduate school         # meeting
  referred_by: Grace Okafor (client)      # referral_form
  referrer_note: "Renata is selling her share of the practice and asked who I trust."  # referral_form
  advisor: Dana
  status: prospect
  first_meeting: 2026-11-10               # meeting

goals:                                    # personal_page, confirmed in meeting
  - Stop working full time at 62
  - Help her daughter through graduate school without borrowing
  - Keep the house

worries:                                  # meeting
  - "I have never had this much in one place and I do not want to get it wrong."
  - Has three old retirement accounts she has lost track of

situation:
  event: Selling her one-third share of the practice; sale closes January 2027   # meeting
  current_advisor: none; self-directed    # meeting
  risk_profile: Moderate                  # meeting (advisor's read, to confirm with questionnaire)
  time_horizon_years: 8                   # derived from goals

assets_to_manage:                         # meeting; statements requested, not yet received
  - {account: Rollover IRA (three old plans combined), value: 610000}
  - {account: Roth IRA,                                 value: 95000}
  - {account: Taxable account (sale proceeds),          value: 480000}
  total: 1185000

assets_not_managed:
  - {account: Checking and savings, value: 60000}       # meeting

still_unknown:                            # the gaps list (flow 2.3, 7.3)
  - Exact balances; statements for the three old plans
  - Tax basis in the practice and expected tax on the sale
  - Beneficiaries on the existing accounts
  - Completed risk questionnaire

firm:                                     # firm_settings
  name: Whitfield Wealth Partners
  custodian: Green Meadows
  model_offered: Balanced
  fee_schedule:
    - {up_to: 1000000, annual_rate: 0.0100}
    - {above: 1000000, annual_rate: 0.0075}
  billing: Quarterly, in arrears, on the quarter-end value
  minimum_account: 250000
```

**Fee check for this record.** 1.00% on the first $1,000,000 is $10,000. 0.75% on the remaining
$185,000 is $1,387.50. Estimated annual fee $11,387.50, about $2,846.88 a quarter, a blended
rate of 0.96%. The build should compute this from the schedule, never store it.

---

## 2 · Minimum information, as this example implies it

A first draft of the list the domain lead was asked for. It is what these two documents could
not be assembled without.

| Needed for | Item | In the seed record? |
| --- | --- | --- |
| Proposal | Name, and who the advisor is | Yes |
| Proposal | At least one stated goal, in the prospect's words | Yes |
| Proposal | What prompted them to look for an advisor | Yes |
| Proposal | Approximate assets to be managed, by account type | Yes, approximate |
| Proposal | A risk read and a time horizon | Yes, provisional |
| Proposal | The firm's fee schedule | Yes |
| Agreement | Legal name and address of each signer | Name only |
| Agreement | The accounts covered, with registration type | Types only |
| Agreement | Discretionary or non-discretionary authority | Not yet chosen |
| Agreement | Confirmation the disclosure documents were delivered | Not yet |
| Agreement | Consent to electronic delivery | Not yet |

**What this shows:** a proposal can be assembled from what one meeting and the personal page
produce. The agreement needs four more facts, and the gaps list should ask for them between
the proposal and the signature.

---

## 3 · The proposal

*Cover, in the firm's brand* `[LOCKED]`

> **Whitfield Wealth Partners**
> A plan for **Renata Alvarez** `[FILLED: referral_form]`
> Prepared by **Dana** · 16 November 2026 `[FILLED: advisor, date]`

### 3.1 What we heard `[FILLED: meeting, personal_page]` then `[ADVISOR]`

The platform drafts this from the meeting summary and the personal page. The advisor rewrites
it until it sounds like her. It leads with the prospect's own words.

> Renata, when we met you said: "I have never had this much in one place and I do not want to
> get it wrong." That is the right instinct, and it is where this plan starts.
>
> You are selling your share of the practice in January. You want to stop working full time at
> 62, help your daughter through graduate school without borrowing, and keep the house. You
> also have three old retirement accounts that have drifted out of view.

### 3.2 Where you are today `[FILLED: meeting]`

> | Account | Approximate value |
> | --- | --- |
> | Rollover IRA (three old plans, combined) | $610,000 |
> | Roth IRA | $95,000 |
> | Taxable account, from the sale | $480,000 |
> | **To be managed** | **$1,185,000** |
> | Checking and savings, staying where they are | $60,000 |
>
> These are the figures you gave us. We will confirm them from statements.

*Build note: every figure shows as approximate until a statement confirms it.*

### 3.3 What we would do first `[ADVISOR]`, drafted by the platform

> 1. Find and combine the three old retirement accounts into one.
> 2. Before the sale closes, work with your accountant on what the tax will be, so the proceeds
>    are invested with that bill already set aside.
> 3. Set aside two years of your daughter's tuition outside the invested portfolio.
> 4. Invest the remainder toward an income you can live on from 62.

### 3.4 How we would invest `[FILLED: firm_settings]` then `[ADVISOR]`

> Based on what you have told us, we would start from our **Balanced** approach: roughly 60%
> in stocks, 35% in bonds and 5% in cash. This is an illustration of the starting point. The
> final allocation follows a completed risk questionnaire and confirmed figures.

*Build note: no projected returns or performance figures appear anywhere in this example.
Whether a proposal may show them is a compliance question and is left out on purpose.*

### 3.5 What it costs `[FILLED: firm_settings]`, computed

> Our fee is 1.00% a year on the first $1,000,000 we manage and 0.75% above that, billed each
> quarter on the value at quarter end.
>
> On $1,185,000 that is an estimated **$11,387.50 a year**, about $2,846.88 a quarter. There
> are no commissions. Fund expenses and custodian charges are separate and are described in
> our disclosure brochure.

### 3.6 Who we are `[LOCKED]`

> Whitfield Wealth Partners is an independent, fee-only advisory firm. We act as a fiduciary:
> we are required to put your interests ahead of ours. Your assets are held in your name at
> Green Meadows, not by us.

### 3.7 Your advisor `[LOCKED]` per advisor

> Dana founded the firm and works with a small number of households. *(Advisor biography, set
> once in settings.)*

### 3.8 What happens next `[LOCKED]` with dates `[FILLED]`

> 1. You review this plan. We talk through anything you want changed.
> 2. If you want to go ahead, you sign our advisory agreement. We send it with our disclosure
>    documents.
> 3. We open your accounts at Green Meadows and move your existing accounts across. This
>    usually takes two to three weeks, and we tell you where things stand throughout.
> 4. We meet again to complete your plan before anything is invested.

### 3.9 Disclosures `[LOCKED]`

> This document is a proposal, not a contract. Figures are estimates based on information you
> provided. *(Firm's standard disclosure text.)*

---

## 4 · The advisory agreement

A short-form example in plain language. Clause headings follow the common structure of public
templates; the wording is illustrative only.

> ### Investment advisory agreement `[LOCKED]`
>
> **Between** Whitfield Wealth Partners ("the Adviser") `[FILLED: firm_settings]`
> **and** Renata Alvarez ("the Client") `[FILLED: referral_form; legal name and address still needed]`
> **Effective** on the date of the last signature below.
>
> **1. Services.** `[LOCKED]` The Adviser will manage the accounts listed in Schedule B and
> provide financial planning related to them.
>
> **2. Authority.** `[ADVISOR]` chooses one, with the Client:
> ☐ *Discretionary:* the Adviser may buy and sell in the accounts without asking first, within
> the Client's stated objectives.
> ☐ *Non-discretionary:* the Adviser recommends; the Client approves each transaction.
>
> **3. Objectives.** `[FILLED: meeting]` Moderate risk; an eight-year horizon to reduced work
> at 62. The Client will tell the Adviser when circumstances change.
>
> **4. Fees.** `[LOCKED]` The Client pays the fee in Schedule A, billed quarterly in arrears
> and deducted from the accounts unless agreed otherwise.
>
> **5. Custody.** `[LOCKED]` Assets are held by Green Meadows in the Client's name. The Adviser
> does not hold Client assets.
>
> **6. Fiduciary duty.** `[LOCKED]` The Adviser acts in the Client's best interest.
>
> **7. Risk.** `[LOCKED]` Investments can lose value. The Adviser does not guarantee results.
>
> **8. Client's confirmations.** `[LOCKED]` The Client confirms the information given is
> accurate and that they have authority over the accounts.
>
> **9. Disclosure documents.** `[LOCKED]` with a checkbox `[FILLED: delivery record]`
> ☐ The Client received the Adviser's disclosure brochure, brochure supplement, relationship
> summary and privacy notice before or at signing.
> ☐ The Client agrees to receive documents electronically.
>
> **10. Assignment.** `[LOCKED]` The Adviser may not assign this agreement without the
> Client's consent.
>
> **11. Ending the agreement.** `[LOCKED]` Either party may end it with written notice. Fees
> are charged to the date it ends.
>
> **12. Governing law.** `[LOCKED]` *(State, from firm settings.)*
>
> **Signatures.** Client · Adviser `[FILLED: e-signature record]`
>
> ---
>
> **Schedule A — Fees** `[FILLED: firm_settings]`
>
> | Assets under management | Annual fee |
> | --- | --- |
> | First $1,000,000 | 1.00% |
> | Above $1,000,000 | 0.75% |
>
> Billed quarterly in arrears on the quarter-end value. Minimum relationship $250,000.
>
> **Schedule B — Accounts covered** `[FILLED: meeting; registration details still needed]`
>
> | Account | Type |
> | --- | --- |
> | Rollover IRA | Traditional IRA |
> | Roth IRA | Roth IRA |
> | Individual account | Taxable |

---

## 5 · The signing packet

Flow step 9.1 sends more than one document. In this example the packet is:

1. The advisory agreement, for signature.
2. The firm's disclosure brochure and brochure supplement, for delivery.
3. The relationship summary, for delivery.
4. The privacy notice, for delivery.

The platform records that items 2 to 4 were delivered, and when. That record fills clause 9.
The proposal is not signed; accepting it means signing the agreement.

---

## 6 · What this example tells the build

| Finding | Where it lands in the flow |
| --- | --- |
| About half of each document is `[LOCKED]`. A template with locked sections is most of the work | 0.3, 8.1 |
| The fee section is computed from the schedule, so the fee schedule must exist before any proposal | 0.2, 8.5 |
| "What we heard" is the section the platform makes fastest and the advisor must own most | 8.2, 8.4 |
| The agreement needs four facts the proposal does not: legal name and address, account registrations, authority, delivery confirmation | 2.3, 7.3 |
| Signing is a packet with a delivery record, not a single PDF | 9.1 |
| Every value from the meeting is approximate until a statement arrives | 2.2 |

## 7 · For the domain lead and legal

- Replace the clause wording in section 4 with the firm's real agreement.
- Confirm the section order and content of a real proposal for this segment.
- Say whether a proposal may show projections or past performance, and under what conditions.
- Confirm the minimum-information list in section 2.
- Confirm which disclosure documents belong in the packet, and how delivery must be evidenced.

## Sources

Structure drawn from public material, listed in the session notes of 14 Nov 2026: advisory
agreement templates and practitioner guides (Business in a Box, Kitces), and proposal
templates and guides (Proposify, Advisorpedia, Rework). No text is copied from them.
