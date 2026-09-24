# Green Meadows: what the reference actually documents

**Correction to earlier notes.** HANDOFF used to say the Green Meadows reference "documents
parameters and status codes but not response bodies", and that every response shape in this
repo was an assumption. That is wrong. The response schemas are published, field by field with
descriptions. They are collapsed behind the `200` row on each endpoint page; expanding it shows
a full **RESPONSE BODY** tree, and the right-hand panel carries a worked example.

Reaching them needs a signed-in browser session. The site redirects anonymous requests to a
ReadMe login, which is why automated fetching appeared to fail and why the shapes were
recorded as assumptions.

`schemas.js` holds what was transcribed on 24 September 2026, with the source slug on each
entry.

## Captured so far

| Our need | Green Meadows | Slug |
| --- | --- | --- |
| Accounts, status, model, owner | `GET /ftgw/fcat/customer/user/v4/accounts/summary` | `getaccountsbyuseridv4compact` |
| Balances, net worth, cash, restrictions | `POST /ftgw/fcat/bookkeeping/v2/accounts/balances/search` | `getaccountbalances-1` |
| The 12-month trend | `POST /ftgw/fcat/bookkeeping/v1/balance-history/search` | `searchaccountbalancesovertime-1` |
| Holdings | `POST /ftgw/fcat/bookkeeping/v3/positions/get` | `getpositionswithpagination-1` |

The reference lists **182 endpoints**. Four are captured. The rest are named in HANDOFF
section 7 and still need the same treatment.

## Still to capture

Needed next, in the order the backend will want them:

- Accounts Performance Summary — `getaccountsperformancesummary`
- Get Account's Performance
- Open tax lots — `getopentaxlots-1`
- Realized gain and loss — `post_ftgw-fcat-bookkeeping-v1-realized-gain-loss-get`
- Documents — `downloaddocument`
- Account fees — `getaccountfees`
- Customer models and rebalances — `ria-customerlistcustomermodels`,
  `ria-customergetcustomermodel`, `ria-customersearchcustomerrebalances`
- Notes — `getnotes`
- Transaction history — `gettransactionhistory-1`
- Margin calls — `post_admin-v1-margin-calls` (on a separate internal host; access unconfirmed)

## What the captured schemas changed

Four things the mock and the contract get wrong, now that the real shapes are known.

**1. Account types are codes, not names.** `accountType`, `accountReg`, `accountSubType` and
`accountSubReg` are 4-character codes. The mock shows `"Joint brokerage"` and `"Roth IRA"`.
A lookup table has to sit between the custodian and any screen, and it does not exist yet.

**2. Account numbers are integers.** `accountNumber` is an `int64`, 10 digits. The contract
masks to the last four as a string, which is right, but the masking has to happen on a number.

**3. Two envelope shapes, not one.** `user/v4/accounts/summary` returns `{ accounts: [...] }`.
Bookkeeping returns `{ content: ..., page: { size, totalElements, totalPages, number } }`.
The adapter cannot assume one paging envelope.

**4. The trend is daily, capped at 30 accounts, and can be flagged inaccurate.**
`balance-history/search` returns one point per day and takes at most 30 account numbers per
call, so a firm-level chart needs several calls. Each point carries `error` and `accuracyNote`:
unpriced securities can make a day's value wrong, and the note lists the CUSIPs.

That last one matters more than it looks. The client portal's value chart is the one place
this data reaches a client directly. A point the custodian has flagged as incomplete must not
be drawn to a client as fact. The contract has nowhere to express that today.

## The finding that needs a decision

The positions reference marks these **"Not applicable"**:

`currentValue` · `totalGainLoss` · `totalPercentGainLoss` · `todayGainLoss` ·
`todayPercentGainLoss` · `lastPrice` · `securityClassificationLevel` ·
`securityClassificationLevel2`

Two consequences if that holds in the sandbox rather than being stale documentation:

- **Position value and gain/loss are not returned.** `includeCurrentValue` exists as a pricing
  flag, which contradicts the annotations, so this needs confirming rather than assuming. If
  they really are empty, value must be derived from quantity and a price from elsewhere.
  The client portal shows `todayGainLoss` and `totalGainLoss` per account today.
- **Asset class is not returned.** The two `securityClassification` fields are the ones the
  allocation-drift and concentration signals were designed around. Without them there is no
  asset class to compare against a model, and `GET /households/{id}/allocation` has no source.
  A separate classification source, or the model endpoints, would have to supply it.

Confirm both against the sandbox before building the portfolio signals. They are the second
question for Green Meadows, after the advisor-wide token.

## How to capture the rest

1. Open the endpoint page in a signed-in browser (the reference needs a session).
2. Expand the `200` row to reveal RESPONSE BODY.
3. Transcribe into `schemas.js` with its slug in `capturedFrom`.
4. Record anything marked "Not applicable", and any disagreement between the schema and the
   worked example. There were two such disagreements in the balances endpoint alone.
