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

| Our need | Green Meadows | Slug | State |
| --- | --- | --- | --- |
| Accounts, status, model, owner | `GET .../customer/user/v4/accounts/summary` | `getaccountsbyuseridv4compact` | full |
| Balances, net worth, cash, restrictions | `POST .../bookkeeping/v2/accounts/balances/search` | `getaccountbalances-1` | full |
| The 12-month trend | `POST .../bookkeeping/v1/balance-history/search` | `searchaccountbalancesovertime-1` | full |
| Holdings | `POST .../bookkeeping/v3/positions/get` | `getpositionswithpagination-1` | full |
| Per-account gain and loss | `POST .../bookkeeping/v1/accounts/performance/get` | `getaccountsperformancesummary` | full |
| Tax-loss harvesting | `POST .../bookkeeping/v2/opentaxlot/get` | `getopentaxlots-1` | full |
| Target allocation and drift policy | `GET .../portfolios/ria/v1/customer/models` | `ria-customerlistcustomermodels` | full |
| Rebalance history and drift triggers | `POST .../portfolios/ria/v1/customer/accounts/rebalances/search` | `ria-customersearchcustomerrebalances` | full |
| Client documents | `POST .../reports/user/v1/documents/search` | `searchrecords` | full |
| Margin-call alerts | `POST .../margin/admin/v1/margin-calls` | `post_admin-v1-margin-calls` | full, internal host |
| CRM-style notes | `GET .../ows/api/v1/get-notes` | `getusernotes` | **incomplete** |
| Client fees | `POST .../rt/v1/account-fees/search` | `getaccountfees` | **incomplete** |

The reference lists **182 endpoints**. Twelve are captured: ten usable, two whose published
shape is not usable yet.

## The two incomplete ones

Both need a sample response from Green Meadows before anything can be mapped.

**Account fees** (`getaccountfees`). The reference says so itself: each item is
`{ content: string, _links: object }` and the documentation states "Mapping will be dynamic in
nature based on the entity involved". There is no fee shape published. This is the source for
AX-10 and AX-11, so both the advisor fee table and the client portal's fee list depend on it.

**User notes** (`getusernotes`). The documented 200 body is a "Flight Deck User Info" object
plus error messages. The notes themselves are not in it, despite being the point of the
endpoint. The documented keys also carry spaces (`"GM User Id"`, `"First Name"`), so either the
reference is showing display labels rather than JSON keys, or the payload really is shaped that
way. Do not map it on the strength of the docs.

## Still to capture

- Realized gain and loss — `post_ftgw-fcat-bookkeeping-v1-realized-gain-loss-get`
- Transaction history — `gettransactionhistory-1`
- Model portfolio by ID — `ria-customergetcustomermodel`
- Document download — `downloaddocument`
- The drift calculation resource that `drift_calculation_id` points at
- Everything else: account opening, agreements, beneficiaries, funding and money movement,
  orders and trades, IRA, ACAT, preferences

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

## The positions gaps, and where the data actually lives

Positions marks these **"Not applicable"**: `currentValue`, `totalGainLoss`,
`totalPercentGainLoss`, `todayGainLoss`, `todayPercentGainLoss`, `lastPrice`,
`securityClassificationLevel`, `securityClassificationLevel2`.

Capturing the rest of the endpoints answered most of what that threatened. Both concerns
raised on the first pass turned out to have sources elsewhere:

**Gain and loss: solved.** `POST /bookkeeping/v1/accounts/performance/get` returns
`todaysUnrealizedProfitAndLoss`, `totalUnrealizedProfitAndLoss` and `totalMarketValue` per
account, with the formulas documented. That is where `ClientAccount.todayGainLoss` and
`totalGainLoss` come from. Not positions.

**Asset class: mostly solved.** `GET /portfolios/ria/v1/customer/models` returns
`holdings[].category` and `subCategory` alongside `targetPercent`. So the *target* allocation
by asset class is available, and a holding can be classified by matching its ticker to the
model's holdings. Two caveats: it only classifies securities that are in a model, and it needs
position market values, which brings back the pricing question.

**Still open: position market value.** Concentration ("24% of equities in one holding") needs
per-position value. Positions says `currentValue` is not applicable while offering
`includeCurrentValue` as a pricing flag, which is a contradiction the docs do not resolve.
Either the flag works and the annotation is stale, or value must be derived from
`tdQuantity` and a price from elsewhere. **Confirm this one against the sandbox.**

**Worth knowing: Green Meadows already computes drift.** Rebalance requests carry
`reasons` including `DriftExceeded` and `MaxTotalDriftExceeded`, and models carry
`driftMethod`, `driftThreshold`, `maxTotalDrift` and `rebalanceFrequency`. The mock invents a
flat 5-point threshold. The real threshold belongs to the model, and the drift may be readable
from their calculation rather than computed per account, which would remove a large fan-out.

## Conventions that differ across subsystems

The adapter cannot assume one house style. Observed so far:

| | Case | Account number | Paging key |
| --- | --- | --- | --- |
| `user/v4` | camelCase | `int64` | none, `{ accounts: [] }` |
| bookkeeping | camelCase | `int64` | `page` inside `{ content, page }` |
| portfolios RIA | **snake_case** | `string`, `^[0-9]{10}$` | none, `{ data, metadata }` |
| reports documents | camelCase | `int64` | `page`, top level is an **array** |
| recurring transactions | camelCase | **`string`** | `page` |
| margin admin | camelCase | `integer` | **`pagination`** |

## How to capture the rest

1. Open the endpoint page in a signed-in browser (the reference needs a session).
2. Expand the `200` row to reveal RESPONSE BODY.
3. Transcribe into `schemas.js` with its slug in `capturedFrom`.
4. Record anything marked "Not applicable", and any disagreement between the schema and the
   worked example. There were two such disagreements in the balances endpoint alone.
